// When the selection is one word or less (no space inside it; at most one at each end), a small
// menu appears under it with "Spell": the voice says the name of each letter, one by one, and each
// letter is highlighted as it is said (reader.spell). In Catalan and Spanish the settings can make it
// say the recorded sound of each letter instead. Spelling a word back helps to check what has been
// written (see "Marc teòric").

import type { Editor } from '@tiptap/core';
import type { EditorState } from '@tiptap/pm/state';
import { T } from './i18n';
import { reader, spellsSounds } from './reader';
import { speech } from './speech';
import { h, toast } from './ui';

// The selected text, when it can be spelt: something to say, and no space except one at each end.
export function spellable(state: EditorState): string | null {
  const { from, to, empty } = state.selection;
  if (empty) return null;
  const text = state.doc.textBetween(from, to, '\n', '\n');
  return /^[^\S\n]?[^\s]+[^\S\n]?$/u.test(text) && /[\p{L}\p{N}]/u.test(text) ? text.trim() : null;
}

// Spells-a-word icon: "a b c" over a speaker line, in Lucide's style.
const ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 15l3-9 3 9"/><path d="M4 12h4"/><path d="M12 6v9h3a2.5 2.5 0 0 0 0-5h-3"/><path d="M21 7.5a3 3 0 0 0-3-1.5 3 3 0 0 0 0 9 3 3 0 0 0 3-1.5"/><path d="M3 20h18"/></svg>';

export function installSpellMenu(editor: Editor, scroller: HTMLElement) {
  const label = T('Lletreja', 'Deletrear');
  const btn = h('button', { class: 'spell-btn', type: 'button', title: T('Lletreja la selecció', 'Deletrear la selección') });
  btn.innerHTML = ICON;
  btn.append(label);
  const menu = h('div', { class: 'spell-menu', role: 'toolbar', 'aria-label': T('Selecció', 'Selección'), hidden: true }, btn);
  document.body.append(menu);

  // The button must not take the selection away from the editor.
  btn.addEventListener('mousedown', e => e.preventDefault());
  btn.addEventListener('click', () => {
    const { from, to } = editor.state.selection;
    if (!spellsSounds() && !speech.currentVoice()) { toast(T('No hi ha cap veu catalana disponible. Obre la configuració.', 'No hay ninguna voz en castellano disponible. Abre la configuración.')); return; }
    reader.spell(from, to);
  });

  const place = () => {
    if (menu.hidden) return;
    const { from, to } = editor.state.selection;
    const a = editor.view.coordsAtPos(from), b = editor.view.coordsAtPos(to, -1);
    const bottom = Math.max(a.bottom, b.bottom);
    const x = a.top === b.top ? (a.left + b.right) / 2 : b.left;
    const w = menu.offsetWidth, hgt = menu.offsetHeight;
    const left = Math.max(8, Math.min(x - w / 2, window.innerWidth - w - 8));
    // Under the selection (the system's own copy menu usually goes above it); above when there is no room.
    const top = bottom + 10 + hgt < (window.visualViewport?.height ?? window.innerHeight) ? bottom + 10 : Math.max(8, Math.min(a.top, b.top) - hgt - 10);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  };

  // Shown once the selection has settled (not while it is being dragged), hidden as soon as it changes.
  let timer = 0;
  const check = () => {
    clearTimeout(timer);
    const ok = editor.isFocused && !!spellable(editor.state);
    if (!ok) { menu.hidden = true; return; }
    timer = window.setTimeout(() => {
      if (!editor.isFocused || !spellable(editor.state) || document.body.classList.contains('is-calm')) return;
      menu.hidden = false;
      place();
    }, 350);
  };
  editor.on('selectionUpdate', check);
  editor.on('focus', check);
  editor.on('blur', () => { clearTimeout(timer); menu.hidden = true; });
  editor.on('update', () => { clearTimeout(timer); menu.hidden = true; });
  scroller.addEventListener('scroll', place, { passive: true });
  window.addEventListener('resize', place);
  window.visualViewport?.addEventListener('resize', place);
}
