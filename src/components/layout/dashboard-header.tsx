"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";

type DashboardHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function DashboardHeader({ title, description, actions }: DashboardHeaderProps) {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {segments.slice(1).map((segment, index) => {
            const href = `/${segments.slice(0, index + 2).join("/")}`;
            const isLast = index === segments.slice(1).length - 1;

            if (isLast) {
              return (
                <div key={href} className="contents">
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="capitalize">{segment.replace(/-/g, " ")}</BreadcrumbPage>
                  </BreadcrumbItem>
                </div>
              );
            }

            return (
              <div key={href} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={href} className="capitalize">
                      {segment.replace(/-/g, " ")}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </div>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {actions ?? (
            <Button asChild className="hidden gap-2 sm:inline-flex">
              <Link href="/dashboard/projects/new">
                <Plus className="size-4" /> New project
              </Link>
            </Button>
          )}
        </div>
      </div>
      <Separator className="bg-border" />
    </div>
  );
}
