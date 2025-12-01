// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import {
  stripe,
  syncSubscriptionToDatabase,
  cancelSubscription,
  getPlanFromPriceId,
  mapStripeStatusToSubscriptionStatus,
  PLAN_PRICE_MAP,
} from "@/lib/stripe";
import { createWebhookLogger } from "@/lib/log";
import { capturePaymentError, addBreadcrumb, flush } from "@/lib/sentry";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface WebhookResult {
  success: boolean;
  event: string;
  customerId?: string;
  action?: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/stripe/webhook
 * 
 * Handles Stripe webhook events for subscription lifecycle management.
 * 
 * @security
 * - Verifies webhook signature using STRIPE_WEBHOOK_SECRET
 * - Reads raw body (required for signature verification)
 * - Idempotent: Can safely receive duplicate events
 * 
 * Required Stripe Dashboard webhook configuration:
 * 1. Go to Developers → Webhooks → Add endpoint
 * 2. URL: https://yourdomain.com/api/stripe/webhook
 * 3. Events to subscribe:
 *    - customer.subscription.created
 *    - customer.subscription.updated
 *    - customer.subscription.deleted
 *    - checkout.session.completed
 *    - invoice.payment_succeeded
 *    - invoice.payment_failed
 * 4. Copy the signing secret to STRIPE_WEBHOOK_SECRET env var
 * 
 * Plan/Price Mapping (via environment variables):
 * - STRIPE_PRICE_ID_PRO → PRO plan
 * - STRIPE_PRICE_ID_PLUS → PLUS plan
 * - Unknown price IDs → FREE plan (fallback)
 * 
 * Status Mapping (Stripe → Database):
 * - active → ACTIVE (full access)
 * - trialing → TRIALING (full access during trial)
 * - past_due → PAST_DUE (grace period, may have limited access)
 * - canceled → CANCELED (downgrade to FREE)
 * - unpaid → UNPAID (access revoked)
 * - incomplete → INCOMPLETE (initial payment pending)
 * - incomplete_expired → INCOMPLETE_EXPIRED (payment window closed)
 * - paused → PAUSED (billing paused)
 */
export async function POST(req: NextRequest): Promise<NextResponse<WebhookResult>> {
  const log = createWebhookLogger("stripe");

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Read raw body and signature header
  // ─────────────────────────────────────────────────────────────────────────
  let body: string;
  try {
    body = await req.text();
  } catch (err) {
    log.error("Failed to read request body", err as Error);
    return NextResponse.json(
      { success: false, event: "unknown", error: "Failed to read request body" },
      { status: 400 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    log.warn("Missing stripe-signature header");
    return NextResponse.json(
      { success: false, event: "unknown", error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Verify webhook secret is configured
  // ─────────────────────────────────────────────────────────────────────────
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { success: false, event: "unknown", error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Verify signature and construct event
  // ─────────────────────────────────────────────────────────────────────────
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.error(`Signature verification failed`, err as Error);
    return NextResponse.json(
      { success: false, event: "unknown", error: `Signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  // Log the event for debugging
  log.payment(event.type, { eventId: event.id });
  addBreadcrumb("Stripe webhook received", "payment", { 
    eventType: event.type, 
    eventId: event.id 
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Process event based on type
  // ─────────────────────────────────────────────────────────────────────────
  try {
    switch (event.type) {
      // ─────────────────────────────────────────────────────────────────────
      // Checkout Session Completed
      // Fires when customer completes Stripe Checkout
      // ─────────────────────────────────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Only process subscription checkouts (not one-time payments)
        if (session.mode !== "subscription" || !session.subscription) {
          log.info(`Skipping non-subscription checkout`, { sessionId: session.id });
          return NextResponse.json({
            success: true,
            event: event.type,
            action: "skipped_non_subscription",
          });
        }

        // Fetch full subscription details
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        ) as unknown as Stripe.Subscription;

        const result = await handleSubscriptionChange(subscription, "checkout_completed", log);
        
        return NextResponse.json({
          success: true,
          event: event.type,
          customerId: subscription.customer as string,
          action: result,
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // Subscription Created
      // Fires when a new subscription is created
      // ─────────────────────────────────────────────────────────────────────
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const result = await handleSubscriptionChange(subscription, "created", log);
        
        return NextResponse.json({
          success: true,
          event: event.type,
          customerId: subscription.customer as string,
          action: result,
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // Subscription Updated
      // Fires on: plan change, status change, renewal, etc.
      // ─────────────────────────────────────────────────────────────────────
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const previousAttributes = event.data.previous_attributes as Partial<Stripe.Subscription> | undefined;
        
        // Log what changed for debugging
        if (previousAttributes) {
          const changes: string[] = [];
          if (previousAttributes.status) changes.push(`status: ${previousAttributes.status} → ${subscription.status}`);
          if (previousAttributes.items) changes.push("items changed");
          if (changes.length > 0) {
            log.info(`Subscription updated`, { 
              subscriptionId: subscription.id, 
              changes: changes.join(", ") 
            });
          }
        }

        const result = await handleSubscriptionChange(subscription, "updated", log);
        
        return NextResponse.json({
          success: true,
          event: event.type,
          customerId: subscription.customer as string,
          action: result,
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // Subscription Deleted
      // Fires when subscription is canceled (immediately or at period end)
      // ─────────────────────────────────────────────────────────────────────
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        await cancelSubscription(customerId);
        
        log.payment("subscription_canceled", { 
          customerId, 
          action: "downgraded_to_free" 
        });
        
        return NextResponse.json({
          success: true,
          event: event.type,
          customerId,
          action: "canceled_downgraded_to_free",
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // Invoice Payment Succeeded
      // Fires on successful payment (subscription renewal, initial payment)
      // ─────────────────────────────────────────────────────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Get subscription ID from invoice.parent.subscription_details (Stripe v20+)
        const subscriptionRef = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof subscriptionRef === "string"
          ? subscriptionRef
          : subscriptionRef?.id;

        if (!subscriptionId) {
          log.info(`Invoice is not subscription-related, skipping`, { invoiceId: invoice.id });
          return NextResponse.json({
            success: true,
            event: event.type,
            action: "skipped_no_subscription",
          });
        }

        // Fetch fresh subscription data
        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId
        ) as unknown as Stripe.Subscription;

        const result = await handleSubscriptionChange(subscription, "payment_succeeded", log);
        
        return NextResponse.json({
          success: true,
          event: event.type,
          customerId: invoice.customer as string,
          action: result,
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // Invoice Payment Failed
      // Fires when payment fails (card declined, insufficient funds, etc.)
      // Stripe will retry automatically based on retry settings
      // ─────────────────────────────────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        // Get subscription ID
        const subscriptionRef = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof subscriptionRef === "string"
          ? subscriptionRef
          : subscriptionRef?.id;

        if (subscriptionId) {
          // Update subscription status to reflect payment failure
          // The subscription will likely be in "past_due" state
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionId
          ) as unknown as Stripe.Subscription;

          await handleSubscriptionChange(subscription, "payment_failed", log);
        }
        
        log.warn(`Payment failed`, { 
          customerId, 
          invoiceId: invoice.id,
          subscriptionId 
        });
        
        // Capture payment failures as important events
        capturePaymentError(new Error("Invoice payment failed"), {
          stripeEventId: event.id,
          stripeEventType: event.type,
          customerId,
        });
        
        return NextResponse.json({
          success: true,
          event: event.type,
          customerId,
          action: "payment_failed_status_updated",
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // Unhandled Event Types
      // Log for visibility but don't fail
      // ─────────────────────────────────────────────────────────────────────
      default:
        log.debug(`Unhandled event type`, { eventType: event.type });
        return NextResponse.json({
          success: true,
          event: event.type,
          action: "unhandled_event_type",
        });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error(`Error processing webhook`, error as Error, { eventType: event.type });
    
    // Capture to Sentry
    capturePaymentError(error, {
      stripeEventId: event.id,
      stripeEventType: event.type,
    });
    
    // Flush Sentry events
    await flush();
    
    // Return 500 to trigger Stripe retry
    return NextResponse.json(
      { success: false, event: event.type, error: message },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle subscription create/update events.
 * Syncs subscription data to database.
 */
async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  trigger: string,
  log: ReturnType<typeof createWebhookLogger>
): Promise<string> {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id ?? "";
  const status = subscription.status;
  
  // In Stripe v20+, current_period_end is on subscription items
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end ??
    Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // Fallback: 30 days

  // Map price to plan
  const plan = getPlanFromPriceId(priceId);
  const subscriptionStatus = mapStripeStatusToSubscriptionStatus(status);

  // Check if user exists with this Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true, email: true, plan: true },
  });

  if (!user) {
    log.error(`No user found for Stripe customer`, undefined, { customerId });
    throw new Error(`No user found for Stripe customer: ${customerId}`);
  }

  // Sync to database
  await syncSubscriptionToDatabase({
    subscriptionId: subscription.id,
    customerId,
    priceId,
    status,
    currentPeriodEnd: new Date(currentPeriodEnd * 1000),
  });

  const result = `${trigger}: user=${user.id} plan=${plan} status=${subscriptionStatus}`;
  log.payment("subscription_synced", { 
    trigger, 
    userId: user.id, 
    plan, 
    status: subscriptionStatus 
  });
  
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Method Handlers
// ─────────────────────────────────────────────────────────────────────────────

// Stripe only sends POST requests to webhooks
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Webhooks require POST." },
    { status: 405, headers: { Allow: "POST" } }
  );
}

// Note: In Next.js App Router, body parsing is automatically handled
// when using req.text() - no additional config needed
