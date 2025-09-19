import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ExplorerPage() {
  return (
    <section className="space-y-8">
      <DashboardHeader
        title="API explorer"
        description="Test endpoints, inspect responses, and generate snippets."
      />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">POST /v1/completions</CardTitle>
          <CardDescription>Use production or sandbox credentials to send a request.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-muted-foreground">
          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">API key</label>
            <Input placeholder="key_live_***" defaultValue="key_live_NzUx" />
          </div>
          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Request body</label>
            <Textarea
              className="font-mono text-xs"
              rows={10}
              defaultValue={JSON.stringify(
                {
                  prompt: "Generate onboarding plan",
                  max_tokens: 200,
                },
                null,
                2,
              )}
            />
          </div>
          <Button className="w-fit">Send request</Button>
          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Response</label>
            <pre className="rounded-lg border border-border/60 bg-background/90 p-4 text-xs text-foreground/80">
{`{
  "id": "resp_123",
  "status": "succeeded",
  "usage": { "prompt_tokens": 21, "completion_tokens": 98 }
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
