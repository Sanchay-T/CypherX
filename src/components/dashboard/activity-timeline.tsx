import { cn } from "@/lib/utils";

import type { recentActivity } from "@/data/projects";

type Activity = (typeof recentActivity)[number];

type Props = {
  items: Activity[];
  className?: string;
};

export function ActivityTimeline({ items, className }: Props) {
  return (
    <div className={cn("space-y-4", className)}>
      {items.map((item, index) => (
        <div key={item.id} className="relative grid grid-cols-[20px_1fr] gap-4">
          <div className="flex justify-center">
            <span className="mt-1 h-2 w-2 rounded-full bg-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{item.action}</p>
            <p className="text-xs text-muted-foreground">{item.actor}</p>
            <p className="mt-1 text-xs text-muted-foreground/80">{item.timestamp}</p>
          </div>
          {index !== items.length - 1 ? (
            <div className="absolute left-[6px] top-2 h-full w-px bg-border/70" aria-hidden />
          ) : null}
        </div>
      ))}
    </div>
  );
}
