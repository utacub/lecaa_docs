// Offline support for the online edition. The build fills in VERSION, FILES (every file of the
// build with its size, except the voice runtime, which the app keeps in IndexedDB when a Piper
// voice is downloaded) and INDEXES (the word indexes of the pictograms), so each deploy gets a new
// cache and removes the old ones.
const VERSION = '__VERSION__';
const FILES = __FILES__;
const INDEXES = __INDEXES__;
const SHELL_BYTES = __SHELL_BYTES__;
// Only this app's caches: other apps on the same site (utacub.github.io) keep their own, such as the
// 'lecaa-pictos-proto-' ones left by the pictogram test edition (removed on 29/10/2026), and are never deleted here.
const PREFIX = 'lecaa-docs-';
const CACHE = PREFIX + VERSION;
// Pictograms are kept across versions: they are downloaded once (as they are used, or all at once
// from the install dialog or the settings) and a new version of the app does not download them again.
const PICTOS = PREFIX + 'pictogrames';
const SHELL = ['./', './index.html'];

// Every file the app needs offline, with the cache it goes in and its size.
const ALL = [
  ...SHELL.map(f => ({ url: f, cache: CACHE, bytes: SHELL_BYTES })),
  ...FILES.map(([f, bytes]) => ({ url: f, cache: CACHE, bytes })),
  ...INDEXES.map(([f, bytes]) => ({ url: f, cache: PICTOS, bytes })),
];

// Downloads the files that are not in their cache yet, a few at a time, reporting the bytes that
// are already on the device. A single failed file doesn't stop the rest: they are counted, so the
// app can say so and offer to try again.
async function complete(onProgress) {
  const total = ALL.reduce((n, f) => n + f.bytes, 0);
  let loaded = 0, failed = 0;
  const todo = [];
  for (const f of ALL) {
    const c = await caches.open(f.cache);
    if (await c.match(f.url)) loaded += f.bytes; else todo.push(f);
  }
  onProgress?.(loaded, total);
  const worker = async () => {
    for (let f = todo.shift(); f; f = todo.shift()) {
      try {
        const r = await fetch(f.url, { cache: 'no-cache' });
        if (!r.ok) throw new Error(String(r.status));
        await (await caches.open(f.cache)).put(f.url, r);
      } catch { failed++; }
      loaded += f.bytes;
      onProgress?.(loaded, total);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return { total, failed };
}

self.addEventListener('install', e => {
  // Without the page the app cannot open offline: the browser then tries this version again later.
  e.waitUntil(complete()
    .then(() => caches.open(CACHE)).then(c => c.match('./'))
    .then(hit => { if (!hit) throw new Error('page not cached'); return self.skipWaiting(); }));
});

// The app asks how much of it is on the device ('status') and to download what is missing
// ('complete'), with the progress, for the install dialog. It answers through the port it sends.
self.addEventListener('message', e => {
  const port = e.ports[0];
  if (!port || !e.data) return;
  if (e.data.type === 'status') {
    e.waitUntil((async () => {
      let have = 0, total = 0;
      for (const f of ALL) {
        total += f.bytes;
        if (await (await caches.open(f.cache)).match(f.url)) have += f.bytes;
      }
      port.postMessage({ type: 'status', have, total, version: VERSION });
    })());
  } else if (e.data.type === 'complete') {
    e.waitUntil(complete((loaded, total) => port.postMessage({ type: 'progress', loaded, total }))
      .then(r => port.postMessage({ type: 'done', ...r }))
      .catch(() => port.postMessage({ type: 'done', total: 0, failed: 1 })));
  }
});

self.addEventListener('activate', e => {
  // The previous version is kept until the next one: a page that was open when this version arrived
  // still loads its own files (the export to PDF, the «Marc teòric»…) from it, also offline.
  e.waitUntil(caches.keys()
    .then(keys => {
      const old = keys.filter(k => k.startsWith(PREFIX) && k !== CACHE && k !== PICTOS);
      return Promise.all(old.slice(0, -1).map(k => caches.delete(k)));
    })
    .then(() => self.clients.claim()));
});

// A slow connection (a school wifi that is full) must not keep the app from opening: after a few
// seconds the page comes from the cache, and the network answer still updates it for next time.
const PAGE_TIMEOUT_MS = 4000;

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/piper/')) return;
  if (url.pathname.includes('/pictos/')) {
    // The large files with every pictogram are split by the app itself: not kept here as well.
    if (url.pathname.includes('/pictos/paquets/')) return;
    // The word index can change with a new pictogram pack: network first, cache when offline.
    if (url.pathname.endsWith('.js')) {
      e.respondWith(fetch(e.request).then(r => {
        if (r.ok) { const copy = r.clone(); caches.open(PICTOS).then(c => c.put(e.request, copy)); }
        return r;
      }).catch(() => caches.match(e.request, { cacheName: PICTOS })));
      return;
    }
    // Images never change: cache first, and each one is kept the first time it is shown. The lookup
    // is by the exact address: with ignoreSearch, Chromium reads every entry of the cache (about
    // 13,700 with all the pictograms saved), and each pictogram took over a second to appear.
    e.respondWith(caches.open(PICTOS).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok) c.put(e.request, r.clone());
      return r;
    }))));
    return;
  }
  // Pages: network first, so a new version shows up as soon as it is published; cache when offline
  // or when the network is too slow.
  if (e.request.mode === 'navigate') {
    const network = fetch(e.request).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./', copy)); }
      return r;
    });
    e.waitUntil(network.catch(() => undefined));
    const cached = () => caches.match('./', { cacheName: CACHE });
    const slow = new Promise(resolve => setTimeout(resolve, PAGE_TIMEOUT_MS)).then(cached);
    e.respondWith(Promise.race([network.catch(cached), slow.then(hit => hit || network)])
      .then(r => r || cached()).then(r => r || network));
    return;
  }
  // Everything else has a content hash in its name: cache first (this version's, then the previous
  // one's, for a page that is still running it).
  e.respondWith(caches.match(e.request, { cacheName: CACHE, ignoreSearch: true })
    .then(hit => hit || caches.keys().then(keys => {
      const old = keys.filter(k => k.startsWith(PREFIX) && k !== CACHE && k !== PICTOS).pop();
      return old ? caches.match(e.request, { cacheName: old }) : undefined;
    }))
    .then(hit => hit || fetch(e.request).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    })));
});
