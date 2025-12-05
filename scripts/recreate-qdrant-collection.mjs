// scripts/recreate-qdrant-collection.mjs
// Script to recreate the Qdrant collection with new dimensions for Gemini embeddings
// Run with: $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; node --env-file=.env.local scripts/recreate-qdrant-collection.mjs

import { QdrantClient } from "@qdrant/js-client-rest";

const qdrantUrl = process.env.QDRANT_URL;
const qdrantApiKey = process.env.QDRANT_API_KEY;

if (!qdrantUrl) {
  console.error("QDRANT_URL is not set");
  process.exit(1);
}

const qdrant = new QdrantClient({
  url: qdrantUrl,
  apiKey: qdrantApiKey,
});

const COLLECTION_NAME = "papers";
const NEW_DIMENSIONS = 768; // Gemini text-embedding-004 dimensions

async function recreateCollection() {
  console.log("🔄 Recreating Qdrant collection for Gemini embeddings...");
  console.log(`   Collection: ${COLLECTION_NAME}`);
  console.log(`   New dimensions: ${NEW_DIMENSIONS}`);

  try {
    // Check if collection exists
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

    if (exists) {
      console.log(`\n⚠️  Collection "${COLLECTION_NAME}" exists. Deleting...`);
      await qdrant.deleteCollection(COLLECTION_NAME);
      console.log("   Deleted successfully.");
    }

    // Create new collection with correct dimensions
    console.log(`\n📦 Creating collection with ${NEW_DIMENSIONS} dimensions...`);
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: NEW_DIMENSIONS,
        distance: "Cosine",
        on_disk: true,
      },
      optimizers_config: {
        memmap_threshold: 20000,
      },
      hnsw_config: {
        m: 16,
        ef_construct: 100,
      },
    });

    console.log("   Created successfully!");

    // Verify the collection
    const info = await qdrant.getCollection(COLLECTION_NAME);
    console.log(`\n✅ Collection info:`);
    console.log(`   - Name: ${info.name || COLLECTION_NAME}`);
    console.log(`   - Vector size: ${info.config?.params?.vectors?.size || NEW_DIMENSIONS}`);
    console.log(`   - Points count: ${info.points_count}`);

    console.log("\n🎉 Done! The Qdrant collection is ready for Gemini embeddings.");
    console.log("   Note: You'll need to re-generate embeddings for existing papers.");
    console.log("   Papers without embeddings won't appear in 'Related Papers' searches.");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

recreateCollection();
