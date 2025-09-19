import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export default function SecurityPage() {
  return (
    <section className="space-y-8">
      <DashboardHeader
        title="Security"
        description="Configure workspace-wide authentication, audit, and compliance settings."
      />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">SAML single sign-on</CardTitle>
          <CardDescription>Enforce SSO across all members for consistent access policies.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Configure your identity provider (Okta, Azure AD, Google Workspace).</p>
            <p className="text-xs text-muted-foreground/80">SAML is required for Enterprise plans.</p>
          </div>
          <Button>Configure SAML</Button>
        </CardContent>
      </Card>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Security automations</CardTitle>
          <CardDescription>Alerts and actions triggered across the workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-4">
            <div>
              <p className="font-medium text-foreground">Require 2FA</p>
              <p className="text-xs text-muted-foreground">All members must enable two-factor authentication.</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-4">
            <div>
              <p className="font-medium text-foreground">Alert on anomalous traffic</p>
              <p className="text-xs text-muted-foreground">Notify security channel when request spikes occur.</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
