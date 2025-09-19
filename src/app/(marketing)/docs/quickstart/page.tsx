import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CodeSnippetTabs } from "@/components/docs/code-snippet-tabs";
import { ArrowRight, CheckCircle, FileText, FolderGit2, Info, PlugZap, Server, Webhook } from "lucide-react";

const prerequisites = [
  "CypherX console access with sandbox project permissions",
  "CypherX CLI v0.10.0+ installed locally",
  "Webhook endpoint capable of verifying HMAC signatures",
  "Sample PDF, CSV, or image bank statement",
];

const steps = [
  {
    title: "Create a sandbox project",
    description:
      "Sign in to the console, create a workspace, and copy the sandbox API key + webhook secret.",
    snippets: {
      curl: `npx cypherx init --project bank-analyzer --region eu-central`,
      node: `import { spawn } from "node:child_process";

spawn("npx", ["cypherx", "init", "--project", "bank-analyzer", "--region", "eu-central"], {
  stdio: "inherit",
});`,
      python: `import subprocess

subprocess.run([
  "npx",
  "cypherx",
  "init",
  "--project",
  "bank-analyzer",
  "--region",
  "eu-central",
], check=True)
`,
    },
    tip: "Sandbox projects mirror production capabilities but automatically redact personal data in logs.",
  },
  {
    title: "Upload a bank statement",
    description:
      "POST a PDF/CSV statement and receive an ingestion job ID plus immediate validation feedback.",
    snippets: {
      curl: `curl https://api.cypherx.dev/v1/statements \\
  -H "Authorization: Bearer sk_sandbox_123" \\
  -F file=@~/Documents/sample-statement.pdf \\
  -F metadata[client_reference]=ACME-ONBOARD`,
      node: `import fs from "node:fs";
import FormData from "form-data";

const form = new FormData();
form.append("file", fs.createReadStream("sample-statement.pdf"));
form.append("metadata[client_reference]", "ACME-ONBOARD");

await fetch("https://api.cypherx.dev/v1/statements", {
  method: "POST",
  headers: { Authorization: "Bearer " + process.env.CYPHERX_API_KEY },
  body: form,
});`,
      python: `import requests

with open("sample-statement.pdf", "rb") as fh:
    files = {"file": fh}
    data = {"metadata[client_reference]": "ACME-ONBOARD"}
    res = requests.post(
        "https://api.cypherx.dev/v1/statements",
        headers={"Authorization": "Bearer " + API_KEY},
        files=files,
        data=data,
        timeout=30,
    )
    res.raise_for_status()
`,
    },
    tip: "IDs beginning with stm_ indicate the document is processing. Retry with exponential backoff if the response is 202 Accepted.",
  },
  {
    title: "Retrieve normalised data",
    description:
      "Use the job ID to fetch the statement summary, transaction ledger, and derived metrics.",
    snippets: {
      curl: `curl https://api.cypherx.dev/v1/statements/stm_abc123/summary \\
  -H "Authorization: Bearer sk_sandbox_123"`,
      node: `const res = await fetch(
  "https://api.cypherx.dev/v1/statements/stm_abc123/summary",
  { headers: { Authorization: "Bearer " + process.env.CYPHERX_API_KEY } },
);
const summary = await res.json();
`,
      python: `import requests

summary = requests.get(
    "https://api.cypherx.dev/v1/statements/stm_abc123/summary",
    headers={"Authorization": "Bearer " + API_KEY},
    timeout=15,
).json()
`,
    },
    tip: "Pair the summary endpoint with /transactions for transaction-level analytics using the same statement_id.",
  },
  {
    title: "Subscribe to lifecycle events",
    description:
      "Set up a webhook to know when statements finish processing or risk anomalies are detected.",
    snippets: {
      curl: `cypherx webhooks create \\
  --url https://api.yourapp.com/cx/webhooks \\
  --events statement.ready risk.flagged`,
      node: `await fetch("https://api.cypherx.dev/v1/webhooks", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + process.env.CYPHERX_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: "https://api.yourapp.com/cx/webhooks",
    events: ["statement.ready", "risk.flagged"],
  }),
});`,
      python: `import requests

requests.post(
    "https://api.cypherx.dev/v1/webhooks",
    headers={
        "Authorization": "Bearer " + API_KEY,
        "Content-Type": "application/json",
    },
    json={
        "url": "https://api.yourapp.com/cx/webhooks",
        "events": ["statement.ready", "risk.flagged"],
    },
    timeout=15,
)
`,
    },
    tip: "Verify the CypherX-Signature header to guard against replay attacks and rotate webhook secrets quarterly.",
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
        <div className="mb-12 grid gap-6 lg:grid-cols-[1.1fr_minmax(0,1fr)]">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Prerequisites</CardTitle>
              <CardDescription>Check these off before you start the integration flow.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="space-y-2">
                {prerequisites.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle className="mt-1 size-4 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-muted/10">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Architecture snapshot</CardTitle>
              <CardDescription>Understand how the analyzer interacts with your systems.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/90 px-4 py-3">
                <PlugZap className="mt-1 size-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Ingestion</p>
                  <p>Upload statements directly or via your console automations. Metadata persists through every endpoint.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/90 px-4 py-3">
                <Server className="mt-1 size-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Processing</p>
                  <p>CypherX normalises, enriches, and scores transactions in under two minutes on average.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/90 px-4 py-3">
                <Webhook className="mt-1 size-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Delivery</p>
                  <p>Webhooks, summaries, and ledgers power your underwriting, dashboards, and audit logs.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <ol className="relative space-y-10 border-l border-border/50 pl-7">
          {steps.map((step, index) => (
            <li key={step.title} className="relative space-y-4 rounded-2xl border border-border/60 bg-muted/15 p-6 shadow-sm">
              <span className="absolute -left-[43px] flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-primary text-sm font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <div className="space-y-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-foreground">{step.title}</h2>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  {index === 0 && (
                    <Badge variant="outline" className="self-start border-primary/50 text-primary">
                      Start here
                    </Badge>
                  )}
                </div>
              </div>
              <CodeSnippetTabs snippets={step.snippets} className="shadow-sm" />
              {step.tip ? (
                <Alert className="border-border/60 bg-background/80">
                  <Info className="size-4 text-primary" />
                  <AlertTitle>Tip</AlertTitle>
                  <AlertDescription>{step.tip}</AlertDescription>
                </Alert>
              ) : null}
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
