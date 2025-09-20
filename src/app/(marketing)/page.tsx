import Link from "next/link";
import type { JSX } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Layers3,
  ShieldCheck,
  TimerReset,
  TrendingUp,
  Webhook,
} from "lucide-react";

import { DashboardAwareButton } from "@/components/auth/dashboard-button";
import { HeroVisualization } from "@/components/marketing/hero-visualization";
import { BentoCard } from "@/components/ui/bento-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const trustLogos = ["Allied Finance", "Lendex", "NovaCredit", "Axiom Capital", "BlueSky Bank"];

const personaPillars = {
  underwriting: {
    label: "Underwriting",
    headline: "Equip credit teams to move from PDFs to ready-to-review files in minutes.",
    pillars: [
      {
        title: "Ledger fidelity",
        description: "Machine-normalised statements with variance flags so analysts focus on decisions, not data entry.",
      },
      {
        title: "Explainable risk",
        description: "Narratives map each risk flag to the triggering transactions, cutting follow-up cycles with applicants.",
      },
      {
        title: "Audit-ready export",
        description: "Generate regulator-friendly bundles and replay webhooks when second-line teams need evidence.",
      },
    ],
  },
  product: {
    label: "Product",
    headline: "Ship richer customer flows without wrestling legacy OCR pipelines.",
    pillars: [
      {
        title: "Drop-in API",
        description: "Opinionated REST + SDKs help you embed statement uploads alongside onboarding in a single sprint.",
      },
      {
        title: "Usage telemetry",
        description: "Metered analytics expose adoption per segment so you can price, package, and iterate with confidence.",
      },
      {
        title: "Versioned schemas",
        description: "Field-level versioning keeps front-end contracts stable as we add new institutions or templates.",
      },
    ],
  },
  compliance: {
    label: "Compliance",
    headline: "Maintain regulator trust with transparent processing and retention controls.",
    pillars: [
      {
        title: "Regional residency",
        description: "Deploy in EU, UK, or US regions with explicit residency guarantees and configurable retention windows.",
      },
      {
        title: "Traceable events",
        description: "Immutable pipeline logs and signature verification keep auditors satisfied during readiness reviews.",
      },
      {
        title: "Policy automation",
        description: "Data minimisation, redaction, and expirations are declarative so you schedule controls rather than script them.",
      },
    ],
  },
} as const;

const integrationTimeline = [
  {
    phase: "Day 0",
    title: "Request sandbox and install SDK",
    description:
      "Provision a sandbox project, sync secrets locally, and stub the upload endpoint using our TypeScript or Python client.",
  },
  {
    phase: "Day 3",
    title: "Wire the analyzer into onboarding",
    description:
      "Point your existing statement upload flow at CypherX, capture the statement_id, and surface progress to analysts or applicants.",
  },
  {
    phase: "Week 1",
    title: "Automate risk and downstream systems",
    description:
      "Subscribe to webhooks, sync ledgers into your warehouse, and push affordability narratives into credit decisioning tools.",
  },
  {
    phase: "Week 3",
    title: "Harden controls for production",
    description:
      "Enable regional residency, configure retention, and move to metered billing with dashboards for ops and compliance.",
  },
];

const architectureNodes = [
  {
    title: "Upload & classify",
    description: "One POST call or dashboard upload. We fingerprint the institution, language, and layout instantly.",
  },
  {
    title: "Analyzer core",
    description: "Mistral OCR + ledger normalisation + risk narratives orchestrated in a single pipeline.",
  },
  {
    title: "Delivery channels",
    description: "Webhooks, signed PDF bundles, and REST summaries keep analysts and tooling in sync.",
  },
  {
    title: "Data destinations",
    description: "Warehouse adapters push normalised rows into Snowflake, BigQuery, or Redshift automatically.",
  },
];

const roiHighlights = [
  {
    value: "37%",
    label: "Faster credit decisions",
    description: "Time from upload to approval thanks to automated ledger normalisation and risk narratives.",
  },
  {
    value: "92%",
    label: "Automation success",
    description: "Statements processed end to end with no analyst intervention after deploying webhooks and rules.",
  },
  {
    value: "18",
    suffix: "pt",
    label: "NPS lift",
    description: "Average customer satisfaction increase when CypherX replaces manual PDF reviews.",
  },
];

const customerTestimonials = [
  {
    quote:
      "CypherX turned multi-day statement reviews into a background task. Analysts now focus on edge cases instead of transcription.",
    name: "Leah Patel",
    role: "Head of Credit",
    company: "NovaCredit",
  },
  {
    quote:
      "The API contract is clean and the webhook reliability is rock solid. We embedded the analyzer without derailing our roadmap.",
    name: "Marcus Chen",
    role: "Group Product Manager",
    company: "Allied Finance",
  },
  {
    quote:
      "Our compliance audits finally have a single source of truth. Residency, retention, and PDFs are handled out of the box.",
    name: "Eva Rodríguez",
    role: "Chief Compliance Officer",
    company: "Axiom Capital",
  },
];

function LandingPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-24 pb-24 pt-16">
      <section className="relative min-h-[calc(100vh-120px)] lg:min-h-[calc(100vh-96px)]">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="mx-auto grid w-full max-w-[1380px] items-stretch gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_0.95fr] lg:gap-16 xl:px-10">
          <div className="flex h-full flex-col justify-between gap-10">
            <div className="flex flex-col gap-6 max-w-xl">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Turn raw bank statements into underwriting-ready insights.
              </h1>
              <p className="text-lg text-muted-foreground">
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
            </div>
            <div className="space-y-2 text-xs uppercase tracking-wide text-muted-foreground">
              <span>Trusted by underwriting teams at:</span>
              <div className="flex flex-wrap gap-3 text-sm font-medium text-foreground/70">
                {trustLogos.map((logo) => (
                  <span key={logo}>{logo}</span>
                ))}
              </div>
            </div>
          </div>

          <HeroVisualization className="h-full" />
        </div>
      </section>

      <ValuePillarsSection />
      <IntegrationJourneySection />
      <ProofStackSection />

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
            <p className="text-sm text-muted-foreground">
              Deliver a full audit trail: immutable logs, report bundles, and configurable retention periods. Our compliance team works with yours to meet regional data sovereignty requirements.
            </p>
            <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                <h3 className="font-semibold text-foreground">Signed PDF reports</h3>
                <p className="mt-2 text-xs">
                  Every statement export is hash-signed and linked to the ingestion job, ready for regulator review.
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                <h3 className="font-semibold text-foreground">Data residency controls</h3>
                <p className="mt-2 text-xs">Choose EU, UK, or US storage regions with configurable retention policies.</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                <h3 className="font-semibold text-foreground">PII minimisation</h3>
                <p className="mt-2 text-xs">Declarative policies redact sensitive fields before they touch your core systems.</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                <h3 className="font-semibold text-foreground">Live audit trail</h3>
                <p className="mt-2 text-xs">Searchable event logs capture every upload, retry, and webhook replay for auditors.</p>
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
              <p className="text-xs text-muted-foreground">Priya Natarajan · Head of Credit at Allied Finance</p>
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

function ValuePillarsSection(): JSX.Element {
  const personaKeys = Object.keys(personaPillars) as Array<keyof typeof personaPillars>;

  return (
    <section className="mx-auto flex w-full max-w-[1320px] flex-col gap-8 px-4 sm:px-6 lg:px-8 xl:px-10">
      <div className="space-y-3 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Tailored outcomes</p>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">Pick the lens that matches your team</h2>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
          Switch perspectives to see which CypherX capabilities unlock the most leverage for underwriting, product, and compliance leaders.
        </p>
      </div>

      <Tabs defaultValue="underwriting" className="w-full">
        <TabsList className="mx-auto flex w-full max-w-xl justify-between rounded-xl border border-border/60 bg-muted/20 p-1">
          {personaKeys.map((key) => (
            <TabsTrigger key={key} value={key} className="flex-1 rounded-lg text-sm font-medium">
              {personaPillars[key].label}
            </TabsTrigger>
          ))}
        </TabsList>

        {personaKeys.map((key) => {
          const persona = personaPillars[key];
          return (
            <TabsContent key={key} value={key} className="mt-6 space-y-6 focus-visible:outline-none">
              <p className="mx-auto max-w-2xl text-center text-sm text-muted-foreground">{persona.headline}</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {persona.pillars.map((pillar) => (
                  <Card key={pillar.title} className="border-border/60 bg-background/80">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-foreground">
                        {pillar.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {pillar.description}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
}

function IntegrationJourneySection(): JSX.Element {
  return (
    <section className="mx-auto grid w-full max-w-[1320px] gap-10 px-4 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 xl:px-10">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Path to production</p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">From sandbox to live statements in under a month</h2>
          <p className="text-sm text-muted-foreground">
            Follow the milestones our customers use to go live quickly—each stage links to the right docs, SDKs, and governance steps.
          </p>
        </div>
        <div className="space-y-4">
          {integrationTimeline.map((step, index) => (
            <div
              key={step.phase}
              className="flex gap-4 rounded-xl border border-border/60 bg-background/80 p-5 shadow-sm"
            >
              <div className="flex flex-col items-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                {index < integrationTimeline.length - 1 && (
                  <span className="mt-2 h-full w-px flex-1 bg-border/50" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{step.phase}</p>
                <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ArchitectureDiagram />
    </section>
  );
}

function ProofStackSection(): JSX.Element {
  return (
    <section className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 sm:px-6 lg:px-8 xl:px-10">
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Proof</p>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">Stakeholder wins you can benchmark</h2>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
          Lenders use CypherX to accelerate decisions, automate reconciliation, and upgrade customer experience. The gains below are drawn from production rollouts.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {roiHighlights.map((item) => (
          <Card key={item.label} className="border-border/60 bg-background/80">
            <CardContent className="space-y-2 p-6">
              <div className="text-4xl font-semibold text-foreground">
                {item.value}
                {item.suffix ? <span className="text-2xl align-super">{item.suffix}</span> : null}
              </div>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/80">
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 py-6 sm:px-8">
          {customerTestimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="min-w-[260px] max-w-sm snap-start rounded-xl border border-border/60 bg-muted/20 p-5 text-sm text-muted-foreground"
            >
              <p className="text-sm leading-relaxed text-foreground">“{testimonial.quote}”</p>
              <div className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">
                {testimonial.name} · {testimonial.role}
                <span className="block text-muted-foreground/80 normal-case">{testimonial.company}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArchitectureDiagram(): JSX.Element {
  return (
    <Card className="flex h-full flex-col border-border/60 bg-background/80">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Analyzer architecture at a glance</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex h-full flex-col gap-6">
          {architectureNodes.map((node, index) => (
            <div key={node.title} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-muted/30 text-xs font-semibold text-foreground">
                  {index + 1}
                </span>
                {index < architectureNodes.length - 1 && (
                  <span className="mt-2 h-full w-px flex-1 bg-border/50" />
                )}
              </div>
              <div className="flex-1 rounded-lg border border-border/60 bg-muted/10 p-4">
                <p className="text-sm font-semibold text-foreground">{node.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{node.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default LandingPage;
