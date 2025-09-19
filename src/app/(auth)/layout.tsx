import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/system/theme-toggle";
import { cn } from "@/lib/utils";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2">
      <div className="flex flex-col justify-between border-r border-border/50 p-8">
        <div>
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold tracking-tight text-foreground">
              CypherX
            </div>
            <ThemeToggle />
          </div>
          <div className="mt-20">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Build. Ship. Monetize.
            </h1>
            <p className="mt-4 text-muted-foreground">
              Secure infrastructure, observability, and billing layers so you can
              focus on making your API delightful.
            </p>
          </div>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Why CypherX?</p>
          <ul className="space-y-1">
            <li>End-to-end metering and usage-based billing</li>
            <li>Enterprise security controls out of the box</li>
            <li>Dev-first docs, SDKs, and onboarding flows</li>
          </ul>
        </div>
      </div>
      <div className={cn("flex items-center justify-center p-6 lg:px-16")}>{children}</div>
    </div>
  );
}
