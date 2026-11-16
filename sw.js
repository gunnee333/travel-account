/* Travel Account app-shell service worker. No Firebase/API responses are cached. */
const CACHE = 'travel-account-shell-v1';
const SCOPE = new URL(self.registration.scope);
const OFFLINE = new URL('offline.html', SCOPE).pathname;
const SHELL = [new URL('offline.html', SCOPE).pathname, new URL('icons/icon-192.png', SCOPE).pathname, new URL('icons/icon-512.png', SCOPE).pathname];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('travel-account-shell-') && key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.cache === 'no-store') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  // Navigation is network-first; offline displays only a static notice, never stale private data.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE)) || Response.error()));
    return;
  }
  // Cache only versioned Vite assets; do not cache user data, Firebase traffic, or HTML.
  if (!url.pathname.startsWith(new URL('assets/', SCOPE).pathname) || !/\.(?:js|css|woff2?|png|svg|webp)$/.test(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(request);
    if (hit) return hit;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
    return response;
  })());
});
