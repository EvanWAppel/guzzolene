import { ReferenceLine } from "recharts";
import type { WorldEvent } from "@/lib/db/schema";

interface EventMarkersProps {
  events: WorldEvent[];
  yAxisId?: string;
}

export default function EventMarkers({ events, yAxisId }: EventMarkersProps) {
  return (
    <>
      {events.map((evt, i) => (
        <ReferenceLine
          key={evt.id}
          x={evt.date.slice(0, 7) + "-01"}
          {...(yAxisId ? { yAxisId } : {})}
          stroke="#aaa99d"
          strokeDasharray="3 5"
          strokeWidth={1}
          label={{
            value: String(i + 1).padStart(2, "0"),
            position: "insideTopLeft",
            fontSize: 9,
            fill: "#6b6c62",
            offset: 8 + (i % 3) * 16,
          }}
        />
      ))}
    </>
  );
}

export function EventKey({ events }: { events: WorldEvent[] }) {
  if (!events.length) return null;
  return (
    <details className="event-key">
      <summary>{events.length} world events · view context</summary>
      <ol>
        {events.map((event, i) => (
          <li key={event.id}><span>{String(i + 1).padStart(2, "0")}</span><time dateTime={event.date}>{event.date}</time><span>{event.name}</span></li>
        ))}
      </ol>
    </details>
  );
}
