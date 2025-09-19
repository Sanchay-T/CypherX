import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const credentials = [
  {
    type: "Publishable key",
    id: "pk_live_Q2Y5",
    created: "Aug 8, 2025",
    lastUsed: "1 hour ago",
  },
  {
    type: "Secret key",
    id: "sk_live_PzM0",
    created: "Aug 8, 2025",
    lastUsed: "3 minutes ago",
  },
  {
    type: "CLI token",
    id: "cli_xo_1821",
    created: "Sep 2, 2025",
    lastUsed: "2 days ago",
  },
];

export default function CredentialsPage() {
  return (
    <section className="space-y-8">
      <DashboardHeader
        title="Credentials"
        description="Centralize secrets for integrations, CLIs, and partner portals."
        actions={<Button>Generate credential</Button>}
      />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Active credentials</CardTitle>
          <CardDescription>Scoped tokens managed at the workspace level.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {credentials.map((cred) => (
                <TableRow key={cred.id}>
                  <TableCell className="font-medium text-foreground">{cred.type}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{cred.id}</TableCell>
                  <TableCell>{cred.created}</TableCell>
                  <TableCell>{cred.lastUsed}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
