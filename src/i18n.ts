// Interface language. Each language has its own configuration (settings.ts), its own letter
// names and sounds (letters.ts), keyboards and voices. Changing the language saves the document
// and reloads the app, so every part starts again in the new language.

export type Lang = 'ca' | 'es';

const KEY = 'lecaa-docs:lang';

function saved(): Lang {
  try { return localStorage.getItem(KEY) === 'es' ? 'es' : 'ca'; } catch { return 'ca'; }
}

export const LANG: Lang = saved();

// Picks the text of the current language: T('Desa', 'Guardar').
export const T = (ca: string, es: string) => (LANG === 'es' ? es : ca);

export const LANGS: { id: Lang; label: string; bcp47: string }[] = [
  { id: 'ca', label: 'Català', bcp47: 'ca-ES' },
  { id: 'es', label: 'Castellano', bcp47: 'es-ES' },
];

export const BCP47 = LANGS.find(l => l.id === LANG)!.bcp47;

// Voices of the current language. Spanish: only Spain's Spanish (es-ES, or a bare "es").
export function isLangVoice(lang: string, l: Lang = LANG) {
  const t = lang.trim().replace('_', '-').toLowerCase();
  return l === 'ca' ? /^ca($|-)/.test(t) : t === 'es' || /^es-es($|-)/.test(t);
}

export async function switchLang(to: Lang, beforeReload: () => Promise<unknown>) {
  if (to === LANG) return;
  await beforeReload();
  try { localStorage.setItem(KEY, to); } catch { /* private mode: stays in this language */ }
  location.reload();
}
