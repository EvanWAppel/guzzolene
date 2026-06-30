import { db } from "@/lib/db";
import { gasPurchases, type GasPurchase } from "@/lib/db/schema";
import { isNull } from "drizzle-orm";

/**
 * Columns safe to read on PUBLIC / unauthenticated surfaces (the showcase home
 * `/` and the read-only demo `/demo`).
 *
 * `lat`/`lng` are deliberately omitted — see PRD §5.4.2 and
 * `web/docs/adr-demo-sandbox.md`. The privacy invariant is that location must
 * never be *transmitted* on a public surface, so we strip it at the query
 * projection, not just in the UI. Do NOT add lat/lng here.
 */
export const publicPurchaseColumns = {
  id: gasPurchases.id,
  userId: gasPurchases.userId,
  date: gasPurchases.date,
  cost: gasPurchases.cost,
  gallons: gasPurchases.gallons,
  odometer: gasPurchases.odometer,
  pricePerGallon: gasPurchases.pricePerGallon,
  fuelGrade: gasPurchases.fuelGrade,
  createdAt: gasPurchases.createdAt,
} as const;

/** A fill-up row as exposed on public surfaces — same as GasPurchase minus location. */
export type PublicPurchase = Omit<GasPurchase, "lat" | "lng">;

/**
 * The owner's fill-up history (user_id IS NULL) with location stripped, for
 * public/demo rendering. Both `/` and `/demo` must read through this — never
 * `listOwnerPurchases` (which selects all columns, including lat/lng).
 */
export async function listPublicPurchases(): Promise<PublicPurchase[]> {
  return db
    .select(publicPurchaseColumns)
    .from(gasPurchases)
    .where(isNull(gasPurchases.userId))
    .orderBy(gasPurchases.date);
}
