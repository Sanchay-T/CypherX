import Link from "next/link";
import { ShieldCheck, Signal, Workflow } from "lucide-react";

import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { MetricCard } from "@/components/dashboard/metric-card";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { projects, recentActivity } from "@/data/projects";

const project = projects[0];

export default function DashboardOverviewPage() {
  return (
    <section className="space-y-10">
      <DashboardHeader
        title="Welcome back"
        description="Monitor usage, manage credentials, and stay ahead of customer needs."
        actions={
          <Button asChild className="gap-2">
            <Link href="/dashboard/projects">Create project</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Requests this month"
          value={project.monthlyRequests.toLocaleString()}
          change="▲ 12% vs last month"
          changeTone="positive"
          helper="Quota threshold at 68%"
          icon={<Signal className="size-4" />}
        />
        <MetricCard
          label="Monthly spend"
          value={`$${project.monthlySpend.toLocaleString()}`}
          change="Usage-based billing"
          helper="Billing plan: Scale"
          icon={<Workflow className="size-4" />}
        />
        <MetricCard
          label="Error rate"
          value="0.29%"
          change="▼ 0.04% vs last week"
          changeTone="positive"
          helper="Alerts trigger at 1%"
          icon={<ShieldCheck className="size-4" />}
        />
        <MetricCard
          label="Active API keys"
          value={`${project.apiKeys.filter((key) => key.status === "active").length}`}
          helper="Rotate stale keys every 30 days"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Usage analytics</CardTitle>
            <CardDescription>Request volume, errors, and cost over the last 14 days.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">p95 latency</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.usage.map((entry) => (
                  <TableRow key={entry.date}>
                    <TableCell className="font-medium text-foreground">{entry.date}</TableCell>
                    <TableCell className="text-right">{entry.requests.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{entry.latencyP95} ms</TableCell>
                    <TableCell className="text-right">{entry.errors}</TableCell>
                    <TableCell className="text-right">${entry.cost.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
            <CardDescription>Security-sensitive events and deployment history.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityTimeline items={recentActivity} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">API credentials</CardTitle>
            <CardDescription>Manage tokens, rotate keys, and monitor last usage.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/projects/${project.slug}/api-keys`}>View all keys</Link>
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Scopes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.apiKeys.slice(0, 3).map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.label}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{key.status}</TableCell>
                  <TableCell>{key.lastUsed}</TableCell>
                  <TableCell>{key.scopes.join(", ")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
