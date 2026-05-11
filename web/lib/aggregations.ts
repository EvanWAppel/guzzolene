import type { GasPurchase } from "./db/schema";

export interface MonthlyPoint {
  date: string; // "YYYY-MM-01"
  cost: number | null;
  gallons: number | null;
  odometer: number | null;
  pricePerGallon: number | null;
  costPerMile: number | null;
}

/**
 * Groups raw purchases into monthly averages, mirroring the Python utils.monthly_avg().
 * Odometer is averaged; cost/gallons/price_per_gallon are averaged across fills in that month.
 * cost_per_mile = avg(cost) / avg(miles driven between fills).
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

  // For cost_per_mile we need consecutive odometer readings
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

    // cost_per_mile: avg_cost / avg_miles_per_fill for this month
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

    result.push({
      date: `${month}-01`,
      cost: avg("cost"),
      gallons: avg("gallons"),
      odometer: avg("odometer"),
      pricePerGallon: avg("pricePerGallon"),
      costPerMile: costPerMile,
    });
  }

  return result;
}
