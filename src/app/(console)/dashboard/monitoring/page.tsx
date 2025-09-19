import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { MetricCard } from "@/components/dashboard/metric-card";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { projects, recentActivity } from "@/data/projects";

const project = projects[0];

export default function MonitoringPage() {
  return (
    <section className="space-y-8">
      <DashboardHeader
        title="Usage & health"
        description="Track latency, uptime, and request volume across all projects."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Latency p95" value="188 ms" change="▼ 12 ms" changeTone="positive" helper="Objective 220 ms" />
        <MetricCard label="Error rate" value="0.32%" change="▲ 0.05%" changeTone="negative" helper="Error budget 21d" />
        <MetricCard label="Requests (24h)" value="1.8M" helper="Peak at 13:00 UTC" />
        <MetricCard label="Incidents" value="0" helper="Past 7 days" />
      </div>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Service overview</CardTitle>
          <CardDescription>Top projects by traffic and risk signals.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Error rate</TableHead>
                <TableHead className="text-right">Latency p95</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[project].map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                  <TableCell className="text-right">{item.monthlyRequests.toLocaleString()}</TableCell>
                  <TableCell className="text-right">0.29%</TableCell>
                  <TableCell className="text-right">188 ms</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Latest alerts</CardTitle>
          <CardDescription>Operational events surfaced across every workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityTimeline items={recentActivity} />
        </CardContent>
      </Card>
    </section>
  );
}
