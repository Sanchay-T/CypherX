import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const roles = [
  { name: "Owner", description: "Full access including billing and security." },
  { name: "Admin", description: "Manage projects, credentials, and integrations." },
  { name: "Developer", description: "Read and write API resources." },
  { name: "Finance", description: "View usage and invoices." },
];

export default function WorkspaceTeamPage() {
  return (
    <section className="space-y-8">
      <DashboardHeader
        title="Team"
        description="Invite collaborators and assign workspace-level roles."
      />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Invite team members</CardTitle>
          <CardDescription>Send a one-time invite with role-based access.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input placeholder="name@company.com" className="sm:w-72" />
          <Button>Send invite</Button>
        </CardContent>
      </Card>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Role definitions</CardTitle>
          <CardDescription>Workspace roles cascade to projects by default.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground">
          {roles.map((role) => (
            <div key={role.name} className="rounded-lg border border-border/60 bg-background/80 p-4">
              <p className="text-sm font-semibold text-foreground">{role.name}</p>
              <p className="text-xs text-muted-foreground/80">{role.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
