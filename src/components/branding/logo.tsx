import Link from "next/link";

import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  href?: string;
};

export function Logo({ className, href = "/" }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 font-medium tracking-tight text-foreground",
        className,
      )}
      aria-label="CypherX home"
    >
      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
        CX
      </span>
      <span className="text-lg uppercase">CypherX</span>
    </Link>
  );
}
