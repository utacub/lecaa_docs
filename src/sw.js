// Offline support for the online edition. The build fills in VERSION and FILES (every file of the
// build except the voice runtime, which the app keeps in IndexedDB), so each deploy gets a new
// cache and removes the old one.
const VERSION = '__VERSION__';
const FILES = __FILES__;
// Only this app's caches: the pictogram test edition on the same site (utacub.github.io) has its own
// ('lecaa-pictos-proto-'), and neither deletes the other's.
const PREFIX = 'lecaa-docs-';
const CACHE = PREFIX + VERSION;
// Pictograms are kept across versions: they are downloaded once (as they are used, or all at once
// from the settings) and a new version of the app does not download them again.
const PICTOS = PREFIX + 'pictogrames';
const SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(SHELL);
    // The rest one by one, so a single failed file doesn't leave the app without offline support.
    await Promise.allSettled(FILES.map(f => c.add(f)));
    // The word indexes, so that the pictograms already seen also work offline after the first visit.
    await caches.open(PICTOS).then(p => Promise.allSettled(['ca', 'es', 'eu', 'gl', 'en', 'fr'].map(l => `./pictos/index-${l}.js`).map(f => p.add(f)))).catch(() => {});
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE && k !== PICTOS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

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
      }).catch(() => caches.match(e.request, { cacheName: PICTOS, ignoreSearch: true })));
      return;
    }
    // Images never change: cache first, and each one is kept the first time it is shown.
    e.respondWith(caches.open(PICTOS).then(c => c.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok) c.put(e.request, r.clone());
      return r;
    }))));
    return;
  }
  // Pages: network first, so a new version shows up as soon as it is published; cache when offline.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => {
      if (r.ok) caches.open(CACHE).then(c => c.put('./', r.clone()));
      return r;
    }).catch(() => caches.match('./', { cacheName: CACHE })));
    return;
  }
  // Everything else has a content hash in its name: cache first.
  e.respondWith(caches.match(e.request, { cacheName: CACHE, ignoreSearch: true }).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  })));
});
