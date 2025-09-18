import { type LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  description?: string;
  external?: boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export type SidebarItem = NavItem & {
  icon: LucideIcon;
  badge?: string;
};

export const marketingNav: NavItem[] = [
  { title: "Platform", href: "/" },
  { title: "Pricing", href: "/pricing" },
  { title: "Docs", href: "/docs" },
  { title: "Changelog", href: "/changelog" },
  { title: "Support", href: "/support" },
];

export const footerNav: NavSection[] = [
  {
    title: "Product",
    items: [
      { title: "Overview", href: "/" },
      { title: "Roadmap", href: "/changelog" },
      { title: "Status", href: "https://status.cypherx.dev", external: true },
      { title: "Integrations", href: "/docs#integrations" },
    ],
  },
  {
    title: "Company",
    items: [
      { title: "About", href: "/about" },
      { title: "Careers", href: "/careers" },
      { title: "Press", href: "/press" },
    ],
  },
  {
    title: "Resources",
    items: [
      { title: "Support", href: "/support" },
      { title: "Security", href: "/legal/security" },
      { title: "Privacy", href: "/legal/privacy" },
      { title: "Terms", href: "/legal/terms" },
    ],
  },
];

export const dashboardSidebarNav: SidebarItem[] = [];

export const dashboardSecondaryNav: SidebarItem[] = [];

export const projectNavigation = {
  tabs: [
    { title: "Overview", href: "overview" },
    { title: "API Keys", href: "api-keys" },
    { title: "Usage", href: "usage" },
    { title: "Billing", href: "billing" },
    { title: "Team", href: "team" },
    { title: "Webhooks", href: "webhooks" },
    { title: "Logs", href: "logs" },
    { title: "Settings", href: "settings" },
  ],
};

export const userMenu = [
  { title: "Profile", href: "/account/profile" },
  { title: "Security", href: "/account/security" },
  { title: "Notifications", href: "/account/notifications" },
  { title: "Billing", href: "/account/billing" },
];

export const supportQuickLinks: NavItem[] = [
  { title: "Create ticket", href: "/support/tickets/new" },
  { title: "API status", href: "https://status.cypherx.dev", external: true },
  { title: "Community", href: "/support/community" },
];
