// tests/unit/log.test.ts
// Unit tests for logging helper functions

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createLogger,
  createApiLogger,
  createCronLogger,
  createWebhookLogger,
  withTiming,
} from "@/lib/log";

// Mock console methods
const mockConsole = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const originalConsole = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

beforeEach(() => {
  console.debug = mockConsole.debug;
  console.info = mockConsole.info;
  console.warn = mockConsole.warn;
  console.error = mockConsole.error;
});

afterEach(() => {
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  vi.clearAllMocks();
});

describe("createLogger", () => {
  it("should create a logger with service name", () => {
    const logger = createLogger({ service: "test-service" });
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  it("should log with correct service name", () => {
    const logger = createLogger({ service: "my-service" });
    logger.info("test message");
    
    expect(mockConsole.info).toHaveBeenCalled();
    const loggedMessage = mockConsole.info.mock.calls[0][0];
    expect(loggedMessage).toContain("my-service");
    expect(loggedMessage).toContain("test message");
  });

  it("should support adding context with withUser", () => {
    const logger = createLogger({ service: "service" });
    const contextLogger = logger.withUser("user_123");
    
    expect(contextLogger).toBeDefined();
    expect(typeof contextLogger.info).toBe("function");
  });
});

describe("createApiLogger", () => {
  it("should create an API logger with endpoint context", () => {
    const logger = createApiLogger("POST", "/api/summarize");
    expect(logger).toBeDefined();
    
    logger.info("Processing request");
    expect(mockConsole.info).toHaveBeenCalled();
    const loggedMessage = mockConsole.info.mock.calls[0][0];
    expect(loggedMessage).toContain("POST");
    expect(loggedMessage).toContain("/api/summarize");
  });

  it("should log with method and path context", () => {
    const logger = createApiLogger("GET", "/api/papers");
    logger.info("Fetching papers");
    
    const loggedMessage = mockConsole.info.mock.calls[0][0];
    expect(loggedMessage).toContain("GET");
    expect(loggedMessage).toContain("/api/papers");
  });
});

describe("createCronLogger", () => {
  it("should create a cron logger with job context", () => {
    const logger = createCronLogger("collector");
    expect(logger).toBeDefined();
    
    logger.info("Starting job");
    expect(mockConsole.info).toHaveBeenCalled();
    const loggedMessage = mockConsole.info.mock.calls[0][0];
    expect(loggedMessage).toContain("collector");
  });

  it("should have cron method for job lifecycle", () => {
    const logger = createCronLogger("summarizer");
    expect(typeof logger.cron).toBe("function");
    
    logger.cron("summarizer", "start", { count: 5 });
    expect(mockConsole.info).toHaveBeenCalled();
  });
});

describe("createWebhookLogger", () => {
  it("should create a webhook logger with provider context", () => {
    const logger = createWebhookLogger("stripe");
    expect(logger).toBeDefined();
    
    logger.info("Processing webhook");
    expect(mockConsole.info).toHaveBeenCalled();
    const loggedMessage = mockConsole.info.mock.calls[0][0];
    expect(loggedMessage).toContain("stripe");
  });

  it("should have payment method for payment events", () => {
    const logger = createWebhookLogger("stripe");
    expect(typeof logger.payment).toBe("function");
    
    logger.payment("subscription_created", { customerId: "cus_123" });
    expect(mockConsole.info).toHaveBeenCalled();
  });
});

describe("Logger context methods", () => {
  it("withUser should add user context", () => {
    const logger = createLogger({ service: "service" });
    const userLogger = logger.withUser("user_123");
    
    userLogger.info("User action");
    const loggedMessage = mockConsole.info.mock.calls[0][0];
    expect(loggedMessage).toContain("user_123");
  });

  it("withRequestId should add request ID", () => {
    const logger = createApiLogger("POST", "/api/test");
    const reqLogger = logger.withRequestId("req_abc123");
    
    reqLogger.info("Processing");
    const loggedMessage = mockConsole.info.mock.calls[0][0];
    expect(loggedMessage).toContain("req_abc123");
  });

  it("forService should create child logger", () => {
    const logger = createLogger({ service: "parent" });
    const childLogger = logger.forService("child");
    
    expect(childLogger).toBeDefined();
    childLogger.info("Child log");
    
    const loggedMessage = mockConsole.info.mock.calls[0][0];
    expect(loggedMessage).toContain("child");
  });
});

describe("withTiming", () => {
  it("should measure and report execution time", async () => {
    const logger = createLogger({ service: "timing-test" });
    
    const result = await withTiming(
      logger,
      "test-operation",
      async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return "success";
      }
    );
    
    expect(result).toBe("success");
    expect(mockConsole.info).toHaveBeenCalled();
  });

  it("should return the result of the async function", async () => {
    const logger = createLogger({ service: "test" });
    
    const result = await withTiming(
      logger,
      "computation",
      async () => ({ value: 42 })
    );
    
    expect(result).toEqual({ value: 42 });
  });

  it("should propagate errors", async () => {
    const logger = createLogger({ service: "test" });
    
    await expect(
      withTiming(logger, "failing-op", async () => {
        throw new Error("Test error");
      })
    ).rejects.toThrow("Test error");
  });
});

describe("Log levels", () => {
  it("should support debug level", () => {
    const logger = createLogger({ service: "test" });
    logger.debug("Debug message");
    expect(mockConsole.debug).toHaveBeenCalled();
  });

  it("should support info level", () => {
    const logger = createLogger({ service: "test" });
    logger.info("Info message");
    expect(mockConsole.info).toHaveBeenCalled();
  });

  it("should support warn level", () => {
    const logger = createLogger({ service: "test" });
    logger.warn("Warning message");
    expect(mockConsole.warn).toHaveBeenCalled();
  });

  it("should support error level", () => {
    const logger = createLogger({ service: "test" });
    logger.error("Error message");
    expect(mockConsole.error).toHaveBeenCalled();
  });
});
