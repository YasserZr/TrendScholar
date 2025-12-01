// src/app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  createCheckoutSession,
  PLAN_PRICE_MAP,
  StripeError,
} from "@/lib/stripe";
import type { Plan } from "@/generated/prisma/client";

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout session for subscription upgrade.
 * 
 * Request body:
 * - plan: "PRO" | "PLUS"
 * 
 * Returns:
 * - url: Checkout session URL to redirect user to
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body = await req.json();
    const { plan } = body as { plan?: string };

    if (!plan || !["PRO", "PLUS"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan. Must be PRO or PLUS.", code: "INVALID_PLAN" },
        { status: 400 }
      );
    }

    // 3. Get price ID for the selected plan
    const priceId = PLAN_PRICE_MAP[plan as Exclude<Plan, "FREE">];
    if (!priceId) {
      return NextResponse.json(
        { error: "Price not configured for this plan", code: "PRICE_NOT_CONFIGURED" },
        { status: 500 }
      );
    }

    // 4. Fetch user from database (need full user object with stripeCustomerId)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
        plan: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 5. Check if user already has this plan
    if (user.plan === plan) {
      return NextResponse.json(
        { error: "You already have this plan", code: "ALREADY_SUBSCRIBED" },
        { status: 400 }
      );
    }

    // 6. Build success/cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const successUrl = `${baseUrl}/dashboard?checkout=success&plan=${plan}`;
    const cancelUrl = `${baseUrl}/pricing?checkout=canceled`;

    // 7. Create checkout session
    const checkoutSession = await createCheckoutSession({
      user,
      priceId,
      successUrl,
      cancelUrl,
    });

    // 8. Return checkout URL
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[Stripe Checkout Error]", error);

    if (error instanceof StripeError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create checkout session", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
