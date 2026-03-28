// SYNCLOUDPOS Service Worker — Offline-first POS
const CACHE_NAME = 'syncloudpos-v1';

// App shell files to cache on install
const APP_SHELL = [
  '/',
  '/pos',
  '/favicon.ico',
  '/manifest.json',
];

// Install: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {
        // Some routes may fail (dynamic pages), that's OK
        console.log('[SW] Some app shell resources failed to cache');
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension, devtools, etc.
  if (!url.protocol.startsWith('http')) return;

  // API requests & Next.js data: Network-first
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/data/') ||
    url.pathname.includes('__nextjs')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses for offline fallback
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets (_next/static, images, fonts): Cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|webp|ico|json)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML pages: Network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/pos')))
  );
});
