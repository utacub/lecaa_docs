// The documents written in this browser/app (IndexedDB, with localStorage fallback). Nothing
// leaves the device. Each document is kept under its own id; the one open now is remembered in
// localStorage. The document of versions up to 0.5.0 keeps its id, 'current', so it shows up in the
// list without any change.

import { STORAGE } from './storage-name';

export interface SavedDoc { title: string; content: object; updated: number; created?: number }
export interface DocEntry extends SavedDoc { id: string }

const DB = STORAGE;
const STORE = 'docs';
export const FIRST_ID = 'current';
const OPEN_KEY = `${STORAGE}:open-doc`;
const FALLBACK_KEY = `${STORAGE}:doc`;

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Without IndexedDB (some private windows) only one document can be kept.
let single = false;
export const keepsSeveral = () => !single;

export function openDocId(): string {
  try { return localStorage.getItem(OPEN_KEY) || FIRST_ID; } catch { return FIRST_ID; }
}
export function setOpenDocId(id: string) {
  try { localStorage.setItem(OPEN_KEY, id); } catch { /* private mode: this session only */ }
}
export const newDocId = () => `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export async function loadDoc(id = openDocId()): Promise<SavedDoc | null> {
  try {
    const d = await db();
    return await new Promise(resolve => {
      const r = d.transaction(STORE).objectStore(STORE).get(id);
      r.onsuccess = () => resolve((r.result as SavedDoc) ?? null);
      r.onerror = () => resolve(null);
    });
  } catch {
    single = true;
    try { return JSON.parse(localStorage.getItem(FALLBACK_KEY) || 'null'); } catch { return null; }
  }
}

export async function storeDoc(doc: SavedDoc, id = openDocId()): Promise<boolean> {
  try {
    const d = await db();
    return await new Promise(resolve => {
      const tx = d.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(doc, id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    single = true;
    try { localStorage.setItem(FALLBACK_KEY, JSON.stringify(doc)); return true; } catch { return false; }
  }
}

// Every document on the device, the last changed first.
export async function listDocs(): Promise<DocEntry[]> {
  try {
    const d = await db();
    const out = await new Promise<DocEntry[]>(resolve => {
      const list: DocEntry[] = [];
      const r = d.transaction(STORE).objectStore(STORE).openCursor();
      r.onsuccess = () => {
        const c = r.result;
        if (!c) { resolve(list); return; }
        list.push({ ...(c.value as SavedDoc), id: String(c.key) });
        c.continue();
      };
      r.onerror = () => resolve(list);
    });
    return out.sort((a, b) => b.updated - a.updated);
  } catch {
    single = true;
    const doc = await loadDoc();
    return doc ? [{ ...doc, id: openDocId() }] : [];
  }
}

export async function deleteDoc(id: string): Promise<boolean> {
  try {
    const d = await db();
    return await new Promise(resolve => {
      const tx = d.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    try { localStorage.removeItem(FALLBACK_KEY); return true; } catch { return false; }
  }
}
