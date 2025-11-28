// src/lib/openai.ts
import OpenAI from "openai";

/**
 * Simple configured OpenAI client.
 * Expects `OPENAI_API_KEY` in environment variables.
 *
 * Note: the OpenAI Node client works in Node runtimes; for Edge you may
 * use direct fetch to the REST API with the API key as a bearer token.
 */
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  if (process.env.NODE_ENV !== "production") {
    console.warn("OPENAI_API_KEY is not set. OpenAI client will not work until it's provided.");
  }
}

export const openai = new OpenAI({
  apiKey: openaiApiKey,
});

export default openai;