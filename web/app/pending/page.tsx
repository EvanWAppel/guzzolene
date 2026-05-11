import { UserButton } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PendingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <h1 className="font-bold text-lg">⛽ Gas Economics</h1>
        <UserButton />
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>Awaiting Approval</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <p>
              Your account is pending approval from the admin. You&apos;ll get
              access once approved.
            </p>
            <p className="text-sm">Check back soon — approvals are usually quick.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
