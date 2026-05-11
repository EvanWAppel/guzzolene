import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sessionClaims } = await auth();
  const meta = sessionClaims?.publicMetadata as Record<string, unknown> | undefined;
  if (meta?.role !== "admin") redirect("/dashboard");

  return <>{children}</>;
}
