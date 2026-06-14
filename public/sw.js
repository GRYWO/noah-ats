// Noah ATS - Service Worker
// Verzorgt:
// 1. PWA install (precache van shell + offline-pagina)
// 2. Fetch-strategieen per route-type
// 3. Web Push notificaties (mail, nieuwe kandidaat, etc.)
// 4. Notification-click opent juiste pagina
//
// LET OP: bump CACHE-naam bij elke release waar PWA-assets veranderen
// (icons, manifest, sw.js zelf). De oude cache wordt dan automatisch
// opgeruimd in het activate-event.

const CACHE = "noah-v3";
const PRECACHE_URLS = [
  "/offline",
  "/manifest.json",
  "/icon-192.svg",
  "/icon-512.svg",
  "/icon-maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Helpers
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const netPromise = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => null);
  return cached || (await netPromise) || new Response("", { status: 504 });
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
    return res;
  } catch (_) {
    return new Response("", { status: 504 });
  }
}

// Navigation-requests: cache uitsluitend publieke routes (whitelist).
// Auth-protected pages mogen nooit in de SW-cache komen, want dat zou
// tot data-lekken tussen sessies kunnen leiden.
const NAV_CACHE_WHITELIST = ["/offline"];

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    const url = new URL(request.url);
    if (NAV_CACHE_WHITELIST.includes(url.pathname)) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (_) {
    const cache = await caches.open(CACHE);
    const offline = await cache.match("/offline");
    return offline || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 1) API: altijd network-only (geen cache)
  if (url.pathname.startsWith("/api/")) return;

  // 2) Next.js statische assets: cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // 3) Navigatie-requests: network-first met offline-fallback
  if (req.mode === "navigate") {
    event.respondWith(networkFirstNavigation(req));
    return;
  }

  // 4) Overige GETs: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req));
});

// ===== Web Push =====
self.addEventListener("push", (e) => {
  let data = {
    title: "Noah ATS",
    body: "Nieuwe melding",
    url: "/inbox",
    tag: "noah-generic",
  };
  try {
    if (e.data) data = { ...data, ...e.data.json() };
  } catch (_) {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.svg",
      badge: "/icon-192.svg",
      tag: data.tag,
      data: { url: data.url },
      vibrate: [120, 60, 120],
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/inbox";
  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsList) => {
        const target = new URL(url, self.location.origin).pathname;
        const matchClient = clientsList.find((c) => {
          const p = new URL(c.url).pathname;
          return p === target || p.startsWith(target + "/");
        });
        if (matchClient && "focus" in matchClient) return matchClient.focus();
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
  );
});
