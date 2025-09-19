import { notFound } from "next/navigation";
import { ShieldCheck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { projects } from "@/data/projects";

export default function ProjectSettingsPage({ params }: { params: { slug: string } }) {
  const project = projects.find((item) => item.slug === params.slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">General</CardTitle>
          <CardDescription>Update metadata, regional preferences, and security defaults.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Project name</Label>
              <Input id="name" defaultValue={project.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" defaultValue={project.slug} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Enforce signed requests</p>
              <p className="text-xs text-muted-foreground">Require HMAC signatures for all client traffic.</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Enable request logging</p>
              <p className="text-xs text-muted-foreground">Store request/response metadata for 30 days.</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Security automation</CardTitle>
          <CardDescription>Set automated actions when suspicious behaviour is detected.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">Auto-rotate stale keys</span>
              <span className="text-xs text-muted-foreground">Rotate keys unused for 30 days and alert owners.</span>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">Geo-fence requests</span>
              <span className="text-xs text-muted-foreground">Block traffic from unapproved regions automatically.</span>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-destructive">
            <Trash2 className="size-4" /> Danger zone
          </CardTitle>
          <CardDescription className="text-xs">
            Delete this project and all associated data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between border-t border-destructive/40 pt-4">
          <Button variant="destructive" className="gap-2">
            <ShieldCheck className="size-4" /> Delete project
          </Button>
          <p className="text-xs text-muted-foreground">Requires owner confirmation and 2FA approval.</p>
        </CardContent>
      </Card>
    </div>
  );
}
