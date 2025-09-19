"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  BellDot,
  LifeBuoy,
  Plus,
  Search,
} from "lucide-react";

import { Logo } from "@/components/branding/logo";
import { useAuth } from "@/components/providers/auth-provider";
import { HelpDrawer } from "@/components/system/help-drawer";
import { ThemeToggle } from "@/components/system/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dashboardSecondaryNav, dashboardSidebarNav, userMenu } from "@/config/navigation";
import { cn } from "@/lib/utils";

import { UserAvatar } from "../profile/user-avatar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [hasNotifications, setHasNotifications] = useState<boolean>(false);

  useEffect(() => {
    const timeout = setTimeout(() => setHasNotifications(true), 1500);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="grid min-h-screen w-full grid-cols-[260px_1fr] bg-background">
      <aside className="hidden border-r border-border/80 bg-muted/30 lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b border-border/80 px-6">
          <Logo className="text-base" href="/dashboard" />
        </div>
        <ScrollArea className="flex-1 px-2 py-4">
          <nav className="space-y-6 text-sm">
            <div className="space-y-1">
              <p className="px-4 text-xs uppercase tracking-wide text-muted-foreground/70">
                Workspace
              </p>
              {dashboardSidebarNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center rounded-md px-4 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "mr-3 size-4",
                        isActive ? "text-foreground" : "text-muted-foreground",
                      )}
                    />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>
            <div className="space-y-1">
              <p className="px-4 text-xs uppercase tracking-wide text-muted-foreground/70">
                Operations
              </p>
              {dashboardSecondaryNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center justify-between rounded-md px-4 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className="size-4" />
                      {item.title}
                    </span>
                    {item.badge ? (
                      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent-foreground">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </nav>
        </ScrollArea>
        <div className="border-t border-border/80 p-4">
          <div className="rounded-lg border border-border/80 bg-background/90 p-4">
            <p className="text-sm font-medium text-foreground">Need a hand?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Access quick-start guides, implementation checklists, and real-time support.
            </p>
            <Button variant="ghost" asChild className="mt-3 h-9 w-full justify-start gap-2 px-2">
              <Link href="/dashboard/support">
                <LifeBuoy className="size-4" /> Support hub
              </Link>
            </Button>
          </div>
        </div>
      </aside>
      <div className="flex flex-col">
        <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="flex h-16 w-full items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Button asChild size="sm" className="lg:hidden">
                <Link href="/dashboard/projects/new">
                  <Plus className="mr-1 size-4" />
                  New project
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="hidden gap-2 px-3 lg:flex">
                <Search className="size-4" />
                Cmd + K
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative" aria-label="View notifications">
                {hasNotifications ? (
                  <BellDot className="size-5" />
                ) : (
                  <Bell className="size-5 text-muted-foreground" />
                )}
              </Button>
              <HelpDrawer />
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="flex-1 bg-background/95 p-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto h-full w-full max-w-6xl space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const displayName = user?.fullName?.trim() || user?.email || "CypherX user";
  const subtitle = useMemo(() => {
    if (user?.teamSize) {
      return `Team size · ${user.teamSize}`;
    }
    return user?.email ?? "";
  }, [user?.teamSize, user?.email]);

  const handleSignOut = () => {
    logout();
    router.replace("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex h-9 items-center gap-2 rounded-full border-border/80">
          <UserAvatar name={displayName} className="h-7 w-7" />
          <div className="hidden flex-col text-left text-xs leading-tight sm:flex">
            <span className="font-medium text-foreground">{displayName}</span>
            {subtitle ? <span className="text-muted-foreground">{subtitle}</span> : null}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col items-start">
          <p className="text-sm font-semibold">{displayName}</p>
          {user?.email ? (
            <p className="text-xs text-muted-foreground">{user.email}</p>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {userMenu.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href} className="flex items-center justify-between">
                {item.title}
                <ArrowRight className="size-4" />
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            handleSignOut();
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
