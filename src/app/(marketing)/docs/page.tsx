"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  FileText,
  LifeBuoy,
  Search,
  ShieldCheck,
  Sparkles,
  Webhook,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeSnippetTabs } from "@/components/docs/code-snippet-tabs";

type QuickLink = {
  badge: string;
  title: string;
  description: string;
  href: string;
};

type HighlightLink = {
  title: string;
  description: string;
  href: string;
};

type SearchIndexItem = {
  title: string;
  description: string;
  href: string;
  category: "guide" | "endpoint" | "resource";
};

const quickLinks: QuickLink[] = [
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

const endpointHighlights: HighlightLink[] = [
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

const searchIndex: SearchIndexItem[] = [
  ...quickLinks.map((link) => ({
    title: link.title,
    description: link.description,
    href: link.href,
    category: "guide" as const,
  })),
  ...endpointHighlights.map((endpoint) => ({
    title: endpoint.title,
    description: endpoint.description,
    href: endpoint.href,
    category: "endpoint" as const,
  })),
  {
    title: "Webhook events",
    description: "Validate signatures, replay events, and configure alerts.",
    href: "/docs/reference#webhooks",
    category: "endpoint",
  },
  {
    title: "Error catalogue",
    description: "Decode validation failures and processing errors fast.",
    href: "/docs/reference#errors",
    category: "endpoint",
  },
  {
    title: "Support hub",
    description: "Contact support, open incidents, or join the community.",
    href: "/support",
    category: "resource",
  },
  {
    title: "Changelog",
    description: "See everything that shipped this month.",
    href: "/changelog",
    category: "resource",
  },
];

const languageSnippets = {
  ingestion: {
    curl: `curl https://api.cypherx.dev/v1/statements \\
  -H "Authorization: Bearer sk_sandbox_123" \\
  -F file=@statement.pdf \\
  -F metadata[client_reference]=ACME-LOAN`,
    node: `await cypherx.statements.upload({
  file: createReadStream("statement.pdf"),
  metadata: { client_reference: "ACME-LOAN" },
});`,
    python: `client.statements.upload(
    file=open("statement.pdf", "rb"),
    metadata={"client_reference": "ACME-LOAN"},
)`,
  },
  summary: {
    curl: `curl https://api.cypherx.dev/v1/statements/stm_123/summary \\
  -H "Authorization: Bearer sk_sandbox_123"`,
    node: `const summary = await cypherx.statements.summary("stm_123");`,
    python: `summary = client.statements.summary("stm_123")`,
  },
};

export default function DocsLanding() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    if (!query) return searchIndex;
    const normalized = query.trim().toLowerCase();
    return searchIndex.filter(
      (item) =>
        item.title.toLowerCase().includes(normalized) ||
        item.description.toLowerCase().includes(normalized),
    );
  }, [query]);

  const topMatches = matches.slice(0, 6);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query) return;
    const [first] = topMatches;
    if (first) router.push(first.href);
  };

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
        <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-2xl">
          <div className="relative">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search guides, endpoints, and resources"
              className="h-12 rounded-full border-border/60 bg-background/80 pl-12 pr-20 text-sm"
            />
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              ⌘K
            </span>
          </div>
        </form>
        {query ? (
          <div className="mx-auto mt-3 w-full max-w-2xl rounded-xl border border-border/60 bg-background/95 p-3 text-left shadow-lg">
            {topMatches.length === 0 ? (
              <p className="text-xs text-muted-foreground">No matches yet—try a different keyword.</p>
            ) : (
              <ul className="space-y-2">
                {topMatches.map((item) => (
                  <li key={item.href}>
                    <button
                      type="button"
                      onClick={() => router.push(item.href)}
                      className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-muted/60"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.category}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
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

      <section className="mx-auto w-full max-w-6xl space-y-10 px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mx-auto grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 grid gap-4 sm:grid-cols-3">
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
          </TabsContent>

          <TabsContent value="endpoints" className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
            <Card className="border-border/60 bg-background/85">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Grab a snippet</CardTitle>
                <CardDescription>Switch languages and copy live API calls in seconds.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-foreground">Upload a statement</h3>
                  <CodeSnippetTabs snippets={languageSnippets.ingestion} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-foreground">Retrieve a summary</h3>
                  <CodeSnippetTabs snippets={languageSnippets.summary} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources" className="mt-6 space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1.4fr_minmax(0,1fr)]">
              <Card className="border-border/70 bg-muted/20">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Latest changelog</CardTitle>
                  <CardDescription>Stay on top of what shipped recently.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground/70">September 18, 2025</p>
                    <p className="mt-1 text-sm font-medium text-foreground">Release 2025.09</p>
                    <ul className="mt-2 space-y-1">
                      <li>• Automated API key rotation policies</li>
                      <li>• Latency diagnostics dashboards</li>
                      <li>• Stripe billing sync for usage plans</li>
                    </ul>
                  </div>
                  <Button variant="ghost" className="px-0" asChild>
                    <Link href="/changelog" className="gap-1 text-sm">
                      View release notes <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Support options</CardTitle>
                  <CardDescription>Find the right channel for your team.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                    <LifeBuoy className="mt-1 size-4 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Open a ticket</p>
                      <p className="text-xs">24/7 coverage with 10 minute SLA on critical incidents.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                    <Sparkles className="mt-1 size-4 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Join the community</p>
                      <p className="text-xs">Share best practices with builders running CypherX in production.</p>
                    </div>
                  </div>
                  <Button variant="ghost" className="px-0" asChild>
                    <Link href="/support" className="gap-1 text-sm">
                      Visit support hub <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
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
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-background/90 p-4">
                  <p className="text-xs uppercase text-muted-foreground/70">Guides</p>
                  <p className="mt-1 text-sm font-medium text-foreground">Authentication patterns</p>
                  <p className="mt-1 text-xs">API keys, OAuth, and rotation schedules for secure access.</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/90 p-4">
                  <p className="text-xs uppercase text-muted-foreground/70">Reference</p>
                  <p className="mt-1 text-sm font-medium text-foreground">Webhook verification</p>
                  <p className="mt-1 text-xs">Signature helpers for Express, FastAPI, and more.</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/90 p-4">
                  <p className="text-xs uppercase text-muted-foreground/70">Compliance</p>
                  <p className="mt-1 text-sm font-medium text-foreground">Data residency</p>
                  <p className="mt-1 text-xs">Retention policies with EU, UK, and US regions.</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/90 p-4">
                  <p className="text-xs uppercase text-muted-foreground/70">Playbooks</p>
                  <p className="mt-1 text-sm font-medium text-foreground">Incident comms</p>
                  <p className="mt-1 text-xs">Webhook escalation templates and status page workflows.</p>
                </div>
              </div>
              <Separator />
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
