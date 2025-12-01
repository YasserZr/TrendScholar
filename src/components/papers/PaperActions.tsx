// src/components/papers/PaperActions.tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  BookmarkIcon as BookmarkOutline,
  ArrowTopRightOnSquareIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolid } from "@heroicons/react/24/solid";

interface PaperActionsProps {
  paperId: string;
  arxivId: string;
  pdfUrl: string | null;
  initialSaved: boolean;
}

export function PaperActions({
  paperId,
  arxivId,
  pdfUrl,
  initialSaved,
}: PaperActionsProps) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  const handleToggleSave = async () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/papers/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paperId,
            action: isSaved ? "unsave" : "save",
          }),
        });

        if (response.ok) {
          setIsSaved(!isSaved);
        }
      } catch (error) {
        console.error("Failed to save paper:", error);
      }
    });
  };

  const arxivUrl = `https://arxiv.org/abs/${arxivId}`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant={isSaved ? "default" : "outline"}
        size="sm"
        onClick={handleToggleSave}
        disabled={isPending}
        className={isSaved ? "bg-blue-600 hover:bg-blue-700" : ""}
      >
        {isSaved ? (
          <BookmarkSolid className="h-4 w-4 mr-2" />
        ) : (
          <BookmarkOutline className="h-4 w-4 mr-2" />
        )}
        {isPending ? "Saving..." : isSaved ? "Saved" : "Save Paper"}
      </Button>

      <Button asChild variant="outline" size="sm">
        <a href={arxivUrl} target="_blank" rel="noopener noreferrer">
          <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
          View on arXiv
        </a>
      </Button>

      {pdfUrl && (
        <Button asChild variant="outline" size="sm">
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Download PDF
          </a>
        </Button>
      )}
    </div>
  );
}
