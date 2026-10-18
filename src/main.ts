import './styles.css';
import type { Editor } from '@tiptap/core';
import {
  AArrowDown, AArrowUp, Bold, Check, ChevronDown, Columns3, Maximize, FileDown, FilePlus, FileType, FolderOpen, Globe, Image as ImageIcon, Italic, Keyboard, List, ListOrdered, Pause, Play,
  Printer, Redo2, Rows3, Settings as SettingsIcon, Square, SquareMinus, Table as TableIcon, TextAlignCenter, TextAlignEnd,
  TextAlignStart, TextCursorInput, Trash2, Underline, Undo2, Volume2,
} from 'lucide';
import { FONTS, fontByFamily, fontById, loadFonts } from './fonts';
import { LANG, LANGS, switchLang, T } from './i18n';
import { BASE_PT, docxFromEditor, htmlFromFile, openFile, safeName, saveFile } from './docio';
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

// Text sizes in points, as in a word processor. Unmarked text is BASE_PT (the size of the exported
// .docx); a size is stored relative to it (em), so the screen-size setting still scales everything.
const SIZES_PT = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 60, 72];
const toEm = (pt: number) => `${+(pt / BASE_PT).toFixed(4)}em`;
function toPt(fontSize?: string): number {
  const m = /^([\d.]+)(em|px|pt)$/.exec(fontSize ?? '');
  if (!m) return BASE_PT;
  const v = parseFloat(m[1]);
  return Math.round((m[2] === 'em' ? v * BASE_PT : m[2] === 'px' ? v * 0.75 : v) * 2) / 2;
}

function tb(label: string, ic: Parameters<typeof icon>[0], onclick: () => void, extra: Record<string, string> = {}) {
  return h('button', { class: 'tb', type: 'button', title: label, 'aria-label': label, onclick, ...extra }, icon(ic));
}

async function boot() {
  loadFonts();
  document.documentElement.lang = LANG;
  const saved = await loadDoc();
  const title = h('input', { class: 'doc-title', value: saved?.title ?? T('Document sense títol', 'Documento sin título'), 'aria-label': T('Títol del document', 'Título del documento') }) as HTMLInputElement;
  const saveState = h('span', { class: 'save-state', 'aria-live': 'polite' });
  const page = h('div', { class: 'page' });
  const workspace = h('main', { class: 'workspace' }, page);
  const editor = createEditor(page, saved?.content ?? null);
  installKeyboardGuard(editor);
  const osk = new OnScreenKeyboard(editor);

  // ----- autosave -----
  let timer = 0;
  const saveNow = async () => {
    clearTimeout(timer);
    const ok = await storeDoc({ title: title.value, content: editor.getJSON(), updated: Date.now() });
    saveState.textContent = ok ? T('Desat en aquest dispositiu', 'Guardado en este dispositivo') : T('No s’ha pogut desar', 'No se ha podido guardar');
  };
  const persist = () => {
    clearTimeout(timer);
    saveState.textContent = T('Desant…', 'Guardando…');
    timer = window.setTimeout(saveNow, 700);
  };
  editor.on('update', persist);
  title.addEventListener('input', persist);
  saveState.textContent = saved ? T('Desat en aquest dispositiu', 'Guardado en este dispositivo') : '';

  // ----- file actions -----
  const setContent = (html: string | object) => {
    editor.chain().command(({ tr }) => { tr.setMeta('lecaa-system', true); return true; }).setContent(html).run();
    persist();
  };
  const newDoc = () => {
    if (!editor.isEmpty && !confirm(T('Vols començar un document nou? El document actual s’esborrarà d’aquest dispositiu si no l’has desat.', '¿Quieres empezar un documento nuevo? El documento actual se borrará de este dispositivo si no lo has guardado.'))) return;
    setContent('');
    title.value = T('Document sense títol', 'Documento sin título');
    persist();
  };
  const open = async () => {
    const f = await openFile();
    if (!f) return;
    try {
      setContent(await htmlFromFile(f.name, f.data));
      title.value = f.name.replace(/\.[^.]+$/, '');
      persist();
      toast(T('Document obert', 'Documento abierto'));
    } catch (e) {
      console.error(e);
      toast(T('No s’ha pogut obrir aquest fitxer', 'No se ha podido abrir este archivo'));
    }
  };
  const savePdf = async () => {
    try {
      toast(T('Preparant el PDF…', 'Preparando el PDF…'));
      const { pdfFromEditor } = await import('./pdf');
      const blob = await pdfFromEditor(editor, title.value);
      if (await saveFile(blob, safeName(title.value) + '.pdf', 'pdf')) toast(T('Desat com a PDF', 'Guardado como PDF'));
    } catch (e) {
      console.error(e);
      toast(T('No s’ha pogut desar el PDF', 'No se ha podido guardar el PDF'));
    }
  };
  const save = async () => {
    try {
      const blob = await docxFromEditor(editor, title.value);
      if (await saveFile(blob, safeName(title.value) + '.docx')) toast(T('Desat com a .docx (es pot obrir amb Google Docs)', 'Guardado como .docx (se puede abrir con Google Docs)'));
    } catch (e) {
      console.error(e);
      toast(T('No s’ha pogut desar el document', 'No se ha podido guardar el documento'));
    }
  };
  const insertImage = () => {
    const input = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/gif' }) as HTMLInputElement;
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const alt = prompt(T('Descripció breu de la imatge (opcional):', 'Descripción breve de la imagen (opcional):')) ?? '';
        editor.chain().focus().command(({ tr }) => { tr.setMeta('lecaa-system', true); return true; }).setImage({ src: String(r.result), alt }).run();
      };
      r.readAsDataURL(f);
    };
    input.click();
  };

  // ----- formatting toolbar -----
  const run = (fn: (c: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>) => () => fn(editor.chain().focus()).run();
  const sizeLabel = T('Mida de la lletra (punts)', 'Tamaño de la letra (puntos)');
  const sizeSel = h('select', { class: 'tb size-select', 'aria-label': sizeLabel, title: sizeLabel },
    ...SIZES_PT.map(pt => h('option', { value: String(pt) }, String(pt)))) as HTMLSelectElement;
  const setSize = (pt: number) => {
    pt = Math.min(Math.max(pt, SIZES_PT[0]), SIZES_PT[SIZES_PT.length - 1]);
    (pt === BASE_PT ? editor.chain().focus().unsetFontSize() : editor.chain().focus().setFontSize(toEm(pt))).run();
  };
  sizeSel.addEventListener('change', () => setSize(parseFloat(sizeSel.value)));
  const currentPt = () => toPt(editor.getAttributes('textStyle').fontSize);
  const sizeDown = tb(T('Redueix la mida de la lletra', 'Reducir el tamaño de la letra'), AArrowDown,
    () => setSize([...SIZES_PT].reverse().find(p => p < currentPt()) ?? SIZES_PT[0]));
  const sizeUp = tb(T('Augmenta la mida de la lletra', 'Aumentar el tamaño de la letra'), AArrowUp,
    () => setSize(SIZES_PT.find(p => p > currentPt()) ?? SIZES_PT[SIZES_PT.length - 1]));

  // Font of the selection (or of what is typed next); "" = the document font from the settings.
  const fontSel = h('select', { class: 'tb font-select', 'aria-label': T('Tipus de lletra', 'Tipo de letra'), title: T('Tipus de lletra', 'Tipo de letra') },
    h('option', { value: '' }, T('Lletra del document', 'Letra del documento')),
    ...FONTS.map(f => h('option', { value: f.id, style: `font-family: ${f.css}` }, f.label))) as HTMLSelectElement;
  fontSel.addEventListener('change', () => {
    const f = fontSel.value ? fontById(fontSel.value) : null;
    (f ? editor.chain().focus().setFontFamily(f.css) : editor.chain().focus().unsetFontFamily()).run();
  });

  const fmt = {
    bold: tb(T('Negreta', 'Negrita'), Bold, run(c => c.toggleBold())),
    italic: tb('Cursiva', Italic, run(c => c.toggleItalic())),
    underline: tb(T('Subratllat', 'Subrayado'), Underline, run(c => c.toggleUnderline())),
    left: tb(T('Alinea a l’esquerra', 'Alinear a la izquierda'), TextAlignStart, run(c => c.setTextAlign('left'))),
    center: tb(T('Centra', 'Centrar'), TextAlignCenter, run(c => c.setTextAlign('center'))),
    right: tb(T('Alinea a la dreta', 'Alinear a la derecha'), TextAlignEnd, run(c => c.setTextAlign('right'))),
    bullet: tb(T('Llista amb pics', 'Lista con viñetas'), List, run(c => c.toggleBulletList())),
    ordered: tb(T('Llista numerada', 'Lista numerada'), ListOrdered, run(c => c.toggleOrderedList())),
  };
  const undo = tb(T('Desfés', 'Deshacer'), Undo2, run(c => c.undo()));
  const redo = tb(T('Refés', 'Rehacer'), Redo2, run(c => c.redo()));
  const tableTools = h('span', { class: 'table-tools', hidden: true },
    tb(T('Afegeix una fila', 'Añadir una fila'), Rows3, run(c => c.addRowAfter())),
    tb(T('Afegeix una columna', 'Añadir una columna'), Columns3, run(c => c.addColumnAfter())),
    tb(T('Esborra la fila', 'Borrar la fila'), SquareMinus, run(c => c.deleteRow())),
    tb(T('Esborra la columna', 'Borrar la columna'), TextCursorInput, run(c => c.deleteColumn())),
    tb(T('Esborra la taula', 'Borrar la tabla'), Trash2, run(c => c.deleteTable())));

  const toolbar = h('div', { class: 'toolbar', role: 'toolbar', 'aria-label': T('Format', 'Formato') },
    tb(T('Document nou', 'Documento nuevo'), FilePlus, newDoc), tb(T('Obre un document', 'Abrir un documento'), FolderOpen, open), tb(T('Desa com a .docx', 'Guardar como .docx'), FileDown, save), tb(T('Desa com a PDF', 'Guardar como PDF'), FileType, savePdf), tb(T('Imprimeix', 'Imprimir'), Printer, () => window.print()),
    h('span', { class: 'sep' }), undo, redo,
    h('span', { class: 'sep' }), fontSel, sizeSel, sizeDown, sizeUp,
    h('span', { class: 'sep' }), fmt.bold, fmt.italic, fmt.underline,
    h('span', { class: 'sep' }), fmt.left, fmt.center, fmt.right,
    h('span', { class: 'sep' }), fmt.bullet, fmt.ordered,
    h('span', { class: 'sep' }), tb(T('Insereix una taula', 'Insertar una tabla'), TableIcon, run(c => c.insertTable({ rows: 3, cols: 3, withHeaderRow: false }))), tb(T('Insereix una imatge', 'Insertar una imagen'), ImageIcon, insertImage), tableTools);

  // ----- voice bar (the main controls) -----
  const playAll = h('button', { class: 'vbtn', type: 'button', title: T('Llegeix tot', 'Leer todo'), 'aria-label': T('Llegeix tot', 'Leer todo') }, icon(Play), h('span', { class: 'lbl', 'aria-hidden': 'true' }, T('Llegeix tot', 'Leer todo')));
  const playSel = h('button', { class: 'vbtn ghost', type: 'button', title: T('Llegeix la selecció', 'Leer la selección'), 'aria-label': T('Llegeix la selecció', 'Leer la selección') }, icon(Volume2), h('span', { class: 'lbl', 'aria-hidden': 'true' }, T('Llegeix la selecció', 'Leer la selección')));
  const playCur = h('button', { class: 'vbtn ghost', type: 'button', title: T('Des del cursor', 'Desde el cursor'), 'aria-label': T('Des del cursor', 'Desde el cursor') }, icon(Play), h('span', { class: 'lbl', 'aria-hidden': 'true' }, T('Des del cursor', 'Desde el cursor')));
  const pauseBtn = h('button', { class: 'vbtn ghost', type: 'button', title: T('Pausa', 'Pausa'), 'aria-label': T('Pausa', 'Pausa'), hidden: true }, icon(Pause), h('span', { class: 'lbl', 'aria-hidden': 'true' }, T('Pausa', 'Pausa')));
  const stopBtn = h('button', { class: 'vbtn ghost', type: 'button', title: T('Atura', 'Detener'), 'aria-label': T('Atura', 'Detener'), hidden: true }, icon(Square), h('span', { class: 'lbl', 'aria-hidden': 'true' }, T('Atura', 'Detener')));
  const kbBtn = h('button', { class: 'vbtn ghost', type: 'button', title: T('Teclat', 'Teclado'), 'aria-label': T('Teclat', 'Teclado'), 'aria-pressed': 'false' }, icon(Keyboard), h('span', { class: 'lbl', 'aria-hidden': 'true' }, T('Teclat', 'Teclado')));
  const setBtn = h('button', { class: 'vbtn ghost kiosk-hide', type: 'button', 'aria-label': T('Configuració', 'Configuración') }, icon(SettingsIcon));
  const fullBtn = h('button', { class: 'vbtn ghost kiosk-hide', type: 'button', title: T('Pantalla completa', 'Pantalla completa'), 'aria-label': T('Pantalla completa', 'Pantalla completa') }, icon(Maximize));
  fullBtn.addEventListener('click', () => void lock.enter());
  const summary = h('span', { class: 'feedback-summary' });
  const warning = h('span', { class: 'voice-warning', hidden: true });

  const startRead = (mode: 'all' | 'selection' | 'cursor') => {
    if (reader.paused && mode === 'all') { reader.resume(); return; }
    if (!speech.currentVoice()) { toast(T('No hi ha cap veu catalana disponible. Obre la configuració.', 'No hay ninguna voz en castellano disponible. Abre la configuración.')); return; }
    if (!reader.start(mode)) toast(mode === 'selection' ? T('Primer selecciona el text que vols escoltar', 'Primero selecciona el texto que quieres escuchar') : T('No hi ha text per llegir', 'No hay texto para leer'));
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
    const label = reader.paused ? T('Continua', 'Continuar') : T('Llegeix tot', 'Leer todo');
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
    else if (!held) toast(T('Mantén premut el botó 2 segons per obrir la configuració', 'Mantén pulsado el botón 2 segundos para abrir la configuración'));
  });

  const voicebar = h('div', { class: 'toolbar voicebar', role: 'toolbar', 'aria-label': T('Veu', 'Voz') },
    playAll, playSel, playCur, pauseBtn, stopBtn, h('span', { class: 'spacer' }), warning, summary, kbBtn, fullBtn, setBtn);

  // Language menu: the interface, the configuration and the voices all change with it.
  // Closed it shows the current language's code; open, every language in its own name.
  const cur = LANGS.find(l => l.id === LANG)!;
  const langBtn = h('button', {
    class: 'lang-btn', type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-controls': 'lang-menu',
    'aria-label': `${T('Idioma', 'Idioma')}: ${cur.label}`, title: `${T('Idioma', 'Idioma')}: ${cur.label}`,
  }, icon(Globe), h('span', { class: 'lang-code' }, LANG.toUpperCase()), icon(ChevronDown));
  const items = LANGS.map(l => h('button', {
    class: 'lang-item', type: 'button', role: 'menuitemradio', lang: l.id, 'data-lang': l.id,
    'aria-checked': String(l.id === LANG), tabindex: '-1',
    onclick: () => { closeLang(); void switchLang(l.id, async () => { reader.stop(); speech.stop(); await saveNow(); }); },
  }, h('span', { class: 'lang-item-code', 'aria-hidden': 'true' }, l.id.toUpperCase()), l.label, icon(Check)));
  const langMenu = h('div', { class: 'lang-menu', id: 'lang-menu', role: 'menu', 'aria-label': T('Idioma', 'Idioma'), hidden: true }, ...items);
  const langSwitch = h('div', { class: 'lang-switch kiosk-hide' }, langBtn, langMenu);
  const openLang = (focus = items.findIndex(i => i.dataset.lang === LANG)) => {
    langMenu.hidden = false; langBtn.setAttribute('aria-expanded', 'true'); items[focus].focus();
  };
  const closeLang = (refocus = false) => {
    if (langMenu.hidden) return;
    langMenu.hidden = true; langBtn.setAttribute('aria-expanded', 'false');
    if (refocus) langBtn.focus();
  };
  langBtn.addEventListener('click', () => (langMenu.hidden ? openLang() : closeLang()));
  langBtn.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openLang(e.key === 'ArrowDown' ? 0 : items.length - 1); }
  });
  langMenu.addEventListener('keydown', e => {
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const go = (n: number) => { e.preventDefault(); items[(n + items.length) % items.length].focus(); };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(items.length - 1);
    else if (e.key === 'Escape') { e.preventDefault(); closeLang(true); }
    else if (e.key === 'Tab') closeLang();
  });
  document.addEventListener('pointerdown', e => { if (!langSwitch.contains(e.target as Node)) closeLang(); });
  const topbar = h('header', { class: 'topbar' }, h('span', { class: 'brand' }), title, saveState, langSwitch);
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
    // A size that is not in the list (from an opened document) gets its own option while selected.
    const pt = currentPt();
    sizeSel.querySelector('.size-other')?.remove();
    if (!SIZES_PT.includes(pt)) {
      const o = h('option', { class: 'size-other', value: String(pt) }, String(pt).replace('.', ','));
      sizeSel.insertBefore(o, [...sizeSel.options].find(x => parseFloat(x.value) > pt) ?? null);
    }
    sizeSel.value = String(pt);
    (sizeDown as HTMLButtonElement).disabled = pt <= SIZES_PT[0];
    (sizeUp as HTMLButtonElement).disabled = pt >= SIZES_PT[SIZES_PT.length - 1];
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
    if (s.feedback.word) parts.push(T('paraula', 'palabra'));
    if (s.feedback.letter === 'name') parts.push(T('nom de la lletra', 'nombre de la letra'));
    if (s.feedback.letter === 'sound') parts.push(T('so de la lletra', 'sonido de la letra'));
    summary.textContent = anyTypingFeedback(s) ? `Feedback: ${parts.join(', ')}` : T('Sense feedback', 'Sin feedback');
    if (s.lockWhileSpeaking) summary.textContent += T(' · protecció activa', ' · protección activa');
  };
  settings.subscribe(refreshSettings);
  refreshSettings();

  const refreshVoices = () => {
    const v = speech.currentVoice();
    warning.hidden = !!v;
    warning.textContent = T('No s’ha trobat cap veu catalana', 'No se ha encontrado ninguna voz en castellano');
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
