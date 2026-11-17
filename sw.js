/*
 * ShelfFinder offline helper (service worker).
 * Network first: when online you always get the newest version of the app; the copy saved here is
 * only used when the network fails (e.g. weak Wi-Fi in the stacks). Only this site's own files are
 * saved. Catalog look-ups (the Google Apps Script proxy) and CDN libraries are never cached.
 * Bump VERSION to clear old saved copies.
 */
const VERSION = 'shelffinder-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png', './icons/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return; // leave the catalog proxy and CDNs alone
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' })
        .then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
        .then((hit) => hit || new Response('Offline', { status: 503, statusText: 'Offline' })))
  );
});
