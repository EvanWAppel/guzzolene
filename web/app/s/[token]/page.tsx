import Link from "next/link";
import { Fuel } from "lucide-react";
import { listPublicPurchases } from "@/lib/public-data";
import { listOwnerEvents } from "@/actions/events";
import { monthlyAvg } from "@/lib/aggregations";
import { getMonthlyOilPrices } from "@/lib/oil-prices";
import { parseDateRange, filterByRange } from "@/lib/filters";
import { verifySnapshot } from "@/lib/snapshot-token";
import PricePerGallonChart from "@/components/charts/PricePerGallonChart";
import CostPerMileChart from "@/components/charts/CostPerMileChart";
import MpgChart from "@/components/charts/MpgChart";
import GpmChart from "@/components/charts/GpmChart";
import OverviewGrid from "@/components/charts/OverviewGrid";
import SiteFooter from "@/components/SiteFooter";

export const metadata = {
  title: "Guzzolene — shared snapshot",
  description: "A shared, read-only snapshot of the Guzzolene fuel journal.",
  // Token-gated, ephemeral links — keep them out of search indexes.
  robots: { index: false, follow: false },
};

/**
 * Read-only shareable snapshot surface (PRD §5.7, Stream J).
 *
 * The `[token]` is an HMAC-signed, self-expiring encoding of the PUBLIC filtered
 * view (date range + whether event overlays show). We verify it first: only a
 * `valid` token reads any data, and every read goes through `listPublicPurchases`
 * (location-stripped, PRD §5.4.2) exactly like the showcase home. An expired or
 * forged token renders a clean terminal state and touches no data.
 *
 * This is anonymous/public — see PUBLIC_ROUTES in `web/proxy.ts`.
 */
export default async function SnapshotPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = verifySnapshot(token);

  if (result.status !== "valid") {
    return <SnapshotUnavailable expired={result.status === "expired"} />;
  }

  const { range: snapRange, events: showEvents } = result.payload;
  const range = parseDateRange({ from: snapRange.from, to: snapRange.to });

  const [purchases, allEvents] = await Promise.all([
    listPublicPurchases(),
    listOwnerEvents(),
  ]);

  const monthly = monthlyAvg(purchases, range ?? undefined);
  const events = showEvents ? filterByRange(allEvents, range) : [];

  const dates = monthly.map((m) => m.date);
  const oilPrices =
    dates.length >= 2
      ? await getMonthlyOilPrices(dates[0], dates[dates.length - 1])
      : [];

  const label = rangeLabel(snapRange);

  return (
    <div className="journal-site min-h-screen">
      <a href="#snapshot-data" className="skip-link">Skip to the data</a>
      <header className="site-header">
        <div className="journal-container header-inner">
          <Link href="/" className="nav-wordmark" aria-label="Guzzolene home">
            <Fuel size={22} strokeWidth={2} aria-hidden />guzzolene<span className="brand-period">.</span>
          </Link>
          <nav className="section-nav" aria-label="Sections">
            <Link href="/">Open the full journal</Link>
          </nav>
        </div>
      </header>

      <main className="journal-container">
        <section id="snapshot-data" className="data-section" aria-labelledby="snapshot-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">A SHARED SNAPSHOT</p>
              <h1 id="snapshot-heading">The price of <em>going places.</em></h1>
            </div>
            <p>A read-only view of the journal{label ? <> — <span>{label}</span></> : null}.<br />Live data, location omitted.</p>
          </div>

          {monthly.length > 0 ? (
            <div className="chart-collection">
              <div className="feature-chart"><PricePerGallonChart data={monthly} events={events} /></div>
              <OverviewGrid data={monthly} events={events} />
              <CostPerMileChart data={monthly} oilPrices={oilPrices} events={events} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MpgChart data={monthly} events={events} />
                <GpmChart data={monthly} events={events} />
              </div>
            </div>
          ) : (
            <div className="empty-chart">
              <span className="eyebrow">A QUIET STRETCH</span>
              <h2>No fill-ups in this snapshot&apos;s date range.</h2>
              <p><Link href="/">Open the full journal</Link> to explore every fill-up.</p>
            </div>
          )}

          <p className="data-footnote"><span className="status-dot" /> Real fill-ups. Monthly averages. World events for context.</p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

/** A human label for the snapshot's date range, or null for all-time. */
function rangeLabel(range: { from?: string; to?: string }): string | null {
  if (range.from && range.to) return `${range.from} to ${range.to}`;
  if (range.from) return `since ${range.from}`;
  if (range.to) return `through ${range.to}`;
  return null;
}

/** Clean terminal state for an expired or forged link. Reads no data. */
function SnapshotUnavailable({ expired }: { expired: boolean }) {
  return (
    <div className="journal-site min-h-screen">
      <header className="site-header">
        <div className="journal-container header-inner">
          <Link href="/" className="nav-wordmark" aria-label="Guzzolene home">
            <Fuel size={22} strokeWidth={2} aria-hidden />guzzolene<span className="brand-period">.</span>
          </Link>
        </div>
      </header>
      <main className="journal-container">
        <section className="empty-chart" aria-labelledby="snapshot-gone-heading">
          <span className="eyebrow">{expired ? "LINK EXPIRED" : "LINK INVALID"}</span>
          <h1 id="snapshot-gone-heading">
            {expired
              ? "This shared snapshot has expired."
              : "This snapshot link isn’t valid."}
          </h1>
          <p>
            Snapshot links are read-only and time-limited.{" "}
            <Link href="/">Open the full journal</Link> to see the latest data.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
