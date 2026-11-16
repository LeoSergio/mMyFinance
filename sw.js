// ==========================================
// SW.JS — Service Worker (PWA + Notificações)
// ==========================================
const CACHE = "financeiro-v10";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./src/assets/icon-192.png",
  "./src/assets/icon-512.png",
  "https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css",
];

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

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
  const isSameOrigin = url.origin === self.location.origin;
  const isBoxicons   = url.origin.includes("unpkg.com") && url.pathname.includes("boxicons");

  if (!isSameOrigin && !isBoxicons) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match(e.request));
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
