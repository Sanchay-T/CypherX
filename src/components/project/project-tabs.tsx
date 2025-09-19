"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { projectNavigation } from "@/config/navigation";

interface ProjectTabsProps {
  projectSlug: string;
}

export function ProjectTabs({ projectSlug }: ProjectTabsProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  const activeSegment =
    lastSegment === projectSlug || !lastSegment ? "overview" : lastSegment;

  return (
    <Tabs value={activeSegment} className="space-y-6">
      <TabsList className="flex w-full justify-start gap-2 overflow-x-auto bg-muted/30 p-1">
        {projectNavigation.tabs.map((tab) => (
          <TabsTrigger key={tab.href} value={tab.href} asChild>
            <Link
              href={`/dashboard/projects/${projectSlug}/${tab.href}`}
              className="capitalize"
            >
              {tab.title}
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
