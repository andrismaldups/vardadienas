const CACHE_NAME = "vardadienas-v15";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./name-days.json",
  "./icon-192.png",
  "./icon-512.png",
  "./clean-ds-1.1/legacy-layout.css",
  "./design-system.css",
  "./clean-ds-1.1/components.css",
  "./clean-ds-1.1/d3-theme.css",
  "./clean-ds-1.1/sea-mist-theme.css",
  "./clean-ds-1.1/cherry-theme.css",
  "./clean-ds-1.1/sun-theme.css",
  "./clean-ds-1.1/classic-theme.css",
  "./clean-ds-1.1/festive-theme.css?jewelry=10",
  "./assets/zelts-rings-light.webp",
  "./assets/zelts-rings-dark.webp",
  "./clean-ds-1.1/app-integration.css",
  "./clean-ds-1.1/about-row-gap.css",
  "./clean-ds-1.1/theme-bootstrap.js",
  "./assets/d3-rita-rasa.svg",
  "./assets/sea-mist-currents.svg",
  "./assets/cherry-corners.webp",
  "./assets/d3-rita-gaisma.svg",
  "./assets/gold-ornaments.svg?v=20261103-upper-glow14"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  // Ārējie API pieprasījumi nedrīkst atgriezt null no bezsaistes kešatmiņas.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          event.waitUntil(cache.put(event.request, response.clone()).catch(error => {
            console.warn("Neizdevās atjaunot kešatmiņu", error);
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
    })()
  );
});

self.addEventListener("push", event => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); }
  catch { payload = { body: event.data.text() }; }
  event.waitUntil(self.registration.showNotification(payload.title || "Vārdadienas", {
    body: payload.body || "Tev ir jauns atgādinājums.",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    data: { url: "./" }
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || "./"));
});
