"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { gasPurchases } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function listOwnerPurchases() {
  return db
    .select()
    .from(gasPurchases)
    .where(isNull(gasPurchases.userId))
    .orderBy(gasPurchases.date);
}

export async function listUserPurchases() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return db
    .select()
    .from(gasPurchases)
    .where(eq(gasPurchases.userId, userId))
    .orderBy(gasPurchases.date);
}

export async function createPurchase(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const date = formData.get("date") as string;
  const cost = formData.get("cost") as string;
  const gallons = formData.get("gallons") as string;
  const odometer = formData.get("odometer") as string;
  const pricePerGallon = formData.get("pricePerGallon") as string;
  const fuelGrade = (formData.get("fuelGrade") as string | null) || "87";
  const latRaw = formData.get("lat") as string | null;
  const lngRaw = formData.get("lng") as string | null;
  const lat = latRaw ? Number(latRaw) : null;
  const lng = lngRaw ? Number(lngRaw) : null;

  await db.insert(gasPurchases).values({
    userId,
    date,
    cost: cost || null,
    gallons: gallons || null,
    odometer: odometer ? parseInt(odometer) : null,
    pricePerGallon: pricePerGallon || null,
    fuelGrade,
    lat,
    lng,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/visualizations");
}

async function fetchPurchaseOrThrow(id: string) {
  const rows = await db.select().from(gasPurchases).where(eq(gasPurchases.id, id));
  const row = rows?.[0];
  if (!row) throw new Error("Not found");
  return row;
}

async function assertCanMutate(rowUserId: string | null) {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthorized");
  if (rowUserId === null) {
    const meta = sessionClaims?.publicMetadata as Record<string, unknown> | undefined;
    if (meta?.role !== "admin") throw new Error("Forbidden");
    return;
  }
  if (rowUserId !== userId) throw new Error("Forbidden");
}

export type PurchasePatch = {
  date?: string;
  cost?: string | null;
  gallons?: string | null;
  odometer?: number | null;
  pricePerGallon?: string | null;
  fuelGrade?: string;
  lat?: number | null;
  lng?: number | null;
};

export async function updatePurchase(id: string, patch: PurchasePatch) {
  const existing = await fetchPurchaseOrThrow(id);
  await assertCanMutate(existing.userId);

  await db.update(gasPurchases).set(patch).where(eq(gasPurchases.id, id));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/visualizations");
  if (existing.userId === null) revalidatePath("/");
}

export async function deletePurchase(id: string) {
  const existing = await fetchPurchaseOrThrow(id);
  await assertCanMutate(existing.userId);

  await db.delete(gasPurchases).where(eq(gasPurchases.id, id));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/visualizations");
  if (existing.userId === null) revalidatePath("/");
}
