import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { parseDecisions, selectFeatured } from "@/lib/decisions";
import EngineeringDecisions from "@/components/EngineeringDecisions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const REPO = "https://github.com/EvanWAppel/guzzolene";

// Prerender at build time: the DECISIONS.md read must happen during the build
// (repo root is on disk then), never at runtime on a serverless function.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Engineering notes — Guzzolene",
  description:
    "The real trade-offs behind Guzzolene: privacy-by-construction location stripping, a client-side demo sandbox, and extract-and-discard photo entry — rendered straight from the project's DECISIONS.md.",
};

/**
 * Public engineering write-up (PRD §5.8.1, Stream K / K-1). Renders the featured
 * trade-offs straight from the repo-root `DECISIONS.md` so the page can never
 * drift from the recorded ledger. Statically prerendered — the file read runs at
 * build time. Linked from the showcase footer.
 */
export default async function EngineeringPage() {
  const markdown = await readFile(
    join(process.cwd(), "..", "DECISIONS.md"),
    "utf8",
  );
  const decisions = selectFeatured(parseDecisions(markdown));

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">
          ⛽ Guzzolene
        </Link>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <ArrowLeft size={14} aria-hidden /> Back to overview
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Engineering notes
          </p>
          <h1 className="text-3xl font-semibold">
            A few decisions worth explaining
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            The interesting part of a small project is usually what got left out.
            These are real trade-offs from building Guzzolene, taken straight from
            the project&apos;s{" "}
            <a
              href={`${REPO}/blob/main/DECISIONS.md`}
              className="underline underline-offset-4 hover:text-foreground"
            >
              <code>DECISIONS.md</code>
            </a>{" "}
            ledger — chose X, rejected Y, and why.
          </p>
        </div>

        <EngineeringDecisions decisions={decisions} />

        <div className="flex flex-wrap items-center gap-3 border-t pt-8">
          <Link href={REPO} className={cn(buttonVariants({ variant: "outline" }))}>
            View the source on GitHub
          </Link>
          <Link href="/demo" className={cn(buttonVariants({ variant: "outline" }))}>
            Try the live demo
          </Link>
        </div>
      </main>
    </div>
  );
}
