// src/lib/stripe.ts
import Stripe from "stripe";

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

export default stripe;