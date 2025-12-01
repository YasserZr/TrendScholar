// src/components/dashboard/PaperCard.tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SavePaperButton } from "./SavePaperButton";
import type { FeedPaper } from "@/lib/dashboard";

interface PaperCardProps {
  paper: FeedPaper;
}

/**
 * Parse the summary JSON content to extract TL;DR
 */
function parseTldr(summaryContent: string | null): string | null {
  if (!summaryContent) return null;

  try {
    const parsed = JSON.parse(summaryContent);
    return parsed.tldr || null;
  } catch {
    // If not valid JSON, return the content as-is (legacy format)
    return summaryContent.length > 200
      ? summaryContent.substring(0, 200) + "..."
      : summaryContent;
  }
}

/**
 * Parse keywords from summary content
 */
function parseKeywords(summaryContent: string | null): string[] {
  if (!summaryContent) return [];

  try {
    const parsed = JSON.parse(summaryContent);
    return parsed.keywords || [];
  } catch {
    return [];
  }
}

/**
 * Format date relative to now
 */
function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export function PaperCard({ paper }: PaperCardProps) {
  const tldr = parseTldr(paper.summary?.content || null);
  const keywords = parseKeywords(paper.summary?.content || null);

  return (
    <Card className="group hover:shadow-md transition-shadow duration-200 hover:border-blue-500/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
              <Link href={`/papers/${paper.id}`} className="hover:underline">
                {paper.title}
              </Link>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {paper.authors.slice(0, 3).join(", ")}
              {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
            </p>
          </div>
          <SavePaperButton
            paperId={paper.id}
            initialSaved={paper.isSaved}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* TL;DR */}
        {tldr ? (
          <div className="mb-3">
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
              <span className="font-medium text-foreground">TL;DR:</span> {tldr}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {paper.abstract}
          </p>
        )}

        {/* Tags row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Topic tag */}
          {paper.topic && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {paper.topic.name}
            </span>
          )}

          {/* Keyword tags */}
          {keywords.slice(0, 3).map((keyword) => (
            <span
              key={keyword}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              {keyword}
            </span>
          ))}
        </div>

        {/* Footer with date and actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <span className="text-xs text-muted-foreground">
            {formatRelativeDate(paper.publishedAt)}
          </span>

          <div className="flex items-center gap-2">
            {paper.pdfUrl && (
              <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <a
                  href={paper.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  PDF
                </a>
              </Button>
            )}
            <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs">
              <Link href={`/papers/${paper.id}`}>View details</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
