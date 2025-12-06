// src/lib/plans.ts
// Single source of truth for plan features and limits in TrendScholar
// NOTE: This file is safe for client components - no server-only imports

import type { Plan as PlanEnum } from "@/generated/prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Plan limits - numerical constraints
 * -1 means unlimited
 */
export interface PlanLimits {
  /** Maximum AI summaries per day (-1 = unlimited) */
  dailySummaries: number;
  /** Maximum papers that can be saved (-1 = unlimited) */
  savedPapers: number;
  /** Maximum topics that can be followed (-1 = unlimited) */
  topics: number;
  /** Maximum API requests per day (-1 = unlimited, 0 = no access) */
  apiRequestsPerDay: number;
  /** Maximum papers in digest email */
  digestPaperLimit: number;
}

/**
 * Plan feature flags - boolean capabilities
 */
export interface PlanFeatures {
  /** Can view trend charts and analytics */
  canSeeTrends: boolean;
  /** Can download paper PDFs */
  canDownloadPDF: boolean;
  /** Has access to public API */
  hasAPI: boolean;
  /** Can customize digest frequency and content */
  hasCustomDigests: boolean;
  /** Can use advanced search filters */
  hasAdvancedFilters: boolean;
  /** Gets priority support */
  hasPrioritySupport: boolean;
  /** Gets early access to new features */
  hasEarlyAccess: boolean;
  /** Can export saved papers */
  canExport: boolean;
  /** Can use vector/semantic search */
  hasSemanticSearch: boolean;
  /** Can see related papers via AI */
  canSeeRelatedPapers: boolean;
}

/**
 * Complete plan configuration
 */
export interface PlanConfig {
  name: string;
  price: string;
  period: string;
  description: string;
  /** Feature list for marketing display */
  featureList: string[];
  limits: PlanLimits;
  features: PlanFeatures;
}

/**
 * Error codes for plan-related errors
 */
export const PlanErrorCode = {
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  FEATURE_NOT_AVAILABLE: "FEATURE_NOT_AVAILABLE",
  LIMIT_REACHED: "LIMIT_REACHED",
  UPGRADE_REQUIRED: "UPGRADE_REQUIRED",
  AUTH_REQUIRED: "AUTH_REQUIRED",
} as const;

export type PlanErrorCodeType = typeof PlanErrorCode[keyof typeof PlanErrorCode];

// ─────────────────────────────────────────────────────────────────────────────
// Plan Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const PLANS: Record<PlanEnum, PlanConfig> = {
  FREE: {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started with research exploration",
    featureList: [
      "5 AI summaries per day",
      "Save up to 25 papers",
      "Follow up to 3 topics",
      "Basic search",
      "View trends",
      "Community support",
    ],
    limits: {
      dailySummaries: 5,
      savedPapers: 25,
      topics: 3,
      apiRequestsPerDay: 0,
      digestPaperLimit: 5,
    },
    features: {
      canSeeTrends: true,
      canDownloadPDF: true,
      hasAPI: false,
      hasCustomDigests: false,
      hasAdvancedFilters: false,
      hasPrioritySupport: false,
      hasEarlyAccess: false,
      canExport: false,
      hasSemanticSearch: false,
      canSeeRelatedPapers: true,
    },
  },
  PRO: {
    name: "Pro",
    price: "$0",
    period: "per month",
    description: "For researchers who need more power",
    featureList: [
      "50 AI summaries per day",
      "Save up to 500 papers",
      "Follow up to 20 topics",
      "Advanced filters & sorting",
      "Semantic search",
      "Weekly email digest",
      "Export papers",
      "Email support",
    ],
    limits: {
      dailySummaries: 50,
      savedPapers: 500,
      topics: 20,
      apiRequestsPerDay: 0,
      digestPaperLimit: 20,
    },
    features: {
      canSeeTrends: true,
      canDownloadPDF: true,
      hasAPI: false,
      hasCustomDigests: true,
      hasAdvancedFilters: true,
      hasPrioritySupport: false,
      hasEarlyAccess: false,
      canExport: true,
      hasSemanticSearch: true,
      canSeeRelatedPapers: true,
    },
  },
  PLUS: {
    name: "Plus",
    price: "$0",
    period: "per month",
    description: "Unlimited access for power users",
    featureList: [
      "Unlimited AI summaries",
      "Unlimited saved papers",
      "Follow unlimited topics",
      "Priority email digest (daily)",
      "Full API access (1000 req/day)",
      "Priority support",
      "Early access to new features",
      "Advanced analytics",
    ],
    limits: {
      dailySummaries: -1,
      savedPapers: -1,
      topics: -1,
      apiRequestsPerDay: 1000,
      digestPaperLimit: 50,
    },
    features: {
      canSeeTrends: true,
      canDownloadPDF: true,
      hasAPI: true,
      hasCustomDigests: true,
      hasAdvancedFilters: true,
      hasPrioritySupport: true,
      hasEarlyAccess: true,
      canExport: true,
      hasSemanticSearch: true,
      canSeeRelatedPapers: true,
    },
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// ─────────────────────────────────────────────────────────────────────────────
// Getter Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get complete plan configuration
 */
export function getPlanConfig(plan: PlanEnum | string | null): PlanConfig {
  const key = (plan || "FREE") as PlanKey;
  return PLANS[key] || PLANS.FREE;
}

/**
 * Get plan limits only
 */
export function getPlanLimits(plan: PlanEnum | string | null): PlanLimits {
  return getPlanConfig(plan).limits;
}

/**
 * Get plan features only
 */
export function getPlanFeatures(plan: PlanEnum | string | null): PlanFeatures {
  return getPlanConfig(plan).features;
}

/**
 * Check if a limit is unlimited (-1)
 */
export function isUnlimited(value: number): boolean {
  return value === -1;
}

/**
 * Format a limit for display
 */
export function formatLimit(value: number): string {
  return value === -1 ? "Unlimited" : value.toString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan Error Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Custom error class for plan-related errors
 */
export class PlanError extends Error {
  constructor(
    message: string,
    public code: PlanErrorCodeType,
    public statusCode: number = 403,
    public details?: {
      currentPlan?: string;
      requiredPlan?: string;
      limit?: number;
      used?: number;
      feature?: string;
    }
  ) {
    super(message);
    this.name = "PlanError";
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan Comparison Helpers (client-safe)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a plan has better limits than another
 */
export function isPlanUpgrade(from: string, to: string): boolean {
  const planOrder: Record<string, number> = { FREE: 0, PRO: 1, PLUS: 2 };
  return (planOrder[to] || 0) > (planOrder[from] || 0);
}

/**
 * Get the minimum plan required for a feature
 */
export function getMinimumPlanForFeature(feature: keyof PlanFeatures): string {
  if (PLANS.FREE.features[feature]) return "FREE";
  if (PLANS.PRO.features[feature]) return "PRO";
  return "PLUS";
}

/**
 * Get upgrade suggestion based on what the user is trying to do
 */
export function getUpgradeSuggestion(
  currentPlan: string,
  action: "summarize" | "save" | "follow" | "api" | "search"
): { suggestedPlan: string; reason: string } | null {
  if (currentPlan === "PLUS") return null;

  const suggestions: Record<string, { plan: string; reason: string }> = {
    summarize: {
      plan: currentPlan === "FREE" ? "PRO" : "PLUS",
      reason: currentPlan === "FREE" 
        ? "Upgrade to PRO for 50 summaries/day" 
        : "Upgrade to PLUS for unlimited summaries",
    },
    save: {
      plan: currentPlan === "FREE" ? "PRO" : "PLUS",
      reason: currentPlan === "FREE"
        ? "Upgrade to PRO for 500 saved papers"
        : "Upgrade to PLUS for unlimited storage",
    },
    follow: {
      plan: currentPlan === "FREE" ? "PRO" : "PLUS",
      reason: currentPlan === "FREE"
        ? "Upgrade to PRO for 20 topics"
        : "Upgrade to PLUS for unlimited topics",
    },
    api: {
      plan: "PLUS",
      reason: "Upgrade to PLUS for full API access",
    },
    search: {
      plan: "PRO",
      reason: "Upgrade to PRO for semantic search",
    },
  };

  const suggestion = suggestions[action];
  if (!suggestion || isPlanUpgrade(currentPlan, suggestion.plan) === false) {
    return null;
  }

  return { suggestedPlan: suggestion.plan, reason: suggestion.reason };
}