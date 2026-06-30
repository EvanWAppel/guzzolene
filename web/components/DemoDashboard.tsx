"use client";

import { useEffect, useState } from "react";
import type { PublicPurchase } from "@/lib/public-data";
import type { WorldEvent } from "@/lib/db/schema";
import type { PurchasePatch } from "@/actions/purchases";
import { monthlyAvg } from "@/lib/aggregations";
import {
  loadOverlay,
  saveOverlay,
  resetOverlay,
  emptyOverlay,
  mergeOverlay,
  addToOverlay,
  editInOverlay,
  deleteFromOverlay,
  type Overlay,
  type DemoDraft,
} from "@/lib/demo-overlay";
import AddFillUpForm from "@/components/AddFillUpForm";
import RecentFills from "@/components/RecentFills";
import OverviewGrid from "@/components/charts/OverviewGrid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Read-only demo dashboard (PRD §5.4.3). Renders the real dashboard UI for an
 * anonymous visitor: reads from the server-supplied location-stripped base,
 * while add/edit/delete go to the client-side sessionStorage overlay — never the
 * server. Real data is structurally untouchable from here.
 */
export default function DemoDashboard({
  base,
  events,
}: {
  base: PublicPurchase[];
  events: WorldEvent[];
}) {
  const [overlay, setOverlay] = useState<Overlay>(() => emptyOverlay());
  const [error, setError] = useState<string | null>(null);

  // Hydrate from sessionStorage after mount (keeps SSR markup stable; applies
  // the 24h soft TTL via loadOverlay). Deferred to a microtask so the effect
  // body doesn't setState synchronously (matches OutboxSync's pattern).
  useEffect(() => {
    queueMicrotask(() => setOverlay(loadOverlay()));
  }, []);

  const merged = mergeOverlay(base, overlay);
  const monthly = monthlyAvg(merged);

  function apply(next: Overlay) {
    try {
      saveOverlay(next);
      setOverlay(next);
      setError(null);
    } catch (e) {
      // Surface storage failures (quota / private mode) — never silently drop.
      setError(e instanceof Error ? e.message : "Couldn't save to this browser session.");
    }
  }

  function handleAdd(draft: DemoDraft) {
    try {
      apply(addToOverlay(overlay, draft));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add fill-up.");
    }
  }

  function handleEdit(id: string, patch: PurchasePatch) {
    apply(editInOverlay(overlay, id, patch));
  }

  function handleDelete(id: string) {
    apply(deleteFromOverlay(overlay, id));
  }

  function handleReset() {
    resetOverlay();
    setOverlay(emptyOverlay());
    setError(null);
  }

  const totalSpent = merged.reduce((s, p) => s + Number(p.cost ?? 0), 0);
  const totalGallons = merged.reduce((s, p) => s + Number(p.gallons ?? 0), 0);
  const last = merged[merged.length - 1];

  return (
    <div className="space-y-8">
      {/* Persistent demo banner (G-22) */}
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-200"
      >
        <span>
          <strong>Read-only demo</strong> — explore the real dashboard with live
          data. Your changes aren&apos;t saved and stay only in this browser tab.
        </span>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Reset demo
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fill-ups</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{merged.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalSpent.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gallons</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalGallons.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Fill-up</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{last?.date ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Log a Fill-up (demo)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AddFillUpForm onDemoSubmit={handleAdd} />
        </CardContent>
      </Card>

      <RecentFills purchases={merged} onEditRow={handleEdit} onDeleteRow={handleDelete} />

      <OverviewGrid data={monthly} events={events} />
    </div>
  );
}
