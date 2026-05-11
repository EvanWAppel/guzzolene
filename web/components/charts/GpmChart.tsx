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
        <CardTitle>
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
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => d.slice(0, 7)}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v) => `${Number(v).toFixed(2)}`}
              tick={{ fontSize: 11 }}
              domain={["auto", "auto"]}
              label={{ value: "gal/100mi", angle: -90, position: "insideLeft", fontSize: 11, fill: "#9CA3AF" }}
            />
            <Tooltip
              labelFormatter={(l) => l.slice(0, 7)}
              formatter={(v) => [`${Number(v ?? 0).toFixed(2)} gal/100mi`, "GP100M"]}
            />
            <ReferenceLine
              y={EPA_GPM}
              stroke="#9CA3AF"
              strokeDasharray="6 3"
              label={{ value: `EPA ${EPA_GPM}`, position: "insideTopRight", fontSize: 10, fill: "#9CA3AF" }}
            />
            {overallAvg && (
              <ReferenceLine
                y={overallAvg}
                stroke="#FF9800"
                strokeDasharray="4 3"
                strokeWidth={1}
                label={{ value: `avg ${overallAvg.toFixed(2)}`, position: "insideTopLeft", fontSize: 10, fill: "#FF9800" }}
              />
            )}
            <Line
              type="monotone"
              dataKey="gpm"
              stroke="#8B5CF6"
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
