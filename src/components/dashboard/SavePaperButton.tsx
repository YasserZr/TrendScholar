// src/components/dashboard/SavePaperButton.tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { BookmarkIcon as BookmarkOutline } from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolid } from "@heroicons/react/24/solid";

interface SavePaperButtonProps {
  paperId: string;
  initialSaved: boolean;
}

export function SavePaperButton({ paperId, initialSaved }: SavePaperButtonProps) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/papers/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paperId, action: isSaved ? "unsave" : "save" }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to update");
        }

        setIsSaved(!isSaved);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        // Revert on error (optional: show toast instead)
        setTimeout(() => setError(null), 3000);
      }
    });
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${isSaved ? "text-blue-600" : "text-muted-foreground"} hover:text-blue-600`}
        onClick={handleToggle}
        disabled={isPending}
        title={isSaved ? "Remove from saved" : "Save paper"}
      >
        {isSaved ? (
          <BookmarkSolid className="h-5 w-5" />
        ) : (
          <BookmarkOutline className="h-5 w-5" />
        )}
      </Button>
      {error && (
        <span className="absolute -bottom-6 right-0 text-xs text-red-500 whitespace-nowrap">
          {error}
        </span>
      )}
    </div>
  );
}
