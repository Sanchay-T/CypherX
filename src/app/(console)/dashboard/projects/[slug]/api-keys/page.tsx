import { notFound } from "next/navigation";

import { ProjectApiKeys } from "@/components/project/project-api-keys";
import { projects } from "@/data/projects";

export default function ProjectApiKeysPage({ params }: { params: { slug: string } }) {
  const project = projects.find((item) => item.slug === params.slug);

  if (!project) {
    notFound();
  }

  return <ProjectApiKeys project={project} />;
}
