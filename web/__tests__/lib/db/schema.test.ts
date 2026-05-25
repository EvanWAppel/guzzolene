import { describe, it, expect } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { gasPurchases, worldEvents } from "@/lib/db/schema";

describe("gasPurchases schema", () => {
  const cols = getTableColumns(gasPurchases);

  it("has the expected set of columns", () => {
    expect(Object.keys(cols).sort()).toEqual(
      [
        "id",
        "userId",
        "date",
        "cost",
        "gallons",
        "odometer",
        "pricePerGallon",
        "fuelGrade",
        "createdAt",
      ].sort(),
    );
  });

  it("pumpPhotoUrl is removed", () => {
    expect("pumpPhotoUrl" in cols).toBe(false);
  });

  it("id is uuid primary key", () => {
    expect(cols.id.primary).toBe(true);
    expect(cols.id.columnType).toBe("PgUUID");
  });

  it("date is NOT NULL", () => {
    expect(cols.date.notNull).toBe(true);
  });

  it("userId is nullable (null = owner)", () => {
    expect(cols.userId.notNull).toBe(false);
  });

  it("fuelGrade is text, NOT NULL, default '87'", () => {
    expect(cols.fuelGrade).toBeDefined();
    expect(cols.fuelGrade.columnType).toBe("PgText");
    expect(cols.fuelGrade.notNull).toBe(true);
    expect(cols.fuelGrade.default).toBe("87");
  });
});

describe("worldEvents schema", () => {
  const cols = getTableColumns(worldEvents);

  it("has the current set of columns", () => {
    expect(Object.keys(cols).sort()).toEqual(
      ["id", "userId", "name", "date", "description", "wikipediaUrl", "createdAt"].sort(),
    );
  });

  it("name and date are NOT NULL", () => {
    expect(cols.name.notNull).toBe(true);
    expect(cols.date.notNull).toBe(true);
  });
});
