"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

async function assertAdmin() {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const meta = sessionClaims?.publicMetadata as Record<string, unknown> | undefined;
  if (meta?.role !== "admin") throw new Error("Forbidden");
}

export async function listPendingUsers() {
  await assertAdmin();
  const client = await clerkClient();
  const { data: users } = await client.users.getUserList({ limit: 100 });
  return users
    .filter((u) => {
      const meta = u.publicMetadata as Record<string, unknown>;
      return meta.approved === false || meta.approved === undefined;
    })
    .map((u) => ({
      id: u.id,
      email: u.emailAddresses[0]?.emailAddress ?? "",
      name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
      createdAt: u.createdAt,
    }));
}

export async function approveUser(targetUserId: string) {
  await assertAdmin();
  const client = await clerkClient();
  await client.users.updateUserMetadata(targetUserId, {
    publicMetadata: { approved: true },
  });
  revalidatePath("/admin");
}

export async function denyUser(targetUserId: string) {
  await assertAdmin();
  const client = await clerkClient();
  await client.users.updateUserMetadata(targetUserId, {
    publicMetadata: { approved: false },
  });
  revalidatePath("/admin");
}
