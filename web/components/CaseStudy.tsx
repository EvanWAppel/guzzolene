import { Button } from "@/components/ui/button";
import Link from "next/link";

const REPO = "https://github.com/EvanWAppel/guzzolene";

/**
 * Below-the-fold case study (PRD §5.4.1). Understated, product-first: a short
 * narrative of the decisions and tradeoffs, then a prominent link to the source
 * (G-10). Demonstrates judgment, not just tool usage.
 */
export default function CaseStudy() {
  return (
    <section
      aria-labelledby="case-study-heading"
      className="space-y-6 border-t pt-10"
    >
      <div className="space-y-1">
        <h2 id="case-study-heading" className="text-2xl font-semibold">
          How it&apos;s built
        </h2>
        <p className="text-sm text-muted-foreground">
          A personal tool, shipped — and a few decisions worth explaining.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 text-sm leading-relaxed">
        <div className="space-y-1.5">
          <h3 className="font-medium">From notebook to product</h3>
          <p className="text-muted-foreground">
            It started as a Python/Matplotlib notebook charting years of my own
            fill-ups. The web app reimplements those analyses as a live product:
            monthly aggregates computed in React Server Components and shipped as
            data to client-side Recharts, with Drizzle as the typed source of
            truth over Neon Postgres.
          </p>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-medium">A PWA, not a native app</h3>
          <p className="text-muted-foreground">
            The job is logging a fill-up one-handed at the pump — sometimes with
            no signal. An installable PWA does that without app-store overhead:
            entries queue in an offline IndexedDB outbox and sync automatically
            when the phone reconnects.
          </p>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-medium">Cutting the AI OCR</h3>
          <p className="text-muted-foreground">
            An earlier version read the pump display from a photo via Claude. I
            removed it: a mobile-shaped form with a numeric keypad turned out to
            be faster and more reliable than photo-then-extract, and dropping it
            shed two cloud dependencies. Not every problem needs a model.
          </p>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-medium">Privacy by construction</h3>
          <p className="text-muted-foreground">
            Fill-ups can capture location for my own use, but coordinates are
            stripped at the database query for any public surface — they are
            never sent to an unauthenticated visitor, not merely hidden in the
            UI.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button render={<Link href={REPO} />} variant="outline">
          View the source on GitHub
        </Button>
        <span className="text-xs text-muted-foreground">
          Public repo · Next.js 16 · TypeScript
        </span>
      </div>
    </section>
  );
}
