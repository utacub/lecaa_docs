// PDF export, loaded only when used. pdfmake lays out the document with the same fonts as the
// screen (embedded, so the PDF looks the same everywhere and the text stays selectable).
// Fonts are the WOFF files of the bundled fonts: pdfmake cannot read WOFF2. OpenDyslexic comes
// from the open-dyslexic package (OTF), because pdfmake cannot subset the CFF of the WOFF one.

import type { Editor, JSONContent } from '@tiptap/core';
import pdfMake from 'pdfmake/build/pdfmake';
import andika400 from '@fontsource/andika/files/andika-latin-400-normal.woff?url';
import andika700 from '@fontsource/andika/files/andika-latin-700-normal.woff?url';
import andika400i from '@fontsource/andika/files/andika-latin-400-italic.woff?url';
import andika700i from '@fontsource/andika/files/andika-latin-700-italic.woff?url';
import atk400 from '@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff?url';
import atk700 from '@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff?url';
import atk400i from '@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-italic.woff?url';
import atk700i from '@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-italic.woff?url';
import lex400 from '@fontsource/lexend/files/lexend-latin-400-normal.woff?url';
import lex700 from '@fontsource/lexend/files/lexend-latin-700-normal.woff?url';
import dys400 from 'open-dyslexic/otf/OpenDyslexic-Regular.otf?url';
import dys700 from 'open-dyslexic/otf/OpenDyslexic-Bold.otf?url';
import dys400i from 'open-dyslexic/otf/OpenDyslexic-Italic.otf?url';
import dys700i from 'open-dyslexic/otf/OpenDyslexic-BoldItalic.otf?url';
import pwEs from '@fontsource/playwrite-es/files/playwrite-es-latin-400-normal.woff?url';
import pwFr from '@fontsource/playwrite-fr-moderne/files/playwrite-fr-moderne-latin-400-normal.woff?url';
import { BASE_PT } from './docio';
import { fontByFamily, fontById } from './fonts';
import { BCP47 } from './i18n';
import { settings } from './settings';

// [normal, bold, italics, bolditalics] per font id; a missing style uses the closest one.
const FILES: Record<string, [string, string, string, string]> = {
  andika: [andika400, andika700, andika400i, andika700i],
  atkinson: [atk400, atk700, atk400i, atk700i],
  lexend: [lex400, lex700, lex400, lex700],
  opendyslexic: [dys400, dys700, dys400i, dys700i],
  'lligada-es': [pwEs, pwEs, pwEs, pwEs],
  'lligada-fr': [pwFr, pwFr, pwFr, pwFr],
};

const PAGE_WIDTH = 595.28 - 2 * 64; // A4 minus the margins, in points
type Node = Record<string, unknown>;

function pt(fontSize?: unknown): number | undefined {
  const m = /^([\d.]+)(em|px|pt)$/.exec(String(fontSize ?? ''));
  if (!m) return undefined;
  const v = parseFloat(m[1]);
  return m[2] === 'em' ? v * BASE_PT : m[2] === 'px' ? v * 0.75 : v;
}

// pdfmake reads PNG and JPEG only: other images are redrawn as PNG.
async function image(attrs: Record<string, unknown> = {}): Promise<Node | null> {
  let src = String(attrs.src ?? '');
  if (!src) return null;
  const img = new Image();
  img.src = src;
  try { await img.decode(); } catch { return null; }
  if (!/^data:image\/(png|jpe?g);/i.test(src)) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d')!.drawImage(img, 0, 0);
    src = c.toDataURL('image/png');
  }
  const w = (Number(attrs.width) || Math.min(img.naturalWidth, 600)) * 0.75;
  return { image: src, width: Math.min(w, PAGE_WIDTH), margin: [0, 4, 0, 4] };
}

class Builder {
  fonts = new Set<string>();

  font(family?: unknown): string | undefined {
    if (!family) return undefined;
    const f = fontByFamily(String(family));
    if (!f) return undefined;
    this.fonts.add(f.id);
    return f.id;
  }

  // Text runs of a paragraph; images inside a paragraph become their own blocks after it.
  async inlines(nodes: JSONContent[] = []): Promise<{ runs: Node[]; images: Node[] }> {
    const runs: Node[] = [], images: Node[] = [];
    for (const n of nodes) {
      if (n.type === 'text') {
        const marks = n.marks ?? [];
        const has = (t: string) => marks.some(m => m.type === t);
        const style = marks.find(m => m.type === 'textStyle')?.attrs ?? {};
        runs.push({
          text: n.text ?? '', bold: has('bold') || undefined, italics: has('italic') || undefined,
          decoration: has('underline') ? 'underline' : undefined, fontSize: pt(style.fontSize), font: this.font(style.fontFamily),
        });
      } else if (n.type === 'hardBreak') {
        runs.push({ text: '\n' });
      } else if (n.type === 'image') {
        const img = await image(n.attrs);
        if (img) images.push(img);
      }
    }
    return { runs, images };
  }

  async blocks(nodes: JSONContent[] = []): Promise<Node[]> {
    const out: Node[] = [];
    for (const n of nodes) {
      switch (n.type) {
        case 'paragraph':
        case 'heading': {
          const { runs, images } = await this.inlines(n.content);
          const heading = n.type === 'heading' ? (n.attrs?.level === 1 ? 2 : 1.5) : 0;
          if (runs.length || !images.length) {
            out.push({
              text: runs.length ? runs : ' ', alignment: n.attrs?.textAlign || undefined, margin: [0, 0, 0, 6],
              ...(heading ? { fontSize: BASE_PT * heading, bold: true } : {}),
            });
          }
          out.push(...images);
          break;
        }
        case 'bulletList':
        case 'orderedList': {
          const items: Node[] = [];
          for (const item of n.content ?? []) items.push({ stack: await this.blocks(item.content) });
          out.push({ [n.type === 'bulletList' ? 'ul' : 'ol']: items, margin: [0, 0, 0, 6] });
          break;
        }
        case 'table':
          out.push(await this.table(n));
          break;
        case 'image': {
          const img = await image(n.attrs);
          if (img) out.push(img);
          break;
        }
      }
    }
    return out;
  }

  // pdfmake needs a full grid: cells covered by a colspan or rowspan get an empty placeholder.
  async table(n: JSONContent): Promise<Node> {
    const rows = n.content ?? [];
    const grid: Node[][] = rows.map(() => []);
    for (let r = 0; r < rows.length; r++) {
      let c = 0;
      for (const cell of rows[r].content ?? []) {
        while (grid[r][c]) c++;
        const colSpan = Number(cell.attrs?.colspan) || 1, rowSpan = Number(cell.attrs?.rowspan) || 1;
        grid[r][c] = {
          stack: await this.blocks(cell.content), colSpan: colSpan > 1 ? colSpan : undefined, rowSpan: rowSpan > 1 ? rowSpan : undefined,
          bold: cell.type === 'tableHeader' || undefined,
        };
        for (let dr = 0; dr < rowSpan; dr++) for (let dc = 0; dc < colSpan; dc++) {
          if ((dr || dc) && grid[r + dr]) grid[r + dr][c + dc] = {};
        }
        c += colSpan;
      }
    }
    const cols = Math.max(1, ...grid.map(r => r.length));
    const body = grid.map(r => Array.from({ length: cols }, (_, i) => r[i] ?? {}));
    return { table: { widths: Array(cols).fill('*'), body }, margin: [0, 0, 0, 8] };
  }
}

async function base64(url: string): Promise<string> {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function pdfFromEditor(editor: Editor, title: string): Promise<Blob> {
  const b = new Builder();
  const docFont = fontById(settings.value.docFont).id;
  b.fonts.add(docFont);
  const content = await b.blocks(editor.getJSON().content);

  const vfs: Record<string, string> = {};
  const fonts: Record<string, Record<string, string>> = {};
  for (const id of b.fonts) {
    const files = FILES[id] ?? FILES.andika;
    const names = await Promise.all(files.map(async (url, i) => {
      const name = `${id}-${i}`;
      vfs[name] ??= await base64(url);
      return name;
    }));
    fonts[id] = { normal: names[0], bold: names[1], italics: names[2], bolditalics: names[3] };
  }
  pdfMake.addVirtualFileSystem(vfs);
  pdfMake.setFonts(fonts);

  const doc = pdfMake.createPdf({
    pageSize: 'A4',
    pageMargins: [64, 64, 64, 64],
    info: { title, creator: 'LECAA Docs', producer: 'LECAA Docs' },
    language: BCP47,
    content: content.length ? content : [{ text: ' ' }],
    defaultStyle: { font: docFont, fontSize: BASE_PT, lineHeight: 1.25 },
  });
  return doc.getBlob();
}
