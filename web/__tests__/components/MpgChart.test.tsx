import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, within } from "@testing-library/react";
import MpgChart from "@/components/charts/MpgChart";
import type { MonthlyPoint } from "@/lib/aggregations";

// Recharts' ResponsiveContainer needs ResizeObserver, absent in jsdom. The
// accessible anomaly annotation renders outside the chart SVG, so it is asserted
// directly regardless of chart dimensions.
beforeAll(() => {
  if (!("ResizeObserver" in globalThis)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

function point(month: string, mpg: number | null): MonthlyPoint {
  return {
    date: `${month}-01`,
    cost: 40,
    gallons: 10,
    odometer: 10000,
    pricePerGallon: 4,
    costPerMile: 0.1,
    mpg,
    gpm: mpg ? 100 / mpg : null,
  };
}

// Stable ~31 mpg baseline with one planted dip.
const withDip: MonthlyPoint[] = [
  point("2024-01", 31),
  point("2024-02", 30),
  point("2024-03", 32),
  point("2024-04", 31),
  point("2024-05", 30),
  point("2024-06", 32),
  point("2024-07", 31),
  point("2024-08", 24), // dip
  point("2024-09", 31),
  point("2024-10", 32),
];

const noDip: MonthlyPoint[] = [
  point("2024-01", 30),
  point("2024-02", 31),
  point("2024-03", 32),
  point("2024-04", 31),
  point("2024-05", 30),
  point("2024-06", 31),
  point("2024-07", 32),
  point("2024-08", 31),
  point("2024-09", 30),
];

describe("MpgChart anomaly annotation", () => {
  it("renders an accessible region describing the planted dip", () => {
    render(<MpgChart data={withDip} events={[]} />);
    const region = screen.getByRole("region", { name: /anomal/i });
    expect(region).toBeInTheDocument();
    // Plain-language annotation naming the deviation and the baseline.
    expect(within(region).getByText(/% below your \d+-month baseline/i)).toBeInTheDocument();
    expect(within(region).getByText(/2024-08/)).toBeInTheDocument();
  });

  it("shows no anomaly region for ordinary variance (no false positives)", () => {
    render(<MpgChart data={noDip} events={[]} />);
    expect(screen.queryByRole("region", { name: /anomal/i })).not.toBeInTheDocument();
  });

  it("annotations are keyboard/screen-reader reachable as a list", () => {
    render(<MpgChart data={withDip} events={[]} />);
    const region = screen.getByRole("region", { name: /anomal/i });
    const items = within(region).getAllByRole("listitem");
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it("respects the date-range filter: an anomaly outside the passed window is absent", () => {
    // Caller already filtered out the dip month; only clean months remain.
    const filtered = withDip.filter((p) => p.date !== "2024-08-01");
    render(<MpgChart data={filtered} events={[]} />);
    expect(screen.queryByText(/2024-08/)).not.toBeInTheDocument();
  });
});
