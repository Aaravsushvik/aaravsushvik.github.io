const CACHE_NAME = 'portfolio-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/theme.js',
  '/translations.js',
  '/manifest.json',
  '/favicon.ico',
  '/images/favicon.svg',
  '/images/apple-touch-icon.png',
  '/images/icon-192.png',
  '/images/icon-512.png',
  // Add hero images if you want offline display
  '/images/hero-320.jpeg',
  '/images/hero-480.jpeg',
  '/images/hero-768.jpeg',
  '/images/hero-1024.jpeg',
  '/images/hero-320.webp',
  '/images/hero-480.webp',
  '/images/hero-768.webp',
  '/images/hero-1024.webp',
  '/images/hero-320.avif',
  '/images/hero-480.avif',
  '/images/hero-768.avif',
  '/images/hero-1024.avif',
  '/images/og-card.jpg'
];

// Install event: cache all critical resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: serve from cache, fallback to network, handle offline navigation
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          // Optionally cache successful responses for later
          if (networkResponse.ok && event.request.url.startsWith(self.location.origin)) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // If offline and request is a navigation, serve cached index.html
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          // Otherwise return a simple offline fallback
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});