// src/app/api/topics/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trend data point for charting topic popularity over time.
 * 
 * Structure:
 * - date: ISO date string (YYYY-MM format for monthly, YYYY-MM-DD for daily)
 * - count: Number of papers published in that period
 * 
 * Example use cases:
 * - Line chart showing paper volume over months
 * - Bar chart comparing topic growth
 * - Sparkline in topic cards
 */
interface TrendDataPoint {
  date: string;
  count: number;
}

interface TopicResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  keywords: string[];
  paperCount: number;
  trendData: TrendDataPoint[] | null;
  createdAt: string;
  updatedAt: string;
}

interface SuccessResponse {
  success: true;
  data: TopicResponse[];
  meta: {
    total: number;
    sortBy: string;
    sortOrder: string;
  };
}

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sorting configuration
// ─────────────────────────────────────────────────────────────────────────────

type SortField = "paperCount" | "updatedAt" | "createdAt" | "name";
type SortOrder = "asc" | "desc";

const VALID_SORT_FIELDS: SortField[] = ["paperCount", "updatedAt", "createdAt", "name"];
const VALID_SORT_ORDERS: SortOrder[] = ["asc", "desc"];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/topics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/topics
 * 
 * Returns all topics with paper counts and optional trend data.
 * 
 * Query Parameters:
 * - sortBy: Field to sort by (paperCount, updatedAt, createdAt, name). Default: paperCount
 * - sortOrder: Sort direction (asc, desc). Default: desc
 * - includeTrends: Whether to include trendData (true/false). Default: true
 * 
 * Response (200):
 * ```json
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "clx...",
 *       "name": "Machine Learning",
 *       "slug": "machine-learning",
 *       "description": "Papers on ML algorithms and applications",
 *       "keywords": ["neural networks", "deep learning", "transformers"],
 *       "paperCount": 1542,
 *       "trendData": [
 *         { "date": "2024-06", "count": 120 },
 *         { "date": "2024-07", "count": 145 },
 *         { "date": "2024-08", "count": 158 }
 *       ],
 *       "createdAt": "2024-01-01T00:00:00.000Z",
 *       "updatedAt": "2024-08-15T12:30:00.000Z"
 *     }
 *   ],
 *   "meta": {
 *     "total": 25,
 *     "sortBy": "paperCount",
 *     "sortOrder": "desc"
 *   }
 * }
 * ```
 */
export async function GET(
  req: NextRequest
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const { searchParams } = new URL(req.url);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Parse and validate query parameters
    // ─────────────────────────────────────────────────────────────────────────
    const sortByParam = searchParams.get("sortBy") || "paperCount";
    const sortOrderParam = searchParams.get("sortOrder") || "desc";
    const includeTrends = searchParams.get("includeTrends") !== "false";

    // Validate sortBy
    const sortBy: SortField = VALID_SORT_FIELDS.includes(sortByParam as SortField)
      ? (sortByParam as SortField)
      : "paperCount";

    // Validate sortOrder
    const sortOrder: SortOrder = VALID_SORT_ORDERS.includes(sortOrderParam as SortOrder)
      ? (sortOrderParam as SortOrder)
      : "desc";

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Build Prisma query
    // ─────────────────────────────────────────────────────────────────────────
    // For paperCount sorting, we need to fetch all and sort in-memory
    // For other fields, we can use Prisma orderBy
    const orderBy = sortBy !== "paperCount"
      ? { [sortBy]: sortOrder }
      : undefined;

    const topics = await prisma.topic.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        keywords: true,
        trendData: includeTrends,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            papers: true,
          },
        },
      },
      orderBy,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Transform and sort data
    // ─────────────────────────────────────────────────────────────────────────
    let data: TopicResponse[] = topics.map((topic) => ({
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
      description: topic.description,
      keywords: topic.keywords,
      paperCount: topic._count.papers,
      trendData: includeTrends
        ? (topic.trendData as TrendDataPoint[] | null)
        : null,
      createdAt: topic.createdAt.toISOString(),
      updatedAt: topic.updatedAt.toISOString(),
    }));

    // Sort by paperCount if requested (can't be done in Prisma directly)
    if (sortBy === "paperCount") {
      data.sort((a, b) => {
        return sortOrder === "desc"
          ? b.paperCount - a.paperCount
          : a.paperCount - b.paperCount;
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Return response
    // ─────────────────────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      data,
      meta: {
        total: data.length,
        sortBy,
        sortOrder,
      },
    });

  } catch (error) {
    console.error("[GET /api/topics] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch topics",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
