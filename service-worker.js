/* DESIGN TEST only: independent offline cache; no push listeners. */
const CACHE_NAME = "vardadienas-design-test-v2";
const CACHE_PREFIX = "vardadienas-design-test-";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./design-system.css",
  "./manifest.json",
  "./design-test-icon-192.png",
  "./design-test-icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        event.waitUntil(cache.put(event.request, response.clone()).catch(error => {
          console.warn("DESIGN TEST cache update failed:", error);
        }));
      }
      return response;
    } catch (error) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return new Response("Nav interneta savienojuma", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  })());
});

/* No push/notificationclick handlers in DESIGN TEST. */
