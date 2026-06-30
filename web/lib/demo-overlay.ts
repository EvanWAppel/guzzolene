import type { PublicPurchase } from "@/lib/public-data";

/**
 * Client-side demo sandbox overlay (PRD §5.4.3, ADR `web/docs/adr-demo-sandbox.md`).
 *
 * The `/demo` surface is anonymous and read-only with respect to real data:
 * reads come from the server as a location-stripped base, and a visitor's
 * add/edit/delete live ONLY here, in `sessionStorage`. There is no server write
 * path — "real data is never mutated" is structural, not enforced by a check.
 *
 * Reset semantics: `sessionStorage` clears when the tab/session closes (so a
 * fresh session starts from the base only); a 24h soft TTL discards stale
 * overlays on load; `resetOverlay()` clears explicitly.
 */

export const STORAGE_KEY = "guzzolene:demo-sandbox";
export const TTL_MS = 24 * 60 * 60 * 1000; // 24h soft TTL
export const MAX_ADDED = 25; // client-side cap (G-24); no server surface to abuse

/** The subset of fields a visitor can set on a fill-up in the demo. */
export type DemoDraft = {
  date: string;
  cost: string | null;
  gallons: string | null;
  pricePerGallon: string | null;
  odometer: number | null;
  fuelGrade: string;
};

/** A merged demo row — a PublicPurchase, flagged when it originated in the sandbox. */
export type DemoPurchase = PublicPurchase & { isDemo?: boolean };

export type Overlay = {
  createdAt: string; // ISO; stamped when the overlay is first created
  added: PublicPurchase[]; // sandbox-only rows (ids prefixed "demo-")
  edits: Record<string, Partial<DemoDraft>>; // baseRowId -> field overrides
  deleted: string[]; // baseRowId tombstones
};

export function emptyOverlay(now: number = Date.now()): Overlay {
  return { createdAt: new Date(now).toISOString(), added: [], edits: {}, deleted: [] };
}

export function isDemoId(id: string): boolean {
  return id.startsWith("demo-");
}

function newDemoId(): string {
  const c = globalThis.crypto;
  return `demo-${c?.randomUUID ? c.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 1e9)}`}`;
}

function hasSessionStorage(): boolean {
  return typeof globalThis !== "undefined" && !!globalThis.sessionStorage;
}

/**
 * Read + validate the overlay from sessionStorage. Returns a fresh empty overlay
 * when absent, unparseable, or past the soft TTL. Never throws on a bad read —
 * a corrupt overlay should not break the demo (a failed *write*, by contrast,
 * surfaces; see saveOverlay).
 */
export function loadOverlay(now: number = Date.now()): Overlay {
  if (!hasSessionStorage()) return emptyOverlay(now);
  const raw = globalThis.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyOverlay(now);

  let parsed: Overlay;
  try {
    parsed = JSON.parse(raw) as Overlay;
  } catch {
    return emptyOverlay(now);
  }
  if (!parsed?.createdAt || !Array.isArray(parsed.added)) return emptyOverlay(now);

  const age = now - new Date(parsed.createdAt).getTime();
  if (!Number.isFinite(age) || age > TTL_MS) return emptyOverlay(now);

  return {
    createdAt: parsed.createdAt,
    added: parsed.added ?? [],
    edits: parsed.edits ?? {},
    deleted: parsed.deleted ?? [],
  };
}

/** Persist the overlay. Lets storage errors (quota/private mode) THROW — the
 * caller surfaces them; we never silently drop a visitor's write (claude.md). */
export function saveOverlay(overlay: Overlay): void {
  if (!hasSessionStorage()) return;
  globalThis.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(overlay));
}

export function resetOverlay(): void {
  if (!hasSessionStorage()) return;
  globalThis.sessionStorage.removeItem(STORAGE_KEY);
}

/** Merge the location-stripped base with the overlay. Pure; used by the UI. */
export function mergeOverlay(base: PublicPurchase[], overlay: Overlay): DemoPurchase[] {
  const deleted = new Set(overlay.deleted);
  const kept: DemoPurchase[] = base
    .filter((row) => !deleted.has(row.id))
    .map((row) => {
      const patch = overlay.edits[row.id];
      return patch ? { ...row, ...patch } : row;
    });
  const added: DemoPurchase[] = overlay.added.map((row) => ({ ...row, isDemo: true }));
  return [...kept, ...added].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Add a sandbox row. Throws when the per-session cap is hit (G-24) — surfaced to
 * the visitor, not silently dropped. Returns a NEW overlay (immutable update).
 */
export function addToOverlay(
  overlay: Overlay,
  draft: DemoDraft,
  now: number = Date.now(),
): Overlay {
  if (overlay.added.length >= MAX_ADDED) {
    throw new Error(`Demo limit reached — you can add up to ${MAX_ADDED} fill-ups in a session.`);
  }
  const row: PublicPurchase = {
    id: newDemoId(),
    userId: null,
    date: draft.date,
    cost: draft.cost,
    gallons: draft.gallons,
    odometer: draft.odometer,
    pricePerGallon: draft.pricePerGallon,
    fuelGrade: draft.fuelGrade,
    createdAt: new Date(now),
  };
  return { ...overlay, added: [...overlay.added, row] };
}

/** Edit a row. Sandbox-added rows are mutated in place; base rows record an override. */
export function editInOverlay(
  overlay: Overlay,
  id: string,
  patch: Partial<DemoDraft>,
): Overlay {
  if (isDemoId(id)) {
    return {
      ...overlay,
      added: overlay.added.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    };
  }
  return { ...overlay, edits: { ...overlay.edits, [id]: { ...overlay.edits[id], ...patch } } };
}

/** Delete a row. Sandbox-added rows are removed; base rows get a tombstone. */
export function deleteFromOverlay(overlay: Overlay, id: string): Overlay {
  if (isDemoId(id)) {
    return { ...overlay, added: overlay.added.filter((r) => r.id !== id) };
  }
  if (overlay.deleted.includes(id)) return overlay;
  return { ...overlay, deleted: [...overlay.deleted, id] };
}
