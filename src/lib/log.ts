// src/lib/log.ts
// Structured logging helper for TrendScholar
// Provides consistent, contextual logging across cron jobs, APIs, and webhooks

import { randomUUID } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  /** Unique request/job ID for tracing */
  requestId?: string;
  /** User ID if authenticated */
  userId?: string;
  /** Service or handler name (e.g., "cron:collector", "api:summarize") */
  service?: string;
  /** Additional context */
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Minimum log level based on environment
const MIN_LOG_LEVEL: LogLevel = 
  process.env.NODE_ENV === "production" ? "info" : "debug";

// ─────────────────────────────────────────────────────────────────────────────
// Core Logger Class
// ─────────────────────────────────────────────────────────────────────────────

class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({
      ...this.context,
      ...additionalContext,
    });
  }

  /**
   * Create a logger with a unique request ID
   */
  withRequestId(requestId?: string): Logger {
    return this.child({ requestId: requestId || randomUUID() });
  }

  /**
   * Create a logger with user context
   */
  withUser(userId: string): Logger {
    return this.child({ userId });
  }

  /**
   * Create a logger for a specific service
   */
  forService(service: string): Logger {
    return this.child({ service });
  }

  /**
   * Format and output a log entry
   */
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): void {
    // Check minimum log level
    if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LOG_LEVEL]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(Object.keys(this.context).length > 0 && { context: this.context }),
      ...(data && Object.keys(data).length > 0 && { data }),
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    };

    // Output as JSON for structured logging (Vercel, Datadog, etc.)
    const output = JSON.stringify(entry);

    switch (level) {
      case "debug":
        console.debug(output);
        break;
      case "info":
        console.info(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "error":
        console.error(output);
        break;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Public logging methods
  // ─────────────────────────────────────────────────────────────────────────────

  debug(message: string, data?: Record<string, unknown>): void {
    this.log("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log("warn", message, data);
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log("error", message, data, error);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Specialized logging methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Log the start of an operation
   */
  start(operation: string, data?: Record<string, unknown>): void {
    this.info(`Starting: ${operation}`, { operation, ...data });
  }

  /**
   * Log successful completion of an operation
   */
  success(operation: string, data?: Record<string, unknown>): void {
    this.info(`Completed: ${operation}`, { operation, status: "success", ...data });
  }

  /**
   * Log failure of an operation
   */
  failure(operation: string, error: Error, data?: Record<string, unknown>): void {
    this.error(`Failed: ${operation}`, error, { operation, status: "failure", ...data });
  }

  /**
   * Log an API request
   */
  request(
    method: string,
    path: string,
    data?: Record<string, unknown>
  ): void {
    this.info(`${method} ${path}`, { method, path, ...data });
  }

  /**
   * Log an API response
   */
  response(
    method: string,
    path: string,
    status: number,
    durationMs: number,
    data?: Record<string, unknown>
  ): void {
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    this.log(level, `${method} ${path} ${status} (${durationMs}ms)`, {
      method,
      path,
      status,
      durationMs,
      ...data,
    });
  }

  /**
   * Log a cron job execution
   */
  cron(
    jobName: string,
    phase: "start" | "progress" | "complete" | "error",
    data?: Record<string, unknown>
  ): void {
    const messages = {
      start: `Cron job started: ${jobName}`,
      progress: `Cron job progress: ${jobName}`,
      complete: `Cron job completed: ${jobName}`,
      error: `Cron job failed: ${jobName}`,
    };
    const level = phase === "error" ? "error" : "info";
    this.log(level, messages[phase], { jobName, phase, ...data });
  }

  /**
   * Log a payment/Stripe event
   */
  payment(
    event: string,
    data?: Record<string, unknown>
  ): void {
    this.info(`Payment event: ${event}`, { paymentEvent: event, ...data });
  }

  /**
   * Log AI/LLM operations
   */
  ai(
    operation: string,
    data?: Record<string, unknown>
  ): void {
    this.info(`AI operation: ${operation}`, { aiOperation: operation, ...data });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a base logger
 */
export function createLogger(context?: LogContext): Logger {
  return new Logger(context);
}

/**
 * Create a logger for API routes
 */
export function createApiLogger(
  routeName: string,
  requestId?: string,
  userId?: string
): Logger {
  return createLogger({
    service: `api:${routeName}`,
    requestId: requestId || randomUUID(),
    ...(userId && { userId }),
  });
}

/**
 * Create a logger for cron jobs
 */
export function createCronLogger(jobName: string): Logger {
  return createLogger({
    service: `cron:${jobName}`,
    requestId: randomUUID(),
  });
}

/**
 * Create a logger for webhooks
 */
export function createWebhookLogger(
  webhookName: string,
  requestId?: string
): Logger {
  return createLogger({
    service: `webhook:${webhookName}`,
    requestId: requestId || randomUUID(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Default logger instance
// ─────────────────────────────────────────────────────────────────────────────

export const log = createLogger();

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Timing helper
// ─────────────────────────────────────────────────────────────────────────────

export function withTiming<T>(
  logger: Logger,
  operation: string,
  fn: () => T | Promise<T>
): Promise<T> {
  const startTime = Date.now();
  logger.start(operation);

  const handleResult = (result: T) => {
    const durationMs = Date.now() - startTime;
    logger.success(operation, { durationMs });
    return result;
  };

  const handleError = (error: Error) => {
    const durationMs = Date.now() - startTime;
    logger.failure(operation, error, { durationMs });
    throw error;
  };

  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(handleResult).catch(handleError);
    }
    return Promise.resolve(handleResult(result));
  } catch (error) {
    return Promise.reject(handleError(error as Error));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export Logger type for consumers
// ─────────────────────────────────────────────────────────────────────────────

export type { Logger };
