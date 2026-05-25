import { describe, it, expect } from "vitest";
import { monthlyAvg } from "@/lib/aggregations";
import type { GasPurchase } from "@/lib/db/schema";

function p(date: string, overrides: Partial<GasPurchase> = {}): GasPurchase {
  return {
    id: date,
    userId: null,
    date,
    cost: "40.00",
    gallons: "10.000",
    odometer: 10000,
    pricePerGallon: "4.000",
    fuelGrade: "87",
    createdAt: new Date(),
    ...overrides,
  };
}

describe("monthlyAvg with date range", () => {
  const data = [
    p("2024-01-15", { odometer: 1000 }),
    p("2024-06-15", { odometer: 5000 }),
    p("2024-12-15", { odometer: 10000 }),
    p("2025-06-15", { odometer: 15000 }),
  ];

  it("returns all months when no range given", () => {
    const out = monthlyAvg(data);
    expect(out).toHaveLength(4);
  });

  it("filters out months before `from`", () => {
    const out = monthlyAvg(data, { from: new Date("2024-12-01T00:00:00Z") });
    expect(out.map((m) => m.date.slice(0, 7))).toEqual(["2024-12", "2025-06"]);
  });

  it("filters out months after `to`", () => {
    const out = monthlyAvg(data, { to: new Date("2024-12-31T00:00:00Z") });
    expect(out.map((m) => m.date.slice(0, 7))).toEqual(["2024-01", "2024-06", "2024-12"]);
  });

  it("respects both endpoints", () => {
    const out = monthlyAvg(data, {
      from: new Date("2024-06-01T00:00:00Z"),
      to: new Date("2024-12-31T00:00:00Z"),
    });
    expect(out.map((m) => m.date.slice(0, 7))).toEqual(["2024-06", "2024-12"]);
  });
});
