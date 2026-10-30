// On-demand reading: whole document, selection, or from the caret. Text is read sentence by
// sentence (short utterances are more reliable across engines and give a natural highlight);
// the spoken word is highlighted when the engine reports word boundaries.

import { Extension, type Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { HAS_LETTER_SOUNDS, isLetter, phonemeFile, spokenName } from './letters';
import { settings } from './settings';
import { recordedVoices, speech, type SoundItem } from './speech';

// pos[i] = document position of text[i]. When spelling by sounds, clip is the recorded sound of the
// letter (null for a silent letter, such as h).
interface Sentence { text: string; pos: number[]; clip?: string | null }

const key = new PluginKey<DecorationSet>('lecaa-reader');
type Mark = { sentence?: [number, number] | null; word?: [number, number] | null };

export const ReaderHighlight = Extension.create({
  name: 'readerHighlight',
  addProseMirrorPlugins() {
    let marks: Mark = {};
    return [new Plugin<DecorationSet>({
      key,
      state: {
        init: () => DecorationSet.empty,
        apply(tr, set) {
          const m = tr.getMeta(key) as Mark | undefined;
          if (m) {
            marks = { ...marks, ...m };
            const decos: Decoration[] = [];
            const size = tr.doc.content.size;
            const ok = (r?: [number, number] | null) => r && r[0] < r[1] && r[1] <= size;
            if (ok(marks.sentence)) decos.push(Decoration.inline(marks.sentence![0], marks.sentence![1], { class: 'read-sentence' }));
            if (ok(marks.word)) decos.push(Decoration.inline(marks.word![0], marks.word![1], { class: 'read-word' }));
            return DecorationSet.create(tr.doc, decos);
          }
          return set.map(tr.mapping, tr.doc);
        },
      },
      props: { decorations: state => key.getState(state) },
    })];
  },
});

function collect(doc: PMNode, from: number, to: number): Sentence[] {
  const out: Sentence[] = [];
  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return true;
    let text = '';
    const map: number[] = [];
    node.forEach((child, offset) => {
      const start = pos + 1 + offset;
      if (child.isText) {
        const t = child.text ?? '';
        for (let i = 0; i < t.length; i++) {
          const p = start + i;
          if (p >= from && p < to) { text += t[i]; map.push(p); }
        }
      } else if (start >= from && start < to) { text += ' '; map.push(start); }
    });
    const re = /[^.!?…]+[.!?…]*["»)]*\s*|[.!?…]+\s*/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const raw = m[0];
      const lead = raw.length - raw.trimStart().length;
      const s = raw.trim();
      if (/[\p{L}\p{N}]/u.test(s)) out.push({ text: s, pos: map.slice(m.index + lead, m.index + lead + s.length) });
    }
    return false;
  });
  return out;
}

// «Lletreja» says the sound of each letter only where there are recorded letter sounds.
export const spellsSounds = () => settings.value.spelling === 'sound' && HAS_LETTER_SOUNDS && recordedVoices.length > 0;

class Reader {
  private editor: Editor | null = null;
  private queue: Sentence[] = [];
  private index = 0;
  private run = 0;
  reading = false;
  paused = false;
  onState: (() => void) | null = null;

  attach(editor: Editor) { this.editor = editor; }

  private mark(m: Mark) {
    const ed = this.editor;
    if (!ed || ed.isDestroyed) return;
    if (!settings.value.highlight && (m.sentence || m.word)) return;
    ed.view.dispatch(ed.state.tr.setMeta(key, m).setMeta('lecaa-system', true).setMeta('addToHistory', false));
  }

  start(mode: 'all' | 'selection' | 'cursor'): boolean {
    const ed = this.editor;
    if (!ed) return false;
    const { from, to, empty } = ed.state.selection;
    const size = ed.state.doc.content.size;
    const range = mode === 'all' ? [0, size] : mode === 'cursor' ? [from, size] : [from, to];
    if (mode === 'selection' && empty) return false;
    this.queue = collect(ed.state.doc, range[0], range[1]);
    this.index = 0;
    if (!this.queue.length) return false;
    void this.loop();
    return true;
  }

  // Spells the text between from and to, one letter after another, with the letter highlighted: the
  // name of each letter (capital letters say so) or, where there are recorded letter sounds (Catalan
  // and Spanish) and the settings ask for it, the sound of each letter. Signs always say their name.
  spell(from: number, to: number): boolean {
    const ed = this.editor;
    if (!ed || from >= to) return false;
    const sounds = spellsSounds();
    const queue: Sentence[] = [];
    ed.state.doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isText) return true;
      const t = node.text ?? '';
      for (let i = 0; i < t.length; i++) {
        const p = pos + i;
        if (p < from || p >= to || /\s/.test(t[i])) continue;
        if (sounds && isLetter(t[i])) { queue.push({ text: t[i], pos: [p], clip: phonemeFile(t[i]) }); continue; }
        const name = spokenName(t[i], true);
        if (name) queue.push({ text: name, pos: [p] });
      }
      return false;
    });
    if (!queue.length) return false;
    this.run++;
    speech.stop();
    this.queue = queue;
    this.index = 0;
    void this.loop();
    return true;
  }

  private async loop() {
    const my = ++this.run;
    this.reading = true;
    this.paused = false;
    this.onState?.();
    while (this.index < this.queue.length && my === this.run) {
      const s = this.queue[this.index];
      this.mark({ sentence: [s.pos[0], s.pos[s.pos.length - 1] + 1], word: null });
      const items: SoundItem[] = s.clip === undefined ? [{
        kind: 'tts', text: s.text,
        onWord: (i, len) => {
          if (my !== this.run) return;
          const l = len || (s.text.slice(i).match(/^[\p{L}\p{N}·'’-]+/u)?.[0].length ?? 1);
          const a = s.pos[i], b = s.pos[Math.min(i + l, s.pos.length) - 1];
          if (a !== undefined && b !== undefined) this.mark({ word: [a, b + 1] });
        },
      }] : s.clip ? [{ kind: 'clip', file: s.clip }] : [];
      const finished = await speech.play(items, { lock: false });
      if (!finished || my !== this.run) return;
      // Letter sounds are short: a pause keeps each one apart, and a silent letter is still shown.
      if (s.clip !== undefined) await new Promise(res => setTimeout(res, s.clip ? 250 : 500));
      if (my !== this.run) return;
      this.index++;
    }
    if (my === this.run) this.finish();
  }

  pause() {
    if (!this.reading) return;
    this.run++;
    speech.stop();
    this.reading = false;
    this.paused = true;
    this.mark({ word: null });
    this.onState?.();
  }

  resume() { if (this.paused && this.index < this.queue.length) void this.loop(); }

  stop() {
    if (!this.reading && !this.paused) return;
    this.run++;
    speech.stop();
    this.finish();
  }

  private finish() {
    this.reading = false;
    this.paused = false;
    this.queue = [];
    this.mark({ sentence: null, word: null });
    this.onState?.();
  }
}

export const reader = new Reader();
