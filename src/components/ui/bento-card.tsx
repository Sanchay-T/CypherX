import { cn } from "@/lib/utils";

type BentoCardProps = {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
};

export function BentoCard({ title, description, icon, className, footer }: BentoCardProps) {
  return (
    <div
      className={cn(
        "group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-muted/40 p-6 transition duration-300 hover:border-border",
        className,
      )}
    >
      <div className="space-y-4">
        {icon ? <div className="text-muted-foreground">{icon}</div> : null}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {footer ? <div className="mt-6 text-xs text-muted-foreground/80">{footer}</div> : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-border/70 to-transparent opacity-0 transition group-hover:opacity-100" />
    </div>
  );
}
