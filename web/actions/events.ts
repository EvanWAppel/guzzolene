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
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const pinToPublic = formData.get("pinToPublic") === "1";
  const meta = sessionClaims?.publicMetadata as Record<string, unknown> | undefined;
  const isAdmin = meta?.role === "admin";

  await db.insert(worldEvents).values({
    userId: pinToPublic && isAdmin ? null : userId,
    name: formData.get("name") as string,
    date: formData.get("date") as string,
    description: (formData.get("description") as string) || null,
    wikipediaUrl: (formData.get("wikipediaUrl") as string) || null,
  });

  revalidatePath("/dashboard/visualizations");
  if (pinToPublic && isAdmin) revalidatePath("/");
}

async function fetchEventOrThrow(id: string) {
  const rows = await db.select().from(worldEvents).where(eq(worldEvents.id, id));
  const row = rows?.[0];
  if (!row) throw new Error("Not found");
  return row;
}

async function assertCanMutate(eventUserId: string | null) {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthorized");
  if (eventUserId === null) {
    const meta = sessionClaims?.publicMetadata as Record<string, unknown> | undefined;
    if (meta?.role !== "admin") throw new Error("Forbidden");
    return;
  }
  if (eventUserId !== userId) throw new Error("Forbidden");
}

export async function updateEvent(
  id: string,
  patch: { name?: string; date?: string; description?: string | null; wikipediaUrl?: string | null },
) {
  const existing = await fetchEventOrThrow(id);
  await assertCanMutate(existing.userId);

  await db.update(worldEvents).set(patch).where(eq(worldEvents.id, id));
  revalidatePath("/dashboard/visualizations");
  if (existing.userId === null) revalidatePath("/");
}

export async function deleteEvent(id: string) {
  const existing = await fetchEventOrThrow(id);
  await assertCanMutate(existing.userId);

  await db.delete(worldEvents).where(eq(worldEvents.id, id));
  revalidatePath("/dashboard/visualizations");
  if (existing.userId === null) revalidatePath("/");
}
