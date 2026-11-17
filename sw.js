/* Ghar service worker — installability + offline fallback ONLY.
   Deliberately network-first for everything same-origin: a fresh
   deploy is always served when the network is up (this worker must
   never mask a new version), and the cache is only a safety net for
   offline repeat visits. Cross-origin requests (the Fly API, Google,
   Stripe, CDNs) and non-GET requests are never intercepted, so
   accounts, payments and live data always go straight to the network. */
const CACHE = "ghar-sw-v1";
const SHELL = ["/", "/index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const fresh = await fetch(e.request);
      if (fresh && fresh.ok) cache.put(e.request, fresh.clone());
      return fresh;
    } catch (err) {
      const hit = await cache.match(e.request);
      if (hit) return hit;
      if (e.request.mode === "navigate") {
        const home = await cache.match("/index.html");
        if (home) return home;
      }
      throw err;
    }
  })());
});
