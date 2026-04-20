// ==========================================
// SW.JS — Service Worker (PWA + Notificações)
// ==========================================
const CACHE = "financeiro-v3";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./src/styles/main.css",
  "./src/styles/media.css",
  "./src/js/main.js",
  "./src/js/core/state.js",
  "./src/js/core/storage.js",
  "./src/js/modules/ui.js",
  "./src/js/modules/dashboard.js",
  "./src/js/modules/chart.js",
  "./src/js/modules/toast.js",
  "./src/js/modules/export.js",
  "./src/js/modules/theme.js",
  "./src/js/modules/drawer.js",
  "./src/js/modules/greeting.js",
  "./src/js/modules/reminder.js",
  "./src/assets/icon-192.png",
  "./src/assets/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  if (url.origin !== self.location.origin) {
    e.respondWith(fetch(e.request).catch(() => new Response("")));
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        return response;
      });
    })
  );
});

// ── Clique na notificação ─────────────────────────────────────────
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  if (e.action === "ok") return;

  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if (client.url.includes("index.html") && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow("./index.html");
      })
  );
});
