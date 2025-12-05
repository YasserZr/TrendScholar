"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANS, type PlanKey } from "@/lib/plans";
import { CheckIcon, SparklesIcon, ArrowRightIcon, BeakerIcon } from "@heroicons/react/24/outline";

/**
 * Testing mode flag - when enabled, plan changes are disabled
 * Matches TESTING_MODE in checkSubscription.ts
 */
const TESTING_MODE = process.env.NEXT_PUBLIC_TESTING_MODE === "true";

interface BillingClientProps {
  currentPlan: PlanKey;
  subscriptionStatus: string | null;
  stripeCurrentPeriodEnd: Date | null;
  hasStripeCustomer: boolean;
}

export function BillingClient({
  currentPlan,
  subscriptionStatus,
  stripeCurrentPeriodEnd,
  hasStripeCustomer,
}: BillingClientProps) {
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  // Format subscription end date
  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Handle plan upgrade/downgrade
  const handlePlanChange = async (targetPlan: PlanKey) => {
    // Prevent plan changes during testing mode
    if (TESTING_MODE) {
      toast.info("Plan changes are disabled during testing. You already have Plus features!");
      return;
    }
    
    if (targetPlan === "FREE") {
      // Downgrade to free - redirect to portal
      handleManageSubscription();
      return;
    }

    setLoadingPlan(targetPlan);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
    } finally {
      setLoadingPlan(null);
    }
  };

  // Handle billing portal
  const handleManageSubscription = async () => {
    // Prevent portal access during testing mode
    if (TESTING_MODE) {
      toast.info("Billing management is disabled during testing.");
      return;
    }
    
    if (!hasStripeCustomer) {
      toast.error("No subscription to manage. Upgrade to a paid plan first.");
      return;
    }

    setLoadingPortal(true);

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: "/billing" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to open billing portal");
      }

      // Redirect to Stripe Billing Portal
      window.location.href = data.portalUrl;
    } catch (error) {
      console.error("Portal error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to open billing portal");
    } finally {
      setLoadingPortal(false);
    }
  };

  // Get button text based on plan comparison
  const getButtonText = (targetPlan: PlanKey) => {
    if (targetPlan === currentPlan) return "Current Plan";
    
    const planOrder: Record<PlanKey, number> = { FREE: 0, PRO: 1, PLUS: 2 };
    if (planOrder[targetPlan] > planOrder[currentPlan]) {
      return "Upgrade";
    }
    return "Downgrade";
  };

  // Get button variant
  const getButtonVariant = (targetPlan: PlanKey): "default" | "outline" | "secondary" => {
    if (targetPlan === currentPlan) return "secondary";
    if (targetPlan === "PLUS") return "default";
    return "outline";
  };

  // Check if subscription is active
  const isSubscriptionActive = subscriptionStatus === "ACTIVE" || subscriptionStatus === "TRIALING";

  return (
    <div className="space-y-8">
      {/* Testing Mode Notice */}
      {TESTING_MODE && (
        <Card className="border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <BeakerIcon className="h-5 w-5" />
              Testing Mode Active
            </CardTitle>
            <CardDescription className="text-amber-600 dark:text-amber-300">
              TrendScholar is currently in development. You have full access to all <strong>Plus plan features</strong> during our testing phase.
              Payments and plan changes are temporarily disabled. Enjoy exploring all premium features for free!
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Current Plan Summary */}
      <Card className="border-blue-500/50 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-blue-500" />
            Current Plan: {PLANS[currentPlan].name}
          </CardTitle>
          <CardDescription>
            {currentPlan === "FREE" ? (
              "You\u0027re on the free plan. Upgrade to unlock more features."
            ) : isSubscriptionActive ? (
              <>
                Your subscription is active.
                {stripeCurrentPeriodEnd && (
                  <> Renews on {formatDate(stripeCurrentPeriodEnd)}.</>
                )}
              </>
            ) : (
              <>
                Your subscription status: <span className="font-medium">{subscriptionStatus}</span>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm text-muted-foreground mb-2">Plan Features</p>
              <ul className="space-y-1">
                {PLANS[currentPlan].featureList.slice(0, 3).map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <CheckIcon className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            {hasStripeCustomer && !TESTING_MODE && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={handleManageSubscription}
                  disabled={loadingPortal}
                >
                  {loadingPortal ? "Loading..." : "Manage Subscription"}
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Limits Explanation */}
      <div className="rounded-lg border border-border/40 bg-muted/30 p-4">
        <h3 className="font-medium mb-2">Understanding Plan Limits</h3>
        <p className="text-sm text-muted-foreground">
          Each plan has different limits for daily AI summaries, saved papers, and followed topics.
          Free users can generate 5 summaries per day, while Pro users get 50. Plus users enjoy unlimited access.
          Limits reset daily at midnight UTC.
        </p>
      </div>

      {/* Plan Comparison */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Choose Your Plan</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {(Object.entries(PLANS) as [PlanKey, typeof PLANS[PlanKey]][]).map(
            ([planKey, plan]) => (
              <Card
                key={planKey}
                className={`relative flex flex-col ${
                  planKey === currentPlan
                    ? "border-blue-500 ring-2 ring-blue-500/20"
                    : planKey === "PLUS"
                    ? "border-purple-500/50"
                    : ""
                }`}
              >
                {planKey === "PLUS" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                {planKey === currentPlan && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Current
                    </span>
                  </div>
                )}

                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="mb-4">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>

                  <ul className="space-y-2">
                    {plan.featureList.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <CheckIcon className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={TESTING_MODE && planKey === "PLUS" ? "default" : getButtonVariant(planKey)}
                    disabled={TESTING_MODE || planKey === currentPlan || loadingPlan !== null}
                    onClick={() => handlePlanChange(planKey)}
                  >
                    {TESTING_MODE && planKey === "PLUS"
                      ? "🧪 Active (Testing)"
                      : TESTING_MODE
                      ? "Disabled (Testing)"
                      : loadingPlan === planKey
                      ? "Processing..."
                      : getButtonText(planKey)}
                  </Button>
                </CardFooter>
              </Card>
            )
          )}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border/40 p-4">
            <h3 className="font-medium mb-2">Can I cancel anytime?</h3>
            <p className="text-sm text-muted-foreground">
              Yes! You can cancel your subscription at any time from the billing portal.
              You&apos;ll continue to have access until the end of your billing period.
            </p>
          </div>
          <div className="rounded-lg border border-border/40 p-4">
            <h3 className="font-medium mb-2">What happens to my saved papers?</h3>
            <p className="text-sm text-muted-foreground">
              If you downgrade, your saved papers remain but you won&apos;t be able to save new
              ones if you&apos;re over the limit. Upgrade anytime to regain full access.
            </p>
          </div>
          <div className="rounded-lg border border-border/40 p-4">
            <h3 className="font-medium mb-2">Do you offer refunds?</h3>
            <p className="text-sm text-muted-foreground">
              We offer a 14-day money-back guarantee for first-time subscribers.
              Contact support if you&apos;re not satisfied.
            </p>
          </div>
          <div className="rounded-lg border border-border/40 p-4">
            <h3 className="font-medium mb-2">How do daily limits work?</h3>
            <p className="text-sm text-muted-foreground">
              Daily summary limits reset at midnight UTC. Unused summaries don&apos;t roll over.
              Upgrade to Plus for unlimited summaries.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
