// src/app/api/papers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PaperSummary {
  id: string;
  content: string;
  status: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
  };
}

interface PaperDetail {
  id: string;
  arxivId: string;
  title: string;
  abstract: string;
  authors: string[];
  pdfUrl: string | null;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  vectorId: string | null;
  topic: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  } | null;
  summaries: PaperSummary[];
  savedCount: number;
}

interface SuccessResponse {
  success: true;
  data: PaperDetail;
}

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/papers/[id]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/papers/[id]
 * 
 * Get a single paper by ID with full details including summaries.
 * 
 * Path Parameters:
 * - id: Paper ID (cuid) or arXiv ID
 * 
 * Response (200):
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "id": "clx...",
 *     "arxivId": "2301.00001",
 *     "title": "...",
 *     "abstract": "...",
 *     "authors": ["Author 1", "Author 2"],
 *     "pdfUrl": "https://arxiv.org/pdf/...",
 *     "publishedAt": "2023-01-01T00:00:00.000Z",
 *     "topic": { "id": "...", "name": "Machine Learning", "slug": "ml" },
 *     "summaries": [
 *       {
 *         "id": "...",
 *         "content": "Full summary text...",
 *         "status": "COMPLETED",
 *         "model": "gpt-4o",
 *         "createdAt": "...",
 *         "user": { "id": "...", "name": "John Doe" }
 *       }
 *     ],
 *     "savedCount": 42
 *   }
 * }
 * ```
 * 
 * Error Response (404):
 * ```json
 * {
 *   "success": false,
 *   "error": "Paper not found",
 *   "code": "NOT_FOUND"
 * }
 * ```
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Paper ID is required",
          code: "INVALID_ID",
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Query paper by ID or arXiv ID
    // ─────────────────────────────────────────────────────────────────────────
    // Support both internal ID (cuid) and arXiv ID for convenience
    const paper = await prisma.paper.findFirst({
      where: {
        OR: [
          { id },
          { arxivId: id },
        ],
      },
      include: {
        topic: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        summaries: {
          select: {
            id: true,
            content: true,
            status: true,
            model: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          where: {
            status: "COMPLETED",
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            savedByUsers: true,
          },
        },
      },
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Handle not found
    // ─────────────────────────────────────────────────────────────────────────
    if (!paper) {
      return NextResponse.json(
        {
          success: false,
          error: "Paper not found",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Transform data for response
    // ─────────────────────────────────────────────────────────────────────────
    const data: PaperDetail = {
      id: paper.id,
      arxivId: paper.arxivId,
      title: paper.title,
      abstract: paper.abstract,
      authors: paper.authors,
      pdfUrl: paper.pdfUrl,
      publishedAt: paper.publishedAt.toISOString(),
      createdAt: paper.createdAt.toISOString(),
      updatedAt: paper.updatedAt.toISOString(),
      vectorId: paper.vectorId,
      topic: paper.topic,
      summaries: paper.summaries.map((summary) => ({
        id: summary.id,
        content: summary.content,
        status: summary.status,
        model: summary.model,
        createdAt: summary.createdAt.toISOString(),
        updatedAt: summary.updatedAt.toISOString(),
        user: summary.user,
      })),
      savedCount: paper._count.savedByUsers,
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Return response
    // ─────────────────────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error) {
    console.error("[GET /api/papers/[id]] Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch paper",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
