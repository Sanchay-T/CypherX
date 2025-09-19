import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { projects } from "@/data/projects";

export default function ProjectUsagePage({ params }: { params: { slug: string } }) {
  const project = projects.find((item) => item.slug === params.slug);

  if (!project) {
    notFound();
  }

  const quota = 12_000_000;
  const usagePercent = Math.min(100, Math.round((project.monthlyRequests / quota) * 100));

  return (
    <div className="space-y-6">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Current month summary</CardTitle>
          <CardDescription>Quota utilization and anomaly alerts for this billing cycle.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Usage {usagePercent}%</span>
            <span>
              {project.monthlyRequests.toLocaleString()} / {quota.toLocaleString()} requests
            </span>
          </div>
          <Progress value={usagePercent} />
          <div className="grid gap-3 sm:grid-cols-3">
            <UsageStat label="Requests today" value="620,114" helper="▼ 4% vs yesterday" />
            <UsageStat label="Error budget" value="92% remaining" helper="healthy" />
            <UsageStat label="Spend forecast" value="$1,420" helper="Projected month end" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Daily breakdown</CardTitle>
          <CardDescription>Export to CSV or pipe to your warehouse for deeper analysis.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">p95 latency</TableHead>
                <TableHead className="text-right">Errors</TableHead>
                <TableHead className="text-right">Spend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.usage.map((entry) => (
                <TableRow key={entry.date}>
                  <TableCell className="font-medium">{entry.date}</TableCell>
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
    </div>
  );
}

type UsageStatProps = {
  label: string;
  value: string;
  helper?: string;
};

function UsageStat({ label, value, helper }: UsageStatProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/80 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground/80">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
      {helper ? <p className="text-xs text-muted-foreground/80">{helper}</p> : null}
    </div>
  );
}
