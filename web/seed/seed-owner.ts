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
import { gasPurchases, worldEvents } from "../lib/db/schema";
import { isNull } from "drizzle-orm";
import { readFileSync } from "fs";
import Papa from "papaparse";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql });

const OWNER_EVENTS = [
  { name: "Aramco Drone Attack",               date: "2019-09-14", description: "Drone attacks on Saudi Aramco oil processing facilities caused oil price spike." },
  { name: "COVID-19 Lockdowns & Oil Price War", date: "2020-03-09", description: "Pandemic lockdowns + Russia-Saudi price war collapsed oil demand and prices." },
  { name: "Colonial Pipeline Hack",             date: "2021-05-07", description: "Ransomware attack shut down major US East Coast fuel pipeline." },
  { name: "Russia Invades Ukraine",             date: "2022-02-24", description: "Russia's invasion of Ukraine triggered global energy price shocks." },
  { name: "OPEC+ 2M BPD Cut",                   date: "2022-10-05", description: "OPEC+ announced a 2 million barrel per day production cut." },
  { name: "OPEC+ Surprise Cut",                 date: "2023-04-02", description: "Surprise OPEC+ voluntary production cut of ~1.66M BPD." },
  { name: "Operation Epic Fury (US Strikes Iran)", date: "2026-02-28", description: "US military strikes on Iranian nuclear facilities." },
  { name: "Iran Closes Strait of Hormuz",       date: "2026-03-02", description: "Iran announced closure of Strait of Hormuz in retaliation." },
];

async function main() {
  console.log("Seeding owner data...");

  // Clear existing owner data
  await db.delete(gasPurchases).where(isNull(gasPurchases.userId));
  await db.delete(worldEvents).where(isNull(worldEvents.userId));
  console.log("Cleared existing owner data.");

  // Parse CSV — path is relative to project root
  const csvPath = resolve(__dirname, "../../gas_purchases.csv");
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

  // Insert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    await db.insert(gasPurchases).values(rows.slice(i, i + 50));
  }
  console.log(`Inserted ${rows.length} gas purchases.`);

  // Insert world events
  await db.insert(worldEvents).values(
    OWNER_EVENTS.map((e) => ({ ...e, userId: null, wikipediaUrl: null }))
  );
  console.log(`Inserted ${OWNER_EVENTS.length} world events.`);

  console.log("Done!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
