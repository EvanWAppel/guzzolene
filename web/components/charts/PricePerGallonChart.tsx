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
import EventMarkers, { EventKey } from "./EventMarkers";

interface Props {
  data: MonthlyPoint[];
  events: WorldEvent[];
}

export default function PricePerGallonChart({ data, events }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>Price per Gallon (Monthly Avg)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              minTickGap={36}
              tickMargin={10}
              tickFormatter={(d) => d.slice(0, 7)}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v.toFixed(2)}`}
              tick={{ fontSize: 11 }}
              domain={["auto", "auto"]}
            />
            <Tooltip
              labelFormatter={(l) => l.slice(0, 7)}
              formatter={(v) => [`$${Number(v ?? 0).toFixed(3)}`, "Price/gal"]}
            />
            <Line
              type="monotone"
              dataKey="pricePerGallon"
              stroke="#d94730"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <EventMarkers events={events} />
          </LineChart>
        </ResponsiveContainer>
        <EventKey events={events} />
      </CardContent>
    </Card>
  );
}
