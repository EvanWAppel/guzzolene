"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { worldEvents } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function listOwnerEvents() {
  return db.select().from(worldEvents).where(isNull(worldEvents.userId)).orderBy(worldEvents.date);
}

export async function listUserEvents() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return db
    .select()
    .from(worldEvents)
    .where(eq(worldEvents.userId, userId))
    .orderBy(worldEvents.date);
}

export async function saveEvent(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.insert(worldEvents).values({
    userId,
    name: formData.get("name") as string,
    date: formData.get("date") as string,
    description: (formData.get("description") as string) || null,
    wikipediaUrl: (formData.get("wikipediaUrl") as string) || null,
  });

  revalidatePath("/dashboard/visualizations");
}

export async function deleteEvent(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.delete(worldEvents).where(eq(worldEvents.id, id));
  revalidatePath("/dashboard/visualizations");
}
