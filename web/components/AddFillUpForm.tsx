"use client";

import { useEffect, useState } from "react";
import { createPurchase } from "@/actions/purchases";
import { saveDraft } from "@/lib/offline-outbox";
import type { DemoDraft } from "@/lib/demo-overlay";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

/* Ask the service worker to replay the outbox when connectivity returns
 * (D-8). Feature-detected: browsers without SyncManager fall back to the
 * online-event trigger in OutboxSync. */
async function registerBackgroundSync() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  if ("sync" in reg) {
    await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } })
      .sync.register("drain-outbox");
  }
}

/**
 * Read a photo into base64 for the extract-and-discard endpoint. Uses
 * `arrayBuffer()` + `btoa` (deterministic in jsdom) rather than FileReader.
 */
async function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return { data: btoa(binary), mediaType: file.type || "image/jpeg" };
}

/** Shape returned by /api/extract-pump — every field optional (see lib/pump-extract). */
type ExtractedPumpFields = {
  gallons?: number;
  pricePerGallon?: number;
  totalCost?: number;
  odometer?: number;
  fuelGrade?: string;
};

/**
 * `onDemoSubmit`, when provided, switches the form into demo mode (PRD §5.4.3):
 * submits go to the caller's sandbox handler instead of the server/offline path,
 * and captured geolocation is deliberately discarded (never passed on) — G-23.
 */
export default function AddFillUpForm({
  onDemoSubmit,
}: {
  onDemoSubmit?: (draft: DemoDraft) => void | Promise<void>;
} = {}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [queued, setQueued] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

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

  /**
   * Photo-assisted entry (H): send the photo to the auth-gated extract-and-discard
   * endpoint and pre-fill the form with EDITABLE drafts. On failure, surface a
   * visible error and leave the user in manual entry — nothing is stored. Only
   * available in the real authed form (never in demo mode).
   */
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file later.
    e.target.value = "";
    if (!file) return;

    setExtractError(null);
    setExtracting(true);
    try {
      const { data, mediaType } = await fileToBase64(file);
      const res = await fetch("/api/extract-pump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: data, mediaType }),
      });
      if (!res.ok) {
        throw new Error(`Extraction failed (${res.status})`);
      }
      const fields = (await res.json()) as ExtractedPumpFields;
      // Only fill fields the model actually returned — leave the rest for manual entry.
      if (fields.totalCost != null) setCost(String(fields.totalCost));
      if (fields.gallons != null) setGallons(String(fields.gallons));
      if (fields.pricePerGallon != null) setPricePerGallon(String(fields.pricePerGallon));
      if (fields.odometer != null) setOdometer(String(fields.odometer));
      if (fields.fuelGrade) setFuelGrade(fields.fuelGrade);
    } catch {
      // Surface it to the user (visible), then fall back to manual entry.
      setExtractError(
        "Couldn't read that photo. Enter the fill-up details manually below.",
      );
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (onDemoSubmit) {
        // Demo mode: write to the sandbox, never the server. Location is
        // discarded here (G-23) — coords are intentionally not forwarded.
        await onDemoSubmit({
          date,
          cost: cost || null,
          gallons: gallons || null,
          pricePerGallon: pricePerGallon || null,
          odometer: odometer ? parseInt(odometer) : null,
          fuelGrade,
        });
        setSaved(true);
        return;
      }
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        await saveDraft({
          date,
          cost,
          gallons,
          pricePerGallon,
          odometer,
          fuelGrade,
          lat: coords?.lat,
          lng: coords?.lng,
        });
        setQueued(true);
        setSaved(true);
        await registerBackgroundSync();
        return;
      }
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
      await createPurchase(fd);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setSaved(false);
    setQueued(false);
    setExtractError(null);
    setExtracting(false);
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
          <p className="text-lg font-medium">{queued ? "Fill-up queued!" : "Fill-up logged!"}</p>
          {queued && (
            <p className="text-sm text-muted-foreground">Queued — will sync when online</p>
          )}
          <Button onClick={reset}>Log Another</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Photo-assisted entry — only in the real authed form, never in demo (§5.4.3). */}
      {!onDemoSubmit && (
        <div className="space-y-2 rounded-lg border border-border/60 p-3">
          <Label htmlFor="pump-photo">Scan pump display or receipt (optional)</Label>
          <Input
            id="pump-photo"
            type="file"
            accept="image/*"
            capture="environment"
            disabled={extracting}
            onChange={handlePhoto}
          />
          <p className="text-xs text-muted-foreground">
            We read the numbers off the photo to pre-fill the form — the image is
            never saved. Review the values before saving.
          </p>
          {extracting && (
            <p className="text-sm text-muted-foreground" role="status">
              Reading photo…
            </p>
          )}
          {extractError && (
            <p className="text-sm text-destructive" role="alert">
              {extractError}
            </p>
          )}
        </div>
      )}

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
