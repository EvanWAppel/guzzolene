"use client";

import { useEffect, useState } from "react";
import { createPurchase } from "@/actions/purchases";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function AddFillUpForm() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [date, setDate] = useState("");
  const [cost, setCost] = useState("");
  const [gallons, setGallons] = useState("");
  const [pricePerGallon, setPricePerGallon] = useState("");
  const [odometer, setOdometer] = useState("");
  const [fuelGrade, setFuelGrade] = useState("87");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords(null),
    );
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.set("date", date);
    fd.set("cost", cost);
    fd.set("gallons", gallons);
    fd.set("pricePerGallon", pricePerGallon);
    fd.set("odometer", odometer);
    fd.set("fuelGrade", fuelGrade);
    if (coords) {
      fd.set("lat", String(coords.lat));
      fd.set("lng", String(coords.lng));
    }
    try {
      await createPurchase(fd);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setSaved(false);
    setDate("");
    setCost("");
    setGallons("");
    setPricePerGallon("");
    setOdometer("");
    setFuelGrade("87");
  }

  if (saved) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-3">
          <p className="text-lg font-medium">Fill-up logged!</p>
          <Button onClick={reset}>Log Another</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cost">Total Cost ($)</Label>
          <Input id="cost" type="number" inputMode="decimal" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="45.00" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="gallons">Gallons</Label>
          <Input id="gallons" type="number" inputMode="decimal" step="0.001" value={gallons} onChange={(e) => setGallons(e.target.value)} placeholder="12.345" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ppg">Price per Gallon ($)</Label>
          <Input id="ppg" type="number" inputMode="decimal" step="0.001" value={pricePerGallon} onChange={(e) => setPricePerGallon(e.target.value)} placeholder="3.649" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="odo">Odometer (mi)</Label>
          <Input id="odo" type="number" inputMode="decimal" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="52000" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="grade">Fuel Grade</Label>
          <select
            id="grade"
            name="fuelGrade"
            value={fuelGrade}
            onChange={(e) => setFuelGrade(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="87">87</option>
            <option value="89">89</option>
            <option value="91">91</option>
            <option value="93">93</option>
            <option value="diesel">diesel</option>
          </select>
        </div>
      </div>

      <div
        data-sticky-save
        className="sticky bottom-0 -mx-4 bg-background/95 backdrop-blur px-4 py-3 border-t border-border/40"
      >
        <Button type="submit" disabled={!date || saving} className="w-full">
          {saving ? "Saving…" : "Save Fill-up"}
        </Button>
      </div>
    </form>
  );
}
