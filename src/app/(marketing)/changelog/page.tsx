import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const updates = [
  {
    version: "2025.09",
    date: "September 18, 2025",
    highlights: [
      "Introduced automated API key rotation policies with grace windows",
      "Launched observability dashboards with latency diagnostics",
      "Added native Stripe billing sync for usage-based plans",
    ],
  },
  {
    version: "2025.08",
    date: "August 27, 2025",
    highlights: [
      "Released shadcn MCP v2 with refreshed component tokens",
      "Expanded audit log export to SIEM providers",
      "Improved onboarding wizard with guided SDK setup",
    ],
  },
  {
    version: "2025.07",
    date: "July 14, 2025",
    highlights: [
      "Self-service plan upgrades now available inside console",
      "Added webhook replay with signature validation",
      "Improved docs search with AI-powered snippets",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 pb-20 pt-16">
      <div className="px-4 sm:px-0">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Release notes
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
          What&apos;s new in CypherX
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Stay on top of new platform capabilities, UI refinements, and developer tooling shipped every month.
        </p>
      </div>
      <div className="space-y-8">
        {updates.map((release, index) => (
          <Card key={release.version} className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg font-semibold">
                <span>v{release.version}</span>
                <span className="text-sm font-normal text-muted-foreground">{release.date}</span>
              </CardTitle>
              <CardDescription>
                {index === 0 ? "Latest release" : `Archive · ${release.version}`}
              </CardDescription>
            </CardHeader>
            <Separator className="bg-border/70" />
            <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
              {release.highlights.map((highlight) => (
                <div key={highlight} className="rounded-lg bg-muted/40 p-4">
                  {highlight}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
