// sentry.server.config.ts
// Server-side Sentry configuration (used by instrumentation.ts)
// This file can be imported directly if needed

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment
  environment: process.env.NODE_ENV || "development",

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Profiling (Node.js only)
  profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Debug mode
  debug: process.env.NODE_ENV !== "production",

  // Filter errors
  ignoreErrors: [
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
    "PlanError",
  ],

  // Integrations
  integrations: [
    Sentry.prismaIntegration(),
  ],

  beforeSend(event, hint) {
    // Don't send in development
    if (
      process.env.NODE_ENV !== "production" &&
      !process.env.SENTRY_DEBUG
    ) {
      return null;
    }

    const error = hint.originalException;
    if (error instanceof Error) {
      // Skip business logic errors
      if (error.name === "PlanError" || error.name === "SubscriptionError") {
        return null;
      }
    }

    return event;
  },
});
