// "My documents": every text written on this device, with the day it was started and the last
// change, so that the learner (and the teacher) can go back to it and see how the writing grows.
// Opening a file from the device (.docx, .html, .txt) adds it here as a new document.

import type { JSONContent } from '@tiptap/core';
import { FilePlus, FolderOpen, Trash2, X } from 'lucide';
import { BCP47, T } from './i18n';
import { listDocs, type DocEntry } from './storage';
import { h, icon } from './ui';

export interface DocumentActions {
  current: () => string;               // id of the open document
  open: (id: string) => Promise<void>;
  create: () => Promise<void>;
  importFile: () => Promise<void>;
  remove: (id: string) => Promise<void>;
}

// The first words of a document, to recognise it in the list.
export function firstWords(content: JSONContent | undefined, max = 110): string {
  let out = '';
  const walk = (n: JSONContent) => {
    if (out.length > max) return;
    if (n.type === 'text') out += n.text ?? '';
    for (const c of n.content ?? []) walk(c);
    if (n.type === 'paragraph' || n.type === 'heading' || n.type === 'listItem' || n.type === 'tableCell') out += ' ';
  };
  if (content) walk(content);
  out = out.replace(/\s+/g, ' ').trim();
  return out.length > max ? out.slice(0, max).replace(/\s+\S*$/, '') + '…' : out;
}

const day = new Intl.DateTimeFormat(BCP47, { dateStyle: 'medium' });
const moment = new Intl.DateTimeFormat(BCP47, { dateStyle: 'medium', timeStyle: 'short' });

export function openDocuments(actions: DocumentActions, onClose: () => void): void {
  const list = h('ul', { class: 'docs-list' });
  const close = () => dlg.close();

  const row = (d: DocEntry) => {
    const isOpen = d.id === actions.current();
    const name = d.title.trim() || T('Document sense títol', 'Documento sin título');
    const words = firstWords(d.content as JSONContent);
    const openBtn = h('button', { class: 'docs-open', type: 'button', 'aria-current': isOpen ? 'true' : null, onclick: async () => { close(); await actions.open(d.id); } },
      h('span', { class: 'docs-name' }, name, isOpen ? h('span', { class: 'tag' }, T('Obert ara', 'Abierto ahora')) : null),
      h('span', { class: 'docs-dates' }, T('Començat: {inici} · Últim canvi: {canvi}', 'Empezado: {inici} · Último cambio: {canvi}', {
        inici: day.format(d.created ?? d.updated), canvi: moment.format(d.updated),
      })),
      words ? h('span', { class: 'docs-words' }, words) : null);
    const delBtn = h('button', {
      class: 'tb docs-delete', type: 'button',
      title: T('Esborra «{titol}»', 'Borrar «{titol}»', { titol: name }), 'aria-label': T('Esborra «{titol}»', 'Borrar «{titol}»', { titol: name }),
      onclick: async () => {
        if (!confirm(T('Vols esborrar «{titol}» d’aquest dispositiu? No es podrà recuperar.', '¿Quieres borrar «{titol}» de este dispositivo? No se podrá recuperar.', { titol: name }))) return;
        await actions.remove(d.id);
        await render();
        (list.querySelector('.docs-open') as HTMLButtonElement | null)?.focus();
      },
    }, icon(Trash2));
    return h('li', {}, openBtn, delBtn);
  };

  const render = async () => {
    const docs = await listDocs();
    list.replaceChildren(...(docs.length ? docs.map(row) : [h('li', { class: 'docs-empty' }, T('Encara no hi ha cap document desat.', 'Todavía no hay ningún documento guardado.'))]));
  };

  const dlg = h('dialog', { class: 'about docs', 'aria-labelledby': 'docs-title' },
    h('header', {},
      h('h2', { id: 'docs-title' }, T('Els meus documents', 'Mis documentos')),
      h('button', { class: 'tb', type: 'button', 'aria-label': T('Tanca', 'Cerrar'), onclick: close }, icon(X))),
    h('div', { class: 'body' },
      h('div', { class: 'row docs-actions' },
        h('button', { class: 'small-btn primary', type: 'button', onclick: async () => { close(); await actions.create(); } }, icon(FilePlus), T('Document nou', 'Documento nuevo')),
        h('button', { class: 'small-btn', type: 'button', onclick: async () => { close(); await actions.importFile(); } }, icon(FolderOpen), T('Obre un fitxer del dispositiu', 'Abrir un archivo del dispositivo'))),
      h('p', { class: 'hint' }, T('Tots els documents es desen sols en aquest dispositiu, amb el dia que es van començar i l’últim canvi.', 'Todos los documentos se guardan solos en este dispositivo, con el día en que se empezaron y el último cambio.')),
      list));

  dlg.addEventListener('close', () => { dlg.remove(); onClose(); });
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  document.body.append(dlg);
  dlg.showModal();
  void render().then(() => ((list.querySelector('[aria-current="true"]') ?? list.querySelector('.docs-open') ?? dlg.querySelector('button')) as HTMLElement | null)?.focus());
}
