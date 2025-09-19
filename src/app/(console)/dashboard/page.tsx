"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ShieldCheck, Signal, Workflow } from "lucide-react";

import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { MetricCard } from "@/components/dashboard/metric-card";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { projects, recentActivity } from "@/data/projects";

const UsageLineChart = dynamic(() => import("@/components/dashboard/usage-line-chart"), {
  loading: () => <Skeleton className="h-64 w-full rounded-xl" />,
  ssr: false,
});

const project = projects[0];
const MotionTableRow = motion(TableRow);

export default function DashboardOverviewPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [chartRange, setChartRange] = useState<"7d" | "14d" | "30d">("14d");

  useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timeout);
  }, []);

  const skeletonRows = useMemo(() => Array.from({ length: 6 }), []);
  const usageData = useMemo(() => filterUsage(project.usage, chartRange), [chartRange]);

  const requestsTrend = useMemo(() => usageData.map((entry) => entry.requests), [usageData]);
  const spendTrend = useMemo(() => usageData.map((entry) => entry.cost), [usageData]);
  const errorTrend = useMemo(
    () => usageData.map((entry) => (entry.requests > 0 ? (entry.errors / entry.requests) * 100 : 0)),
    [usageData],
  );
  const activeKeyTrend = useMemo(
    () => usageData.map(() => project.apiKeys.filter((key) => key.status === "active").length),
    [usageData],
  );

  const aggregateErrorRate = useMemo(() => {
    const totals = usageData.reduce(
      (acc, entry) => {
        acc.requests += entry.requests;
        acc.errors += entry.errors;
        return acc;
      },
      { requests: 0, errors: 0 },
    );
    if (totals.requests === 0) return "0.00%";
    return `${((totals.errors / totals.requests) * 100).toFixed(2)}%`;
  }, [usageData]);

  const activeKeys = useMemo(
    () => project.apiKeys.filter((key) => key.status === "active").length,
    [],
  );

  return (
    <section className="space-y-10">
      <DashboardHeader
        title="Welcome back"
        description="Monitor usage, manage credentials, and stay ahead of customer needs."
        actions={
          <Button asChild className="gap-2" disabled={isLoading}>
            <Link href="/dashboard/projects/new">Create project</Link>
          </Button>
        }
      />

      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {isLoading ? (
          [1, 2, 3, 4].map((key) => <MetricCardSkeleton key={key} />)
        ) : (
          <>
            <MetricCard
              label="Requests this month"
              value={project.monthlyRequests.toLocaleString()}
              change="▲ 12% vs last month"
              changeTone="positive"
              helper="Quota threshold at 68%"
              icon={<Signal className="size-4" />}
              trend={requestsTrend}
              loading={isLoading}
            />
            <MetricCard
              label="Monthly spend"
              value={`$${project.monthlySpend.toLocaleString()}`}
              change="Usage-based billing"
              helper="Billing plan: Scale"
              icon={<Workflow className="size-4" />}
              trend={spendTrend}
              loading={isLoading}
            />
            <MetricCard
              label="Error rate"
              value={aggregateErrorRate}
              change="▼ 0.04% vs last week"
              changeTone="positive"
              helper="Alerts trigger at 1%"
              icon={<ShieldCheck className="size-4" />}
              trend={errorTrend}
              loading={isLoading}
            />
            <MetricCard
              label="Active API keys"
              value={`${activeKeys}`}
              change="Stable past 7 days"
              changeTone="neutral"
              helper="Rotate stale keys every 30 days"
              trend={activeKeyTrend}
              loading={isLoading}
            />
          </>
        )}
      </motion.div>

      <motion.section
        className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
      >
        <Card className="border-border/70">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Usage analytics</CardTitle>
              <CardDescription>Requests, latency, errors, and spend for the selected window.</CardDescription>
            </div>
            <RangeToggle value={chartRange} onChange={setChartRange} />
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageLineChart data={usageData} loading={isLoading} />
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut", delay: 0.12 }}
        >
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
              <CardDescription>Security-sensitive events and deployment history.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {skeletonRows.slice(0, 4).map((_, idx) => (
                    <div key={idx} className="space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : (
                <ActivityTimeline items={recentActivity} />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.12 }}
      >
        <Card className="border-border/70">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">API credentials</CardTitle>
              <CardDescription>Manage tokens, rotate keys, and monitor last usage.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" disabled={isLoading}>
              <Link href={`/dashboard/projects/${project.slug}/api-keys`}>View all keys</Link>
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                {skeletonRows.slice(0, 3).map((_, idx) => (
                  <Skeleton key={idx} className="h-9 w-full" />
                ))}
              </div>
            ) : (
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
                  {project.apiKeys.slice(0, 3).map((key, index) => (
                    <MotionTableRow
                      key={key.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut", delay: index * 0.05 }}
                    >
                      <TableCell className="font-medium">{key.label}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">{key.status}</TableCell>
                      <TableCell>{key.lastUsed}</TableCell>
                      <TableCell>{key.scopes.join(", ")}</TableCell>
                    </MotionTableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}

function RangeToggle({
  value,
  onChange,
}: {
  value: "7d" | "14d" | "30d";
  onChange: (value: "7d" | "14d" | "30d") => void;
}) {
  const options: Array<{ label: string; value: "7d" | "14d" | "30d" }> = [
    { label: "7d", value: "7d" },
    { label: "14d", value: "14d" },
    { label: "30d", value: "30d" },
  ];

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 p-1 text-xs">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full px-3 py-1 font-medium transition ${
            value === option.value
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function filterUsage(usage: typeof project.usage, range: "7d" | "14d" | "30d") {
  if (range === "7d") {
    return usage.slice(-7);
  }
  if (range === "14d") {
    return usage.slice(-14);
  }
  const extended = extendUsage(usage, 30);
  return extended.slice(-30);
}

function extendUsage(usage: typeof project.usage, target: number) {
  if (usage.length >= target) {
    return usage;
  }
  const extended = [...usage];
  while (extended.length < target) {
    const last = extended[extended.length - 1];
    const nextDate = last ? last.date : usage[0].date;
    extended.push({ ...last, date: nextDate });
  }
  return extended;
}

function MetricCardSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="space-y-3 p-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}
