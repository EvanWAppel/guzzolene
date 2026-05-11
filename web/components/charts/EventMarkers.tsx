import { ReferenceLine } from "recharts";
import type { WorldEvent } from "@/lib/db/schema";

interface EventMarkersProps {
  events: WorldEvent[];
}

// 4 staggered y-positions for labels to avoid overlap, matching Python's _LABEL_Y_POSITIONS
const Y_POSITIONS = ["95%", "75%", "55%", "35%"];

export default function EventMarkers({ events }: EventMarkersProps) {
  return (
    <>
      {events.map((evt, i) => (
        <ReferenceLine
          key={evt.id}
          x={evt.date.slice(0, 7) + "-01"} // normalize to month start
          stroke="#9CA3AF"
          strokeDasharray="4 3"
          strokeWidth={1}
          label={{
            value: evt.name,
            position: "insideTopLeft",
            angle: -90,
            fontSize: 10,
            fill: "#6B7280",
            offset: parseInt(Y_POSITIONS[i % Y_POSITIONS.length]),
          }}
        />
      ))}
    </>
  );
}
