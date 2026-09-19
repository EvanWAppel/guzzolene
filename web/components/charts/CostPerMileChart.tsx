"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyPoint } from "@/lib/aggregations";
import type { WorldEvent } from "@/lib/db/schema";
import type { OilPricePoint } from "@/lib/oil-prices";
import EventMarkers, { EventKey } from "./EventMarkers";

interface Props {
  data: MonthlyPoint[];
  oilPrices: OilPricePoint[];
  events: WorldEvent[];
}

export default function CostPerMileChart({ data, oilPrices, events }: Props) {
  // Merge monthly gas data with oil prices by date key
  const oilMap = new Map(oilPrices.map((o) => [o.date, o.price]));
  const merged = data
    .filter((d) => d.costPerMile != null && d.costPerMile > 0 && d.costPerMile < 1)
    .map((d) => ({
      ...d,
      oilPrice: oilMap.get(d.date) ?? null,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>Cost per Mile vs. WTI Crude Oil</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={merged} margin={{ top: 5, right: 40, left: 0, bottom: 5 }}>
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
            {/* Left axis — cost/mile */}
            <YAxis
              axisLine={false}
              tickLine={false}
              yAxisId="left"
              tickFormatter={(v) => `$${v.toFixed(2)}`}
              tick={{ fontSize: 11, fill: "#d94730" }}
              domain={["auto", "auto"]}
            />
            {/* Right axis — WTI crude */}
            <YAxis
              axisLine={false}
              tickLine={false}
              yAxisId="right"
              orientation="right"
              tickFormatter={(v) => `$${v.toFixed(0)}`}
              tick={{ fontSize: 11, fill: "#3e646b" }}
              domain={["auto", "auto"]}
            />
            <Tooltip
              labelFormatter={(l) => l.slice(0, 7)}
              formatter={(v, name) => {
                const n = Number(v ?? 0);
                return name === "WTI Crude"
                  ? [`$${n.toFixed(2)}/bbl`, "WTI Crude"]
                  : [`$${n.toFixed(3)}/mi`, "Cost/mile"];
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="costPerMile"
              stroke="#d94730"
              strokeWidth={2}
              dot={false}
              connectNulls
              name="Cost/mile"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="oilPrice"
              stroke="#3e646b"
              strokeWidth={1.5}
              dot={false}
              opacity={0.75}
              connectNulls
              name="WTI Crude"
            />
            <EventMarkers events={events} yAxisId="left" />
          </ComposedChart>
        </ResponsiveContainer>
        <EventKey events={events} />
      </CardContent>
    </Card>
  );
}
