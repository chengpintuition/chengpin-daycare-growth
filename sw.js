const CACHE_NAME = "chengpin-growth-v6";
const APP_ROOT = new URL("./", self.location.href).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil(fetch(APP_ROOT, { cache: "reload" }).then(async (response) => {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(APP_ROOT, response);
  }));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  const request = event.request.mode === "navigate"
    ? new Request(event.request, { cache: "no-store" })
    : new Request(event.request, { cache: "no-cache" });
  event.respondWith(fetch(request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    if (event.request.mode === "navigate") return caches.match(APP_ROOT);
    return Response.error();
  }));
});

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data?.json() ?? {}; } catch { payload = {}; }
  event.waitUntil(self.registration.showNotification("有新的托育记录", {
    body: "打开承品托育成长记录查看最新内容。",
    icon: `${APP_ROOT}icons/app-icon-192.png`,
    badge: `${APP_ROOT}icons/app-icon-192.png`,
    tag: payload.recordId ? `record-${payload.recordId}` : "family-record",
    renotify: false,
    data: { url: payload.url || APP_ROOT, recordId: payload.recordId || null }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || APP_ROOT, self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => client.url.startsWith(self.location.origin));
    return existing ? existing.focus().then(() => existing.navigate(target)) : self.clients.openWindow(target);
  }));
});
