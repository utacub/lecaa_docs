// User settings, persisted per device and per language (each language keeps its own
// configuration). Everything that changes how the app speaks or accepts keystrokes lives here so
// the settings drawer and the engines share one source.

import { LANG, T } from './i18n';
import { STORAGE } from './storage-name';

export type LetterMode = 'off' | 'name' | 'sound';
export type RecordedVoice = string; // folder of recorded letter sounds (src/assets/sons)

export interface Settings {
  feedback: {
    sentence: boolean;      // on . ? ! and Enter
    word: boolean;          // on space
    wordOnPunct: boolean;   // also on , . ? ! : ;
    letter: LetterMode;     // name and sound are mutually exclusive
    upperCaseWord: boolean; // say "majúscula" before a capital letter name
  };
  lockWhileSpeaking: boolean;
  guard: {
    enabled: boolean;
    simultaneous: boolean;  // 3+ keys down at once
    burst: boolean;         // 3 keys within burstMs
    burstMs: number;
    repeatLetters: boolean; // 3 identical letters in a row
    consonants: boolean;    // 6+ consonants without a vowel
    autoRepeat: boolean;    // key held down
    calmMs: number;
    message: string;
  };
  motor: {
    debounceMs: number;     // ignore the same key again within this time
  };
  voice: { id: string | null; rate: number; pitch: number; volume: number; showAll: boolean };
  recordedVoice: RecordedVoice;
  highlight: boolean;
  pictos: {
    enabled: boolean;       // ARASAAC pictograms above the finished words (prototype)
    contentOnly: boolean;   // none for articles, prepositions, conjunctions and weak pronouns
    size: number;           // height of the pictogram, in times the height of the letters (em)
  };
  docFontSize: number;
  docFont: string;        // id from fonts.ts
  protectSettings: boolean;
  lockPassword: string;   // hash of the password that ends full-screen mode ('' = not set); shared by all languages
}

export const DEFAULTS: Settings = {
  feedback: { sentence: true, word: true, wordOnPunct: true, letter: 'off', upperCaseWord: false },
  lockWhileSpeaking: false,
  guard: {
    enabled: true,
    simultaneous: true,
    burst: true,
    burstMs: 60,
    repeatLetters: true,
    consonants: true,
    autoRepeat: true,
    calmMs: 3000,
    message: T('Pensa bé cada lletra que escrius', 'Piensa bien cada letra que escribes'),
  },
  motor: { debounceMs: 0 },
  voice: { id: null, rate: 1, pitch: 1, volume: 1, showAll: false },
  recordedVoice: 'anna',
  highlight: true,
  pictos: { enabled: true, contentOnly: true, size: 2 },
  docFontSize: 22,
  docFont: 'andika',
  protectSettings: false,
  lockPassword: '',
};

const KEY = LANG === 'ca' ? `${STORAGE}:settings` : `${STORAGE}:settings:${LANG}`;
const PASSWORD_KEY = `${STORAGE}:lock-password`;

function merge<T>(base: T, over: unknown): T {
  if (typeof base !== 'object' || base === null || Array.isArray(base)) {
    return (over === undefined || typeof over !== typeof base ? base : over) as T;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  const o = (over && typeof over === 'object' ? over : {}) as Record<string, unknown>;
  for (const k of Object.keys(out)) {
    const b = out[k];
    out[k] = b === null ? (o[k] ?? null) : merge(b, o[k]);
  }
  return out as T;
}

type Listener = (s: Settings) => void;

class Store {
  value: Settings;
  private listeners = new Set<Listener>();

  constructor() {
    let saved: unknown = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* private mode */ }
    this.value = merge(DEFAULTS, saved);
    try {
      const pw = localStorage.getItem(PASSWORD_KEY);
      if (pw !== null) this.value.lockPassword = pw;
    } catch { /* ignore */ }
  }

  update(fn: (s: Settings) => void) {
    fn(this.value);
    try {
      localStorage.setItem(KEY, JSON.stringify(this.value));
      localStorage.setItem(PASSWORD_KEY, this.value.lockPassword);
    } catch { /* ignore */ }
    for (const l of this.listeners) l(this.value);
  }

  replace(next: unknown) {
    this.update(s => Object.assign(s, merge(DEFAULTS, next)));
  }

  subscribe(l: Listener) { this.listeners.add(l); return () => this.listeners.delete(l); }
}

export const settings = new Store();

export function anyTypingFeedback(s: Settings) {
  return s.feedback.sentence || s.feedback.word || s.feedback.letter !== 'off';
}
