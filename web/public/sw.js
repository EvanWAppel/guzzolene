/* Service worker for the Guzzolene PWA.
 *
 * Caches the app shell so the installed PWA opens in airplane mode and the
 * user reaches the offline fill-up form — drafts then queue in IndexedDB and
 * sync when the network returns (Stream D / D-9). Strategy:
 *   - navigations        → network-first, fall back to the cached page, then
 *                          to the precached offline fallback
 *   - immutable assets   → cache-first (hashed `/_next/static`, icons, manifest)
 *   - everything else    → pass through to the network (RSC data, APIs,
 *                          cross-origin) — a cold launch is a full navigation,
 *                          which the rules above cover.
 *
 * Bump CACHE whenever this file changes so `activate` purges the stale cache. */

const CACHE = "guzzolene-v2";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll([OFFLINE_URL]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("guzzolene-") && name !== CACHE)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

function isImmutableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === OFFLINE_URL
  );
}

/* Cache-first: hashed asset URLs are immutable, so a cached copy is always
 * valid. On a miss, fetch and cache before returning. */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) await cache.put(request, response.clone());
  return response;
}

/* Network-first: prefer fresh HTML, but keep the last good copy so the app
 * can boot offline. When the network fails, serve the cached page, then the
 * offline fallback; if neither exists, surface the real network error
 * (never swallow it — see claude.md). */
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isImmutableAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }
  // Pass through: RSC payloads, API routes, and anything dynamic.
});

/* Background sync (Stream D): drafts live in the page's IndexedDB outbox and
 * must be replayed through a server action, which only a window client can
 * call. On sync, nudge open clients to drain; if none are open, the
 * mount/online-event triggers in OutboxSync handle it on next visit. */
self.addEventListener("sync", (event) => {
  if (event.tag !== "drain-outbox") return;
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: "drain-outbox" });
      }
    }),
  );
});
