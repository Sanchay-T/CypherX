import { DashboardHeader } from "@/components/layout/dashboard-header";

interface DashboardPageProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardPage({ title, description, actions, children }: DashboardPageProps) {
  return (
    <div className="space-y-8">
      <DashboardHeader title={title} description={description} actions={actions} />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </div>
  );
}
