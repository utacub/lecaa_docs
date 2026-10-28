// Pictograms in the saved documents (.docx and PDF), when they are shown on screen. Each word
// goes with its pictogram above it, as on screen, so the lines are laid out here: the text of a
// paragraph is cut into units (a word with what sticks to it, "casa,", or an expression with one
// pictogram, "pa amb tomàquet"), measured with the same fonts, and put in lines of the page
// width. docio.ts writes each line as a row of cells (picture above, word below) and pdf.ts as
// columns. The text stays text: it can be selected, read aloud and changed.

import type { JSONContent } from '@tiptap/core';
import { BASE_PT } from './docio';
import { fontByFamily, fontById } from './fonts';
import { pictosIn, pictosShown, pictoUrl } from './pictos';
import { settings } from './settings';

// A part of a text node of the document, with its marks.
export interface Piece { node: JSONContent; text: string }
export interface Unit {
  pieces: Piece[];
  id: number;     // pictogram, or 0
  word: string;   // the words of the pictogram, for its description
  size: number;   // largest letter size, in points
  picto: number;  // pictogram side, in points
  width: number;  // width of the unit (text or pictogram), in points
}
export interface Laid { lines: Unit[][]; images: JSONContent[]; gap: number; picto: number }

// Sizes in the document, in points: "1.5em" is relative to the text size of the documents.
export function pointsOf(fontSize: unknown, base: number): number {
  const m = /^([\d.]+)(em|px|pt)$/.exec(String(fontSize ?? ''));
  if (!m) return base;
  const v = parseFloat(m[1]);
  return m[2] === 'em' ? v * BASE_PT : m[2] === 'px' ? v * 0.75 : v;
}

interface Style { size: number; family: string; bold: boolean; italic: boolean }
function styleOf(node: JSONContent, base: number, bold: boolean): Style {
  const marks = node.marks ?? [];
  const attrs = marks.find(m => m.type === 'textStyle')?.attrs ?? {};
  const family = (attrs.fontFamily && fontByFamily(String(attrs.fontFamily))?.family) || fontById(settings.value.docFont).family;
  return { size: pointsOf(attrs.fontSize, base), family, bold: bold || marks.some(m => m.type === 'bold'), italic: marks.some(m => m.type === 'italic') };
}

// Widths come from the browser, with the fonts of the document (sizes in points, as pixels).
const ctx = document.createElement('canvas').getContext('2d')!;
const cssFont = (s: Style) => `${s.italic ? 'italic ' : ''}${s.bold ? 700 : 400} ${s.size}px '${s.family}', Verdana, sans-serif`;
const loadedFonts = new Set<string>();
async function measure(text: string, s: Style): Promise<number> {
  const font = cssFont(s);
  if (!loadedFonts.has(font)) {
    loadedFonts.add(font);
    await document.fonts.load(font, text).catch(() => []);
  }
  ctx.font = font;
  return ctx.measureText(text).width;
}

const SPACE = /[ \t ]/;

// Lays out a paragraph (its inline content) in lines no wider than `width` points. A list
// marker ("•", "2.") goes first, without a pictogram. Images inside the paragraph are returned
// apart, to go after it.
export async function layout(content: JSONContent[] = [], o: { base: number; bold?: boolean; width: number; marker?: string }): Promise<Laid> {
  const images: JSONContent[] = [];
  let text = '';
  const owner: JSONContent[] = [];  // the text node of each character
  const breaks = new Set<number>(); // line breaks (Shift+Enter), as offsets in the text
  for (const n of content) {
    if (n.type === 'text') { for (const ch of n.text ?? '') { text += ch; owner.push(n); } }
    else if (n.type === 'hardBreak') { breaks.add(text.length); text += ' '; owner.push(n); }
    else if (n.type === 'image') images.push(n);
  }
  const spans = pictosIn(text);
  const inSpan = (i: number) => spans.some(s => s.from < i && i < s.to - 1);

  // Units: runs of characters without spaces, except inside an expression; two pictograms in one
  // run ("casa/gos") make two units.
  const ranges: [number, number, boolean][] = []; // from, to, line break before
  let start = -1, brk = false;
  for (let i = 0; i <= text.length; i++) {
    const space = i === text.length || breaks.has(i) || (SPACE.test(text[i]) && !inSpan(i));
    if (space) {
      if (start >= 0) { ranges.push([start, i, brk]); brk = false; start = -1; }
      if (breaks.has(i)) brk = true;
    } else if (start < 0) start = i;
  }
  const units: (Unit & { brk: boolean })[] = [];
  const base: Style = { size: o.base, family: fontById(settings.value.docFont).family, bold: !!o.bold, italic: false };
  const make = async (pieces: Piece[], id: number, word: string, brk2: boolean) => {
    let w = 0, size = 0;
    for (const p of pieces) {
      const s = styleOf(p.node, o.base, !!o.bold);
      size = Math.max(size, s.size);
      w += await measure(p.text, s);
    }
    size ||= o.base;
    const picto = settings.value.pictos.size * size;
    // A little room, so that a word never wraps inside its cell when the reader's font is wider.
    units.push({ pieces, id, word, size, picto, width: Math.min(Math.max(w * 1.06 + 2, picto), o.width), brk: brk2 });
  };
  if (o.marker) await make([{ node: { type: 'text', text: o.marker }, text: o.marker }], 0, '', false);
  for (const [from, to, brk2] of ranges) {
    const inside = spans.filter(s => s.from < to && s.to > from);
    const cuts = [from, ...inside.slice(1).map(s => s.from), to];
    for (let k = 0; k < cuts.length - 1; k++) {
      const a = cuts[k], b = cuts[k + 1];
      const pieces: Piece[] = [];
      for (let i = a; i < b; i++) {
        const last = pieces[pieces.length - 1];
        if (last && last.node === owner[i]) last.text += text[i];
        else pieces.push({ node: owner[i], text: text[i] });
      }
      const span = inside[k];
      await make(pieces, span?.id ?? 0, span?.word ?? '', brk2 && k === 0);
    }
  }

  const gap = Math.max(await measure(' ', base), o.base * 0.25);
  const lines: Unit[][] = [];
  let line: Unit[] = [], used = 0;
  for (const u of units) {
    if (line.length && (u.brk || used + gap + u.width > o.width)) { lines.push(line); line = []; used = 0; }
    used += (line.length ? gap : 0) + u.width;
    line.push(u);
  }
  if (line.length) lines.push(line);
  return { lines, images, gap, picto: settings.value.pictos.size * o.base };
}

// ----- the pictures -----
const pngs = new Map<number, Promise<Uint8Array | null>>();
export function pictoPng(id: number): Promise<Uint8Array | null> {
  let p = pngs.get(id);
  if (!p) {
    p = fetch(new URL(pictoUrl(id), document.baseURI).href)
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then(b => new Uint8Array(b))
      .catch(() => null);
    pngs.set(id, p);
  }
  return p;
}

export async function pictoDataUrl(id: number): Promise<string | null> {
  const png = await pictoPng(id);
  if (!png) return null;
  let s = '';
  for (let i = 0; i < png.length; i += 0x8000) s += String.fromCharCode(...png.subarray(i, i + 0x8000));
  return 'data:image/png;base64,' + btoa(s);
}

// Whether the documents get pictograms: they must be on screen, and their pictures readable
// (they are not when the single file is opened from the disk: the browser does not let a page
// opened as a file read other files).
export type PictoExport = 'yes' | 'no' | 'unreadable';
export async function pictosForExport(doc: JSONContent): Promise<PictoExport> {
  if (!pictosShown()) return 'no';
  let first = 0;
  const visit = (n: JSONContent): boolean => {
    if (n.type === 'text' || n.type === 'hardBreak' || n.type === 'image') return false;
    if (n.content?.some(c => c.type === 'text')) {
      const t = n.content.map(c => (c.type === 'text' ? c.text ?? '' : ' ')).join('');
      first = pictosIn(t)[0]?.id ?? 0;
      if (first) return true;
    }
    return (n.content ?? []).some(visit);
  };
  visit(doc);
  if (!first) return 'yes';
  if (location.protocol === 'file:') return 'unreadable';
  return (await pictoPng(first)) ? 'yes' : 'unreadable';
}
