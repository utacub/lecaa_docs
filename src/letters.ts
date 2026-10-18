// Catalan letter names, grapheme → recorded sound, and the text rules used by the
// typing feedback and the misuse detector.
//
// Letter names follow the IEC's Ortografia catalana (2017) in their most common form.
// The grapheme → sound table starts from LECAA's ISOLATED_SOUND_BLOCKS (edició 45);
// both still need didactic validation (see planificacio.md §2.2 and §5.2).

import phonemeFiles from './phonemes.json';

export const LETTER_NAMES: Record<string, string> = {
  a: 'a', b: 'be', c: 'ce', 'ç': 'ce trencada', d: 'de', e: 'e', f: 'efa', g: 'ge', h: 'hac',
  i: 'i', j: 'jota', k: 'ca', l: 'ela', m: 'ema', n: 'ena', 'ñ': 'enye', o: 'o', p: 'pe', q: 'cu',
  r: 'erra', s: 'essa', t: 'te', u: 'u', v: 've baixa', w: 've doble', x: 'ics', y: 'i grega', z: 'zeta',
  'à': 'a amb accent obert', 'è': 'e amb accent obert', 'é': 'e amb accent tancat',
  'í': 'i amb accent', 'ò': 'o amb accent obert', 'ó': 'o amb accent tancat', 'ú': 'u amb accent',
  'ï': 'i amb dièresi', 'ü': 'u amb dièresi', '·': 'punt volat',
};

export const SYMBOL_NAMES: Record<string, string> = {
  '.': 'punt', ',': 'coma', '?': 'interrogant', '¿': 'interrogant obert', '!': 'exclamació', '¡': 'exclamació oberta',
  ':': 'dos punts', ';': 'punt i coma', "'": 'apòstrof', '’': 'apòstrof', '-': 'guionet', '(': 'parèntesi', ')': 'tanca parèntesi',
  '"': 'cometes', '«': 'cometes', '»': 'tanca cometes', '/': 'barra', '+': 'més', '=': 'igual', '%': 'per cent', '@': 'arrova',
  '0': 'zero', '1': 'u', '2': 'dos', '3': 'tres', '4': 'quatre', '5': 'cinc', '6': 'sis', '7': 'set', '8': 'vuit', '9': 'nou',
};

// Grapheme typed on one key → IPA phoneme of the recorded clip. h and · have no sound.
export const GRAPHEME_PHONEME: Record<string, string | null> = {
  a: 'a', 'à': 'a', e: 'e', 'é': 'e', 'è': 'ɛ', i: 'i', 'í': 'i', 'ï': 'i', o: 'o', 'ó': 'o', 'ò': 'ɔ',
  u: 'u', 'ú': 'u', 'ü': 'u', b: 'b', v: 'b', c: 'k', k: 'k', q: 'k', 'ç': 's', d: 'd', f: 'f', g: 'ɡ',
  j: 'ʒ', l: 'l', m: 'm', n: 'n', 'ñ': 'ɲ', p: 'p', r: 'r', s: 's', t: 't', x: 'ʃ', z: 'z', w: 'w', y: 'j',
  h: null, '·': null,
};

const FILES = phonemeFiles as Record<string, string>;

export function phonemeFile(grapheme: string): string | null {
  const p = GRAPHEME_PHONEME[grapheme.toLowerCase()];
  return p ? FILES[p] ?? null : null;
}

export function spokenName(ch: string, sayCapital: boolean): string | null {
  const lower = ch.toLowerCase();
  const name = LETTER_NAMES[lower] ?? SYMBOL_NAMES[ch] ?? null;
  if (!name) return null;
  return sayCapital && ch !== lower ? `${name} majúscula` : name;
}

export const isLetter = (ch: string) => /^\p{L}$/u.test(ch);
export const SENTENCE_END = /[.!?…]/;
export const WORD_PUNCT = /[,.;:!?…)»"]/;

const VOWELS = /[aeiouàèéíïòóúüy]/i;

// Last word before the caret, e.g. "l'escola", "dóna-m'ho", "col·legi".
export function lastWord(text: string): string {
  const m = text.match(/[\p{L}\p{N}·]+(?:['’-][\p{L}\p{N}·]+)*$/u);
  return m ? m[0] : '';
}

// Last sentence in a block of text that ends at the caret (terminator included).
export function lastSentence(text: string): string {
  const t = text.replace(/\s+$/, '');
  const body = t.replace(/[.!?…]+$/, '');
  const idx = Math.max(body.lastIndexOf('.'), body.lastIndexOf('!'), body.lastIndexOf('?'), body.lastIndexOf('…'));
  return t.slice(idx + 1).trim();
}

export type ContentMisuse = 'repeat' | 'consonants' | null;

// Checks the character about to be inserted against the text that precedes it.
// Catalan has no word with three identical letters in a row (ll, rr, ss, nn, mm, cc are fine),
// and no word with six consonant letters in a row.
export function contentMisuse(before: string, ch: string, opts: { repeatLetters: boolean; consonants: boolean }): ContentMisuse {
  if (!isLetter(ch)) return null;
  const lower = (before.slice(-2) + ch).toLowerCase();
  if (opts.repeatLetters && lower.length === 3 && lower[0] === lower[1] && lower[1] === lower[2]) return 'repeat';
  if (opts.consonants) {
    const run = (before.match(/[\p{L}·]*$/u)?.[0] ?? '') + ch;
    const tail = run.split(VOWELS).pop() ?? '';
    if (tail.replace(/·/g, '').length >= 6) return 'consonants';
  }
  return null;
}

// Capital letter expected at the start of the text or after a sentence end.
export function wantsCapital(before: string): boolean {
  return before.trim() === '' || /[.!?…]\s+$/.test(before);
}
