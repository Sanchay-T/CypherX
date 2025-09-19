import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function WorkspaceSettingsPage() {
  return (
    <section className="space-y-8">
      <DashboardHeader
        title="Workspace settings"
        description="Control defaults for every project in the organization."
      />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Branding</CardTitle>
          <CardDescription>Customize how your developer portal appears to customers.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <Input id="workspace-name" defaultValue="CypherX" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support-email">Support email</Label>
            <Input id="support-email" defaultValue="support@cypherx.dev" />
          </div>
        </CardContent>
      </Card>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Developer portal</CardTitle>
          <CardDescription>Enable dark mode and fine-grained access for portal users.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-4">
            <div>
              <p className="font-medium text-foreground">Allow public docs</p>
              <p className="text-xs text-muted-foreground">Expose reference docs without authentication.</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-4">
            <div>
              <p className="font-medium text-foreground">Enable self-service signup</p>
              <p className="text-xs text-muted-foreground">Allow developers to onboard without manual approval.</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
