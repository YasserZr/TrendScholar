// src/lib/checkSubscription.ts
// Subscription helper for server-side premium feature checks

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Plan, User } from "@/generated/prisma/client";

/**
 * Testing mode flag - when enabled, all users get Plus plan features
 * Set TESTING_MODE=true in .env.local to enable
 */
export const TESTING_MODE = process.env.TESTING_MODE === "true";

/**
 * Subscription check result type
 */
export interface SubscriptionStatus {
  /** The authenticated user (null if not logged in) */
  user: User | null;
  /** Whether user has PRO or PLUS plan */
  isProOrPlus: boolean;
  /** Whether user has PLUS plan (highest tier) */
  isPlus: boolean;
  /** Whether user has PRO plan */
  isPro: boolean;
  /** Whether user is on FREE plan */
  isFree: boolean;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** The user's current plan */
  plan: Plan | null;
}

/**
 * Check the current user's subscription status
 * 
 * @example Server Component usage:
 * ```tsx
 * const { user, isProOrPlus } = await checkSubscription();
 * if (!isProOrPlus) redirect("/pricing");
 * ```
 * 
 * @example API Route usage:
 * ```tsx
 * const { isProOrPlus } = await checkSubscription();
 * if (!isProOrPlus) {
 *   return NextResponse.json({ error: "Premium feature" }, { status: 403 });
 * }
 * ```
 */
export async function checkSubscription(): Promise<SubscriptionStatus> {
  const session = await getServerSession(authOptions);

  // Not authenticated
  if (!session?.user?.id) {
    return {
      user: null,
      isProOrPlus: false,
      isPlus: false,
      isPro: false,
      isFree: false,
      isAuthenticated: false,
      plan: null,
    };
  }

  // Fetch fresh user data from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return {
      user: null,
      isProOrPlus: false,
      isPlus: false,
      isPro: false,
      isFree: false,
      isAuthenticated: false,
      plan: null,
    };
  }

  const plan = user.plan;
  
  // In testing mode, grant Plus plan features to all authenticated users
  if (TESTING_MODE) {
    return {
      user,
      isProOrPlus: true,
      isPlus: true,
      isPro: false,
      isFree: false,
      isAuthenticated: true,
      plan: "PLUS" as Plan, // Report as PLUS in testing mode
    };
  }
  
  const isPlus = plan === "PLUS";
  const isPro = plan === "PRO";
  const isFree = plan === "FREE";
  const isProOrPlus = isPro || isPlus;

  return {
    user,
    isProOrPlus,
    isPlus,
    isPro,
    isFree,
    isAuthenticated: true,
    plan,
  };
}

/**
 * Type guard to check if subscription allows premium features
 */
export function hasPremiumAccess(status: SubscriptionStatus): status is SubscriptionStatus & { user: User; isProOrPlus: true } {
  return status.isProOrPlus && status.user !== null;
}

/**
 * Type guard to check if user is authenticated
 */
export function isAuthenticatedUser(status: SubscriptionStatus): status is SubscriptionStatus & { user: User; isAuthenticated: true } {
  return status.isAuthenticated && status.user !== null;
}

/**
 * Require premium subscription or throw
 * Useful for API routes that need to gate access
 */
export async function requirePremium(): Promise<{ user: User; plan: Plan }> {
  const status = await checkSubscription();
  
  if (!status.isAuthenticated || !status.user) {
    throw new SubscriptionError("Authentication required", 401);
  }
  
  if (!status.isProOrPlus) {
    throw new SubscriptionError("Premium subscription required", 403);
  }
  
  return { user: status.user, plan: status.plan! };
}

/**
 * Require authentication or throw
 */
export async function requireAuth(): Promise<{ user: User; plan: Plan }> {
  const status = await checkSubscription();
  
  if (!status.isAuthenticated || !status.user) {
    throw new SubscriptionError("Authentication required", 401);
  }
  
  return { user: status.user, plan: status.plan! };
}

/**
 * Custom error class for subscription-related errors
 */
export class SubscriptionError extends Error {
  constructor(
    message: string,
    public statusCode: number = 403
  ) {
    super(message);
    this.name = "SubscriptionError";
  }
}

export default checkSubscription;
