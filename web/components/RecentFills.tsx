import type { GasPurchase } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecentFills({ purchases }: { purchases: GasPurchase[] }) {
  if (purchases.length === 0) return null;

  const recent = [...purchases]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Recent Fill-ups
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {recent.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2 text-sm">
              <span className="font-mono">{p.date}</span>
              <span>${Number(p.cost ?? 0).toFixed(2)}</span>
              <span>{Number(p.gallons ?? 0).toFixed(2)} gal</span>
              <span className="text-muted-foreground">{p.odometer ?? "—"} mi</span>
              <span className="rounded bg-muted px-2 py-0.5 text-xs">{p.fuelGrade}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
