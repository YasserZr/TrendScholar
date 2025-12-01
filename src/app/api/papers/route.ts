// src/app/api/papers/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PaperListItem {
  id: string;
  arxivId: string;
  title: string;
  abstract: string;
  authors: string[];
  pdfUrl: string | null;
  publishedAt: string;
  createdAt: string;
  topic: {
    id: string;
    name: string;
    slug: string;
  } | null;
  summaryPreview: string | null;
  hasSummary: boolean;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    q: string | null;
    topicId: string | null;
    category: string | null;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const SUMMARY_PREVIEW_LENGTH = 200;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/papers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/papers
 * 
 * List and search papers with pagination.
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20, max: 100)
 * - q: Search query (searches title, abstract, authors via ILIKE)
 * - topicId: Filter by topic ID
 * - category: Filter by arXiv category prefix (e.g., "cs", "math")
 * 
 * Response:
 * ```json
 * {
 *   "success": true,
 *   "data": [...papers],
 *   "pagination": { "page": 1, "pageSize": 20, "total": 100, ... },
 *   "filters": { "q": "transformer", "topicId": null, "category": null }
 * }
 * ```
 * 
 * Search Strategy:
 * - Uses PostgreSQL ILIKE for case-insensitive partial matching
 * - Searches across title, abstract, and authors array
 * - For better performance on large datasets, consider:
 *   1. PostgreSQL full-text search (tsvector/tsquery)
 *   2. External search service (Elasticsearch, Meilisearch)
 *   3. Vector similarity search via Qdrant/Pinecone
 */
export async function GET(
  req: NextRequest
): Promise<NextResponse<PaginatedResponse<PaperListItem> | { success: false; error: string; code: string }>> {
  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Parse and validate query parameters
    // ─────────────────────────────────────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    
    // Pagination
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");
    
    let page = pageParam ? parseInt(pageParam, 10) : DEFAULT_PAGE;
    let pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : DEFAULT_PAGE_SIZE;
    
    // Validate pagination values
    if (isNaN(page) || page < 1) page = DEFAULT_PAGE;
    if (isNaN(pageSize) || pageSize < 1) pageSize = DEFAULT_PAGE_SIZE;
    if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;
    
    // Filters
    const q = searchParams.get("q")?.trim() || null;
    const topicId = searchParams.get("topicId") || null;
    const category = searchParams.get("category")?.toLowerCase() || null;

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Build Prisma where clause
    // ─────────────────────────────────────────────────────────────────────────
    const where: Prisma.PaperWhereInput = {};
    const AND: Prisma.PaperWhereInput[] = [];

    // Search filter (ILIKE across multiple fields)
    if (q) {
      // For PostgreSQL, use case-insensitive contains
      // This translates to ILIKE '%q%' for each field
      AND.push({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { abstract: { contains: q, mode: "insensitive" } },
          // For array fields, we use hasSome with a workaround
          // or search if any author name contains the query
          { authors: { hasSome: [q] } },
        ],
      });
    }

    // Topic filter
    if (topicId) {
      AND.push({ topicId });
    }

    // Category filter (arXiv category prefix in arxivId)
    // arXiv IDs format: category.YYMMNNN (e.g., cs.AI/2301.00001)
    if (category) {
      AND.push({
        arxivId: { startsWith: category, mode: "insensitive" },
      });
    }

    if (AND.length > 0) {
      where.AND = AND;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Execute queries (count + data) in parallel
    // ─────────────────────────────────────────────────────────────────────────
    const skip = (page - 1) * pageSize;

    const [total, papers] = await Promise.all([
      // Count query
      prisma.paper.count({ where }),
      
      // Data query with includes
      prisma.paper.findMany({
        where,
        include: {
          topic: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          summaries: {
            select: {
              id: true,
              content: true,
              status: true,
            },
            where: {
              status: "COMPLETED",
            },
            take: 1,
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: {
          publishedAt: "desc",
        },
        skip,
        take: pageSize,
      }),
    ]);

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Transform data for response
    // ─────────────────────────────────────────────────────────────────────────
    const totalPages = Math.ceil(total / pageSize);

    const data: PaperListItem[] = papers.map((paper) => {
      const latestSummary = paper.summaries[0];
      
      return {
        id: paper.id,
        arxivId: paper.arxivId,
        title: paper.title,
        abstract: paper.abstract,
        authors: paper.authors,
        pdfUrl: paper.pdfUrl,
        publishedAt: paper.publishedAt.toISOString(),
        createdAt: paper.createdAt.toISOString(),
        topic: paper.topic,
        summaryPreview: latestSummary
          ? truncateText(latestSummary.content, SUMMARY_PREVIEW_LENGTH)
          : null,
        hasSummary: !!latestSummary,
      };
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Return paginated response
    // ─────────────────────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      filters: {
        q,
        topicId,
        category,
      },
    });

  } catch (error) {
    console.error("[GET /api/papers] Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch papers",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Truncate text to a maximum length, preserving word boundaries.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  // Find the last space before maxLength
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + "...";
  }
  
  return truncated + "...";
}
