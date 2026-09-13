const CACHE_NAME = "portfolio-v11";
const PRECACHE = [
 "/",
 "/index.html",
 "/style.css",
 "/script.js",
 "/theme.js",
 "/translations.js",
 "/manifest.json",
 "/favicon.svg",
 "/images/apple-touch-icon.png",
 "/images/icon-192.png",
 "/images/icon-512.png",
 "/images/IMG_2358_Original.jpeg",
 "/offline.html"
];

self.addEventListener("install", (event) => {
 event.waitUntil(
   caches.open(CACHE_NAME)
     .then((cache) =>
       Promise.allSettled(
         PRECACHE.map((url) =>
           cache.add(url).catch((err) => console.warn(`Failed to precache ${url}:`, err))
         )
       )
     )
     .then(() => self.skipWaiting())
 );
});

self.addEventListener("activate", (event) => {
 event.waitUntil(
   caches.keys().then((keys) =>
     Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
   ).then(() => self.clients.claim())
 );
});

self.addEventListener("fetch", (event) => {
 if (event.request.method !== "GET") return;
 const url = new URL(event.request.url);
 if (url.origin !== self.location.origin) return;

 if (event.request.mode === "navigate") {
   // FIX: only the actual "/" or "/index.html" request may overwrite the
   // cached "/index.html" entry. Previously ANY navigation (including a
   // mistyped or removed path, which GitHub Pages answers with 404.html
   // content) was cached under the "/index.html" key, silently replacing
   // the real homepage in the offline cache with a 404 page. We now cache
   // each navigation under its own request, and only update the "/index.html"
   // alias when the URL genuinely is the homepage. We also skip caching
   // non-OK responses (e.g. 404s) entirely.
   const isHome = url.pathname === "/" || url.pathname === "/index.html";
   event.respondWith(
     fetch(event.request)
       .then((response) => {
         if (response.ok) {
           const copy = response.clone();
           caches.open(CACHE_NAME).then((cache) =>
             cache.put(isHome ? "/index.html" : event.request, copy)
           );
         }
         return response;
       })
       .catch(() =>
         caches.match(event.request)
           .then((resp) => resp || caches.match("/index.html"))
           .then((resp) => resp || caches.match("/offline.html"))
       )
   );
   return;
 }

 event.respondWith(
   caches.match(event.request).then((cached) => {
     const networkFetch = fetch(event.request)
       .then((response) => {
         if (response.ok) {
           const copy = response.clone();
           caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
         }
         return response;
       })
       .catch(() => cached);
     return cached || networkFetch;
   })
 );
});
