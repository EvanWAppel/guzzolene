import { listOwnerPurchases } from "@/actions/purchases";
import { listOwnerEvents } from "@/actions/events";
import { monthlyAvg } from "@/lib/aggregations";
import { getMonthlyOilPrices } from "@/lib/oil-prices";
import OverviewGrid from "@/components/charts/OverviewGrid";
import PricePerGallonChart from "@/components/charts/PricePerGallonChart";
import CostPerMileChart from "@/components/charts/CostPerMileChart";
import HomeNav from "@/components/HomeNav";

export const revalidate = 3600;

export default async function HomePage() {
  const [purchases, events] = await Promise.all([
    listOwnerPurchases(),
    listOwnerEvents(),
  ]);

  const monthly = monthlyAvg(purchases);

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

        <OverviewGrid data={monthly} events={events} />

        <PricePerGallonChart data={monthly} events={events} />

        <CostPerMileChart data={monthly} oilPrices={oilPrices} events={events} />
      </main>
    </div>
  );
}
