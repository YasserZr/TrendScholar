// src/app/api/cron/collector/route.ts
// CollectorAgent: Fetches new papers from ArXiv daily via Vercel Cron
// Validates secret header token for security

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { upsertPaperEmbedding } from "@/lib/vector";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max for Vercel Pro

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ArXiv category configuration
 * Maps our topic slugs to ArXiv category codes
 * See: https://arxiv.org/category_taxonomy
 */
const ARXIV_CATEGORIES: Record<string, { arxivCode: string; name: string }> = {
  "machine-learning": { arxivCode: "cs.LG", name: "Machine Learning" },
  "artificial-intelligence": { arxivCode: "cs.AI", name: "Artificial Intelligence" },
  "computer-vision": { arxivCode: "cs.CV", name: "Computer Vision" },
  "nlp": { arxivCode: "cs.CL", name: "Computation and Language" },
  "robotics": { arxivCode: "cs.RO", name: "Robotics" },
  "neural-networks": { arxivCode: "cs.NE", name: "Neural and Evolutionary Computing" },
  "information-retrieval": { arxivCode: "cs.IR", name: "Information Retrieval" },
  "cryptography": { arxivCode: "cs.CR", name: "Cryptography and Security" },
};

/**
 * Collector configuration
 */
const COLLECTOR_CONFIG = {
  // Maximum papers to fetch per category per run
  maxPapersPerCategory: 50,
  // Maximum total papers per run (to stay within limits)
  maxTotalPapers: 200,
  // ArXiv API rate limit: 1 request per 3 seconds
  rateLimitDelayMs: 3000,
  // Days to look back for new papers
  daysToLookBack: 2,
  // Whether to generate embeddings (can be slow)
  generateEmbeddings: true,
  // Batch size for embedding generation
  embeddingBatchSize: 10,
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ArxivEntry {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  updated: string;
  pdfUrl: string | null;
  categories: string[];
}

interface CollectorResult {
  success: boolean;
  stats: {
    categoriesProcessed: number;
    papersFound: number;
    papersInserted: number;
    papersUpdated: number;
    papersSkipped: number;
    embeddingsGenerated: number;
    errors: string[];
  };
  duration: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ArXiv API Client
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse ArXiv Atom feed XML into structured entries
 */
function parseArxivXml(xml: string): ArxivEntry[] {
  const entries: ArxivEntry[] = [];
  
  // Simple regex-based parsing (more robust: use xml2js or fast-xml-parser)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[1];

    // Extract ID (arxiv ID from URL)
    const idMatch = entryXml.match(/<id>http:\/\/arxiv\.org\/abs\/([^<]+)<\/id>/);
    const id = idMatch ? idMatch[1].replace(/v\d+$/, "") : null; // Remove version

    // Extract title
    const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/);
    const title = titleMatch
      ? titleMatch[1].replace(/\s+/g, " ").trim()
      : "Untitled";

    // Extract summary (abstract)
    const summaryMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/);
    const summary = summaryMatch
      ? summaryMatch[1].replace(/\s+/g, " ").trim()
      : "";

    // Extract authors
    const authorRegex = /<author>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/author>/g;
    const authors: string[] = [];
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entryXml)) !== null) {
      authors.push(authorMatch[1].trim());
    }

    // Extract published date
    const publishedMatch = entryXml.match(/<published>([^<]+)<\/published>/);
    const published = publishedMatch ? publishedMatch[1] : "";

    // Extract updated date
    const updatedMatch = entryXml.match(/<updated>([^<]+)<\/updated>/);
    const updated = updatedMatch ? updatedMatch[1] : "";

    // Extract PDF URL
    const pdfMatch = entryXml.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/);
    const pdfUrl = pdfMatch ? pdfMatch[1] : null;

    // Extract categories
    const categoryRegex = /<category[^>]*term="([^"]+)"/g;
    const categories: string[] = [];
    let catMatch;
    while ((catMatch = categoryRegex.exec(entryXml)) !== null) {
      categories.push(catMatch[1]);
    }

    if (id) {
      entries.push({
        id,
        title,
        summary,
        authors,
        published,
        updated,
        pdfUrl,
        categories,
      });
    }
  }

  return entries;
}

/**
 * Fetch papers from ArXiv API for a specific category
 * 
 * ArXiv API docs: https://info.arxiv.org/help/api/user-manual.html
 */
async function fetchArxivPapers(
  categoryCode: string,
  maxResults: number = 50,
  daysBack: number = 2
): Promise<ArxivEntry[]> {
  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  // Format dates for ArXiv (YYYYMMDD)
  const formatDate = (d: Date) =>
    d.toISOString().split("T")[0].replace(/-/g, "");

  // Build query
  // Search for papers in category, sorted by submission date
  const query = `cat:${categoryCode}`;
  
  const params = new URLSearchParams({
    search_query: query,
    start: "0",
    max_results: String(maxResults),
    sortBy: "submittedDate",
    sortOrder: "descending",
  });

  const url = `http://export.arxiv.org/api/query?${params}`;

  console.log(`[collector] Fetching ArXiv: ${categoryCode} (max ${maxResults})`);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "TrendScholar/1.0 (academic paper aggregator)",
    },
  });

  if (!response.ok) {
    throw new Error(`ArXiv API error: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const entries = parseArxivXml(xml);

  // Filter by date (ArXiv API doesn't support date range well)
  const filteredEntries = entries.filter((entry) => {
    const publishedDate = new Date(entry.published);
    return publishedDate >= startDate && publishedDate <= endDate;
  });

  console.log(
    `[collector] Found ${entries.length} papers, ${filteredEntries.length} within date range`
  );

  return filteredEntries;
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensure topics exist in database
 */
async function ensureTopics(): Promise<Map<string, string>> {
  const topicMap = new Map<string, string>();

  for (const [slug, config] of Object.entries(ARXIV_CATEGORIES)) {
    const topic = await prisma.topic.upsert({
      where: { slug },
      update: {},
      create: {
        name: config.name,
        slug,
        description: `Papers from ArXiv category ${config.arxivCode}`,
        keywords: [config.arxivCode],
      },
    });
    topicMap.set(config.arxivCode, topic.id);
  }

  return topicMap;
}

/**
 * Upsert a paper into the database
 */
async function upsertPaper(
  entry: ArxivEntry,
  topicId: string | null
): Promise<{ action: "inserted" | "updated" | "skipped"; paperId: string }> {
  // Check if paper already exists
  const existing = await prisma.paper.findUnique({
    where: { arxivId: entry.id },
    select: { id: true, updatedAt: true },
  });

  if (existing) {
    // Check if we need to update (paper was updated on ArXiv)
    const entryUpdated = new Date(entry.updated);
    if (entryUpdated > existing.updatedAt) {
      await prisma.paper.update({
        where: { id: existing.id },
        data: {
          title: entry.title,
          abstract: entry.summary,
          authors: entry.authors,
          pdfUrl: entry.pdfUrl,
          topicId,
        },
      });
      return { action: "updated", paperId: existing.id };
    }
    return { action: "skipped", paperId: existing.id };
  }

  // Insert new paper
  const paper = await prisma.paper.create({
    data: {
      arxivId: entry.id,
      title: entry.title,
      abstract: entry.summary,
      authors: entry.authors,
      pdfUrl: entry.pdfUrl,
      publishedAt: new Date(entry.published),
      topicId,
    },
  });

  return { action: "inserted", paperId: paper.id };
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
    console.warn("[collector] CRON_SECRET not configured");
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cron/collector
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/cron/collector
 * 
 * CollectorAgent: Fetches new papers from ArXiv and upserts them into the database.
 * 
 * Security:
 * - Requires valid CRON_SECRET in Authorization header
 * - Intended to be called by Vercel Cron
 * 
 * Response (200):
 * ```json
 * {
 *   "success": true,
 *   "stats": {
 *     "categoriesProcessed": 8,
 *     "papersFound": 156,
 *     "papersInserted": 142,
 *     "papersUpdated": 5,
 *     "papersSkipped": 9,
 *     "embeddingsGenerated": 142,
 *     "errors": []
 *   },
 *   "duration": 45230
 * }
 * ```
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<CollectorResult>> {
  const startTime = Date.now();

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Validate Secret Token
  // ─────────────────────────────────────────────────────────────────────────
  if (!validateCronSecret(request)) {
    console.error("[collector] Unauthorized request");
    return NextResponse.json(
      {
        success: false,
        stats: {
          categoriesProcessed: 0,
          papersFound: 0,
          papersInserted: 0,
          papersUpdated: 0,
          papersSkipped: 0,
          embeddingsGenerated: 0,
          errors: ["Unauthorized: Invalid or missing CRON_SECRET"],
        },
        duration: Date.now() - startTime,
      },
      { status: 401 }
    );
  }

  console.log("[collector] Starting paper collection run");

  const stats = {
    categoriesProcessed: 0,
    papersFound: 0,
    papersInserted: 0,
    papersUpdated: 0,
    papersSkipped: 0,
    embeddingsGenerated: 0,
    errors: [] as string[],
  };

  const papersToEmbed: { paperId: string; title: string; abstract: string }[] = [];

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 2. Ensure Topics Exist
    // ─────────────────────────────────────────────────────────────────────────
    const topicMap = await ensureTopics();

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Fetch Papers from Each Category
    // ─────────────────────────────────────────────────────────────────────────
    for (const [slug, config] of Object.entries(ARXIV_CATEGORIES)) {
      // Check if we've hit the total limit
      if (stats.papersFound >= COLLECTOR_CONFIG.maxTotalPapers) {
        console.log("[collector] Reached total paper limit, stopping");
        break;
      }

      try {
        // Rate limiting: wait before each request
        if (stats.categoriesProcessed > 0) {
          await sleep(COLLECTOR_CONFIG.rateLimitDelayMs);
        }

        const entries = await fetchArxivPapers(
          config.arxivCode,
          COLLECTOR_CONFIG.maxPapersPerCategory,
          COLLECTOR_CONFIG.daysToLookBack
        );

        stats.papersFound += entries.length;
        const topicId = topicMap.get(config.arxivCode) || null;

        // Process each paper
        for (const entry of entries) {
          try {
            const result = await upsertPaper(entry, topicId);

            switch (result.action) {
              case "inserted":
                stats.papersInserted++;
                // Queue for embedding
                papersToEmbed.push({
                  paperId: result.paperId,
                  title: entry.title,
                  abstract: entry.summary,
                });
                break;
              case "updated":
                stats.papersUpdated++;
                // Re-queue for embedding on update
                papersToEmbed.push({
                  paperId: result.paperId,
                  title: entry.title,
                  abstract: entry.summary,
                });
                break;
              case "skipped":
                stats.papersSkipped++;
                break;
            }
          } catch (paperError) {
            const errorMsg = `Failed to upsert paper ${entry.id}: ${paperError}`;
            console.error(`[collector] ${errorMsg}`);
            stats.errors.push(errorMsg);
          }
        }

        stats.categoriesProcessed++;
      } catch (categoryError) {
        const errorMsg = `Failed to fetch category ${config.arxivCode}: ${categoryError}`;
        console.error(`[collector] ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Generate Embeddings (in batches)
    // ─────────────────────────────────────────────────────────────────────────
    if (COLLECTOR_CONFIG.generateEmbeddings && papersToEmbed.length > 0) {
      console.log(`[collector] Generating embeddings for ${papersToEmbed.length} papers`);

      for (let i = 0; i < papersToEmbed.length; i += COLLECTOR_CONFIG.embeddingBatchSize) {
        const batch = papersToEmbed.slice(i, i + COLLECTOR_CONFIG.embeddingBatchSize);

        await Promise.all(
          batch.map(async (paper) => {
            try {
              await upsertPaperEmbedding({
                paperId: paper.paperId,
                text: `${paper.title}\n\n${paper.abstract}`,
                metadata: { title: paper.title },
              });
              stats.embeddingsGenerated++;
            } catch (embeddingError) {
              console.error(
                `[collector] Failed to embed paper ${paper.paperId}:`,
                embeddingError
              );
              // Don't add to errors array - embeddings are optional
            }
          })
        );

        // Small delay between batches
        if (i + COLLECTOR_CONFIG.embeddingBatchSize < papersToEmbed.length) {
          await sleep(500);
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Update Topic Trend Data
    // ─────────────────────────────────────────────────────────────────────────
    await updateTopicTrends();

  } catch (error) {
    const errorMsg = `Collector error: ${error}`;
    console.error(`[collector] ${errorMsg}`);
    stats.errors.push(errorMsg);
  }

  const duration = Date.now() - startTime;

  console.log(`[collector] Completed in ${duration}ms:`, {
    categoriesProcessed: stats.categoriesProcessed,
    papersInserted: stats.papersInserted,
    papersUpdated: stats.papersUpdated,
    embeddingsGenerated: stats.embeddingsGenerated,
  });

  return NextResponse.json({
    success: stats.errors.length === 0,
    stats,
    duration,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Trend Data Updates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update trend data for all topics
 * Calculates monthly paper counts for the last 12 months
 */
async function updateTopicTrends(): Promise<void> {
  console.log("[collector] Updating topic trends");

  const topics = await prisma.topic.findMany({
    select: { id: true },
  });

  for (const topic of topics) {
    try {
      // Get monthly counts for the last 12 months
      const trendData = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT 
          TO_CHAR("publishedAt", 'YYYY-MM') as date,
          COUNT(*)::bigint as count
        FROM "Paper"
        WHERE "topicId" = ${topic.id}
          AND "publishedAt" >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR("publishedAt", 'YYYY-MM')
        ORDER BY date ASC
      `;

      // Convert to JSON-safe format
      const trendJson = trendData.map((row) => ({
        date: row.date,
        count: Number(row.count),
      }));

      await prisma.topic.update({
        where: { id: topic.id },
        data: { trendData: trendJson },
      });
    } catch (error) {
      console.error(`[collector] Failed to update trends for topic ${topic.id}:`, error);
    }
  }
}
