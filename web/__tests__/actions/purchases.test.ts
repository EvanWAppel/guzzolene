import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb, mockAuth } from "../helpers/mock-db";

const db = createMockDb();
const auth = mockAuth("u_123");

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@clerk/nextjs/server", () => ({ auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  // Re-establish chainable behavior wiped by clearAllMocks.
  for (const key of ["select", "insert", "update", "delete", "from", "where", "set", "values", "orderBy", "returning"] as const) {
    db[key].mockReturnValue(db);
  }
  db.values.mockResolvedValue(undefined);
});

describe("createPurchase", () => {
  it("persists fuelGrade from form data", async () => {
    const { createPurchase } = await import("@/actions/purchases");

    const form = new FormData();
    form.set("date", "2026-05-25");
    form.set("cost", "45.00");
    form.set("gallons", "12.5");
    form.set("odometer", "82000");
    form.set("pricePerGallon", "3.60");
    form.set("fuelGrade", "91");

    await createPurchase(form);

    expect(db.insert).toHaveBeenCalledOnce();
    expect(db.values).toHaveBeenCalledOnce();
    const inserted = db.values.mock.calls[0][0];
    expect(inserted.fuelGrade).toBe("91");
    expect(inserted.userId).toBe("u_123");
  });

  it("defaults fuelGrade to '87' when omitted", async () => {
    const { createPurchase } = await import("@/actions/purchases");

    const form = new FormData();
    form.set("date", "2026-05-25");
    form.set("cost", "40.00");
    form.set("gallons", "11.0");
    form.set("odometer", "82100");
    form.set("pricePerGallon", "3.64");

    await createPurchase(form);

    const inserted = db.values.mock.calls[0][0];
    expect(inserted.fuelGrade).toBe("87");
  });
});
