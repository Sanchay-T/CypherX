import {
  BookOpen,
  CreditCard,
  FileKey2,
  GaugeCircle,
  Home,
  LifeBuoy,
  PanelsTopLeft,
  Receipt,
  ScrollText,
  Settings2,
  ShieldCheck,
  SquareTerminal,
  Users2,
  Workflow,
} from "lucide-react";
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

export const dashboardSidebarNav: SidebarItem[] = [
  { title: "Overview", href: "/dashboard", icon: Home },
  { title: "Projects", href: "/dashboard/projects", icon: PanelsTopLeft },
  { title: "API Explorer", href: "/dashboard/explorer", icon: SquareTerminal },
  { title: "Usage & Health", href: "/dashboard/monitoring", icon: GaugeCircle },
  { title: "Docs", href: "/docs", icon: BookOpen },
  { title: "Support", href: "/dashboard/support", icon: LifeBuoy },
];

export const dashboardSecondaryNav: SidebarItem[] = [
  { title: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { title: "Team", href: "/dashboard/team", icon: Users2 },
  { title: "Security", href: "/dashboard/security", icon: ShieldCheck },
  { title: "Audit Logs", href: "/dashboard/logs", icon: ScrollText },
  { title: "Automation", href: "/dashboard/automation", icon: Workflow },
  { title: "Credentials", href: "/dashboard/credentials", icon: FileKey2 },
  { title: "Revenue", href: "/dashboard/finance", icon: Receipt },
  { title: "Workspace Settings", href: "/dashboard/settings", icon: Settings2 },
];

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
