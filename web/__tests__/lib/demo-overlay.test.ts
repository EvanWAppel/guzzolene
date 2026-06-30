import { describe, it, expect, beforeEach } from "vitest";
import type { PublicPurchase } from "@/lib/public-data";
import {
  STORAGE_KEY,
  TTL_MS,
  MAX_ADDED,
  emptyOverlay,
  loadOverlay,
  saveOverlay,
  resetOverlay,
  mergeOverlay,
  addToOverlay,
  editInOverlay,
  deleteFromOverlay,
  type DemoDraft,
} from "@/lib/demo-overlay";

function baseRow(overrides: Partial<PublicPurchase> = {}): PublicPurchase {
  return {
    id: "base-1",
    userId: null,
    date: "2024-01-01",
    cost: "40.00",
    gallons: "10.000",
    odometer: 50000,
    pricePerGallon: "4.000",
    fuelGrade: "87",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}

const draft: DemoDraft = {
  date: "2026-06-01",
  cost: "50.00",
  gallons: "12.000",
  pricePerGallon: "4.166",
  odometer: 60000,
  fuelGrade: "91",
};

beforeEach(() => {
  sessionStorage.clear();
});

describe("loadOverlay (G-13)", () => {
  it("returns an empty overlay when nothing is stored", () => {
    expect(loadOverlay().added).toEqual([]);
  });

  it("round-trips a saved overlay", () => {
    const o = addToOverlay(emptyOverlay(), draft);
    saveOverlay(o);
    expect(loadOverlay().added).toHaveLength(1);
  });

  it("discards an overlay older than the 24h soft TTL (G-21)", () => {
    const old = emptyOverlay(0); // createdAt = epoch
    saveOverlay(addToOverlay(old, draft, 0));
    // Load "now" well past the TTL → discarded, starts fresh.
    expect(loadOverlay(TTL_MS + 1).added).toEqual([]);
  });

  it("ignores corrupt JSON without throwing", () => {
    sessionStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadOverlay().added).toEqual([]);
  });
});

describe("resetOverlay (G-21)", () => {
  it("clears stored overlay so a fresh load is empty (G-20)", () => {
    saveOverlay(addToOverlay(emptyOverlay(), draft));
    resetOverlay();
    expect(loadOverlay().added).toEqual([]);
  });
});

describe("mergeOverlay (G-14)", () => {
  it("returns base rows untouched with an empty overlay", () => {
    const merged = mergeOverlay([baseRow()], emptyOverlay());
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("base-1");
  });

  it("drops tombstoned base rows", () => {
    const o = deleteFromOverlay(emptyOverlay(), "base-1");
    expect(mergeOverlay([baseRow()], o)).toHaveLength(0);
  });

  it("applies edit overrides to base rows", () => {
    const o = editInOverlay(emptyOverlay(), "base-1", { cost: "99.99" });
    expect(mergeOverlay([baseRow()], o)[0].cost).toBe("99.99");
  });

  it("appends added rows, flagged isDemo, and sorts by date", () => {
    const o = addToOverlay(emptyOverlay(), { ...draft, date: "2023-01-01" });
    const merged = mergeOverlay([baseRow({ date: "2024-01-01" })], o);
    expect(merged).toHaveLength(2);
    expect(merged[0].date).toBe("2023-01-01"); // sorted ascending
    expect(merged[0].isDemo).toBe(true);
  });
});

describe("write helpers (G-17/G-18/G-19)", () => {
  it("addToOverlay generates a demo- id and never mutates real data", () => {
    const o = addToOverlay(emptyOverlay(), draft);
    expect(o.added[0].id.startsWith("demo-")).toBe(true);
    expect(o.added[0].userId).toBeNull();
  });

  it("editing/deleting a demo-added row touches only the sandbox", () => {
    let o = addToOverlay(emptyOverlay(), draft);
    const id = o.added[0].id;
    o = editInOverlay(o, id, { cost: "1.00" });
    expect(o.added[0].cost).toBe("1.00");
    expect(o.edits).toEqual({}); // no base-row override created
    o = deleteFromOverlay(o, id);
    expect(o.added).toHaveLength(0);
  });
});

describe("overlay size cap (G-24)", () => {
  it("throws once MAX_ADDED is exceeded", () => {
    let o = emptyOverlay();
    for (let i = 0; i < MAX_ADDED; i++) o = addToOverlay(o, draft);
    expect(() => addToOverlay(o, draft)).toThrow(/limit/i);
  });
});
