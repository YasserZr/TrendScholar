// src/app/pricing/page.tsx
// Pricing page for plan upgrades

import Link from "next/link";
import { Header, Footer } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckoutButton } from "@/components/pricing";
import { checkSubscription } from "@/lib/checkSubscription";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing | TrendScholar",
  description: "Choose the plan that's right for you",
};

const plans = [
  {
    name: "FREE" as const,
    price: "$0",
    description: "Get started with basic features",
    features: [
      "5 paper summaries per month",
      "Basic search",
      "Save up to 10 papers",
      "1 topic to follow",
    ],
    cta: "Current Plan",
    highlighted: false,
  },
  {
    name: "PRO" as const,
    price: "$9",
    period: "/month",
    description: "For serious researchers",
    features: [
      "100 paper summaries per month",
      "Advanced search with filters",
      "Unlimited saved papers",
      "10 topics to follow",
      "Email digest",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
  },
  {
    name: "PLUS" as const,
    price: "$29",
    period: "/month",
    description: "For teams and power users",
    features: [
      "Unlimited summaries",
      "API access",
      "Custom integrations",
      "Unlimited topics",
      "Team collaboration",
      "Dedicated support",
      "Early access to features",
    ],
    cta: "Upgrade to Plus",
    highlighted: false,
  },
];

export default async function PricingPage() {
  const { plan: currentPlan, isAuthenticated } = await checkSubscription();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock the full power of AI-powered academic research with TrendScholar
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((planItem) => {
            const isCurrentPlan = isAuthenticated && currentPlan === planItem.name;
            const canUpgrade = isAuthenticated && !isCurrentPlan && planItem.name !== "FREE";

            return (
              <Card
                key={planItem.name}
                className={`relative ${
                  planItem.highlighted
                    ? "border-blue-500 border-2 shadow-lg"
                    : "border-border"
                }`}
              >
                {planItem.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-lg">{planItem.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{planItem.price}</span>
                    {planItem.period && (
                      <span className="text-muted-foreground">{planItem.period}</span>
                    )}
                  </div>
                  <CardDescription className="mt-2">
                    {planItem.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-4">
                  <ul className="space-y-3 mb-6">
                    {planItem.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <svg
                          className="h-5 w-5 text-green-500 shrink-0 mt-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <Button className="w-full" variant="outline" disabled>
                      Current Plan
                    </Button>
                  ) : canUpgrade ? (
                    <CheckoutButton
                      plan={planItem.name as "PRO" | "PLUS"}
                      highlighted={planItem.highlighted}
                    >
                      {planItem.cta}
                    </CheckoutButton>
                  ) : !isAuthenticated && planItem.name !== "FREE" ? (
                    <Button asChild className="w-full" variant={planItem.highlighted ? "default" : "outline"}>
                      <Link href="/auth/signin?callbackUrl=/pricing">
                        Sign in to Upgrade
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild className="w-full" variant="outline">
                      <Link href={isAuthenticated ? "/dashboard" : "/auth/signin"}>
                        {isAuthenticated ? "Go to Dashboard" : "Get Started"}
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ or additional info */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            All plans include a 14-day free trial. Cancel anytime.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Need a custom plan?{" "}
            <Link href="/contact" className="text-blue-600 hover:underline">
              Contact us
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
