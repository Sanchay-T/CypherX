"use client";

import { motion } from "framer-motion";

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
        <motion.div
          key={item.id}
          className="relative grid grid-cols-[20px_1fr] gap-4"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.05 }}
        >
          <div className="flex justify-center">
            <motion.span
              className="mt-1 block h-2 w-2 rounded-full bg-foreground"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2, ease: "easeOut", delay: index * 0.05 + 0.05 }}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{item.action}</p>
            <p className="text-xs text-muted-foreground">{item.actor}</p>
            <p className="mt-1 text-xs text-muted-foreground/80">{item.timestamp}</p>
          </div>
          {index !== items.length - 1 ? (
            <motion.span
              className="absolute left-[6px] top-2 h-full w-px bg-border/70"
              aria-hidden
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: index * 0.05 + 0.1 }}
              style={{ transformOrigin: "top" }}
            />
          ) : null}
        </motion.div>
      ))}
    </div>
  );
}
