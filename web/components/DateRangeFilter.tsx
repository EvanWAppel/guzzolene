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

  function pushParams(next: { from?: string; to?: string }) {
    const sp = new URLSearchParams();
    if (next.from) sp.set("from", next.from);
    if (next.to) sp.set("to", next.to);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
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
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex gap-1">
        <Button variant="outline" size="sm" onClick={() => clickPreset("30d")}>30d</Button>
        <Button variant="outline" size="sm" onClick={() => clickPreset("90d")}>90d</Button>
        <Button variant="outline" size="sm" onClick={() => clickPreset("1y")}>1y</Button>
        <Button variant="outline" size="sm" onClick={() => clickPreset("all")}>All</Button>
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
