import { Badge } from "@/components/ui/badge";

/**
 * Product-first showcase hero (PRD §5.4.1). Presents the product and its
 * real-data scope. Author identity and the demo CTA live in the footer
 * (G-11/G-12); the case study (badges, diagram, narrative) lives below.
 */
export default function ShowcaseHero({
  totalFills,
  since,
}: {
  totalFills: number;
  since: string | null;
}) {
  const startYear = since ? since.slice(0, 4) : null;

  return (
    <section className="relative space-y-6 py-6 sm:py-12">
      {/* Decorative brand glow behind the hero copy. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -left-24 -z-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl"
      />

      <Badge
        variant="secondary"
        className="gap-1.5 border-primary/20 bg-primary/10 font-normal text-primary"
      >
        <span aria-hidden className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
        Live data · personal project
      </Badge>

      <div className="space-y-3">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
          <span className="text-gradient-brand">Guzzolene</span>
        </h1>
        <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl text-balance">
          Fuel economy and price trends for one car, in context.
        </p>
      </div>

      <p className="text-muted-foreground max-w-2xl leading-relaxed text-pretty">
        A personal fuel-economy tracker: every fill-up logged from a phone, then
        charted over time with the geopolitical events that moved the price of
        gas. Real data, below — explore it with the date filters.
      </p>

      {totalFills > 0 && (
        <dl className="flex flex-wrap gap-x-6 gap-y-3 pt-2">
          <div className="rounded-xl border bg-card/60 px-5 py-3 ring-1 ring-foreground/5">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Fill-ups tracked
            </dt>
            <dd className="text-2xl font-semibold tabular-nums text-primary">
              {totalFills}
            </dd>
          </div>
          {startYear && (
            <div className="rounded-xl border bg-card/60 px-5 py-3 ring-1 ring-foreground/5">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Logging since
              </dt>
              <dd className="text-2xl font-semibold tabular-nums text-primary">
                {startYear}
              </dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
