// On-screen keyboard: the Spanish/Catalan QWERTY used in Spain, with Shift, numbers and dead
// accent keys.

import type { Editor } from '@tiptap/core';
import { BACKSPACE_PER_SECOND, guard } from './guard';
import { T } from './i18n';
import { settings } from './settings';
import { textBefore } from './editor';
import { h } from './ui';

type Key = string | { label: string; action: 'space' | 'back' | 'enter' | 'shift' | 'dead'; value?: string; wide?: boolean };

// `value` of the action keys is the same in every language (the guard and tests rely on it).
const SPACE: Key = { label: T('espai', 'espacio'), action: 'space', value: 'espai' };
const BACK: Key = { label: T('esborra', 'borrar'), action: 'back', value: 'esborra', wide: true };
const ENTER: Key = { label: 'intro', action: 'enter', value: 'intro', wide: true };

const FULL_LOWER: Key[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', "'", '¡', BACK],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', { label: '`', action: 'dead', value: 'grave' }, '+'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ', { label: '´', action: 'dead', value: 'acute' }, 'ç'],
  [{ label: T('⇧ Maj', '⇧ Mayús'), action: 'shift', value: 'shift', wide: true }, 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '-', { label: '¨', action: 'dead', value: 'diaeresis' }],
  [SPACE, ENTER],
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
  readonly el = h('div', { class: 'osk', role: 'group', 'aria-label': T('Teclat en pantalla', 'Teclado en pantalla'), hidden: true });
  private shift = false;
  private dead: string | null = null;
  private pointers = new Set<number>();
  private holdTimer = 0;

  constructor(private editor: Editor) {
    this.el.addEventListener('pointerdown', e => {
      this.pointers.add(e.pointerId);
      const k = (e.target as HTMLElement).closest<HTMLButtonElement>('.key');
      e.preventDefault(); // keep the caret in the document and the system keyboard closed
      if (k) this.press(k.dataset.k!, k.dataset.a);
      // Holding "esborra" keeps deleting, like a physical Backspace, at the guard's pace.
      if (k?.dataset.a === 'back') {
        clearTimeout(this.holdTimer);
        const again = () => {
          if (guard.heldDelete()) this.deleteBack();
          this.holdTimer = window.setTimeout(again, 1000 / BACKSPACE_PER_SECOND);
        };
        this.holdTimer = window.setTimeout(again, 500);
      }
    });
    const up = (e: PointerEvent) => { this.pointers.delete(e.pointerId); clearTimeout(this.holdTimer); };
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
    this.el.replaceChildren(...FULL_LOWER.map(r => h('div', { class: 'osk-row' }, ...r.map(k => this.keyEl(k)))));
  }

  private keyEl(k: Key) {
    if (typeof k === 'string') {
      const label = this.shift ? (SHIFTED[k] ?? k.toUpperCase()) : k;
      return h('button', { class: 'key', type: 'button', 'data-k': label, tabindex: 0 }, label);
    }
    const on = (k.action === 'shift' && this.shift) || (k.action === 'dead' && this.dead === k.value);
    const cls = ['key', k.wide && 'wide', k.action === 'space' && 'space wide', k.action === 'dead' && 'dead', on && 'on'].filter(Boolean).join(' ');
    return h('button', { class: cls, type: 'button', 'data-k': k.value ?? k.label, 'data-a': k.action, 'aria-pressed': k.action === 'shift' || k.action === 'dead' ? String(on) : null }, k.label);
  }

  private deleteBack() {
    // Browsers delete characters natively, so the editor keymap alone cannot do it.
    const ed = this.editor;
    const { empty, $from, from } = ed.state.selection;
    if (!empty) ed.commands.deleteSelection();
    else if ($from.parentOffset > 0) {
      const prev = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');
      const len = [...prev].pop()?.length ?? 1;
      ed.view.dispatch(ed.state.tr.delete(from - len, from).scrollIntoView());
    } else ed.commands.keyboardShortcut('Backspace');
  }

  private press(value: string, action?: string) {
    if (!guard.press('osk:' + value, { simultaneous: this.pointers.size })) return;
    const ed = this.editor;
    if (action === 'shift') { this.shift = !this.shift; this.render(); return; }
    if (action === 'dead') { this.dead = this.dead === value ? null : value; this.render(); return; }
    if (action === 'back') { this.deleteBack(); return; }
    if (action === 'enter') { ed.commands.keyboardShortcut('Enter'); return; }
    let ch = action === 'space' ? ' ' : value;
    if (this.dead) {
      ch = DEAD[this.dead][ch.toLowerCase()] ? (ch === ch.toUpperCase() ? DEAD[this.dead][ch.toLowerCase()].toUpperCase() : DEAD[this.dead][ch.toLowerCase()]) : ch;
      this.dead = null;
      this.render();
    }
    const before = textBefore(ed.state);
    if (!guard.content(before, ch)) return;
    ed.view.dispatch(ed.state.tr.insertText(ch).scrollIntoView());
    if (this.shift && ch !== ' ') { this.shift = false; this.render(); }
  }
}
