/*
 * Offline support. When online, always fetch the latest files (bypassing the
 * browser's HTTP cache) and keep a copy; fall back to the copy when offline or
 * when the network is too slow. This way an installed app picks up new versions
 * as soon as it's opened, instead of showing an old cached copy.
 */
const CACHE = "sugichess-v4";
const ASSETS = [
  "./", "index.html", "style.css", "app.js", "engine.js", "pieces.js", "puzzles.js",
  "splash.js", "i18n.js", "ai-worker.js", "manifest.webmanifest",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/sugigames.svg",
];
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
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
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // fonts etc.: let the browser handle them

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const network = fetch(req, { cache: "no-cache" }).then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    try {
      // Prefer the network, but don't keep a child waiting on a bad connection.
      return await Promise.race([
        network,
        new Promise((_, reject) => setTimeout(() => reject(new Error("slow")), NETWORK_TIMEOUT_MS)),
      ]);
    } catch (_) {
      const cached = await cache.match(req, { ignoreSearch: true });
      return cached || network;
    }
  })());
});
