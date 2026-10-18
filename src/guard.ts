// Input guard: decides whether a keystroke (physical or on-screen) is accepted.
// - Typing protection: while enabled audio feedback is playing, new keystrokes are discarded.
// - Misuse detection: signs of playing with the keyboard instead of writing trigger a
//   calm, friendly 3-second pause that blocks all activity.
// - Motor filter: the same key again within `debounceMs` is ignored (key bounce, tremor).

import { contentMisuse } from './letters';
import { settings } from './settings';
import { speech } from './speech';
import { h } from './ui';

const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'CapsLock', 'Fn', 'OS', 'Dead']);

// Holding Backspace keeps deleting (not a misuse), at most this many characters per second.
export const BACKSPACE_PER_SECOND = 4;

export type Misuse = 'simultaneous' | 'burst' | 'repeat' | 'consonants' | 'autorepeat';

class InputGuard {
  private calmUntil = 0;
  private calmEl: HTMLElement | null = null;
  private down = new Set<string>();
  private recent: { t: number; key: string }[] = [];
  private repeats = 0;
  private lastKey = { key: '', t: 0 };
  private lastHeldDelete = 0;
  onMisuse: ((m: Misuse) => void) | null = null;

  constructor() {
    window.addEventListener('blur', () => this.down.clear());
    speech.onBusy(() => this.refreshLock());
    settings.subscribe(() => this.refreshLock());
  }

  calming() { return performance.now() < this.calmUntil; }
  locked() { return settings.value.lockWhileSpeaking && speech.busy; }
  blocked() { return this.calming() || this.locked(); }

  private refreshLock() { document.body.classList.toggle('is-locked', this.locked()); }

  // A held Backspace (physical auto-repeat or held on-screen key): accepted at a limited pace.
  heldDelete(): boolean {
    if (this.blocked()) return false;
    const now = performance.now();
    if (now - this.lastHeldDelete < 1000 / BACKSPACE_PER_SECOND) return false;
    this.lastHeldDelete = now;
    return true;
  }

  // Timing checks shared by both keyboards. Returns false when the press must be discarded.
  press(key: string, opts: { repeat?: boolean; simultaneous?: number } = {}): boolean {
    if (this.blocked()) return false;
    const g = settings.value.guard;
    const now = performance.now();

    if (opts.repeat) {
      // Held-down key: never accepted; a long hold counts as misuse.
      if (g.enabled && g.autoRepeat && ++this.repeats >= 8) return this.misuse('autorepeat');
      return false;
    }
    this.repeats = 0;
    if (key.endsWith('Backspace') || key === 'osk:esborra') this.lastHeldDelete = now;

    const deb = settings.value.motor.debounceMs;
    if (deb > 0 && key === this.lastKey.key && now - this.lastKey.t < deb) return false;
    this.lastKey = { key, t: now };

    if (g.enabled) {
      if (g.simultaneous && (opts.simultaneous ?? 0) >= 3) return this.misuse('simultaneous');
      this.recent.push({ t: now, key });
      this.recent = this.recent.filter(r => now - r.t <= g.burstMs * 2).slice(-3);
      if (g.burst && this.recent.length === 3 && now - this.recent[0].t <= g.burstMs
        && new Set(this.recent.map(r => r.key)).size === 3) return this.misuse('burst');
    }
    return true;
  }

  // Content checks on the character about to be inserted.
  content(before: string, ch: string): boolean {
    if (this.blocked()) return false;
    const g = settings.value.guard;
    if (!g.enabled) return true;
    const m = contentMisuse(before, ch, g);
    return m ? this.misuse(m) : true;
  }

  // Physical keyboard: called from a window-level capture listener.
  keydown(e: KeyboardEvent): boolean {
    if (MODIFIERS.has(e.key)) return !this.calming();
    if (e.key === 'Backspace' && e.repeat) return this.heldDelete();
    if (!e.repeat) this.down.add(e.code || e.key);
    const counted = [...this.down].length;
    return this.press(e.code || e.key, { repeat: e.repeat, simultaneous: counted });
  }

  keyup(e: KeyboardEvent) { this.down.delete(e.code || e.key); }

  misuse(kind: Misuse): false {
    this.recent = [];
    this.repeats = 0;
    this.onMisuse?.(kind);
    this.calm();
    return false;
  }

  calm() {
    const ms = settings.value.guard.calmMs;
    speech.stop();
    this.calmUntil = performance.now() + ms;
    if (!this.calmEl) {
      this.calmEl = h('div', { class: 'calm', role: 'alertdialog', 'aria-live': 'assertive', 'aria-label': 'Calma' },
        h('div', { class: 'calm-card' },
          h('div', { class: 'calm-dot' }),
          h('p', { class: 'calm-text' }, settings.value.guard.message)));
      // Swallow every pointer interaction while calm.
      for (const ev of ['pointerdown', 'mousedown', 'click', 'touchstart']) this.calmEl.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); });
      document.body.append(this.calmEl);
      document.body.classList.add('is-calm');
    }
    window.setTimeout(() => {
      if (this.calming() || !this.calmEl) return;
      this.calmEl.remove();
      this.calmEl = null;
      this.down.clear();
      document.body.classList.remove('is-calm');
    }, ms + 20);
  }
}

export const guard = new InputGuard();
