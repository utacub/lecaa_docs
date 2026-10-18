// Documents are always saved on the device. .docx is the exchange format: Google Docs,
// Word and LibreOffice open it, and Google Docs exports to it.
// Import: mammoth (docx → HTML, then sanitised). Export: the `docx` library.

import type { Editor, JSONContent } from '@tiptap/core';
import DOMPurify from 'dompurify';
import {
  AlignmentType, Document, HeadingLevel, ImageRun, LevelFormat, Packer, Paragraph, Table, TableCell, TableRow,
  TextRun, WidthType, type ParagraphChild,
} from 'docx';
import { fontByFamily, fontById } from './fonts';
import { BCP47, T } from './i18n';
import { settings } from './settings';
import { inTauri } from './speech/native';

const BASE_PT = 14; // body text size in exported documents
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

interface Ctx { orderedInstance: number }

function sizeHalfPoints(fontSize?: string): number | undefined {
  if (!fontSize) return undefined;
  const em = /([\d.]+)em/.exec(fontSize);
  if (em) return Math.round(parseFloat(em[1]) * BASE_PT * 2);
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

async function inlines(nodes: JSONContent[] = []): Promise<ParagraphChild[]> {
  const out: ParagraphChild[] = [];
  for (const n of nodes) {
    if (n.type === 'text') {
      const marks = n.marks ?? [];
      const has = (t: string) => marks.some(m => m.type === t);
      const style = marks.find(m => m.type === 'textStyle')?.attrs ?? {};
      out.push(new TextRun({
        text: n.text ?? '', bold: has('bold') || undefined, italics: has('italic') || undefined,
        underline: has('underline') ? {} : undefined, size: sizeHalfPoints(style.fontSize),
        font: style.fontFamily ? fontByFamily(String(style.fontFamily))?.family : undefined,
      }));
    } else if (n.type === 'hardBreak') {
      out.push(new TextRun({ text: '', break: 1 }));
    } else if (n.type === 'image') {
      const img = await imageRun(n.attrs ?? {});
      if (img) out.push(img);
    }
  }
  return out;
}

async function blocks(nodes: JSONContent[] = [], ctx: Ctx, list?: { kind: 'bullet' | 'ordered'; level: number; instance: number }): Promise<(Paragraph | Table)[]> {
  const out: (Paragraph | Table)[] = [];
  for (const n of nodes) {
    switch (n.type) {
      case 'paragraph':
      case 'heading': {
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
        for (const item of n.content ?? []) out.push(...await blocks(item.content, ctx, { kind, level, instance }));
        break;
      }
      case 'table': {
        const rows: TableRow[] = [];
        for (const r of n.content ?? []) {
          const cells: TableCell[] = [];
          for (const c of r.content ?? []) {
            const kids = await blocks(c.content, ctx);
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

export async function docxFromEditor(editor: Editor, title: string): Promise<Blob> {
  const json = editor.getJSON();
  const children = await blocks(json.content, { orderedInstance: 0 });
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
    sections: [{ children: children.length ? children : [new Paragraph('')] }],
  });
  return Packer.toBlob(doc);
}

// ---------- device files ----------

export function safeName(title: string) {
  return (title.trim() || T('Document sense títol', 'Documento sin título')).replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120);
}

export async function saveFile(blob: Blob, name: string): Promise<boolean> {
  if (inTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({ defaultPath: name, filters: [{ name: T('Document de Word (compatible amb Google Docs)', 'Documento de Word (compatible con Google Docs)'), extensions: ['docx'] }] });
    if (!path) return false;
    await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
    return true;
  }
  const w = window as unknown as { showSaveFilePicker?: (o: object) => Promise<FileSystemFileHandle> };
  if (w.showSaveFilePicker && window.self === window.top) {
    try {
      const handle = await w.showSaveFilePicker({ suggestedName: name, types: [{ description: T('Document .docx', 'Documento .docx'), accept: { [DOCX_MIME]: ['.docx'] } }] });
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
