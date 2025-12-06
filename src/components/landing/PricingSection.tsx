// src/components/landing/PricingSection.tsx
"use client";

import { CheckIcon, BeakerIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckoutButton } from "@/components/pricing/CheckoutButton";
import Link from "next/link";

/**
 * Testing mode flag - matches TESTING_MODE in checkSubscription.ts
 */
const TESTING_MODE = process.env.NEXT_PUBLIC_TESTING_MODE === "true";

const tiers = [
  {
    name: "Free",
    id: "FREE",
    price: "$0",
    period: "forever",
    description: "Perfect for exploring and casual reading.",
    features: [
      "Browse all papers",
      "Basic search",
      "5 paper views per day",
      "Community support",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    id: "PRO",
    price: "$0",
    period: "/month",
    description: "For researchers who want AI-powered insights.",
    features: [
      "Everything in Free",
      "10 AI summaries per day",
      "Follow up to 10 topics",
      "Daily email digests",
      "Semantic paper search",
      "Priority support",
    ],
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "Plus",
    id: "PLUS",
    price: "$0",
    period: "/month",
    description: "For power users and research teams.",
    features: [
      "Everything in Pro",
      "50 AI summaries per day",
      "Unlimited topics",
      "Custom digest frequency",
      "API access",
      "Team collaboration (soon)",
      "Dedicated support",
    ],
    cta: "Start Plus Trial",
    highlighted: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-[#e8f0f8] to-[#F8FAFC] dark:from-slate-900/50 dark:to-slate-950">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-slate-800 dark:text-white">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-[#64748b] dark:text-slate-300">
            Choose the plan that fits your research workflow. All plans include
            a 7-day free trial.
          </p>
        </div>

        {/* Testing Mode Banner */}
        {TESTING_MODE && (
          <div className="max-w-2xl mx-auto mb-8 rounded-lg border border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4">
            <div className="flex items-center justify-center gap-3 text-amber-700 dark:text-amber-400">
              <BeakerIcon className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">
                <strong>Testing Mode:</strong> All users currently have Plus plan features enabled for free! Sign in to access all premium features.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier) => (
            <Card
              key={tier.id}
              className={`relative flex flex-col bg-white dark:bg-slate-800/50 border-[#BCCCDC] dark:border-slate-700 ${
                tier.highlighted
                  ? "border-blue-600 shadow-lg shadow-blue-600/10 scale-105"
                  : ""
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground">{tier.period}</span>
                </div>

                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckIcon className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {tier.id === "FREE" ? (
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/auth/signin">Get Started</Link>
                  </Button>
                ) : (
                  <CheckoutButton
                    plan={tier.id as "PRO" | "PLUS"}
                    highlighted={tier.highlighted}
                  >
                    {tier.cta}
                  </CheckoutButton>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          All plans include a 7-day free trial. Cancel anytime.
        </p>
      </div>
    </section>
  );
}
