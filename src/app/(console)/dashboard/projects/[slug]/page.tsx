import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { projects } from "@/data/projects";

export default function ProjectOverviewPage({ params }: { params: { slug: string } }) {
  const project = projects.find((item) => item.slug === params.slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Service health</CardTitle>
          <CardDescription>
            Monitor latency, success rates, and incidents for this project.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 text-sm text-muted-foreground">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Latency</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">188 ms</p>
            <p className="text-xs text-muted-foreground/80">p95 over last hour · Objective 220 ms</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Success rate</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">99.71%</p>
            <p className="text-xs text-muted-foreground/80">Error budget remaining 24 days</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Key facts</CardTitle>
          <CardDescription>
            Quick context about this project and ownership.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <Row label="Status" value={project.status === "live" ? "Live" : "Sandbox"} />
          <Row label="Billing plan" value={project.billingPlan} />
          <Row label="Monthly spend" value={`$${project.monthlySpend.toLocaleString()}`} />
          <Row label="Team members" value={`${project.team.length}`} />
          <Row label="Last deployment" value={project.lastDeployment} />
        </CardContent>
      </Card>
    </div>
  );
}

type RowProps = { label: string; value: string };

function Row({ label, value }: RowProps) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 bg-background/80 px-3 py-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground/80">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
