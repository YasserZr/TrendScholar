// src/lib/dashboard.ts
// Dashboard data fetching utilities

import prisma from "@/lib/prisma";
import type { Topic } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";

// Testing mode - show papers without summaries
const TESTING_MODE = process.env.TESTING_MODE === "true";

/**
 * Time range options for filtering papers
 */
export type TimeRange = "today" | "week" | "month" | "year" | "all";

/**
 * Feed item shape returned to the dashboard
 */
export interface FeedPaper {
  id: string;
  arxivId: string;
  title: string;
  abstract: string;
  authors: string[];
  pdfUrl: string | null;
  publishedAt: Date;
  topic: {
    id: string;
    name: string;
    slug: string;
  } | null;
  summary: {
    id: string;
    content: string; // JSON string: { tldr, contributions, keywords }
  } | null;
  isSaved: boolean;
}

/**
 * Dashboard stats for the user
 */
export interface DashboardStats {
  savedPapersCount: number;
  summariesCount: number;
  topicsFollowedCount: number;
}

/**
 * Get date threshold for time range filter
 */
export function getTimeRangeDate(range: TimeRange): Date | null {
  const now = new Date();

  switch (range) {
    case "today":
      return new Date(now.setHours(0, 0, 0, 0));
    case "week":
      return new Date(now.setDate(now.getDate() - 7));
    case "month":
      return new Date(now.setMonth(now.getMonth() - 1));
    case "year":
      return new Date(now.setFullYear(now.getFullYear() - 1));
    case "all":
    default:
      return null;
  }
}

/**
 * Fetch personalized paper feed for the dashboard
 */
export async function getFeedPapers(options: {
  userId: string;
  timeRange?: TimeRange;
  topicIds?: string[];
  page?: number;
  limit?: number;
}): Promise<{ papers: FeedPaper[]; total: number }> {
  // In testing mode, default to "all" time range to show all papers
  const defaultTimeRange = TESTING_MODE ? "all" : "week";
  const { userId, timeRange = defaultTimeRange, topicIds, page = 1, limit = 10 } = options;

  // Get user's followed topics if no specific topics provided
  let followedTopicIds = topicIds;
  if (!followedTopicIds || followedTopicIds.length === 0) {
    const userTopics = await prisma.userTopic.findMany({
      where: { userId },
      select: { topicId: true },
    });
    followedTopicIds = userTopics.map((ut) => ut.topicId);
  }

  // Build date filter
  const dateThreshold = getTimeRangeDate(timeRange);

  // Build where clause
  const whereClause: Prisma.PaperWhereInput = {};

  // In testing mode, show all papers; otherwise only papers with completed summaries
  if (!TESTING_MODE) {
    whereClause.summaries = {
      some: {
        status: "COMPLETED",
      },
    };
  }

  // Add date filter
  if (dateThreshold) {
    whereClause.publishedAt = { gte: dateThreshold };
  }

  // Add topic filter (if user follows topics) - skip in testing mode to show all papers
  if (!TESTING_MODE && followedTopicIds && followedTopicIds.length > 0) {
    whereClause.topicId = { in: followedTopicIds };
  }

  // Get user's saved papers for marking
  const savedPaperIds = await prisma.savedPaper.findMany({
    where: { userId },
    select: { paperId: true },
  });
  const savedSet = new Set(savedPaperIds.map((sp) => sp.paperId));

  // Fetch papers with summaries
  const [papers, total] = await Promise.all([
    prisma.paper.findMany({
      where: whereClause,
      include: {
        topic: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        summaries: {
          where: { status: "COMPLETED" },
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            content: true,
          },
        },
      },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.paper.count({ where: whereClause }),
  ]);

  // Transform to FeedPaper shape
  const feedPapers: FeedPaper[] = papers.map((paper) => ({
    id: paper.id,
    arxivId: paper.arxivId,
    title: paper.title,
    abstract: paper.abstract,
    authors: paper.authors,
    pdfUrl: paper.pdfUrl,
    publishedAt: paper.publishedAt,
    topic: paper.topic,
    summary: paper.summaries[0] || null,
    isSaved: savedSet.has(paper.id),
  }));

  return { papers: feedPapers, total };
}

/**
 * Fetch dashboard stats for a user
 */
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [savedPapersCount, summariesCount, topicsFollowedCount] = await Promise.all([
    prisma.savedPaper.count({ where: { userId } }),
    prisma.summary.count({ where: { userId, status: "COMPLETED" } }),
    prisma.userTopic.count({ where: { userId } }),
  ]);

  return {
    savedPapersCount,
    summariesCount,
    topicsFollowedCount,
  };
}

/**
 * Get all topics for filter dropdown
 */
export async function getAllTopics(): Promise<Pick<Topic, "id" | "name" | "slug">[]> {
  return prisma.topic.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Get user's followed topic IDs
 */
export async function getUserFollowedTopicIds(userId: string): Promise<string[]> {
  const userTopics = await prisma.userTopic.findMany({
    where: { userId },
    select: { topicId: true },
  });
  return userTopics.map((ut) => ut.topicId);
}
