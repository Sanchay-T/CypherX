import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function DashboardSupportPage() {
  return (
    <section className="space-y-8">
      <DashboardHeader
        title="Support hub"
        description="Escalate incidents, message the platform team, and monitor ticket status."
      />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Open ticket</CardTitle>
          <CardDescription>Add logs, reproduction steps, and impact details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={6} placeholder="Tell us what happened..." />
          <Button>Submit ticket</Button>
        </CardContent>
      </Card>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Status updates</CardTitle>
          <CardDescription>Live incident communication from the CypherX platform team.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="rounded-lg border border-border/60 bg-background/90 p-4">
            <p className="font-medium text-foreground">No active incidents</p>
            <p className="text-xs text-muted-foreground/80">We&apos;ll update this feed within minutes of any disruption.</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
