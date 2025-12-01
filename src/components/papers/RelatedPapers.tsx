// src/components/papers/RelatedPapers.tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RelatedPaper } from "@/lib/papers";

interface RelatedPapersProps {
  papers: RelatedPaper[];
}

export function RelatedPapers({ papers }: RelatedPapersProps) {
  if (papers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Related Papers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No related papers found. Vector search may not be configured.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Related Papers</CardTitle>
        <p className="text-xs text-muted-foreground">
          Based on semantic similarity
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {papers.map((paper) => (
          <Link
            key={paper.id}
            href={`/papers/${paper.arxivId}`}
            className="block group"
          >
            <div className="p-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors">
              <h4 className="text-sm font-medium line-clamp-2 group-hover:text-blue-600 transition-colors">
                {paper.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {paper.abstract.slice(0, 150)}...
              </p>
              <div className="flex items-center gap-2 mt-2">
                {paper.topic && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    {paper.topic.name}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {Math.round(paper.score * 100)}% match
                </span>
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
