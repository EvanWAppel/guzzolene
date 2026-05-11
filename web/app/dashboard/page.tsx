import { listUserPurchases } from "@/actions/purchases";
import { monthlyAvg } from "@/lib/aggregations";
import OverviewGrid from "@/components/charts/OverviewGrid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function DashboardPage() {
  const purchases = await listUserPurchases();
  const monthly = monthlyAvg(purchases);

  if (purchases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <h2 className="text-xl font-semibold">No fill-ups logged yet</h2>
        <p className="text-muted-foreground">Add your first gas purchase to see your charts.</p>
        <Button render={<Link href="/dashboard/add" />}>Log First Fill-up</Button>
      </div>
    );
  }

  const last = purchases[purchases.length - 1];
  const totalSpent = purchases.reduce((s, p) => s + Number(p.cost ?? 0), 0);
  const totalGallons = purchases.reduce((s, p) => s + Number(p.gallons ?? 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">My Gas History</h2>
        <Button render={<Link href="/dashboard/add" />} size="sm">+ Log Fill-up</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fill-ups</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{purchases.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalSpent.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gallons</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalGallons.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Fill-up</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{last.date}</p>
          </CardContent>
        </Card>
      </div>

      <OverviewGrid data={monthly} events={[]} />

      <Button render={<Link href="/dashboard/visualizations" />} variant="outline">
        View All Charts →
      </Button>
    </div>
  );
}
