import Link from "next/link";
import { ArrowRight, BookOpen, FileText, ShieldCheck, Webhook } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const quickLinks = [
  {
    badge: "Get started",
    title: "Quickstart",
    description: "Provision a sandbox project, upload your first statement, and fetch analytics in minutes.",
    href: "/docs/quickstart",
  },
  {
    badge: "Reference",
    title: "API reference",
    description: "Explore authentication, ingestion endpoints, risk summaries, and webhook payloads.",
    href: "/docs/reference",
  },
  {
    badge: "SDK",
    title: "CLI & SDK tooling",
    description: "Generate TypeScript and Python SDKs, run local mocks, and automate schema checks.",
    href: "/docs/quickstart#tooling",
  },
];

const endpointHighlights = [
  {
    title: "Upload statement",
    description: "POST a PDF or CSV and receive a job ID plus validation issues.",
    href: "/docs/reference#upload-statement",
  },
  {
    title: "Retrieve summary",
    description: "Fetch balance overview, cash-flow metrics, and affordability ratios.",
    href: "/docs/reference#statement-summary",
  },
  {
    title: "List transactions",
    description: "Paginate enriched transactions with merchant metadata and categorisation confidence.",
    href: "/docs/reference#transactions",
  },
  {
    title: "Risk flags",
    description: "Surface anomaly explanations, bounced cheque alerts, and suspicious activity markers.",
    href: "/docs/reference#risk-flags",
  },
  {
    title: "Webhook events",
    description: "Receive notifications when reports are ready, errors occur, or thresholds trip.",
    href: "/docs/reference#webhooks",
  },
  {
    title: "Error catalogue",
    description: "Understand validation and processing error codes with recommended fixes.",
    href: "/docs/reference#errors",
  },
];

export default function DocsLanding() {
  return (
    <div className="space-y-20 pb-20 pt-16">
      <section className="mx-auto w-full max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/20 px-3 py-1 text-xs font-medium text-muted-foreground">
          <BookOpen className="size-3.5" /> CypherX documentation
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          The definitive guide to the Bank Statement Analyzer API.
        </h1>
        <p className="mt-4 text-muted-foreground">
          Integrate the same intelligence engine that powers our desktop analyzer. Start with the quickstart, then dive into detailed endpoint references, webhook payloads, and SDK examples.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/docs/quickstart">Start building</Link>
          </Button>
          <Button variant="outline" asChild size="lg">
            <Link href="/docs/reference" className="gap-1">
              Browse reference <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {quickLinks.map((item) => (
            <Card key={item.title} className="border-border/70">
              <CardHeader className="space-y-1">
                <Badge variant="secondary" className="w-fit bg-secondary/40 text-secondary-foreground">
                  {item.badge}
                </Badge>
                <CardTitle className="text-base font-semibold">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="px-0" asChild>
                  <Link href={item.href} className="gap-1 text-sm">
                    Open guide <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">Core endpoints</h2>
            <Button variant="ghost" className="gap-1 text-sm" asChild>
              <Link href="/docs/reference">
                View full reference
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {endpointHighlights.map((endpoint) => (
              <Card key={endpoint.title} className="border-border/60 bg-muted/20">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">{endpoint.title}</CardTitle>
                  <CardDescription>{endpoint.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="px-0" asChild>
                    <Link href={endpoint.href} className="gap-1 text-sm">
                      Jump to section <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/30 py-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="space-y-4 lg:max-w-md">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Security, support, and compliance built in.
            </h2>
            <p className="text-muted-foreground">
              Learn how we secure data in transit and at rest, manage data retention, and keep customers informed when statements fail validation.
            </p>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> SOC 2 Type II, ISO 27001
              </span>
              <span className="inline-flex items-center gap-2">
                <FileText className="size-4 text-primary" /> Retention policies & audit logs
              </span>
              <span className="inline-flex items-center gap-2">
                <Webhook className="size-4 text-primary" /> Real-time incident communication
              </span>
            </div>
            <Button asChild variant="outline" className="w-fit">
              <Link href="/support">Visit the support hub</Link>
            </Button>
          </div>
          <Card className="w-full border-border/70 bg-muted/20 lg:max-w-xl">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Popular resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ul className="space-y-2">
                <li>• Authentication patterns (API keys, OAuth client credentials)</li>
                <li>• Mapping CypherX categories to your downstream systems</li>
                <li>• Data residency & retention FAQs</li>
                <li>• Webhook signature verification (with sample middleware)</li>
              </ul>
              <Button variant="ghost" className="px-0" asChild>
                <Link href="/docs/reference#webhooks" className="gap-1 text-sm">
                  View webhook guide <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
