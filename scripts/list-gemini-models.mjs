// scripts/list-gemini-models.mjs
// List available Gemini models
// Run with: $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; node --env-file=.env.local scripts/list-gemini-models.mjs

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY is not set");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    console.log("📋 Fetching available Gemini models...\n");
    
    // This method lists available models
    const models = await genAI.listModels();
    
    console.log(`Found ${models.length} models:\n`);
    
    models.forEach(model => {
      console.log(`Model: ${model.name}`);
      console.log(`  Display Name: ${model.displayName || 'N/A'}`);
      console.log(`  Description: ${model.description || 'N/A'}`);
      console.log(`  Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
      console.log("");
    });
    
  } catch (error) {
    console.error("❌ Error listing models:");
    console.error(error);
    process.exit(1);
  }
}

listModels();
