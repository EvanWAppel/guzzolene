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
  // No-op: defer to network. Stream D will add an outbox-flush flow here.
});
