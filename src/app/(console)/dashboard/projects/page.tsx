import Link from "next/link";
import { ArrowUpRight, KeyRound, PanelBottom, Shield } from "lucide-react";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { projects } from "@/data/projects";

export default function ProjectsPage() {
  return (
    <section className="space-y-8">
      <DashboardHeader
        title="Projects"
        description="Organize workspaces, environments, and credentials."
        actions={
          <Button asChild>
            <Link href="/dashboard/projects/new">New project</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {projects.map((project) => (
          <Card key={project.id} className="border-border/70">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">
                  {project.name}
                </CardTitle>
                <CardDescription>
                  {project.status === "live" ? "Live" : "Sandbox"} · Updated {project.lastDeployment}
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/projects/${project.slug}`}>Open</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-5 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">Monthly usage</p>
                  <p>{project.monthlyRequests.toLocaleString()} requests</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">${project.monthlySpend.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Spend</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatPill icon={<KeyRound className="size-3.5" />} label="Active keys" value={`${project.apiKeys.filter((key) => key.status === "active").length}`} />
                <StatPill icon={<Shield className="size-3.5" />} label="Policy tier" value={project.billingPlan} />
                <StatPill icon={<PanelBottom className="size-3.5" />} label="Team" value={`${project.team.length} members`} />
              </div>
              <Separator />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Explore API keys</span>
                <Link href={`/dashboard/projects/${project.slug}/api-keys`} className="inline-flex items-center gap-1 font-medium text-foreground">
                  Manage <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

type StatPillProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

function StatPill({ icon, label, value }: StatPillProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-3">
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <span className="text-muted-foreground/80">{icon}</span>
        {label}
      </div>
      <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
