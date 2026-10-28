// ARASAAC pictograms above the words (prototype, Catalan only). When a word is finished (a space,
// a punctuation mark, Enter, or the caret leaves it), the pictogram of that word appears above it.
// Pictograms are only shown on screen: they are decorations, not part of the document, so the
// .docx and PDF files stay as they were.
//
// The pictograms travel apart from the app, as a "pictos" folder next to it (pictos/index-ca.js
// and pictos/img/<id>.png), because their licence (CC BY-NC-SA 4.0) is not the app's (GPL).
// The index is a script, not JSON, so it also loads when the app is opened as a file (file://).
// It is built by scripts/pictos-index.py from the ARASAAC catalogue and the Softcatalà forms.

import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import { LANG, T } from './i18n';
import { settings } from './settings';
import { h } from './ui';

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

// Pictograms are only offered in Catalan for now.
export const pictosAvailable = LANG === 'ca';

let index: Index | null = null;
let stop = new Set<string>();
let loading: Promise<boolean> | null = null;
const listeners = new Set<() => void>();

// Loads pictos/index-ca.js once. Resolves to false when the folder is not next to the app.
export function loadPictos(): Promise<boolean> {
  if (!pictosAvailable) return Promise.resolve(false);
  loading ??= new Promise(resolve => {
    const s = document.createElement('script');
    s.src = PICTOS_BASE + 'index-ca.js';
    s.onload = () => {
      index = (window as unknown as { LECAA_PICTOS_CA?: Index }).LECAA_PICTOS_CA ?? null;
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
const CHOICES_KEY = 'lecaa-docs:pictos:ca';
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

// Every pictogram that fits the word, best first: the word itself as a keyword (or plural),
// then without an elided article or a pronoun attached ("l'aigua", "rentar-se"), then its lemma
// ("menjo" -> "menjar").
export function candidates(word: string): number[] {
  if (!index) return [];
  const n = norm(word);
  const tries = [n];
  const elided = n.match(/^(?:l|d|s|m|t|n)'(.+)$/);
  const core = elided ? elided[1] : n;
  if (core !== n) tries.push(core);
  const head = core.split(/['-]/)[0];
  if (head && head !== core) tries.push(head);
  for (const w of tries) {
    const flat = index.kw[w];
    if (flat) return idsOf(flat);
  }
  for (const w of tries) {
    const lem = index.lem[w];
    if (!lem) continue;
    const out: number[] = [];
    for (const entry of lem.split(';')) {
      const [lemma, pos] = entry.split('|');
      const flat = index.kw[lemma];
      if (flat) for (const id of idsOf(flat, TYPE_OF_POS[pos] ?? 0)) if (!out.includes(id)) out.push(id);
    }
    if (out.length) return out;
  }
  return [];
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

// Words of a textblock with their document positions. `cut` is where the text node of the first
// letter ends: a word in two styles (half bold) gets its pictogram on the first part only.
interface Word { text: string; from: number; to: number; cut: number }

function wordsOf(block: PMNode, start: number): { words: Word[]; text: string; pos: number[] } {
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
  const words: Word[] = [];
  for (const m of text.matchAll(WORD)) {
    const i = m.index!;
    const to = pos[i + m[0].length - 1] + 1;
    words.push({ text: m[0], from: pos[i], to, cut: nodeEnd[i] });
  }
  return { words, text, pos };
}

function build(state: EditorState): DecorationSet {
  if (!index || !settings.value.pictos.enabled || !pictosAvailable) return DecorationSet.empty;
  const decos: Decoration[] = [];
  let cuts = new Map<number, number>();
  const cutOf = (from: number) => cuts.get(from) ?? Infinity;
  const caret = state.selection.empty ? state.selection.head : -1;
  const deco = (from: number, to: number, word: string, id: number) => decos.push(Decoration.inline(from, Math.min(to, cutOf(from)),
    { class: 'pw', 'data-picto': String(id), 'data-word': norm(word), style: `--picto: url("${absUrl(id)}")` }));
  state.doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const { words, text, pos: map } = wordsOf(node, pos + 1);
    cuts = new Map(words.map(w => [w.from, w.cut]));
    const end = pos + 1 + node.content.size;
    // A word is finished when something follows it, or when the caret is elsewhere.
    const done = (w: Word) => w.to < end || caret !== w.to;
    for (let i = 0; i < words.length; i++) {
      if (!done(words[i])) continue;
      // Expressions of two or three words that ARASAAC has as one pictogram ("pa amb tomàquet").
      let joined = 0;
      for (let n = 3; n >= 2 && !joined; n--) {
        const group = words.slice(i, i + n);
        if (group.length < n || !done(group[n - 1])) continue;
        const from = map.indexOf(group[0].from), to = map.indexOf(group[n - 1].to - 1) + 1;
        const phrase = text.slice(from, to);
        if (!/^[^\s]+(?: [^\s]+)+$/.test(phrase)) continue;
        const id = pictoFor(phrase);
        if (id) { deco(group[0].from, group[n - 1].to, phrase, id); joined = n; }
      }
      if (joined) { i += joined - 1; continue; }
      const id = pictoFor(words[i].text);
      if (id) deco(words[i].from, words[i].to, words[i].text, id);
    }
    return false;
  });
  return DecorationSet.create(state.doc, decos);
}

const REFRESH = 'lecaa-pictos-refresh';

export function refreshPictos(view: EditorView) {
  view.dom.classList.toggle('pictos-on', !!index && settings.value.pictos.enabled && pictosAvailable);
  view.dispatch(view.state.tr.setMeta(REFRESH, true).setMeta('lecaa-system', true).setMeta('addToHistory', false));
}

// The picture of a word sits above its text box: a press there opens the chooser.
function pictoAt(e: MouseEvent | Touch, target: EventTarget | null): HTMLElement | null {
  const el = (target as HTMLElement | null)?.closest?.('.pw') as HTMLElement | null;
  if (!el) return null;
  return e.clientY < el.getBoundingClientRect().top ? el : null;
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
  const box = h('div', { class: 'picto-chooser', role: 'dialog', 'aria-label': T(`Pictogrames per a «${word}»`, `Pictogramas para «${word}»`) },
    h('div', { class: 'picto-chooser-title' }, T(`Tria el pictograma de «${word}»`, `Elige el pictograma de «${word}»`)),
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
