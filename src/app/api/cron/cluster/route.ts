// src/app/api/cron/cluster/route.ts
// ClusterAgent: Weekly clustering of papers into topics with trend data
// Uses simple K-means-like clustering on paper embeddings

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateEmbedding, qdrant, VECTOR_CONFIG } from "@/lib/vector";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max for Vercel Pro

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clustering configuration
 * 
 * Algorithm: Simplified K-means with centroid-based assignment
 * - Use existing topics as initial centroids
 * - Assign papers to nearest topic based on embedding similarity
 * - Update topic keywords based on most common terms
 * - Compute trend data (weekly/monthly paper counts)
 */
const CLUSTER_CONFIG = {
  // Number of papers to process per run
  batchSize: 500,
  
  // Minimum similarity score to assign paper to topic
  minSimilarityThreshold: 0.65,
  
  // Days to look back for recent papers
  recentPapersDays: 30,
  
  // K-means iterations (keep low for serverless)
  maxIterations: 3,
  
  // Minimum papers to form a topic cluster
  minPapersPerTopic: 5,
  
  // Top keywords to extract per topic
  topKeywordsCount: 10,
  
  // Trend data: number of months to track
  trendMonths: 12,
  
  // Enable auto-discovery of new topics
  enableNewTopicDiscovery: false, // Keep false for simplicity
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ClusterResult {
  success: boolean;
  stats: {
    papersProcessed: number;
    papersAssigned: number;
    papersUnassigned: number;
    topicsUpdated: number;
    newTopicsCreated: number;
    errors: string[];
  };
  duration: number;
}

interface PaperWithEmbedding {
  id: string;
  arxivId: string;
  title: string;
  abstract: string;
  topicId: string | null;
  embedding: number[];
}

interface TopicCentroid {
  id: string;
  name: string;
  slug: string;
  centroid: number[];
  paperCount: number;
  keywords: string[];
}

interface TrendDataPoint {
  date: string; // YYYY-MM format
  count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate cron secret token
 */
function validateCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.warn("[cluster] CRON_SECRET not configured");
    return false;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const secretHeader = request.headers.get("x-cron-secret");
  if (secretHeader === cronSecret) {
    return true;
  }

  return false;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Calculate centroid (mean) of multiple vectors
 */
function calculateCentroid(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  
  const dimensions = vectors[0].length;
  const centroid = new Array(dimensions).fill(0);
  
  for (const vector of vectors) {
    for (let i = 0; i < dimensions; i++) {
      centroid[i] += vector[i];
    }
  }
  
  for (let i = 0; i < dimensions; i++) {
    centroid[i] /= vectors.length;
  }
  
  return centroid;
}

/**
 * Extract keywords from paper titles and abstracts
 * Simple TF-based extraction (production: use TF-IDF or KeyBERT)
 */
function extractKeywords(papers: { title: string; abstract: string }[]): string[] {
  // Common stopwords to filter
  const stopwords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
    "be", "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "need", "dare", "ought",
    "used", "this", "that", "these", "those", "i", "we", "you", "he", "she",
    "it", "they", "what", "which", "who", "whom", "whose", "where", "when",
    "why", "how", "all", "each", "every", "both", "few", "more", "most",
    "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so",
    "than", "too", "very", "just", "also", "now", "here", "there", "then",
    "once", "our", "its", "their", "my", "your", "his", "her", "using", "based",
    "propose", "proposed", "show", "shows", "paper", "method", "methods",
    "approach", "results", "result", "new", "novel", "work", "present",
    "demonstrate", "performance", "model", "models", "data", "learning",
  ]);

  // Count word frequencies
  const wordCounts = new Map<string, number>();
  
  for (const paper of papers) {
    const text = `${paper.title} ${paper.abstract}`.toLowerCase();
    const words = text
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopwords.has(w));
    
    // Count unique words per paper (document frequency)
    const uniqueWords = new Set(words);
    for (const word of uniqueWords) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  }

  // Sort by frequency and return top keywords
  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, CLUSTER_CONFIG.topKeywordsCount)
    .map(([word]) => word);
}

/**
 * Generate trend data for a topic (monthly paper counts)
 */
async function generateTrendData(topicId: string): Promise<TrendDataPoint[]> {
  const trendData = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
    SELECT 
      TO_CHAR("publishedAt", 'YYYY-MM') as date,
      COUNT(*)::bigint as count
    FROM "Paper"
    WHERE "topicId" = ${topicId}
      AND "publishedAt" >= NOW() - INTERVAL '${CLUSTER_CONFIG.trendMonths} months'
    GROUP BY TO_CHAR("publishedAt", 'YYYY-MM')
    ORDER BY date ASC
  `;

  return trendData.map((row) => ({
    date: row.date,
    count: Number(row.count),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Clustering Algorithm
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch embeddings for papers from Qdrant
 */
async function fetchPaperEmbeddings(
  paperIds: string[]
): Promise<Map<string, number[]>> {
  const embeddingMap = new Map<string, number[]>();
  
  if (paperIds.length === 0) return embeddingMap;

  try {
    // Fetch vectors from Qdrant in batches
    const batchSize = 100;
    for (let i = 0; i < paperIds.length; i += batchSize) {
      const batch = paperIds.slice(i, i + batchSize);
      
      const points = await qdrant.retrieve(VECTOR_CONFIG.collectionName, {
        ids: batch,
        with_vector: true,
      });

      for (const point of points) {
        const paperId = point.payload?.paperId as string || String(point.id);
        if (point.vector && Array.isArray(point.vector)) {
          embeddingMap.set(paperId, point.vector as number[]);
        }
      }
    }
  } catch (error) {
    console.error("[cluster] Error fetching embeddings:", error);
  }

  return embeddingMap;
}

/**
 * Compute topic centroids from current paper assignments
 */
async function computeTopicCentroids(): Promise<TopicCentroid[]> {
  const topics = await prisma.topic.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      keywords: true,
      papers: {
        select: { id: true },
        take: 100, // Sample papers for centroid
      },
    },
  });

  const centroids: TopicCentroid[] = [];

  for (const topic of topics) {
    if (topic.papers.length === 0) continue;

    const paperIds = topic.papers.map((p) => p.id);
    const embeddings = await fetchPaperEmbeddings(paperIds);

    if (embeddings.size > 0) {
      const vectors = Array.from(embeddings.values());
      const centroid = calculateCentroid(vectors);

      centroids.push({
        id: topic.id,
        name: topic.name,
        slug: topic.slug,
        centroid,
        paperCount: topic.papers.length,
        keywords: topic.keywords,
      });
    }
  }

  return centroids;
}

/**
 * Assign papers to topics based on embedding similarity
 * 
 * Algorithm:
 * 1. For each paper without a topic (or all papers if reassigning)
 * 2. Compute similarity to each topic centroid
 * 3. Assign to most similar topic if above threshold
 */
async function assignPapersToTopics(
  papers: PaperWithEmbedding[],
  centroids: TopicCentroid[]
): Promise<Map<string, string>> {
  const assignments = new Map<string, string>(); // paperId -> topicId

  for (const paper of papers) {
    if (!paper.embedding || paper.embedding.length === 0) continue;

    let bestTopicId: string | null = null;
    let bestSimilarity = CLUSTER_CONFIG.minSimilarityThreshold;

    for (const centroid of centroids) {
      const similarity = cosineSimilarity(paper.embedding, centroid.centroid);
      
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestTopicId = centroid.id;
      }
    }

    if (bestTopicId) {
      assignments.set(paper.id, bestTopicId);
    }
  }

  return assignments;
}

/**
 * Update topic centroids based on new assignments (K-means iteration)
 */
async function updateCentroids(
  centroids: TopicCentroid[],
  papers: PaperWithEmbedding[],
  assignments: Map<string, string>
): Promise<TopicCentroid[]> {
  // Group papers by topic
  const topicPapers = new Map<string, PaperWithEmbedding[]>();
  
  for (const centroid of centroids) {
    topicPapers.set(centroid.id, []);
  }

  for (const paper of papers) {
    const topicId = assignments.get(paper.id);
    if (topicId && topicPapers.has(topicId)) {
      topicPapers.get(topicId)!.push(paper);
    }
  }

  // Recompute centroids
  const updatedCentroids: TopicCentroid[] = [];

  for (const centroid of centroids) {
    const assignedPapers = topicPapers.get(centroid.id) || [];
    
    if (assignedPapers.length > 0) {
      const vectors = assignedPapers
        .filter((p) => p.embedding.length > 0)
        .map((p) => p.embedding);
      
      const newCentroid = vectors.length > 0
        ? calculateCentroid(vectors)
        : centroid.centroid;

      // Extract new keywords from assigned papers
      const keywords = extractKeywords(
        assignedPapers.map((p) => ({ title: p.title, abstract: p.abstract }))
      );

      updatedCentroids.push({
        ...centroid,
        centroid: newCentroid,
        paperCount: assignedPapers.length,
        keywords: keywords.length > 0 ? keywords : centroid.keywords,
      });
    } else {
      updatedCentroids.push(centroid);
    }
  }

  return updatedCentroids;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cron/cluster
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/cron/cluster
 * 
 * ClusterAgent: Weekly clustering of papers into topics.
 * 
 * Algorithm (Simplified K-means):
 * 1. Fetch recent papers and their embeddings
 * 2. Compute initial topic centroids from existing assignments
 * 3. Iterate: assign papers to nearest centroid, update centroids
 * 4. Update topic keywords and trend data
 * 
 * Security:
 * - Requires valid CRON_SECRET in Authorization header
 * - Intended to be called by Vercel Cron weekly
 * 
 * Response (200):
 * ```json
 * {
 *   "success": true,
 *   "stats": {
 *     "papersProcessed": 500,
 *     "papersAssigned": 450,
 *     "papersUnassigned": 50,
 *     "topicsUpdated": 8,
 *     "newTopicsCreated": 0,
 *     "errors": []
 *   },
 *   "duration": 45000
 * }
 * ```
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ClusterResult>> {
  const startTime = Date.now();

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Validate Secret Token
  // ─────────────────────────────────────────────────────────────────────────
  if (!validateCronSecret(request)) {
    console.error("[cluster] Unauthorized request");
    return NextResponse.json(
      {
        success: false,
        stats: {
          papersProcessed: 0,
          papersAssigned: 0,
          papersUnassigned: 0,
          topicsUpdated: 0,
          newTopicsCreated: 0,
          errors: ["Unauthorized: Invalid or missing CRON_SECRET"],
        },
        duration: Date.now() - startTime,
      },
      { status: 401 }
    );
  }

  console.log("[cluster] Starting clustering run");

  const stats = {
    papersProcessed: 0,
    papersAssigned: 0,
    papersUnassigned: 0,
    topicsUpdated: 0,
    newTopicsCreated: 0,
    errors: [] as string[],
  };

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 2. Fetch Recent Papers
    // ─────────────────────────────────────────────────────────────────────────
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - CLUSTER_CONFIG.recentPapersDays);

    const papers = await prisma.paper.findMany({
      where: {
        publishedAt: { gte: recentDate },
        vectorId: { not: null }, // Must have embedding
      },
      select: {
        id: true,
        arxivId: true,
        title: true,
        abstract: true,
        topicId: true,
      },
      take: CLUSTER_CONFIG.batchSize,
      orderBy: { publishedAt: "desc" },
    });

    console.log(`[cluster] Found ${papers.length} recent papers with embeddings`);

    if (papers.length === 0) {
      console.log("[cluster] No papers to cluster");
      return NextResponse.json({
        success: true,
        stats,
        duration: Date.now() - startTime,
      });
    }

    stats.papersProcessed = papers.length;

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Fetch Paper Embeddings
    // ─────────────────────────────────────────────────────────────────────────
    const paperIds = papers.map((p) => p.id);
    const embeddings = await fetchPaperEmbeddings(paperIds);

    console.log(`[cluster] Fetched ${embeddings.size} embeddings`);

    // Merge embeddings with paper data
    const papersWithEmbeddings: PaperWithEmbedding[] = papers.map((p) => ({
      ...p,
      embedding: embeddings.get(p.id) || [],
    }));

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Compute Initial Topic Centroids
    // ─────────────────────────────────────────────────────────────────────────
    let centroids = await computeTopicCentroids();

    console.log(`[cluster] Computed ${centroids.length} topic centroids`);

    if (centroids.length === 0) {
      console.log("[cluster] No topics with papers found, skipping clustering");
      return NextResponse.json({
        success: true,
        stats,
        duration: Date.now() - startTime,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. K-means Iterations
    // ─────────────────────────────────────────────────────────────────────────
    let assignments = new Map<string, string>();

    for (let iter = 0; iter < CLUSTER_CONFIG.maxIterations; iter++) {
      console.log(`[cluster] Iteration ${iter + 1}/${CLUSTER_CONFIG.maxIterations}`);

      // Assign papers to topics
      assignments = await assignPapersToTopics(papersWithEmbeddings, centroids);

      console.log(`[cluster] Assigned ${assignments.size} papers`);

      // Update centroids (skip on last iteration)
      if (iter < CLUSTER_CONFIG.maxIterations - 1) {
        centroids = await updateCentroids(centroids, papersWithEmbeddings, assignments);
      }
    }

    stats.papersAssigned = assignments.size;
    stats.papersUnassigned = papers.length - assignments.size;

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Update Database
    // ─────────────────────────────────────────────────────────────────────────
    console.log("[cluster] Updating database...");

    // Update paper topic assignments
    const updatePromises: Promise<unknown>[] = [];

    for (const [paperId, topicId] of assignments) {
      updatePromises.push(
        prisma.paper.update({
          where: { id: paperId },
          data: { topicId },
        })
      );
    }

    // Batch updates (in groups of 50)
    const updateBatchSize = 50;
    for (let i = 0; i < updatePromises.length; i += updateBatchSize) {
      const batch = updatePromises.slice(i, i + updateBatchSize);
      await Promise.all(batch);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Update Topic Keywords and Trend Data
    // ─────────────────────────────────────────────────────────────────────────
    for (const centroid of centroids) {
      try {
        // Generate trend data
        const trendData = await generateTrendData(centroid.id);

        // Update topic
        await prisma.topic.update({
          where: { id: centroid.id },
          data: {
            keywords: centroid.keywords,
            trendData: trendData as unknown as Parameters<typeof prisma.topic.update>[0]["data"]["trendData"],
          },
        });

        stats.topicsUpdated++;
      } catch (error) {
        const errorMsg = `Failed to update topic ${centroid.slug}: ${error}`;
        console.error(`[cluster] ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }

  } catch (error) {
    const errorMsg = `Cluster error: ${error}`;
    console.error(`[cluster] ${errorMsg}`);
    stats.errors.push(errorMsg);
  }

  const duration = Date.now() - startTime;

  console.log(`[cluster] Completed in ${duration}ms:`, {
    papersProcessed: stats.papersProcessed,
    papersAssigned: stats.papersAssigned,
    topicsUpdated: stats.topicsUpdated,
  });

  return NextResponse.json({
    success: stats.errors.length === 0,
    stats,
    duration,
  });
}
