import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "../helpers/mock-db";

const db = createMockDb();
vi.mock("@/lib/db", () => ({ db }));

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of ["select", "from", "where", "orderBy"] as const) {
    db[key].mockReturnValue(db);
  }
  // The chain terminates on orderBy, which awaits to the row array.
  db.orderBy.mockResolvedValue([]);
});

describe("public/demo purchase read (location-stripped — PRD §5.4.2)", () => {
  it("publicPurchaseColumns excludes lat and lng", async () => {
    const { publicPurchaseColumns } = await import("@/lib/public-data");
    expect(publicPurchaseColumns).not.toHaveProperty("lat");
    expect(publicPurchaseColumns).not.toHaveProperty("lng");
  });

  it("publicPurchaseColumns still includes the safe fields", async () => {
    const { publicPurchaseColumns } = await import("@/lib/public-data");
    for (const k of [
      "id",
      "userId",
      "date",
      "cost",
      "gallons",
      "odometer",
      "pricePerGallon",
      "fuelGrade",
    ]) {
      expect(publicPurchaseColumns).toHaveProperty(k);
    }
  });

  it("listPublicPurchases selects an explicit projection (not a bare select-all) without lat/lng", async () => {
    const { listPublicPurchases } = await import("@/lib/public-data");
    await listPublicPurchases();

    expect(db.select).toHaveBeenCalledOnce();
    const projection = db.select.mock.calls[0][0];
    // A bare `select()` (all columns, incl. lat/lng) would pass `undefined`.
    expect(projection).toBeTruthy();
    expect(projection).not.toHaveProperty("lat");
    expect(projection).not.toHaveProperty("lng");
  });

  it("filters to owner rows and orders by date", async () => {
    const { listPublicPurchases } = await import("@/lib/public-data");
    await listPublicPurchases();
    expect(db.where).toHaveBeenCalledOnce();
    expect(db.orderBy).toHaveBeenCalledOnce();
  });
});
