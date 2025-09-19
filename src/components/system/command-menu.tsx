"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LifeBuoy,
  PlusCircle,
  RefreshCcw,
  UserPlus,
} from "lucide-react";

import {
  dashboardSecondaryNav,
  dashboardSidebarNav,
  marketingNav,
} from "@/config/navigation";
import { siteConfig } from "@/config/site";

const QUICK_ACTIONS = [
  {
    title: "Create project",
    href: "/dashboard/projects/new",
    icon: PlusCircle,
  },
  {
    title: "Rotate primary API key",
    href: "/dashboard/projects/launchpad/api-keys",
    icon: RefreshCcw,
  },
  {
    title: "Invite teammate",
    href: "/dashboard/team/invite",
    icon: UserPlus,
  },
  {
    title: "Contact support",
    href: siteConfig.links.support,
    icon: LifeBuoy,
  },
];

export function CommandMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((currentOpen) => !currentOpen);
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback(
    (callback: () => void) => {
      setOpen(false);
      callback();
    },
    [],
  );

  const marketingItems = useMemo(
    () => marketingNav.filter((item) => !pathname.startsWith("/dashboard") || item.href.startsWith("/docs")),
    [pathname],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, docs, or actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          {QUICK_ACTIONS.map((action) => (
            <CommandItem
              key={action.href}
              value={action.title}
              onSelect={() =>
                runCommand(() => {
                  if (action.href.startsWith("http")) {
                    window.open(action.href, "_blank", "noopener,noreferrer");
                  } else {
                    router.push(action.href);
                  }
                })
              }
            >
              <action.icon className="mr-2 size-4" aria-hidden="true" />
              <span>{action.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Dashboard">
          {[...dashboardSidebarNav, ...dashboardSecondaryNav].map((item) => (
            <CommandItem
              key={item.href}
              value={item.title}
              onSelect={() =>
                runCommand(() => {
                  router.push(item.href);
                })
              }
            >
              <item.icon className="mr-2 size-4" aria-hidden="true" />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Marketing">
          {marketingItems.map((item) => (
            <CommandItem
              key={item.href}
              value={item.title}
              onSelect={() =>
                runCommand(() => {
                  router.push(item.href);
                })
              }
            >
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="External">
          <CommandItem
            value="Changelog"
            onSelect={() =>
              runCommand(() => {
                router.push("/changelog");
              })
            }
          >
            <span>Changelog</span>
          </CommandItem>
          <CommandItem
            value="Status"
            onSelect={() =>
              runCommand(() => {
                window.open(siteConfig.links.status, "_blank", "noopener,noreferrer");
              })
            }
          >
            <span>Status page</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
