import { listUserPurchases } from "@/actions/purchases";
import { listUserEvents } from "@/actions/events";
import { monthlyAvg } from "@/lib/aggregations";
import { getMonthlyOilPrices } from "@/lib/oil-prices";
import OverviewGrid from "@/components/charts/OverviewGrid";
import PricePerGallonChart from "@/components/charts/PricePerGallonChart";
import CostPerMileChart from "@/components/charts/CostPerMileChart";
import MpgChart from "@/components/charts/MpgChart";
import GpmChart from "@/components/charts/GpmChart";
import EventSearch from "@/components/EventSearch";

export default async function VisualizationsPage() {
  const [purchases, events] = await Promise.all([
    listUserPurchases(),
    listUserEvents(),
  ]);

  const monthly = monthlyAvg(purchases);
  const dates = monthly.map((m) => m.date);
  const oilPrices =
    dates.length >= 2
      ? await getMonthlyOilPrices(dates[0], dates[dates.length - 1])
      : [];

  if (purchases.length === 0) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        No data yet — log some fill-ups first.
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-start justify-between">
        <h2 className="text-2xl font-semibold">My Charts</h2>
        <EventSearch />
      </div>

      <OverviewGrid data={monthly} events={events} />
      <PricePerGallonChart data={monthly} events={events} />
      <CostPerMileChart data={monthly} oilPrices={oilPrices} events={events} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MpgChart data={monthly} events={events} />
        <GpmChart data={monthly} events={events} />
      </div>
    </div>
  );
}
