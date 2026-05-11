"use client";

import type { MonthlyPoint } from "@/lib/aggregations";
import type { WorldEvent } from "@/lib/db/schema";
import CostChart from "./CostChart";
import GallonsChart from "./GallonsChart";
import PricePerGallonChart from "./PricePerGallonChart";

interface Props {
  data: MonthlyPoint[];
  events: WorldEvent[];
}

// 2×2 overview grid matching the Python plot_all() figure
export default function OverviewGrid({ data, events }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <CostChart data={data} events={events} compact />
      <GallonsChart data={data} events={events} compact />
      <PricePerGallonChart data={data} events={events} />
      {/* The 4th panel — odometer — is less interesting interactively, use price again */}
      <div className="md:col-span-1" />
    </div>
  );
}
