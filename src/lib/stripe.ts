// src/lib/stripe.ts
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import type { Plan } from "@/generated/prisma/client";

/**
 * Stripe client (server-side). Keep secret key server-only.
 * Expects STRIPE_SECRET_KEY in env.
 *
 * NOTE: Do NOT import this file in Edge runtime code; Stripe Node SDK expects Node.
 */
const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret && process.env.NODE_ENV !== "production") {
  console.warn("STRIPE_SECRET_KEY is not set. Stripe client will not work until it's provided.");
}

// Use a pinned API version if you prefer; update as needed.
export const stripe = new Stripe(stripeSecret ?? "", {
  apiVersion: "2025-11-17.clover",
});

// ─────────────────────────────────────────────────────────────────────────────
// Plan → Price ID Mapping (from environment variables)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps subscription plans to Stripe Price IDs.
 * Set these in your .env.local:
 *   STRIPE_PRICE_ID_PRO=price_xxxxx
 *   STRIPE_PRICE_ID_PLUS=price_xxxxx
 */
export const PLAN_PRICE_MAP: Record<Exclude<Plan, "FREE">, string> = {
  PRO: process.env.STRIPE_PRICE_ID_PRO ?? "",
  PLUS: process.env.STRIPE_PRICE_ID_PLUS ?? "",
};

/**
 * Reverse mapping: Price ID → Plan
 */
export function getPlanFromPriceId(priceId: string): Plan {
  if (priceId === PLAN_PRICE_MAP.PRO) return "PRO";
  if (priceId === PLAN_PRICE_MAP.PLUS) return "PLUS";
  return "FREE";
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface StripeUser {
  id: string;
  email: string | null;
  name?: string | null;
  stripeCustomerId?: string | null;
}

export interface CheckoutSessionParams {
  user: StripeUser;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface BillingPortalParams {
  user: StripeUser;
  returnUrl: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Classes
// ─────────────────────────────────────────────────────────────────────────────

export class StripeError extends Error {
  constructor(
    message: string,
    public code:
      | "CUSTOMER_CREATE_FAILED"
      | "CHECKOUT_CREATE_FAILED"
      | "PORTAL_CREATE_FAILED"
      | "NO_EMAIL"
      | "USER_NOT_FOUND"
  ) {
    super(message);
    this.name = "StripeError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get or create a Stripe customer for a user.
 * 
 * Idempotency:
 * - If user already has stripeCustomerId, returns existing customer
 * - Uses user.id as idempotency key for customer creation
 * - Saves stripeCustomerId to database atomically
 * 
 * @param user - User with id, email, and optionally stripeCustomerId
 * @returns Stripe Customer object
 * @throws StripeError if customer creation fails
 */
export async function getOrCreateStripeCustomer(
  user: StripeUser
): Promise<Stripe.Customer> {
  // Validate email exists (required for Stripe customer)
  if (!user.email) {
    throw new StripeError("User must have an email to create Stripe customer", "NO_EMAIL");
  }

  // Return existing customer if already linked
  if (user.stripeCustomerId) {
    try {
      const existingCustomer = await stripe.customers.retrieve(user.stripeCustomerId);
      
      // Check if customer was deleted in Stripe
      if (existingCustomer.deleted) {
        // Customer was deleted in Stripe, create a new one
        console.warn(`Stripe customer ${user.stripeCustomerId} was deleted, creating new one`);
      } else {
        return existingCustomer as Stripe.Customer;
      }
    } catch (error) {
      // Customer doesn't exist in Stripe, create a new one
      console.warn(`Stripe customer ${user.stripeCustomerId} not found, creating new one`);
    }
  }

  // Check if customer already exists by email (handles duplicate prevention)
  const existingCustomers = await stripe.customers.list({
    email: user.email,
    limit: 1,
  });

  let customer: Stripe.Customer;

  if (existingCustomers.data.length > 0) {
    // Use existing customer found by email
    customer = existingCustomers.data[0];
  } else {
    // Create new Stripe customer with idempotency key
    try {
      customer = await stripe.customers.create(
        {
          email: user.email,
          name: user.name ?? undefined,
          metadata: {
            userId: user.id,
          },
        },
        {
          // Idempotency key ensures we don't create duplicate customers
          // even if this function is called multiple times simultaneously
          idempotencyKey: `customer_create_${user.id}`,
        }
      );
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new StripeError(
          `Failed to create Stripe customer: ${error.message}`,
          "CUSTOMER_CREATE_FAILED"
        );
      }
      throw error;
    }
  }

  // Save stripeCustomerId to database
  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer;
}

/**
 * Create a Stripe Checkout Session for subscription.
 * 
 * Idempotency:
 * - Each checkout session is unique (Stripe handles this)
 * - Customer is created idempotently via getOrCreateStripeCustomer
 * 
 * @param params - User, priceId, successUrl, cancelUrl
 * @returns Stripe Checkout Session with URL
 * @throws StripeError if session creation fails
 */
export async function createCheckoutSession({
  user,
  priceId,
  successUrl,
  cancelUrl,
}: CheckoutSessionParams): Promise<Stripe.Checkout.Session> {
  // Ensure customer exists
  const customer = await getOrCreateStripeCustomer(user);

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Allow promotion codes
      allow_promotion_codes: true,
      // Pass metadata for webhook processing
      metadata: {
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
      // Collect billing address for tax purposes
      billing_address_collection: "required",
    });

    return session;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      throw new StripeError(
        `Failed to create checkout session: ${error.message}`,
        "CHECKOUT_CREATE_FAILED"
      );
    }
    throw error;
  }
}

/**
 * Create a Stripe Billing Portal Session for subscription management.
 * 
 * Allows users to:
 * - Update payment method
 * - View billing history
 * - Cancel subscription
 * - Upgrade/downgrade plan (if configured in Stripe Dashboard)
 * 
 * @param params - User and returnUrl
 * @returns Stripe Billing Portal Session with URL
 * @throws StripeError if session creation fails
 */
export async function createBillingPortalSession({
  user,
  returnUrl,
}: BillingPortalParams): Promise<Stripe.BillingPortal.Session> {
  // Ensure customer exists
  const customer = await getOrCreateStripeCustomer(user);

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl,
    });

    return session;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      throw new StripeError(
        `Failed to create billing portal session: ${error.message}`,
        "PORTAL_CREATE_FAILED"
      );
    }
    throw error;
  }
}

/**
 * Sync subscription status from Stripe to database.
 * Called from webhook handlers.
 * 
 * @param subscriptionId - Stripe subscription ID
 * @param customerId - Stripe customer ID
 * @param priceId - Current price ID
 * @param status - Subscription status
 * @param currentPeriodEnd - End of current billing period
 */
export async function syncSubscriptionToDatabase({
  subscriptionId,
  customerId,
  priceId,
  status,
  currentPeriodEnd,
}: {
  subscriptionId: string;
  customerId: string;
  priceId: string;
  status: Stripe.Subscription.Status;
  currentPeriodEnd: Date;
}): Promise<void> {
  // Determine plan from price ID
  const plan = getPlanFromPriceId(priceId);

  // Only consider "active" or "trialing" as valid subscription states
  const isActiveSubscription = status === "active" || status === "trialing";

  await prisma.user.update({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: currentPeriodEnd,
      plan: isActiveSubscription ? plan : "FREE",
    },
  });
}

/**
 * Cancel subscription and downgrade to FREE.
 * Called when subscription is canceled or payment fails.
 * 
 * @param customerId - Stripe customer ID
 */
export async function cancelSubscription(customerId: string): Promise<void> {
  await prisma.user.update({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
      plan: "FREE",
    },
  });
}

export default stripe;