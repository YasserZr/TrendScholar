// src/lib/plans.ts
// Plan configuration for TrendScholar

export const PLANS = {
  FREE: {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started with research exploration",
    features: [
      "5 AI summaries per day",
      "Save up to 25 papers",
      "Follow up to 3 topics",
      "Basic search",
      "Community support",
    ],
    limits: {
      dailySummaries: 5,
      savedPapers: 25,
      topics: 3,
    },
  },
  PRO: {
    name: "Pro",
    price: "$9",
    period: "per month",
    description: "For researchers who need more power",
    features: [
      "50 AI summaries per day",
      "Save up to 500 papers",
      "Follow up to 20 topics",
      "Advanced filters & sorting",
      "Weekly email digest",
      "Email support",
    ],
    limits: {
      dailySummaries: 50,
      savedPapers: 500,
      topics: 20,
    },
  },
  PLUS: {
    name: "Plus",
    price: "$19",
    period: "per month",
    description: "Unlimited access for power users",
    features: [
      "Unlimited AI summaries",
      "Unlimited saved papers",
      "Follow unlimited topics",
      "Priority email digest (daily)",
      "API access",
      "Priority support",
      "Early access to new features",
    ],
    limits: {
      dailySummaries: -1,
      savedPapers: -1,
      topics: -1,
    },
  },
} as const;

export type PlanKey = keyof typeof PLANS;
export type Plan = typeof PLANS[PlanKey];

/**
 * Get plan-specific limits
 */
export function getPlanLimits(plan: string) {
  switch (plan) {
    case "PLUS":
      return {
        dailySummaries: -1, // Unlimited
        savedPapers: -1,    // Unlimited
        topics: -1,         // Unlimited
      };
    case "PRO":
      return {
        dailySummaries: 50,
        savedPapers: 500,
        topics: 20,
      };
    case "FREE":
    default:
      return {
        dailySummaries: 5,
        savedPapers: 25,
        topics: 3,
      };
  }
}
