const CACHE_NAME = "portfolio-v18";
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
  "/offline.html"
];
const NAVIGATION_CACHE = "/index.html";
function isSuccessfulResponse(response) {
  return (
    response &&
    response.ok &&
    response.type === "basic"
  );
}
async function cacheResponse(request, response) {
  if (!isSuccessfulResponse(response)) {
    return;
  }
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}
self.addEventListener(
  "install",
  (event) => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then((cache) =>
          Promise.allSettled(
            PRECACHE.map(
              async (url) => {
                try {
                  await cache.add(
                    url
                  );
                } catch (error) {
                  console.warn(
                    `Failed to precache ${url}:`,
                    error
                  );
                }
              }
            )
          )
        )
        .then(() =>
          self.skipWaiting()
        )
    );
  }
);
self.addEventListener(
  "activate",
  (event) => {
    event.waitUntil(
      Promise.all([
        caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys
                .filter(
                  (key) =>
                    key !==
                    CACHE_NAME
                )
                .map((key) =>
                  caches.delete(
                    key
                  )
                )
            )
          ),
        self.registration.navigationPreload
          ? self.registration.navigationPreload.enable()
          : Promise.resolve()
      ]).then(() =>
        self.clients.claim()
      )
    );
  }
);
self.addEventListener(
  "fetch",
  (event) => {
    if (
      event.request.method !==
      "GET"
    ) {
      return;
    }
    const url =
      new URL(
        event.request.url
      );
    if (
      url.origin !==
      self.location.origin
    ) {
      return;
    }
    if (
      event.request.mode ===
      "navigate"
    ) {
      event.respondWith(
        handleNavigation(
          event
        )
      );
      return;
    }
    event.respondWith(
      handleStaticResource(
        event.request
      )
    );
  }
);
async function handleNavigation(
  event
) {
  const request =
    event.request;
  try {
    const preload =
      await event.preloadResponse;
    if (preload) {
      await cacheResponse(
        NAVIGATION_CACHE,
        preload
      );
      return preload;
    }
  } catch {}
  try {
    const response =
      await fetch(request);
    if (
      isSuccessfulResponse(
        response
      )
    ) {
      await cacheResponse(
        NAVIGATION_CACHE,
        response
      );
    }
    return response;
  } catch {}
  const cache =
    await caches.open(
      CACHE_NAME
    );
  const cachedRequest =
    await cache.match(
      request
    );
  if (cachedRequest) {
    return cachedRequest;
  }
  const cachedHome =
    await cache.match(
      NAVIGATION_CACHE
    );
  if (cachedHome) {
    return cachedHome;
  }
  const offline =
    await cache.match(
      "/offline.html"
    );
  if (offline) {
    return offline;
  }
  return new Response(
    "You are offline.",
    {
      status: 503,
      headers: {
        "Content-Type":
          "text/plain; charset=utf-8"
      }
    }
  );
}
async function handleStaticResource(
  request
) {
  const cache =
    await caches.open(
      CACHE_NAME
    );
  const cached =
    await cache.match(
      request
    );
  const networkFetch =
    fetch(request)
      .then(async (response) => {
        if (
          isSuccessfulResponse(
            response
          )
        ) {
          await cacheResponse(
            request,
            response
          );
        }
        return response;
      })
      .catch(() => null);
  if (cached) {
    eventRefresh(networkFetch);
    return cached;
  }
  const network =
    await networkFetch;
  if (network) {
    return network;
  }
  return new Response(
    "",
    {
      status: 504,
      statusText:
        "Gateway Timeout"
    }
  );
}
function eventRefresh(promise) {
  promise.catch(() => {});
}
