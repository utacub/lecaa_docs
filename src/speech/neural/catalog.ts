// Free neural voices that run inside the app, for each interface language (no installation, offline once downloaded).
// Sizes are the published file sizes; licences are summarised in the README and planificacio.md.

import type { Lang } from '../../i18n';

export type Family = 'piper';

export interface NeuralVoice {
  id: string;        // VoiceInfo id without the engine prefix
  name: string;
  dialect: string;
  speaker?: number;  // multi-speaker models
}

export interface NeuralModel {
  key: string;
  lang: Lang;
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
    key: 'ona-medium', lang: 'ca', family: 'piper', title: 'Ona',
    description: 'Veu femenina, català central.',
    bytes: 63_201_294, ...piper('ca/ca_ES/upc_ona/medium/ca_ES-upc_ona-medium.onnx'),
    licence: PIPER_LICENCE, licenceUrl: 'https://huggingface.co/rhasspy/piper-voices/tree/main/ca/ca_ES',
    voices: [{ id: 'ona-medium', name: 'Ona', dialect: 'central' }],
  },
  // Spain's Spanish: only the medium-quality Piper voices (the best ones published for es_ES).
  {
    key: 'davefx-medium', lang: 'es', family: 'piper', title: 'Davefx',
    description: 'Voz masculina, castellano de España.',
    bytes: 63_201_294, ...piper('es/es_ES/davefx/medium/es_ES-davefx-medium.onnx'),
    licence: 'Datos de voz OHF-Voice voice-datasets, licencia CC0.', licenceUrl: 'https://huggingface.co/rhasspy/piper-voices/tree/main/es/es_ES/davefx/medium',
    voices: [{ id: 'davefx-medium', name: 'Davefx', dialect: 'España' }],
  },
  {
    key: 'sharvard-medium', lang: 'es', family: 'piper', title: 'Sharvard (voz femenina y masculina)',
    description: 'Dos voces, femenina y masculina, castellano de España.',
    bytes: 76_733_615, ...piper('es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx'),
    licence: 'Corpus Sharvard (Universidad de Edimburgo), licencia CC BY 3.0.', licenceUrl: 'https://huggingface.co/rhasspy/piper-voices/tree/main/es/es_ES/sharvard/medium',
    voices: [
      { id: 'sharvard-f', name: 'Sharvard femenina', dialect: 'España', speaker: 1 },
      { id: 'sharvard-m', name: 'Sharvard masculina', dialect: 'España', speaker: 0 },
    ],
  },
];

export function modelOf(voiceId: string) {
  return MODELS.find(m => m.voices.some(v => v.id === voiceId));
}
