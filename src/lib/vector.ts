// src/lib/vector.ts
// Vector search client for paper embeddings using Qdrant
// Supports upsert, search, and RAG-style retrieval

import { QdrantClient } from "@qdrant/js-client-rest";
import { generateEmbedding as geminiGenerateEmbedding, generateEmbeddings as geminiGenerateEmbeddings, EMBEDDING_CONFIG } from "./gemini";
import prisma from "./prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vector configuration
 * 
 * Embedding Model: Google text-embedding-004
 * - 768 dimensions
 * - Cost-effective for large datasets
 * - Good performance for academic text
 */
export const VECTOR_CONFIG = {
  // Gemini embedding model
  embeddingModel: EMBEDDING_CONFIG.model,
  embeddingDimensions: EMBEDDING_CONFIG.dimensions,
  
  // Qdrant collection settings
  collectionName: "papers",
  
  // Search defaults
  defaultTopK: 5,
  maxTopK: 20,
  
  // Similarity threshold (cosine similarity)
  minSimilarityScore: 0.7,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Qdrant Client Setup
// ─────────────────────────────────────────────────────────────────────────────

const qdrantUrl = process.env.QDRANT_URL;
const qdrantApiKey = process.env.QDRANT_API_KEY;

if (!qdrantUrl) {
  if (process.env.NODE_ENV !== "production") {
    console.warn("QDRANT_URL is not set. Vector search will not work.");
  }
}

export const qdrant = new QdrantClient({
  url: qdrantUrl || "http://localhost:6333",
  apiKey: qdrantApiKey,
});

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UpsertPaperInput {
  /** Paper ID (cuid from database) */
  paperId: string;
  /** Text to embed (typically title + abstract) */
  text: string;
  /** Optional metadata to store with the vector */
  metadata?: {
    title?: string;
    arxivId?: string;
    topicId?: string;
    publishedAt?: string;
  };
}

export interface SearchResult {
  /** Paper ID */
  paperId: string;
  /** Cosine similarity score (0-1) */
  score: number;
  /** Stored metadata */
  metadata?: {
    title?: string;
    arxivId?: string;
    topicId?: string;
    publishedAt?: string;
  };
}

export interface SimilarPaper {
  id: string;
  title: string;
  abstract: string;
  arxivId: string;
  score: number;
}

export class VectorError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "VectorError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Embedding Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate embedding vector for text using Gemini
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text?.trim()) {
    throw new VectorError("Text is required for embedding", "EMPTY_TEXT");
  }

  try {
    return await geminiGenerateEmbedding(text);
  } catch (error) {
    if (error instanceof VectorError) throw error;
    
    throw new VectorError(
      "Failed to generate embedding",
      "EMBEDDING_FAILED",
      error
    );
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];

  try {
    return await geminiGenerateEmbeddings(texts);
  } catch (error) {
    throw new VectorError(
      "Failed to generate batch embeddings",
      "BATCH_EMBEDDING_FAILED",
      error
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Collection Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensure the papers collection exists with correct configuration
 */
export async function ensureCollection(): Promise<void> {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(
      (c) => c.name === VECTOR_CONFIG.collectionName
    );

    if (!exists) {
      await qdrant.createCollection(VECTOR_CONFIG.collectionName, {
        vectors: {
          size: VECTOR_CONFIG.embeddingDimensions,
          distance: "Cosine",
        },
        // Optimize for search speed
        optimizers_config: {
          memmap_threshold: 20000,
        },
        // Enable indexing for fast retrieval
        hnsw_config: {
          m: 16,
          ef_construct: 100,
        },
      });

      console.log(`[vector] Created collection: ${VECTOR_CONFIG.collectionName}`);
    }
  } catch (error) {
    throw new VectorError(
      "Failed to ensure collection exists",
      "COLLECTION_ERROR",
      error
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Upsert Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert a paper embedding into the vector database
 * 
 * @param input - Paper ID, text to embed, and optional metadata
 * @returns The vector ID stored in the database
 * 
 * @example
 * ```typescript
 * const vectorId = await upsertPaperEmbedding({
 *   paperId: "clx123...",
 *   text: "Attention Is All You Need\n\nWe propose a new simple network architecture...",
 *   metadata: {
 *     title: "Attention Is All You Need",
 *     arxivId: "1706.03762",
 *     topicId: "clx456...",
 *   },
 * });
 * ```
 */
export async function upsertPaperEmbedding(
  input: UpsertPaperInput
): Promise<string> {
  const { paperId, text, metadata } = input;

  if (!paperId) {
    throw new VectorError("Paper ID is required", "MISSING_PAPER_ID");
  }

  // Generate embedding
  const embedding = await generateEmbedding(text);

  // Use paperId as the point ID for easy lookup
  // Qdrant supports string IDs
  const pointId = paperId;

  try {
    // Ensure collection exists
    await ensureCollection();

    // Upsert the point
    await qdrant.upsert(VECTOR_CONFIG.collectionName, {
      wait: true,
      points: [
        {
          id: pointId,
          vector: embedding,
          payload: {
            paperId,
            ...metadata,
            updatedAt: new Date().toISOString(),
          },
        },
      ],
    });

    // Update paper record with vectorId
    await prisma.paper.update({
      where: { id: paperId },
      data: { vectorId: pointId },
    });

    return pointId;
  } catch (error) {
    if (error instanceof VectorError) throw error;

    throw new VectorError(
      "Failed to upsert paper embedding",
      "UPSERT_FAILED",
      error
    );
  }
}

/**
 * Batch upsert multiple paper embeddings
 * More efficient than individual upserts for bulk operations
 */
export async function upsertPaperEmbeddingsBatch(
  inputs: UpsertPaperInput[]
): Promise<string[]> {
  if (!inputs.length) return [];

  // Generate all embeddings in batch
  const texts = inputs.map((i) => i.text);
  const embeddings = await generateEmbeddings(texts);

  // Ensure collection exists
  await ensureCollection();

  // Prepare points
  const points = inputs.map((input, index) => ({
    id: input.paperId,
    vector: embeddings[index],
    payload: {
      paperId: input.paperId,
      ...input.metadata,
      updatedAt: new Date().toISOString(),
    },
  }));

  try {
    // Batch upsert
    await qdrant.upsert(VECTOR_CONFIG.collectionName, {
      wait: true,
      points,
    });

    // Update paper records
    await Promise.all(
      inputs.map((input) =>
        prisma.paper.update({
          where: { id: input.paperId },
          data: { vectorId: input.paperId },
        })
      )
    );

    return inputs.map((i) => i.paperId);
  } catch (error) {
    throw new VectorError(
      "Failed to batch upsert paper embeddings",
      "BATCH_UPSERT_FAILED",
      error
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Search Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search for similar papers by query text
 * 
 * @param query - Search query text
 * @param topK - Number of results to return (default: 5)
 * @param filter - Optional filter conditions
 * @returns Array of paper IDs with similarity scores
 * 
 * @example
 * ```typescript
 * const results = await searchSimilarPapers({
 *   query: "transformer architecture for natural language processing",
 *   topK: 5,
 * });
 * 
 * // results:
 * // [
 * //   { paperId: "clx123...", score: 0.92, metadata: {...} },
 * //   { paperId: "clx456...", score: 0.87, metadata: {...} },
 * // ]
 * ```
 */
export async function searchSimilarPapers(options: {
  query: string;
  topK?: number;
  excludePaperId?: string;
  topicId?: string;
  minScore?: number;
}): Promise<SearchResult[]> {
  const {
    query,
    topK = VECTOR_CONFIG.defaultTopK,
    excludePaperId,
    topicId,
    minScore = VECTOR_CONFIG.minSimilarityScore,
  } = options;

  if (!query?.trim()) {
    throw new VectorError("Query text is required", "EMPTY_QUERY");
  }

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Build filter
  const filter: Record<string, unknown> = {};
  
  if (excludePaperId) {
    filter.must_not = [
      { key: "paperId", match: { value: excludePaperId } },
    ];
  }

  if (topicId) {
    filter.must = [
      ...(filter.must as unknown[] || []),
      { key: "topicId", match: { value: topicId } },
    ];
  }

  try {
    const results = await qdrant.search(VECTOR_CONFIG.collectionName, {
      vector: queryEmbedding,
      limit: Math.min(topK, VECTOR_CONFIG.maxTopK),
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      with_payload: true,
      score_threshold: minScore,
    });

    return results.map((result) => ({
      paperId: (result.payload?.paperId as string) || String(result.id),
      score: result.score,
      metadata: {
        title: result.payload?.title as string | undefined,
        arxivId: result.payload?.arxivId as string | undefined,
        topicId: result.payload?.topicId as string | undefined,
        publishedAt: result.payload?.publishedAt as string | undefined,
      },
    }));
  } catch (error) {
    throw new VectorError(
      "Failed to search similar papers",
      "SEARCH_FAILED",
      error
    );
  }
}

/**
 * Search for similar papers by paper ID
 * Useful for "related papers" feature
 */
export async function searchSimilarByPaperId(
  paperId: string,
  topK: number = VECTOR_CONFIG.defaultTopK
): Promise<SearchResult[]> {
  try {
    // Get the paper's vector from Qdrant
    const points = await qdrant.retrieve(VECTOR_CONFIG.collectionName, {
      ids: [paperId],
      with_vector: true,
    });

    if (!points.length || !points[0].vector) {
      throw new VectorError(
        "Paper not found in vector database",
        "PAPER_NOT_VECTORIZED"
      );
    }

    // Search using the paper's vector
    const results = await qdrant.search(VECTOR_CONFIG.collectionName, {
      vector: points[0].vector as number[],
      limit: topK + 1, // +1 to account for the paper itself
      with_payload: true,
      score_threshold: VECTOR_CONFIG.minSimilarityScore,
    });

    // Filter out the source paper
    return results
      .filter((r) => r.payload?.paperId !== paperId)
      .slice(0, topK)
      .map((result) => ({
        paperId: (result.payload?.paperId as string) || String(result.id),
        score: result.score,
        metadata: {
          title: result.payload?.title as string | undefined,
          arxivId: result.payload?.arxivId as string | undefined,
          topicId: result.payload?.topicId as string | undefined,
          publishedAt: result.payload?.publishedAt as string | undefined,
        },
      }));
  } catch (error) {
    if (error instanceof VectorError) throw error;

    throw new VectorError(
      "Failed to search similar papers by ID",
      "SEARCH_BY_ID_FAILED",
      error
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RAG Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch similar papers with full details for RAG context
 * Returns paper objects ready to be used as relatedContexts in summarization
 * 
 * @example
 * ```typescript
 * const relatedPapers = await fetchSimilarPapersForRAG({
 *   paperId: "clx123...",
 *   topK: 3,
 * });
 * 
 * const summary = await summarizePaperText({
 *   title: paper.title,
 *   abstract: paper.abstract,
 *   relatedContexts: relatedPapers,
 * });
 * ```
 */
export async function fetchSimilarPapersForRAG(options: {
  /** Paper ID to find similar papers for */
  paperId?: string;
  /** Query text (alternative to paperId) */
  query?: string;
  /** Number of similar papers to fetch */
  topK?: number;
  /** Optional topic filter */
  topicId?: string;
}): Promise<SimilarPaper[]> {
  const { paperId, query, topK = 3, topicId } = options;

  if (!paperId && !query) {
    throw new VectorError(
      "Either paperId or query is required",
      "MISSING_INPUT"
    );
  }

  let searchResults: SearchResult[];

  try {
    if (paperId) {
      // Check if paper has been vectorized
      const paper = await prisma.paper.findUnique({
        where: { id: paperId },
        select: { vectorId: true, title: true, abstract: true },
      });

      if (paper?.vectorId) {
        // Search by vector
        searchResults = await searchSimilarByPaperId(paperId, topK);
      } else if (paper) {
        // Paper not vectorized, search by title + abstract
        searchResults = await searchSimilarPapers({
          query: `${paper.title}\n\n${paper.abstract}`,
          topK,
          excludePaperId: paperId,
          topicId,
        });
      } else {
        return [];
      }
    } else {
      // Search by query text
      searchResults = await searchSimilarPapers({
        query: query!,
        topK,
        topicId,
      });
    }

    if (!searchResults.length) {
      return [];
    }

    // Fetch full paper details from database
    const paperIds = searchResults.map((r) => r.paperId);
    const papers = await prisma.paper.findMany({
      where: { id: { in: paperIds } },
      select: {
        id: true,
        title: true,
        abstract: true,
        arxivId: true,
      },
    });

    // Map results with scores
    const paperMap = new Map(papers.map((p) => [p.id, p]));

    return searchResults
      .map((result) => {
        const paper = paperMap.get(result.paperId);
        if (!paper) return null;

        return {
          id: paper.id,
          title: paper.title,
          abstract: paper.abstract,
          arxivId: paper.arxivId,
          score: result.score,
        };
      })
      .filter((p): p is SimilarPaper => p !== null);

  } catch (error) {
    // Log but don't fail - RAG context is optional
    console.error("[vector] Failed to fetch similar papers for RAG:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Delete a paper embedding from the vector database
 */
export async function deletePaperEmbedding(paperId: string): Promise<void> {
  try {
    await qdrant.delete(VECTOR_CONFIG.collectionName, {
      wait: true,
      points: [paperId],
    });

    // Update paper record
    await prisma.paper.update({
      where: { id: paperId },
      data: { vectorId: null },
    });
  } catch (error) {
    throw new VectorError(
      "Failed to delete paper embedding",
      "DELETE_FAILED",
      error
    );
  }
}

/**
 * Get collection statistics
 */
export async function getCollectionStats(): Promise<{
  vectorCount: number;
  indexedCount: number;
}> {
  try {
    const info = await qdrant.getCollection(VECTOR_CONFIG.collectionName);
    
    return {
      vectorCount: info.points_count ?? 0,
      indexedCount: info.indexed_vectors_count ?? 0,
    };
  } catch (error) {
    throw new VectorError(
      "Failed to get collection stats",
      "STATS_FAILED",
      error
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export default {
  upsertPaperEmbedding,
  upsertPaperEmbeddingsBatch,
  searchSimilarPapers,
  searchSimilarByPaperId,
  fetchSimilarPapersForRAG,
  deletePaperEmbedding,
  generateEmbedding,
  ensureCollection,
  getCollectionStats,
};
