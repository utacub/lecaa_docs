import './styles.css';
import type { Editor } from '@tiptap/core';
import {
  AArrowDown, AArrowUp, Bold, Check, ChevronDown, Columns3, Maximize, FileDown, FilePlus, FileType, FolderOpen, Globe, Image as ImageIcon, Info, Italic, List, ListOrdered, Pause, Play,
  Printer, Redo2, Rows3, Settings as SettingsIcon, Square, SquareMinus, Table as TableIcon, TextAlignCenter, TextAlignEnd,
  TextAlignStart, TextCursorInput, Trash2, Underline, Undo2,
} from 'lucide';
import { openAbout } from './about';
import { FONTS, fontByFamily, fontById, loadFonts } from './fonts';
import { LANG, LANGS, switchLang, T } from './i18n';
import { BASE_PT, docxFromEditor, htmlFromFile, openFile, safeName, saveFile } from './docio';
import { createEditor, installKeyboardGuard } from './editor';
import { reader } from './reader';
import { anyTypingFeedback, settings } from './settings';
import { openSettings } from './settings-panel';
import { installSpellMenu } from './spell-menu';
import { loadPictos, PictoIcon, pictosAvailable, refreshPictos } from './pictos';
import { pictosForExport } from './pictos-export';
import { speech } from './speech';
import { installAudioUnlock } from './speech/audio';
import { neural } from './speech/neural';
import { lock } from './lock';
import { openDocuments } from './documents';
import { deleteDoc, keepsSeveral, listDocs, loadDoc, newDocId, openDocId, setOpenDocId, storeDoc, type SavedDoc } from './storage';
import { fitToVisibleArea } from './viewport';
import { h, icon, toast } from './ui';
import lecaaDocsLogo from './assets/marca/lecaa-docs.svg?raw';
import utacLogo from './assets/marca/utac-negre.webp?url';

neural.onNotice((message, preparing) => toast(message, preparing ? 5000 : 10000));


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
  const untitled = () => T('Document sense títol', 'Documento sin título');
  const title = h('input', { class: 'doc-title', value: saved?.title ?? untitled(), 'aria-label': T('Títol del document', 'Título del documento') }) as HTMLInputElement;
  const saveState = h('span', { class: 'save-state', 'aria-live': 'polite' });
  const page = h('div', { class: 'page' });
  const workspace = h('main', { class: 'workspace' }, page);
  const editor = createEditor(page, saved?.content ?? null);
  installKeyboardGuard(editor);
  installSpellMenu(editor, workspace);
  installAudioUnlock();
  fitToVisibleArea(editor);

  // ----- autosave of the open document (each one under its own id, see storage.ts) -----
  let docId = openDocId();
  let created = saved?.created ?? saved?.updated ?? Date.now();
  let timer = 0, dirty = false;
  const savedText = () => T('Desat en aquest dispositiu', 'Guardado en este dispositivo');
  const saveNow = async () => {
    clearTimeout(timer);
    dirty = false;
    const ok = await storeDoc({ title: title.value, content: editor.getJSON(), updated: Date.now(), created }, docId);
    saveState.textContent = ok ? savedText() : T('No s’ha pogut desar', 'No se ha podido guardar');
  };
  const persist = () => {
    clearTimeout(timer);
    dirty = true;
    saveState.textContent = T('Desant…', 'Guardando…');
    timer = window.setTimeout(saveNow, 700);
  };
  editor.on('update', persist);
  title.addEventListener('input', persist);
  saveState.textContent = saved ? savedText() : '';

  // ----- documents: new, open from the list, open a file, delete -----
  // Shows a document without counting as a change (its dates stay as they were) and without an
  // undo step that would bring the previous document back.
  const show = (id: string, doc: SavedDoc | null) => {
    reader.stop(); speech.stop();
    clearTimeout(timer); dirty = false;
    docId = id; setOpenDocId(id);
    created = doc?.created ?? doc?.updated ?? Date.now();
    editor.chain().command(({ tr }) => { tr.setMeta('lecaa-system', true).setMeta('addToHistory', false); return true; })
      .setContent(doc?.content ?? '', { emitUpdate: false }).run();
    title.value = doc?.title ?? untitled();
    saveState.textContent = doc ? savedText() : '';
  };
  const blank = () => editor.isEmpty && (title.value.trim() === '' || title.value === untitled());
  // Before another document is shown: the open one is saved, or left out of the list when blank.
  const leave = async () => {
    if (blank()) { clearTimeout(timer); dirty = false; if (keepsSeveral()) await deleteDoc(docId); return; }
    if (dirty) await saveNow();
  };
  const newDoc = async () => {
    if (blank()) { editor.commands.focus(); return; }
    if (!keepsSeveral() && !confirm(T('Vols començar un document nou? El document actual s’esborrarà d’aquest dispositiu si no l’has desat.', '¿Quieres empezar un documento nuevo? El documento actual se borrará de este dispositivo si no lo has guardado.'))) return;
    await leave();
    show(newDocId(), null);
    editor.commands.focus();
    if (keepsSeveral()) toast(T('Document nou. L’anterior és a «Els meus documents».', 'Documento nuevo. El anterior está en «Mis documentos».'));
  };
  const openSaved = async (id: string) => {
    if (id === docId) { editor.commands.focus(); return; }
    const doc = await loadDoc(id);
    if (!doc) { toast(T('No s’ha pogut obrir aquest document', 'No se ha podido abrir este documento')); return; }
    await leave();
    show(id, doc);
    editor.commands.focus('end');
  };
  // A file from the device (.docx, .html, .txt) becomes a new document of the list.
  const importFile = async () => {
    const f = await openFile();
    if (!f) return;
    try {
      const html = await htmlFromFile(f.name, f.data);
      await leave();
      show(newDocId(), null);
      editor.chain().command(({ tr }) => { tr.setMeta('lecaa-system', true).setMeta('addToHistory', false); return true; }).setContent(html, { emitUpdate: false }).run();
      title.value = f.name.replace(/\.[^.]+$/, '');
      await saveNow();
      toast(T('Document obert', 'Documento abierto'));
    } catch (e) {
      console.error(e);
      toast(T('No s’ha pogut obrir aquest fitxer', 'No se ha podido abrir este archivo'));
    }
  };
  const removeDoc = async (id: string) => {
    await deleteDoc(id);
    if (id !== docId) return;
    // The open document was deleted: the last changed one opens, or a blank page.
    clearTimeout(timer); dirty = false;
    const next = (await listDocs())[0];
    show(next?.id ?? newDocId(), next ?? null);
  };
  const showDocuments = () => openDocuments(
    { current: () => docId, open: openSaved, create: newDoc, importFile, remove: removeDoc },
    () => editor.commands.focus());
  // With the pictograms on screen, the documents get them too. The single file opened from the
  // disk cannot read their pictures: it saves the text alone and says so.
  const unreadablePictos = () => T(' Sense pictogrames: des del fitxer obert al disc no es poden desar. Per desar-los, fes servir l’app web.', ' Sin pictogramas: desde el archivo abierto en el disco no se pueden guardar. Para guardarlos, usa la app web.');
  const savePdf = async () => {
    try {
      toast(T('Preparant el PDF…', 'Preparando el PDF…'));
      const pictos = await pictosForExport(editor.getJSON());
      const { pdfFromEditor } = await import('./pdf');
      const blob = await pdfFromEditor(editor, title.value, pictos);
      if (await saveFile(blob, safeName(title.value) + '.pdf', 'pdf')) toast(T('Desat com a PDF.', 'Guardado como PDF.') + (pictos === 'unreadable' ? unreadablePictos() : ''), pictos === 'unreadable' ? 8000 : undefined);
    } catch (e) {
      console.error(e);
      toast(T('No s’ha pogut desar el PDF', 'No se ha podido guardar el PDF'));
    }
  };
  const save = async () => {
    try {
      const pictos = await pictosForExport(editor.getJSON());
      const blob = await docxFromEditor(editor, title.value, pictos);
      if (await saveFile(blob, safeName(title.value) + '.docx')) toast(T('Desat com a .docx (es pot obrir amb Google Docs).', 'Guardado como .docx (se puede abrir con Google Docs).') + (pictos === 'unreadable' ? unreadablePictos() : ''), pictos === 'unreadable' ? 8000 : undefined);
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
    italic: tb(T('Cursiva', 'Cursiva'), Italic, run(c => c.toggleItalic())),
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

  // ----- pictograms above the words -----
  const pictosMissing = () => toast(T('No s’han trobat els pictogrames. Posa la carpeta «pictos» al costat de LECAA Docs i torna a obrir l’app.', 'No se han encontrado los pictogramas. Pon la carpeta «pictos» junto a LECAA Docs y vuelve a abrir la app.'), 8000);
  // The single file sent alone (without the "pictos" folder) has no pictograms: the button then
  // shows them off, and says why only when it is pressed, not each time the app opens.
  let missing = false;
  const pictoBtn = tb(T('Pictogrames damunt de les paraules', 'Pictogramas encima de las palabras'), PictoIcon, () => {
    const on = missing || !settings.value.pictos.enabled;
    if (on) void loadPictos().then(ok => { missing = !ok; refreshPictoBtn(); refreshPictos(editor.view); if (!ok) pictosMissing(); });
    settings.update(x => { x.pictos.enabled = on; });
    editor.commands.focus();
  });
  pictoBtn.hidden = !pictosAvailable;

  const toolbar = h('div', { class: 'toolbar', role: 'toolbar', 'aria-label': T('Format', 'Formato') },
    tb(T('Document nou', 'Documento nuevo'), FilePlus, () => void newDoc()), tb(T('Els meus documents', 'Mis documentos'), FolderOpen, showDocuments), tb(T('Desa com a .docx', 'Guardar como .docx'), FileDown, save), tb(T('Desa com a PDF', 'Guardar como PDF'), FileType, savePdf), tb(T('Imprimeix', 'Imprimir'), Printer, () => window.print()),
    h('span', { class: 'sep' }), undo, redo,
    h('span', { class: 'sep' }), fontSel, sizeSel, sizeDown, sizeUp,
    h('span', { class: 'sep' }), fmt.bold, fmt.italic, fmt.underline,
    h('span', { class: 'sep' }), fmt.left, fmt.center, fmt.right,
    h('span', { class: 'sep' }), fmt.bullet, fmt.ordered,
    h('span', { class: 'sep' }), tb(T('Insereix una taula', 'Insertar una tabla'), TableIcon, run(c => c.insertTable({ rows: 3, cols: 3, withHeaderRow: false }))), tb(T('Insereix una imatge', 'Insertar una imagen'), ImageIcon, insertImage),
    ...(pictosAvailable ? [pictoBtn] : []), tableTools);

  // ----- voice bar (the main controls) -----
  // One reading button: reads the selection if there is one, otherwise from the cursor (or the
  // whole text when the cursor is at the end). While reading it pauses, and when paused it resumes.
  const readLabel = T('Llegeix', 'Leer');
  const playBtn = h('button', { class: 'vbtn icon-only', type: 'button', title: T('Llegeix la selecció o des del cursor', 'Leer la selección o desde el cursor'), 'aria-label': readLabel }, icon(Play));
  const stopBtn = h('button', { class: 'vbtn ghost icon-only', type: 'button', title: T('Atura', 'Detener'), 'aria-label': T('Atura', 'Detener'), hidden: true }, icon(Square));
  const setBtn = h('button', { class: 'vbtn ghost icon-only kiosk-hide', type: 'button', 'aria-label': T('Configuració', 'Configuración') }, icon(SettingsIcon));
  const fullBtn = h('button', { class: 'vbtn ghost icon-only kiosk-hide', type: 'button', title: T('Pantalla completa', 'Pantalla completa'), 'aria-label': T('Pantalla completa', 'Pantalla completa') }, icon(Maximize));
  fullBtn.addEventListener('click', () => void lock.enter());
  const aboutLabel = T('Sobre LECAA Docs', 'Sobre LECAA Docs');
  const aboutBtn = h('button', { class: 'vbtn ghost icon-only kiosk-hide', type: 'button', title: aboutLabel, 'aria-label': aboutLabel }, icon(Info));
  aboutBtn.addEventListener('click', () => openAbout(() => aboutBtn.focus()));
  const warning = h('span', { class: 'voice-warning', hidden: true });

  const read = () => {
    if (reader.reading) { reader.pause(); return; }
    if (reader.paused) { reader.resume(); return; }
    if (!speech.currentVoice()) { toast(T('No hi ha cap veu catalana disponible. Obre la configuració.', 'No hay ninguna voz en castellano disponible. Abre la configuración.')); return; }
    if (!editor.state.selection.empty) reader.start('selection');
    else if (!reader.start('cursor') && !reader.start('all')) toast(T('No hi ha text per llegir', 'No hay texto para leer'));
  };
  playBtn.addEventListener('click', read);
  stopBtn.addEventListener('click', () => { reader.stop(); speech.stop(); });
  // Reading buttons must keep the editor selection.
  for (const b of [playBtn, stopBtn]) b.addEventListener('mousedown', e => e.preventDefault());

  reader.onState = () => {
    stopBtn.hidden = !reader.reading && !reader.paused;
    const label = reader.reading ? T('Pausa', 'Pausa') : reader.paused ? T('Continua', 'Continuar') : readLabel;
    playBtn.replaceChildren(icon(reader.reading ? Pause : Play));
    playBtn.setAttribute('aria-label', label);
    playBtn.title = reader.reading || reader.paused ? label : T('Llegeix la selecció o des del cursor', 'Leer la selección o desde el cursor');
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

  const actions = h('div', { class: 'topbar-actions', role: 'toolbar', 'aria-label': T('Veu i pantalla', 'Voz y pantalla') },
    playBtn, stopBtn, fullBtn, aboutBtn, setBtn);

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
  const brand = h('span', { class: 'brand' },
    h('img', { class: 'utac-logo', src: utacLogo, alt: 'UTAC' }),
    h('span', { class: 'lecaa-docs-logo', role: 'img', 'aria-label': 'LECAA Docs' }));
  (brand.lastChild as HTMLElement).innerHTML = lecaaDocsLogo;
  const topbar = h('header', { class: 'topbar' }, brand, title, saveState, langSwitch, warning, actions);

  document.getElementById('app')!.replaceWith(topbar, toolbar, workspace);
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
    document.documentElement.style.setProperty('--picto-size', `${s.pictos.size}em`);
    document.documentElement.style.setProperty('--picto-fade', `${s.pictos.fadeSeconds}s`);
    const parts: string[] = [];
    if (s.feedback.sentence) parts.push(T('frase', 'frase'));
    if (s.feedback.word) parts.push(T('paraula', 'palabra'));
    if (s.feedback.letter === 'name') parts.push(T('nom de la lletra', 'nombre de la letra'));
    if (s.feedback.letter === 'sound') parts.push(T('so de la lletra', 'sonido de la letra'));
    // The feedback in use is shown as the settings button's tooltip.
    let summary = anyTypingFeedback(s) ? T('Feedback: {llista}', 'Feedback: {llista}', { llista: parts.join(', ') }) : T('Sense feedback', 'Sin feedback');
    if (s.lockWhileSpeaking) summary += T(' · protecció activa', ' · protección activa');
    setBtn.title = `${T('Configuració', 'Configuración')} (${summary})`;
  };
  settings.subscribe(refreshSettings);
  function refreshPictoBtn() { pictoBtn.setAttribute('aria-pressed', String(settings.value.pictos.enabled && !missing)); }
  settings.subscribe(() => { refreshPictoBtn(); refreshPictos(editor.view); });
  refreshPictoBtn();
  if (pictosAvailable && settings.value.pictos.enabled) {
    void loadPictos().then(ok => { missing = !ok; refreshPictoBtn(); refreshPictos(editor.view); });
  }
  settings.subscribe(s => { if (s.feedback.letter === 'sound') speech.preloadClips(); });
  if (settings.value.feedback.letter === 'sound') speech.preloadClips();
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
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
  }
  (window as unknown as { lecaa: object }).lecaa = { editor, speech, settings, reader };
}

void boot();
