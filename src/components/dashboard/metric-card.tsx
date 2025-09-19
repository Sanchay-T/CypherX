import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  changeTone?: "positive" | "negative" | "neutral";
  helper?: string;
  icon?: React.ReactNode;
}

export function MetricCard({ label, value, change, changeTone = "neutral", helper, icon }: MetricCardProps) {
  return (
    <Card className="border-border/70 bg-background">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        {change ? (
          <p
            className={
              changeTone === "positive"
                ? "text-xs font-medium text-emerald-500"
                : changeTone === "negative"
                ? "text-xs font-medium text-destructive"
                : "text-xs text-muted-foreground"
            }
          >
            {change}
          </p>
        ) : null}
        {helper ? <p className="text-xs text-muted-foreground/80">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}
