// src/components/dashboard/PaperFeed.tsx
import { PaperCard } from "./PaperCard";
import type { FeedPaper } from "@/lib/dashboard";

interface PaperFeedProps {
  papers: FeedPaper[];
  total: number;
}

export function PaperFeed({ papers, total }: PaperFeedProps) {
  if (papers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-card/50 p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg
            className="h-6 w-6 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No papers found</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Try adjusting your filters or follow some topics to see personalized
          recommendations.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Showing {papers.length} of {total} papers
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {papers.map((paper) => (
          <PaperCard key={paper.id} paper={paper} />
        ))}
      </div>
    </div>
  );
}
