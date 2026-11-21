// Everything the online edition needs to work without a connection, on this device: the app itself
// (kept by the service worker, src/sw.js) and, if the person chooses it, all the ARASAAC pictograms
// (otherwise each one is kept the first time it is shown). The install dialog (install.ts) and the
// settings use it. The choice is the device's, not a language's: it is not in settings.ts.
// Piper voices are not part of it: each one is downloaded from the settings and kept in IndexedDB.

import { STORAGE } from './storage-name';
import { downloadAll, loadPictos, offlineCount, allPictoIds, offlineSupported as pictosOfflineSupported } from './pictos';
import { inTauri } from './speech/native';

export type Choice = 'app' | 'all';
const KEY = `${STORAGE}:sense-connexio`;

export function savedChoice(): Choice | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'app' || v === 'all' ? v : null;
  } catch { return null; }
}
export function saveChoice(c: Choice) {
  try { localStorage.setItem(KEY, c); } catch { /* private mode */ }
}

// Where the app can keep itself: the online edition, with a service worker. Not on localhost,
// where the app does not register it (main.ts), nor in the single file or the desktop app.
export const offlineAppSupported = !__SINGLE_FILE__ && !inTauri() && 'serviceWorker' in navigator
  && location.protocol.startsWith('http') && !location.hostname.match(/^(localhost|127\.)/);
export const pictosChoiceSupported = pictosOfflineSupported;

// Sizes in bytes, written by the build (vite.config.ts). Estimates if the file can't be read.
export interface Sizes { app: number; pictos: number }
const ESTIMATE: Sizes = { app: 20_000_000, pictos: 66_000_000 };
let sizesP: Promise<Sizes> | null = null;
export function sizes(): Promise<Sizes> {
  sizesP ??= fetch('./offline.json', { cache: 'no-cache' }).then(r => r.json())
    .then((s: Partial<Sizes>) => ({ app: s.app || ESTIMATE.app, pictos: s.pictos || ESTIMATE.pictos }))
    .catch(() => { sizesP = null; return ESTIMATE; });
  return sizesP;
}

// The service worker, once it is running. On the first visit it is still downloading the app.
async function worker(timeoutMs = 20_000): Promise<ServiceWorker | null> {
  if (!offlineAppSupported) return null;
  const reg = await navigator.serviceWorker.getRegistration().catch(() => undefined);
  if (!reg) return null;
  const ready = await Promise.race([navigator.serviceWorker.ready, new Promise<null>(r => setTimeout(() => r(null), timeoutMs))]);
  return ready?.active ?? null;
}

type Reply = { type: 'status'; have: number; total: number } | { type: 'progress'; loaded: number; total: number } | { type: 'done'; total: number; failed: number };
function ask<T extends Reply['type']>(sw: ServiceWorker, type: 'status' | 'complete', until: T, onMessage?: (m: Reply) => void): Promise<Extract<Reply, { type: T }>> {
  return new Promise(resolve => {
    const ch = new MessageChannel();
    ch.port1.onmessage = e => {
      const m = e.data as Reply;
      onMessage?.(m);
      if (m.type === until) { ch.port1.close(); resolve(m as Extract<Reply, { type: T }>); }
    };
    sw.postMessage({ type }, [ch.port2]);
  });
}

export interface Status { appHave: number; appTotal: number; pictosHave: number; pictosTotal: number; sizes: Sizes }

// What is already on the device: the app in bytes, the pictograms in number of pictograms.
export async function status(): Promise<Status> {
  const sz = await sizes();
  const sw = await worker(3000);
  const app = sw ? await ask(sw, 'status', 'status') : { have: 0, total: sz.app };
  let pictosHave = 0, pictosTotal = 0;
  if (pictosChoiceSupported && await loadPictos()) {
    pictosTotal = allPictoIds().length;
    pictosHave = await offlineCount();
  }
  return { appHave: app.have, appTotal: app.total || sz.app, pictosHave, pictosTotal, sizes: sz };
}

// Bytes still to download for a choice.
export function missingBytes(s: Status, c: Choice): number {
  const app = Math.max(0, s.appTotal - s.appHave);
  const pictos = c === 'all' && s.pictosTotal ? s.sizes.pictos * (1 - s.pictosHave / s.pictosTotal) : 0;
  return app + pictos;
}

// Room left for this site, as the browser counts it (not the whole disk). null when unknown.
export async function freeSpace(): Promise<number | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    return e?.quota ? Math.max(0, e.quota - (e.usage ?? 0)) : null;
  } catch { return null; }
}

export class OfflineError extends Error {}

// Downloads what is missing for the choice, with the progress in bytes over the whole choice
// (what is already on the device counts as done). Throws OfflineError when something failed.
export async function prepare(c: Choice, onProgress: (loaded: number, total: number) => void, signal: AbortSignal): Promise<void> {
  // Asks the browser not to delete it all when the device is short of space.
  await navigator.storage?.persist?.().catch(() => false);
  const sz = await sizes();
  const pictoBytes = c === 'all' && pictosChoiceSupported ? sz.pictos : 0;
  let app = { loaded: 0, total: sz.app }, pictos = 0;
  const report = () => onProgress(Math.min(app.loaded + pictos, app.total + pictoBytes), app.total + pictoBytes);
  report();
  const sw = await worker();
  if (sw) {
    const done = await ask(sw, 'complete', 'done', m => {
      if (m.type === 'progress') { app = { loaded: m.loaded, total: m.total }; report(); }
    });
    if (done.failed) throw new OfflineError(`app: ${done.failed}`);
  } else {
    app.loaded = app.total;
  }
  if (signal.aborted) return;
  report();
  if (pictoBytes) {
    if (!await loadPictos()) throw new OfflineError('pictos index');
    let failed = 0;
    try {
      ({ failed } = await downloadAll((done, total) => { pictos = total ? pictoBytes * done / total : 0; report(); }, signal));
    } catch (e) {
      if (signal.aborted) return;
      throw new OfflineError(String(e));
    }
    if (failed) throw new OfflineError(`pictos: ${failed}`);
  }
}

// When the app opens with a connection: finishes, without asking, what an earlier download left
// halfway (the connection dropped, the app was closed) and the pictograms of a new pack.
export async function resume() {
  const c = savedChoice();
  if (!c || !offlineAppSupported || !navigator.onLine) return;
  try {
    const s = await status();
    if (missingBytes(s, c) > 0) await prepare(c, () => {}, new AbortController().signal);
  } catch { /* it tries again next time */ }
}
