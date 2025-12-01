// src/lib/sentry.ts
// Sentry helper utilities for capturing errors with context
// Use these in API routes, cron handlers, and webhooks

import * as Sentry from "@sentry/nextjs";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  service?: string;
  operation?: string;
  [key: string]: unknown;
}

export interface CronErrorContext extends ErrorContext {
  jobName: string;
  itemsProcessed?: number;
  itemsFailed?: number;
}

export interface PaymentErrorContext extends ErrorContext {
  stripeEventId?: string;
  stripeEventType?: string;
  customerId?: string;
  subscriptionId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Error Capture
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Capture an exception with additional context
 */
export function captureError(
  error: Error | unknown,
  context?: ErrorContext
): string | undefined {
  return Sentry.withScope((scope) => {
    if (context) {
      // Set user context
      if (context.userId) {
        scope.setUser({ id: context.userId });
      }

      // Set tags for filtering
      if (context.service) {
        scope.setTag("service", context.service);
      }
      if (context.operation) {
        scope.setTag("operation", context.operation);
      }
      if (context.requestId) {
        scope.setTag("request_id", context.requestId);
      }

      // Add full context as extra data
      scope.setContext("error_context", context);
    }

    return Sentry.captureException(error);
  });
}

/**
 * Capture a message (non-error) with context
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  context?: ErrorContext
): string | undefined {
  return Sentry.withScope((scope) => {
    if (context) {
      if (context.userId) {
        scope.setUser({ id: context.userId });
      }
      scope.setContext("message_context", context);
    }

    return Sentry.captureMessage(message, level);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Specialized Error Capture
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Capture a cron job error
 */
export function captureCronError(
  error: Error | unknown,
  context: CronErrorContext
): string | undefined {
  return Sentry.withScope((scope) => {
    scope.setTag("service", `cron:${context.jobName}`);
    scope.setTag("cron_job", context.jobName);

    if (context.userId) {
      scope.setUser({ id: context.userId });
    }

    scope.setContext("cron_context", {
      jobName: context.jobName,
      itemsProcessed: context.itemsProcessed,
      itemsFailed: context.itemsFailed,
      userId: context.userId,
      requestId: context.requestId,
      service: context.service,
      operation: context.operation,
    });

    return Sentry.captureException(error);
  });
}

/**
 * Capture a payment/Stripe error
 */
export function capturePaymentError(
  error: Error | unknown,
  context: PaymentErrorContext
): string | undefined {
  return Sentry.withScope((scope) => {
    scope.setTag("service", "webhook:stripe");
    scope.setTag("payment_flow", "true");

    if (context.stripeEventType) {
      scope.setTag("stripe_event_type", context.stripeEventType);
    }

    if (context.userId) {
      scope.setUser({ id: context.userId });
    }

    scope.setContext("payment_context", {
      stripeEventId: context.stripeEventId,
      stripeEventType: context.stripeEventType,
      customerId: context.customerId,
      subscriptionId: context.subscriptionId,
      ...context,
    });

    return Sentry.captureException(error);
  });
}

/**
 * Capture an AI/LLM operation error
 */
export function captureAIError(
  error: Error | unknown,
  context: ErrorContext & {
    model?: string;
    inputTokens?: number;
    operation: string;
  }
): string | undefined {
  return Sentry.withScope((scope) => {
    scope.setTag("service", "ai");
    scope.setTag("ai_operation", context.operation);

    if (context.model) {
      scope.setTag("ai_model", context.model);
    }

    if (context.userId) {
      scope.setUser({ id: context.userId });
    }

    scope.setContext("ai_context", context);

    return Sentry.captureException(error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction / Span Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Start a Sentry span for performance monitoring
 */
export function startSpan<T>(
  name: string,
  op: string,
  fn: () => T | Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    {
      name,
      op,
    },
    async (span) => {
      try {
        const result = await fn();
        span?.setStatus({ code: 1, message: "ok" });
        return result;
      } catch (error) {
        span?.setStatus({ code: 2, message: "error" });
        throw error;
      }
    }
  );
}

/**
 * Wrap an async function with Sentry error handling
 */
export async function withErrorCapture<T>(
  fn: () => Promise<T>,
  context?: ErrorContext
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    captureError(error, context);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// User Context
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Set the current user for all subsequent Sentry events
 */
export function setUser(user: { id: string; email?: string; plan?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    ...(user.plan && { subscription: user.plan }),
  });
}

/**
 * Clear the current user context
 */
export function clearUser() {
  Sentry.setUser(null);
}

// ─────────────────────────────────────────────────────────────────────────────
// Breadcrumbs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = "info"
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Flush (for serverless)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Flush Sentry events (important for serverless/Vercel)
 */
export async function flush(timeout = 2000): Promise<boolean> {
  return Sentry.flush(timeout);
}

// Re-export Sentry for direct access when needed
export { Sentry };
