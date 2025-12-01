// src/app/api/cron/summarizer/route.ts
// SummarizerAgent: Background job to summarize newly collected papers
// Runs via Vercel Cron to process papers without summaries

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  summarizePaperText,
  SummarizationError,
  type PaperSummary,
} from "@/lib/openai";
import { fetchSimilarPapersForRAG } from "@/lib/vector";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max for Vercel Pro

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Summarizer configuration
 * 
 * Batch Strategy:
 * - Process papers in small batches to stay within serverless limits
 * - Each summarization takes ~3-5 seconds (OpenAI API call)
 * - With 5 min limit and 4 sec avg: max ~75 papers per run
 * - Use conservative batch size to leave room for retries and overhead
 */
const SUMMARIZER_CONFIG = {
  // Number of papers to process per run
  batchSize: 20,
  
  // Delay between papers (ms) to avoid rate limits
  delayBetweenPapersMs: 1000,
  
  // Re-summarize papers older than this (days)
  // Set to 0 to never re-summarize
  resummaryThresholdDays: 0,
  
  // Maximum retries for failed summaries
  maxRetries: 2,
  
  // Delay between retries (ms)
  retryDelayMs: 2000,
  
  // Use system user ID for auto-generated summaries
  systemUserId: "system",
  
  // Priority: newer papers first (true) or older papers first (false)
  prioritizeRecent: true,
  
  // Skip papers with very short abstracts
  minAbstractLength: 100,
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SummarizerResult {
  success: boolean;
  stats: {
    papersProcessed: number;
    summariesCreated: number;
    summariesFailed: number;
    papersSkipped: number;
    errors: Array<{
      paperId: string;
      arxivId: string;
      error: string;
      code?: string;
    }>;
  };
  duration: number;
}

interface PaperToSummarize {
  id: string;
  arxivId: string;
  title: string;
  abstract: string;
  topicId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sleep for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Validate cron secret token
 */
function validateCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.warn("[summarizer] CRON_SECRET not configured");
    return false;
  }

  // Check Authorization header (Vercel Cron uses this)
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Also check x-cron-secret header (alternative)
  const secretHeader = request.headers.get("x-cron-secret");
  if (secretHeader === cronSecret) {
    return true;
  }

  return false;
}

/**
 * Format PaperSummary into storable content string
 */
function formatSummaryContent(summary: PaperSummary): string {
  return JSON.stringify(summary);
}

/**
 * Get or create a system user for auto-generated summaries
 */
async function getSystemUserId(): Promise<string> {
  // Try to find existing system user
  let systemUser = await prisma.user.findFirst({
    where: { email: "system@trendscholar.ai" },
    select: { id: true },
  });

  if (!systemUser) {
    // Create system user
    systemUser = await prisma.user.create({
      data: {
        email: "system@trendscholar.ai",
        name: "TrendScholar System",
        plan: "PLUS", // System has full access
      },
      select: { id: true },
    });
    console.log("[summarizer] Created system user:", systemUser.id);
  }

  return systemUser.id;
}

/**
 * Find papers that need summarization
 */
async function findPapersToSummarize(
  limit: number,
  systemUserId: string
): Promise<PaperToSummarize[]> {
  // Find papers without completed summaries from system user
  const papers = await prisma.paper.findMany({
    where: {
      // Paper must have a reasonable abstract
      abstract: {
        not: "",
      },
      // No existing completed summary from system user
      summaries: {
        none: {
          userId: systemUserId,
          status: "COMPLETED",
        },
      },
    },
    select: {
      id: true,
      arxivId: true,
      title: true,
      abstract: true,
      topicId: true,
    },
    orderBy: SUMMARIZER_CONFIG.prioritizeRecent
      ? { publishedAt: "desc" }
      : { publishedAt: "asc" },
    take: limit,
  });

  // Filter out papers with very short abstracts
  return papers.filter(
    (p) => p.abstract.length >= SUMMARIZER_CONFIG.minAbstractLength
  );
}

/**
 * Summarize a single paper with retry logic
 */
async function summarizePaperWithRetry(
  paper: PaperToSummarize,
  systemUserId: string,
  retryCount: number = 0
): Promise<{ success: boolean; error?: string; code?: string }> {
  try {
    // Fetch related papers for RAG context (optional, graceful failure)
    let relatedContexts: { title: string; abstract: string }[] = [];
    
    try {
      const similarPapers = await fetchSimilarPapersForRAG({
        paperId: paper.id,
        topK: 3,
      });
      
      if (similarPapers.length > 0) {
        relatedContexts = similarPapers.map((p) => ({
          title: p.title,
          abstract: p.abstract.slice(0, 500),
        }));
      }
    } catch (ragError) {
      // RAG is optional, continue without it
      console.warn(`[summarizer] RAG context failed for ${paper.arxivId}:`, ragError);
    }

    // Generate summary
    const result = await summarizePaperText({
      title: paper.title,
      abstract: paper.abstract,
      relatedContexts: relatedContexts.length > 0 ? relatedContexts : undefined,
    });

    // Save to database
    await prisma.summary.create({
      data: {
        content: formatSummaryContent(result.summary),
        status: "COMPLETED",
        model: result.model,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        paperId: paper.id,
        userId: systemUserId,
      },
    });

    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = error instanceof SummarizationError ? error.code : "UNKNOWN";

    // Log error
    console.error(
      `[summarizer] Failed to summarize ${paper.arxivId} (attempt ${retryCount + 1}):`,
      errorMessage
    );

    // TODO: Send to Sentry for production monitoring
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureException(error, {
    //     tags: { paperId: paper.id, arxivId: paper.arxivId },
    //     extra: { retryCount },
    //   });
    // }

    // Retry on transient errors
    const isRetryable =
      errorCode.startsWith("OPENAI_429") || // Rate limit
      errorCode.startsWith("OPENAI_5") ||   // Server error
      errorCode === "UNKNOWN";

    if (isRetryable && retryCount < SUMMARIZER_CONFIG.maxRetries) {
      console.log(`[summarizer] Retrying ${paper.arxivId} in ${SUMMARIZER_CONFIG.retryDelayMs}ms...`);
      await sleep(SUMMARIZER_CONFIG.retryDelayMs);
      return summarizePaperWithRetry(paper, systemUserId, retryCount + 1);
    }

    // Create failed summary record for tracking
    try {
      await prisma.summary.create({
        data: {
          content: JSON.stringify({ error: errorMessage, code: errorCode }),
          status: "FAILED",
          model: "gpt-4o-mini",
          paperId: paper.id,
          userId: systemUserId,
        },
      });
    } catch (dbError) {
      console.error(`[summarizer] Failed to record error for ${paper.arxivId}:`, dbError);
    }

    return { success: false, error: errorMessage, code: errorCode };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cron/summarizer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/cron/summarizer
 * 
 * SummarizerAgent: Processes papers without summaries in batches.
 * 
 * Security:
 * - Requires valid CRON_SECRET in Authorization header
 * - Intended to be called by Vercel Cron
 * 
 * Batch Strategy:
 * - Processes up to 20 papers per run
 * - 1 second delay between papers to avoid rate limits
 * - Retries failed summaries up to 2 times
 * - Prioritizes recently published papers
 * 
 * Response (200):
 * ```json
 * {
 *   "success": true,
 *   "stats": {
 *     "papersProcessed": 20,
 *     "summariesCreated": 18,
 *     "summariesFailed": 2,
 *     "papersSkipped": 0,
 *     "errors": [
 *       { "paperId": "...", "arxivId": "2311.00001", "error": "...", "code": "..." }
 *     ]
 *   },
 *   "duration": 85230
 * }
 * ```
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<SummarizerResult>> {
  const startTime = Date.now();

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Validate Secret Token
  // ─────────────────────────────────────────────────────────────────────────
  if (!validateCronSecret(request)) {
    console.error("[summarizer] Unauthorized request");

    // TODO: Alert on unauthorized attempts
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureMessage("Unauthorized summarizer cron attempt", "warning");
    // }

    return NextResponse.json(
      {
        success: false,
        stats: {
          papersProcessed: 0,
          summariesCreated: 0,
          summariesFailed: 0,
          papersSkipped: 0,
          errors: [
            {
              paperId: "",
              arxivId: "",
              error: "Unauthorized: Invalid or missing CRON_SECRET",
              code: "UNAUTHORIZED",
            },
          ],
        },
        duration: Date.now() - startTime,
      },
      { status: 401 }
    );
  }

  console.log("[summarizer] Starting summarization run");

  const stats = {
    papersProcessed: 0,
    summariesCreated: 0,
    summariesFailed: 0,
    papersSkipped: 0,
    errors: [] as Array<{
      paperId: string;
      arxivId: string;
      error: string;
      code?: string;
    }>,
  };

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 2. Get System User ID
    // ─────────────────────────────────────────────────────────────────────────
    const systemUserId = await getSystemUserId();

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Find Papers to Summarize
    // ─────────────────────────────────────────────────────────────────────────
    const papers = await findPapersToSummarize(
      SUMMARIZER_CONFIG.batchSize,
      systemUserId
    );

    console.log(`[summarizer] Found ${papers.length} papers to summarize`);

    if (papers.length === 0) {
      console.log("[summarizer] No papers need summarization");
      return NextResponse.json({
        success: true,
        stats,
        duration: Date.now() - startTime,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Process Papers Sequentially
    // ─────────────────────────────────────────────────────────────────────────
    // Sequential processing to respect OpenAI rate limits and stay within
    // serverless function timeout. Parallel processing could be faster but
    // risks hitting rate limits and makes error handling more complex.
    
    for (const paper of papers) {
      // Check remaining time (leave 30s buffer)
      const elapsedMs = Date.now() - startTime;
      const remainingMs = (maxDuration * 1000) - elapsedMs - 30000;
      
      if (remainingMs < 10000) {
        console.log("[summarizer] Approaching timeout, stopping early");
        break;
      }

      stats.papersProcessed++;

      // Skip papers with very short abstracts
      if (paper.abstract.length < SUMMARIZER_CONFIG.minAbstractLength) {
        console.log(`[summarizer] Skipping ${paper.arxivId}: abstract too short`);
        stats.papersSkipped++;
        continue;
      }

      console.log(
        `[summarizer] Processing ${stats.papersProcessed}/${papers.length}: ${paper.arxivId}`
      );

      const result = await summarizePaperWithRetry(paper, systemUserId);

      if (result.success) {
        stats.summariesCreated++;
        console.log(`[summarizer] ✓ Summarized ${paper.arxivId}`);
      } else {
        stats.summariesFailed++;
        stats.errors.push({
          paperId: paper.id,
          arxivId: paper.arxivId,
          error: result.error || "Unknown error",
          code: result.code,
        });
        console.log(`[summarizer] ✗ Failed ${paper.arxivId}: ${result.error}`);
      }

      // Delay between papers (except for the last one)
      if (stats.papersProcessed < papers.length) {
        await sleep(SUMMARIZER_CONFIG.delayBetweenPapersMs);
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[summarizer] Fatal error:", errorMessage);

    // TODO: Send to Sentry
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureException(error);
    // }

    stats.errors.push({
      paperId: "",
      arxivId: "",
      error: `Fatal error: ${errorMessage}`,
      code: "FATAL",
    });
  }

  const duration = Date.now() - startTime;

  console.log(`[summarizer] Completed in ${duration}ms:`, {
    papersProcessed: stats.papersProcessed,
    summariesCreated: stats.summariesCreated,
    summariesFailed: stats.summariesFailed,
    papersSkipped: stats.papersSkipped,
  });

  // TODO: Send metrics to monitoring
  // if (process.env.DATADOG_API_KEY) {
  //   statsd.gauge("summarizer.papers_processed", stats.papersProcessed);
  //   statsd.gauge("summarizer.summaries_created", stats.summariesCreated);
  //   statsd.gauge("summarizer.duration_ms", duration);
  // }

  return NextResponse.json({
    success: stats.summariesFailed === 0,
    stats,
    duration,
  });
}
