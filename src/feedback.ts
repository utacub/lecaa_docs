// Audio feedback while typing: sentence (. ? ! and Enter), word (space), and letter
// (name via synthetic voice, or sound via recorded clip). Each option is independent;
// letter name and letter sound are mutually exclusive by construction (one setting).

import { isLetter, lastSentence, lastWord, phonemeFile, SENTENCE_END, spokenName, WORD_PUNCT } from './letters';
import { settings } from './settings';
import { speech, type SoundItem } from './speech';

export function itemsForChar(ch: string, before: string): SoundItem[] {
  const f = settings.value.feedback;
  const items: SoundItem[] = [];

  if (ch === ' ' || ch === ' ') {
    if (f.word) {
      const w = lastWord(before);
      if (w) items.push({ kind: 'tts', text: w });
    }
    return items;
  }

  const ends = SENTENCE_END.test(ch);
  const prevIsEnd = SENTENCE_END.test(before.slice(-1));
  let spokeUnit = false;

  if (ends || WORD_PUNCT.test(ch)) {
    const w = f.word && f.wordOnPunct && !prevIsEnd ? lastWord(before) : '';
    const s = f.sentence && ends && !prevIsEnd ? lastSentence(before + ch) : '';
    if (w && w !== s.replace(/[.!?…]+$/, '').trim()) items.push({ kind: 'tts', text: w });
    if (s) items.push({ kind: 'tts', text: s });
    spokeUnit = items.length > 0;
  }

  if (!spokeUnit && f.letter !== 'off') {
    if (f.letter === 'sound' && isLetter(ch)) {
      const file = phonemeFile(ch);
      if (file) items.push({ kind: 'clip', file });
    } else if (f.letter === 'name' || !isLetter(ch)) {
      const name = f.letter === 'name' ? spokenName(ch, f.upperCaseWord) : null;
      if (name) items.push({ kind: 'tts', text: name });
    }
  }
  return items;
}

export function itemsForEnter(blockBefore: string): SoundItem[] {
  const f = settings.value.feedback;
  const text = blockBefore.replace(/\s+$/, '');
  if (!text) return [];
  const items: SoundItem[] = [];
  const endsSentence = SENTENCE_END.test(text.slice(-1));
  const endsWord = !/[\s,.;:!?…)»"]$/.test(blockBefore);
  const s = f.sentence && !endsSentence ? lastSentence(text) : '';
  const w = f.word && endsWord ? lastWord(text) : '';
  if (w && w !== s) items.push({ kind: 'tts', text: w });
  if (s) items.push({ kind: 'tts', text: s });
  return items;
}

export function playFeedback(items: SoundItem[]) {
  if (items.length) void speech.play(items, { lock: true });
}
