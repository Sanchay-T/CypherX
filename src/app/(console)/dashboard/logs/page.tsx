import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const entries = [
  "[12:20:54] admin rotated key key_live_NzUx",
  "[12:10:07] system created anomaly alert on project launchpad",
  "[11:58:12] user luis@cypherx.dev invited Priya Natarajan",
];

export default function WorkspaceLogsPage() {
  return (
    <section className="space-y-8">
      <DashboardHeader
        title="Audit logs"
        description="Immutable record of high-sensitivity events across the workspace."
      />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Recent entries</CardTitle>
          <CardDescription>Export to JSON or stream to your SIEM.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-72 rounded-lg border border-border/60 bg-muted/20 p-4 text-sm font-mono text-foreground/80">
            {entries.map((entry) => (
              <div key={entry} className="py-1">
                {entry}
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
    </section>
  );
}
