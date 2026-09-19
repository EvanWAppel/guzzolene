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
  compact?: boolean;
}

export default function CostChart({ data, events, compact }: Props) {
  return (
    <Card>
      <CardHeader className={compact ? "pb-2" : undefined}>
        <CardTitle role="heading" aria-level={2} className={compact ? "text-sm" : undefined}>Average Fill-up Cost ($)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={compact ? 180 : 280}>
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
              tickFormatter={(v) => `$${v.toFixed(0)}`}
              tick={{ fontSize: 11 }}
              domain={["auto", "auto"]}
            />
            <Tooltip
              labelFormatter={(l) => l.slice(0, 7)}
              formatter={(v) => [`$${Number(v ?? 0).toFixed(2)}`, "Cost"]}
            />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="#3e646b"
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
