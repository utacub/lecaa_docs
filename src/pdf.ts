// PDF export, loaded only when used. pdfmake lays out the document with the same fonts as the
// screen (embedded, so the PDF looks the same everywhere and the text stays selectable). When the
// pictograms are shown, they go above the words, as on screen (pictos-export.ts).
// Fonts are the WOFF files of the bundled fonts: pdfmake cannot read WOFF2. OpenDyslexic is the
// OTF of its own release (src/assets/fonts/opendyslexic, SIL OFL 1.1, the licence of the screen
// one), because pdfmake cannot subset the CFF of the WOFF one.

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
import dys400 from './assets/fonts/opendyslexic/OpenDyslexic-Regular.otf?url';
import dys700 from './assets/fonts/opendyslexic/OpenDyslexic-Bold.otf?url';
import dys400i from './assets/fonts/opendyslexic/OpenDyslexic-Italic.otf?url';
import dys700i from './assets/fonts/opendyslexic/OpenDyslexic-BoldItalic.otf?url';
import pwEs from '@fontsource/playwrite-es/files/playwrite-es-latin-400-normal.woff?url';
import pwFr from '@fontsource/playwrite-fr-moderne/files/playwrite-fr-moderne-latin-400-normal.woff?url';
import { BASE_PT } from './docio';
import { fontByFamily, fontById } from './fonts';
import { BCP47 } from './i18n';
import { pictoCredit } from './pictos';
import { layout, pictoDataUrl, pictosForExport, type PictoExport } from './pictos-export';
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

// A transparent picture: the room of the pictogram above a word that has none.
let blank = '';
const blankPng = () => {
  if (!blank) { const c = document.createElement('canvas'); c.width = c.height = 1; blank = c.toDataURL('image/png'); }
  return blank;
};

class Builder {
  fonts = new Set<string>();
  pictos = false;     // each word with its pictogram above it (pictos-export.ts)
  width = PAGE_WIDTH; // width for the text, in points

  font(family?: unknown): string | undefined {
    if (!family) return undefined;
    const f = fontByFamily(String(family));
    if (!f) return undefined;
    this.fonts.add(f.id);
    return f.id;
  }

  run(n: JSONContent, text = n.text ?? ''): Node {
    const marks = n.marks ?? [];
    const has = (t: string) => marks.some(m => m.type === t);
    const style = marks.find(m => m.type === 'textStyle')?.attrs ?? {};
    return {
      text, bold: has('bold') || undefined, italics: has('italic') || undefined,
      decoration: has('underline') ? 'underline' : undefined, fontSize: pt(style.fontSize), font: this.font(style.fontFamily),
    };
  }

  // Text runs of a paragraph; images inside a paragraph become their own blocks after it.
  async inlines(nodes: JSONContent[] = []): Promise<{ runs: Node[]; images: Node[] }> {
    const runs: Node[] = [], images: Node[] = [];
    for (const n of nodes) {
      if (n.type === 'text') {
        runs.push(this.run(n));
      } else if (n.type === 'hardBreak') {
        runs.push({ text: '\n' });
      } else if (n.type === 'image') {
        const img = await image(n.attrs);
        if (img) images.push(img);
      }
    }
    return { runs, images };
  }

  // A paragraph as lines of columns, each with the pictogram above the word.
  async pictoBlocks(n: JSONContent): Promise<Node[]> {
    const heading = n.type === 'heading' ? (n.attrs?.level === 1 ? 2 : 1.5) : 0;
    const base = BASE_PT * (heading || 1);
    const laid = await layout(n.content, { base, bold: !!heading, width: this.width });
    const out: Node[] = [];
    if (!laid.lines.length) out.push({ text: ' ', margin: [0, laid.picto, 0, 6] });
    for (const [i, line] of laid.lines.entries()) {
      const area = Math.max(...line.map(u => u.picto));
      const cols: Node[] = [];
      for (const u of line) {
        const src = u.id ? await pictoDataUrl(u.id) : null;
        cols.push({
          width: u.width,
          stack: [
            src ? { image: src, width: u.picto, height: u.picto, alignment: 'center', margin: [0, area - u.picto, 0, 1] } : { image: blankPng(), width: 1, height: area, margin: [0, 0, 0, 1] },
            { text: u.pieces.map(p => { const r = this.run(p.node, p.text); return { ...r, fontSize: r.fontSize ?? base, bold: r.bold ?? (heading ? true : undefined) }; }), alignment: 'center' },
          ],
        });
      }
      const fill = { width: '*', text: '' };
      const align = n.attrs?.textAlign;
      out.push({
        columns: align === 'center' ? [fill, ...cols, fill] : align === 'right' ? [fill, ...cols] : cols,
        columnGap: laid.gap, unbreakable: true,
        margin: [0, i ? base * 0.3 : 0, 0, i === laid.lines.length - 1 ? 6 : 0],
      });
    }
    for (const img of laid.images) {
      const node = await image(img.attrs);
      if (node) out.push(node);
    }
    return out;
  }

  // Runs `fn` with less width for the text (inside a list or a table cell).
  async narrower<R>(by: number, fn: () => Promise<R>): Promise<R> {
    const w = this.width;
    this.width = Math.max(40, w - by);
    try { return await fn(); } finally { this.width = w; }
  }

  async blocks(nodes: JSONContent[] = []): Promise<Node[]> {
    const out: Node[] = [];
    for (const n of nodes) {
      switch (n.type) {
        case 'paragraph':
        case 'heading': {
          if (this.pictos) { out.push(...await this.pictoBlocks(n)); break; }
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
          for (const item of n.content ?? []) items.push({ stack: await this.narrower(16, () => this.blocks(item.content)) });
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
    const cols0 = Math.max(1, ...rows.map(r => (r.content ?? []).reduce((k, c) => k + (Number(c.attrs?.colspan) || 1), 0)));
    for (let r = 0; r < rows.length; r++) {
      let c = 0;
      for (const cell of rows[r].content ?? []) {
        while (grid[r][c]) c++;
        const colSpan = Number(cell.attrs?.colspan) || 1, rowSpan = Number(cell.attrs?.rowspan) || 1;
        // Cells share the width; their padding and lines take about 10 points.
        const cellWidth = (this.width / cols0) * colSpan - 10;
        grid[r][c] = {
          stack: await this.narrower(this.width - cellWidth, () => this.blocks(cell.content)), colSpan: colSpan > 1 ? colSpan : undefined, rowSpan: rowSpan > 1 ? rowSpan : undefined,
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

export async function pdfFromEditor(editor: Editor, title: string, pictos?: PictoExport): Promise<Blob> {
  const b = new Builder();
  const docFont = fontById(settings.value.docFont).id;
  b.fonts.add(docFont);
  const json = editor.getJSON();
  b.pictos = (pictos ?? await pictosForExport(json)) === 'yes';
  const content = await b.blocks(json.content);

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
    // With pictograms, each page cites them as ARASAAC asks.
    ...(b.pictos ? { footer: { text: pictoCredit(), fontSize: 8, lineHeight: 1.1, color: '#555555', margin: [64, 22, 64, 0] } } : {}),
    defaultStyle: { font: docFont, fontSize: BASE_PT, lineHeight: 1.25 },
  });
  return doc.getBlob();
}
