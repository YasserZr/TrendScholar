// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  stripe,
  syncSubscriptionToDatabase,
  cancelSubscription,
} from "@/lib/stripe";

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events for subscription lifecycle.
 * 
 * Required events to configure in Stripe Dashboard:
 * - checkout.session.completed
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Only process subscription checkouts
        if (session.mode !== "subscription" || !session.subscription) {
          break;
        }

        // Fetch the subscription to get details
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        ) as unknown as Stripe.Subscription;

        // In Stripe v20+, current_period_end is on subscription items
        const currentPeriodEnd = subscription.items.data[0]?.current_period_end ?? 
          Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // Fallback: 30 days

        await syncSubscriptionToDatabase({
          subscriptionId: subscription.id,
          customerId: subscription.customer as string,
          priceId: subscription.items.data[0]?.price.id ?? "",
          status: subscription.status,
          currentPeriodEnd: new Date(currentPeriodEnd * 1000),
        });

        console.log(`[Webhook] Checkout completed for customer ${subscription.customer}`);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        // In Stripe v20+, current_period_end is on subscription items
        const currentPeriodEnd = subscription.items.data[0]?.current_period_end ??
          Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // Fallback: 30 days

        await syncSubscriptionToDatabase({
          subscriptionId: subscription.id,
          customerId: subscription.customer as string,
          priceId: subscription.items.data[0]?.price.id ?? "",
          status: subscription.status,
          currentPeriodEnd: new Date(currentPeriodEnd * 1000),
        });

        console.log(`[Webhook] Subscription ${event.type} for customer ${subscription.customer}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        await cancelSubscription(subscription.customer as string);
        
        console.log(`[Webhook] Subscription deleted for customer ${subscription.customer}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Update subscription period end on successful payment
        // In Stripe v20+, subscription is in parent.subscription_details
        const subscriptionRef = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof subscriptionRef === 'string'
          ? subscriptionRef
          : subscriptionRef?.id;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionId
          ) as unknown as Stripe.Subscription;

          // In Stripe v20+, current_period_end is on subscription items
          const currentPeriodEnd = subscription.items.data[0]?.current_period_end ??
            Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // Fallback: 30 days

          await syncSubscriptionToDatabase({
            subscriptionId: subscription.id,
            customerId: subscription.customer as string,
            priceId: subscription.items.data[0]?.price.id ?? "",
            status: subscription.status,
            currentPeriodEnd: new Date(currentPeriodEnd * 1000),
          });
        }

        console.log(`[Webhook] Invoice payment succeeded for customer ${invoice.customer}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Log failed payment - Stripe will retry automatically
        // After final retry failure, subscription.deleted event will fire
        console.warn(`[Webhook] Invoice payment failed for customer ${invoice.customer}`);
        break;
      }

      default:
        // Unhandled event type
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[Webhook] Error processing ${event.type}:`, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

// Note: In Next.js App Router, body parsing is automatically disabled for route handlers
// when using req.text() or req.arrayBuffer(), so no config export is needed.
