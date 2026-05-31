import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "../helpers/mock-db";

const db = createMockDb();
const authMock = vi.fn();

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@clerk/nextjs/server", () => ({ auth: () => authMock() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  // Re-establish chainable behavior wiped by clearAllMocks.
  for (const key of ["select", "insert", "update", "delete", "from", "where", "set", "values", "orderBy", "returning"] as const) {
    db[key].mockReturnValue(db);
  }
  db.values.mockResolvedValue(undefined);
  authMock.mockResolvedValue({ userId: "u_123", sessionClaims: undefined });
});

function asAuthed(userId: string | null, role?: "admin") {
  authMock.mockResolvedValue({
    userId,
    sessionClaims: role ? { publicMetadata: { role } } : undefined,
  });
}

function existingPurchase(userId: string | null) {
  // db.select().from().where() → returns [{...}]
  db.where.mockResolvedValueOnce([{ id: "p-1", userId, date: "2024-01-01" }]);
}

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

  it("persists lat and lng as floats when provided", async () => {
    const { createPurchase } = await import("@/actions/purchases");

    const form = new FormData();
    form.set("date", "2026-05-25");
    form.set("cost", "45.00");
    form.set("gallons", "12.5");
    form.set("odometer", "82000");
    form.set("pricePerGallon", "3.60");
    form.set("lat", "41.8781");
    form.set("lng", "-87.6298");

    await createPurchase(form);

    const inserted = db.values.mock.calls[0][0];
    expect(inserted.lat).toBeCloseTo(41.8781);
    expect(inserted.lng).toBeCloseTo(-87.6298);
  });

  it("omits lat/lng (null) when not provided", async () => {
    const { createPurchase } = await import("@/actions/purchases");

    const form = new FormData();
    form.set("date", "2026-05-25");
    form.set("cost", "45.00");
    form.set("gallons", "12.5");
    form.set("odometer", "82000");
    form.set("pricePerGallon", "3.60");

    await createPurchase(form);

    const inserted = db.values.mock.calls[0][0];
    expect(inserted.lat).toBeNull();
    expect(inserted.lng).toBeNull();
  });
});

describe("updatePurchase ownership", () => {
  it("throws when row belongs to another user", async () => {
    asAuthed("u_OTHER");
    existingPurchase("u_OWNER");
    const { updatePurchase } = await import("@/actions/purchases");
    await expect(updatePurchase("p-1", { cost: "50.00" })).rejects.toThrow(/forbidden/i);
  });

  it("allows when row belongs to the caller", async () => {
    asAuthed("u_OWNER");
    existingPurchase("u_OWNER");
    db.where.mockResolvedValueOnce(undefined);
    const { updatePurchase } = await import("@/actions/purchases");
    await expect(updatePurchase("p-1", { cost: "50.00" })).resolves.toBeUndefined();
    expect(db.update).toHaveBeenCalled();
  });

  it("admin may update an owner (user_id=null) row", async () => {
    asAuthed("u_ADMIN", "admin");
    existingPurchase(null);
    db.where.mockResolvedValueOnce(undefined);
    const { updatePurchase } = await import("@/actions/purchases");
    await expect(updatePurchase("p-1", { cost: "50.00" })).resolves.toBeUndefined();
  });

  it("non-admin cannot update an owner row", async () => {
    asAuthed("u_RANDOM");
    existingPurchase(null);
    const { updatePurchase } = await import("@/actions/purchases");
    await expect(updatePurchase("p-1", { cost: "50.00" })).rejects.toThrow(/forbidden/i);
  });

  it("throws when row does not exist", async () => {
    asAuthed("u_OWNER");
    db.where.mockResolvedValueOnce([]);
    const { updatePurchase } = await import("@/actions/purchases");
    await expect(updatePurchase("missing", { cost: "1" })).rejects.toThrow(/not found/i);
  });
});

describe("deletePurchase ownership", () => {
  it("throws when row belongs to another user", async () => {
    asAuthed("u_OTHER");
    existingPurchase("u_OWNER");
    const { deletePurchase } = await import("@/actions/purchases");
    await expect(deletePurchase("p-1")).rejects.toThrow(/forbidden/i);
  });

  it("allows when row belongs to the caller", async () => {
    asAuthed("u_OWNER");
    existingPurchase("u_OWNER");
    db.where.mockResolvedValueOnce(undefined);
    const { deletePurchase } = await import("@/actions/purchases");
    await expect(deletePurchase("p-1")).resolves.toBeUndefined();
    expect(db.delete).toHaveBeenCalled();
  });

  it("admin may delete an owner (user_id=null) row", async () => {
    asAuthed("u_ADMIN", "admin");
    existingPurchase(null);
    db.where.mockResolvedValueOnce(undefined);
    const { deletePurchase } = await import("@/actions/purchases");
    await expect(deletePurchase("p-1")).resolves.toBeUndefined();
  });

  it("non-admin cannot delete an owner row", async () => {
    asAuthed("u_RANDOM");
    existingPurchase(null);
    const { deletePurchase } = await import("@/actions/purchases");
    await expect(deletePurchase("p-1")).rejects.toThrow(/forbidden/i);
  });
});
