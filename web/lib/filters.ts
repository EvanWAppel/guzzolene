export interface DateRange {
  from?: Date;
  to?: Date;
}

export type SearchParams = Record<string, string | string[] | undefined>;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function firstString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function parseIso(v: string | undefined): Date | undefined {
  if (!v || !ISO_DATE_RE.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

export function parseDateRange(params: SearchParams): DateRange | null {
  const from = parseIso(firstString(params.from));
  const to = parseIso(firstString(params.to));
  if (!from && !to) return null;
  return { from, to };
}

export function isDefaultRange(params: SearchParams): boolean {
  return parseDateRange(params) === null;
}

export const RANGE_PRESETS = ["30d", "90d", "1y", "all"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

/** Compute the {from, to} for a named preset relative to `now`. */
export function presetRange(preset: RangePreset, now: Date = new Date()): DateRange {
  if (preset === "all") return {};
  const days = preset === "30d" ? 30 : preset === "90d" ? 90 : 365;
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - days);
  return { from, to: now };
}

/** Filter any items with a `date: string` field by a DateRange (null = no filter). */
export function filterByRange<T extends { date: string }>(items: T[], range: DateRange | null): T[] {
  if (!range) return items;
  return items.filter((i) => {
    const d = new Date(`${i.date}T00:00:00Z`);
    if (range.from && d < range.from) return false;
    if (range.to && d > range.to) return false;
    return true;
  });
}
