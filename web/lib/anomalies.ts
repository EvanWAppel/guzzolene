/**
 * Statistical MPG anomaly detection (PRD §5.6, DECISIONS.md D-3).
 *
 * Pure, deterministic, no external calls, no LLM, no API key. Given a time-ordered
 * numeric series, flag points that depart meaningfully from a *trailing* rolling
 * baseline using a z-score threshold. The trailing (not centered) window means a
 * point is judged only against the readings that preceded it — the way a driver
 * experiences a change.
 *
 * The functions here are unit-tested against fixtured series; the MPG/GPM chart
 * consumes the result and renders the plain-language annotation.
 */

export interface AnomalyInput {
  /** "YYYY-MM-01" (or any ISO date); carried through onto the flagged result. */
  date: string;
  /** The metric value (e.g. monthly-average MPG). Null points are skipped. */
  value: number | null;
}

export interface Anomaly {
  /** Index into the ORIGINAL input array (null points included in the count). */
  index: number;
  date: string;
  value: number;
  /** Mean of the trailing baseline window this point was compared against. */
  baselineMean: number;
  /** How many trailing points formed the baseline (≤ `window`). */
  baselineSize: number;
  /** Signed percent deviation from the baseline mean, rounded to a whole number. */
  deltaPct: number;
  /** "below" when the value fell short of the baseline, "above" when it exceeded it. */
  direction: "below" | "above";
  /** Z-score of the value against the trailing baseline. */
  z: number;
}

export interface AnomalyOptions {
  /** Trailing window size. Default 6. */
  window?: number;
  /** Absolute z-score at or beyond which a point is flagged. Default 2. */
  zThreshold?: number;
  /** Minimum trailing points required before any point can be flagged. Default 3. */
  minBaseline?: number;
}

export const DEFAULT_ANOMALY_OPTIONS: Required<AnomalyOptions> = {
  window: 6,
  zThreshold: 2,
  minBaseline: 3,
};

/** Population standard deviation of a non-empty numeric array. */
function stdev(values: number[], mean: number): number {
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function detectAnomalies(
  series: AnomalyInput[],
  options: AnomalyOptions = {},
): Anomaly[] {
  const window = options.window ?? DEFAULT_ANOMALY_OPTIONS.window;
  const zThreshold = options.zThreshold ?? DEFAULT_ANOMALY_OPTIONS.zThreshold;
  const minBaseline = options.minBaseline ?? DEFAULT_ANOMALY_OPTIONS.minBaseline;

  const anomalies: Anomaly[] = [];
  // Trailing baseline of the most recent valid values, oldest → newest.
  const trailing: number[] = [];

  for (let i = 0; i < series.length; i++) {
    const value = series[i].value;
    if (value == null) continue;

    if (trailing.length >= minBaseline) {
      const baseline = trailing.slice(-window);
      const mean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
      const sd = stdev(baseline, mean);

      // z: 0 when the value matches a flat baseline exactly; ±Infinity when a flat
      // baseline is broken by any other value (both handled without NaN).
      let z: number;
      if (sd === 0) {
        z = value === mean ? 0 : (value > mean ? Infinity : -Infinity);
      } else {
        z = (value - mean) / sd;
      }

      if (Math.abs(z) >= zThreshold) {
        const deltaPct = mean === 0 ? 0 : Math.round(((value - mean) / mean) * 100);
        anomalies.push({
          index: i,
          date: series[i].date,
          value,
          baselineMean: mean,
          baselineSize: baseline.length,
          deltaPct,
          direction: value < mean ? "below" : "above",
          z,
        });
      }
    }

    trailing.push(value);
    if (trailing.length > window) trailing.shift();
  }

  return anomalies;
}
