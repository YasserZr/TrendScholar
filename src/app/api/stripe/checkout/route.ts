// src/app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  createCheckoutSession,
  getOrCreateStripeCustomer,
  PLAN_PRICE_MAP,
  StripeError,
} from "@/lib/stripe";
import type { Plan } from "@/generated/prisma/client";

// Valid plans that can be purchased (FREE is excluded)
const PURCHASABLE_PLANS = ["PRO", "PLUS"] as const;
type PurchasablePlan = (typeof PURCHASABLE_PLANS)[number];

function isPurchasablePlan(plan: unknown): plan is PurchasablePlan {
  return typeof plan === "string" && PURCHASABLE_PLANS.includes(plan as PurchasablePlan);
}

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout session for subscription upgrade.
 * 
 * @security
 * - Requires authentication via NextAuth session
 * - Validates plan parameter against allowed values
 * - Prevents duplicate subscription to same plan
 * - Uses HTTPS-only cookies for session
 * 
 * Request body:
 * ```json
 * { "plan": "PRO" | "PLUS" }
 * ```
 * 
 * Response (200):
 * ```json
 * { "checkoutUrl": "https://checkout.stripe.com/..." }
 * ```
 * 
 * Error responses:
 * - 401: Unauthorized (not logged in)
 * - 400: Invalid plan, already subscribed, or Stripe error
 * - 404: User not found
 * - 500: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { 
          success: false,
          error: "Authentication required", 
          code: "UNAUTHORIZED" 
        },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid JSON body", 
          code: "INVALID_BODY" 
        },
        { status: 400 }
      );
    }

    const { plan } = body as { plan?: unknown };

    // 3. Validate plan parameter
    if (!isPurchasablePlan(plan)) {
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid plan. Must be PRO or PLUS.", 
          code: "INVALID_PLAN",
          validPlans: PURCHASABLE_PLANS,
        },
        { status: 400 }
      );
    }

    // 4. Get price ID for the selected plan
    const priceId = PLAN_PRICE_MAP[plan];
    if (!priceId) {
      console.error(`[Stripe Checkout] Price ID not configured for plan: ${plan}`);
      return NextResponse.json(
        { 
          success: false,
          error: "Price not configured for this plan. Please contact support.", 
          code: "PRICE_NOT_CONFIGURED" 
        },
        { status: 500 }
      );
    }

    // 5. Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        plan: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: "User account not found", 
          code: "USER_NOT_FOUND" 
        },
        { status: 404 }
      );
    }

    // 6. Validate user has email (required for Stripe)
    if (!user.email) {
      return NextResponse.json(
        { 
          success: false,
          error: "Email address required. Please update your profile.", 
          code: "EMAIL_REQUIRED" 
        },
        { status: 400 }
      );
    }

    // 7. Check if user already has this plan
    if (user.plan === plan) {
      return NextResponse.json(
        { 
          success: false,
          error: `You are already subscribed to the ${plan} plan`, 
          code: "ALREADY_SUBSCRIBED",
          currentPlan: user.plan,
        },
        { status: 400 }
      );
    }

    // 8. Check if user has an active subscription (should use portal for upgrades)
    if (user.stripeSubscriptionId && user.plan !== "FREE") {
      return NextResponse.json(
        { 
          success: false,
          error: "You have an active subscription. Use the billing portal to change plans.", 
          code: "HAS_ACTIVE_SUBSCRIPTION",
          currentPlan: user.plan,
          suggestion: "Use POST /api/stripe/portal to manage your subscription",
        },
        { status: 400 }
      );
    }

    // 9. Build success/cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const successUrl = `${baseUrl}/dashboard?checkout=success&plan=${plan}`;
    const cancelUrl = `${baseUrl}/pricing?checkout=canceled`;

    // 10. Ensure Stripe customer exists (creates if needed)
    await getOrCreateStripeCustomer(user);

    // 11. Refetch user to get updated stripeCustomerId
    const updatedUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
      },
    });

    if (!updatedUser) {
      throw new Error("User disappeared during checkout flow");
    }

    // 12. Create checkout session
    const checkoutSession = await createCheckoutSession({
      user: updatedUser,
      priceId,
      successUrl,
      cancelUrl,
    });

    // 13. Return checkout URL
    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
    });

  } catch (error) {
    console.error("[Stripe Checkout Error]", error);

    if (error instanceof StripeError) {
      return NextResponse.json(
        { 
          success: false,
          error: error.message, 
          code: error.code 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: "Failed to create checkout session. Please try again.", 
        code: "INTERNAL_ERROR" 
      },
      { status: 500 }
    );
  }
}

// Disallow other methods
export async function GET() {
  return NextResponse.json(
    { success: false, error: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
    { status: 405, headers: { Allow: "POST" } }
  );
}
