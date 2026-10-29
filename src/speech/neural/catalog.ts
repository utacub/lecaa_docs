// Free neural voices that run inside the app, for each interface language (no installation, offline once downloaded).
// Sizes are the published file sizes; licences are summarised in the README and planificacio.md.
// The same voices as LECAA Tecla: Catalan, Spanish and Basque. Galician has no free voice for the
// browser, so a Spanish voice and the Portuguese Tugão are offered as alternatives. English and
// French: only the voices of the system or the browser.

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
  lang: string;      // BCP 47 tag of the voice
  offer: Lang[];     // interface languages that offer it
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
    key: 'ona-medium', lang: 'ca-ES', offer: ['ca'], family: 'piper', title: 'Ona',
    description: 'Veu femenina, català central.',
    bytes: 63_201_294, ...piper('ca/ca_ES/upc_ona/medium/ca_ES-upc_ona-medium.onnx'),
    licence: PIPER_LICENCE, licenceUrl: 'https://huggingface.co/rhasspy/piper-voices/tree/main/ca/ca_ES',
    voices: [{ id: 'ona-medium', name: 'Ona', dialect: 'central' }],
  },
  // Spain's Spanish: only the medium-quality Piper voices (the best ones published for es_ES).
  {
    key: 'davefx-medium', lang: 'es-ES', offer: ['es', 'gl'], family: 'piper', title: 'Davefx',
    description: 'Voz masculina, castellano de España.',
    bytes: 63_201_294, ...piper('es/es_ES/davefx/medium/es_ES-davefx-medium.onnx'),
    licence: 'Datos de voz OHF-Voice voice-datasets, licencia CC0.', licenceUrl: 'https://huggingface.co/rhasspy/piper-voices/tree/main/es/es_ES/davefx/medium',
    voices: [{ id: 'davefx-medium', name: 'Davefx', dialect: 'España' }],
  },
  {
    key: 'sharvard-medium', lang: 'es-ES', offer: ['es'], family: 'piper', title: 'Sharvard (voz femenina y masculina)',
    description: 'Dos voces, femenina y masculina, castellano de España.',
    bytes: 76_733_615, ...piper('es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx'),
    licence: 'Corpus Sharvard (Universidad de Edimburgo), licencia CC BY 3.0.', licenceUrl: 'https://huggingface.co/rhasspy/piper-voices/tree/main/es/es_ES/sharvard/medium',
    voices: [
      { id: 'sharvard-f', name: 'Sharvard femenina', dialect: 'España', speaker: 1 },
      { id: 'sharvard-m', name: 'Sharvard masculina', dialect: 'España', speaker: 0 },
    ],
  },
  {
    key: 'maider-medium', lang: 'eu-ES', offer: ['eu'], family: 'piper', title: 'Maider',
    description: 'Emakumezko ahotsa, euskara batua.',
    bytes: 63_531_379, ...piper('eu/eu_ES/maider/medium/eu_ES-maider-medium.onnx'),
    licence: 'itzune/maider-dataset, CC BY 4.0 lizentzia.', licenceUrl: 'https://huggingface.co/rhasspy/piper-voices/tree/main/eu/eu_ES/maider/medium',
    voices: [{ id: 'maider-medium', name: 'Maider', dialect: 'Euskadi' }],
  },
  {
    key: 'antton-medium', lang: 'eu-ES', offer: ['eu'], family: 'piper', title: 'Antton',
    description: 'Gizonezko ahotsa, euskara batua.',
    bytes: 63_531_379, ...piper('eu/eu_ES/antton/medium/eu_ES-antton-medium.onnx'),
    licence: 'itzune/antton-dataset, CC BY 4.0 lizentzia.', licenceUrl: 'https://huggingface.co/rhasspy/piper-voices/tree/main/eu/eu_ES/antton/medium',
    voices: [{ id: 'antton-medium', name: 'Antton', dialect: 'Euskadi' }],
  },
  // For Galician only: European Portuguese (it does not pronounce Galician perfectly either).
  {
    key: 'tugao-medium', lang: 'pt-PT', offer: ['gl'], family: 'piper', title: 'Tugão',
    description: 'Voz do português europeu. Alternativa para o galego.',
    bytes: 63_201_294, ...piper('pt/pt_PT/tug%C3%A3o/medium/pt_PT-tug%C3%A3o-medium.onnx'),
    licence: 'Dados de voz em domínio público (CC0).', licenceUrl: 'https://huggingface.co/rhasspy/piper-voices/tree/main/pt/pt_PT/tug%C3%A3o/medium',
    voices: [{ id: 'tugao-medium', name: 'Tugão', dialect: 'Portugal' }],
  },
];

export function modelOf(voiceId: string) {
  return MODELS.find(m => m.voices.some(v => v.id === voiceId));
}
