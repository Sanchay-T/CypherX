import { notFound } from "next/navigation";
import { Mail, ShieldCheck, UserRoundPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { projects } from "@/data/projects";

export default function ProjectTeamPage({ params }: { params: { slug: string } }) {
  const project = projects.find((item) => item.slug === params.slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/70">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Team members</CardTitle>
            <CardDescription>Manage roles and invite collaborators.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="Invite by email" className="h-9 w-56" />
            <Button className="gap-2 h-9">
              <UserRoundPlus className="size-4" /> Send invite
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {project.team.map((member, index) => (
            <div key={member.email}>
              <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{member.name}</p>
                  <p className="text-xs text-muted-foreground/80">{member.email}</p>
                </div>
                <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground/80">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[11px] font-medium">
                    <ShieldCheck className="size-3" /> {member.role}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Send email">
                    <Mail className="size-4" />
                  </Button>
                </div>
              </div>
              {index !== project.team.length - 1 ? <Separator className="my-3" /> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
