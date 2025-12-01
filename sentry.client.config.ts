// sentry.client.config.ts
// Client-side Sentry configuration

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment
  environment: process.env.NODE_ENV || "development",

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay (optional - captures user sessions)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Debug mode
  debug: process.env.NODE_ENV !== "production",

  // Filter errors
  ignoreErrors: [
    // Browser-specific noise
    "ResizeObserver loop",
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // Network errors (often user's connection)
    "Network request failed",
    "Failed to fetch",
    "Load failed",
    "NetworkError",
    // User cancelled
    "AbortError",
    // Third-party scripts
    "Script error",
    // React hydration (often benign)
    "Hydration failed",
    "Text content does not match",
  ],

  // Only report errors from our domain
  allowUrls: [
    /https?:\/\/(www\.)?trendscholar\.com/,
    /https?:\/\/.*\.vercel\.app/,
    /localhost/,
  ],

  beforeSend(event, hint) {
    // Don't send in development
    if (process.env.NODE_ENV !== "production") {
      return null;
    }

    // Filter out expected errors
    const error = hint.originalException;
    if (error instanceof Error) {
      // Skip auth/navigation errors
      if (
        error.message?.includes("NEXT_REDIRECT") ||
        error.message?.includes("NEXT_NOT_FOUND")
      ) {
        return null;
      }
    }

    return event;
  },
});
