// src/instrumentation.ts
// Next.js 15 instrumentation file for Sentry initialization
// This runs once when the server starts

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Server-side Sentry initialization
    const Sentry = await import("@sentry/nextjs");

    Sentry.init({
      dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Environment configuration
      environment: process.env.NODE_ENV || "development",

      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

      // Set sampling rate for profiling
      profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

      // Debug mode (disable in production)
      debug: process.env.NODE_ENV !== "production",

      // Filter out noisy errors
      ignoreErrors: [
        // Common non-actionable errors
        "ResizeObserver loop",
        "Network request failed",
        "Load failed",
        "Failed to fetch",
        // Auth-related (expected behavior)
        "NEXT_REDIRECT",
        "NEXT_NOT_FOUND",
      ],

      // Configure which routes to trace
      integrations: [
        Sentry.prismaIntegration(),
      ],

      // Add additional context to all events
      beforeSend(event, hint) {
        // Don't send events in development unless explicitly enabled
        if (
          process.env.NODE_ENV !== "production" &&
          !process.env.SENTRY_DEBUG
        ) {
          return null;
        }

        // Filter out expected errors
        const error = hint.originalException;
        if (error instanceof Error) {
          // Skip PlanError (expected business logic)
          if (error.name === "PlanError") {
            return null;
          }
          // Skip auth redirects
          if (error.message?.includes("NEXT_REDIRECT")) {
            return null;
          }
        }

        return event;
      },

      // Configure breadcrumbs
      beforeBreadcrumb(breadcrumb) {
        // Filter out noisy console breadcrumbs in production
        if (
          process.env.NODE_ENV === "production" &&
          breadcrumb.category === "console" &&
          breadcrumb.level === "debug"
        ) {
          return null;
        }
        return breadcrumb;
      },
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Edge runtime Sentry initialization
    const Sentry = await import("@sentry/nextjs");

    Sentry.init({
      dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      debug: process.env.NODE_ENV !== "production",
    });
  }
}

// Handle uncaught errors
export const onRequestError = async (
  error: Error,
  request: Request,
  context: { routerKind: string; routePath: string; routeType: string }
) => {
  const Sentry = await import("@sentry/nextjs");

  Sentry.withScope((scope) => {
    scope.setTag("router.kind", context.routerKind);
    scope.setTag("router.path", context.routePath);
    scope.setTag("router.type", context.routeType);

    // Add request context
    scope.setContext("request", {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
    });

    Sentry.captureException(error);
  });
};
