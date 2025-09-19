import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const paymentMethods = [
  { brand: "Visa", last4: "4242", expiry: "08/27", default: true },
  { brand: "Amex", last4: "9934", expiry: "03/25", default: false },
];

export default function WorkspaceBillingPage() {
  return (
    <section className="space-y-8">
      <DashboardHeader
        title="Billing"
        description="Manage workspace-wide payment methods, invoices, and spend alerts."
      />
      <Card className="border-border/70">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Payment methods</CardTitle>
            <CardDescription>Cards shared across all projects in this workspace.</CardDescription>
          </div>
          <Button variant="outline">Add card</Button>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {paymentMethods.map((method, index) => (
            <div key={method.last4}>
              <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-background/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{method.brand} •••• {method.last4}</p>
                  <p className="text-xs text-muted-foreground/80">Expires {method.expiry}</p>
                </div>
                <Button variant="ghost" size="sm">
                  {method.default ? "Default" : "Make default"}
                </Button>
              </div>
              {index !== paymentMethods.length - 1 ? <Separator className="my-3" /> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
