import type { GasPurchase } from "./db/schema";

export interface MonthlyPoint {
  date: string; // "YYYY-MM-01"
  cost: number | null;
  gallons: number | null;
  odometer: number | null;
  pricePerGallon: number | null;
  costPerMile: number | null;
  mpg: number | null;  // miles per gallon
  gpm: number | null;  // gallons per 100 miles
}

/**
 * Groups raw purchases into monthly averages, mirroring the Python utils.monthly_avg().
 *
 * MPG and GPM are computed per fill-up from consecutive odometer readings, then averaged
 * within each month. GPM = (gallons / miles) * 100, the metric-friendly inverse of MPG.
 */
export function monthlyAvg(purchases: GasPurchase[]): MonthlyPoint[] {
  const sorted = [...purchases].sort((a, b) => a.date.localeCompare(b.date));

  // Group by "YYYY-MM"
  const groups = new Map<string, GasPurchase[]>();
  for (const p of sorted) {
    const key = p.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  // Build per-fill-up MPG from consecutive odometer readings across all purchases.
  // Each entry carries the month it belongs to so we can average within months.
  interface FillEfficiency {
    month: string;
    mpg: number;
    gpm: number;
  }
  const fillEfficiency: FillEfficiency[] = [];

  const withOdo = sorted.filter((p) => p.odometer != null && p.gallons != null);
  for (let i = 1; i < withOdo.length; i++) {
    const prev = withOdo[i - 1];
    const curr = withOdo[i];
    const miles = Number(curr.odometer) - Number(prev.odometer);
    const gallons = Number(curr.gallons);
    // Sanity bounds: skip if miles or gallons look wrong
    if (miles > 0 && miles < 1000 && gallons > 0) {
      const mpg = miles / gallons;
      const gpm = (gallons / miles) * 100;
      // Assign to the month of the current fill-up
      fillEfficiency.push({ month: curr.date.slice(0, 7), mpg, gpm });
    }
  }

  // For cost_per_mile we need consecutive odometer readings within each month
  const odoReadings = sorted
    .filter((p) => p.odometer != null)
    .map((p) => ({ date: p.date.slice(0, 7), odometer: Number(p.odometer) }));

  const result: MonthlyPoint[] = [];

  for (const [month, rows] of Array.from(groups.entries()).sort()) {
    const avg = <T extends keyof GasPurchase>(col: T) => {
      const vals = rows
        .map((r) => (r[col] != null ? Number(r[col]) : null))
        .filter((v): v is number => v !== null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };

    // cost_per_mile
    let costPerMile: number | null = null;
    const monthOdo = odoReadings.filter((r) => r.date === month);
    if (monthOdo.length >= 2) {
      const first = monthOdo[0].odometer;
      const last = monthOdo[monthOdo.length - 1].odometer;
      const miles = last - first;
      const totalCost = rows
        .filter((r) => r.cost != null)
        .reduce((sum, r) => sum + Number(r.cost), 0);
      if (miles > 0 && totalCost > 0) {
        costPerMile = totalCost / miles;
      }
    }

    // MPG and GPM — average of per-fill-up values assigned to this month
    const monthEfficiency = fillEfficiency.filter((e) => e.month === month);
    let mpg: number | null = null;
    let gpm: number | null = null;
    if (monthEfficiency.length > 0) {
      mpg = monthEfficiency.reduce((s, e) => s + e.mpg, 0) / monthEfficiency.length;
      gpm = monthEfficiency.reduce((s, e) => s + e.gpm, 0) / monthEfficiency.length;
    }

    result.push({
      date: `${month}-01`,
      cost: avg("cost"),
      gallons: avg("gallons"),
      odometer: avg("odometer"),
      pricePerGallon: avg("pricePerGallon"),
      costPerMile,
      mpg,
      gpm,
    });
  }

  return result;
}
