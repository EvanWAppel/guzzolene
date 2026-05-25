import { pgTable, uuid, text, date, numeric, integer, timestamp } from "drizzle-orm/pg-core";

export const gasPurchases = pgTable("gas_purchases", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id"), // null = owner's public data
  date: date("date").notNull(),
  cost: numeric("cost", { precision: 8, scale: 2 }),
  gallons: numeric("gallons", { precision: 8, scale: 3 }),
  odometer: integer("odometer"),
  pricePerGallon: numeric("price_per_gallon", { precision: 6, scale: 3 }),
  fuelGrade: text("fuel_grade").notNull().default("87"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const worldEvents = pgTable("world_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id"), // null = owner's events (shown on home page)
  name: text("name").notNull(),
  date: date("date").notNull(),
  description: text("description"),
  wikipediaUrl: text("wikipedia_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type GasPurchase = typeof gasPurchases.$inferSelect;
export type NewGasPurchase = typeof gasPurchases.$inferInsert;
export type WorldEvent = typeof worldEvents.$inferSelect;
export type NewWorldEvent = typeof worldEvents.$inferInsert;
