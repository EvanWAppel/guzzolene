"use client";

import type { MonthlyPoint } from "@/lib/aggregations";
import type { WorldEvent } from "@/lib/db/schema";
import CostChart from "./CostChart";
import GallonsChart from "./GallonsChart";

interface Props {
  data: MonthlyPoint[];
  events: WorldEvent[];
}

// Supporting purchase metrics; price gets its own full-width panel.
export default function OverviewGrid({ data, events }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <CostChart data={data} events={events} compact />
      <GallonsChart data={data} events={events} compact />
    </div>
  );
}
