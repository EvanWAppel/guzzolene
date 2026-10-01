import { describe, it, expect } from "vitest";
import { detectAnomalies, type AnomalyInput } from "@/lib/anomalies";

/** Build a {date, value} series from an array of mpg values, one per month. */
function series(values: (number | null)[]): AnomalyInput[] {
  return values.map((value, i) => ({
    date: `2024-${String(i + 1).padStart(2, "0")}-01`,
    value,
  }));
}

describe("detectAnomalies", () => {
  it("flags a planted dip and nothing else", () => {
    // Stable ~31 mpg baseline with a single sharp dip at index 7.
    const input = series([31, 30, 32, 31, 30, 32, 31, 24, 31, 32]);
    const out = detectAnomalies(input, { window: 6, zThreshold: 2, minBaseline: 3 });

    expect(out.map((a) => a.index)).toEqual([7]);
    const dip = out[0];
    expect(dip.direction).toBe("below");
    expect(dip.value).toBe(24);
    // 24 vs a ~31 baseline is roughly a 23% drop.
    expect(Math.abs(dip.deltaPct)).toBeGreaterThanOrEqual(20);
    expect(Math.abs(dip.deltaPct)).toBeLessThanOrEqual(26);
    expect(dip.baselineSize).toBe(6);
    expect(dip.date).toBe("2024-08-01");
  });

  it("produces no false positives on ordinary variance", () => {
    const input = series([30, 31, 32, 31, 30, 31, 32, 31, 30, 32, 31]);
    const out = detectAnomalies(input, { window: 6, zThreshold: 2, minBaseline: 3 });
    expect(out).toEqual([]);
  });

  it("flags an upward spike as direction 'above'", () => {
    const input = series([31, 30, 32, 31, 30, 32, 31, 44, 31, 30]);
    const out = detectAnomalies(input, { window: 6, zThreshold: 2, minBaseline: 3 });
    expect(out.map((a) => a.index)).toEqual([7]);
    expect(out[0].direction).toBe("above");
    expect(out[0].deltaPct).toBeGreaterThan(0);
  });

  it("skips null values and reports indexes into the original series", () => {
    const input = series([31, 30, null, 32, 31, 30, 32, 24, 31]);
    const out = detectAnomalies(input, { window: 6, zThreshold: 2, minBaseline: 3 });
    // The dip is at original index 7 even though a null sits at index 2.
    expect(out.map((a) => a.index)).toEqual([7]);
  });

  it("never flags before a minimum baseline has accumulated", () => {
    // Sharp change at index 1, but no baseline exists yet.
    const input = series([31, 12, 31, 31]);
    const out = detectAnomalies(input, { window: 6, zThreshold: 2, minBaseline: 3 });
    expect(out).toEqual([]);
  });

  it("does not flag a flat baseline that continues flat (no divide-by-zero)", () => {
    const input = series([31, 31, 31, 31, 31, 31, 31]);
    const out = detectAnomalies(input);
    expect(out).toEqual([]);
  });

  it("uses only a trailing window, not future points, for the baseline", () => {
    // Everything before index 6 is ~20; index 6 jumps to 31 with a 20-ish baseline.
    const input = series([20, 21, 19, 20, 21, 19, 31, 20]);
    const out = detectAnomalies(input, { window: 6, zThreshold: 2, minBaseline: 3 });
    expect(out.map((a) => a.index)).toEqual([6]);
    expect(out[0].direction).toBe("above");
    // Baseline is the trailing ~20 values, so a big positive delta.
    expect(out[0].baselineMean).toBeGreaterThan(18);
    expect(out[0].baselineMean).toBeLessThan(22);
  });

  it("is deterministic (same input → identical output)", () => {
    const input = series([31, 30, 32, 31, 30, 32, 31, 24, 31, 32]);
    expect(detectAnomalies(input)).toEqual(detectAnomalies(input));
  });
});
