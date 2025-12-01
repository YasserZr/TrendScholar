// src/lib/openai.ts
import OpenAI from "openai";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Model selection guide for academic summarization:
 * 
 * - gpt-4o: Best quality, highest cost. Use for complex papers or premium users.
 * - gpt-4o-mini: Good balance of quality/cost. Recommended default.
 * - gpt-3.5-turbo: Fast and cheap, but lower quality for technical content.
 * 
 * Temperature settings:
 * - 0.1-0.3: More deterministic, factual. Best for academic summarization.
 * - 0.5-0.7: Balanced creativity. Use for generating keywords.
 * - 0.8+: More creative. Not recommended for academic content.
 */
export const SUMMARIZATION_CONFIG = {
  model: "gpt-4o-mini" as const,
  temperature: 0.2,
  maxTokens: 1500,
  // Token limits for context management
  maxInputTokens: 12000, // Leave headroom for response
  maxAbstractLength: 4000, // ~1000 tokens
  maxFullTextLength: 40000, // ~10000 tokens
  maxContextLength: 8000, // ~2000 tokens for related papers
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Client Setup
// ─────────────────────────────────────────────────────────────────────────────

const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  if (process.env.NODE_ENV !== "production") {
    console.warn("OPENAI_API_KEY is not set. OpenAI client will not work until it's provided.");
  }
}

export const openai = new OpenAI({
  apiKey: openaiApiKey,
});

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
 * Estimate token count (rough approximation: ~4 chars per token for English)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Build the system prompt for academic summarization
 */
function buildSystemPrompt(): string {
  return `You are an expert academic research assistant specializing in summarizing scholarly papers.

Your task is to analyze academic papers and provide structured summaries in JSON format.

Guidelines:
- Be precise and technically accurate
- Use clear, accessible language while preserving domain-specific terminology
- Focus on novel contributions and significance
- Extract keywords that would help categorize the paper

You MUST respond with valid JSON only, no additional text.`;
}

/**
 * Build the user prompt with paper content and optional context
 */
function buildUserPrompt(input: SummarizePaperInput): string {
  const { title, abstract, fullText, relatedContexts } = input;

  let prompt = `Analyze the following academic paper and provide a structured summary.

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

Respond ONLY with the JSON object, no markdown code blocks or additional text.`;

  return prompt;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Summarization Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Summarize an academic paper using OpenAI Chat Completions.
 * 
 * Features:
 * - Structured JSON output for TL;DR, contributions, and keywords
 * - Token limit management with automatic truncation
 * - Support for related paper contexts (RAG-style)
 * - Strict JSON parsing with validation
 * 
 * @param input - Paper content and optional related contexts
 * @returns Structured summary with usage metadata
 * 
 * @example
 * ```typescript
 * const result = await summarizePaperText({
 *   title: "Attention Is All You Need",
 *   abstract: "The dominant sequence transduction models...",
 *   relatedContexts: [
 *     { title: "BERT: Pre-training...", abstract: "..." }
 *   ]
 * });
 * 
 * console.log(result.summary.tldr);
 * // "This paper introduces the Transformer architecture..."
 * console.log(result.summary.contributions);
 * // ["Self-attention mechanism", "Parallelizable training", ...]
 * console.log(result.summary.keywords);
 * // ["transformer", "attention", "nlp", "sequence-to-sequence", ...]
 * ```
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

  // Check token limits
  const userPrompt = buildUserPrompt(input);
  const estimatedInputTokens = estimateTokens(buildSystemPrompt() + userPrompt);

  if (estimatedInputTokens > SUMMARIZATION_CONFIG.maxInputTokens) {
    console.warn(
      `[summarizePaperText] Input tokens (~${estimatedInputTokens}) exceed limit. Content will be truncated.`
    );
  }

  try {
    // Call OpenAI Chat Completions
    const completion = await openai.chat.completions.create({
      model: SUMMARIZATION_CONFIG.model,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: userPrompt },
      ],
      temperature: SUMMARIZATION_CONFIG.temperature,
      max_tokens: SUMMARIZATION_CONFIG.maxTokens,
      // Request JSON output format (supported by gpt-4o and gpt-4o-mini)
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new SummarizationError(
        "No response content from OpenAI",
        "EMPTY_RESPONSE"
      );
    }

    // Parse and validate JSON response
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      throw new SummarizationError(
        "Failed to parse JSON response from OpenAI",
        "INVALID_JSON",
        parseError
      );
    }

    // Validate structure
    const summary = validateSummaryResponse(parsed);

    return {
      summary,
      model: SUMMARIZATION_CONFIG.model,
      usage: {
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
        totalTokens: completion.usage?.total_tokens ?? 0,
      },
    };

  } catch (error) {
    // Re-throw SummarizationError as-is
    if (error instanceof SummarizationError) {
      throw error;
    }

    // Handle OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      throw new SummarizationError(
        `OpenAI API error: ${error.message}`,
        `OPENAI_${error.status}`,
        error
      );
    }

    // Unknown error
    throw new SummarizationError(
      "Unexpected error during summarization",
      "UNKNOWN_ERROR",
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
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export default openai;