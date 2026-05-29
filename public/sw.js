// Noah ATS — Service Worker
// Verzorgt:
// 1. PWA install (cache van shell)
// 2. Web Push notificaties (mail, nieuwe kandidaat, etc.)
// 3. Notification-click → opent juiste pagina

// LET OP: bump dit nummer bij elke release waar PWA-assets veranderen (icons,
// manifest, sw.js zelf). De oude cache wordt dan automatisch opgeruimd in activate.
const CACHE = "noah-shell-v2";
const SHELL = ["/dashboard", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
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

// Network-first met cache fallback voor navigatie
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.mode !== "navigate") return;
  if (url.pathname.startsWith("/api/")) return; // API nooit cachen
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request).then((r) => r || caches.match("/dashboard")))
  );
});

// ===== Web Push =====
self.addEventListener("push", (e) => {
  let data = { title: "Noah ATS", body: "Nieuwe melding", url: "/dashboard", tag: "noah-generic" };
  try {
    if (e.data) data = { ...data, ...e.data.json() };
  } catch (_) {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag,
      data: { url: data.url },
      vibrate: [120, 60, 120],
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/dashboard";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
