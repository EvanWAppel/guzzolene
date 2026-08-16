import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import path from "node:path";

/* Exercises the *actual shipped* public/sw.js by loading its source into a
 * simulated ServiceWorkerGlobalScope. This guards the offline app-shell caching
 * that makes the installed PWA open in airplane mode (Stream D / D-9). */

const SW_SOURCE = readFileSync(
  path.resolve(__dirname, "../public/sw.js"),
  "utf8",
);

const ORIGIN = "https://guzzo-lene.com";
const OFFLINE_URL = "/offline.html";

type FakeResponse = { tag: string; ok: boolean; status: number; clone: () => FakeResponse };

function res(tag: string, { ok = true, status = 200 } = {}): FakeResponse {
  return { tag, ok, status, clone: () => res(tag, { ok, status }) };
}

function urlOf(req: string | { url: string }): string {
  return typeof req === "string" ? req : req.url;
}

class FakeCache {
  store = new Map<string, FakeResponse>();
  fetchImpl: (url: string) => Promise<FakeResponse>;
  constructor(fetchImpl: (url: string) => Promise<FakeResponse>) {
    this.fetchImpl = fetchImpl;
  }
  async match(req: string | { url: string }) {
    return this.store.get(urlOf(req));
  }
  async put(req: string | { url: string }, response: FakeResponse) {
    this.store.set(urlOf(req), response);
  }
  async add(req: string | { url: string }) {
    const url = urlOf(req);
    this.store.set(url, await this.fetchImpl(url));
  }
  async addAll(reqs: (string | { url: string })[]) {
    for (const r of reqs) await this.add(r);
  }
  async keys() {
    return [...this.store.keys()];
  }
  async delete(req: string | { url: string }) {
    return this.store.delete(urlOf(req));
  }
}

class FakeCacheStorage {
  caches = new Map<string, FakeCache>();
  fetchImpl: (url: string) => Promise<FakeResponse>;
  constructor(fetchImpl: (url: string) => Promise<FakeResponse>) {
    this.fetchImpl = fetchImpl;
  }
  async open(name: string) {
    if (!this.caches.has(name)) this.caches.set(name, new FakeCache(this.fetchImpl));
    return this.caches.get(name)!;
  }
  async keys() {
    return [...this.caches.keys()];
  }
  async delete(name: string) {
    return this.caches.delete(name);
  }
  async match(req: string | { url: string }) {
    for (const cache of this.caches.values()) {
      const hit = await cache.match(req);
      if (hit) return hit;
    }
    return undefined;
  }
}

type Listener = (event: unknown) => void;

interface Harness {
  listeners: Record<string, Listener>;
  cacheStorage: FakeCacheStorage;
  fetchMock: ReturnType<typeof vi.fn>;
  self: Record<string, unknown>;
  matchAllClients: { id: string; postMessage: ReturnType<typeof vi.fn> }[];
}

function loadSw(): Harness {
  const listeners: Record<string, Listener> = {};
  const fetchMock = vi.fn();
  const cacheStorage = new FakeCacheStorage((url) => fetchMock(url));
  const matchAllClients = [{ id: "c1", postMessage: vi.fn() }];

  const self: Record<string, unknown> = {
    addEventListener: (type: string, handler: Listener) => {
      listeners[type] = handler;
    },
    skipWaiting: vi.fn(() => Promise.resolve()),
    clients: {
      claim: vi.fn(() => Promise.resolve()),
      matchAll: vi.fn(async () => matchAllClients),
    },
    registration: {},
    location: { origin: ORIGIN },
  };

  const sandbox = {
    self,
    caches: cacheStorage,
    fetch: fetchMock,
    URL,
    console,
  };
  runInNewContext(SW_SOURCE, sandbox);

  return { listeners, cacheStorage, fetchMock, self, matchAllClients };
}

// --- event helpers ---------------------------------------------------------

async function runExtendable(handler: Listener) {
  const promises: Promise<unknown>[] = [];
  handler({ waitUntil: (p: Promise<unknown>) => promises.push(p) });
  await Promise.all(promises);
}

async function runFetch(
  handler: Listener,
  request: { url: string; mode?: string; method?: string },
) {
  let responded: unknown;
  const promises: Promise<unknown>[] = [];
  handler({
    request: { method: "GET", ...request },
    respondWith: (r: unknown) => {
      responded = r;
    },
    waitUntil: (p: Promise<unknown>) => promises.push(p),
  });
  await Promise.all(promises);
  return responded === undefined ? undefined : ((await responded) as FakeResponse);
}

function nav(pathname: string) {
  return { url: ORIGIN + pathname, mode: "navigate" as const };
}

// --- tests -----------------------------------------------------------------

describe("service worker: install", () => {
  it("precaches the offline fallback page", async () => {
    const { listeners, cacheStorage, fetchMock, self } = loadSw();
    fetchMock.mockResolvedValue(res("offline-page"));

    await runExtendable(listeners.install);

    expect(self.skipWaiting).toHaveBeenCalled();
    const cached = await cacheStorage.match(OFFLINE_URL);
    expect(cached).toBeTruthy();
    expect(cached!.tag).toBe("offline-page");
  });
});

describe("service worker: activate", () => {
  it("deletes stale caches but keeps the current one", async () => {
    const { listeners, cacheStorage, fetchMock, self } = loadSw();
    fetchMock.mockResolvedValue(res("offline-page"));

    await runExtendable(listeners.install); // creates the current cache
    await cacheStorage.open("guzzolene-stale"); // simulate a previous version

    await runExtendable(listeners.activate);

    expect(self.clients).toBeTruthy();
    const names = await cacheStorage.keys();
    expect(names).not.toContain("guzzolene-stale");
    // Current cache survived: offline page still reachable.
    expect(await cacheStorage.match(OFFLINE_URL)).toBeTruthy();
  });
});

describe("service worker: fetch — static assets (cache-first)", () => {
  it("serves from network on a miss and caches it", async () => {
    const { listeners, cacheStorage, fetchMock } = loadSw();
    fetchMock.mockResolvedValue(res("network-chunk"));

    const out = await runFetch(listeners.fetch, {
      url: ORIGIN + "/_next/static/chunks/main.js",
    });

    expect(out!.tag).toBe("network-chunk");
    expect((await cacheStorage.match(ORIGIN + "/_next/static/chunks/main.js"))!.tag).toBe(
      "network-chunk",
    );
  });

  it("serves from cache without hitting the network on a hit", async () => {
    const { listeners, fetchMock } = loadSw();
    const url = ORIGIN + "/_next/static/chunks/main.js";
    // Seed the cache the SW uses by first priming it via a network miss.
    fetchMock.mockResolvedValueOnce(res("network-chunk"));
    await runFetch(listeners.fetch, { url });
    fetchMock.mockClear();

    const out = await runFetch(listeners.fetch, { url });

    expect(out!.tag).toBe("network-chunk");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("service worker: fetch — navigations (network-first)", () => {
  it("returns the network page and caches it when online", async () => {
    const { listeners, cacheStorage, fetchMock } = loadSw();
    fetchMock.mockResolvedValue(res("network-page"));

    const out = await runFetch(listeners.fetch, nav("/dashboard/add"));

    expect(out!.tag).toBe("network-page");
    expect((await cacheStorage.match(ORIGIN + "/dashboard/add"))!.tag).toBe("network-page");
  });

  it("falls back to the cached page when offline", async () => {
    const { listeners, fetchMock } = loadSw();
    // Prime the cache with a successful online navigation.
    fetchMock.mockResolvedValueOnce(res("cached-page"));
    await runFetch(listeners.fetch, nav("/dashboard/add"));
    // Now go offline.
    fetchMock.mockRejectedValue(new Error("offline"));

    const out = await runFetch(listeners.fetch, nav("/dashboard/add"));

    expect(out!.tag).toBe("cached-page");
  });

  it("falls back to the offline page when offline with no cached page", async () => {
    const { listeners, fetchMock } = loadSw();
    fetchMock.mockResolvedValue(res("offline-page"));
    await runExtendable(listeners.install); // precache offline.html
    fetchMock.mockRejectedValue(new Error("offline"));

    const out = await runFetch(listeners.fetch, nav("/dashboard/add"));

    expect(out!.tag).toBe("offline-page");
  });
});

describe("service worker: fetch — pass-through", () => {
  it("does not intercept cross-origin requests", async () => {
    const { listeners } = loadSw();
    const out = await runFetch(listeners.fetch, {
      url: "https://clerk.example.com/session",
      mode: "cors",
    });
    expect(out).toBeUndefined();
  });

  it("does not intercept non-GET requests", async () => {
    const { listeners } = loadSw();
    const out = await runFetch(listeners.fetch, {
      url: ORIGIN + "/dashboard/add",
      mode: "navigate",
      method: "POST",
    });
    expect(out).toBeUndefined();
  });
});

describe("service worker: sync — drain-outbox", () => {
  it("nudges open window clients to drain the outbox", async () => {
    const { listeners, matchAllClients } = loadSw();

    const promises: Promise<unknown>[] = [];
    listeners.sync({
      tag: "drain-outbox",
      waitUntil: (p: Promise<unknown>) => promises.push(p),
    });
    await Promise.all(promises);

    expect(matchAllClients[0].postMessage).toHaveBeenCalledWith({ type: "drain-outbox" });
  });

  it("ignores unrelated sync tags", async () => {
    const { listeners, matchAllClients } = loadSw();

    const promises: Promise<unknown>[] = [];
    listeners.sync({
      tag: "something-else",
      waitUntil: (p: Promise<unknown>) => promises.push(p),
    });
    await Promise.all(promises);

    expect(matchAllClients[0].postMessage).not.toHaveBeenCalled();
  });
});
