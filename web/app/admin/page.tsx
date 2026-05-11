import { listPendingUsers, approveUser, denyUser } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function AdminPage() {
  const pending = await listPendingUsers();

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <h2 className="text-2xl font-semibold">Admin — Pending Users</h2>

      {pending.length === 0 ? (
        <p className="text-muted-foreground">No pending users.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Signed Up</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name || "—"}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">Pending</Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <form
                    action={async () => {
                      "use server";
                      await approveUser(user.id);
                    }}
                    className="inline"
                  >
                    <Button size="sm" type="submit">Approve</Button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await denyUser(user.id);
                    }}
                    className="inline"
                  >
                    <Button size="sm" variant="destructive" type="submit">
                      Deny
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
