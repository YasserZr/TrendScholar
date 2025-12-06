// tests/unit/plans.test.ts
// Unit tests for plan configuration and helpers

import { describe, it, expect } from "vitest";
import {
  PLANS,
  getPlanFeatures,
  getPlanLimits,
  isUnlimited,
  formatLimit,
  PlanError,
  isPlanUpgrade,
  getMinimumPlanForFeature,
  getUpgradeSuggestion,
} from "@/lib/plans";

describe("PLANS constant", () => {
  it("should have all three plans defined", () => {
    expect(PLANS).toHaveProperty("FREE");
    expect(PLANS).toHaveProperty("PRO");
    expect(PLANS).toHaveProperty("PLUS");
  });

  it("should have correct price for each plan", () => {
    // Prices are stored as strings like "$0"
    expect(PLANS.FREE.price).toBe("$0");
    expect(PLANS.PRO.price).toBe("$0");
    expect(PLANS.PLUS.price).toBe("$0");
  });

  it("should have features defined for each plan", () => {
    expect(PLANS.FREE.features).toBeDefined();
    expect(PLANS.PRO.features).toBeDefined();
    expect(PLANS.PLUS.features).toBeDefined();
  });

  it("should have limits defined for each plan", () => {
    expect(PLANS.FREE.limits).toBeDefined();
    expect(PLANS.PRO.limits).toBeDefined();
    expect(PLANS.PLUS.limits).toBeDefined();
  });

  it("should have correct FREE plan limits", () => {
    expect(PLANS.FREE.limits.dailySummaries).toBe(5);
    expect(PLANS.FREE.limits.savedPapers).toBe(25);
    expect(PLANS.FREE.limits.topics).toBe(3);
    expect(PLANS.FREE.limits.apiRequestsPerDay).toBe(0);
  });

  it("should have correct PRO plan limits", () => {
    expect(PLANS.PRO.limits.dailySummaries).toBe(50);
    expect(PLANS.PRO.limits.savedPapers).toBe(500);
    expect(PLANS.PRO.limits.topics).toBe(20);
    expect(PLANS.PRO.limits.apiRequestsPerDay).toBe(0);
  });

  it("should have correct PLUS plan limits (unlimited)", () => {
    expect(PLANS.PLUS.limits.dailySummaries).toBe(-1);
    expect(PLANS.PLUS.limits.savedPapers).toBe(-1);
    expect(PLANS.PLUS.limits.topics).toBe(-1);
    expect(PLANS.PLUS.limits.apiRequestsPerDay).toBe(1000);
  });
});

describe("getPlanFeatures", () => {
  it("should return FREE features for FREE plan", () => {
    const features = getPlanFeatures("FREE");
    expect(features).toEqual(PLANS.FREE.features);
  });

  it("should return PRO features for PRO plan", () => {
    const features = getPlanFeatures("PRO");
    expect(features).toEqual(PLANS.PRO.features);
  });

  it("should return PLUS features for PLUS plan", () => {
    const features = getPlanFeatures("PLUS");
    expect(features).toEqual(PLANS.PLUS.features);
  });

  it("should default to FREE for unknown plan", () => {
    const features = getPlanFeatures("UNKNOWN");
    expect(features).toEqual(PLANS.FREE.features);
  });

  it("should default to FREE for null plan", () => {
    const features = getPlanFeatures(null);
    expect(features).toEqual(PLANS.FREE.features);
  });

  it("should verify FREE has limited features", () => {
    const features = getPlanFeatures("FREE");
    expect(features.hasAPI).toBe(false);
    expect(features.hasAdvancedFilters).toBe(false);
    expect(features.hasSemanticSearch).toBe(false);
    expect(features.canExport).toBe(false);
  });

  it("should verify PRO has more features than FREE", () => {
    const features = getPlanFeatures("PRO");
    expect(features.hasAdvancedFilters).toBe(true);
    expect(features.hasSemanticSearch).toBe(true);
    expect(features.canExport).toBe(true);
    expect(features.hasAPI).toBe(false); // Still no API
  });

  it("should verify PLUS has all features", () => {
    const features = getPlanFeatures("PLUS");
    expect(features.hasAPI).toBe(true);
    expect(features.hasAdvancedFilters).toBe(true);
    expect(features.hasSemanticSearch).toBe(true);
    expect(features.canExport).toBe(true);
    expect(features.hasPrioritySupport).toBe(true);
    expect(features.hasEarlyAccess).toBe(true);
  });
});

describe("getPlanLimits", () => {
  it("should return FREE limits for FREE plan", () => {
    const limits = getPlanLimits("FREE");
    expect(limits).toEqual(PLANS.FREE.limits);
  });

  it("should return PRO limits for PRO plan", () => {
    const limits = getPlanLimits("PRO");
    expect(limits).toEqual(PLANS.PRO.limits);
  });

  it("should return PLUS limits for PLUS plan", () => {
    const limits = getPlanLimits("PLUS");
    expect(limits).toEqual(PLANS.PLUS.limits);
  });
});

describe("isUnlimited", () => {
  it("should return true for -1", () => {
    expect(isUnlimited(-1)).toBe(true);
  });

  it("should return false for positive numbers", () => {
    expect(isUnlimited(0)).toBe(false);
    expect(isUnlimited(1)).toBe(false);
    expect(isUnlimited(100)).toBe(false);
  });

  it("should return false for Infinity", () => {
    expect(isUnlimited(Infinity)).toBe(false);
  });
});

describe("formatLimit", () => {
  it("should return 'Unlimited' for -1", () => {
    expect(formatLimit(-1)).toBe("Unlimited");
  });

  it("should format regular numbers as strings", () => {
    expect(formatLimit(0)).toBe("0");
    expect(formatLimit(5)).toBe("5");
    expect(formatLimit(50)).toBe("50");
  });

  it("should handle zero", () => {
    expect(formatLimit(0)).toBe("0");
  });

  it("should format larger numbers as strings", () => {
    expect(formatLimit(1000)).toBe("1000");
    expect(formatLimit(10000)).toBe("10000");
  });
});

describe("PlanError", () => {
  it("should create error with correct properties", () => {
    const error = new PlanError(
      "Rate limit exceeded",
      "RATE_LIMIT_EXCEEDED",
      429,
      { limit: 5, used: 5 }
    );

    expect(error.message).toBe("Rate limit exceeded");
    expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(error.statusCode).toBe(429);
    expect(error.details).toEqual({ limit: 5, used: 5 });
  });

  it("should serialize to JSON correctly", () => {
    const error = new PlanError(
      "Upgrade required",
      "UPGRADE_REQUIRED",
      403,
      { currentPlan: "FREE", requiredPlan: "PRO" }
    );

    const json = error.toJSON();
    expect(json.success).toBe(false);
    expect(json.error).toBe("Upgrade required");
    expect(json.code).toBe("UPGRADE_REQUIRED");
  });

  it("should have default status code of 403", () => {
    const error = new PlanError("Feature not available", "FEATURE_NOT_AVAILABLE");
    expect(error.statusCode).toBe(403);
  });
});

describe("isPlanUpgrade", () => {
  it("should return true for FREE to PRO", () => {
    expect(isPlanUpgrade("FREE", "PRO")).toBe(true);
  });

  it("should return true for FREE to PLUS", () => {
    expect(isPlanUpgrade("FREE", "PLUS")).toBe(true);
  });

  it("should return true for PRO to PLUS", () => {
    expect(isPlanUpgrade("PRO", "PLUS")).toBe(true);
  });

  it("should return false for same plan", () => {
    expect(isPlanUpgrade("FREE", "FREE")).toBe(false);
    expect(isPlanUpgrade("PRO", "PRO")).toBe(false);
    expect(isPlanUpgrade("PLUS", "PLUS")).toBe(false);
  });

  it("should return false for downgrades", () => {
    expect(isPlanUpgrade("PRO", "FREE")).toBe(false);
    expect(isPlanUpgrade("PLUS", "PRO")).toBe(false);
    expect(isPlanUpgrade("PLUS", "FREE")).toBe(false);
  });
});

describe("getMinimumPlanForFeature", () => {
  it("should return FREE for features available on FREE", () => {
    // Features that FREE has
    expect(getMinimumPlanForFeature("canSeeTrends")).toBe("FREE");
    expect(getMinimumPlanForFeature("canDownloadPDF")).toBe("FREE");
    expect(getMinimumPlanForFeature("canSeeRelatedPapers")).toBe("FREE");
  });

  it("should return PRO for PRO-only features", () => {
    // Features that PRO has but FREE doesn't
    expect(getMinimumPlanForFeature("hasAdvancedFilters")).toBe("PRO");
    expect(getMinimumPlanForFeature("hasSemanticSearch")).toBe("PRO");
    expect(getMinimumPlanForFeature("canExport")).toBe("PRO");
    expect(getMinimumPlanForFeature("hasCustomDigests")).toBe("PRO");
  });

  it("should return PLUS for PLUS-only features", () => {
    // Features only PLUS has
    expect(getMinimumPlanForFeature("hasAPI")).toBe("PLUS");
    expect(getMinimumPlanForFeature("hasPrioritySupport")).toBe("PLUS");
    expect(getMinimumPlanForFeature("hasEarlyAccess")).toBe("PLUS");
  });
});

describe("getUpgradeSuggestion", () => {
  it("should return null for PLUS users", () => {
    expect(getUpgradeSuggestion("PLUS", "summarize")).toBeNull();
    expect(getUpgradeSuggestion("PLUS", "api")).toBeNull();
  });

  it("should suggest PRO for FREE users hitting summary limit", () => {
    const suggestion = getUpgradeSuggestion("FREE", "summarize");
    expect(suggestion?.suggestedPlan).toBe("PRO");
  });

  it("should suggest PLUS for PRO users hitting summary limit", () => {
    const suggestion = getUpgradeSuggestion("PRO", "summarize");
    expect(suggestion?.suggestedPlan).toBe("PLUS");
  });

  it("should suggest PLUS for API access", () => {
    const suggestion = getUpgradeSuggestion("FREE", "api");
    expect(suggestion?.suggestedPlan).toBe("PLUS");
  });

  it("should suggest PRO for semantic search", () => {
    const suggestion = getUpgradeSuggestion("FREE", "search");
    expect(suggestion?.suggestedPlan).toBe("PRO");
  });
});

describe("Plan Feature Progression", () => {
  it("should have more features as plan tier increases", () => {
    const freeFeatures = Object.values(PLANS.FREE.features).filter(Boolean).length;
    const proFeatures = Object.values(PLANS.PRO.features).filter(Boolean).length;
    const plusFeatures = Object.values(PLANS.PLUS.features).filter(Boolean).length;

    expect(proFeatures).toBeGreaterThan(freeFeatures);
    expect(plusFeatures).toBeGreaterThan(proFeatures);
  });

  it("should have higher limits as plan tier increases", () => {
    const freeLimits = PLANS.FREE.limits;
    const proLimits = PLANS.PRO.limits;
    const plusLimits = PLANS.PLUS.limits;

    expect(proLimits.dailySummaries).toBeGreaterThan(freeLimits.dailySummaries);
    expect(proLimits.savedPapers).toBeGreaterThan(freeLimits.savedPapers);
    expect(proLimits.topics).toBeGreaterThan(freeLimits.topics);

    // PLUS has unlimited (-1) which is less than PRO numerically but means unlimited
    expect(plusLimits.dailySummaries).toBe(-1);
    expect(plusLimits.savedPapers).toBe(-1);
    expect(plusLimits.topics).toBe(-1);
  });
});
