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

// Mazda 3 Sport EPA rating: 28 city / 36 highway / 31 combined
const EPA_COMBINED = 31;

export default function MpgChart({ data, events }: Props) {
  const validPoints = data.filter((d) => d.mpg != null);
  const overallAvg =
    validPoints.length > 0
      ? validPoints.reduce((s, d) => s + d.mpg!, 0) / validPoints.length
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          Miles per Gallon (MPG)
          {overallAvg && (
            <span className="ml-3 text-sm font-normal text-muted-foreground">
              avg {overallAvg.toFixed(1)} mpg · EPA combined {EPA_COMBINED} mpg
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
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
              tickFormatter={(v) => `${v.toFixed(0)}`}
              tick={{ fontSize: 11 }}
              domain={["auto", "auto"]}
              label={{ value: "mpg", angle: -90, position: "insideLeft", fontSize: 11, fill: "#88867f" }}
            />
            <Tooltip
              labelFormatter={(l) => l.slice(0, 7)}
              formatter={(v) => [`${Number(v ?? 0).toFixed(1)} mpg`, "MPG"]}
            />
            {/* EPA combined reference line */}
            <ReferenceLine
              y={EPA_COMBINED}
              stroke="#88867f"
              strokeDasharray="6 3"
              label={{ value: "EPA 31", position: "insideTopRight", fontSize: 10, fill: "#88867f" }}
            />
            {/* Personal average */}
            {overallAvg && (
              <ReferenceLine
                y={overallAvg}
                stroke="#b06b32"
                strokeDasharray="4 3"
                strokeWidth={1}
                label={{ value: `avg ${overallAvg.toFixed(1)}`, position: "insideBottomRight", fontSize: 10, fill: "#b06b32" }}
              />
            )}
            <Line
              type="monotone"
              dataKey="mpg"
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
