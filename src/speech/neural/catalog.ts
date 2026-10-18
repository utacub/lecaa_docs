// Free Catalan neural voices that run inside the app (no installation, offline once downloaded).
// Sizes are the published file sizes; licences are summarised in the README and planificacio.md.

export type Family = 'piper' | 'matxa';

export interface NeuralVoice {
  id: string;        // VoiceInfo id without the engine prefix
  name: string;
  dialect: string;
  speaker?: number;  // multi-speaker models
}

export interface NeuralModel {
  key: string;
  family: Family;
  title: string;
  description: string;
  bytes: number;
  model: string[];    // mirror URLs, first that answers wins
  config?: string[];
  licence: string;
  licenceUrl: string;
  mustAccept?: string; // licence text the user has to accept before downloading
  experimental?: boolean;
  voices: NeuralVoice[];
}

const PIPER = [
  'https://huggingface.co/rhasspy/piper-voices/resolve/main/',
  'https://huggingface.co/diffusionstudio/piper-voices/resolve/main/',
];
const piper = (path: string) => ({ model: PIPER.map(b => b + path), config: PIPER.map(b => b + path + '.json') });
const PIPER_LICENCE = 'Dades de veu de la UPC (Festcat), llicència CC BY-SA 3.0 ES.';

const MATXA = 'https://huggingface.co/BSC-LT/matxa-tts-v2-ca-multiaccent-graphemes';

export const MODELS: NeuralModel[] = [
  {
    key: 'ona-medium', family: 'piper', title: 'Ona',
    description: 'Veu femenina, català central.',
    bytes: 63_201_294, ...piper('ca/ca_ES/upc_ona/medium/ca_ES-upc_ona-medium.onnx'),
    licence: PIPER_LICENCE, licenceUrl: 'https://huggingface.co/rhasspy/piper-voices/tree/main/ca/ca_ES',
    voices: [{ id: 'ona-medium', name: 'Ona', dialect: 'central' }],
  },
  {
    key: 'matxa', family: 'matxa', title: 'Veus Aina – Matxa (16 veus, 5 variants)',
    description: 'Veus del projecte Aina (BSC) en balear, central, nord-occidental, valencià i septentrional. Descàrrega gran, millor en ordinador.',
    bytes: 272_805_633,
    model: [`${MATXA}/resolve/main/matxa_v2_multiaccent_graphemes_20_steps_wavenext.onnx`],
    licence: 'Llicència RAIL no comercial del BSC: ús gratuït només per a finalitats acadèmiques, de recerca o sense ànim de lucre.',
    licenceUrl: `${MATXA}/blob/main/LICENSE.md`,
    mustAccept: 'Aquestes veus del projecte Aina només es poden fer servir per a finalitats acadèmiques, de recerca o sense ànim de lucre, mai comercials. Són veus sintètiques, no persones reals. En descarregar-les acceptes la llicència del BSC (enllaç a sota), que el BSC pot fer complir.',
    experimental: true,
    voices: [
      ['Olga', 'balear', 0], ['Quim', 'balear', 1], ['BM', 'balear', 10],
      ['Elia', 'central', 2], ['Grau', 'central', 3], ['CF', 'central', 11], ['CM', 'central', 12],
      ['Emma', 'nord-occidental', 4], ['Pere', 'nord-occidental', 5], ['Estel', 'nord-occidental', 13],
      ['Gina', 'valencià', 6], ['Lluc', 'valencià', 7], ['Arnau', 'valencià', 8], ['Berta', 'valencià', 9],
      ['Laura', 'septentrional', 14], ['Jordi', 'septentrional', 15],
    ].map(([name, dialect, speaker]) => ({ id: `matxa-${speaker}`, name: `${name} (Aina)`, dialect: dialect as string, speaker: speaker as number })),
  },
];

export function modelOf(voiceId: string) {
  return MODELS.find(m => m.voices.some(v => v.id === voiceId));
}

// ----- Matxa v2 graphemes: text → symbol ids (symbols.py of langtech-bsc/Matcha-TTS, branch v2-graphemes) -----

const MATXA_SYMBOLS = ['_', ...';:,.!?¡¿—…"«»“”()- ', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  ...'ɑɐɒæɓʙβɔɕçɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸθœɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʕʢǀǁǂǃˈˌːˑʼʴʰʱʲʷˠˤ˞↓↑→↗↘\'̩\'ᵻ',
  ...'àáèéìíòóùú·üïöñ’#´'];
const SYMBOL_ID = new Map<string, number>();
MATXA_SYMBOLS.forEach((s, i) => SYMBOL_ID.set(s, i)); // last index wins, as in the Python dict

const UNITS = ['zero', 'un', 'dos', 'tres', 'quatre', 'cinc', 'sis', 'set', 'vuit', 'nou', 'deu', 'onze', 'dotze', 'tretze', 'catorze', 'quinze', 'setze', 'disset', 'divuit', 'dinou'];
const TENS = ['', '', 'vint', 'trenta', 'quaranta', 'cinquanta', 'seixanta', 'setanta', 'vuitanta', 'noranta'];

// Catalan cardinal numbers (IEC): "vint-i-un", "trenta-dos", "dos-cents", "mil", "dos milions".
export function numberToCatalan(n: number): string {
  if (n < 20) return UNITS[n];
  if (n < 100) {
    const t = Math.floor(n / 10), u = n % 10;
    return u === 0 ? TENS[t] : t === 2 ? `vint-i-${UNITS[u]}` : `${TENS[t]}-${UNITS[u]}`;
  }
  if (n < 1000) {
    const c = Math.floor(n / 100), r = n % 100;
    const head = c === 1 ? 'cent' : `${UNITS[c]}-cents`;
    return r ? `${head} ${numberToCatalan(r)}` : head;
  }
  if (n < 1_000_000) {
    const k = Math.floor(n / 1000), r = n % 1000;
    const head = k === 1 ? 'mil' : `${numberToCatalan(k)} mil`;
    return r ? `${head} ${numberToCatalan(r)}` : head;
  }
  if (n < 1e12) {
    const m = Math.floor(n / 1_000_000), r = n % 1_000_000;
    const head = m === 1 ? 'un milió' : `${numberToCatalan(m)} milions`;
    return r ? `${head} ${numberToCatalan(r)}` : head;
  }
  return String(n).split('').map(d => UNITS[+d]).join(' ');
}

// The model card asks for numbers to be written out; the training cleaner lower-cases text.
export function matxaText(text: string): string {
  return text
    .replace(/(\d)\.(?=\d{3}\b)/g, '$1') // 1.000 → 1000
    .replace(/\d+(?:,\d+)?/g, m => m.split(',').map(p => numberToCatalan(parseInt(p, 10))).join(' coma '))
    .normalize('NFC')
    .toLowerCase()
    .replace(/'/g, '’')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matxaIds(text: string): number[] {
  const ids: number[] = [0];
  for (const ch of matxaText(text)) {
    const id = SYMBOL_ID.get(ch);
    if (id === undefined) continue;
    ids.push(id, 0); // intersperse with the pad symbol, as in matcha/cli.py
  }
  return ids;
}
