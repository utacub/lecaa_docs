import './styles.css';
import type { Editor } from '@tiptap/core';
import {
  Bold, Columns3, Maximize, FileDown, FilePlus, FolderOpen, Image as ImageIcon, Italic, Keyboard, List, ListOrdered, Pause, Play,
  Printer, Redo2, Rows3, Settings as SettingsIcon, Square, SquareMinus, Table as TableIcon, TextAlignCenter, TextAlignEnd,
  TextAlignStart, TextCursorInput, Trash2, Underline, Undo2, Volume2,
} from 'lucide';
import { FONTS, fontByFamily, fontById, loadFonts } from './fonts';
import { docxFromEditor, htmlFromFile, openFile, safeName, saveFile } from './docio';
import { createEditor, installKeyboardGuard } from './editor';
import { OnScreenKeyboard } from './keyboard';
import { reader } from './reader';
import { anyTypingFeedback, settings } from './settings';
import { openSettings } from './settings-panel';
import { speech } from './speech';
import { neural } from './speech/neural';
import { lock } from './lock';
import { loadDoc, storeDoc } from './storage';
import { h, icon, toast } from './ui';

neural.onNotice((message, preparing) => toast(message, preparing ? 5000 : 10000));

const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="3" width="22" height="26" rx="4" fill="#17676b"/><path d="M10 10h12M10 15h12M10 20h7" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M21 19.5c1.6 1 1.6 3.9 0 5M23.5 17.5c2.8 2.2 2.8 6.8 0 9" stroke="#f0a400" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;

const SIZES: [string, string | null][] = [['Petita', '0.8em'], ['Normal', null], ['Gran', '1.4em'], ['Molt gran', '2em']];

function tb(label: string, ic: Parameters<typeof icon>[0], onclick: () => void, extra: Record<string, string> = {}) {
  return h('button', { class: 'tb', type: 'button', title: label, 'aria-label': label, onclick, ...extra }, icon(ic));
}

async function boot() {
  loadFonts();
  const saved = await loadDoc();
  const title = h('input', { class: 'doc-title', value: saved?.title ?? 'Document sense títol', 'aria-label': 'Títol del document' }) as HTMLInputElement;
  const saveState = h('span', { class: 'save-state', 'aria-live': 'polite' });
  const page = h('div', { class: 'page' });
  const workspace = h('main', { class: 'workspace' }, page);
  const editor = createEditor(page, saved?.content ?? null);
  installKeyboardGuard(editor);
  const osk = new OnScreenKeyboard(editor);

  // ----- autosave -----
  let timer = 0;
  const persist = () => {
    clearTimeout(timer);
    saveState.textContent = 'Desant…';
    timer = window.setTimeout(async () => {
      const ok = await storeDoc({ title: title.value, content: editor.getJSON(), updated: Date.now() });
      saveState.textContent = ok ? 'Desat en aquest dispositiu' : 'No s’ha pogut desar';
    }, 700);
  };
  editor.on('update', persist);
  title.addEventListener('input', persist);
  saveState.textContent = saved ? 'Desat en aquest dispositiu' : '';

  // ----- file actions -----
  const setContent = (html: string | object) => {
    editor.chain().command(({ tr }) => { tr.setMeta('lecaa-system', true); return true; }).setContent(html).run();
    persist();
  };
  const newDoc = () => {
    if (!editor.isEmpty && !confirm('Vols començar un document nou? El document actual s’esborrarà d’aquest dispositiu si no l’has desat.')) return;
    setContent('');
    title.value = 'Document sense títol';
    persist();
  };
  const open = async () => {
    const f = await openFile();
    if (!f) return;
    try {
      setContent(await htmlFromFile(f.name, f.data));
      title.value = f.name.replace(/\.[^.]+$/, '');
      persist();
      toast('Document obert');
    } catch (e) {
      console.error(e);
      toast('No s’ha pogut obrir aquest fitxer');
    }
  };
  const save = async () => {
    try {
      const blob = await docxFromEditor(editor, title.value);
      if (await saveFile(blob, safeName(title.value) + '.docx')) toast('Desat com a .docx (es pot obrir amb Google Docs)');
    } catch (e) {
      console.error(e);
      toast('No s’ha pogut desar el document');
    }
  };
  const insertImage = () => {
    const input = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/gif' }) as HTMLInputElement;
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const alt = prompt('Descripció breu de la imatge (opcional):') ?? '';
        editor.chain().focus().command(({ tr }) => { tr.setMeta('lecaa-system', true); return true; }).setImage({ src: String(r.result), alt }).run();
      };
      r.readAsDataURL(f);
    };
    input.click();
  };

  // ----- formatting toolbar -----
  const run = (fn: (c: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>) => () => fn(editor.chain().focus()).run();
  const sizeSel = h('select', { class: 'tb', 'aria-label': 'Mida de la lletra', title: 'Mida de la lletra' },
    ...SIZES.map(([l, v]) => h('option', { value: v ?? '' }, l))) as HTMLSelectElement;
  sizeSel.addEventListener('change', () => {
    const v = sizeSel.value;
    (v ? editor.chain().focus().setFontSize(v) : editor.chain().focus().unsetFontSize()).run();
  });

  // Font of the selection (or of what is typed next); "" = the document font from the settings.
  const fontSel = h('select', { class: 'tb font-select', 'aria-label': 'Tipus de lletra', title: 'Tipus de lletra' },
    h('option', { value: '' }, 'Lletra del document'),
    ...FONTS.map(f => h('option', { value: f.id, style: `font-family: ${f.css}` }, f.label))) as HTMLSelectElement;
  fontSel.addEventListener('change', () => {
    const f = fontSel.value ? fontById(fontSel.value) : null;
    (f ? editor.chain().focus().setFontFamily(f.css) : editor.chain().focus().unsetFontFamily()).run();
  });

  const fmt = {
    bold: tb('Negreta', Bold, run(c => c.toggleBold())),
    italic: tb('Cursiva', Italic, run(c => c.toggleItalic())),
    underline: tb('Subratllat', Underline, run(c => c.toggleUnderline())),
    left: tb('Alinea a l’esquerra', TextAlignStart, run(c => c.setTextAlign('left'))),
    center: tb('Centra', TextAlignCenter, run(c => c.setTextAlign('center'))),
    right: tb('Alinea a la dreta', TextAlignEnd, run(c => c.setTextAlign('right'))),
    bullet: tb('Llista amb pics', List, run(c => c.toggleBulletList())),
    ordered: tb('Llista numerada', ListOrdered, run(c => c.toggleOrderedList())),
  };
  const undo = tb('Desfés', Undo2, run(c => c.undo()));
  const redo = tb('Refés', Redo2, run(c => c.redo()));
  const tableTools = h('span', { class: 'table-tools', hidden: true },
    tb('Afegeix una fila', Rows3, run(c => c.addRowAfter())),
    tb('Afegeix una columna', Columns3, run(c => c.addColumnAfter())),
    tb('Esborra la fila', SquareMinus, run(c => c.deleteRow())),
    tb('Esborra la columna', TextCursorInput, run(c => c.deleteColumn())),
    tb('Esborra la taula', Trash2, run(c => c.deleteTable())));

  const toolbar = h('div', { class: 'toolbar', role: 'toolbar', 'aria-label': 'Format' },
    tb('Document nou', FilePlus, newDoc), tb('Obre un document', FolderOpen, open), tb('Desa com a .docx', FileDown, save), tb('Imprimeix o desa en PDF', Printer, () => window.print()),
    h('span', { class: 'sep' }), undo, redo,
    h('span', { class: 'sep' }), fontSel, sizeSel,
    h('span', { class: 'sep' }), fmt.bold, fmt.italic, fmt.underline,
    h('span', { class: 'sep' }), fmt.left, fmt.center, fmt.right,
    h('span', { class: 'sep' }), fmt.bullet, fmt.ordered,
    h('span', { class: 'sep' }), tb('Insereix una taula', TableIcon, run(c => c.insertTable({ rows: 3, cols: 3, withHeaderRow: false }))), tb('Insereix una imatge', ImageIcon, insertImage), tableTools);

  // ----- voice bar (the main controls) -----
  const playAll = h('button', { class: 'vbtn', type: 'button', title: 'Llegeix tot', 'aria-label': 'Llegeix tot' }, icon(Play), h('span', { class: 'lbl', 'aria-hidden': 'true' }, 'Llegeix tot'));
  const playSel = h('button', { class: 'vbtn ghost', type: 'button', title: 'Llegeix la selecció', 'aria-label': 'Llegeix la selecció' }, icon(Volume2), h('span', { class: 'lbl', 'aria-hidden': 'true' }, 'Llegeix la selecció'));
  const playCur = h('button', { class: 'vbtn ghost', type: 'button', title: 'Des del cursor', 'aria-label': 'Des del cursor' }, icon(Play), h('span', { class: 'lbl', 'aria-hidden': 'true' }, 'Des del cursor'));
  const pauseBtn = h('button', { class: 'vbtn ghost', type: 'button', title: 'Pausa', 'aria-label': 'Pausa', hidden: true }, icon(Pause), h('span', { class: 'lbl', 'aria-hidden': 'true' }, 'Pausa'));
  const stopBtn = h('button', { class: 'vbtn ghost', type: 'button', title: 'Atura', 'aria-label': 'Atura', hidden: true }, icon(Square), h('span', { class: 'lbl', 'aria-hidden': 'true' }, 'Atura'));
  const kbBtn = h('button', { class: 'vbtn ghost', type: 'button', title: 'Teclat', 'aria-label': 'Teclat', 'aria-pressed': 'false' }, icon(Keyboard), h('span', { class: 'lbl', 'aria-hidden': 'true' }, 'Teclat'));
  const setBtn = h('button', { class: 'vbtn ghost kiosk-hide', type: 'button', 'aria-label': 'Configuració' }, icon(SettingsIcon));
  const fullBtn = h('button', { class: 'vbtn ghost kiosk-hide', type: 'button', title: 'Pantalla completa', 'aria-label': 'Pantalla completa' }, icon(Maximize));
  fullBtn.addEventListener('click', () => void lock.enter());
  const summary = h('span', { class: 'feedback-summary' });
  const warning = h('span', { class: 'voice-warning', hidden: true });

  const startRead = (mode: 'all' | 'selection' | 'cursor') => {
    if (reader.paused && mode === 'all') { reader.resume(); return; }
    if (!speech.currentVoice()) { toast('No hi ha cap veu catalana disponible. Obre la configuració.'); return; }
    if (!reader.start(mode)) toast(mode === 'selection' ? 'Primer selecciona el text que vols escoltar' : 'No hi ha text per llegir');
  };
  playAll.addEventListener('click', () => startRead('all'));
  playSel.addEventListener('click', () => startRead('selection'));
  playCur.addEventListener('click', () => startRead('cursor'));
  pauseBtn.addEventListener('click', () => reader.pause());
  stopBtn.addEventListener('click', () => { reader.stop(); speech.stop(); });
  // Reading buttons must keep the editor selection.
  for (const b of [playAll, playSel, playCur, pauseBtn, stopBtn]) b.addEventListener('mousedown', e => e.preventDefault());
  kbBtn.addEventListener('mousedown', e => e.preventDefault());
  kbBtn.addEventListener('click', () => settings.update(s => { s.keyboard.visible = !s.keyboard.visible; }));

  reader.onState = () => {
    pauseBtn.hidden = !reader.reading;
    stopBtn.hidden = !reader.reading && !reader.paused;
    const label = reader.paused ? 'Continua' : 'Llegeix tot';
    playAll.lastChild!.textContent = label;
    playAll.setAttribute('aria-label', label);
  };

  // Settings, optionally protected by a 2-second press so learners don't change them by accident.
  let holdTimer = 0, held = false;
  const showSettings = () => openSettings(() => editor.commands.focus());
  setBtn.addEventListener('pointerdown', () => {
    held = false;
    if (settings.value.protectSettings) holdTimer = window.setTimeout(() => { held = true; showSettings(); }, 2000);
  });
  const cancelHold = () => clearTimeout(holdTimer);
  setBtn.addEventListener('pointerup', cancelHold);
  setBtn.addEventListener('pointerleave', cancelHold);
  setBtn.addEventListener('click', () => {
    if (!settings.value.protectSettings) showSettings();
    else if (!held) toast('Mantén premut el botó 2 segons per obrir la configuració');
  });

  const voicebar = h('div', { class: 'toolbar voicebar', role: 'toolbar', 'aria-label': 'Veu' },
    playAll, playSel, playCur, pauseBtn, stopBtn, h('span', { class: 'spacer' }), warning, summary, kbBtn, fullBtn, setBtn);

  const topbar = h('header', { class: 'topbar' }, h('span', { class: 'brand' }), title, saveState);
  (topbar.firstChild as HTMLElement).innerHTML = LOGO + '<span>LECAA Docs</span>';

  document.getElementById('app')!.replaceWith(topbar, toolbar, voicebar, workspace, osk.el);
  lock.install();

  // ----- state refresh -----
  const refreshFormat = () => {
    const set = (b: HTMLElement, on: boolean) => b.setAttribute('aria-pressed', String(on));
    set(fmt.bold, editor.isActive('bold'));
    set(fmt.italic, editor.isActive('italic'));
    set(fmt.underline, editor.isActive('underline'));
    set(fmt.left, editor.isActive({ textAlign: 'left' }));
    set(fmt.center, editor.isActive({ textAlign: 'center' }));
    set(fmt.right, editor.isActive({ textAlign: 'right' }));
    set(fmt.bullet, editor.isActive('bulletList'));
    set(fmt.ordered, editor.isActive('orderedList'));
    (undo as HTMLButtonElement).disabled = !editor.can().undo();
    (redo as HTMLButtonElement).disabled = !editor.can().redo();
    tableTools.hidden = !editor.isActive('table');
    const fs = editor.getAttributes('textStyle').fontSize ?? '';
    sizeSel.value = SIZES.some(([, v]) => v === fs) ? fs : '';
    const ff = editor.getAttributes('textStyle').fontFamily as string | undefined;
    fontSel.value = ff ? fontByFamily(ff)?.id ?? '' : '';
  };
  editor.on('selectionUpdate', refreshFormat);
  editor.on('transaction', refreshFormat);
  refreshFormat();

  const refreshSettings = () => {
    const s = settings.value;
    document.documentElement.style.setProperty('--doc-size', `${s.docFontSize}px`);
    document.documentElement.style.setProperty('--doc-font', fontById(s.docFont).css);
    kbBtn.setAttribute('aria-pressed', String(s.keyboard.visible));
    const parts: string[] = [];
    if (s.feedback.sentence) parts.push('frase');
    if (s.feedback.word) parts.push('paraula');
    if (s.feedback.letter === 'name') parts.push('nom de la lletra');
    if (s.feedback.letter === 'sound') parts.push('so de la lletra');
    summary.textContent = anyTypingFeedback(s) ? `Feedback: ${parts.join(', ')}` : 'Sense feedback';
    if (s.lockWhileSpeaking) summary.textContent += ' · protecció activa';
  };
  settings.subscribe(refreshSettings);
  refreshSettings();

  const refreshVoices = () => {
    const v = speech.currentVoice();
    warning.hidden = !!v;
    warning.textContent = 'No s’ha trobat cap veu catalana';
  };
  speech.onVoices(refreshVoices);
  settings.subscribe(refreshVoices);
  await speech.refresh();

  editor.commands.focus('end');

  if (!__SINGLE_FILE__ && 'serviceWorker' in navigator && location.protocol.startsWith('http') && !location.hostname.match(/^(localhost|127\.)/)) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  (window as unknown as { lecaa: object }).lecaa = { editor, speech, settings, reader };
}

void boot();
