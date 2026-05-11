/**
 * Lists all Clerk users and sets the first one as admin.
 * Run with: npx tsx seed/set-admin.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.local") });

import { createClerkClient } from "@clerk/nextjs/server";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

async function main() {
  const { data: users } = await clerk.users.getUserList({ limit: 100 });

  if (users.length === 0) {
    console.log("No users found.");
    return;
  }

  console.log("Users found:");
  users.forEach((u) =>
    console.log(`  ${u.id}  ${u.emailAddresses[0]?.emailAddress}`)
  );

  // Set all users as approved, first user as admin
  for (const [i, user] of users.entries()) {
    const meta = i === 0 ? { approved: true, role: "admin" } : { approved: true };
    await clerk.users.updateUserMetadata(user.id, { publicMetadata: meta });
    console.log(`Set ${user.emailAddresses[0]?.emailAddress} →`, meta);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
