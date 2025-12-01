// src/app/api/summarize/route.ts
// Premium API route for paper summarization
// Returns 403 for FREE users, includes daily rate limiting

import { NextRequest, NextResponse } from "next/server";
import { checkSubscription, SubscriptionError, requireAuth } from "@/lib/checkSubscription";
import prisma from "@/lib/prisma";
import {
  summarizePaperText,
  SummarizationError,
  type PaperSummary,
} from "@/lib/openai";
import { fetchSimilarPapersForRAG, upsertPaperEmbedding } from "@/lib/vector";
import type { Plan } from "@/generated/prisma/client";

export const runtime = "nodejs"; // Required for Prisma

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limit Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Daily summarization limits by plan
 * 
 * Strategy: Count summaries created by user in the last 24 hours
 * Simple and effective for MVP, can be upgraded to Redis later
 */
const DAILY_LIMITS: Record<Plan, number> = {
  FREE: 0,    // No access
  PRO: 10,    // 10 summaries per day
  PLUS: 50,   // 50 summaries per day
};

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
 * Get the start of the current rate limit window (24 hours ago)
 */
function getRateLimitWindowStart(): Date {
  const now = new Date();
  return new Date(now.getTime() - 24 * 60 * 60 * 1000);
}

/**
 * Get when the rate limit resets (24 hours from oldest summary in window)
 */
function getRateLimitResetTime(): Date {
  const now = new Date();
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Check user's daily rate limit
 */
async function checkRateLimit(
  userId: string,
  plan: Plan
): Promise<{ allowed: boolean; used: number; limit: number; resetsAt: Date }> {
  const limit = DAILY_LIMITS[plan];
  const windowStart = getRateLimitWindowStart();

  // Count summaries created in the last 24 hours
  const used = await prisma.summary.count({
    where: {
      userId,
      createdAt: { gte: windowStart },
    },
  });

  return {
    allowed: used < limit,
    used,
    limit,
    resetsAt: getRateLimitResetTime(),
  };
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
  
  console.log(`[summarize] PDF extraction not implemented for: ${pdfUrl}`);
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
  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Authentication
    // ─────────────────────────────────────────────────────────────────────────
    const { user, plan } = await requireAuth();

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Plan Check (FREE blocked)
    // ─────────────────────────────────────────────────────────────────────────
    if (plan === "FREE") {
      return NextResponse.json(
        {
          success: false,
          error: "Summarization requires a PRO or PLUS subscription",
          code: "PREMIUM_REQUIRED",
          details: {
            currentPlan: plan,
            upgradeUrl: "/pricing",
          },
        },
        { status: 403 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Rate Limit Check
    // ─────────────────────────────────────────────────────────────────────────
    const rateLimit = await checkRateLimit(user.id, plan);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Daily summarization limit reached (${rateLimit.limit} per day)`,
          code: "RATE_LIMIT_EXCEEDED",
          details: {
            limit: rateLimit.limit,
            used: rateLimit.used,
            resetsAt: rateLimit.resetsAt.toISOString(),
            plan,
          },
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetsAt.toISOString(),
            "Retry-After": String(Math.ceil((rateLimit.resetsAt.getTime() - Date.now()) / 1000)),
          },
        }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Parse and Validate Request Body
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
    // 6. Check for Existing Summary (unless regenerate=true)
    // ─────────────────────────────────────────────────────────────────────────
    if (!regenerate) {
      const existingSummary = await prisma.summary.findFirst({
        where: {
          paperId: paper.id,
          userId: user.id,
          status: "COMPLETED",
        },
        orderBy: { createdAt: "desc" },
      });

      if (existingSummary) {
        const parsed = parseSummaryContent(existingSummary.content);
        
        // Return existing summary without counting against rate limit
        return NextResponse.json({
          success: true,
          summary: {
            id: existingSummary.id,
            tldr: parsed?.tldr ?? existingSummary.content,
            contributions: parsed?.contributions ?? [],
            keywords: parsed?.keywords ?? [],
            status: existingSummary.status,
            model: existingSummary.model,
            createdAt: existingSummary.createdAt.toISOString(),
          },
          paper: {
            id: paper.id,
            title: paper.title,
            arxivId: paper.arxivId,
          },
          usage: {
            promptTokens: existingSummary.promptTokens,
            completionTokens: existingSummary.completionTokens,
            totalTokens: existingSummary.promptTokens + existingSummary.completionTokens,
          },
          rateLimit: {
            limit: rateLimit.limit,
            remaining: rateLimit.limit - rateLimit.used,
            resetsAt: rateLimit.resetsAt.toISOString(),
          },
        });
      }
    }

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
        console.log(
          `[summarize] Found ${similarPapers.length} similar papers via vector search`
        );
      }
    } catch (vectorError) {
      // Vector search is optional - fall back to topic-based if it fails
      console.warn("[summarize] Vector search failed, falling back to topic-based:", vectorError);
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
        console.error(`[summarize] SummarizationError: ${error.code}`, error.message);

        // Map error codes to HTTP status codes
        const statusCode = error.code.startsWith("OPENAI_429")
          ? 429
          : error.code.startsWith("OPENAI_")
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
    // 10. Save Summary to Database
    // ─────────────────────────────────────────────────────────────────────────
    const summaryRecord = await prisma.summary.create({
      data: {
        content: formatSummaryContent(result.summary),
        status: "COMPLETED",
        model: result.model,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        paperId: paper.id,
        userId: user.id,
      },
    });

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
      console.error("[summarize] Failed to upsert paper embedding:", err);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 12. Return Success Response
    // ─────────────────────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        summary: {
          id: summaryRecord.id,
          tldr: result.summary.tldr,
          contributions: result.summary.contributions,
          keywords: result.summary.keywords,
          status: summaryRecord.status,
          model: summaryRecord.model,
          createdAt: summaryRecord.createdAt.toISOString(),
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
          limit: rateLimit.limit,
          remaining: rateLimit.limit - rateLimit.used - 1, // -1 for this request
          resetsAt: rateLimit.resetsAt.toISOString(),
        },
      },
      {
        headers: {
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.limit - rateLimit.used - 1),
          "X-RateLimit-Reset": rateLimit.resetsAt.toISOString(),
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

    // Log and return generic error
    console.error("[POST /api/summarize] Unexpected error:", error);

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

    // Get rate limit info
    const rateLimit = await checkRateLimit(user.id, plan!);

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
        limit: rateLimit.limit,
        used: rateLimit.used,
        remaining: Math.max(0, rateLimit.limit - rateLimit.used),
        resetsAt: rateLimit.resetsAt.toISOString(),
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
