import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { ProjectTabs } from "@/components/project/project-tabs";
import { projects } from "@/data/projects";

export default function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { slug: string };
}) {
  const project = projects.find((item) => item.slug === params.slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <DashboardHeader
        title={project.name}
        description={`Manage credentials, usage, and billing for ${project.name}.`}
      />
      <ProjectTabs projectSlug={project.slug} />
      <div>{children}</div>
    </div>
  );
}
