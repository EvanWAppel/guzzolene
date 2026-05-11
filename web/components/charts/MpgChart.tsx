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
import EventMarkers from "./EventMarkers";

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
        <CardTitle>
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
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => d.slice(0, 7)}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v) => `${v.toFixed(0)}`}
              tick={{ fontSize: 11 }}
              domain={["auto", "auto"]}
              label={{ value: "mpg", angle: -90, position: "insideLeft", fontSize: 11, fill: "#9CA3AF" }}
            />
            <Tooltip
              labelFormatter={(l) => l.slice(0, 7)}
              formatter={(v) => [`${Number(v ?? 0).toFixed(1)} mpg`, "MPG"]}
            />
            {/* EPA combined reference line */}
            <ReferenceLine
              y={EPA_COMBINED}
              stroke="#9CA3AF"
              strokeDasharray="6 3"
              label={{ value: "EPA 31", position: "insideTopRight", fontSize: 10, fill: "#9CA3AF" }}
            />
            {/* Personal average */}
            {overallAvg && (
              <ReferenceLine
                y={overallAvg}
                stroke="#FF9800"
                strokeDasharray="4 3"
                strokeWidth={1}
                label={{ value: `avg ${overallAvg.toFixed(1)}`, position: "insideBottomRight", fontSize: 10, fill: "#FF9800" }}
              />
            )}
            <Line
              type="monotone"
              dataKey="mpg"
              stroke="#3B82F6"
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
