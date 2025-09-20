'use client';

import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

type HeroVisualizationProps = {
  className?: string;
};

function HeroVisualization({ className }: HeroVisualizationProps): JSX.Element {
  const timeline = useMemo(
    () => [
      {
        title: 'Fingerprint & classify',
        description: 'Detect issuing bank, language, and layout in under 400 ms before routing to the right extractor.',
        badge: 'Template graph',
      },
      {
        title: 'Normalize the ledger',
        description: 'Clean OCR, align columns, and enrich transactions with merchant intelligence and MCC taxonomy.',
        badge: 'Ledger fusion',
      },
      {
        title: 'Score explainable risk',
        description: 'Blend cash-flow ratios with anomaly detection to surface actionable, regulator-friendly narratives.',
        badge: 'Risk studio',
      },
      {
        title: 'Distribute & archive',
        description: 'Emit webhooks, deliver signed PDF bundles, and sync structured rows to your warehouse.',
        badge: 'Ops ready',
      },
    ],
    [],
  );

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveIndex((previous) => (previous + 1) % timeline.length);
    }, 3200);

    return () => window.clearInterval(id);
  }, [timeline.length]);

  const activeStep = timeline[activeIndex];

  return (
    <div className={cn('relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/80 shadow-xl', className)}>
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-gradient absolute -left-24 top-24 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
        <div className="animate-gradient-delay absolute -right-16 bottom-12 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl" />
      </div>

      <div className="relative flex flex-1 flex-col gap-8 p-6 sm:p-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span className="size-2 rounded-full bg-primary" /> Live MCP pipeline
              </span>
              <h3 className="text-xl font-semibold text-foreground">Statement intelligence in motion</h3>
              <p className="text-sm text-muted-foreground">
                Currently running: <span className="text-foreground">{activeStep.title}</span>
              </p>
            </div>
            <div className="relative flex h-14 w-14 items-center justify-center">
              <span className="absolute inset-0 rounded-full border border-primary/30" />
              <span className="absolute inset-[6px] rounded-full border border-primary/30" />
              <span className="absolute inset-[3px] rounded-full border-2 border-primary/60 border-t-transparent animate-spin" />
              <Sparkles className="relative size-5 text-primary" />
            </div>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            Watch the analyzer traverse each stage of the modern credit pipeline—no sandbox credentials required.
          </p>
        </div>

        <ol className="space-y-3 text-sm">
          {timeline.map((step, index) => {
            const isActive = index === activeIndex;
            return (
              <li
                key={step.title}
                className={`relative flex items-start gap-3 rounded-xl border px-4 py-4 transition-all duration-500 ${
                  isActive
                    ? 'border-primary/70 bg-primary/5 shadow-[0_20px_60px_-30px_rgba(59,130,246,0.65)]'
                    : 'border-border/60 bg-background/70'
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition ${
                    isActive
                      ? 'bg-primary/15 text-primary shadow-[0_0_0_1px_rgba(59,130,246,0.35)]'
                      : 'bg-muted/30 text-muted-foreground'
                  }`}
                >
                  {index + 1}
                </span>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{step.title}</p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      {step.badge}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/80">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="border-t border-border/60 pt-4 text-xs uppercase tracking-wide text-muted-foreground/70">
          <p>Pipeline telemetry refreshed every 30 seconds</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes heroGradient {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.45;
          }
          50% {
            transform: translate3d(6%, -6%, 0) scale(1.12);
            opacity: 0.75;
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.45;
          }
        }

        .animate-gradient {
          animation: heroGradient 9s ease-in-out infinite;
        }

        .animate-gradient-delay {
          animation: heroGradient 11s ease-in-out infinite;
          animation-delay: -3s;
        }
      `}</style>
    </div>
  );
}

export { HeroVisualization };
