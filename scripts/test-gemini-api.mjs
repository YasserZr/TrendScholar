// scripts/test-gemini-api.mjs
// Test script to verify Gemini API key is working
// Run with: $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; node --env-file=.env.local scripts/test-gemini-api.mjs

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY is not set in .env.local");
  process.exit(1);
}

console.log("🔑 API Key found:", apiKey.substring(0, 20) + "...");
console.log("\n🧪 Testing Gemini API...\n");

async function testGemini() {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Test 1: Text generation
    console.log("1️⃣ Testing text generation (gemini-2.5-flash)...");
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 100,
      },
    });
    
    const result = await model.generateContent("Say 'Hello, I am working!' in JSON format with a 'message' field.");
    const response = result.response;
    console.log("   Response:", response.text());
    console.log("   ✅ Text generation works!\n");
    
    // Test 2: Embedding generation
    console.log("2️⃣ Testing embeddings (text-embedding-004)...");
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const embeddingResult = await embeddingModel.embedContent("This is a test paper about machine learning.");
    const embedding = embeddingResult.embedding.values;
    console.log("   Embedding dimensions:", embedding.length);
    console.log("   First 5 values:", embedding.slice(0, 5).map(v => v.toFixed(4)).join(", "));
    console.log("   ✅ Embeddings work!\n");
    
    console.log("🎉 All tests passed! Gemini API is configured correctly.");
    
  } catch (error) {
    console.error("❌ Error testing Gemini API:");
    if (error.message) {
      console.error("   Message:", error.message);
    }
    if (error.status) {
      console.error("   Status:", error.status);
    }
    if (error.errorDetails) {
      console.error("   Details:", JSON.stringify(error.errorDetails, null, 2));
    }
    console.error("\n   Full error:", error);
    process.exit(1);
  }
}

testGemini();
