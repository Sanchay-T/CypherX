"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  changeTone?: "positive" | "negative" | "neutral";
  helper?: string;
  icon?: React.ReactNode;
  trend?: number[];
  loading?: boolean;
}

export function MetricCard({
  label,
  value,
  change,
  changeTone = "neutral",
  helper,
  icon,
  trend,
  loading = false,
}: MetricCardProps) {
  const palette = {
    positive: { track: "stroke-emerald-500/30", stroke: "stroke-emerald-500" },
    negative: { track: "stroke-destructive/40", stroke: "stroke-destructive" },
    neutral: { track: "stroke-indigo-500/30", stroke: "stroke-indigo-500" },
  } satisfies Record<NonNullable<MetricCardProps["changeTone"]>, { track: string; stroke: string }>;

  const toneKey = changeTone ?? "neutral";
  const { track, stroke } = palette[toneKey];

  return (
    <Card className="border-border/70 bg-background/95 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {trend && trend.length > 1 ? (
          <MetricChart data={trend} tone={stroke} toneTrack={track} loading={loading} />
        ) : null}
        <div className="space-y-1">
          <div className="text-2xl font-semibold text-foreground">{value}</div>
          {change ? (
            <p
              className={
                changeTone === "positive"
                  ? "text-xs font-medium text-emerald-500"
                  : changeTone === "negative"
                  ? "text-xs font-medium text-destructive"
                  : "text-xs text-muted-foreground"
              }
            >
              {change}
            </p>
          ) : null}
        </div>
        {helper ? <p className="text-xs text-muted-foreground/80">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}

function MetricChart({
  data,
  tone,
  toneTrack,
  loading,
}: {
  data: number[];
  tone: string;
  toneTrack: string;
  loading: boolean;
}) {
  const normalised = useMemo(() => normalise(data), [data]);

  return (
    <div className="relative h-20 w-full overflow-hidden rounded-lg border border-border/40 bg-gradient-to-br from-background via-background/60 to-background">
      <svg viewBox="0 0 100 40" className="h-full w-full">
        <path
          d="M 0 39 L 100 39"
          className={`stroke-[0.5] ${toneTrack}`}
          strokeLinecap="round"
        />
        <GridLines />
        <motion.path
          d={normalised.curve}
          fill="none"
          className={`${tone} stroke-[1.6]`}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: loading ? 0.4 : 0.25, ease: [0.33, 1, 0.68, 1] }}
        />
        <motion.path
          d={normalised.curve}
          fill="none"
          className="stroke-[5] stroke-primary/10"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: loading ? 0.45 : 0.3, ease: [0.33, 1, 0.68, 1] }}
        />
      </svg>
      <motion.div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      />
    </div>
  );
}

function GridLines() {
  return (
    <g className="stroke-border/50">
      {[20, 40, 60, 80].map((offset) => (
        <line key={offset} x1={offset} y1={4} x2={offset} y2={36} strokeWidth={0.3} />
      ))}
      {[12, 24, 32].map((offset) => (
        <line key={offset} x1={0} y1={offset} x2={100} y2={offset} strokeWidth={0.3} />
      ))}
    </g>
  );
}

function normalise(values: number[]) {
  const width = 100;
  const height = 40;
  const [min, max] = values.reduce(
    (acc, value) => {
      if (value < acc.min) acc.min = value;
      if (value > acc.max) acc.max = value;
      return acc;
    },
    { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
  );

  const span = max - min || 1;

  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * width;
    const y = height - ((value - min) / span) * (height - 6) - 2;
    return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : height / 2 };
  });

  const curve = points
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      return `L ${point.x} ${point.y}`;
    })
    .join(" ");

  return { curve };
}
