// Free Catalan neural voices that run inside the app (no installation, offline once downloaded).
// Sizes are the published file sizes; licences are summarised in the README and planificacio.md.

export type Family = 'piper';

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

export const MODELS: NeuralModel[] = [
  {
    key: 'ona-medium', family: 'piper', title: 'Ona',
    description: 'Veu femenina, català central.',
    bytes: 63_201_294, ...piper('ca/ca_ES/upc_ona/medium/ca_ES-upc_ona-medium.onnx'),
    licence: PIPER_LICENCE, licenceUrl: 'https://huggingface.co/rhasspy/piper-voices/tree/main/ca/ca_ES',
    voices: [{ id: 'ona-medium', name: 'Ona', dialect: 'central' }],
  },
];

export function modelOf(voiceId: string) {
  return MODELS.find(m => m.voices.some(v => v.id === voiceId));
}
