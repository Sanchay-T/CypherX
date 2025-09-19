import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { projects } from "@/data/projects";

const logs = [
  {
    id: "log-1",
    timestamp: "2025-09-18 12:21:04 UTC",
    level: "info",
    message: "POST /v1/completions 200 OK",
    meta: "consumer=platform-sdk latency=182ms size=4.2kb",
  },
  {
    id: "log-2",
    timestamp: "2025-09-18 12:20:54 UTC",
    level: "warn",
    message: "Rate limit approaching 80% for plan scale",
    meta: "consumer=legacy-client quota=80%",
  },
  {
    id: "log-3",
    timestamp: "2025-09-18 12:18:12 UTC",
    level: "error",
    message: "Webhook delivery timeout",
    meta: "endpoint=https://ops.launchpad.dev/alerts retry=2",
  },
];

export default function ProjectLogsPage({ params }: { params: { slug: string } }) {
  const project = projects.find((item) => item.slug === params.slug);

  if (!project) {
    notFound();
  }

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Audit & delivery logs</CardTitle>
        <CardDescription>Searchable stream of request traces and security events.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80 rounded-lg border border-border/60 bg-muted/20 p-4">
          <div className="space-y-4 text-sm font-mono">
            {logs.map((log) => (
              <div key={log.id} className="space-y-1 rounded-md bg-background/90 p-3">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground/80">
                  <span>{log.timestamp}</span>
                  <span className="font-semibold text-foreground">{log.level}</span>
                </div>
                <p className="text-sm text-foreground">{log.message}</p>
                <p className="text-xs text-muted-foreground/80">{log.meta}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
