import { Editor, Extension } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import { Plugin } from '@tiptap/pm/state';
import { ReplaceStep } from '@tiptap/pm/transform';
import StarterKit from '@tiptap/starter-kit';
import { itemsForChar, itemsForEnter, playFeedback } from './feedback';
import { guard } from './guard';
import { LANG, T } from './i18n';
import { reader, ReaderHighlight } from './reader';

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

// Connects the editor to the input guard (typing protection, misuse detection) and to the
// audio feedback. Every way of entering text goes through here: physical keys, the
// on-screen keyboard (which dispatches transactions), and IME/beforeinput on touch devices.
const LecaaInput = Extension.create({
  name: 'lecaaInput',
  addProseMirrorPlugins() {
    return [new Plugin({
      // Backstop for input paths that bypass keydown (IME, autocorrect, drag & drop).
      filterTransaction(tr) {
        if (!tr.docChanged || tr.getMeta('lecaa-system')) return true;
        return !guard.blocked();
      },
      props: {
        handleKeyDown(view, e) {
          if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
            const before = textBefore(view.state);
            setTimeout(() => playFeedback(itemsForEnter(before)), 0);
          }
          return false;
        },
        handleDOMEvents: {
          beforeinput(view, e) {
            const ev = e as InputEvent;
            if (ev.inputType === 'insertText' && ev.data && ev.data.length === 1) {
              if (!guard.content(textBefore(view.state), ev.data)) { ev.preventDefault(); return true; }
            }
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
    const ch = text.slice(-1);
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
    if (!guard.keydown(e)) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (!guard.content(textBefore(editor.state), e.key)) { e.preventDefault(); e.stopImmediatePropagation(); }
    }
  }, true);
  window.addEventListener('keyup', e => guard.keyup(e), true);
}
