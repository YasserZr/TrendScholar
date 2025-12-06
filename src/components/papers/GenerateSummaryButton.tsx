// src/components/papers/GenerateSummaryButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { PaperSummary } from "./PaperSummary";
import type { ParsedSummary } from "@/lib/papers";

interface GenerateSummaryButtonProps {
  paperId: string;
}

export function GenerateSummaryButton({ paperId }: GenerateSummaryButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedSummary, setGeneratedSummary] = useState<ParsedSummary | null>(null);

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        if (data.code === "GEMINI_ERROR" || data.code === "OPENAI_ERROR" || data.code === "MODEL_ERROR") {
          setError("AI service temporarily unavailable. Please try again later.");
        } else if (data.code === "RATE_LIMIT_EXCEEDED") {
          setError("Daily summary limit reached. Try again tomorrow.");
        } else if (data.code === "UPGRADE_REQUIRED") {
          setError("Upgrade to Plus to generate summaries.");
        } else {
          setError(data.error || "Failed to generate summary");
        }
        return;
      }

      // Success - store the summary in state and display it
      if (data.success && data.summary) {
        setGeneratedSummary({
          id: data.summary.id,
          tldr: data.summary.tldr,
          contributions: data.summary.contributions,
          keywords: data.summary.keywords,
          rawContent: "", // Not needed for display
          model: data.summary.model,
          createdAt: new Date(data.summary.createdAt),
        });
      }
    } catch (err) {
      console.error("Failed to generate summary:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // If summary has been generated, display it
  if (generatedSummary) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          AI Summary
        </h2>
        <PaperSummary summary={generatedSummary} />
        <p className="text-xs text-muted-foreground mt-4 text-center">
          💡 This summary is generated fresh each time. Refresh the page to generate a new one.
        </p>
      </div>
    );
  }

  // Show the generate button
  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        onClick={handleGenerateSummary}
        disabled={isLoading}
        className="gap-2"
      >
        <SparklesIcon className="h-4 w-4" />
        {isLoading ? "Generating..." : "Generate Summary"}
      </Button>
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
