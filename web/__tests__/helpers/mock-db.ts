import { vi, type Mock } from "vitest";

/**
 * Chainable Drizzle mock. Each method returns the same mock object so
 * `db.select().from(...).where(...).orderBy(...)` works; each method is a
 * `vi.fn()` you can assert against and override per-test.
 *
 * Example:
 *   const db = createMockDb();
 *   db.insert.mockReturnValue(db);
 *   db.values.mockResolvedValue(undefined);
 *   vi.mock("@/lib/db", () => ({ db }));
 */
export type MockDb = {
  select: Mock;
  insert: Mock;
  update: Mock;
  delete: Mock;
  from: Mock;
  where: Mock;
  set: Mock;
  values: Mock;
  orderBy: Mock;
  returning: Mock;
};

export function createMockDb(): MockDb {
  const db = {} as MockDb;
  const chainable = ["select", "insert", "update", "delete", "from", "where", "set", "values", "orderBy", "returning"] as const;
  for (const name of chainable) {
    db[name] = vi.fn(() => db);
  }
  return db;
}

/**
 * Mock for `@clerk/nextjs/server` auth(). Returns a function you can swap
 * per-test to simulate signed-in, signed-out, or admin sessions.
 */
export function mockAuth(userId: string | null, role?: "admin") {
  return vi.fn(async () => ({
    userId,
    sessionClaims: role ? { metadata: { role } } : undefined,
  }));
}
