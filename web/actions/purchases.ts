"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { gasPurchases } from "@/lib/db/schema";
import { eq, isNull, desc } from "drizzle-orm";
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
  const pumpPhotoUrl = formData.get("pumpPhotoUrl") as string | null;

  await db.insert(gasPurchases).values({
    userId,
    date,
    cost: cost || null,
    gallons: gallons || null,
    odometer: odometer ? parseInt(odometer) : null,
    pricePerGallon: pricePerGallon || null,
    pumpPhotoUrl: pumpPhotoUrl || null,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/visualizations");
}

export async function deletePurchase(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db
    .delete(gasPurchases)
    .where(eq(gasPurchases.id, id));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/visualizations");
}
