import { addDays, format } from "date-fns";

export type ApiKey = {
  id: string;
  label: string;
  lastUsed: string;
  createdAt: string;
  expiresAt?: string;
  status: "active" | "rotated" | "revoked";
  scopes: string[];
};

export type UsageMetric = {
  date: string;
  requests: number;
  latencyP95: number;
  errors: number;
  cost: number;
};

export type Project = {
  id: string;
  name: string;
  slug: string;
  status: "live" | "in-review" | "sandbox";
  lastDeployment: string;
  billingPlan: "Scale" | "Pro" | "Enterprise";
  monthlySpend: number;
  monthlyRequests: number;
  apiKeys: ApiKey[];
  usage: UsageMetric[];
  team: Array<{
    name: string;
    role: "Owner" | "Admin" | "Developer" | "Finance";
    email: string;
  }>;
  webhooks: Array<{
    id: string;
    url: string;
    events: string[];
    lastResponse: string;
    status: "healthy" | "failing";
  }>;
};

const today = new Date();

const buildUsage = (days = 14): UsageMetric[] =>
  Array.from({ length: days }, (_, index) => {
    const date = addDays(today, -index);
    const requests = 32000 + Math.round(Math.random() * 2000 - 1000);
    const errors = Math.max(0, Math.round(requests * 0.002 * Math.random()));
    return {
      date: format(date, "LLL d"),
      requests,
      latencyP95: 180 + Math.round(Math.random() * 40 - 20),
      errors,
      cost: Number(((requests / 1000) * 0.12).toFixed(2)),
    };
  }).reverse();

export const projects: Project[] = [
  {
    id: "1",
    name: "Launchpad API",
    slug: "launchpad",
    status: "live",
    lastDeployment: "2 hours ago",
    billingPlan: "Scale",
    monthlySpend: 1280,
    monthlyRequests: 9_200_000,
    apiKeys: [
      {
        id: "key_live_NzUx",
        label: "Production",
        createdAt: "2025-05-12",
        lastUsed: "3 minutes ago",
        status: "active",
        scopes: ["read", "write", "webhooks"],
      },
      {
        id: "key_live_MzQ2",
        label: "Edge Workers",
        createdAt: "2025-04-02",
        lastUsed: "1 hour ago",
        status: "active",
        scopes: ["read"],
      },
      {
        id: "key_live_MTY5",
        label: "Legacy client",
        createdAt: "2024-11-21",
        lastUsed: "12 days ago",
        status: "rotated",
        scopes: ["read"],
        expiresAt: "2025-09-01",
      },
    ],
    usage: buildUsage(),
    team: [
      { name: "Sanchay Patel", role: "Owner", email: "sanchay@cypherx.dev" },
      { name: "Amara Rowe", role: "Admin", email: "amara@cypherx.dev" },
      { name: "Luis Chen", role: "Developer", email: "luis@cypherx.dev" },
      { name: "Priya Natarajan", role: "Finance", email: "priya@cypherx.dev" },
    ],
    webhooks: [
      {
        id: "wh_prod_1",
        url: "https://hooks.launchpad.dev/api-events",
        events: ["api.key.rotated", "subscription.updated", "usage.threshold"],
        lastResponse: "200 OK",
        status: "healthy",
      },
      {
        id: "wh_prod_2",
        url: "https://ops.launchpad.dev/alerts",
        events: ["service.degraded", "incident.updated"],
        lastResponse: "Webhook timed out",
        status: "failing",
      },
    ],
  },
];

export const recentActivity = [
  {
    id: "act-1",
    timestamp: "5 minutes ago",
    actor: "Amara Rowe",
    action: "Rotated primary key",
    target: "Launchpad API",
  },
  {
    id: "act-2",
    timestamp: "28 minutes ago",
    actor: "Luis Chen",
    action: "Deployed version 2025.09.2",
    target: "Launchpad API",
  },
  {
    id: "act-3",
    timestamp: "2 hours ago",
    actor: "System",
    action: "Usage alert triggered at 80% of quota",
    target: "Launchpad API",
  },
];

export const plans = [
  {
    name: "Build",
    price: "Free",
    cta: "Start free",
    description: "For prototypes and hackathons that need reliable infrastructure to get going fast.",
    features: [
      "Up to 250K requests/month",
      "1 production API key",
      "Basic analytics",
      "Community support",
    ],
  },
  {
    name: "Scale",
    price: "₹33,000",
    cta: "Upgrade",
    description: "Growth teams shipping APIs to thousands of users with observability and security in place.",
    features: [
      "Uncapped requests with metered billing",
      "Usage-based pricing toolkit",
      "Advanced rate limiting & quotas",
      "PagerDuty & Slack integrations",
    ],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cta: "Talk to sales",
    description: "Mission-critical platforms requiring governance, custom contracts, and dedicated support.",
    features: [
      "SLA-backed uptime",
      "SOC2, HIPAA, GDPR controls",
      "Priority incident response",
      "Solutions engineering support",
    ],
  },
];
