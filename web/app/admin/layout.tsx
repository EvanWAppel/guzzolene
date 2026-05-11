import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const meta = (user?.publicMetadata ?? {}) as Record<string, unknown>;
  if (meta?.role !== "admin") redirect("/dashboard");

  return <>{children}</>;
}
