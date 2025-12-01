// src/app/api/stripe/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createBillingPortalSession, StripeError } from "@/lib/stripe";

/**
 * POST /api/stripe/portal
 * Creates a Stripe Billing Portal session for subscription management.
 * 
 * Request body (optional):
 * - returnUrl: Custom return URL (defaults to /dashboard)
 * 
 * Returns:
 * - url: Billing portal URL to redirect user to
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

    // 2. Parse request body (optional returnUrl)
    let returnUrl: string;
    try {
      const body = await req.json();
      returnUrl = body.returnUrl;
    } catch {
      // Body is optional, use default
      returnUrl = "";
    }

    // 3. Build return URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    if (!returnUrl) {
      returnUrl = `${baseUrl}/dashboard`;
    } else if (!returnUrl.startsWith("http")) {
      returnUrl = `${baseUrl}${returnUrl}`;
    }

    // 4. Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 5. Check if user has a Stripe customer (needed for portal)
    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found. Subscribe to a plan first.", code: "NO_CUSTOMER" },
        { status: 400 }
      );
    }

    // 6. Create billing portal session
    const portalSession = await createBillingPortalSession({
      user,
      returnUrl,
    });

    // 7. Return portal URL
    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("[Stripe Portal Error]", error);

    if (error instanceof StripeError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create billing portal session", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
