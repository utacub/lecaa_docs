import { Editor, Extension } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import { Plugin } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { ReplaceStep } from '@tiptap/pm/transform';
import StarterKit from '@tiptap/starter-kit';
import { itemsForChar, itemsForEnter, playFeedback } from './feedback';
import { guard } from './guard';
import { LANG, T } from './i18n';
import { PictoLayer } from './pictos';
import { reader, ReaderHighlight } from './reader';
import { settings } from './settings';

// Text of the current block up to the caret (images and breaks count as a space).
export function textBefore(state: EditorState): string {
  const { $from } = state.selection;
  return $from.parent.textBetween(0, $from.parentOffset, undefined, ' ');
}

function insertedText(tr: Transaction): string {
  let out = '';
  for (const step of tr.steps) {
    if (step instanceof ReplaceStep) out += step.slice.content.textBetween(0, step.slice.content.size, '', '');
  }
  return out;
}

// Keys that the window-level keydown listener has already checked. System on-screen keyboards
// (Android, and iPad, ChromeOS or Windows with suggestions or IME) often send no usable key
// ("Unidentified", keyCode 229, or a composition), so their input is checked from the text
// they insert instead (beforeinput), and nothing is checked twice.
let checkedKeyAt = 0;
const takeCheckedKey = () => { const fresh = performance.now() - checkedKeyAt < 1000; checkedKeyAt = 0; return fresh; };
const unidentified = (e: KeyboardEvent) => e.key === 'Unidentified' || e.key === 'Process' || e.keyCode === 229 || e.isComposing;

// Text being composed (Android keyboards compose each word): the newly typed character is
// the difference between two updates.
let composing = '';

// Enter feedback can arrive both as a key and as an inserted paragraph; it is played once.
let enterAt = 0;
function enterFeedback(state: EditorState) {
  if (performance.now() - enterAt < 300) return;
  enterAt = performance.now();
  const before = textBefore(state);
  setTimeout(() => playFeedback(itemsForEnter(before)), 0);
}

// Checks text that arrives without a checked key. Returns false when it must be discarded.
function checkInput(state: EditorState, ev: InputEvent): boolean {
  const t = ev.inputType;
  if (t.startsWith('delete')) {
    if (t === 'deleteByCut' || t === 'deleteByDrag') return !guard.blocked();
    // A held delete key repeats without telling: deleting is accepted at the held pace.
    return guard.heldDelete();
  }
  if (t === 'insertParagraph' || t === 'insertLineBreak') return guard.press('text:Enter');
  let ch = '';
  if (t === 'insertCompositionText') {
    const data = ev.data ?? '';
    if (data.length > composing.length && data.startsWith(composing)) ch = data.slice(composing.length);
    else if (data.length < composing.length && composing.startsWith(data)) { composing = data; return guard.heldDelete(); }
    // A dead key followed by its letter (´ + e = é) replaces the composed text.
    else if ([...data].length === 1) ch = data;
    composing = data;
  } else if (t === 'insertText' || t === 'insertReplacementText') {
    // The end of a composition commits text that was already checked.
    if (composing && ev.data === composing) { composing = ''; return !guard.blocked(); }
    ch = ev.data ?? '';
  } else return !guard.blocked();
  if ([...ch].length !== 1) return !guard.blocked();
  if (!guard.press('text:' + ch.toLowerCase())) return false;
  return guard.content(textBefore(state), ch);
}

// «Escriu sempre amb majúscules»: each letter typed becomes a capital, from the physical keyboard
// or from the on-screen keyboard of the system, whatever Shift or Caps Lock. Pasted text, undo and
// the text already written do not change. Letter by letter, so that no letter changes length
// (ß would become SS).
export const toCapitals = (t: string) => [...t].map(c => { const u = c.toUpperCase(); return u.length === c.length ? u : c; }).join('');
const typed = (tr: Transaction) => {
  const ui = tr.getMeta('uiEvent');
  return tr.docChanged && !tr.getMeta('lecaa-system') && ui !== 'paste' && ui !== 'drop' && !tr.getMeta('paste') && !tr.getMeta('history$');
};

// Turns the letters of the ranges into capitals, keeping their marks (size, font…).
function capitalize(state: EditorState, ranges: [number, number][]): Transaction | null {
  const tr = state.tr;
  for (const [from, to] of ranges) {
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isText) return true;
      const a = Math.max(from, pos), b = Math.min(to, pos + node.nodeSize);
      const t = node.text!.slice(a - pos, b - pos);
      const up = toCapitals(t);
      if (up !== t) tr.replaceWith(a, b, state.schema.text(up, node.marks));
      return false;
    });
  }
  return tr.docChanged ? tr.setMeta('lecaa-system', true) : null;
}

let editorView: EditorView | null = null;
const CapitalsOnly = new Plugin({
  view(v) { editorView = v; return { destroy() { if (editorView === v) editorView = null; } }; },
  appendTransaction(trs, _old, state) {
    // While a word is being composed (Android keyboards) it is left alone: changing it would break
    // the composition. It becomes capitals when the composition ends (see compositionend).
    if (!settings.value.upperCase || editorView?.composing) return null;
    const ranges: [number, number][] = [];
    trs.forEach((tr, i) => {
      if (!typed(tr)) return;
      tr.mapping.maps.forEach((map, j) => map.forEach((_s, _e, from, to) => {
        if (to <= from) return;
        // Where the inserted text ends up in the final document.
        let a = tr.mapping.slice(j + 1).map(from, -1), b = tr.mapping.slice(j + 1).map(to, 1);
        for (const later of trs.slice(i + 1)) { a = later.mapping.map(a, -1); b = later.mapping.map(b, 1); }
        if (b > a) ranges.push([a, b]);
      }));
    });
    return ranges.length ? capitalize(state, ranges) : null;
  },
});

// After a composition: the word before the caret, in capitals.
function capitalizeComposedWord(view: EditorView) {
  if (!settings.value.upperCase || view.composing) return;
  const { $from } = view.state.selection;
  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, ' ');
  const word = before.match(/\S+$/)?.[0] ?? '';
  if (!word) return;
  const tr = capitalize(view.state, [[$from.pos - word.length, $from.pos]]);
  if (tr) view.dispatch(tr);
}

// Connects the editor to the input guard (typing protection, misuse detection) and to the
// audio feedback. Every way of entering text goes through here: physical keyboards (also
// those connected to a tablet) and the on-screen keyboard of each operating system.
const LecaaInput = Extension.create({
  name: 'lecaaInput',
  addProseMirrorPlugins() {
    return [CapitalsOnly, new Plugin({
      // Backstop for input paths that cannot be cancelled (composition, drag & drop).
      filterTransaction(tr) {
        if (!tr.docChanged || tr.getMeta('lecaa-system')) return true;
        return !guard.blocked();
      },
      props: {
        handleKeyDown(view, e) {
          if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) enterFeedback(view.state);
          return false;
        },
        handleDOMEvents: {
          compositionstart() { composing = ''; return false; },
          compositionend(view) { composing = ''; setTimeout(() => capitalizeComposedWord(view), 0); return false; },
          beforeinput(view, e) {
            const ev = e as InputEvent;
            const fromKey = takeCheckedKey();
            if (ev.inputType === 'historyUndo' || ev.inputType === 'historyRedo') return false;
            // A single character after a checked key still needs the content checks.
            let ok = fromKey
              ? !(ev.inputType === 'insertText' && ev.data && [...ev.data].length === 1) || guard.content(textBefore(view.state), ev.data)
              : checkInput(view.state, ev);
            if (ok && guard.blocked()) ok = false;
            if (!ok) { if (ev.cancelable) ev.preventDefault(); return ev.cancelable; }
            if (!fromKey && (ev.inputType === 'insertParagraph' || ev.inputType === 'insertLineBreak')) enterFeedback(view.state);
            return false;
          },
        },
      },
    })];
  },
  onTransaction({ transaction: tr }) {
    if (!tr.docChanged || tr.getMeta('lecaa-system')) return;
    const ui = tr.getMeta('uiEvent');
    if (ui === 'paste' || ui === 'drop' || tr.getMeta('paste') || tr.getMeta('history$')) return;
    reader.stop();
    const text = insertedText(tr);
    if (!text) return;
    const before = textBefore(this.editor.state);
    const ch = settings.value.upperCase ? toCapitals(text.slice(-1)) : text.slice(-1);
    // `before` already contains the new character.
    playFeedback(itemsForChar(ch, before.slice(0, -1)));
  },
});

export function createEditor(el: HTMLElement, content: object | string | null) {
  const editor = new Editor({
    element: el,
    enableInputRules: false,
    enablePasteRules: false,
    extensions: [
      StarterKit.configure({ code: false, codeBlock: false, blockquote: false, horizontalRule: false, strike: false, link: false, heading: { levels: [1, 2] } }),
      TextStyle,
      FontSize,
      FontFamily,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TableKit.configure({ table: { resizable: true } }),
      Image.configure({ allowBase64: true, resize: { enabled: true, alwaysPreserveAspectRatio: true, minWidth: 40, minHeight: 40 } }),
      ReaderHighlight,
      PictoLayer,
      LecaaInput,
    ],
    content: content ?? '',
    editorProps: {
      attributes: { spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off', 'aria-label': T('Document', 'Documento'), lang: LANG },
    },
  });
  reader.attach(editor);
  return editor;
}

// Window-level capture so blocked keystrokes never reach the editor or its keymaps.
export function installKeyboardGuard(editor: Editor) {
  window.addEventListener('keydown', e => {
    if (guard.calming()) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (!editor.view.dom.contains(e.target as Node)) return;
    // Left to beforeinput: the key is not known yet.
    if (unidentified(e)) return;
    if (!guard.keydown(e)) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if ((e.key.length === 1 && !e.ctrlKey && !e.metaKey) || e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Enter') checkedKeyAt = performance.now();
  }, true);
  // Keys handled without inserting anything (Enter in the editor's keymap) leave no mark behind.
  window.addEventListener('keyup', e => { checkedKeyAt = 0; guard.keyup(e); }, true);
}
