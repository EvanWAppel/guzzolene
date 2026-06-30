import { describe, it, expect, vi } from "vitest";
import type { PublicPurchase } from "@/lib/public-data";

// public-data transitively imports the Neon client; we only need its column
// projection here, so stub the db module (no connection string in tests).
vi.mock("@/lib/db", () => ({ db: {} }));

import { publicPurchaseColumns } from "@/lib/public-data";
import {
  emptyOverlay,
  addToOverlay,
  editInOverlay,
  mergeOverlay,
} from "@/lib/demo-overlay";

/**
 * Privacy regression net for PRD §5.4.2 / task G-25: no `lat`/`lng` may reach an
 * unauthenticated surface (`/` and `/demo`). Both surfaces are fed by the same
 * two location-free sources guarded here: the public read projection and the
 * demo overlay merge. (The literal "inspect the network response" check is
 * manual — see G-27.)
 */

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

describe("no location on public surfaces (G-25)", () => {
  it("the public/demo read projection excludes lat/lng", () => {
    expect(publicPurchaseColumns).not.toHaveProperty("lat");
    expect(publicPurchaseColumns).not.toHaveProperty("lng");
  });

  it("merged demo data (base + added + edited) carries no location keys", () => {
    let overlay = emptyOverlay();
    overlay = addToOverlay(overlay, {
      date: "2026-06-01",
      cost: "50.00",
      gallons: "12.000",
      pricePerGallon: "4.166",
      odometer: 60000,
      fuelGrade: "91",
    });
    overlay = editInOverlay(overlay, "base-1", { cost: "99.99" });

    const merged = mergeOverlay([baseRow()], overlay);

    for (const row of merged) {
      expect(row).not.toHaveProperty("lat");
      expect(row).not.toHaveProperty("lng");
    }
    // Serialized form (what would ship to the client) mentions neither field.
    const serialized = JSON.stringify(merged);
    expect(serialized).not.toMatch(/"lat"/);
    expect(serialized).not.toMatch(/"lng"/);
  });
});
