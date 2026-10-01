import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { TEST_COUNT } from "@/lib/showcase-stats";

/**
 * Small "N tests · CI green" marker for the showcase home (PRD §5.8.2).
 * Sourced from the real suite total (`showcase-stats.TEST_COUNT`) and links to
 * the `/engineering` write-up where the CI/test story lives.
 */
export default function TestStatusMarker() {
  return (
    <Link
      href="/engineering"
      aria-label={`${TEST_COUNT} tests, continuous integration green — read the engineering notes`}
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      <CheckCircle2 size={14} aria-hidden className="text-primary" />
      <span>{TEST_COUNT} tests</span>
      <span aria-hidden>·</span>
      <span>CI green</span>
    </Link>
  );
}
