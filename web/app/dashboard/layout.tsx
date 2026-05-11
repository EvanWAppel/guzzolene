import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");

  const meta = sessionClaims?.publicMetadata as Record<string, unknown> | undefined;
  if (meta?.approved !== true && meta?.role !== "admin") {
    redirect("/pending");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-lg">⛽ Gas Economics</Link>
          <nav className="flex items-center gap-3 text-sm">
            <Button render={<Link href="/dashboard" />} variant="ghost" size="sm">
              Dashboard
            </Button>
            <Button render={<Link href="/dashboard/add" />} variant="ghost" size="sm">
              Log Fill-up
            </Button>
            <Button render={<Link href="/dashboard/visualizations" />} variant="ghost" size="sm">
              Charts
            </Button>
            {meta?.role === "admin" && (
              <Button render={<Link href="/admin" />} variant="ghost" size="sm">
                Admin
              </Button>
            )}
          </nav>
        </div>
        <UserButton />
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
