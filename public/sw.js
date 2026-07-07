/* Verbum Quiz — Service Worker
 * Estratégia:
 *  - Páginas (navegações): network-first com fallback para o cache
 *    -> o modo solo funciona offline após a primeira visita.
 *  - Assets estáticos (/_next/static, ícones, fontes): cache-first.
 *  - Chamadas ao Supabase nunca são cacheadas (multiplayer exige conexão).
 */
const CACHE = "verbum-quiz-v2";
const PRECACHE_URLS = ["/", "/solo", "/solo/jogar", "/amigos", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Nunca interceptar Supabase (realtime/REST) nem outras origens de API
  if (url.hostname.endsWith(".supabase.co")) return;

  // Navegações: network-first, cache de reserva (offline)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  // Assets estáticos da mesma origem + Google Fonts: cache-first
  const isStatic =
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname === "/manifest.webmanifest");
  const isFont =
    url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";

  if (isStatic || isFont) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
  }
});
