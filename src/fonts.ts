// Document fonts. All are bundled (offline, single file) with the SIL Open Font License.
// Two are joined school handwriting ("lletra lligada"): Playwrite ES (the Spanish school model)
// and Playwrite FR Moderne, both by TypeTogether for learning to write.

import atkinson400 from '@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff2?url';
import atkinson700 from '@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2?url';
import lexend400 from '@fontsource/lexend/files/lexend-latin-400-normal.woff2?url';
import lexend700 from '@fontsource/lexend/files/lexend-latin-700-normal.woff2?url';
import dys400 from '@fontsource/opendyslexic/files/opendyslexic-latin-400-normal.woff2?url';
import dys700 from '@fontsource/opendyslexic/files/opendyslexic-latin-700-normal.woff2?url';
import pwEs from '@fontsource/playwrite-es/files/playwrite-es-latin-400-normal.woff2?url';
import pwFr from '@fontsource/playwrite-fr-moderne/files/playwrite-fr-moderne-latin-400-normal.woff2?url';

export interface DocFont {
  id: string;
  label: string;
  family: string;   // CSS font-family name (also the name written to .docx)
  css: string;      // full CSS stack
  joined?: boolean;
  files?: [string, string][]; // [weight, url]
}

export const FONTS: DocFont[] = [
  { id: 'andika', label: 'Andika', family: 'Andika', css: "'Andika', Verdana, sans-serif" },
  { id: 'atkinson', label: 'Atkinson Hyperlegible', family: 'Atkinson Hyperlegible', css: "'Atkinson Hyperlegible', Verdana, sans-serif", files: [['400', atkinson400], ['700', atkinson700]] },
  { id: 'lexend', label: 'Lexend', family: 'Lexend', css: "'Lexend', Verdana, sans-serif", files: [['400', lexend400], ['700', lexend700]] },
  { id: 'opendyslexic', label: 'OpenDyslexic', family: 'OpenDyslexic', css: "'OpenDyslexic', Verdana, sans-serif", files: [['400', dys400], ['700', dys700]] },
  { id: 'lligada-es', label: 'Lligada escolar (Playwrite ES)', family: 'Playwrite ES', css: "'Playwrite ES', cursive", joined: true, files: [['400', pwEs]] },
  { id: 'lligada-fr', label: 'Lligada moderna (Playwrite FR Moderne)', family: 'Playwrite FR Moderne', css: "'Playwrite FR Moderne', cursive", joined: true, files: [['400', pwFr]] },
];

export const fontById = (id: string) => FONTS.find(f => f.id === id) ?? FONTS[0];
export const fontByFamily = (family: string) => FONTS.find(f => family.replace(/['"]/g, '').split(',')[0].trim() === f.family);

let loaded = false;
export function loadFonts() {
  if (loaded) return;
  loaded = true;
  for (const f of FONTS) for (const [weight, url] of f.files ?? []) {
    const face = new FontFace(f.family, `url(${url}) format('woff2')`, { weight, display: 'swap' });
    document.fonts.add(face);
    void face.load().catch(() => { /* falls back to the next font in the stack */ });
  }
}
