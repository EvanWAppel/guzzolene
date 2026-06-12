/* Minimal service worker — establishes installability without caching the app shell.
 * Lighthouse PWA criteria require an active service worker; offline behaviour
 * (Stream D) is layered on top of this.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op: defer to network.
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
