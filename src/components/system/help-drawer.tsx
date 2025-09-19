"use client";

import { useState } from "react";
import Link from "next/link";
import { LifeBuoy, MessageSquare, NotebookPen } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const resources = [
  {
    title: "Quickstart",
    description: "Follow the step-by-step guide to ship your first endpoint.",
    href: "/docs/quickstart",
    icon: NotebookPen,
  },
  {
    title: "Changelog",
    description: "See what shipped this week.",
    href: "/changelog",
    icon: MessageSquare,
  },
  {
    title: "Open ticket",
    description: "Escalate an incident to the platform team.",
    href: "/dashboard/support",
    icon: LifeBuoy,
  },
];

export function HelpDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Open help">
          <LifeBuoy className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Need a hand?</SheetTitle>
          <SheetDescription>
            Surface guides, contact support, or browse the latest updates.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4 text-sm text-muted-foreground">
          {resources.map((resource) => (
            <div key={resource.title} className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <Link
                href={resource.href}
                onClick={() => setOpen(false)}
                className="flex items-start gap-3"
              >
                <resource.icon className="mt-1 size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{resource.title}</p>
                  <p className="text-xs text-muted-foreground/80">{resource.description}</p>
                </div>
              </Link>
            </div>
          ))}
          <Separator />
          <p className="text-xs text-muted-foreground">
            Our support engineers respond within 10 minutes for Scale and Enterprise incidents.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
