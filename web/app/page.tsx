import { listPublicPurchases } from "@/lib/public-data";
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
import ShowcaseHero from "@/components/ShowcaseHero";
import TechBadges from "@/components/TechBadges";
import ArchitectureDiagram from "@/components/ArchitectureDiagram";
import CaseStudy from "@/components/CaseStudy";
import SiteFooter from "@/components/SiteFooter";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const range = parseDateRange(params);

  const [purchases, events] = await Promise.all([
    listPublicPurchases(),
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
        <span className="font-bold text-lg">⛽ Guzzolene</span>
        <HomeNav />
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        <ShowcaseHero
          totalFills={purchases.length}
          since={purchases[0]?.date ?? null}
        />

        <DateRangeFilter />

        <OverviewGrid data={monthly} events={filteredEvents} />

        <PricePerGallonChart data={monthly} events={filteredEvents} />

        <CostPerMileChart data={monthly} oilPrices={oilPrices} events={filteredEvents} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MpgChart data={monthly} events={filteredEvents} />
          <GpmChart data={monthly} events={filteredEvents} />
        </div>

        {/* Case study (below the fold) — PRD §5.4.1 */}
        <CaseStudy />
        <div className="grid gap-10 sm:grid-cols-2 border-t pt-10">
          <TechBadges />
          <ArchitectureDiagram />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
