"use client";

import { useState, useTransition } from "react";
import type { GasPurchase } from "@/lib/db/schema";
import { deletePurchase, updatePurchase } from "@/actions/purchases";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecentFills({ purchases }: { purchases: GasPurchase[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (purchases.length === 0) return null;

  const recent = [...purchases]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Recent Fill-ups
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {recent.map((p) =>
            editingId === p.id ? (
              <EditRow key={p.id} purchase={p} onDone={() => setEditingId(null)} />
            ) : (
              <Row key={p.id} purchase={p} onEdit={() => setEditingId(p.id)} />
            ),
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

function Row({ purchase, onEdit }: { purchase: GasPurchase; onEdit: () => void }) {
  const [pending, start] = useTransition();
  function handleDelete() {
    if (!window.confirm(`Delete fill-up from ${purchase.date}?`)) return;
    start(async () => {
      await deletePurchase(purchase.id);
    });
  }
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
      <span className="font-mono">{purchase.date}</span>
      <span>${Number(purchase.cost ?? 0).toFixed(2)}</span>
      <span>{Number(purchase.gallons ?? 0).toFixed(2)} gal</span>
      <span className="text-muted-foreground">{purchase.odometer ?? "—"} mi</span>
      <span className="rounded bg-muted px-2 py-0.5 text-xs">{purchase.fuelGrade}</span>
      <div className="ml-auto flex gap-1">
        <Button size="sm" variant="outline" onClick={onEdit} disabled={pending}>
          Edit
        </Button>
        <Button size="sm" variant="outline" onClick={handleDelete} disabled={pending}>
          {pending ? "…" : "Delete"}
        </Button>
      </div>
    </li>
  );
}

function EditRow({ purchase, onDone }: { purchase: GasPurchase; onDone: () => void }) {
  const [date, setDate] = useState(purchase.date);
  const [cost, setCost] = useState(purchase.cost ?? "");
  const [gallons, setGallons] = useState(purchase.gallons ?? "");
  const [pricePerGallon, setPpg] = useState(purchase.pricePerGallon ?? "");
  const [odometer, setOdometer] = useState(
    purchase.odometer === null ? "" : String(purchase.odometer),
  );
  const [fuelGrade, setFuelGrade] = useState(purchase.fuelGrade);
  const [pending, start] = useTransition();

  function handleSave() {
    start(async () => {
      await updatePurchase(purchase.id, {
        date,
        cost: cost || null,
        gallons: gallons || null,
        pricePerGallon: pricePerGallon || null,
        odometer: odometer ? parseInt(odometer) : null,
        fuelGrade,
      });
      onDone();
    });
  }

  return (
    <li className="grid grid-cols-2 gap-2 py-3 text-sm sm:grid-cols-3">
      <div className="space-y-1">
        <Label htmlFor={`date-${purchase.id}`} className="text-xs">Date</Label>
        <Input
          id={`date-${purchase.id}`}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-8"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`cost-${purchase.id}`} className="text-xs">Cost</Label>
        <Input
          id={`cost-${purchase.id}`}
          inputMode="decimal"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          className="h-8"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`gal-${purchase.id}`} className="text-xs">Gallons</Label>
        <Input
          id={`gal-${purchase.id}`}
          inputMode="decimal"
          value={gallons}
          onChange={(e) => setGallons(e.target.value)}
          className="h-8"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`ppg-${purchase.id}`} className="text-xs">$/gal</Label>
        <Input
          id={`ppg-${purchase.id}`}
          inputMode="decimal"
          value={pricePerGallon}
          onChange={(e) => setPpg(e.target.value)}
          className="h-8"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`odo-${purchase.id}`} className="text-xs">Odometer</Label>
        <Input
          id={`odo-${purchase.id}`}
          inputMode="decimal"
          value={odometer}
          onChange={(e) => setOdometer(e.target.value)}
          className="h-8"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`grade-${purchase.id}`} className="text-xs">Grade</Label>
        <select
          id={`grade-${purchase.id}`}
          value={fuelGrade}
          onChange={(e) => setFuelGrade(e.target.value)}
          className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="87">87</option>
          <option value="89">89</option>
          <option value="91">91</option>
          <option value="93">93</option>
          <option value="diesel">diesel</option>
        </select>
      </div>
      <div className="col-span-2 sm:col-span-3 flex justify-end gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={pending}>
          {pending ? "…" : "Save"}
        </Button>
      </div>
    </li>
  );
}
