/**
 * Run once: imports gas_purchases.csv and hardcoded world events into the DB
 * as owner's public data (user_id = null).
 *
 * Usage: npx tsx seed/seed-owner.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.local") });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { gasPurchases } from "../lib/db/schema";
import { isNull } from "drizzle-orm";
import { readFileSync } from "fs";
import Papa from "papaparse";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql });

async function main() {
  console.log("Seeding owner gas purchases...");

  // Parse and validate the CSV BEFORE touching the DB. This ordering matters:
  // the seed replaces all owner history, so a missing/empty/unparseable CSV must
  // abort *before* the destructive delete — otherwise we'd wipe the owner's
  // fill-ups and re-insert nothing, silently dropping the entire history.
  const csvPath = resolve(__dirname, "../../gas_purchases.csv"); // relative to project root
  const csv = readFileSync(csvPath, "utf-8");

  const { data } = Papa.parse<{
    date: string;
    cost: string;
    gallons: string;
    odometer: string;
    price_per_gallon: string;
  }>(csv, { header: true, skipEmptyLines: true });

  const rows = data
    .filter((r) => r.date)
    .map((r) => ({
      userId: null,
      date: r.date,
      cost: r.cost || null,
      gallons: r.gallons || null,
      odometer: r.odometer ? parseInt(r.odometer) : null,
      pricePerGallon: r.price_per_gallon || null,
    }));

  if (rows.length === 0) {
    throw new Error(
      `Refusing to backfill: parsed 0 fill-ups from ${csvPath}. ` +
        `Check that the file exists and has a 'date' header column. ` +
        `(Not deleting existing owner data.)`,
    );
  }

  const dates = rows.map((r) => r.date).sort();
  console.log(
    `Parsed ${rows.length} fill-ups (${dates[0]} → ${dates[dates.length - 1]}).`,
  );

  // Now that we have a healthy dataset in hand, replace owner purchases.
  // (Owner world events are managed separately by db:seed-events.)
  await db.delete(gasPurchases).where(isNull(gasPurchases.userId));
  console.log("Cleared existing owner gas purchases.");

  // Insert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    await db.insert(gasPurchases).values(rows.slice(i, i + 50));
  }
  console.log(`Inserted ${rows.length} gas purchases.`);
  console.log("Done! (Run `npm run db:seed-events` separately for owner events.)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
