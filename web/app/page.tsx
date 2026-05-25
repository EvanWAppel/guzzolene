import { listOwnerPurchases } from "@/actions/purchases";
import { listOwnerEvents } from "@/actions/events";
import { monthlyAvg } from "@/lib/aggregations";
import { getMonthlyOilPrices } from "@/lib/oil-prices";
import { parseDateRange, filterByRange, type SearchParams } from "@/lib/filters";
import OverviewGrid from "@/components/charts/OverviewGrid";
import PricePerGallonChart from "@/components/charts/PricePerGallonChart";
import CostPerMileChart from "@/components/charts/CostPerMileChart";
import MpgChart from "@/components/charts/MpgChart";
import GpmChart from "@/components/charts/GpmChart";
import HomeNav from "@/components/HomeNav";
import DateRangeFilter from "@/components/DateRangeFilter";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const range = parseDateRange(params);

  const [purchases, events] = await Promise.all([
    listOwnerPurchases(),
    listOwnerEvents(),
  ]);

  const monthly = monthlyAvg(purchases, range ?? undefined);
  const filteredEvents = filterByRange(events, range);

  const dates = monthly.map((m) => m.date);
  const oilPrices =
    dates.length >= 2
      ? await getMonthlyOilPrices(dates[0], dates[dates.length - 1])
      : [];

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <h1 className="font-bold text-lg">⛽ Gas Economics</h1>
        <HomeNav />
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Owner&apos;s Gas History</h2>
          <p className="text-muted-foreground text-sm">
            {purchases.length} fill-ups tracked since{" "}
            {purchases[0]?.date ?? "N/A"}. Monthly averages shown.
          </p>
        </div>

        <DateRangeFilter />

        <OverviewGrid data={monthly} events={filteredEvents} />

        <PricePerGallonChart data={monthly} events={filteredEvents} />

        <CostPerMileChart data={monthly} oilPrices={oilPrices} events={filteredEvents} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MpgChart data={monthly} events={filteredEvents} />
          <GpmChart data={monthly} events={filteredEvents} />
        </div>
      </main>
    </div>
  );
}
