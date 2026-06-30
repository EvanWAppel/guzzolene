/**
 * Architecture diagram (PRD §5.4.1, resolves §8.9 format choice).
 *
 * Implemented as accessible HTML/CSS rather than an exported image: it's
 * themeable (uses the same design tokens), responsive, and the labels are real
 * text (screen-reader friendly, no alt-text drift). The <figure> carries an
 * explicit accessible name; the arrows are decorative (aria-hidden).
 */

function Node({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-center shadow-sm">
      <div className="text-sm font-medium">{title}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Arrow() {
  return (
    <span aria-hidden className="text-muted-foreground select-none">
      →
    </span>
  );
}

export default function ArchitectureDiagram() {
  return (
    <figure
      aria-label="Architecture: a phone PWA talks to a Next.js app on Vercel, which uses Clerk for auth and Neon Postgres via Drizzle, plus external data sources."
      className="space-y-3"
    >
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <Node title="Phone / Browser" sub="PWA · offline outbox (IndexedDB)" />
        <Arrow />
        <Node title="Next.js 16 · Vercel" sub="Server Components + Actions" />
        <Arrow />
        <div className="flex flex-col gap-2">
          <Node title="Clerk" sub="auth & approval" />
          <Node title="Neon Postgres" sub="via Drizzle ORM" />
          <Node title="WTI prices · Wikipedia" sub="event & oil-price data" />
        </div>
      </div>
      <figcaption className="text-xs text-muted-foreground">
        Charts are pre-aggregated in Server Components and shipped as data to the
        client; fill-ups sync from an offline queue when the device reconnects.
      </figcaption>
    </figure>
  );
}
