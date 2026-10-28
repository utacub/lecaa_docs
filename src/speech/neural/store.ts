// Downloaded voice files live in IndexedDB, so Piper voices keep working without a connection.
// IndexedDB (unlike Cache Storage) also works in the single-file edition opened from file://.

import { STORAGE } from '../../storage-name';

const DB = `${STORAGE}-veus`;
const STORE = 'files';

let dbp: Promise<IDBDatabase> | null = null;
function db() {
  dbp ??= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return dbp;
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(d => new Promise<T>((resolve, reject) => {
    const req = run(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

export const fileStore = {
  get: (key: string) => tx<Blob | undefined>('readonly', s => s.get(key)).catch(() => undefined),
  put: (key: string, blob: Blob) => tx('readwrite', s => s.put(blob, key)),
  delete: (key: string) => tx('readwrite', s => s.delete(key)).catch(() => undefined),
  keys: () => tx<IDBValidKey[]>('readonly', s => s.getAllKeys()).then(k => k.map(String)).catch(() => [] as string[]),
};

export type Progress = (loaded: number, total: number) => void;

// Fetches the first URL that answers, reporting progress as the body arrives.
export async function download(urls: string[], onProgress?: Progress, signal?: AbortSignal): Promise<Blob> {
  let last: unknown = null;
  for (const url of urls) {
    try {
      const r = await fetch(url, { signal });
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      const total = Number(r.headers.get('Content-Length') ?? 0);
      if (!r.body || !onProgress) return await r.blob();
      const reader = r.body.getReader();
      const parts: BlobPart[] = [];
      let loaded = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value as Uint8Array<ArrayBuffer>);
        loaded += value.length;
        onProgress(loaded, total);
      }
      return new Blob(parts);
    } catch (e) {
      if (signal?.aborted) throw e;
      last = e;
    }
  }
  throw last ?? new Error('download failed');
}

// A stored file, downloading and storing it first if needed.
export async function cached(key: string, urls: string[], onProgress?: Progress): Promise<Blob> {
  const hit = await fileStore.get(key);
  if (hit) return hit;
  const blob = await download(urls, onProgress);
  await fileStore.put(key, blob).catch(() => { /* quota: still usable this session */ });
  return blob;
}
