// src/app/billing/page.tsx
import { redirect } from "next/navigation";
import { AuthHeader, Footer } from "@/components/ui";
import { checkSubscription } from "@/lib/checkSubscription";
import { BillingClient } from "./BillingClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing | TrendScholar",
  description: "Manage your subscription and billing",
};

export default async function BillingPage() {
  const { user, plan, isAuthenticated } = await checkSubscription();

  if (!isAuthenticated || !user) {
    redirect("/auth/signin?callbackUrl=/billing");
  }

  const currentPlan = plan || "FREE";

  return (
    <div className="flex min-h-screen flex-col">
      <AuthHeader />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription plan and billing details.
          </p>
        </div>

        <BillingClient
          currentPlan={currentPlan}
          subscriptionStatus={user.subscriptionStatus}
          stripeCurrentPeriodEnd={user.stripeCurrentPeriodEnd}
          hasStripeCustomer={!!user.stripeCustomerId}
        />
      </main>

      <Footer />
    </div>
  );
}
