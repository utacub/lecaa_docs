// "Sobre LECAA Docs": the idea of the app and its credits, with the same institutional logos and
// text as the credits of LECAA.

import { X } from 'lucide';
import { LANG, T } from './i18n';
import { pictosAvailable } from './pictos';
import { h, icon } from './ui';
import { version as VERSION } from '../package.json';
import lecaaDocsLogo from './assets/marca/lecaa-docs.svg?raw';
import utac from './assets/marca/utac-negre.webp?url';
import ub from './assets/marca/ub.webp?url';
import fbg from './assets/marca/fbg.webp?url';
import educacio from './assets/marca/gencat-educacio.webp?url';
import drets from './assets/marca/gencat-drets-socials.webp?url';


const INSTITUTIONS = [
  { src: utac, name: 'UTAC', caption: 'Unitat de Tècniques Augmentatives de Comunicació', url: 'https://www.utac.cat/' },
  { src: ub, name: 'Universitat de Barcelona', caption: 'Universitat de Barcelona', url: 'https://web.ub.edu/' },
  { src: fbg, name: 'Fundació Bosch i Gimpera', caption: 'Fundació Bosch i Gimpera', url: 'https://www.fbg.ub.edu/' },
  { src: educacio, name: 'Departament d’Educació i Formació Professional', caption: 'UTAC Educació · Departament d’Educació i Formació Professional', url: 'https://educacio.gencat.cat/' },
  { src: drets, name: 'Departament de Drets Socials i Inclusió', caption: 'UTAC Sírius · Departament de Drets Socials i Inclusió', url: 'https://dretssocials.gencat.cat/' },
];

// [use, product, owner, url]
const TOOLS: [string, string, string, string][] = [
  [T('Aplicació', 'Aplicación'), 'Claude', 'Anthropic', 'https://claude.ai/'],
  [T('Sons de les lletres', 'Sonidos de las letras'), 'ElevenLabs', 'ElevenLabs', 'https://elevenlabs.io/'],
  [T('Veus per descarregar', 'Voces para descargar'), 'Piper (Ona, Davefx, Sharvard)', 'Rhasspy · Open Home Foundation', 'https://github.com/rhasspy/piper'],
  [T('Tipografies', 'Tipografías'), 'Andika, Atkinson Hyperlegible, Lexend, OpenDyslexic, Playwrite', 'SIL OFL 1.1', 'https://openfontlicense.org/'],
  [T('Icones', 'Iconos'), 'Lucide', 'Lucide Contributors', 'https://lucide.dev/'],
  ...(pictosAvailable ? [
    [T('Pictogrames', 'Pictogramas'), 'ARASAAC (autor: Sergio Palao)', T('Govern d’Aragó · CC BY-NC-SA 4.0', 'Gobierno de Aragón · CC BY-NC-SA 4.0'), 'https://arasaac.org/'],
    LANG === 'es'
      ? ['Formas de las palabras', 'spanish-dict-tools', 'Jaume Ortolà · LGPL 2.1', 'https://github.com/jaumeortola/spanish-dict-tools']
      : ['Formes de les paraules', 'catalan-dict-tools', 'Softcatalà · GPL 2.0 / LGPL 2.1', 'https://github.com/Softcatala/catalan-dict-tools'],
  ] as [string, string, string, string][] : []),
];

const link = (label: string | Node, url: string, attrs: Record<string, string> = {}) =>
  h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', referrerpolicy: 'no-referrer', ...attrs }, label);

export function openAbout(onClose: () => void): void {
  const close = () => { dlg.close(); };
  const logo = h('div', { class: 'about-logo', role: 'img', 'aria-label': 'LECAA Docs' });
  logo.innerHTML = lecaaDocsLogo;

  const dlg = h('dialog', { class: 'about', 'aria-labelledby': 'about-title' },
    h('header', {},
      h('h2', { id: 'about-title' }, T('Sobre LECAA Docs', 'Sobre LECAA Docs')),
      h('button', { class: 'tb', type: 'button', 'aria-label': T('Tanca', 'Cerrar'), onclick: close }, icon(X))),
    h('div', { class: 'body' },
      logo,
      h('section', {},
        h('h3', {}, T('La idea', 'La idea')),
        h('p', {}, T(
          'LECAA Docs és un processador de textos senzill per a persones que fan servir comunicació augmentativa i alternativa (CAA) i aprenen a escriure. Mentre s’escriu, l’app pot dir el so o el nom de cada lletra, la paraula acabada i la frase sencera, i llegeix en veu alta el text o la part seleccionada. Funciona amb el teclat físic i amb el teclat en pantalla de cada sistema, té lletres pensades per a la lectura i una pantalla completa protegida per a l’aula. Els documents es desen al mateix dispositiu, en .docx o en PDF.',
          'LECAA Docs es un procesador de textos sencillo para personas que usan comunicación aumentativa y alternativa (CAA) y aprenden a escribir. Mientras se escribe, la app puede decir el sonido o el nombre de cada letra, la palabra terminada y la frase entera, y lee en voz alta el texto o la parte seleccionada. Funciona con el teclado físico y con el teclado en pantalla de cada sistema, tiene letras pensadas para la lectura y una pantalla completa protegida para el aula. Los documentos se guardan en el mismo dispositivo, en .docx o en PDF.')),
        h('p', {}, T(
          'És una eina germana de LECAA (Lectura i Escriptura per a usuaris de Comunicació Augmentativa i Alternativa), en comparteix la imatge i és gratuïta per a tothom.',
          'Es una herramienta hermana de LECAA (Lectura i Escriptura per a usuaris de Comunicació Augmentativa i Alternativa), comparte con ella la imagen y es gratuita para todo el mundo.'))),
      // The online edition offers the portable one (published next to it as LECAA-Docs.html).
      ...(__SINGLE_FILE__ ? [] : [h('section', {},
        h('h3', {}, T('Versió portàtil', 'Versión portátil')),
        h('p', {}, T('LECAA Docs també funciona com un sol fitxer HTML, per enviar-lo per correu o portar-lo en un llapis USB i obrir-lo sense connexió en qualsevol navegador. ',
          'LECAA Docs también funciona como un solo archivo HTML, para enviarlo por correo o llevarlo en un lápiz USB y abrirlo sin conexión en cualquier navegador. '),
          h('a', { href: './LECAA-Docs.html', download: 'LECAA-Docs.html' }, T('Descarrega LECAA-Docs.html', 'Descargar LECAA-Docs.html'))))]),
      h('section', {},
        h('h3', {}, T('Origen i institucions', 'Origen e instituciones')),
        h('p', {}, T(
          'LECAA Docs s’ha creat des de la Unitat de Tècniques Augmentatives de Comunicació (UTAC), fent servir eines d’intel·ligència artificial.',
          'LECAA Docs se ha creado desde la Unitat de Tècniques Augmentatives de Comunicació (UTAC), utilizando herramientas de inteligencia artificial.')),
        h('p', {}, T(
          'La UTAC és un equip de la Universitat de Barcelona i de la Fundació Bosch i Gimpera. Concreta la seva activitat a partir de dos serveis de la Generalitat de Catalunya: UTAC Educació, del Departament d’Educació i Formació Professional, i UTAC Sírius, del Departament de Drets Socials i Inclusió.',
          'La UTAC es un equipo de la Universitat de Barcelona y de la Fundació Bosch i Gimpera. Concreta su actividad a partir de dos servicios de la Generalitat de Catalunya: UTAC Educació, del Departament d’Educació i Formació Professional, y UTAC Sírius, del Departament de Drets Socials i Inclusió.')),
        h('div', { class: 'about-institutions' }, ...INSTITUTIONS.map(i =>
          h('figure', {}, link(h('img', { src: i.src, alt: i.name }), i.url), h('figcaption', {}, i.caption))))),
      h('section', {},
        h('h3', {}, T('Eines i recursos', 'Herramientas y recursos')),
        h('ul', { class: 'about-tools' }, ...TOOLS.map(([use, product, owner, url]) =>
          h('li', {}, h('span', { class: 'use' }, use), h('strong', {}, product), h('span', {}, owner), link(url.replace(/^https?:\/\//, '').replace(/\/$/, ''), url))))),
      h('section', {},
        h('h3', {}, T('Llicències', 'Licencias')),
        h('p', {}, T('LECAA Docs és programari lliure, amb la llicència GNU GPL 3.0 o posterior: es pot fer servir, estudiar, modificar i compartir, i les versions modificades s’han de compartir amb la mateixa llicència. ',
          'LECAA Docs es software libre, con la licencia GNU GPL 3.0 o posterior: se puede usar, estudiar, modificar y compartir, y las versiones modificadas deben compartirse con la misma licencia. '),
          link(T('Codi font', 'Código fuente'), 'https://github.com/utacub/lecaa_docs'), ' · ', link('GNU GPL 3.0', 'https://www.gnu.org/licenses/gpl-3.0.html')),
        h('p', {}, T(
          'Les tipografies tenen la llicència SIL Open Font License 1.1, i l’OpenDyslexic que s’inclou als PDF, Bitstream Vera i CC BY 3.0. La veu Ona prové de dades de la UPC (Festcat, CC BY-SA 3.0 ES); Davefx, de dades d’OHF-Voice (CC0), i Sharvard, del corpus Sharvard (CC BY 3.0). Els logotips són marques de les institucions titulars i no formen part de la llicència de l’app.',
          'Las tipografías tienen la licencia SIL Open Font License 1.1, y la OpenDyslexic que se incluye en los PDF, Bitstream Vera y CC BY 3.0. La voz Ona procede de datos de la UPC (Festcat, CC BY-SA 3.0 ES); Davefx, de datos de OHF-Voice (CC0), y Sharvard, del corpus Sharvard (CC BY 3.0). Los logotipos son marcas de las instituciones titulares y no forman parte de la licencia de la app.')),
        h('p', { class: 'about-version' }, `${T('Versió', 'Versión')} ${VERSION}`))));

  dlg.addEventListener('close', () => { dlg.remove(); onClose(); });
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  document.body.append(dlg);
  dlg.showModal();
  (dlg.querySelector('button') as HTMLButtonElement).focus();
}
