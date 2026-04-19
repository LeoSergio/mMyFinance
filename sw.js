// ==========================================
// SW.JS — Service Worker (PWA offline básico)
// ==========================================
const CACHE = "financeiro-v2";

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
  "./src/assets/icon-192.png",
  "./src/assets/icon-512.png",
];

// Instala e cacheia apenas os arquivos locais
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Remove caches antigos
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Estratégia: Cache first para arquivos locais, Network only para externos (CDN)
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Recursos externos (unpkg, fonts, etc) — sempre busca da rede, sem cache
  if (!url.origin.includes(self.location.origin)) {
    e.respondWith(fetch(e.request).catch(() => new Response("")));
    return;
  }

  // Recursos locais — Cache first, fallback para rede
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        // Cacheia a resposta nova para próximas visitas
        const clone = response.clone();
        caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        return response;
      });
    })
  );
});