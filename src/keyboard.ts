// On-screen keyboards. "simple": QWERTY where every key does exactly one thing
// (no modifiers, no dead keys, only characters needed to write Catalan).
// "full": a Catalan/Spanish QWERTY with Shift, numbers and dead accent keys.

import type { Editor } from '@tiptap/core';
import { guard } from './guard';
import { wantsCapital } from './letters';
import { settings } from './settings';
import { textBefore } from './editor';
import { h } from './ui';

type Key = string | { label: string; action: 'space' | 'back' | 'enter' | 'shift' | 'dead'; value?: string; wide?: boolean };

const SIMPLE: Key[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ç'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', '·'],
  ['à', 'è', 'é', 'í', 'ï', 'ò', 'ó', 'ú', 'ü'],
  ['.', ',', '?', '!', { label: 'espai', action: 'space' }, { label: 'esborra', action: 'back', wide: true }, { label: 'intro', action: 'enter', wide: true }],
];

const FULL_LOWER: Key[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', "'", '¡', { label: 'esborra', action: 'back', wide: true }],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', { label: '`', action: 'dead', value: 'grave' }, '+'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ', { label: '´', action: 'dead', value: 'acute' }, 'ç'],
  [{ label: '⇧ Maj', action: 'shift', wide: true }, 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '-', { label: '¨', action: 'dead', value: 'diaeresis' }],
  [{ label: 'espai', action: 'space' }, { label: 'intro', action: 'enter', wide: true }],
];
const SHIFTED: Record<string, string> = {
  '1': '!', '2': '"', '3': '·', '4': '$', '5': '%', '6': '&', '7': '/', '8': '(', '9': ')', '0': '=', "'": '?', '¡': '¿',
  '+': '*', ',': ';', '.': ':', '-': '_',
};
const DEAD: Record<string, Record<string, string>> = {
  grave: { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù' },
  acute: { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' },
  diaeresis: { i: 'ï', u: 'ü', e: 'ë', a: 'ä', o: 'ö' },
};

export class OnScreenKeyboard {
  readonly el = h('div', { class: 'osk', role: 'group', 'aria-label': 'Teclat en pantalla', hidden: true });
  private shift = false;
  private dead: string | null = null;
  private pointers = new Set<number>();

  constructor(private editor: Editor) {
    this.el.addEventListener('pointerdown', e => {
      this.pointers.add(e.pointerId);
      const k = (e.target as HTMLElement).closest<HTMLButtonElement>('.key');
      e.preventDefault(); // keep the caret in the document and the system keyboard closed
      if (k) this.press(k.dataset.k!, k.dataset.a);
    });
    const up = (e: PointerEvent) => this.pointers.delete(e.pointerId);
    this.el.addEventListener('pointerup', up);
    this.el.addEventListener('pointercancel', up);
    this.el.addEventListener('pointerleave', up);
    // Keyboard access to the on-screen keys (switch/scanning users): Enter or Space on a focused key.
    this.el.addEventListener('keydown', e => {
      const k = (e.target as HTMLElement).closest<HTMLButtonElement>('.key');
      if (k && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.press(k.dataset.k!, k.dataset.a); }
    });
    settings.subscribe(() => this.render());
    this.render();
  }

  render() {
    const s = settings.value.keyboard;
    this.el.hidden = !s.visible;
    document.documentElement.style.setProperty('--key', `${s.keySize}rem`);
    // Keep the operating system's keyboard closed while ours is shown.
    this.editor.view.dom.setAttribute('inputmode', s.visible ? 'none' : 'text');
    const rows = s.layout === 'simple' ? SIMPLE : FULL_LOWER;
    this.el.replaceChildren(...rows.map(r => h('div', { class: 'osk-row' }, ...r.map(k => this.keyEl(k, s.layout)))));
  }

  private keyEl(k: Key, layout: string) {
    if (typeof k === 'string') {
      const label = layout === 'full' && this.shift ? (SHIFTED[k] ?? k.toUpperCase()) : k;
      return h('button', { class: 'key', type: 'button', 'data-k': label, tabindex: 0 }, label);
    }
    const on = (k.action === 'shift' && this.shift) || (k.action === 'dead' && this.dead === k.value);
    const cls = ['key', k.wide && 'wide', k.action === 'space' && 'space wide', k.action === 'dead' && 'dead', on && 'on'].filter(Boolean).join(' ');
    return h('button', { class: cls, type: 'button', 'data-k': k.value ?? k.label, 'data-a': k.action, 'aria-pressed': k.action === 'shift' || k.action === 'dead' ? String(on) : null }, k.label);
  }

  private press(value: string, action?: string) {
    if (!guard.press('osk:' + value, { simultaneous: this.pointers.size })) return;
    const ed = this.editor;
    if (action === 'shift') { this.shift = !this.shift; this.render(); return; }
    if (action === 'dead') { this.dead = this.dead === value ? null : value; this.render(); return; }
    if (action === 'back') {
      // Browsers delete characters natively, so the editor keymap alone cannot do it.
      const { empty, $from, from } = ed.state.selection;
      if (!empty) ed.commands.deleteSelection();
      else if ($from.parentOffset > 0) {
        const prev = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');
        const len = [...prev].pop()?.length ?? 1;
        ed.view.dispatch(ed.state.tr.delete(from - len, from).scrollIntoView());
      } else ed.commands.keyboardShortcut('Backspace');
      return;
    }
    if (action === 'enter') { ed.commands.keyboardShortcut('Enter'); return; }
    let ch = action === 'space' ? ' ' : value;
    if (this.dead) {
      ch = DEAD[this.dead][ch.toLowerCase()] ? (ch === ch.toUpperCase() ? DEAD[this.dead][ch.toLowerCase()].toUpperCase() : DEAD[this.dead][ch.toLowerCase()]) : ch;
      this.dead = null;
      this.render();
    }
    const before = textBefore(ed.state);
    if (settings.value.keyboard.layout === 'simple' && settings.value.keyboard.autoCapital && /\p{L}/u.test(ch) && wantsCapital(before)) ch = ch.toUpperCase();
    if (!guard.content(before, ch)) return;
    ed.view.dispatch(ed.state.tr.insertText(ch).scrollIntoView());
    if (this.shift && ch !== ' ') { this.shift = false; this.render(); }
  }
}
