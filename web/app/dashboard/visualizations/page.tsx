import { listUserPurchases } from "@/actions/purchases";
import { listUserEvents } from "@/actions/events";
import { monthlyAvg } from "@/lib/aggregations";
import { getMonthlyOilPrices } from "@/lib/oil-prices";
import { parseDateRange, filterByRange, type SearchParams } from "@/lib/filters";
import OverviewGrid from "@/components/charts/OverviewGrid";
import PricePerGallonChart from "@/components/charts/PricePerGallonChart";
import CostPerMileChart from "@/components/charts/CostPerMileChart";
import MpgChart from "@/components/charts/MpgChart";
import GpmChart from "@/components/charts/GpmChart";
import EventSearch from "@/components/EventSearch";
import DateRangeFilter from "@/components/DateRangeFilter";

export default async function VisualizationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const range = parseDateRange(params);

  const [purchases, events] = await Promise.all([
    listUserPurchases(),
    listUserEvents(),
  ]);

  const monthly = monthlyAvg(purchases, range ?? undefined);
  const filteredEvents = filterByRange(events, range);
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

      <DateRangeFilter />

      <OverviewGrid data={monthly} events={filteredEvents} />
      <PricePerGallonChart data={monthly} events={filteredEvents} />
      <CostPerMileChart data={monthly} oilPrices={oilPrices} events={filteredEvents} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MpgChart data={monthly} events={filteredEvents} />
        <GpmChart data={monthly} events={filteredEvents} />
      </div>
    </div>
  );
}
