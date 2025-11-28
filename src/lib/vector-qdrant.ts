// src/lib/vector-qdrant.ts
import { QdrantClient } from "@qdrant/js-client-rest";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

export async function upsertQdrant(
  collectionName: string,
  points: Array<{ id: string | number; vector: number[]; payload?: Record<string, unknown> }>
) {
  await qdrant.upsert(collectionName, {
    points,
  });
}

export async function searchQdrant(collectionName: string, vector: number[], topK = 5) {
  const res = await qdrant.search(collectionName, {
    vector,
    limit: topK,
  });
  return res;
}