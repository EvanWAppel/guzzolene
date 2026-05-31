import { describe, it, expect } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
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
        "lat",
        "lng",
        "createdAt",
      ].sort(),
    );
  });

  it("lat and lng are double precision, nullable", () => {
    expect(cols.lat).toBeDefined();
    expect(cols.lng).toBeDefined();
    expect(cols.lat.columnType).toBe("PgDoublePrecision");
    expect(cols.lng.columnType).toBe("PgDoublePrecision");
    expect(cols.lat.notNull).toBe(false);
    expect(cols.lng.notNull).toBe(false);
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

  it("declares a unique constraint on (userId, date, name) with NULLS NOT DISTINCT", () => {
    const { uniqueConstraints } = getTableConfig(worldEvents);
    const uq = uniqueConstraints.find((c) => c.name === "world_events_user_date_name_unique");
    expect(uq).toBeDefined();
    expect(uq!.columns.map((c) => c.name).sort()).toEqual(["date", "name", "user_id"]);
    expect(uq!.nullsNotDistinct).toBe(true);
  });
});
