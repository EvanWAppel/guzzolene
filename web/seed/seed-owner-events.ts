/**
 * Idempotent seeder for owner public events (rendered on the home page).
 * Re-running is safe: the unique (user_id, date, name) NULLS NOT DISTINCT
 * constraint on world_events makes ON CONFLICT DO NOTHING a no-op for rows
 * that already exist.
 *
 * Usage: npm run db:seed-events
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.local") });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { worldEvents } from "../lib/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql });

export const OWNER_EVENTS = [
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
  console.log(`Upserting ${OWNER_EVENTS.length} owner events...`);

  const rows = OWNER_EVENTS.map((e) => ({ ...e, userId: null, wikipediaUrl: null }));
  const inserted = await db
    .insert(worldEvents)
    .values(rows)
    .onConflictDoNothing({
      target: [worldEvents.userId, worldEvents.date, worldEvents.name],
    })
    .returning({ id: worldEvents.id });

  console.log(`Inserted ${inserted.length} new (others already existed).`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
