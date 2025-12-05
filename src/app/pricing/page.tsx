// src/app/pricing/page.tsx
// Pricing page for plan upgrades

import Link from "next/link";
import { AuthHeader, Footer } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckoutButton } from "@/components/pricing";
import { checkSubscription, TESTING_MODE } from "@/lib/checkSubscription";
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
      <AuthHeader />

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock the full power of AI-powered academic research with TrendScholar
          </p>
        </div>

        {/* Testing Mode Banner */}
        {TESTING_MODE && (
          <div className="max-w-2xl mx-auto mb-8 rounded-lg border border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4">
            <div className="flex items-center justify-center gap-3 text-amber-700 dark:text-amber-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
              <p className="text-sm font-medium">
                <strong>🎉 Testing Mode:</strong> All users have <span className="underline">Plus plan features</span> enabled for free! Payments are disabled during this period.
              </p>
            </div>
          </div>
        )}

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
