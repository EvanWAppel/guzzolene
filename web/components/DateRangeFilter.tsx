"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { presetRange, type RangePreset } from "@/lib/filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  const rangeDays = from && to
    ? Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
    : null;

  function pushParams(next: { from?: string; to?: string }) {
    const sp = new URLSearchParams();
    if (next.from) sp.set("from", next.from);
    if (next.to) sp.set("to", next.to);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function clickPreset(p: RangePreset) {
    const r = presetRange(p);
    if (!r.from || !r.to) {
      pushParams({});
      return;
    }
    pushParams({ from: toIsoDate(r.from), to: toIsoDate(r.to) });
  }

  return (
    <div className="date-range-filter flex flex-wrap items-end gap-3">
      <span className="eyebrow filter-caption">VIEW THE JOURNAL</span>
      <div className="range-presets flex gap-1" aria-label="Date range presets">
        <Button variant="outline" size="sm" className="min-h-11 px-4" aria-pressed={rangeDays === 30} onClick={() => clickPreset("30d")}>30d</Button>
        <Button variant="outline" size="sm" className="min-h-11 px-4" aria-pressed={rangeDays === 90} onClick={() => clickPreset("90d")}>90d</Button>
        <Button variant="outline" size="sm" className="min-h-11 px-4" aria-pressed={rangeDays === 365} onClick={() => clickPreset("1y")}>1y</Button>
        <Button variant="outline" size="sm" className="min-h-11 px-4" aria-pressed={!from && !to} onClick={() => clickPreset("all")}>All</Button>
      </div>
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="filter-from" className="text-xs">From</Label>
          <Input
            id="filter-from"
            type="date"
            value={from}
            onChange={(e) => pushParams({ from: e.target.value || undefined, to: to || undefined })}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="filter-to" className="text-xs">To</Label>
          <Input
            id="filter-to"
            type="date"
            value={to}
            onChange={(e) => pushParams({ from: from || undefined, to: e.target.value || undefined })}
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}
