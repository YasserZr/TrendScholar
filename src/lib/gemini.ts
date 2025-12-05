// src/lib/gemini.ts
// Google Gemini AI client for paper summarization and embeddings

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Model selection guide for academic summarization:
 * 
 * - gemini-pro: Good for complex papers, widely available
 * - gemini-1.5-pro-latest: Latest pro model
 * - gemini-1.5-flash-latest: Fast and cost-effective
 * 
 * Temperature settings:
 * - 0.1-0.3: More deterministic, factual. Best for academic summarization.
 * - 0.5-0.7: Balanced creativity. Use for generating keywords.
 * - 0.8+: More creative. Not recommended for academic content.
 */
export const SUMMARIZATION_CONFIG = {
  model: "gemini-2.5-flash" as const,
  temperature: 0.2,
  maxOutputTokens: 1500,
  // Token limits for context management
  maxInputTokens: 12000,
  maxAbstractLength: 4000,
  maxFullTextLength: 40000,
  maxContextLength: 8000,
} as const;

/**
 * Embedding configuration
 * 
 * text-embedding-004 is Google's latest embedding model
 * - 768 dimensions by default
 * - Good performance for academic text
 */
export const EMBEDDING_CONFIG = {
  model: "text-embedding-004" as const,
  dimensions: 768,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Client Setup
// ─────────────────────────────────────────────────────────────────────────────

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  if (process.env.NODE_ENV !== "production") {
    console.warn("GEMINI_API_KEY is not set. Gemini client will not work until it's provided.");
  }
}

export const genAI = new GoogleGenerativeAI(geminiApiKey || "");

// Safety settings - allow academic content
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Input for paper summarization
 */
export interface SummarizePaperInput {
  /** Paper title (required) */
  title: string;
  /** Paper abstract (required) */
  abstract: string;
  /** Full paper text if available (optional, will be truncated if too long) */
  fullText?: string;
  /** Related paper contexts for better understanding (optional) */
  relatedContexts?: RelatedContext[];
}

/**
 * Related paper context for RAG-style summarization
 */
export interface RelatedContext {
  title: string;
  abstract: string;
  relevanceScore?: number;
}

/**
 * Structured summary output
 */
export interface PaperSummary {
  /** One-paragraph TL;DR summary (2-4 sentences) */
  tldr: string;
  /** List of key contributions/findings (3-5 items) */
  contributions: string[];
  /** Relevant keywords for categorization (5-10 items) */
  keywords: string[];
}

/**
 * Full response including metadata
 */
export interface SummarizePaperResult {
  summary: PaperSummary;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Error types for summarization
 */
export class SummarizationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "SummarizationError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Truncate text to a maximum character length, preserving word boundaries
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  
  return lastSpace > maxLength * 0.8
    ? truncated.slice(0, lastSpace) + "..."
    : truncated + "...";
}

/**
 * Estimate token count (rough approximation: ~4 chars per token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Build the prompt for academic summarization
 */
function buildPrompt(input: SummarizePaperInput): string {
  const { title, abstract, fullText, relatedContexts } = input;

  let prompt = `You are an expert academic research assistant specializing in summarizing scholarly papers.

Analyze the following academic paper and provide a structured summary.

## Paper Information

**Title:** ${title}

**Abstract:**
${truncateText(abstract, SUMMARIZATION_CONFIG.maxAbstractLength)}`;

  // Add full text if available (truncated)
  if (fullText) {
    prompt += `

**Full Text (excerpt):**
${truncateText(fullText, SUMMARIZATION_CONFIG.maxFullTextLength)}`;
  }

  // Add related contexts for better understanding
  if (relatedContexts && relatedContexts.length > 0) {
    const contextText = relatedContexts
      .slice(0, 3) // Limit to 3 related papers
      .map((ctx, i) => `${i + 1}. "${ctx.title}": ${truncateText(ctx.abstract, 500)}`)
      .join("\n");

    prompt += `

## Related Papers (for context)
${truncateText(contextText, SUMMARIZATION_CONFIG.maxContextLength)}`;
  }

  prompt += `

## Required Output

Respond with a JSON object containing exactly these fields:
{
  "tldr": "A concise 2-4 sentence summary of the paper's main contribution and findings.",
  "contributions": ["Key contribution 1", "Key contribution 2", "Key contribution 3"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}

Rules:
- tldr: 2-4 sentences, focus on what the paper achieves and why it matters
- contributions: 3-5 bullet points of specific, concrete contributions
- keywords: 5-10 relevant terms for categorization (lowercase, no duplicates)

IMPORTANT: Respond ONLY with the JSON object, no markdown code blocks, no additional text, just the raw JSON.`;

  return prompt;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Summarization Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Summarize an academic paper using Google Gemini.
 * 
 * Features:
 * - Structured JSON output for TL;DR, contributions, and keywords
 * - Token limit management with automatic truncation
 * - Support for related paper contexts (RAG-style)
 * - Strict JSON parsing with validation
 */
export async function summarizePaperText(
  input: SummarizePaperInput
): Promise<SummarizePaperResult> {
  // Validate input
  if (!input.title?.trim()) {
    throw new SummarizationError("Paper title is required", "MISSING_TITLE");
  }
  if (!input.abstract?.trim()) {
    throw new SummarizationError("Paper abstract is required", "MISSING_ABSTRACT");
  }

  const prompt = buildPrompt(input);
  const estimatedInputTokens = estimateTokens(prompt);

  if (estimatedInputTokens > SUMMARIZATION_CONFIG.maxInputTokens) {
    console.warn(
      `[summarizePaperText] Input tokens (~${estimatedInputTokens}) exceed limit. Content will be truncated.`
    );
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: SUMMARIZATION_CONFIG.model,
      safetySettings,
      generationConfig: {
        temperature: SUMMARIZATION_CONFIG.temperature,
        maxOutputTokens: SUMMARIZATION_CONFIG.maxOutputTokens,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const content = response.text();
    
    if (!content) {
      throw new SummarizationError(
        "No response content from Gemini",
        "EMPTY_RESPONSE"
      );
    }

    // Parse and validate JSON response
    let parsed: unknown;
    try {
      // Clean up the response in case it has markdown code blocks
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      parsed = JSON.parse(cleanContent);
    } catch (parseError) {
      throw new SummarizationError(
        "Failed to parse JSON response from Gemini",
        "INVALID_JSON",
        parseError
      );
    }

    // Validate structure
    const summary = validateSummaryResponse(parsed);

    // Get usage metadata if available
    const usageMetadata = response.usageMetadata;

    return {
      summary,
      model: SUMMARIZATION_CONFIG.model,
      usage: {
        promptTokens: usageMetadata?.promptTokenCount ?? estimatedInputTokens,
        completionTokens: usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: usageMetadata?.totalTokenCount ?? estimatedInputTokens,
      },
    };

  } catch (error) {
    // Re-throw SummarizationError as-is
    if (error instanceof SummarizationError) {
      throw error;
    }

    // Handle Gemini API errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new SummarizationError(
      `Gemini API error: ${errorMessage}`,
      "GEMINI_ERROR",
      error
    );
  }
}

/**
 * Validate and normalize the summary response
 */
function validateSummaryResponse(data: unknown): PaperSummary {
  if (!data || typeof data !== "object") {
    throw new SummarizationError(
      "Invalid response structure",
      "INVALID_STRUCTURE"
    );
  }

  const obj = data as Record<string, unknown>;

  // Validate tldr
  if (typeof obj.tldr !== "string" || !obj.tldr.trim()) {
    throw new SummarizationError(
      "Missing or invalid 'tldr' in response",
      "INVALID_TLDR"
    );
  }

  // Validate contributions
  if (!Array.isArray(obj.contributions) || obj.contributions.length === 0) {
    throw new SummarizationError(
      "Missing or invalid 'contributions' in response",
      "INVALID_CONTRIBUTIONS"
    );
  }
  const contributions = obj.contributions
    .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
    .map((c) => c.trim());

  if (contributions.length === 0) {
    throw new SummarizationError(
      "No valid contributions in response",
      "INVALID_CONTRIBUTIONS"
    );
  }

  // Validate keywords
  if (!Array.isArray(obj.keywords) || obj.keywords.length === 0) {
    throw new SummarizationError(
      "Missing or invalid 'keywords' in response",
      "INVALID_KEYWORDS"
    );
  }
  const keywords = [...new Set(
    obj.keywords
      .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
      .map((k) => k.trim().toLowerCase())
  )];

  if (keywords.length === 0) {
    throw new SummarizationError(
      "No valid keywords in response",
      "INVALID_KEYWORDS"
    );
  }

  return {
    tldr: obj.tldr.trim(),
    contributions,
    keywords,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Embedding Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate embedding vector for text using Gemini
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text?.trim()) {
    throw new SummarizationError("Text is required for embedding", "EMPTY_TEXT");
  }

  try {
    const model = genAI.getGenerativeModel({ model: EMBEDDING_CONFIG.model });
    const result = await model.embedContent(text.trim());
    const embedding = result.embedding.values;

    if (!embedding || embedding.length === 0) {
      throw new SummarizationError(
        "Invalid embedding response from Gemini",
        "INVALID_EMBEDDING"
      );
    }

    return embedding;
  } catch (error) {
    if (error instanceof SummarizationError) throw error;
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new SummarizationError(
      `Failed to generate embedding: ${errorMessage}`,
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
    const model = genAI.getGenerativeModel({ model: EMBEDDING_CONFIG.model });
    
    // Process texts sequentially (Gemini doesn't have batch embedding API)
    const embeddings: number[][] = [];
    for (const text of texts) {
      const result = await model.embedContent(text.trim());
      embeddings.push(result.embedding.values);
    }
    
    return embeddings;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new SummarizationError(
      `Failed to generate batch embeddings: ${errorMessage}`,
      "BATCH_EMBEDDING_FAILED",
      error
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat Completion
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatCompletionInput {
  /** Conversation history */
  messages: ChatMessage[];
  /** Paper context (optional) */
  paperContext?: {
    title: string;
    abstract: string;
    summary?: string;
    authors?: string[];
  };
  /** Temperature for response generation (0.0-1.0) */
  temperature?: number;
  /** Maximum tokens in response */
  maxTokens?: number;
}

export interface ChatCompletionResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Generate chat completion with optional paper context
 */
export async function generateChatCompletion(
  input: ChatCompletionInput
): Promise<ChatCompletionResult> {
  if (!geminiApiKey) {
    throw new SummarizationError(
      "GEMINI_API_KEY is not configured",
      "MISSING_API_KEY"
    );
  }

  try {
    // Build system message with paper context if provided
    let systemMessage = "You are an expert AI assistant specializing in academic research and scientific papers. Provide detailed, accurate, and insightful responses about research papers, methodologies, findings, and their implications.";
    
    if (input.paperContext) {
      systemMessage += `\n\nCurrent Paper Context:\n`;
      systemMessage += `Title: ${input.paperContext.title}\n`;
      systemMessage += `Authors: ${input.paperContext.authors?.join(", ") || "Unknown"}\n`;
      systemMessage += `Abstract: ${input.paperContext.abstract}\n`;
      if (input.paperContext.summary) {
        systemMessage += `Summary: ${input.paperContext.summary}\n`;
      }
    }

    // Convert messages to Gemini format
    // Gemini uses a different chat format - we'll concatenate user/assistant messages
    const conversationText = input.messages
      .filter(msg => msg.role !== "system")
      .map(msg => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n\n");

    const prompt = `${systemMessage}\n\n${conversationText}\n\nAssistant:`;

    const model = genAI.getGenerativeModel({
      model: SUMMARIZATION_CONFIG.model,
      generationConfig: {
        temperature: input.temperature ?? 0.7,
        maxOutputTokens: input.maxTokens ?? 2048,
      },
      safetySettings,
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract token usage from response
    const usage = {
      promptTokens: response.usageMetadata?.promptTokenCount || 0,
      completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: response.usageMetadata?.totalTokenCount || 0,
    };

    return {
      content: text,
      usage,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new SummarizationError(
      `Failed to generate chat completion: ${errorMessage}`,
      "CHAT_COMPLETION_FAILED",
      error
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export default genAI;
