// Documents are always saved on the device. .docx is the exchange format: Google Docs,
// Word and LibreOffice open it, and Google Docs exports to it.
// Import: mammoth (docx → HTML, then sanitised). Export: the `docx` library.

import type { Editor, JSONContent } from '@tiptap/core';
import DOMPurify from 'dompurify';
import {
  AlignmentType, Document, Footer, HeadingLevel, ImageRun, LevelFormat, LineRuleType, Packer, Paragraph, Tab, Table, TableCell,
  TableRow, TabStopType, TextRun, WidthType, type ParagraphChild,
} from 'docx';
import { fontByFamily, fontById } from './fonts';
import { BCP47, T } from './i18n';
import { pictoCredit } from './pictos';
import { layout, pictoPng, pictosForExport, type PictoExport } from './pictos-export';
import { settings } from './settings';
import { inTauri } from './speech/native';

export const BASE_PT = 14; // body text size in exported documents
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// ---------- import ----------

export async function htmlFromFile(name: string, data: ArrayBuffer): Promise<string> {
  const ext = name.toLowerCase().split('.').pop();
  let html: string;
  if (ext === 'docx') {
    const mammoth = await import('mammoth');
    const res = await mammoth.convertToHtml({ arrayBuffer: data }, { styleMap: ['u => u'] });
    html = res.value;
  } else if (ext === 'html' || ext === 'htm') {
    html = new TextDecoder().decode(data);
  } else {
    const text = new TextDecoder().decode(data);
    html = text.split(/\r?\n/).map(l => `<p>${l.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))}</p>`).join('');
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'img', 'span'],
    ALLOWED_ATTR: ['src', 'alt', 'colspan', 'rowspan', 'style', 'width', 'height'],
    ALLOWED_URI_REGEXP: /^data:image\//i,
  });
}

// ---------- export ----------

interface Ctx {
  orderedInstance: number;
  pictos: boolean; // each word with its pictogram above it (pictos-export.ts)
  width: number;   // width for the text, in points
}
type List = { kind: 'bullet' | 'ordered'; level: number; instance: number; number: number };

function sizeHalfPoints(fontSize?: string): number | undefined {
  if (!fontSize) return undefined;
  const em = /([\d.]+)em/.exec(fontSize);
  if (em) return Math.round(parseFloat(em[1]) * BASE_PT * 2);
  const pt = /([\d.]+)pt/.exec(fontSize);
  if (pt) return Math.round(parseFloat(pt[1]) * 2);
  const px = /([\d.]+)px/.exec(fontSize);
  return px ? Math.round(parseFloat(px[1]) * 0.75 * 2) : undefined;
}

const ALIGN: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED,
};

async function imageRun(attrs: Record<string, unknown>): Promise<ImageRun | null> {
  const src = String(attrs.src ?? '');
  const m = /^data:image\/(png|jpe?g|gif|bmp);base64,(.*)$/i.exec(src);
  if (!m) return null;
  const type = (m[1].toLowerCase().startsWith('jp') ? 'jpg' : m[1].toLowerCase()) as 'jpg' | 'png' | 'gif' | 'bmp';
  const bin = atob(m[2]);
  const data = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
  let w = Number(attrs.width) || 0, hgt = Number(attrs.height) || 0;
  if (!w || !hgt) {
    const img = new Image();
    img.src = src;
    await img.decode().catch(() => {});
    const nw = img.naturalWidth || 400, nh = img.naturalHeight || 300;
    w = w || Math.min(nw, 600);
    hgt = hgt || Math.round((w / nw) * nh);
  }
  return new ImageRun({ type, data, transformation: { width: w, height: hgt }, altText: { name: String(attrs.alt ?? ''), description: String(attrs.alt ?? ''), title: String(attrs.alt ?? '') } });
}

function textRun(n: JSONContent, text = n.text ?? '', base?: { size: number; bold: boolean }): TextRun {
  const marks = n.marks ?? [];
  const has = (t: string) => marks.some(m => m.type === t);
  const style = marks.find(m => m.type === 'textStyle')?.attrs ?? {};
  return new TextRun({
    text, bold: has('bold') || base?.bold || undefined, italics: has('italic') || undefined,
    underline: has('underline') ? {} : undefined, size: sizeHalfPoints(style.fontSize) ?? (base ? Math.round(base.size * 2) : undefined),
    font: style.fontFamily ? fontByFamily(String(style.fontFamily))?.family : undefined,
  });
}

async function inlines(nodes: JSONContent[] = []): Promise<ParagraphChild[]> {
  const out: ParagraphChild[] = [];
  for (const n of nodes) {
    if (n.type === 'text') {
      out.push(textRun(n));
    } else if (n.type === 'hardBreak') {
      out.push(new TextRun({ text: '', break: 1 }));
    } else if (n.type === 'image') {
      const img = await imageRun(n.attrs ?? {});
      if (img) out.push(img);
    }
  }
  return out;
}

// ----- pictograms: each line of a paragraph as two, the pictograms and the words below them -----
// Both lines have the same centred tab stops, one per word, so each pictogram stays centred above
// its word even when the computer that opens the document has other fonts. They are plain
// paragraphs (no table), so they also work inside a table cell and in every word processor.
const twip = (pt: number) => Math.round(pt * 20);

async function pictoBlocks(n: JSONContent, ctx: Ctx, list?: List, marker?: string): Promise<Paragraph[]> {
  const heading = n.type === 'heading' ? (n.attrs?.level === 1 ? 2 : 1.5) : 0;
  const base = BASE_PT * (heading || 1);
  const indent = list ? 18 * list.level : 0;
  const width = ctx.width - indent;
  const laid = await layout(n.content, { base, bold: !!heading, width, marker });
  const align = String(n.attrs?.textAlign ?? '');
  const out: Paragraph[] = [];
  if (!laid.lines.length) out.push(new Paragraph({ spacing: { before: twip(laid.picto), after: twip(base * 0.4) }, children: [] }));
  for (const [i, line] of laid.lines.entries()) {
    const used = line.reduce((w, u) => w + u.width, 0) + laid.gap * (line.length - 1);
    let x = indent + (align === 'center' ? (width - used) / 2 : align === 'right' ? width - used : 0);
    const stops: number[] = [];
    for (const u of line) { stops.push(twip(x + u.width / 2)); x += u.width + laid.gap; }
    const tabStops = stops.map(position => ({ type: TabStopType.CENTER, position }));
    const pictures: ParagraphChild[] = [];
    let last = -1; // the stop of the previous picture
    for (const [k, u] of line.entries()) {
      const png = u.id ? await pictoPng(u.id) : null;
      if (!png) continue;
      // One tab for each stop up to this word's.
      pictures.push(new TextRun({ children: Array.from({ length: k - last }, () => new Tab()), size: 2 }));
      last = k;
      pictures.push(new ImageRun({
        type: 'png', data: png, transformation: { width: Math.round(u.picto * 4 / 3), height: Math.round(u.picto * 4 / 3) },
        altText: { name: u.word, description: `${u.word} (ARASAAC ${u.id})`, title: u.word },
      }));
    }
    out.push(new Paragraph({
      tabStops, keepNext: true, keepLines: true, run: { size: 2 },
      spacing: { before: i ? twip(base * 0.3) : 0, after: 0, line: twip(laid.picto), lineRule: LineRuleType.AT_LEAST },
      children: pictures,
    }));
    const words: ParagraphChild[] = [];
    for (const u of line) {
      words.push(new TextRun({ children: [new Tab()] }));
      words.push(...u.pieces.map(p => textRun(p.node, p.text, { size: base, bold: !!heading })));
    }
    out.push(new Paragraph({
      tabStops, keepLines: true, heading: heading ? (heading === 2 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2) : undefined,
      spacing: { before: 0, after: i === laid.lines.length - 1 ? twip(base * 0.4) : 0 },
      children: words,
    }));
  }
  for (const img of laid.images) {
    const run = await imageRun(img.attrs ?? {});
    if (run) out.push(new Paragraph({ children: [run] }));
  }
  return out;
}

async function blocks(nodes: JSONContent[] = [], ctx: Ctx, list?: List): Promise<(Paragraph | Table)[]> {
  const out: (Paragraph | Table)[] = [];
  let marked = false; // the list marker goes on the first paragraph of the item
  for (const n of nodes) {
    switch (n.type) {
      case 'paragraph':
      case 'heading': {
        if (ctx.pictos) {
          const marker = list && !marked ? (list.kind === 'bullet' ? '•' : `${list.number}.`) : undefined;
          marked = true;
          out.push(...await pictoBlocks(n, ctx, list, marker));
          break;
        }
        const align = ALIGN[String(n.attrs?.textAlign ?? '')];
        out.push(new Paragraph({
          children: await inlines(n.content),
          alignment: align,
          heading: n.type === 'heading' ? (n.attrs?.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2) : undefined,
          bullet: list?.kind === 'bullet' ? { level: list.level } : undefined,
          numbering: list?.kind === 'ordered' ? { reference: 'lecaa-ordered', level: list.level, instance: list.instance } : undefined,
        }));
        break;
      }
      case 'bulletList':
      case 'orderedList': {
        const kind = n.type === 'bulletList' ? 'bullet' : 'ordered';
        const level = list ? list.level + 1 : 0;
        const instance = kind === 'ordered' ? ++ctx.orderedInstance : 0;
        for (const [i, item] of (n.content ?? []).entries()) out.push(...await blocks(item.content, ctx, { kind, level, instance, number: i + 1 }));
        break;
      }
      case 'table': {
        const rows: TableRow[] = [];
        const cols = Math.max(1, ...(n.content ?? []).map(r => (r.content ?? []).reduce((k, c) => k + (Number(c.attrs?.colspan) || 1), 0)));
        for (const r of n.content ?? []) {
          const cells: TableCell[] = [];
          for (const c of r.content ?? []) {
            // Cells share the width; Word's cell margins take about 11 points.
            const kids = await blocks(c.content, { ...ctx, width: (ctx.width / cols) * (Number(c.attrs?.colspan) || 1) - 11 });
            cells.push(new TableCell({
              children: kids.length ? kids : [new Paragraph('')],
              columnSpan: Number(c.attrs?.colspan) || 1,
              rowSpan: Number(c.attrs?.rowspan) || 1,
            }));
          }
          rows.push(new TableRow({ children: cells, tableHeader: r.content?.every(c => c.type === 'tableHeader') || undefined }));
        }
        if (rows.length) out.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        break;
      }
      case 'image': {
        const img = await imageRun(n.attrs ?? {});
        if (img) out.push(new Paragraph({ children: [img] }));
        break;
      }
    }
  }
  return out;
}

// A4 with the margins of the PDF (64 points), so that both lay out the pictograms alike.
const PICTO_PAGE = { size: { width: 11906, height: 16838 }, margin: { top: 1280, right: 1280, bottom: 1280, left: 1280 } };

export async function docxFromEditor(editor: Editor, title: string, pictos?: PictoExport): Promise<Blob> {
  const json = editor.getJSON();
  const withPictos = (pictos ?? await pictosForExport(json)) === 'yes';
  const children = await blocks(json.content, { orderedInstance: 0, pictos: withPictos, width: (11906 - 2 * 1280) / 20 });
  const doc = new Document({
    title,
    creator: 'LECAA Docs',
    styles: { default: { document: { run: { font: fontById(settings.value.docFont).family, size: BASE_PT * 2, language: { value: BCP47 } } } } },
    numbering: {
      config: [{
        reference: 'lecaa-ordered',
        levels: [0, 1, 2, 3].map(level => ({ level, format: LevelFormat.DECIMAL, text: `%${level + 1}.`, alignment: AlignmentType.START, style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } } })),
      }],
    },
    sections: [{
      properties: withPictos ? { page: PICTO_PAGE } : undefined,
      // With pictograms, each page cites them as ARASAAC asks, in the footer, apart from the text.
      footers: withPictos ? { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: pictoCredit(), size: 16, color: '555555' })] })] }) } : undefined,
      children: children.length ? children : [new Paragraph('')],
    }],
  });
  return Packer.toBlob(doc);
}

// ---------- device files ----------

export function safeName(title: string) {
  return (title.trim() || T('Document sense títol', 'Documento sin título')).replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120);
}

const KINDS = {
  docx: { mime: DOCX_MIME, ext: 'docx', label: () => T('Document de Word (compatible amb Google Docs)', 'Documento de Word (compatible con Google Docs)') },
  pdf: { mime: 'application/pdf', ext: 'pdf', label: () => T('Document PDF', 'Documento PDF') },
};

export async function saveFile(blob: Blob, name: string, kind: keyof typeof KINDS = 'docx'): Promise<boolean> {
  const k = KINDS[kind];
  if (inTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({ defaultPath: name, filters: [{ name: k.label(), extensions: [k.ext] }] });
    if (!path) return false;
    await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
    return true;
  }
  const w = window as unknown as { showSaveFilePicker?: (o: object) => Promise<FileSystemFileHandle> };
  if (w.showSaveFilePicker && window.self === window.top) {
    try {
      const handle = await w.showSaveFilePicker({ suggestedName: name, types: [{ description: k.label(), accept: { [k.mime]: [`.${k.ext}`] } }] });
      const stream = await handle.createWritable();
      await stream.write(blob);
      await stream.close();
      return true;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return false;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return true;
}

export async function openFile(): Promise<{ name: string; data: ArrayBuffer } | null> {
  if (inTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readFile } = await import('@tauri-apps/plugin-fs');
    const path = await open({ multiple: false, filters: [{ name: T('Documents', 'Documentos'), extensions: ['docx', 'html', 'htm', 'txt'] }] });
    if (!path || Array.isArray(path)) return null;
    const bytes = await readFile(path);
    return { name: path.split(/[\\/]/).pop() ?? 'document.docx', data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer };
  }
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.docx,.html,.htm,.txt';
    input.onchange = async () => {
      const f = input.files?.[0];
      resolve(f ? { name: f.name, data: await f.arrayBuffer() } : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
