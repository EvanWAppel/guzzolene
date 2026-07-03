import Link from "next/link";
import { listPublicPurchases } from "@/lib/public-data";
import { listOwnerEvents } from "@/actions/events";
import DemoDashboard from "@/components/DemoDashboard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Guzzolene — live demo",
  description:
    "Try the Guzzolene dashboard with real data. Read-only: your changes stay in your browser.",
};

/**
 * Public, anonymous demo (PRD §5.4.3). Reads the owner's real history with
 * location stripped (`listPublicPurchases`, never `listOwnerPurchases`) and
 * hands it to a client overlay. No auth, no server write path.
 */
export default async function DemoPage() {
  const [base, events] = await Promise.all([
    listPublicPurchases(),
    listOwnerEvents(),
  ]);

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
          ← Back to overview
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <DemoDashboard base={base} events={events} />
      </main>
    </div>
  );
}
