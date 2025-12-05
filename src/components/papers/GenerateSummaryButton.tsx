// src/components/papers/GenerateSummaryButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SparklesIcon } from "@heroicons/react/24/outline";

interface GenerateSummaryButtonProps {
  paperId: string;
}

export function GenerateSummaryButton({ paperId }: GenerateSummaryButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
        if (data.code === "OPENAI_ERROR" || data.code === "MODEL_ERROR") {
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

      // Success - refresh the page to show the new summary
      router.refresh();
    } catch (err) {
      console.error("Failed to generate summary:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
