"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/branding/logo";
import { useAuth } from "@/components/providers/auth-provider";
import { ThemeToggle } from "@/components/system/theme-toggle";
import { Button } from "@/components/ui/button";
import { marketingNav } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function MarketingHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center gap-6 px-4 sm:px-6 lg:px-10">
        <Logo className="mr-4" />
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          {marketingNav.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={cn(
                "transition-colors hover:text-foreground",
                pathname === item.href && "text-foreground",
              )}
            >
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-end gap-2">
          <ThemeToggle />
          {isAuthenticated ? (
            <Button asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild className="hidden sm:inline-flex">
                <Link href="/signup">Start for free</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
