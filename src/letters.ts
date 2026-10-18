// Letter names, grapheme → recorded sound, and the text rules used by the typing feedback and
// the misuse detector, for each interface language.
//
// Catalan letter names follow the IEC's Ortografia catalana (2017) in their most common form.
// The Catalan grapheme → sound table starts from LECAA's ISOLATED_SOUND_BLOCKS (edició 45).
// Spanish letter names follow the RAE and ASALE's Ortografía de la lengua española (2010), and
// the Spanish grapheme → sound table gives the most common sound in Spain's Spanish.
// Every table still needs didactic validation (see planificacio.md §2.2 and §5.2).

import { LANG } from './i18n';
import phonemeFilesCa from './phonemes.json';
import phonemeFilesEs from './phonemes-es.json';

const NAMES_CA: Record<string, string> = {
  a: 'a', b: 'be', c: 'ce', 'ç': 'ce trencada', d: 'de', e: 'e', f: 'efa', g: 'ge', h: 'hac',
  i: 'i', j: 'jota', k: 'ca', l: 'ela', m: 'ema', n: 'ena', 'ñ': 'enye', o: 'o', p: 'pe', q: 'cu',
  r: 'erra', s: 'essa', t: 'te', u: 'u', v: 've baixa', w: 've doble', x: 'ics', y: 'i grega', z: 'zeta',
  'à': 'a amb accent obert', 'è': 'e amb accent obert', 'é': 'e amb accent tancat',
  'í': 'i amb accent', 'ò': 'o amb accent obert', 'ó': 'o amb accent tancat', 'ú': 'u amb accent',
  'ï': 'i amb dièresi', 'ü': 'u amb dièresi', '·': 'punt volat',
};

const NAMES_ES: Record<string, string> = {
  a: 'a', b: 'be', c: 'ce', 'ç': 'ce cedilla', d: 'de', e: 'e', f: 'efe', g: 'ge', h: 'hache',
  i: 'i', j: 'jota', k: 'ka', l: 'ele', m: 'eme', n: 'ene', 'ñ': 'eñe', o: 'o', p: 'pe', q: 'cu',
  r: 'erre', s: 'ese', t: 'te', u: 'u', v: 'uve', w: 'uve doble', x: 'equis', y: 'ye', z: 'zeta',
  'á': 'a con tilde', 'é': 'e con tilde', 'í': 'i con tilde', 'ó': 'o con tilde', 'ú': 'u con tilde',
  'ü': 'u con diéresis', 'à': 'a con acento grave', 'è': 'e con acento grave', 'ò': 'o con acento grave',
  'ï': 'i con diéresis', '·': 'punto medio',
};

const SYMBOLS_CA: Record<string, string> = {
  '.': 'punt', ',': 'coma', '?': 'interrogant', '¿': 'interrogant obert', '!': 'exclamació', '¡': 'exclamació oberta',
  ':': 'dos punts', ';': 'punt i coma', "'": 'apòstrof', '’': 'apòstrof', '-': 'guionet', '(': 'parèntesi', ')': 'tanca parèntesi',
  '"': 'cometes', '«': 'cometes', '»': 'tanca cometes', '/': 'barra', '+': 'més', '=': 'igual', '%': 'per cent', '@': 'arrova',
  '0': 'zero', '1': 'u', '2': 'dos', '3': 'tres', '4': 'quatre', '5': 'cinc', '6': 'sis', '7': 'set', '8': 'vuit', '9': 'nou',
};

const SYMBOLS_ES: Record<string, string> = {
  '.': 'punto', ',': 'coma', '?': 'cierra interrogación', '¿': 'abre interrogación', '!': 'cierra exclamación', '¡': 'abre exclamación',
  ':': 'dos puntos', ';': 'punto y coma', "'": 'apóstrofo', '’': 'apóstrofo', '-': 'guion', '(': 'abre paréntesis', ')': 'cierra paréntesis',
  '"': 'comillas', '«': 'abre comillas', '»': 'cierra comillas', '/': 'barra', '+': 'más', '=': 'igual', '%': 'por ciento', '@': 'arroba',
  '0': 'cero', '1': 'uno', '2': 'dos', '3': 'tres', '4': 'cuatro', '5': 'cinco', '6': 'seis', '7': 'siete', '8': 'ocho', '9': 'nueve',
};

// Grapheme typed on one key → IPA phoneme of the recorded clip. h and · have no sound.
const PHONEME_CA: Record<string, string | null> = {
  a: 'a', 'à': 'a', e: 'e', 'é': 'e', 'è': 'ɛ', i: 'i', 'í': 'i', 'ï': 'i', o: 'o', 'ó': 'o', 'ò': 'ɔ',
  u: 'u', 'ú': 'u', 'ü': 'u', b: 'b', v: 'b', c: 'k', k: 'k', q: 'k', 'ç': 's', d: 'd', f: 'f', g: 'ɡ',
  j: 'ʒ', l: 'l', m: 'm', n: 'n', 'ñ': 'ɲ', p: 'p', r: 'r', s: 's', t: 't', x: 'ʃ', z: 'z', w: 'w', y: 'j',
  h: null, '·': null,
};

const PHONEME_ES: Record<string, string | null> = {
  a: 'a', 'á': 'a', 'à': 'a', e: 'e', 'é': 'e', 'è': 'e', i: 'i', 'í': 'i', 'ï': 'i', o: 'o', 'ó': 'o', 'ò': 'o',
  u: 'u', 'ú': 'u', 'ü': 'u', b: 'b', v: 'b', c: 'k', k: 'k', q: 'k', 'ç': 's', d: 'd', f: 'f', g: 'ɡ',
  j: 'x', l: 'l', m: 'm', n: 'n', 'ñ': 'ɲ', p: 'p', r: 'r', s: 's', t: 't', x: 'ks', z: 'θ', w: 'w', y: 'ʝ',
  h: null, '·': null,
};

export const LETTER_NAMES = LANG === 'es' ? NAMES_ES : NAMES_CA;
export const SYMBOL_NAMES = LANG === 'es' ? SYMBOLS_ES : SYMBOLS_CA;
export const GRAPHEME_PHONEME = LANG === 'es' ? PHONEME_ES : PHONEME_CA;
// Clip file name (without .mp3) of each phoneme.
export const PHONEME_FILES = (LANG === 'es' ? phonemeFilesEs : phonemeFilesCa) as Record<string, string>;
const CAPITAL = LANG === 'es' ? 'mayúscula' : 'majúscula';

export function phonemeFile(grapheme: string): string | null {
  const p = GRAPHEME_PHONEME[grapheme.toLowerCase()];
  return p ? PHONEME_FILES[p] ?? null : null;
}

export function spokenName(ch: string, sayCapital: boolean): string | null {
  const lower = ch.toLowerCase();
  const name = LETTER_NAMES[lower] ?? SYMBOL_NAMES[ch] ?? null;
  if (!name) return null;
  return sayCapital && ch !== lower ? `${name} ${CAPITAL}` : name;
}

export const isLetter = (ch: string) => /^\p{L}$/u.test(ch);
export const SENTENCE_END = /[.!?…]/;
export const WORD_PUNCT = /[,.;:!?…)»"]/;

const VOWELS = /[aeiouáàèéíïòóúüy]/i;

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
// Neither Catalan nor Spanish has a word with three identical letters in a row (ll, rr, ss, nn,
// mm, cc are fine), or with six consonant letters in a row.
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
