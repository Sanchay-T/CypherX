import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Layers3,
  ShieldCheck,
  Sparkles,
  TimerReset,
  TrendingUp,
  Webhook,
} from "lucide-react";

import { DashboardAwareButton } from "@/components/auth/dashboard-button";
import { BentoCard } from "@/components/ui/bento-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const featureCards = [
  {
    title: "Statement ingestion",
    description: "Upload PDF, CSV, or image-based statements and receive normalised datasets in seconds.",
    icon: <FileText className="size-5 text-muted-foreground" />,
    footer: "150+ banking templates pre-trained.",
  },
  {
    title: "Normalised ledger",
    description: "Enriched transaction streams with merchant mapping, MCC codes, and categorisation confidence.",
    icon: <Layers3 className="size-5 text-muted-foreground" />,
    footer: "Column-stable schema across institutions.",
  },
  {
    title: "Explainable risk",
    description: "Affordability ratios, anomaly detection, and risk narratives aligned with underwriting teams.",
    icon: <TrendingUp className="size-5 text-muted-foreground" />,
    footer: "Every flag includes triggering evidence.",
  },
  {
    title: "Audit & compliance",
    description: "Immutable audit logs, signed PDF reports, and retention policies that pass regulator checks.",
    icon: <ShieldCheck className="size-5 text-muted-foreground" />,
    footer: "SOC 2 Type II, ISO 27001 ready.",
  },
  {
    title: "Usage-based billing",
    description: "Expose metered usage per client, reconcile invoices, and sync into your ERP automatically.",
    icon: <TimerReset className="size-5 text-muted-foreground" />,
    footer: "Fair pricing, zero surprise overages.",
  },
  {
    title: "Automation hooks",
    description: "Trigger underwriting workflows, notify analysts, or update CRMs via signed webhooks.",
    icon: <Webhook className="size-5 text-muted-foreground" />,
    footer: "Replay & signature verification built in.",
  },
];

const howItWorks = [
  {
    title: "1. Upload statement",
    description: "POST the document and receive a job ID plus validation feedback.",
  },
  {
    title: "2. Retrieve analytics",
    description: "Fetch the normalised summary, ledger, and KPIs when processing completes.",
  },
  {
    title: "3. Flag risk",
    description: "Review anomalies with natural-language explanations and affected transactions.",
  },
  {
    title: "4. Notify & archive",
    description: "Receive webhook events, download signed PDF reports, and store to your archive.",
  },
];

const trustLogos = ["Allied Finance", "Lendex", "NovaCredit", "Axiom Capital", "BlueSky Bank"];

export default function LandingPage() {
  return (
    <div className="flex flex-col gap-24 pb-24 pt-16">
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="mx-auto grid w-full max-w-[1380px] items-start gap-12 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.95fr] lg:gap-16 xl:px-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5" /> Bank Statement Analyzer API
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Turn raw bank statements into underwriting-ready insights.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              CypherX exposes the same engine our lenders rely on: one upload, automated validation, enriched ledgers, affordability metrics, and explainable risk signals. Plug it into lending workflows, financial dashboards, or credit scoring in hours—not months.
            </p>
            <div className="flex flex-wrap gap-3">
              <DashboardAwareButton
                size="lg"
                signedOutHref="/signup"
                signedOutLabel="Request sandbox access"
                signedInLabel="Go to dashboard"
              />
              <Button variant="outline" size="lg" asChild>
                <Link href="/docs" className="gap-2">
                  Explore documentation
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" /> 280+ financial institutions supported
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> SOC 2 Type II & GDPR compliant
              </span>
              <span className="inline-flex items-center gap-2">
                <FileText className="size-4 text-primary" /> Regulator-ready PDF report bundle
              </span>
            </div>
            <div className="mt-4 grid max-w-xl gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <span>Trusted by underwriting teams at:</span>
              <div className="flex flex-wrap gap-4 text-sm font-medium text-foreground/70">
                {trustLogos.map((logo) => (
                  <span key={logo}>{logo}</span>
                ))}
              </div>
            </div>
          </div>

          <Card className="relative overflow-hidden border border-border/60 bg-background/80 shadow-xl">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
            <CardHeader>
              <CardTitle className="text-base font-semibold">How developers ship with CypherX</CardTitle>
              <CardDescription>Four-step playbook from first upload to production automation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ol className="space-y-2.5">
                {howItWorks.map((item) => (
                  <li key={item.title} className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                    <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {item.title.split(".")[0]}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground/80">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Button asChild className="w-full">
                <Link href="/docs/quickstart" className="gap-2">
                  View quickstart guide
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1320px] gap-12 px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="space-y-4 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Why teams embed the analyzer API</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            A single integration normalises formats, enriches transactions, surfaces risk, and keeps auditors satisfied. Strip out the busywork so analysts can approve more applications faster.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((feature) => (
            <BentoCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
              footer={feature.footer}
            />
          ))}
        </div>
      </section>

      <section className="bg-muted/30 py-20">
        <div className="mx-auto grid w-full max-w-[1320px] gap-12 px-4 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:px-8 xl:px-10">
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Proof for stakeholders and regulators.</h2>
            <p className="text-muted-foreground">
              Deliver a full audit trail: immutable logs, report bundles, and configurable retention periods. Our compliance team works with yours to meet regional data sovereignty requirements.
            </p>
            <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                <h3 className="font-semibold text-foreground">Signed PDF reports</h3>
                <p className="mt-2 text-xs">Every statement export is hash-signed and linked to the ingestion job, ready for regulator review.</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                <h3 className="font-semibold text-foreground">Data residency controls</h3>
                <p className="mt-2 text-xs">Choose EU, UK, or US storage regions with configurable retention policies.</p>
              </div>
            </div>
          </div>
          <Card className="border-border/70 bg-background/80 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Quote from underwriting lead</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p className="italic">
                “Integrating CypherX took a weekend. Our analysts now receive enriched ledgers and risk narratives instantly—loan decisions are 37% faster and satisfy every audit request.”
              </p>
              <p className="text-xs text-muted-foreground">
                Priya Natarajan · Head of Credit at Allied Finance
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-[1320px] flex-col gap-8 px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Ready to embed statement intelligence?</h2>
            <p className="text-muted-foreground">
              Request sandbox access, wire the sample app, and talk to our engineers when you are ready for production.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <DashboardAwareButton
              size="lg"
              signedOutHref="/signup"
              signedOutLabel="Request sandbox"
              signedInLabel="Go to dashboard"
            />
            <Button size="lg" variant="outline" asChild>
              <Link href="/pricing">See pricing</Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link href="/docs/reference">View API reference</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
