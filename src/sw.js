// Offline support for the online edition. The build fills in VERSION and FILES (every file of the
// build except the voice runtime, which the app keeps in IndexedDB), so each deploy gets a new
// cache and removes the old one.
const VERSION = '__VERSION__';
const FILES = __FILES__;
const CACHE = 'lecaa-docs-' + VERSION;
const SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(SHELL);
    // The rest one by one, so a single failed file doesn't leave the app without offline support.
    await Promise.allSettled(FILES.map(f => c.add(f)));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('lecaa-docs-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/piper/')) return;
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
