// Text sent to the voices. Many voices read a word written all in capitals as an acronym and say
// the name of each letter ("CASA" → "ce, a, essa, a"). People who are learning to write often type
// in capitals, so a word of two letters or more with no lowercase letter is sent in lowercase, and
// so is a single capital letter when the whole text is in capitals ("PERE I MARIA", "Y"), so that
// the voice says the word "i", "y" and not the name of the letter. The text on screen does not
// change, and neither does the length of the text, so the positions of the words that the voices
// report (to highlight them) still match. Letter names (spelling) are sent as they are: see literal
// in SoundItem.

const WORD = /[\p{L}\p{M}\p{N}·]+(?:['’-][\p{L}\p{M}\p{N}·]+)*/gu;
const LOWER = /\p{Ll}/u;
const UPPER = /\p{Lu}/u;

export function forSpeech(text: string): string {
  const allCaps = UPPER.test(text) && !LOWER.test(text);
  return text.replace(WORD, w => {
    const letters = w.match(/\p{L}/gu) ?? [];
    if (!letters.some(l => UPPER.test(l)) || letters.some(l => LOWER.test(l))) return w;
    if (letters.length < 2 && !allCaps) return w;
    // Lowercase letter by letter, so that no letter changes length (İ would become i + a dot).
    return [...w].map(c => { const l = c.toLowerCase(); return l.length === c.length ? l : c; }).join('');
  });
}
