import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
