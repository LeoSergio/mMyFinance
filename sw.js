// ==========================================
// SW.JS — Service Worker (PWA offline básico)
// ==========================================
const CACHE = "financeiro-v3.1";
const ASSETS = [
  "./index.html",
  "./src/styles/main.css",
  "./src/styles/media.css",
  "./src/js/main.js",
  "./src/js/core/state.js",
  "./src/js/core/storage.js",
  "./src/js/modules/ui.js",
  "./src/js/modules/dashboard.js",
  "./src/js/modules/theme.js",
  "./src/js/modules/drawer.js",
  "./src/js/modules/greeting.js",
  "./src/js/modules/chart.js",
  "./manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
