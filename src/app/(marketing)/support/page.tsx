import Link from "next/link";
import { ArrowUpRight, LifeBuoy, Mail, MessagesSquare, NotebookPen, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supportQuickLinks } from "@/config/navigation";

const channels = [
  {
    title: "Open a ticket",
    description: "Reach our support engineers for incidents, integrations, or billing questions.",
    icon: NotebookPen,
    href: "/support/tickets/new",
  },
  {
    title: "Meet with us",
    description: "Schedule a 1:1 session to review architecture or troubleshoot complex workflows.",
    icon: Phone,
    href: "/support/consult",
  },
  {
    title: "Join the community",
    description: "Share best practices with builders running APIs at scale.",
    icon: MessagesSquare,
    href: "/support/community",
  },
];

export default function SupportPage() {
  return (
    <div className="space-y-16 pb-20 pt-16">
      <section className="mx-auto w-full max-w-4xl px-4 text-center sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/20 px-3 py-1 text-xs font-medium text-muted-foreground">
          <LifeBuoy className="size-3.5" /> Support hub
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          We&apos;re here to keep your API humming.
        </h1>
        <p className="mt-4 text-muted-foreground">
          Access 24/7 support, implementation resources, and the CypherX community. Our team responds within minutes for critical incidents on Scale and Enterprise plans.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/support/tickets/new" className="gap-2">
              <Mail className="size-4" /> Contact support
            </Link>
          </Button>
          <Button variant="outline" asChild size="lg">
            <Link href="/docs" className="gap-1">
              Browse docs
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-6 px-4 sm:grid-cols-3 sm:px-6">
        {channels.map((channel) => (
          <Card key={channel.title} className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <channel.icon className="size-4 text-muted-foreground" />
                {channel.title}
              </CardTitle>
              <CardDescription>{channel.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="ghost" className="px-0">
              <Link href={channel.href} className="gap-1 text-sm">
                  Get support
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-10 px-4 sm:grid-cols-[2fr_1fr] sm:px-6">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">
              Incident response commitments
            </CardTitle>
            <CardDescription>
              Our on-call team monitors your APIs at all times. When things go sideways, we respond with detailed updates and mitigation guidance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <ul className="space-y-2">
              <li>• Scale & Enterprise: <span className="font-medium text-foreground">10 minute</span> first response SLA</li>
              <li>• Dedicated Slack channel for Enterprise workflows</li>
              <li>• Post-incident reviews with remediation playbooks</li>
              <li>• Weekly office hours covering product roadmap</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Quick links
            </CardTitle>
            <CardDescription>Jump into the most requested support resources.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {supportQuickLinks.map((link) => (
              <div key={link.title} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/80 p-3">
                <Link
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noreferrer" : undefined}
                  className="flex items-center gap-1 font-medium text-foreground transition hover:underline"
                >
                  {link.title}
                  <ArrowUpRight className="size-4 text-muted-foreground" />
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
