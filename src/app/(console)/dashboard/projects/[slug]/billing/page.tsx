import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { projects } from "@/data/projects";

const invoices = [
  { id: "INV-0921", period: "Aug 1 – Aug 31", amount: "$1,112.44", status: "Paid" },
  { id: "INV-0920", period: "Jul 1 – Jul 31", amount: "$1,048.19", status: "Paid" },
  { id: "INV-0919", period: "Jun 1 – Jun 30", amount: "$1,204.88", status: "Paid" },
];

export default function ProjectBillingPage({ params }: { params: { slug: string } }) {
  const project = projects.find((item) => item.slug === params.slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Plan & usage</CardTitle>
          <CardDescription>
            View your current billing plan, thresholds, and forecasted spend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Current plan</p>
            <div className="mt-2 flex items-center justify-between text-foreground">
              <p className="text-lg font-semibold">{project.billingPlan}</p>
              <Button variant="outline" size="sm">
                Manage plan
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Includes usage-based metering, default rate limits, and SLA-backed support.
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Forecasted spend</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">$1,420.00</p>
            <p className="text-xs text-muted-foreground">Projected end of month based on trailing 7 days.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Invoices</CardTitle>
          <CardDescription>Download PDF copies for your records.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {invoices.map((invoice, index) => (
            <div key={invoice.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{invoice.id}</p>
                  <p className="text-xs text-muted-foreground/80">{invoice.period}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">{invoice.amount}</p>
                  <p className="text-xs text-muted-foreground/80">{invoice.status}</p>
                </div>
              </div>
              {index !== invoices.length - 1 ? <Separator className="my-3" /> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
