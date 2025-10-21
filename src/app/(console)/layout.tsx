import type { ReactNode } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  // TEMPORARY: Auth disabled for testing PDF verification
  // TODO: Re-enable AuthGuard before production
  return (
    // <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    // </AuthGuard>
  );
}
