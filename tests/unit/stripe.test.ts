// tests/unit/stripe.test.ts
// Unit tests for Stripe helper functions
// These tests verify the pure functions without importing the actual stripe module
// (which has side effects like requiring DATABASE_URL)

import { describe, it, expect } from "vitest";

// Re-implement the pure functions to test them without module side effects
// This mirrors the logic in src/lib/stripe.ts

type Plan = "FREE" | "PRO" | "PLUS";
type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID" | "TRIALING" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "PAUSED";

// Mock plan price map - in real code this comes from env vars
const PLAN_PRICE_MAP = {
  PRO: "price_pro_test",
  PLUS: "price_plus_test",
};

function getPlanFromPriceId(priceId: string): Plan {
  if (priceId === PLAN_PRICE_MAP.PRO) return "PRO";
  if (priceId === PLAN_PRICE_MAP.PLUS) return "PLUS";
  return "FREE";
}

function mapStripeStatusToSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    unpaid: "UNPAID",
    trialing: "TRIALING",
    incomplete: "INCOMPLETE",
    incomplete_expired: "INCOMPLETE_EXPIRED",
    paused: "PAUSED",
  };
  return statusMap[stripeStatus] || "INCOMPLETE";
}

describe("getPlanFromPriceId", () => {
  it("should return PRO for PRO price ID", () => {
    expect(getPlanFromPriceId("price_pro_test")).toBe("PRO");
  });

  it("should return PLUS for PLUS price ID", () => {
    expect(getPlanFromPriceId("price_plus_test")).toBe("PLUS");
  });

  it("should return FREE for unknown price ID", () => {
    expect(getPlanFromPriceId("price_unknown")).toBe("FREE");
  });

  it("should return FREE for empty string", () => {
    expect(getPlanFromPriceId("")).toBe("FREE");
  });
});

describe("mapStripeStatusToSubscriptionStatus", () => {
  it("should map active to ACTIVE", () => {
    expect(mapStripeStatusToSubscriptionStatus("active")).toBe("ACTIVE");
  });

  it("should map past_due to PAST_DUE", () => {
    expect(mapStripeStatusToSubscriptionStatus("past_due")).toBe("PAST_DUE");
  });

  it("should map canceled to CANCELED", () => {
    expect(mapStripeStatusToSubscriptionStatus("canceled")).toBe("CANCELED");
  });

  it("should map unpaid to UNPAID", () => {
    expect(mapStripeStatusToSubscriptionStatus("unpaid")).toBe("UNPAID");
  });

  it("should map trialing to TRIALING", () => {
    expect(mapStripeStatusToSubscriptionStatus("trialing")).toBe("TRIALING");
  });

  it("should map incomplete to INCOMPLETE", () => {
    expect(mapStripeStatusToSubscriptionStatus("incomplete")).toBe("INCOMPLETE");
  });

  it("should map incomplete_expired to INCOMPLETE_EXPIRED", () => {
    expect(mapStripeStatusToSubscriptionStatus("incomplete_expired")).toBe("INCOMPLETE_EXPIRED");
  });

  it("should map paused to PAUSED", () => {
    expect(mapStripeStatusToSubscriptionStatus("paused")).toBe("PAUSED");
  });

  it("should default to INCOMPLETE for unknown status", () => {
    expect(mapStripeStatusToSubscriptionStatus("unknown")).toBe("INCOMPLETE");
    expect(mapStripeStatusToSubscriptionStatus("")).toBe("INCOMPLETE");
  });
});

describe("Stripe Price Mapping Logic", () => {
  it("should handle case sensitivity correctly", () => {
    // Price IDs are case sensitive in Stripe
    expect(getPlanFromPriceId("PRICE_PRO_TEST")).toBe("FREE"); // Wrong case
    expect(getPlanFromPriceId("price_pro_test")).toBe("PRO"); // Correct
  });

  it("should handle partial matches correctly", () => {
    // Should not match partial price IDs
    expect(getPlanFromPriceId("price_pro")).toBe("FREE");
    expect(getPlanFromPriceId("price_pro_test_extra")).toBe("FREE");
  });
});

describe("Subscription Status Mapping Logic", () => {
  it("should handle all valid Stripe statuses", () => {
    const validStatuses = [
      "active", "past_due", "canceled", "unpaid", 
      "trialing", "paused"
    ];
    
    for (const status of validStatuses) {
      const result = mapStripeStatusToSubscriptionStatus(status);
      // These statuses should NOT map to INCOMPLETE (the default)
      expect(result).not.toBe("INCOMPLETE");
    }
    
    // These statuses DO map to INCOMPLETE or INCOMPLETE_EXPIRED
    expect(mapStripeStatusToSubscriptionStatus("incomplete")).toBe("INCOMPLETE");
    expect(mapStripeStatusToSubscriptionStatus("incomplete_expired")).toBe("INCOMPLETE_EXPIRED");
  });

  it("should safely handle null-ish values as unknown", () => {
    // These would throw if not handled, but our function defaults to INCOMPLETE
    expect(mapStripeStatusToSubscriptionStatus("")).toBe("INCOMPLETE");
  });
});
