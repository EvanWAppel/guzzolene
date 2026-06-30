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
    <section className="space-y-6 py-6 sm:py-10">
      <Badge variant="secondary" className="font-normal">
        ⛽ Live data · personal project
      </Badge>

      <div className="space-y-3">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Guzzolene
        </h1>
        <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl">
          Fuel economy and price trends for one car, in context.
        </p>
      </div>

      <p className="text-muted-foreground max-w-2xl leading-relaxed">
        A personal fuel-economy tracker: every fill-up logged from a phone, then
        charted over time with the geopolitical events that moved the price of
        gas. Real data, below — explore it with the date filters.
      </p>

      {totalFills > 0 && (
        <dl className="flex flex-wrap gap-x-8 gap-y-3 pt-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Fill-ups tracked
            </dt>
            <dd className="text-2xl font-semibold tabular-nums">{totalFills}</dd>
          </div>
          {startYear && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Logging since
              </dt>
              <dd className="text-2xl font-semibold tabular-nums">{startYear}</dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
