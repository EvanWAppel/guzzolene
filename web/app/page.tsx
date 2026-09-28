import { listPublicPurchases } from "@/lib/public-data";
import { listOwnerEvents } from "@/actions/events";
import { monthlyAvg } from "@/lib/aggregations";
import { getMonthlyOilPrices } from "@/lib/oil-prices";
import { parseDateRange, filterByRange, type SearchParams } from "@/lib/filters";
import Link from "next/link";
import { ArrowUpRight, Fuel } from "lucide-react";
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
import TestStatusMarker from "@/components/TestStatusMarker";

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
    <div className="journal-site min-h-screen">
      <a href="#the-data" className="skip-link">Skip to the data</a>
      <header className="site-header">
        <div className="journal-container header-inner">
          <Link href="/" className="nav-wordmark" aria-label="Guzzolene home"><Fuel size={22} strokeWidth={2} aria-hidden />guzzolene<span className="brand-period">.</span></Link>
          <nav className="section-nav" aria-label="Sections"><a href="#the-data">The data</a><a href="#the-build">The build <ArrowUpRight size={13} aria-hidden /></a></nav>
          <HomeNav />
        </div>
      </header>

      <main className="journal-container">
        <ShowcaseHero totalFills={purchases.length} since={purchases[0]?.date ?? null} />
        <section id="the-data" className="data-section" aria-labelledby="data-heading">
          <div className="section-heading">
            <div><p className="eyebrow">01 — THE OBSERVATIONS</p><h2 id="data-heading">The price of <em>going places.</em></h2></div>
            <p>At the pump. Over time.<br />Monthly averages from a real driving life.</p>
          </div>
          <DateRangeFilter />
          {monthly.length > 0 ? (
            <div className="chart-collection">
              <div className="feature-chart"><PricePerGallonChart data={monthly} events={filteredEvents} /></div>
              <OverviewGrid data={monthly} events={filteredEvents} />
              <CostPerMileChart data={monthly} oilPrices={oilPrices} events={filteredEvents} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MpgChart data={monthly} events={filteredEvents} />
                <GpmChart data={monthly} events={filteredEvents} />
              </div>
            </div>
          ) : <div className="empty-chart"><span className="eyebrow">A QUIET STRETCH</span><h3>No fill-ups in this date range.</h3><p>Choose a wider range or select All to explore the full journal.</p></div>}
          <p className="data-footnote"><span className="status-dot" /> Real fill-ups. Monthly averages. World events for context.</p>
        </section>
        <div id="the-build" className="build-section">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="eyebrow">02 — UNDER THE HOOD</p>
            <TestStatusMarker />
          </div>
          <CaseStudy />
          <div className="build-details grid gap-10 sm:grid-cols-2"><TechBadges /><ArchitectureDiagram /></div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
