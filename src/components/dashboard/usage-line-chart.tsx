"use client";

import { memo, useMemo } from "react";
import type { TooltipProps } from "recharts";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  ReferenceLine,
  Area,
} from "recharts";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project } from "@/data/projects";

interface UsageLineChartProps {
  data: Project["usage"];
  loading?: boolean;
}

function UsageLineChartComponent({ data, loading = false }: UsageLineChartProps) {
  const chartData = useMemo(() => normaliseData(data), [data]);

  if (loading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  return (
    <Card className="border-transparent bg-background/95 p-4 shadow-sm">
      <div className="grid gap-1 pb-6">
        <p className="text-sm font-semibold text-foreground">Performance snapshot</p>
        <p className="text-xs text-muted-foreground">
          Requests, cost, errors, and latency over time. Hover to inspect precise values.
        </p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 10, right: 24, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="requestsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" opacity={0.1} vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="left"
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={60}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <YAxis
            yAxisId="right"
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            orientation="right"
            width={60}
            tickFormatter={(value) => `${value}ms`}
          />
          <Tooltip content={<AnalyticsTooltip />} cursor={{ stroke: "#6366f1", strokeWidth: 0.5 }} />
          <Legend
            iconType="circle"
            formatter={(value) => (
              <span className="text-xs font-medium text-muted-foreground">{value}</span>
            )}
          />
          <ReferenceLine
            yAxisId="right"
            y={chartData.reduce((acc, entry) => acc + entry.latency, 0) / chartData.length}
            stroke="#22c55e"
            strokeDasharray="4 4"
            opacity={0.25}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="requests"
            stroke="#6366f1"
            strokeWidth={1.6}
            fillOpacity={1}
            fill="url(#requestsGradient)"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="errors"
            stroke="#f97316"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="cost"
            stroke="#a855f7"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="latency"
            stroke="#22c55e"
            strokeWidth={1.8}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

function AnalyticsTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const lookup = payload.reduce<Record<string, number>>((acc, item) => {
    if (item.dataKey && typeof item.value === "number") {
      acc[item.dataKey] = item.value;
    }
    return acc;
  }, {});

  return (
    <div className="rounded-lg border border-border/60 bg-background/95 p-3 text-xs shadow-lg backdrop-blur">
      <p className="mb-2 font-medium text-foreground">{label}</p>
      <div className="grid gap-1">
        <TooltipRow label="Requests" value={`${lookup.requests?.toLocaleString?.() ?? 0}`} color="#6366f1" />
        <TooltipRow label="Cost" value={`$${lookup.cost?.toFixed?.(2) ?? "0.00"}`} color="#a855f7" />
        <TooltipRow label="Errors" value={`${lookup.errors?.toLocaleString?.() ?? 0}`} color="#f97316" />
        <TooltipRow label="p95 latency" value={`${lookup.latency?.toFixed?.(0) ?? 0} ms`} color="#22c55e" />
      </div>
    </div>
  );
}

function TooltipRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function normaliseData(usage: Project["usage"]) {
  return usage.map((entry) => ({
    date: entry.date,
    requests: entry.requests,
    errors: entry.errors,
    latency: entry.latencyP95,
    cost: Number(entry.cost.toFixed(2)),
  }));
}

export default memo(UsageLineChartComponent);
