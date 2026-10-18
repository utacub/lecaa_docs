// Autosave of the open document in this browser/app (IndexedDB, with localStorage fallback).
// Nothing leaves the device.

export interface SavedDoc { title: string; content: object; updated: number }

const DB = 'lecaa-docs';
const STORE = 'docs';
const KEY = 'current';

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadDoc(): Promise<SavedDoc | null> {
  try {
    const d = await db();
    return await new Promise(resolve => {
      const r = d.transaction(STORE).objectStore(STORE).get(KEY);
      r.onsuccess = () => resolve((r.result as SavedDoc) ?? null);
      r.onerror = () => resolve(null);
    });
  } catch {
    try { return JSON.parse(localStorage.getItem('lecaa-docs:doc') || 'null'); } catch { return null; }
  }
}

export async function storeDoc(doc: SavedDoc): Promise<boolean> {
  try {
    const d = await db();
    return await new Promise(resolve => {
      const tx = d.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(doc, KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    try { localStorage.setItem('lecaa-docs:doc', JSON.stringify(doc)); return true; } catch { return false; }
  }
}
