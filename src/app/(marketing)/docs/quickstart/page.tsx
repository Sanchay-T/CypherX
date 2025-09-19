import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, CheckCircle, FileText, FolderGit2, Webhook } from "lucide-react";

const steps = [
  {
    title: "Create a sandbox project",
    description:
      "Sign in to the console, create a workspace, and copy the sandbox API key + webhook secret.",
    code: `npx cypherx init --project bank-analyzer --region eu-central`,
  },
  {
    title: "Upload a bank statement",
    description:
      "POST a PDF/CSV statement and receive an ingestion job ID plus immediate validation feedback.",
    code: `curl https://api.cypherx.dev/v1/statements \\
  -H "Authorization: Bearer sk_sandbox_123" \\
  -F file=@~/Documents/sample-statement.pdf`,
  },
  {
    title: "Poll for normalised data",
    description:
      "Use the job ID to fetch the statement summary, transaction ledger, and derived metrics.",
    code: `curl https://api.cypherx.dev/v1/statements/stm_abc/summary \\
  -H "Authorization: Bearer sk_sandbox_123"`,
  },
  {
    title: "Subscribe to lifecycle events",
    description:
      "Set up a webhook to know when statements finish processing or risk anomalies are detected.",
    code: `cypherx webhooks create --url https://api.yourapp.com/cx/webhooks \\
  --events statement.ready risk.flagged`,
  },
];

export default function QuickstartPage() {
  return (
    <div className="space-y-12 pb-20 pt-14">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
        <Badge variant="secondary" className="w-fit bg-secondary/40 text-secondary-foreground">
          Quickstart
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Launch the Bank Statement Analyzer API in under 15 minutes
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Provision a sandbox project, upload a statement, retrieve normalised data, and wire webhook notifications. The flow below matches what production lenders use to embed our analyzer.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <FolderGit2 className="size-4 text-primary" /> CLI project bootstrap & schema sync
          </span>
          <span className="inline-flex items-center gap-2">
            <FileText className="size-4 text-primary" /> PDF, CSV, and image ingestion
          </span>
          <span className="inline-flex items-center gap-2">
            <Webhook className="size-4 text-primary" /> Real-time processing events
          </span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <ol className="space-y-8">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-border/70 bg-muted/20 p-6 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{step.title}</h2>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  {index === 0 && (
                    <Badge variant="outline" className="hidden border-primary/40 text-primary md:inline-flex">
                      Recommended
                    </Badge>
                  )}
                </div>
                <pre className="rounded-lg border border-border/60 bg-background/95 p-4 text-xs text-muted-foreground">{step.code}</pre>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:px-8">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Environment variables</CardTitle>
            <CardDescription>Inject secrets securely for local development and CI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg border border-border/60 bg-background/95 p-4">
              <code className="block text-xs">
                CYPHERX_API_KEY=sk_sandbox_123
                {"\n"}CYPHERX_WEBHOOK_SECRET=whsec_abc
                {"\n"}CYPHERX_REGION=eu-central
              </code>
            </div>
            <p>
              Rotate sandbox keys weekly; production keys rotate automatically every 30 days. Manage keys in the
              <Link href="/dashboard/projects/launchpad/api-keys" className="font-medium text-foreground">
                {" "}console
              </Link>
              .
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Next steps</CardTitle>
            <CardDescription>Move from prototype to production-grade.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-1 size-4 text-primary" />
                <span>
                  Enable usage-based billing in the
                  <Link href="/dashboard/billing" className="font-medium text-foreground">
                    {" "}workspace billing panel
                  </Link>
                  .
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-1 size-4 text-primary" /> Invite credit analysts with least-privilege roles.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-1 size-4 text-primary" /> Connect webhook automation to underwriting queues.
              </li>
            </ul>
            <Separator />
            <Button asChild className="gap-2">
              <Link href="/docs/reference">
                Deep dive into the API
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 rounded-2xl border border-border/70 bg-muted/20 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Need a guided walkthrough?</h2>
            <p className="text-sm text-muted-foreground">
              Run <code className="rounded bg-muted px-1.5 py-0.5 text-xs">npx cypherx demo</code> to scaffold a fully working sample with mock data.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/onboarding">Launch demo workspace</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
