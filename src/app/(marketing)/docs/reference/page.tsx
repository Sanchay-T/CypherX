import Link from "next/link";

import { LanguageSelect } from "@/components/docs/language-select";
import { DocsLanguageProvider } from "@/components/docs/docs-language-context";
import { EndpointActions } from "@/components/docs/endpoint-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CodeSnippetTabs } from "@/components/docs/code-snippet-tabs";
import {
  ArrowRight,
  BookOpen,
  FileText,
  KeyRound,
  Layers,
  Search,
  ShieldCheck,
} from "lucide-react";

const navSections = [
  {
    label: "Overview",
    anchors: [
      { title: "Authentication", href: "#authentication" },
      { title: "Idempotency", href: "#idempotency" },
      { title: "Errors", href: "#errors" },
    ],
  },
  {
    label: "Endpoints",
    anchors: [
      { title: "Upload statement", href: "#upload-statement" },
      { title: "Statement summary", href: "#statement-summary" },
      { title: "Transactions", href: "#transactions" },
      { title: "Risk flags", href: "#risk-flags" },
      { title: "Webhook events", href: "#webhooks" },
    ],
  },
];


const endpoints = [
  {
    id: "upload-statement",
    method: "POST",
    path: "/v1/statements",
    summary: "Upload a bank statement document and kick off normalization.",
    quickSpecs: [
      { label: "Scope", value: "statements:write" },
      { label: "Rate limit", value: "60/min" },
      { label: "Payload", value: "≤ 15 MB" },
    ],
    snippets: {
      curl: `curl https://api.cypherx.dev/v1/statements \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "Content-Type: multipart/form-data" \
  -F file=@statement.pdf \
  -F metadata[client_reference]=ACME-LOAN-42`,
      node: `const form = new FormData();
form.append("file", fs.createReadStream("statement.pdf"));
form.append("metadata[client_reference]", "ACME-LOAN-42");

await fetch("https://api.cypherx.dev/v1/statements", {
  method: "POST",
  headers: { Authorization: "Bearer " + process.env.CYPHERX_API_KEY! },
  body: form,
});`,
      python: `files = {"file": open("statement.pdf", "rb")}
data = {"metadata[client_reference]": "ACME-LOAN-42"}

requests.post(
  "https://api.cypherx.dev/v1/statements",
  headers={"Authorization": f"Bearer {API_KEY}"},
  files=files,
  data=data,
  timeout=30,
)`,
      go: `body := &bytes.Buffer{}
writer := multipart.NewWriter(body)
file, _ := os.Open("statement.pdf")
part, _ := writer.CreateFormFile("file", filepath.Base(file.Name()))
io.Copy(part, file)
writer.WriteField("metadata[client_reference]", "ACME-LOAN-42")
writer.Close()

req, _ := http.NewRequest("POST", "https://api.cypherx.dev/v1/statements", body)
req.Header.Set("Authorization", "Bearer "+apiKey)
req.Header.Set("Content-Type", writer.FormDataContentType())
client.Do(req)`,
    },
    response: `{
  "statement_id": "stm_92f8cf",
  "status": "processing",
  "validation": {
    "severity": "warning",
    "messages": ["Missing institution logo"]
  }
}`,
    tips: [
      "Supports PDF, CSV, JPG, and PNG formats; password-protected files return statement.invalid_format.",
      "Store the statement_id to request summaries, transactions, and risk flags.",
      "Use metadata fields to persist your internal loan or applicant references.",
    ],
  },
  {
    id: "statement-summary",
    method: "GET",
    path: "/v1/statements/{statement_id}/summary",
    summary: "Retrieve normalized balances, cash-flow metrics, and affordability ratios.",
    quickSpecs: [
      { label: "Scope", value: "statements:read" },
      { label: "Latency", value: "~250 ms" },
      { label: "Retention", value: "90 days" },
    ],
    snippets: {
      curl: `curl https://api.cypherx.dev/v1/statements/stm_92f8cf/summary \
  -H "Authorization: Bearer sk_live_xxx"`,
      node: `const res = await fetch(
  "https://api.cypherx.dev/v1/statements/stm_92f8cf/summary",
  { headers: { Authorization: "Bearer " + API_KEY } }
);
const summary = await res.json();`,
      python: `summary = requests.get(
  "https://api.cypherx.dev/v1/statements/stm_92f8cf/summary",
  headers={"Authorization": f"Bearer {API_KEY}"},
).json()`,
      go: `req, _ := http.NewRequest(
  "GET",
  "https://api.cypherx.dev/v1/statements/stm_92f8cf/summary",
  nil,
)
req.Header.Set("Authorization", "Bearer "+apiKey)
res, _ := client.Do(req)

var summary StatementSummary
json.NewDecoder(res.Body).Decode(&summary)`,
    },
    response: `{
  "statement_id": "stm_92f8cf",
  "period": { "start": "2025-07-01", "end": "2025-09-30" },
  "balances": {
    "opening": 15500.24,
    "closing": 18210.67,
    "average_daily": 16804.12
  },
  "metrics": {
    "monthly_income": 4200.75,
    "monthly_outgoings": 3610.12,
    "affordability_ratio": 1.16
  }
}`,
    tips: [
      "affordability_ratio > 1 indicates inflows exceed outflows over the period.",
      "Use the period object to present coverage windows to analysts.",
      "Pair with risk flags for a full underwriting picture.",
    ],
  },
  {
    id: "transactions",
    method: "GET",
    path: "/v1/statements/{statement_id}/transactions",
    summary: "List enriched transactions with merchant metadata and categorisation confidence.",
    quickSpecs: [
      { label: "Scope", value: "statements:read" },
      { label: "Pagination", value: "Cursor" },
      { label: "Batch size", value: "≤ 200" },
    ],
    snippets: {
      curl: `curl "https://api.cypherx.dev/v1/statements/stm_92f8cf/transactions?limit=50" \
  -H "Authorization: Bearer sk_live_xxx"`,
      node: `const url = new URL("https://api.cypherx.dev/v1/statements/stm_92f8cf/transactions")
url.searchParams.set("limit", "50")
const res = await fetch(url, { headers: { Authorization: "Bearer "+API_KEY }})
const { data, next_cursor } = await res.json();`,
      python: `res = requests.get(
  "https://api.cypherx.dev/v1/statements/stm_92f8cf/transactions",
  headers={"Authorization": f"Bearer {API_KEY}"},
  params={"limit": 50},
)
transactions = res.json()["data"]`,
      go: `req, _ := http.NewRequest("GET", "https://api.cypherx.dev/v1/statements/stm_92f8cf/transactions?limit=50", nil)
req.Header.Set("Authorization", "Bearer "+apiKey)
res, _ := client.Do(req)

var payload TransactionList
json.NewDecoder(res.Body).Decode(&payload)`,
    },
    response: `{
  "data": [
    {
      "id": "txn_01",
      "date": "2025-08-14",
      "description": "Uber BV",
      "amount": -18.42,
      "category": "Transport",
      "confidence": 0.92,
      "mcc": "4121"
    }
  ],
  "next_cursor": "txn_02"
}`,
    tips: [
      "Use confidence < 0.6 to flag items needing manual review.",
      "Supply the next_cursor query param to paginate.",
      "Transactions inherit metadata client_reference for easy reconciliation.",
    ],
  },
  {
    id: "risk-flags",
    method: "GET",
    path: "/v1/statements/{statement_id}/risk-flags",
    summary: "Fetch underwriting risk events and their originating transactions.",
    quickSpecs: [
      { label: "Scope", value: "statements:read" },
      { label: "Severity", value: "low · medium · high" },
      { label: "Retention", value: "90 days" },
    ],
    snippets: {
      curl: `curl https://api.cypherx.dev/v1/statements/stm_92f8cf/risk-flags \
  -H "Authorization: Bearer sk_live_xxx"`,
      node: `const res = await fetch(
  "https://api.cypherx.dev/v1/statements/stm_92f8cf/risk-flags",
  { headers: { Authorization: "Bearer "+API_KEY } }
)
const flags = await res.json();`,
      python: `flags = requests.get(
  "https://api.cypherx.dev/v1/statements/stm_92f8cf/risk-flags",
  headers={"Authorization": f"Bearer {API_KEY}"},
).json()["flags"]`,
      go: `req, _ := http.NewRequest("GET", "https://api.cypherx.dev/v1/statements/stm_92f8cf/risk-flags", nil)
req.Header.Set("Authorization", "Bearer "+apiKey)
res, _ := client.Do(req)

var result RiskFlagResponse
json.NewDecoder(res.Body).Decode(&result)`,
    },
    response: `{
  "flags": [
    {
      "code": "cash_spike",
      "severity": "medium",
      "summary": "Large cash withdrawals detected",
      "transactions": ["txn_14", "txn_28"],
      "notes": "Withdrawals exceed historic average by 3.2x"
    }
  ]
}`,
    tips: [
      "High severity flags should trigger your manual review workflow via webhooks.",
      "Each flag contains transaction IDs—pair with the transactions endpoint for detail.",
      "Codes remain stable across API versions for alerting consistency.",
    ],
  },
];

const quickLinks = [
  {
    title: "Upload statement",
    description: "POST a PDF/CSV/image file and receive a processing job ID.",
    href: "#upload-statement",
  },
  {
    title: "Retrieve summary",
    description: "Pull balances, cash-flow metrics, and affordability ratios.",
    href: "#statement-summary",
  },
  {
    title: "Transactions",
    description: "Fetch enriched transaction rows with categorisation confidence.",
    href: "#transactions",
  },
  {
    title: "Risk flags",
    description: "Review anomalies with explainability and remediation notes.",
    href: "#risk-flags",
  },
  {
    title: "Webhook events",
    description: "Stream statement.ready, validation.failed, and risk.flagged notifications.",
    href: "#webhooks",
  },
  {
    title: "Error codes",
    description: "Decode validation and processing errors with recommended fixes.",
    href: "#errors",
  },
];

const webhookExample = `{
  "event_id": "evt_6f8a3c",
  "type": "statement.ready",
  "created_at": "2025-09-19T10:04:12Z",
  "data": {
    "statement_id": "stm_92f8cf",
    "status": "ready",
    "processing_seconds": 124,
    "summary_url": "https://api.cypherx.dev/v1/statements/stm_92f8cf/summary"
  }
}`;

const webhookVerification = `const payload = await request.text();
const signature = request.headers.get("CypherX-Signature");

if (!signature) throw new Error("Missing signature");

const isValid = verifySignature({
  payload,
  signature,
  secret: process.env.CYPHERX_WEBHOOK_SECRET!,
});

if (!isValid) {
  return new Response(null, { status: 400 });
}`;

const errorRows = [
  {
    code: "statement.invalid_format",
    status: "422 Unprocessable Entity",
    action: "File is encrypted or corrupted. Ask for an unlocked PDF, CSV, or image upload.",
  },
  {
    code: "statement.too_large",
    status: "413 Payload Too Large",
    action: "Reduce the upload below 15 MB or split long statements by quarter.",
  },
  {
    code: "auth.invalid_key",
    status: "401 Unauthorized",
    action: "Rotate the API key from the console and retry with a valid Authorization header.",
  },
  {
    code: "rate_limit.exceeded",
    status: "429 Too Many Requests",
    action: "Back off using exponential retry or request a higher throughput tier from support.",
  },
];

const outline = [
  { title: "Authentication", href: "#authentication" },
  { title: "Idempotency", href: "#idempotency" },
  ...endpoints.map((endpoint) => ({ title: endpoint.path, href: `#${endpoint.id}` })),
  { title: "Webhook events", href: "#webhooks" },
  { title: "Error catalogue", href: "#errors" },
];

export default function ReferencePage() {
  return (
    <DocsLanguageProvider>
      <div className="pb-24 pt-14">
        <div className="grid w-full gap-12 px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-20">
          <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_320px] lg:gap-10 xl:gap-14 2xl:gap-16">
            <aside className="hidden lg:block">
              <ScrollArea className="max-h-[80vh] rounded-xl border border-border/60 bg-muted/20 p-4">
                {navSections.map((section) => (
                  <div key={section.label} className="mb-6 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {section.label}
                    </p>
                  <ul className="space-y-1 text-sm">
                    {section.anchors.map((anchor) => (
                      <li key={anchor.title}>
                        <Link
                          href={anchor.href}
                          className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-muted-foreground transition hover:bg-background hover:text-foreground"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                          {anchor.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </ScrollArea>
          </aside>

          <div className="space-y-12">
            <section className="space-y-6">
              <div className="space-y-4">
                <Badge variant="secondary" className="bg-secondary/40 text-secondary-foreground">
                  API reference
                </Badge>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                    Bank Statement Analyzer API
                  </h1>
                  <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <div className="relative w-full sm:max-w-xs">
                      <Input placeholder="Search endpoints" className="pl-8" />
                      <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row">
                      <Select defaultValue="2025-09-01">
                        <SelectTrigger className="w-full sm:w-[160px]">
                          <SelectValue placeholder="Version" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2025-09-01">2025-09-01 (Latest)</SelectItem>
                          <SelectItem value="2025-06-15">2025-06-15</SelectItem>
                          <SelectItem value="2025-03-01">2025-03-01</SelectItem>
                        </SelectContent>
                      </Select>
                      <LanguageSelect />
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Access the same engine that powers our desktop analyzer: ingest statements, retrieve normalized ledgers, surface explainable risk, and automate underwriting decisions. Switch languages on any example to grab the snippet you need.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <KeyRound className="size-4 text-primary" /> OAuth2 / API key authentication
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Layers className="size-4 text-primary" /> Normalised schema & versioning
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" /> Enterprise security & audit logs
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {quickLinks.map((item) => (
                  <Card key={item.title} className="border-border/70">
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-sm font-semibold text-foreground">
                        {item.title}
                      </CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="ghost" className="px-0 text-sm" asChild>
                        <Link href={item.href} className="gap-1">
                          Jump to section
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section id="authentication" className="scroll-mt-24 space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Authentication</h2>
              <p className="text-sm text-muted-foreground">
                Supply either a sandbox or production API key. Set the optional <code className="rounded bg-muted px-1.5 py-0.5">CypherX-Version</code> header to lock responses to a release.
              </p>
              <CodeSnippetTabs
                snippets={{
                  curl: `curl https://api.cypherx.dev/v1/ping \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -H "CypherX-Version: 2025-09-01"`,
                  node: `await fetch("https://api.cypherx.dev/v1/ping", {
  headers: {
    Authorization: "Bearer " + process.env.CYPHERX_API_KEY!,
    "CypherX-Version": "2025-09-01",
  },
});`,
                  python: `requests.get(
  "https://api.cypherx.dev/v1/ping",
  headers={
    "Authorization": f"Bearer {API_KEY}",
    "CypherX-Version": "2025-09-01",
  },
)`,
                  go: `req, _ := http.NewRequest("GET", "https://api.cypherx.dev/v1/ping", nil)
req.Header.Set("Authorization", "Bearer "+apiKey)
req.Header.Set("CypherX-Version", "2025-09-01")
client.Do(req)`,
                }}
              />
            </section>

            <section id="idempotency" className="scroll-mt-24 space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Idempotency</h2>
              <p className="text-sm text-muted-foreground">
                Include an <code className="rounded bg-muted px-1.5 py-0.5">Idempotency-Key</code> header when uploading statements to safely retry requests. Keys remain valid for 24 hours.
              </p>
            </section>

            {endpoints.map((endpoint) => (
              <section key={endpoint.id} id={endpoint.id} className="scroll-mt-24">
                <div className="space-y-6 rounded-xl border border-border/50 bg-background/70 p-6 shadow-sm md:p-8 2xl:p-10">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline" className="border-primary/40 text-primary">
                          {endpoint.method}
                        </Badge>
                        <h2 className="text-2xl font-semibold text-foreground">{endpoint.path}</h2>
                      </div>
                      <p className="text-sm text-muted-foreground">{endpoint.summary}</p>
                    </div>
                    <EndpointActions path={endpoint.path} />
                  </div>

                  <div className="flex flex-col gap-6 xl:flex-row">
                    <Card className="border-border/70 xl:w-72">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold">Quick specs</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {endpoint.quickSpecs.map((spec) => (
                          <div
                            key={spec.label}
                            className="flex min-w-[140px] flex-1 items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                          >
                            <span className="font-medium text-foreground">{spec.label}</span>
                            <span className="text-muted-foreground">{spec.value}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <div className="flex-1 space-y-6">
                      <CodeSnippetTabs snippets={endpoint.snippets} className="shadow-sm" />
                      <div className="grid gap-6 lg:grid-cols-2">
                        <Card className="border-border/70">
                          <CardHeader>
                            <CardTitle className="text-base font-semibold">Sample response</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <pre className="rounded-lg border border-border/60 bg-background/95 p-4 text-xs text-muted-foreground whitespace-pre-wrap overflow-auto">
                              {endpoint.response}
                            </pre>
                          </CardContent>
                        </Card>

                        <Card className="border-border/70">
                          <CardHeader>
                            <CardTitle className="text-base font-semibold">Integration tips</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-xs text-muted-foreground">
                            <ul className="space-y-2">
                              {endpoint.tips.map((tip) => (
                                <li key={tip} className="leading-relaxed">
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ))}

            <section id="webhooks" className="scroll-mt-24 space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">Webhook events</h2>
                <p className="text-sm text-muted-foreground">
                  Receive notifications when statements finish processing, validation fails, or high-severity risk flags trigger. Verify signatures before acting on payloads.
                </p>
              </div>
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Event payload</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="rounded-lg border border-border/60 bg-background/95 p-4 text-xs text-muted-foreground whitespace-pre-wrap">
                    {webhookExample}
                  </pre>
                </CardContent>
              </Card>
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Signature verification</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="rounded-lg border border-border/60 bg-background/95 p-4 text-xs text-muted-foreground whitespace-pre-wrap">
                    {webhookVerification}
                  </pre>
                </CardContent>
              </Card>
            </section>

            <section id="errors" className="scroll-mt-24 space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">Error catalogue</h2>
                <p className="text-sm text-muted-foreground">
                  Every error response includes a stable code, HTTP status, and remediation guidance. Use these to inform customer messaging or automated retries.
                </p>
              </div>
              <Card className="border-border/70">
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  {errorRows.map((row) => (
                    <div
                      key={row.code}
                      className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-foreground">
                        <span>{row.code}</span>
                        <Badge variant="outline" className="border-destructive/50 text-destructive">
                          {row.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{row.action}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <Card className="border-border/70 bg-muted/20">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Need a deeper integration review?</CardTitle>
                <CardDescription>
                  Our solutions engineers can map your data model to CypherX and walk through compliance checklists.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <Button asChild className="gap-2">
                  <Link href="/support">
                    Contact support
                    <BookOpen className="size-4" />
                  </Link>
                </Button>
                <Button variant="ghost" asChild className="gap-2 text-sm">
                  <Link href="/docs/quickstart">
                    Review quickstart
                    <FileText className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <aside className="hidden xl:block">
            <div className="sticky top-24 space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                On this page
              </p>
              <ul className="space-y-1 text-muted-foreground">
                {outline.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-2 rounded-md px-2 py-1 transition hover:bg-background hover:text-foreground"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
      </div>
    </DocsLanguageProvider>
  );
}
