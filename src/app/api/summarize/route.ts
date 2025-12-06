// src/app/api/summarize/route.ts
// Premium API route for paper summarization
// Returns 403 for FREE users, includes daily rate limiting

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkSubscription, SubscriptionError } from "@/lib/checkSubscription";
import prisma from "@/lib/prisma";
import {
  summarizePaperText,
  SummarizationError,
  type PaperSummary,
} from "@/lib/gemini";
import { fetchSimilarPapersForRAG, upsertPaperEmbedding } from "@/lib/vector";
import { getPlanLimits, isUnlimited, PlanError, PlanErrorCode } from "@/lib/plans";
import { assertCanSummarize } from "@/lib/plan-assertions";
import { createApiLogger, withTiming } from "@/lib/log";
import { captureError, captureAIError, addBreadcrumb, flush } from "@/lib/sentry";
import type { Plan } from "@/generated/prisma/client";

export const runtime = "nodejs"; // Required for Prisma

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SummarizeRequest {
  paperId: string;
  /** Force regeneration even if summary exists */
  regenerate?: boolean;
}

interface SummarizeSuccessResponse {
  success: true;
  summary: {
    id: string;
    tldr: string;
    contributions: string[];
    keywords: string[];
    status: string;
    model: string;
    createdAt: string;
  };
  paper: {
    id: string;
    title: string;
    arxivId: string;
  };
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  rateLimit: {
    limit: number;
    remaining: number;
    resetsAt: string;
  };
}

interface SummarizeErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get when the rate limit resets (next midnight UTC)
 */
function getRateLimitResetTime(): Date {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * Placeholder for PDF text extraction
 * In production, this would:
 * 1. Download PDF from paper.pdfUrl
 * 2. Extract text using pdf-parse or similar
 * 3. Return cleaned text
 */
async function fetchPdfText(pdfUrl: string | null): Promise<string | undefined> {
  if (!pdfUrl) return undefined;

  // TODO: Implement PDF text extraction
  // Options:
  // - pdf-parse (Node.js)
  // - External service (AWS Textract, Google Document AI)
  // - Pre-processed text stored in database
  
  // PDF extraction not yet implemented
  return undefined;
}

/**
 * Format PaperSummary into storable content string
 * Stores structured data as JSON in the content field
 */
function formatSummaryContent(summary: PaperSummary): string {
  return JSON.stringify(summary);
}

/**
 * Parse stored summary content back to PaperSummary
 */
function parseSummaryContent(content: string): PaperSummary | null {
  try {
    return JSON.parse(content) as PaperSummary;
  } catch {
    // Legacy format: plain text summary
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/summarize
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/summarize
 * 
 * Generate an AI summary for an academic paper.
 * 
 * Access: PRO and PLUS users only (FREE blocked)
 * Rate Limits: PRO=10/day, PLUS=50/day
 * 
 * Request Body:
 * ```json
 * {
 *   "paperId": "clx123...",
 *   "regenerate": false  // Optional: force regeneration
 * }
 * ```
 * 
 * Success Response (200):
 * ```json
 * {
 *   "success": true,
 *   "summary": {
 *     "id": "clx456...",
 *     "tldr": "This paper introduces...",
 *     "contributions": ["Key finding 1", "Key finding 2"],
 *     "keywords": ["machine-learning", "transformer"],
 *     "status": "COMPLETED",
 *     "model": "gpt-4o-mini",
 *     "createdAt": "2024-12-01T..."
 *   },
 *   "paper": { "id": "...", "title": "...", "arxivId": "..." },
 *   "usage": { "promptTokens": 500, "completionTokens": 200, "totalTokens": 700 },
 *   "rateLimit": { "limit": 10, "remaining": 9, "resetsAt": "..." }
 * }
 * ```
 * 
 * Error Responses:
 * - 400: Invalid request body
 * - 401: Not authenticated
 * - 403: FREE plan (upgrade required)
 * - 404: Paper not found
 * - 429: Rate limit exceeded
 * - 500: Internal error or model failure
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<SummarizeSuccessResponse | SummarizeErrorResponse>> {
  const log = createApiLogger("summarize");
  const startTime = Date.now();

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Authentication
    // ─────────────────────────────────────────────────────────────────────────
    const { user, plan } = await requireAuth();
    
    // Add user context to logger
    const userLog = log.withUser(user.id);
    userLog.request("POST", "/api/summarize", { plan });
    addBreadcrumb("Summarize request", "api", { userId: user.id, plan });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Plan & Rate Limit Check (using centralized plan system)
    // ─────────────────────────────────────────────────────────────────────────
    let rateLimitInfo: { used: number; limit: number; remaining: number };
    
    try {
      rateLimitInfo = await assertCanSummarize({ id: user.id, plan });
    } catch (error) {
      if (error instanceof PlanError) {
        const resetsAt = getRateLimitResetTime();
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            code: error.code,
            details: {
              ...error.details,
              resetsAt: resetsAt.toISOString(),
              upgradeUrl: "/pricing",
            },
          },
          {
            status: error.statusCode,
            headers: error.code === PlanErrorCode.RATE_LIMIT_EXCEEDED ? {
              "X-RateLimit-Limit": String(error.details?.limit || 0),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": resetsAt.toISOString(),
              "Retry-After": String(Math.ceil((resetsAt.getTime() - Date.now()) / 1000)),
            } : undefined,
          }
        );
      }
      throw error;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Parse and Validate Request Body
    // ─────────────────────────────────────────────────────────────────────────
    let body: SummarizeRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON in request body",
          code: "INVALID_JSON",
        },
        { status: 400 }
      );
    }

    const { paperId, regenerate = false } = body;

    if (!paperId || typeof paperId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: paperId",
          code: "MISSING_PAPER_ID",
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Load Paper from Database
    // ─────────────────────────────────────────────────────────────────────────
    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
      select: {
        id: true,
        title: true,
        abstract: true,
        arxivId: true,
        pdfUrl: true,
        topic: {
          select: {
            name: true,
            keywords: true,
          },
        },
      },
    });

    if (!paper) {
      return NextResponse.json(
        {
          success: false,
          error: "Paper not found",
          code: "PAPER_NOT_FOUND",
          details: { paperId },
        },
        { status: 404 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Always Generate Fresh Summary (No Caching)
    // ─────────────────────────────────────────────────────────────────────────
    // Note: Summaries are generated dynamically per request and not persisted
    // This allows the AI to produce fresh, potentially different responses each time

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Fetch Full PDF Text (if available)
    // ─────────────────────────────────────────────────────────────────────────
    const fullText = await fetchPdfText(paper.pdfUrl);

    // ─────────────────────────────────────────────────────────────────────────
    // 8. Fetch Related Papers for Context (RAG via Vector Search)
    // ─────────────────────────────────────────────────────────────────────────
    let relatedContexts: { title: string; abstract: string }[] = [];

    try {
      // Use vector search to find semantically similar papers
      const similarPapers = await fetchSimilarPapersForRAG({
        paperId: paper.id,
        topK: 3,
      });

      if (similarPapers.length > 0) {
        relatedContexts = similarPapers.map((p) => ({
          title: p.title,
          abstract: p.abstract.slice(0, 500),
        }));
        userLog.debug(`Found similar papers via vector search`, { 
          count: similarPapers.length 
        });
      }
    } catch (vectorError) {
      // Vector search is optional - fall back to topic-based if it fails
      userLog.warn(`Vector search failed, falling back to topic-based`, { 
        error: (vectorError as Error).message 
      });
    }

    // Fallback: If vector search returned nothing, use topic-based retrieval
    if (relatedContexts.length === 0 && paper.topic) {
      const relatedPapers = await prisma.paper.findMany({
        where: {
          topicId: { not: null },
          id: { not: paper.id },
        },
        select: {
          title: true,
          abstract: true,
        },
        take: 2,
        orderBy: { publishedAt: "desc" },
      });

      relatedContexts = relatedPapers.map((p) => ({
        title: p.title,
        abstract: p.abstract.slice(0, 500),
      }));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. Generate Summary using OpenAI
    // ─────────────────────────────────────────────────────────────────────────
    let result;
    try {
      result = await summarizePaperText({
        title: paper.title,
        abstract: paper.abstract,
        fullText,
        relatedContexts: relatedContexts.length > 0 ? relatedContexts : undefined,
      });
    } catch (error) {
      // Handle summarization-specific errors
      if (error instanceof SummarizationError) {
        userLog.error(`Summarization failed`, error, { 
          code: error.code, 
          paperId 
        });
        
        // Capture AI errors
        captureAIError(error, {
          operation: "summarize_paper",
          model: "gemini-pro",
          userId: user.id,
        });

        // Map error codes to HTTP status codes
        const statusCode = error.code.startsWith("OPENAI_429") || error.code === "RATE_LIMITED"
          ? 429
          : error.code.startsWith("OPENAI_") || error.code.startsWith("GEMINI_")
          ? 502
          : 500;

        return NextResponse.json(
          {
            success: false,
            error: "Failed to generate summary",
            code: error.code,
            details: {
              message: error.message,
              retryable: statusCode === 429 || statusCode === 502,
            },
          },
          { status: statusCode }
        );
      }

      throw error; // Re-throw unknown errors
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 10. Skip Database Persistence (Dynamic Generation Only)
    // ─────────────────────────────────────────────────────────────────────────
    // Note: Summaries are NOT saved to the database to allow fresh generation each time
    // This means each request will produce a new, potentially different summary

    // ─────────────────────────────────────────────────────────────────────────
    // 11. Upsert Paper Embedding (async, non-blocking)
    // ─────────────────────────────────────────────────────────────────────────
    // Index the paper for future vector searches
    // This runs in the background and doesn't block the response
    upsertPaperEmbedding({
      paperId: paper.id,
      text: `${paper.title}\n\n${paper.abstract}`,
      metadata: {
        title: paper.title,
        arxivId: paper.arxivId,
        topicId: paper.topic?.name,
      },
    }).catch((err) => {
      // Log but don't fail the request
      userLog.warn(`Failed to upsert paper embedding`, { error: err.message });
    });

    // Log success
    const durationMs = Date.now() - startTime;
    userLog.ai("summarize", {
      paperId: paper.id,
      arxivId: paper.arxivId,
      durationMs,
      tokens: result.usage.totalTokens,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 12. Return Success Response
    // ─────────────────────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        summary: {
          id: `temp-${Date.now()}`, // Temporary ID since not saved to DB
          tldr: result.summary.tldr,
          contributions: result.summary.contributions,
          keywords: result.summary.keywords,
          status: "COMPLETED",
          model: result.model,
          createdAt: new Date().toISOString(),
        },
        paper: {
          id: paper.id,
          title: paper.title,
          arxivId: paper.arxivId,
        },
        usage: {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
        },
        rateLimit: {
          limit: rateLimitInfo.limit,
          remaining: isUnlimited(rateLimitInfo.limit) ? -1 : Math.max(0, rateLimitInfo.remaining - 1), // -1 for this request
          resetsAt: getRateLimitResetTime().toISOString(),
        },
      },
      {
        headers: {
          "X-RateLimit-Limit": String(rateLimitInfo.limit),
          "X-RateLimit-Remaining": String(isUnlimited(rateLimitInfo.limit) ? -1 : Math.max(0, rateLimitInfo.remaining - 1)),
          "X-RateLimit-Reset": getRateLimitResetTime().toISOString(),
        },
      }
    );

  } catch (error) {
    // ─────────────────────────────────────────────────────────────────────────
    // Error Handling
    // ─────────────────────────────────────────────────────────────────────────

    // Handle subscription/auth errors
    if (error instanceof SubscriptionError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.statusCode === 401 ? "UNAUTHORIZED" : "PREMIUM_REQUIRED",
          details: {
            upgradeUrl: "/pricing",
          },
        },
        { status: error.statusCode }
      );
    }

    // Log and capture unexpected errors
    log.error("Unexpected error in summarize API", error as Error);
    captureError(error, {
      service: "api:summarize",
      operation: "summarize_paper",
    });
    
    // Flush Sentry events
    await flush();

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/summarize
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/summarize
 * 
 * Get user's summaries with pagination.
 * 
 * Access: All authenticated users
 * - FREE users: Limited to 5 results
 * - PRO/PLUS users: Up to 100 results
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20, max: 100)
 * 
 * Response (200):
 * ```json
 * {
 *   "success": true,
 *   "summaries": [...],
 *   "pagination": { "page": 1, "pageSize": 20, "total": 42 },
 *   "rateLimit": { "limit": 10, "used": 3, "resetsAt": "..." }
 * }
 * ```
 */
export async function GET(request: NextRequest) {
  try {
    const { user, isProOrPlus, plan } = await checkSubscription();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const requestedPageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    // FREE users limited to 5, PRO/PLUS up to 100
    const maxPageSize = isProOrPlus ? 100 : 5;
    const pageSize = Math.min(Math.max(1, requestedPageSize), maxPageSize);

    // Get total count
    const total = await prisma.summary.count({
      where: { userId: user.id },
    });

    // Get summaries with pagination
    const summaries = await prisma.summary.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            arxivId: true,
            publishedAt: true,
          },
        },
      },
    });

    // Get rate limit info using the new plan system
    const limits = getPlanLimits(plan);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const usedToday = await prisma.summary.count({
      where: { userId: user.id, createdAt: { gte: todayStart } },
    });

    // Transform summaries
    const transformedSummaries = summaries.map((s) => {
      const parsed = parseSummaryContent(s.content);
      return {
        id: s.id,
        tldr: parsed?.tldr ?? s.content,
        contributions: parsed?.contributions ?? [],
        keywords: parsed?.keywords ?? [],
        status: s.status,
        model: s.model,
        createdAt: s.createdAt.toISOString(),
        paper: s.paper,
      };
    });

    return NextResponse.json({
      success: true,
      summaries: transformedSummaries,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      },
      rateLimit: {
        limit: limits.dailySummaries,
        used: usedToday,
        remaining: isUnlimited(limits.dailySummaries) ? -1 : Math.max(0, limits.dailySummaries - usedToday),
        resetsAt: getRateLimitResetTime().toISOString(),
      },
      isPremium: isProOrPlus,
    });

  } catch (error) {
    console.error("[GET /api/summarize] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch summaries",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
