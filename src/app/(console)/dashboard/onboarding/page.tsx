import { Check, Copy, Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const steps = [
  {
    title: "Name your workspace",
    description: "Define the brand developers will experience across docs, keys, and emails.",
    status: "complete" as const,
  },
  {
    title: "Create your first project",
    description: "Pick a region, choose a plan, and seed environment variables.",
    status: "active" as const,
  },
  {
    title: "Generate API key",
    description: "Share sandbox credentials with your first consumer.",
    status: "upcoming" as const,
  },
];

export default function OnboardingPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Welcome to CypherX</CardTitle>
          <CardDescription>Complete these steps to launch your first API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-4"
            >
              <div
                className={
                  step.status === "complete"
                    ? "flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-background"
                    : step.status === "active"
                    ? "flex h-6 w-6 items-center justify-center rounded-full border border-border/80 text-foreground"
                    : "flex h-6 w-6 items-center justify-center rounded-full border border-border/60 text-muted-foreground"
                }
              >
                {step.status === "complete" ? (
                  <Check className="size-3" />
                ) : step.status === "active" ? (
                  index + 1
                ) : (
                  index + 1
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
          <Button className="w-full gap-2">
            <Rocket className="size-4" /> Continue setup
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Quickstart snippet</CardTitle>
          <CardDescription>Share with developers to make their first API call.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">API key</label>
            <div className="flex items-center gap-2">
              <Input value="key_sandbox_XYZ123" readOnly />
              <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Copy key">
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
          <Separator />
          <pre className="rounded-lg border border-border/60 bg-background/90 p-4 text-xs leading-relaxed text-foreground/90">
{`import { CypherX } from "@cypherx/sdk";

const client = new CypherX({
  apiKey: process.env.CYPHERX_API_KEY,
});

const response = await client.completions.create({
  prompt: "Generate onboarding plan",
});

console.log(response.data);`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
