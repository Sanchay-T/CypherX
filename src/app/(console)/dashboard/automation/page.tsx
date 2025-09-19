import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const workflows = [
  {
    name: "Rotate key on leak alert",
    description: "When a credential leak is detected, rotate the key and notify the owner.",
    status: "Active",
  },
  {
    name: "Escalate incident to PagerDuty",
    description: "Forward P1 incidents to on-call engineers with context.",
    status: "Active",
  },
  {
    name: "Sync usage to Snowflake nightly",
    description: "Push hourly usage aggregates into the data warehouse.",
    status: "Draft",
  },
];

export default function AutomationPage() {
  return (
    <section className="space-y-8">
      <DashboardHeader
        title="Automation"
        description="Create no-code workflows that respond to API events."
        actions={<Button>Create workflow</Button>}
      />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Active workflows</CardTitle>
          <CardDescription>Configure triggers, conditions, and actions tailored to your API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {workflows.map((flow, index) => (
            <div key={flow.name}>
              <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{flow.name}</p>
                  <p className="text-xs text-muted-foreground/80">{flow.description}</p>
                </div>
                <span className="text-xs uppercase tracking-wide text-foreground">{flow.status}</span>
              </div>
              {index !== workflows.length - 1 ? <Separator className="my-3" /> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
