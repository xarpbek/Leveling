/* LEVELING — Service Worker
 * Strategy:
 *   - App files (HTML/CSS/JS/icons): network-first, fall back to cache (so updates ship fast).
 *   - Third-party libs + fonts (Chart.js, Google Fonts): cache-first (rarely change, work offline).
 *   - Offline fallback to cached index.html for navigations.
 */
const VERSION = 'leveling-v1.0.0';
const APP_CACHE = `app-${VERSION}`;
const LIB_CACHE = `lib-${VERSION}`;

// Relative URLs so it works under GitHub Pages project path (/leveling/).
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './js/i18n.js',
  './js/data.js',
  './js/audio.js',
  './js/confetti.js',
  './js/charts.js',
  './js/gamification.js',
  './js/ui.js',
  './js/core.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== APP_CACHE && k !== LIB_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isLib(url) {
  return (
    url.origin.includes('cdn.jsdelivr.net') ||
    url.origin.includes('fonts.googleapis.com') ||
    url.origin.includes('fonts.gstatic.com') ||
    url.origin.includes('unpkg.com')
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Cache-first for libraries & fonts
  if (isLib(url)) {
    event.respondWith(
      caches.open(LIB_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        } catch (e) {
          return hit || Response.error();
        }
      })
    );
    return;
  }

  // Only handle same-origin app requests beyond this point
  if (url.origin !== self.location.origin) return;

  // Network-first for app files
  event.respondWith(
    caches.open(APP_CACHE).then(async (cache) => {
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch (e) {
        const hit = await cache.match(req);
        if (hit) return hit;
        if (req.mode === 'navigate') {
          const fallback = await cache.match('./index.html');
          if (fallback) return fallback;
        }
        return Response.error();
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
