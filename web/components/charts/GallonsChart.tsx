"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyPoint } from "@/lib/aggregations";
import type { WorldEvent } from "@/lib/db/schema";
import EventMarkers from "./EventMarkers";

interface Props {
  data: MonthlyPoint[];
  events: WorldEvent[];
  compact?: boolean;
}

export default function GallonsChart({ data, events, compact }: Props) {
  return (
    <Card>
      <CardHeader className={compact ? "pb-2" : undefined}>
        <CardTitle className={compact ? "text-sm" : undefined}>Gallons Pumped</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={compact ? 180 : 280}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => d.slice(0, 7)}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v) => v.toFixed(1)}
              tick={{ fontSize: 11 }}
              domain={["auto", "auto"]}
            />
            <Tooltip
              labelFormatter={(l) => l.slice(0, 7)}
              formatter={(v) => [Number(v ?? 0).toFixed(2), "Gallons"]}
            />
            <Line
              type="monotone"
              dataKey="gallons"
              stroke="#4CAF50"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <EventMarkers events={events} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
