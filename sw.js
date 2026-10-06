/* Calorie Tracker service worker.
 * Cache-first app shell, fully offline. Bump CACHE_VERSION whenever index.html
 * (or any other shell file) changes so clients pick up the new version and old
 * caches are removed. Paths are relative, so the app works from any subpath.
 */
const CACHE_VERSION = 'v1.3.0';
const CACHE_PREFIX = 'calorie-tracker-shell-';
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL.map((p) => new Request(p, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations (incl. ?query / #hash routes): serve the cached shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html', { ignoreSearch: true })
        .then((cached) => cached || fetch(req))
        .catch(() => caches.match('./'))
    );
    return;
  }

  // Everything else: cache first, then network (caching same-origin successes).
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
