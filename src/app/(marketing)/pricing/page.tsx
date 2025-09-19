import Link from "next/link";

import { DashboardAwareButton } from "@/components/auth/dashboard-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { plans } from "@/data/projects";

const faqs = [
  {
    q: "How does usage-based billing work?",
    a: "CypherX meters every API request and applies your pricing rules automatically. You can mix subscriptions with pay-per-use or volume-based discounts.",
  },
  {
    q: "Can I self-host the control plane?",
    a: "Enterprise plans can run on your infrastructure with our managed control plane, giving you data residency and compliance guarantees.",
  },
  {
    q: "Do you support custom SLAs?",
    a: "Yes. We offer 99.95%+ SLA commitments with multi-region redundancy and instant failover for Enterprise customers.",
  },
];

export default function PricingPage() {
  return (
    <div className="space-y-24 pb-20 pt-16">
      <section className="mx-auto w-full max-w-5xl px-4 text-center sm:px-6">
        <span className="inline-flex items-center rounded-full border border-border/50 bg-muted/20 px-3 py-1 text-xs font-medium text-muted-foreground">
          Transparent pricing that grows with your API
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Simple plans. Powerful capabilities.
        </h1>
        <p className="mt-4 text-muted-foreground">
          Start free, then calibrate usage-based billing with no hidden costs. Every plan includes secure API keys, docs, analytics, and support.
        </p>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 sm:grid-cols-3 sm:px-6">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={plan.highlight ? "border-primary/40 shadow-lg shadow-primary/5" : "border-border/60"}
          >
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4 text-3xl font-semibold text-foreground">
                {plan.price}
                {plan.price !== "Free" && plan.price !== "Custom" ? (
                  <span className="text-base font-normal text-muted-foreground"> /month</span>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {plan.price === "Custom" ? (
                <Button
                  asChild
                  className="w-full"
                  variant={plan.highlight ? "default" : "outline"}
                >
                  <Link href="/contact">{plan.cta}</Link>
                </Button>
              ) : (
                <DashboardAwareButton
                  className="w-full"
                  variant={plan.highlight ? "default" : "outline"}
                  signedOutHref="/signup"
                  signedOutLabel={plan.cta}
                  signedInLabel="Go to dashboard"
                />
              )}
            </CardFooter>
          </Card>
        ))}
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-8 px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground">Billing FAQs</h2>
          <p className="mt-2 text-muted-foreground">
            Everything you need to know about billing, usage, and enterprise options.
          </p>
        </div>
        <div className="space-y-6">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-xl border border-border/60 bg-muted/30 p-6">
              <p className="text-base font-semibold text-foreground">{faq.q}</p>
              <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-8 text-center">
          <h3 className="text-xl font-semibold text-foreground">Need a custom plan?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            For high-volume teams and regulated industries, we tailor pricing, SLAs, and deployment models to your needs.
          </p>
          <Button asChild size="lg" className="mt-4">
            <Link href="/contact">Talk to sales</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
