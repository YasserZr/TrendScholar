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
 * @security
 * - Requires authentication via NextAuth session
 * - Requires existing Stripe customer (must have subscribed before)
 * - Validates returnUrl to prevent open redirect attacks
 * 
 * Request body (optional):
 * ```json
 * { "returnUrl": "/dashboard" }
 * ```
 * 
 * Response (200):
 * ```json
 * { "success": true, "portalUrl": "https://billing.stripe.com/..." }
 * ```
 * 
 * Error responses:
 * - 401: Unauthorized (not logged in)
 * - 400: No Stripe customer exists (never subscribed)
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

    // 2. Parse request body (optional returnUrl)
    let returnUrl: string = "";
    try {
      const body = await req.json();
      if (body && typeof body.returnUrl === "string") {
        returnUrl = body.returnUrl;
      }
    } catch {
      // Body is optional, continue with default
    }

    // 3. Build and validate return URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    
    if (!returnUrl) {
      // Default to dashboard
      returnUrl = `${baseUrl}/dashboard`;
    } else if (returnUrl.startsWith("/")) {
      // Relative path - prepend base URL (safe)
      returnUrl = `${baseUrl}${returnUrl}`;
    } else if (returnUrl.startsWith(baseUrl)) {
      // Absolute URL to our domain (safe)
      // Keep as-is
    } else {
      // External URL - reject to prevent open redirect
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid return URL. Must be a relative path or same-origin URL.", 
          code: "INVALID_RETURN_URL" 
        },
        { status: 400 }
      );
    }

    // 4. Fetch user from database
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
        { 
          success: false,
          error: "User account not found", 
          code: "USER_NOT_FOUND" 
        },
        { status: 404 }
      );
    }

    // 5. Check if user has a Stripe customer (needed for portal)
    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { 
          success: false,
          error: "No billing account found. Subscribe to a plan first.", 
          code: "NO_BILLING_ACCOUNT",
          suggestion: "Use POST /api/stripe/checkout with a plan to subscribe",
          currentPlan: user.plan,
        },
        { status: 400 }
      );
    }

    // 6. Create billing portal session
    const portalSession = await createBillingPortalSession({
      user,
      returnUrl,
    });

    // 7. Return portal URL
    return NextResponse.json({
      success: true,
      portalUrl: portalSession.url,
    });

  } catch (error) {
    console.error("[Stripe Portal Error]", error);

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
        error: "Failed to create billing portal session. Please try again.", 
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
