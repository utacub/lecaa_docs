// Letter names, grapheme → recorded sound, and the text rules used by the typing feedback and
// the misuse detector, for each interface language.
//
// Catalan letter names follow the IEC's Ortografia catalana (2017) in their most common form.
// The Catalan grapheme → sound table starts from LECAA's ISOLATED_SOUND_BLOCKS (edició 45).
// Spanish letter names follow the RAE and ASALE's Ortografía de la lengua española (2010), and
// the Spanish grapheme → sound table gives the most common sound in Spain's Spanish.
// Basque, Galician, English and French have no recorded letter sounds: the voice says the name of
// each letter, with the names of LECAA Tecla (English and French: the letter itself, which the
// voices read as its name).
// Every table still needs didactic validation (see planificacio.md §2.2 and §5.2).

import { LANG, type Lang } from './i18n';
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

const NAMES_EU: Record<string, string> = {
  a: 'a', b: 'be', c: 'ze', d: 'de', e: 'e', f: 'efe', g: 'ge', h: 'hatxe', i: 'i', j: 'jota', k: 'ka',
  l: 'ele', m: 'eme', n: 'ene', 'ñ': 'eñe', o: 'o', p: 'pe', q: 'ku', r: 'erre', s: 'ese', t: 'te', u: 'u',
  v: 'uve', w: 'uve bikoitza', x: 'ixa', y: 'i grekoa', z: 'zeta', 'ç': 'ze zedilla',
  'á': 'a azentuduna', 'é': 'e azentuduna', 'í': 'i azentuduna', 'ó': 'o azentuduna', 'ú': 'u azentuduna',
  'ü': 'u dieresiduna',
};

const NAMES_GL: Record<string, string> = {
  a: 'a', b: 'be', c: 'ce', d: 'de', e: 'e', f: 'efe', g: 'gue', h: 'hache', i: 'i', j: 'jota', k: 'ka',
  l: 'ele', m: 'eme', n: 'ene', 'ñ': 'eñe', o: 'o', p: 'pe', q: 'cu', r: 'erre', s: 'ese', t: 'te', u: 'u',
  v: 'uve', w: 'uve dobre', x: 'xis', y: 'i grego', z: 'zeta', 'ç': 'ce cedilla',
  'á': 'a con til', 'é': 'e con til', 'í': 'i con til', 'ó': 'o con til', 'ú': 'u con til', 'ü': 'u con diérese',
};

const NAMES_EN: Record<string, string> = Object.fromEntries([...'abcdefghijklmnopqrstuvwxyz'].map(l => [l, l.toUpperCase()]));

const NAMES_FR: Record<string, string> = {
  ...Object.fromEntries([...'abcdefghijklmnopqrstuvwxyz'].map(l => [l, l.toUpperCase()])),
  'à': 'A accent grave', 'â': 'A accent circonflexe', 'ç': 'C cédille', 'é': 'E accent aigu', 'è': 'E accent grave',
  'ê': 'E accent circonflexe', 'ë': 'E tréma', 'î': 'I accent circonflexe', 'ï': 'I tréma', 'ô': 'O accent circonflexe',
  'ù': 'U accent grave', 'û': 'U accent circonflexe', 'ü': 'U tréma', 'ÿ': 'Y tréma', 'œ': 'E dans l’O', 'æ': 'E dans l’A',
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

const SYMBOLS_EU: Record<string, string> = {
  '.': 'puntua', ',': 'koma', '?': 'galdera ikurra', '¿': 'galdera ikur irekia', '!': 'harridura ikurra', '¡': 'harridura ikur irekia',
  ':': 'bi puntu', ';': 'puntu eta koma', "'": 'apostrofoa', '’': 'apostrofoa', '-': 'marratxoa', '(': 'parentesia', ')': 'parentesia itxi',
  '"': 'komatxoak', '«': 'komatxoak', '»': 'komatxoak itxi', '/': 'barra', '+': 'gehi', '=': 'berdin', '%': 'ehuneko', '@': 'abildua',
  '0': 'zero', '1': 'bat', '2': 'bi', '3': 'hiru', '4': 'lau', '5': 'bost', '6': 'sei', '7': 'zazpi', '8': 'zortzi', '9': 'bederatzi',
};

const SYMBOLS_GL: Record<string, string> = {
  '.': 'punto', ',': 'coma', '?': 'pecha interrogación', '¿': 'abre interrogación', '!': 'pecha exclamación', '¡': 'abre exclamación',
  ':': 'dous puntos', ';': 'punto e coma', "'": 'apóstrofo', '’': 'apóstrofo', '-': 'guión', '(': 'abre paréntese', ')': 'pecha paréntese',
  '"': 'comiñas', '«': 'abre comiñas', '»': 'pecha comiñas', '/': 'barra', '+': 'máis', '=': 'igual', '%': 'por cento', '@': 'arroba',
  '0': 'cero', '1': 'un', '2': 'dous', '3': 'tres', '4': 'catro', '5': 'cinco', '6': 'seis', '7': 'sete', '8': 'oito', '9': 'nove',
};

const SYMBOLS_EN: Record<string, string> = {
  '.': 'full stop', ',': 'comma', '?': 'question mark', '¿': 'inverted question mark', '!': 'exclamation mark', '¡': 'inverted exclamation mark',
  ':': 'colon', ';': 'semicolon', "'": 'apostrophe', '’': 'apostrophe', '-': 'hyphen', '(': 'open bracket', ')': 'close bracket',
  '"': 'quotation marks', '«': 'open quotes', '»': 'close quotes', '/': 'slash', '+': 'plus', '=': 'equals', '%': 'per cent', '@': 'at',
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
};

const SYMBOLS_FR: Record<string, string> = {
  '.': 'point', ',': 'virgule', '?': 'point d’interrogation', '¿': 'point d’interrogation inversé', '!': 'point d’exclamation', '¡': 'point d’exclamation inversé',
  ':': 'deux-points', ';': 'point-virgule', "'": 'apostrophe', '’': 'apostrophe', '-': 'trait d’union', '(': 'parenthèse ouvrante', ')': 'parenthèse fermante',
  '"': 'guillemets', '«': 'guillemet ouvrant', '»': 'guillemet fermant', '/': 'barre oblique', '+': 'plus', '=': 'égal', '%': 'pour cent', '@': 'arobase',
  '0': 'zéro', '1': 'un', '2': 'deux', '3': 'trois', '4': 'quatre', '5': 'cinq', '6': 'six', '7': 'sept', '8': 'huit', '9': 'neuf',
};

// Grapheme typed on one key → IPA phoneme of the recorded clip. h and · have no sound.
const PHONEME_CA: Record<string, string | null> = {
  a: 'a', 'à': 'a', e: 'e', 'é': 'e', 'è': 'ɛ', i: 'i', 'í': 'i', 'ï': 'i', o: 'o', 'ó': 'o', 'ò': 'ɔ',
  u: 'u', 'ú': 'u', 'ü': 'u', b: 'b', v: 'b', c: 'k', k: 'k', q: 'k', 'ç': 's', d: 'd', f: 'f', g: 'ɡ',
  j: 'ʒ', l: 'l', m: 'm', n: 'n', 'ñ': 'ɲ', p: 'p', r: 'r', s: 's', t: 't', x: 'ʃ', z: 'z', w: 'w', y: 'j',
  h: null, '·': null,
};

// Spanish: the same letter sounds as Blanco sobre negro in LECAA Tecla (Marc, 24/10/2026): c = /k/,
// g = /g/ and r = /r/ (the sound of the letter on its own); x = /ʃ/ and w = /w/ with the same voice.
const PHONEME_ES: Record<string, string | null> = {
  a: 'a', 'á': 'a', 'à': 'a', e: 'e', 'é': 'e', 'è': 'e', i: 'i', 'í': 'i', 'ï': 'i', o: 'o', 'ó': 'o', 'ò': 'o',
  u: 'u', 'ú': 'u', 'ü': 'u', b: 'b', v: 'b', c: 'k', k: 'k', q: 'k', 'ç': 's', d: 'd', f: 'f', g: 'ɡ',
  j: 'x', l: 'l', m: 'm', n: 'n', 'ñ': 'ɲ', p: 'p', r: 'r', s: 's', t: 't', x: 'ʃ', z: 'θ', w: 'w', y: 'ʝ',
  h: null, '·': null,
};

const BY_LANG: Record<Lang, { names: Record<string, string>; symbols: Record<string, string>; capital: (name: string) => string }> = {
  ca: { names: NAMES_CA, symbols: SYMBOLS_CA, capital: n => `${n} majúscula` },
  es: { names: NAMES_ES, symbols: SYMBOLS_ES, capital: n => `${n} mayúscula` },
  eu: { names: NAMES_EU, symbols: SYMBOLS_EU, capital: n => `${n} maiuskula` },
  gl: { names: NAMES_GL, symbols: SYMBOLS_GL, capital: n => `${n} maiúscula` },
  en: { names: NAMES_EN, symbols: SYMBOLS_EN, capital: n => `capital ${n}` },
  fr: { names: NAMES_FR, symbols: SYMBOLS_FR, capital: n => `${n} majuscule` },
};

export const LETTER_NAMES = BY_LANG[LANG].names;
export const SYMBOL_NAMES = BY_LANG[LANG].symbols;
// Only Catalan and Spanish have recorded letter sounds.
export const HAS_LETTER_SOUNDS = LANG === 'ca' || LANG === 'es';
export const GRAPHEME_PHONEME = LANG === 'es' ? PHONEME_ES : LANG === 'ca' ? PHONEME_CA : {};
// Clip file name (without .mp3) of each phoneme.
export const PHONEME_FILES = (LANG === 'es' ? phonemeFilesEs : LANG === 'ca' ? phonemeFilesCa : {}) as Record<string, string>;

export function phonemeFile(grapheme: string): string | null {
  const p = GRAPHEME_PHONEME[grapheme.toLowerCase()];
  return p ? PHONEME_FILES[p] ?? null : null;
}

export function spokenName(ch: string, sayCapital: boolean): string | null {
  const lower = ch.toLowerCase();
  const name = LETTER_NAMES[lower] ?? SYMBOL_NAMES[ch] ?? null;
  if (!name) return null;
  return sayCapital && ch !== lower ? BY_LANG[LANG].capital(name) : name;
}

export const isLetter = (ch: string) => /^\p{L}$/u.test(ch);
export const SENTENCE_END = /[.!?…]/;
export const WORD_PUNCT = /[,.;:!?…)»"]/;

const VOWELS = /[aeiouyáàâäèéêëíìîïòóôöúùûüÿœæ]/i;

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
// Catalan, Spanish, Basque, Galician and French have no word with three identical letters in a row
// (ll, rr, ss, nn, mm, cc are fine), or with six consonant letters in a row; English has only a
// few rare ones (latchstring, borschts).
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

