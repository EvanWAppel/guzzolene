import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "../helpers/mock-db";

const db = createMockDb();

// `auth` is replaced per-test via vi.mocked() below.
const authMock = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ auth: () => authMock() }));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of ["select", "insert", "update", "delete", "from", "where", "set", "values", "orderBy", "returning"] as const) {
    db[key].mockReturnValue(db);
  }
});

function asAuthed(userId: string | null, role?: "admin") {
  authMock.mockResolvedValue({
    userId,
    sessionClaims: role ? { publicMetadata: { role } } : undefined,
  });
}

function existingEvent(userId: string | null) {
  // db.select().from().where() → returns [{userId}]
  db.where.mockResolvedValueOnce([{ id: "evt-1", userId, name: "x", date: "2024-01-01", description: null, wikipediaUrl: null }]);
}

describe("updateEvent ownership", () => {
  it("throws when event belongs to another user", async () => {
    asAuthed("u_OTHER");
    existingEvent("u_OWNER");
    const { updateEvent } = await import("@/actions/events");
    await expect(updateEvent("evt-1", { name: "new", date: "2024-02-02" })).rejects.toThrow(/forbidden/i);
  });

  it("allows when event belongs to the caller", async () => {
    asAuthed("u_OWNER");
    existingEvent("u_OWNER");
    db.where.mockResolvedValueOnce(undefined); // update().set().where() resolves
    const { updateEvent } = await import("@/actions/events");
    await expect(updateEvent("evt-1", { name: "new", date: "2024-02-02" })).resolves.toBeUndefined();
    expect(db.update).toHaveBeenCalled();
  });

  it("allows admin to update an owner (user_id=null) event", async () => {
    asAuthed("u_ADMIN", "admin");
    existingEvent(null);
    db.where.mockResolvedValueOnce(undefined);
    const { updateEvent } = await import("@/actions/events");
    await expect(updateEvent("evt-1", { name: "new", date: "2024-02-02" })).resolves.toBeUndefined();
  });

  it("non-admin cannot update an owner event", async () => {
    asAuthed("u_RANDOM");
    existingEvent(null);
    const { updateEvent } = await import("@/actions/events");
    await expect(updateEvent("evt-1", { name: "new", date: "2024-02-02" })).rejects.toThrow(/forbidden/i);
  });
});

describe("deleteEvent ownership", () => {
  it("throws when event belongs to another user", async () => {
    asAuthed("u_OTHER");
    existingEvent("u_OWNER");
    const { deleteEvent } = await import("@/actions/events");
    await expect(deleteEvent("evt-1")).rejects.toThrow(/forbidden/i);
  });

  it("allows when event belongs to the caller", async () => {
    asAuthed("u_OWNER");
    existingEvent("u_OWNER");
    db.where.mockResolvedValueOnce(undefined);
    const { deleteEvent } = await import("@/actions/events");
    await expect(deleteEvent("evt-1")).resolves.toBeUndefined();
    expect(db.delete).toHaveBeenCalled();
  });
});
