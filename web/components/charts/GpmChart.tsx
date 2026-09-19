"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
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

// EPA combined 31 mpg → 100/31 ≈ 3.23 gp100m
const EPA_GPM = parseFloat((100 / 31).toFixed(2));

export default function GpmChart({ data, events }: Props) {
  const validPoints = data.filter((d) => d.gpm != null);
  const overallAvg =
    validPoints.length > 0
      ? validPoints.reduce((s, d) => s + d.gpm!, 0) / validPoints.length
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          Gallons per 100 Miles (GP100M)
          {overallAvg && (
            <span className="ml-3 text-sm font-normal text-muted-foreground">
              avg {overallAvg.toFixed(2)} · EPA {EPA_GPM} gp100m
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Lower is more efficient. Unlike MPG, this scale is linear — a 1-unit improvement always means the same fuel saving.
        </p>
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
              tickFormatter={(v) => `${Number(v).toFixed(2)}`}
              tick={{ fontSize: 11 }}
              domain={["auto", "auto"]}
              label={{ value: "gal/100mi", angle: -90, position: "insideLeft", fontSize: 11, fill: "#88867f" }}
            />
            <Tooltip
              labelFormatter={(l) => l.slice(0, 7)}
              formatter={(v) => [`${Number(v ?? 0).toFixed(2)} gal/100mi`, "GP100M"]}
            />
            <ReferenceLine
              y={EPA_GPM}
              stroke="#88867f"
              strokeDasharray="6 3"
              label={{ value: `EPA ${EPA_GPM}`, position: "insideTopRight", fontSize: 10, fill: "#88867f" }}
            />
            {overallAvg && (
              <ReferenceLine
                y={overallAvg}
                stroke="#b06b32"
                strokeDasharray="4 3"
                strokeWidth={1}
                label={{ value: `avg ${overallAvg.toFixed(2)}`, position: "insideTopLeft", fontSize: 10, fill: "#b06b32" }}
              />
            )}
            <Line
              type="monotone"
              dataKey="gpm"
              stroke="#78794b"
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
