import { describe, it, expect } from "vitest";
import { parseDateRange, isDefaultRange, filterByRange } from "@/lib/filters";

describe("parseDateRange", () => {
  it("returns null when from and to are absent", () => {
    expect(parseDateRange({})).toBeNull();
  });

  it("parses YYYY-MM-DD from and to", () => {
    const r = parseDateRange({ from: "2024-01-01", to: "2024-12-31" });
    expect(r).not.toBeNull();
    expect(r!.from?.toISOString().slice(0, 10)).toBe("2024-01-01");
    expect(r!.to?.toISOString().slice(0, 10)).toBe("2024-12-31");
  });

  it("returns null on invalid formats", () => {
    expect(parseDateRange({ from: "2024/01/01" })).toBeNull();
    expect(parseDateRange({ from: "not-a-date" })).toBeNull();
  });

  it("accepts string-array values from Next.js searchParams (takes first)", () => {
    const r = parseDateRange({ from: ["2024-01-01", "2024-02-02"], to: "2024-12-31" });
    expect(r!.from?.toISOString().slice(0, 10)).toBe("2024-01-01");
  });

  it("accepts from without to (open-ended right)", () => {
    const r = parseDateRange({ from: "2024-01-01" });
    expect(r!.from).toBeInstanceOf(Date);
    expect(r!.to).toBeUndefined();
  });
});

describe("isDefaultRange", () => {
  it("true when no params present", () => {
    expect(isDefaultRange({})).toBe(true);
  });
  it("false when from or to present", () => {
    expect(isDefaultRange({ from: "2024-01-01" })).toBe(false);
    expect(isDefaultRange({ to: "2024-12-31" })).toBe(false);
  });
});

describe("filterByRange", () => {
  const items = [
    { date: "2024-01-15", id: "a" },
    { date: "2024-06-15", id: "b" },
    { date: "2024-12-15", id: "c" },
  ];

  it("returns all items when range is null", () => {
    expect(filterByRange(items, null).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("filters by from/to inclusive", () => {
    const r = parseDateRange({ from: "2024-06-01", to: "2024-12-31" });
    expect(filterByRange(items, r).map((i) => i.id)).toEqual(["b", "c"]);
  });
});
