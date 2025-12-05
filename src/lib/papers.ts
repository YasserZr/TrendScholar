// src/lib/papers.ts
// Paper data fetching utilities for server components

import prisma from "@/lib/prisma";
import { searchSimilarPapers } from "@/lib/vector";

/**
 * Full paper detail with parsed summary
 */
export interface PaperDetail {
  id: string;
  arxivId: string;
  title: string;
  abstract: string;
  authors: string[];
  pdfUrl: string | null;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  vectorId: string | null;
  topic: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  } | null;
  summary: ParsedSummary | null;
  savedCount: number;
}

/**
 * Parsed summary content
 */
export interface ParsedSummary {
  id: string;
  tldr: string | null;
  contributions: string[] | null;
  keywords: string[] | null;
  rawContent: string;
  model: string;
  createdAt: Date;
}

/**
 * Related paper for sidebar
 */
export interface RelatedPaper {
  id: string;
  arxivId: string;
  title: string;
  abstract: string;
  score: number;
  topic: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

/**
 * Parse summary JSON content
 */
function parseSummaryContent(content: string): {
  tldr: string | null;
  contributions: string[] | null;
  keywords: string[] | null;
} {
  try {
    const parsed = JSON.parse(content);
    return {
      tldr: parsed.tldr || null,
      contributions: Array.isArray(parsed.contributions) ? parsed.contributions : null,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : null,
    };
  } catch {
    // Legacy format - content is plain text
    return {
      tldr: content,
      contributions: null,
      keywords: null,
    };
  }
}

/**
 * Fetch a paper by ID or arXiv ID with full details
 */
export async function getPaperById(idOrArxivId: string): Promise<PaperDetail | null> {
  // Try to find by internal ID first, then by arXiv ID
  const paper = await prisma.paper.findFirst({
    where: {
      OR: [
        { id: idOrArxivId },
        { arxivId: idOrArxivId },
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
        where: { status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          model: true,
          createdAt: true,
        },
      },
      _count: {
        select: { savedByUsers: true },
      },
    },
  });

  if (!paper) return null;

  // Parse the latest summary if exists
  const latestSummary = paper.summaries[0];
  let parsedSummary: ParsedSummary | null = null;

  if (latestSummary) {
    const parsed = parseSummaryContent(latestSummary.content);
    parsedSummary = {
      id: latestSummary.id,
      tldr: parsed.tldr,
      contributions: parsed.contributions,
      keywords: parsed.keywords,
      rawContent: latestSummary.content,
      model: latestSummary.model,
      createdAt: latestSummary.createdAt,
    };
  }

  return {
    id: paper.id,
    arxivId: paper.arxivId,
    title: paper.title,
    abstract: paper.abstract,
    authors: paper.authors,
    pdfUrl: paper.pdfUrl,
    publishedAt: paper.publishedAt,
    createdAt: paper.createdAt,
    updatedAt: paper.updatedAt,
    vectorId: paper.vectorId,
    topic: paper.topic,
    summary: parsedSummary,
    savedCount: paper._count.savedByUsers,
  };
}

/**
 * Fetch related papers using vector similarity search
 */
export async function getRelatedPapers(
  paper: PaperDetail,
  limit: number = 5
): Promise<RelatedPaper[]> {
  try {
    // Search for similar papers based on title + abstract
    const queryText = `${paper.title} ${paper.abstract.slice(0, 500)}`;
    
    const searchResults = await searchSimilarPapers({
      query: queryText,
      topK: limit + 1, // Get extra in case we need to filter out the current paper
      excludePaperId: paper.id,
      minScore: 0.6, // Lower threshold for related papers
    });

    if (searchResults.length === 0) {
      return [];
    }

    // Fetch full paper details for results
    const paperIds = searchResults.map((r) => r.paperId);
    
    const relatedPapers = await prisma.paper.findMany({
      where: {
        id: { in: paperIds },
      },
      select: {
        id: true,
        arxivId: true,
        title: true,
        abstract: true,
        topic: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Map back scores and sort by score
    const papersWithScores: RelatedPaper[] = relatedPapers.map((p) => {
      const result = searchResults.find((r) => r.paperId === p.id);
      return {
        ...p,
        score: result?.score || 0,
      };
    });

    return papersWithScores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    // Silently return empty array on error - don't break the page
    // This handles cases like OpenAI quota exceeded, network issues, etc.
    if (process.env.NODE_ENV === "development") {
      console.warn("Related papers unavailable:", error instanceof Error ? error.message : "Unknown error");
    }
    return [];
  }
}

/**
 * Check if user has saved this paper
 */
export async function isPaperSavedByUser(
  paperId: string,
  userId: string
): Promise<boolean> {
  const saved = await prisma.savedPaper.findUnique({
    where: {
      userId_paperId: { userId, paperId },
    },
  });
  return !!saved;
}
