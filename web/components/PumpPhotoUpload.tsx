"use client";

import { useState, useRef } from "react";
import { createPurchase } from "@/actions/purchases";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface ExtractedData {
  cost: number | null;
  gallons: number | null;
  pricePerGallon: number | null;
  date: string | null;
}

export default function PumpPhotoUpload() {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form field state
  const [date, setDate] = useState("");
  const [cost, setCost] = useState("");
  const [gallons, setGallons] = useState("");
  const [pricePerGallon, setPricePerGallon] = useState("");
  const [odometer, setOdometer] = useState("");
  const [fuelGrade, setFuelGrade] = useState("87");

  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      // Upload to Vercel Blob via our API route
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-photo", { method: "POST", body: fd });
      const { url } = await res.json();
      setPhotoUrl(url);

      // Ask Claude to extract the data
      setExtracting(true);
      const extractRes = await fetch("/api/extract-pump", {
        method: "POST",
        body: JSON.stringify({ url }),
        headers: { "Content-Type": "application/json" },
      });
      const data: ExtractedData = await extractRes.json();
      setExtracted(data);

      // Pre-fill form
      if (data.date) setDate(data.date);
      if (data.cost) setCost(String(data.cost));
      if (data.gallons) setGallons(String(data.gallons));
      if (data.pricePerGallon) setPricePerGallon(String(data.pricePerGallon));
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  }

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
    if (photoUrl) fd.set("pumpPhotoUrl", photoUrl);
    try {
      await createPurchase(fd);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-3">
          <p className="text-lg font-medium">Fill-up logged!</p>
          <Button onClick={() => { setSaved(false); setPhotoUrl(null); setExtracted(null); setDate(""); setCost(""); setGallons(""); setPricePerGallon(""); setOdometer(""); setFuelGrade("87"); }}>
            Log Another
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Drop zone */}
      <div
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {uploading ? (
          <p className="text-muted-foreground">Uploading…</p>
        ) : extracting ? (
          <p className="text-muted-foreground">Extracting data with Claude…</p>
        ) : photoUrl ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="pump" className="max-h-40 mx-auto rounded" />
            {extracted && (
              <p className="text-xs text-green-600">✓ Data extracted — review below</p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <p className="font-medium">Drop pump photo here</p>
            <p className="text-sm text-muted-foreground">or click to select</p>
          </div>
        )}
      </div>

      {/* Form fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cost">Total Cost ($)</Label>
          <Input id="cost" type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="45.00" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="gallons">Gallons</Label>
          <Input id="gallons" type="number" step="0.001" value={gallons} onChange={(e) => setGallons(e.target.value)} placeholder="12.345" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ppg">Price per Gallon ($)</Label>
          <Input id="ppg" type="number" step="0.001" value={pricePerGallon} onChange={(e) => setPricePerGallon(e.target.value)} placeholder="3.649" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="odo">Odometer (mi)</Label>
          <Input id="odo" type="number" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="52000" />
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

      <Button type="submit" disabled={!date || saving} className="w-full">
        {saving ? "Saving…" : "Save Fill-up"}
      </Button>
    </form>
  );
}
