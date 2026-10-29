// Interface language. Each language has its own configuration (settings.ts), its own letter
// names and sounds (letters.ts), keyboards and voices. Changing the language saves the document
// and reloads the app, so every part starts again in the new language.
//
// The six languages of LECAA Tecla: Catalan, Spanish, Basque, Galician, English and French.
// Texts are written in Catalan and Spanish where they are used, T('Desa', 'Guardar'); Basque,
// Galician, English and French translate the Catalan text in src/lang/*.ts. Those four
// translations were made with Claude, as in LECAA Tecla, and need review by native speakers.

import { STORAGE } from './storage-name';
import eu from './lang/eu';
import gl from './lang/gl';
import en from './lang/en';
import fr from './lang/fr';

export type Lang = 'ca' | 'es' | 'eu' | 'gl' | 'en' | 'fr';

export const LANGS: { id: Lang; label: string; bcp47: string }[] = [
  { id: 'ca', label: 'Català', bcp47: 'ca-ES' },
  { id: 'es', label: 'Castellano', bcp47: 'es-ES' },
  { id: 'eu', label: 'Euskara', bcp47: 'eu-ES' },
  { id: 'gl', label: 'Galego', bcp47: 'gl-ES' },
  { id: 'en', label: 'English', bcp47: 'en-GB' },
  { id: 'fr', label: 'Français', bcp47: 'fr-FR' },
];

const KEY = `${STORAGE}:lang`;

function saved(): Lang {
  try {
    const l = localStorage.getItem(KEY);
    return LANGS.some(x => x.id === l) ? l as Lang : 'ca';
  } catch { return 'ca'; }
}

export const LANG: Lang = saved();

// Translations of the Catalan texts, for the tests that check that they are complete.
export const DICTIONARIES: Partial<Record<Lang, Record<string, string>>> = { eu, gl, en, fr };
const DICT = DICTIONARIES[LANG];

// Picks the text of the current language: T('Desa', 'Guardar'). {name} in the text is replaced
// by vars.name: T('Descarregant {nom}', 'Descargando {nom}', { nom: m.title }).
export function T(ca: string, es: string, vars?: Record<string, string | number>): string {
  const s = LANG === 'ca' ? ca : LANG === 'es' ? es : DICT?.[ca] ?? es;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}

export const BCP47 = LANGS.find(l => l.id === LANG)!.bcp47;

// Languages of the voices offered in each interface language. Spanish: only Spain's Spanish
// (es-ES, or a bare "es"). Galician has no free voice that works inside the browser, so after the
// Galician ones (Microsoft Edge has them, online) Spanish and Portuguese voices are offered too,
// as in LECAA Tecla.
const VOICE_LANGS: Record<Lang, RegExp[]> = {
  ca: [/^ca($|-)/],
  es: [/^es$/, /^es-es($|-)/],
  eu: [/^eu($|-)/],
  gl: [/^gl($|-)/, /^es$/, /^es-es($|-)/, /^pt$/, /^pt-pt($|-)/],
  en: [/^en($|-)/],
  fr: [/^fr($|-)/],
};

const tag = (lang: string) => lang.trim().replace('_', '-').toLowerCase();

export function isLangVoice(lang: string, l: Lang = LANG) {
  return VOICE_LANGS[l].some(r => r.test(tag(lang)));
}

// Voices in the language itself, not one of the alternatives (Galician).
export function isOwnLangVoice(lang: string, l: Lang = LANG) {
  return VOICE_LANGS[l][0].test(tag(lang)) || (l === 'es' && isLangVoice(lang, l));
}

export async function switchLang(to: Lang, beforeReload: () => Promise<unknown>) {
  if (to === LANG) return;
  await beforeReload();
  try { localStorage.setItem(KEY, to); } catch { /* private mode: stays in this language */ }
  location.reload();
}
