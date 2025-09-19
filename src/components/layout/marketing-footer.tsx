import Link from "next/link";

import { Logo } from "@/components/branding/logo";
import { footerNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto grid w-full max-w-screen-2xl gap-8 px-4 py-16 sm:px-6 lg:px-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div className="space-y-4 text-sm text-muted-foreground">
          <Logo className="text-base" />
          <p className="max-w-sm text-muted-foreground">
            {siteConfig.description}
          </p>
          <p className="text-xs text-muted-foreground/80">
            © {new Date().getFullYear()} CypherX Labs. All rights reserved.
          </p>
        </div>
        {footerNav.map((section) => (
          <div key={section.title} className="space-y-3 text-sm">
            <p className="font-medium text-foreground">{section.title}</p>
            <ul className="space-y-2 text-muted-foreground">
              {section.items.map((item) => (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noreferrer" : undefined}
                    className="transition-colors hover:text-foreground"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
