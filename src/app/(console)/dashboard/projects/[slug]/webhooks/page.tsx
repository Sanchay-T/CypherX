import { notFound } from "next/navigation";
import { RefreshCcw, ShieldAlert, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { projects } from "@/data/projects";

export default function ProjectWebhooksPage({ params }: { params: { slug: string } }) {
  const project = projects.find((item) => item.slug === params.slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/70">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Webhook endpoints</CardTitle>
            <CardDescription>Replay events, validate signatures, and view delivery history.</CardDescription>
          </div>
          <Button variant="outline" className="gap-2">
            <RefreshCcw className="size-4" /> Replay failed events
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.webhooks.map((hook) => (
                <TableRow key={hook.id}>
                  <TableCell className="font-medium text-foreground">{hook.url}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{hook.events.join(", ")}</TableCell>
                  <TableCell>
                    {hook.status === "healthy" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
                        <ShieldCheck className="size-3" /> Healthy
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                        <ShieldAlert className="size-3" /> Failing
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{hook.lastResponse}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
