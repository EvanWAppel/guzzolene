import type { Decision } from "@/lib/decisions";

/**
 * Presentational render of the featured engineering trade-offs (PRD §5.8.1).
 * Pure/server-safe: takes decisions parsed from the real `DECISIONS.md` and
 * lays each out as an article with a labelled Chose / Rejected / Why block.
 * Uses AA-contrast theme tokens (foreground / muted-foreground) per §6.
 */
export default function EngineeringDecisions({
  decisions,
}: {
  decisions: Decision[];
}) {
  return (
    <section
      aria-labelledby="decisions-heading"
      className="space-y-8"
    >
      <h2 id="decisions-heading" className="sr-only">
        Engineering trade-offs
      </h2>
      <ol className="space-y-6 list-none p-0 m-0">
        {decisions.map((d) => (
          <li key={d.id}>
            <article className="rounded-xl border p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                {d.title}
              </h3>
              <dl className="grid gap-3 text-sm sm:grid-cols-[6rem_1fr]">
                <dt className="font-medium text-foreground">Chose</dt>
                <dd className="m-0 text-muted-foreground">{d.chose}</dd>
                <dt className="font-medium text-foreground">Rejected</dt>
                <dd className="m-0 text-muted-foreground">{d.rejected}</dd>
                <dt className="font-medium text-foreground">Why</dt>
                <dd className="m-0 text-muted-foreground">{d.why}</dd>
              </dl>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
