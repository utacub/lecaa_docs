// ARASAAC pictograms above the words, in the six languages of the app. When a word is finished (a
// space, a punctuation mark, Enter, or the caret leaves it), the pictogram of that word appears
// above it. On screen they are decorations, not part of the document; the .docx and PDF files get
// them when they are shown (pictos-export.ts).
//
// The pictograms travel apart from the app, as a "pictos" folder next to it (pictos/index-ca.js,
// pictos/index-es.js... and pictos/img/<id>.png, the same images for every language), because their
// licence (CC BY-NC-SA 4.0) is not the app's (GPL). The index is a script, not JSON, so it also
// loads when the app is opened as a file (file://). scripts/pictos-index.py builds it from the
// ARASAAC catalogue and the inflected forms of each language (Softcatalà, spanish-dict-tools,
// FreeLing for Galician and French, and the rules of scripts/pictos-formes.py for English and Basque).

import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import type { IconNode } from 'lucide';
import { LANG, T } from './i18n';
import { settings } from './settings';
import { inTauri } from './speech/native';
import { h } from './ui';
import { STORAGE } from './storage-name';

// Toolbar icon, in Lucide's style: a pictogram (a face in a square) above a line of text.
export const PictoIcon: IconNode = [
  ['rect', { x: '6', y: '1', width: '12', height: '12', rx: '2' }],
  ['path', { d: 'M9.5 8.5a3 3 0 0 0 5 0' }],
  ['path', { d: 'M10 5h.01' }],
  ['path', { d: 'M14 5h.01' }],
  ['path', { d: 'M3 17.5h18' }],
  ['path', { d: 'M3 22h12' }],
];

export const PICTOS_BASE = './pictos/';
export const pictoUrl = (id: number) => `${PICTOS_BASE}img/${id}.png`;
// CSS resolves a url() inside a custom property against the stylesheet, so decorations get it whole.
const absUrl = (id: number) => new URL(pictoUrl(id), document.baseURI).href;

interface Index {
  v: number;
  kw: Record<string, number[]>;  // keyword (or its plural) -> [id, keyword type, id, type, …], best first
  lem: Record<string, string>;   // inflected form -> "lemma|N;lemma|V" (N noun, V verb, A adjective, R adverb)
  stop: string[];                // function words
}

// Languages with an index in the pictogram pack: all six.
export const PICTO_LANGS = ['ca', 'es', 'eu', 'gl', 'en', 'fr'];
export const pictosAvailable = PICTO_LANGS.includes(LANG);

// How ARASAAC asks to cite its pictograms (arasaac.org/terms-of-use: author, origin, licence and
// owner). It goes wherever they are shown or saved: the settings, "About", the .docx and PDF
// files (page footer) and the printed page.
export const pictoCredit = () => T(
  'Autor dels pictogrames: Sergio Palao. Origen: ARASAAC (https://arasaac.org). Llicència: CC (BY-NC-SA). Propietat: Govern d’Aragó (Espanya).',
  'Autor pictogramas: Sergio Palao. Origen: ARASAAC (https://arasaac.org). Licencia: CC (BY-NC-SA). Propiedad: Gobierno de Aragón (España).');
export const PICTO_LICENCE_URL = 'https://creativecommons.org/licenses/by-nc-sa/4.0/';
export const ARASAAC_TERMS_URL = 'https://arasaac.org/terms-of-use';

let index: Index | null = null;
let stop = new Set<string>();
let loading: Promise<boolean> | null = null;
const listeners = new Set<() => void>();

// Loads the index of the language (pictos/index-ca.js) once. Resolves to false when the folder is
// not next to the app.
export function loadPictos(): Promise<boolean> {
  if (!pictosAvailable) return Promise.resolve(false);
  loading ??= new Promise(resolve => {
    const s = document.createElement('script');
    s.src = `${PICTOS_BASE}index-${LANG}.js`;
    s.onload = () => {
      index = (window as unknown as Record<string, Index | undefined>)[`LECAA_PICTOS_${LANG.toUpperCase()}`] ?? null;
      stop = new Set(index?.stop ?? []);
      resolve(!!index);
      for (const l of listeners) l();
    };
    s.onerror = () => { loading = null; s.remove(); resolve(false); };
    document.head.append(s);
  });
  return loading;
}

export const pictosLoaded = () => !!index;
export const onPictosLoaded = (l: () => void) => listeners.add(l);

// ----- the student's own choices: word -> pictogram id (0 = no pictogram) -----
const CHOICES_KEY = `${STORAGE}:pictos:${LANG}`;
let choices: Record<string, number> = {};
try { choices = JSON.parse(localStorage.getItem(CHOICES_KEY) || '{}') ?? {}; } catch { /* private mode */ }
function choose(word: string, id: number | null) {
  if (id === null) delete choices[word]; else choices[word] = id;
  try { localStorage.setItem(CHOICES_KEY, JSON.stringify(choices)); } catch { /* ignore */ }
}

const norm = (w: string) => w.normalize('NFC').replace(/’/g, "'").toLowerCase();
const TYPE_OF_POS: Record<string, number> = { N: 2, V: 3, A: 4, R: 4 };

function idsOf(flat: number[], preferType = 0): number[] {
  const ids: number[] = [];
  const rest: number[] = [];
  for (let i = 0; i < flat.length; i += 2) (flat[i + 1] === preferType ? ids : rest).push(flat[i]);
  return [...ids, ...rest];
}

// Elided words before an apostrophe (Catalan "l'aigua", French "j'aime", "qu'il") and English
// endings after one ("dad's", "don't").
const ELIDED: Partial<Record<string, RegExp>> = {
  ca: /^(?:l|d|s|m|t|n)'(.+)$/,
  fr: /^(?:l|d|s|m|t|n|j|c|qu|jusqu|lorsqu|puisqu)'(.+)$/,
  en: /^(.+?)(?:'s|'ll|'re|'ve|'d|'m|n't)$/,
};
const EN_NOT: Record<string, string> = { "can't": 'can', "won't": 'will', "shan't": 'shall' };

// Every pictogram that fits the word, best first: the word itself as a keyword (or plural),
// then without an elided article or a pronoun attached ("l'aigua", "rentar-se"), then its lemma
// ("menjo" -> "menjar"). A word that is a keyword and also a form of another one ("como", of
// "comer") keeps its own pictograms first and offers the others after them.
export function candidates(word: string): number[] {
  if (!index) return [];
  const n = norm(word);
  const tries = [n];
  const elided = EN_NOT[n] ? [n, EN_NOT[n]] : n.match(ELIDED[LANG] ?? /$^/);
  const core = elided ? elided[1] : n;
  if (core !== n) tries.push(core);
  // A pronoun attached to a single word ("rentar-se"); never inside an expression of several words.
  const head = core.includes(' ') ? core : core.split(/['-]/)[0];
  if (head && head !== core) tries.push(head);
  const out: number[] = [];
  const add = (ids: number[]) => { for (const id of ids) if (!out.includes(id)) out.push(id); };
  const lemmas = (w: string) => {
    for (const entry of index!.lem[w]?.split(';') ?? []) {
      const [lemma, pos] = entry.split('|');
      const flat = index!.kw[lemma];
      if (flat) add(idsOf(flat, TYPE_OF_POS[pos] ?? 0));
    }
  };
  const exact = tries.find(w => index!.kw[w]);
  if (exact) {
    add(idsOf(index.kw[exact]));
    lemmas(exact);
    return out;
  }
  for (const w of tries) {
    lemmas(w);
    if (out.length) return out;
  }
  return out;
}

// The pictogram shown for a word, or 0.
export function pictoFor(word: string): number {
  const n = norm(word);
  if (n in choices) return choices[n];
  if (settings.value.pictos.contentOnly && stop.has(n)) return 0;
  return candidates(word)[0] ?? 0;
}

// ----- decorations -----
const WORD = /[\p{L}\p{N}·]+(?:['’-][\p{L}\p{N}·]+)*['’]?/gu;
const key = new PluginKey<DecorationSet>('lecaa-pictos');

// The pictograms of a text: one per word, or one for an expression of two or three words that
// ARASAAC has as a single pictogram ("pa amb tomàquet"). `from` and `to` are offsets in the text.
// `finished(to)` says whether the word that ends at `to` is finished; unfinished words wait.
export interface PictoSpan { from: number; to: number; id: number; word: string }

export function pictosIn(text: string, finished: (to: number) => boolean = () => true): PictoSpan[] {
  const words = [...text.matchAll(WORD)].map(m => ({ text: m[0], from: m.index!, to: m.index! + m[0].length }));
  const out: PictoSpan[] = [];
  for (let i = 0; i < words.length; i++) {
    if (!finished(words[i].to)) continue;
    let joined = 0;
    for (let n = 3; n >= 2 && !joined; n--) {
      const group = words.slice(i, i + n);
      if (group.length < n || !finished(group[n - 1].to)) continue;
      const phrase = text.slice(group[0].from, group[n - 1].to);
      if (!/^[^\s]+(?: [^\s]+)+$/.test(phrase)) continue;
      const id = pictoFor(phrase);
      if (id) { out.push({ from: group[0].from, to: group[n - 1].to, id, word: phrase }); joined = n; }
    }
    if (joined) { i += joined - 1; continue; }
    const id = pictoFor(words[i].text);
    if (id) out.push({ from: words[i].from, to: words[i].to, id, word: words[i].text });
  }
  return out;
}

// Whether the pictograms are on screen now (and so go into the saved documents).
export const pictosShown = () => !!index && settings.value.pictos.enabled && pictosAvailable;

// The text of a textblock with the document position of each character, and where the text node
// of each character ends: a word in two styles (half bold) gets its pictogram on the first part.
function textOf(block: PMNode, start: number): { text: string; pos: number[]; nodeEnd: number[] } {
  let text = '';
  const pos: number[] = [];
  const nodeEnd: number[] = [];
  block.forEach((child, offset) => {
    const p = start + offset;
    if (child.isText) {
      const t = child.text ?? '';
      for (let i = 0; i < t.length; i++) { text += t[i]; pos.push(p + i); nodeEnd.push(p + t.length); }
    } else { text += ' '; pos.push(p); nodeEnd.push(p + 1); }
  });
  return { text, pos, nodeEnd };
}

function build(state: EditorState): DecorationSet {
  if (!pictosShown()) return DecorationSet.empty;
  const decos: Decoration[] = [];
  const caret = state.selection.empty ? state.selection.head : -1;
  // When the pictograms fade or are only shown on demand, the word with the caret (or inside the
  // selection) shows its own: a touch or a click on a word brings its pictogram back.
  const { from: selFrom, to: selTo } = state.selection;
  const onDemand = settings.value.pictos.show !== 'always';
  state.doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const { text, pos: map, nodeEnd } = textOf(node, pos + 1);
    const end = pos + 1 + node.content.size;
    // A word is finished when something follows it, or when the caret is elsewhere.
    const docTo = (to: number) => map[to - 1] + 1;
    for (const p of pictosIn(text, to => docTo(to) < end || caret !== docTo(to))) {
      const from = map[p.from];
      const here = onDemand && selFrom <= docTo(p.to) && selTo >= from;
      decos.push(Decoration.inline(from, Math.min(docTo(p.to), nodeEnd[p.from]),
        { class: here ? 'pw pw-here' : 'pw', 'data-picto': String(p.id), 'data-word': norm(p.word), style: `--picto: url("${absUrl(p.id)}")` }));
    }
    return false;
  });
  return DecorationSet.create(state.doc, decos);
}

const REFRESH = 'lecaa-pictos-refresh';

export function refreshPictos(view: EditorView) {
  const show = settings.value.pictos.show;
  view.dom.classList.toggle('pictos-on', pictosShown());
  view.dom.classList.toggle('pictos-fade', show === 'fade');
  view.dom.classList.toggle('pictos-caret', show === 'caret');
  view.dom.dataset.pictoCredit = pictoCredit(); // printed below the text (styles.css)
  const tr = view.state.tr.setMeta(REFRESH, true).setMeta('lecaa-system', true).setMeta('addToHistory', false);
  // Lines are taller with pictograms (and shorter without): the caret must stay in sight.
  if (view.hasFocus()) tr.scrollIntoView();
  view.dispatch(tr);
}

// The picture of a word sits above its text box: a press there opens the chooser.
function pictoAt(e: MouseEvent | Touch, target: EventTarget | null): HTMLElement | null {
  const el = (target as HTMLElement | null)?.closest?.('.pw') as HTMLElement | null;
  if (!el || e.clientY >= el.getBoundingClientRect().top) return null;
  return hidden(el) ? null : el;
}

// A pictogram that has faded, or that waits for its word to be touched, does not open the chooser.
function hidden(el: HTMLElement): boolean {
  const show = settings.value.pictos.show;
  if (show === 'always' || el.classList.contains('pw-here')) return false;
  if (show === 'caret') return true;
  const out = el.getAnimations?.({ subtree: true }).find(a => (a as CSSAnimation).animationName === 'picto-out');
  return (out?.effect?.getComputedTiming().progress ?? 0) > 0.5;
}

export const PictoLayer = Extension.create({
  name: 'pictoLayer',
  addProseMirrorPlugins() {
    return [new Plugin<DecorationSet>({
      key,
      state: {
        init: (_, state) => build(state),
        apply: (tr, set, _old, state) => (tr.docChanged || tr.selectionSet || tr.getMeta(REFRESH) ? build(state) : set),
      },
      props: {
        decorations: state => key.getState(state),
        handleDOMEvents: {
          mousedown(view, e) {
            const el = pictoAt(e, e.target);
            if (!el) return false;
            e.preventDefault();
            openChooser(view, el);
            return true;
          },
          touchend(view, e) {
            const t = e.changedTouches[0];
            const el = t ? pictoAt(t, e.target) : null;
            if (!el) return false;
            e.preventDefault();
            openChooser(view, el);
            return true;
          },
        },
      },
    })];
  },
});

// ----- chooser: other pictograms for the same word, or none -----
function openChooser(view: EditorView, el: HTMLElement) {
  document.querySelector('.picto-chooser')?.remove();
  const word = el.dataset.word ?? '';
  const current = Number(el.dataset.picto);
  const ids = candidates(word).slice(0, 24);
  const close = () => { box.remove(); document.removeEventListener('pointerdown', outside, true); view.focus(); };
  const pick = (id: number | null) => { choose(word, id); close(); refreshPictos(view); };
  const outside = (e: Event) => { if (!box.contains(e.target as Node)) close(); };
  const box = h('div', { class: 'picto-chooser', role: 'dialog', 'aria-label': T('Pictogrames per a «{paraula}»', 'Pictogramas para «{paraula}»', { paraula: word }) },
    h('div', { class: 'picto-chooser-title' }, T('Tria el pictograma de «{paraula}»', 'Elige el pictograma de «{paraula}»', { paraula: word })),
    h('div', { class: 'picto-chooser-grid' }, ...ids.map(id => h('button', {
      type: 'button', class: 'picto-option', 'aria-pressed': String(id === current), title: `ARASAAC ${id}`,
      onclick: () => pick(id),
    }, h('img', { src: pictoUrl(id), alt: `${word} (${id})`, loading: 'lazy' })))),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'small-btn', onclick: () => pick(0) }, T('Sense pictograma', 'Sin pictograma')),
      word in choices ? h('button', { type: 'button', class: 'small-btn', onclick: () => pick(null) }, T('Torna al de sempre', 'Volver al de siempre')) : null));
  box.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  document.body.append(box);
  const r = el.getBoundingClientRect();
  const w = box.offsetWidth, hgt = box.offsetHeight;
  const left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8));
  const top = r.bottom + 8 + hgt < window.innerHeight ? r.bottom + 8 : Math.max(8, r.top - hgt - 8);
  box.style.left = `${left}px`;
  box.style.top = `${top}px`;
  document.addEventListener('pointerdown', outside, true);
  (box.querySelector('button[aria-pressed="true"]') as HTMLButtonElement ?? box.querySelector('button'))?.focus();
}

// ----- offline: all the pictograms on the device (online edition / PWA) -----
// Same cache as the service worker (src/sw.js). The single file cannot keep them: it needs the
// "pictos" folder next to it. The desktop app already has them all inside.
const PICTOS_CACHE = `${STORAGE}-pictogrames`; // the service worker's PREFIX + 'pictogrames'
export const offlineSupported = pictosAvailable && !__SINGLE_FILE__ && !inTauri() && location.protocol.startsWith('http') && 'caches' in window;

export function allPictoIds(): number[] {
  const ids = new Set<number>();
  if (index) for (const flat of Object.values(index.kw)) for (let i = 0; i < flat.length; i += 2) ids.add(flat[i]);
  return [...ids].sort((a, b) => a - b);
}

async function cachedIds(): Promise<Set<number>> {
  const c = await caches.open(PICTOS_CACHE);
  const ids = new Set<number>();
  for (const r of await c.keys()) {
    const m = new URL(r.url).pathname.match(/\/pictos\/img\/(\d+)\.png$/);
    if (m) ids.add(Number(m[1]));
  }
  return ids;
}

// How many pictograms of this language are on the device (both languages share the images).
export async function offlineCount(): Promise<number> {
  try {
    const have = await cachedIds();
    return allPictoIds().filter(id => have.has(id)).length;
  } catch { return 0; }
}

// Downloads the pictograms that are not on the device yet, those of every language. They come
// joined in about ten large files (pictos/paquets, made by scripts/pictos-paquets.py) that are split
// here into one image per pictogram, the same entries that the service worker keeps when a
// pictogram is shown.
interface Packs { v: number; files: string[]; parts: number[][] }

export async function downloadAll(onProgress: (done: number, total: number) => void, signal: AbortSignal): Promise<{ saved: number; failed: number }> {
  await navigator.storage?.persist?.().catch(() => false);
  const c = await caches.open(PICTOS_CACHE);
  const packs = await (await fetch(PICTOS_BASE + 'paquets/index.json', { signal, cache: 'no-cache' })).json() as Packs;
  const have = await cachedIds();
  const total = packs.parts.reduce((n, p) => n + p.length / 3, 0);
  let done = 0, failed = 0;
  for (let f = 0; f < packs.files.length && !signal.aborted; f++) {
    const part = packs.parts[f];
    const todo: number[] = [];
    for (let i = 0; i < part.length; i += 3) if (have.has(part[i])) done++; else todo.push(i);
    onProgress(done, total);
    if (!todo.length) continue;
    let data: ArrayBuffer;
    try { data = await (await fetch(PICTOS_BASE + 'paquets/' + packs.files[f], { signal })).arrayBuffer(); }
    catch { if (!signal.aborted) { failed += todo.length; done += todo.length; } continue; }
    for (let k = 0; k < todo.length && !signal.aborted; k += 50) {
      await Promise.all(todo.slice(k, k + 50).map(i => {
        const [id, off, len] = [part[i], part[i + 1], part[i + 2]];
        const body = new Blob([data.slice(off, off + len)], { type: 'image/png' });
        return c.put(absUrl(id), new Response(body, { headers: { 'Content-Type': 'image/png' } }));
      }));
      done += Math.min(50, todo.length - k);
      onProgress(done, total);
    }
  }
  return { saved: done - failed, failed };
}

export async function deleteOffline() {
  const c = await caches.open(PICTOS_CACHE);
  await Promise.all((await c.keys()).filter(r => r.url.includes('/pictos/img/')).map(r => c.delete(r)));
}
