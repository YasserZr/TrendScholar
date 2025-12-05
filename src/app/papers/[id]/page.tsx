// src/app/papers/[id]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { AuthHeader, Footer } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PaperActions, PaperSummary, RelatedPapers } from "@/components/papers";
import { getPaperById, getRelatedPapers, isPaperSavedByUser } from "@/lib/papers";
import { authOptions } from "@/lib/auth";
import type { Metadata } from "next";
import {
  CalendarIcon,
  UserGroupIcon,
  TagIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";

interface PaperPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Generate metadata for the paper page
 */
export async function generateMetadata({
  params,
}: PaperPageProps): Promise<Metadata> {
  const { id } = await params;
  const paper = await getPaperById(id);

  if (!paper) {
    return {
      title: "Paper Not Found | TrendScholar",
    };
  }

  const description = paper.summary?.tldr || paper.abstract.slice(0, 160);

  return {
    title: `${paper.title} | TrendScholar`,
    description,
    openGraph: {
      title: paper.title,
      description,
      type: "article",
      publishedTime: paper.publishedAt.toISOString(),
      authors: paper.authors,
    },
    twitter: {
      card: "summary_large_image",
      title: paper.title,
      description,
    },
  };
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

/**
 * Related papers section with Suspense
 */
async function RelatedPapersSection({ paperId }: { paperId: string }) {
  const paper = await getPaperById(paperId);
  if (!paper) return null;

  const relatedPapers = await getRelatedPapers(paper, 5);
  return <RelatedPapers papers={relatedPapers} />;
}

/**
 * Loading skeleton for related papers
 */
function RelatedPapersSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Related Papers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
            <div className="h-3 bg-muted rounded w-full mb-1" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default async function PaperPage({ params }: PaperPageProps) {
  const { id } = await params;
  const paper = await getPaperById(id);

  if (!paper) {
    notFound();
  }

  // Check if user has saved this paper
  const session = await getServerSession(authOptions);
  const isSaved = session?.user?.id
    ? await isPaperSavedByUser(paper.id, session.user.id)
    : false;

  return (
    <div className="flex min-h-screen flex-col">
      <AuthHeader />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/explore" className="hover:text-foreground transition-colors">
            Explore
          </Link>
          <span>/</span>
          {paper.topic && (
            <>
              <Link
                href={`/dashboard?topics=${paper.topic.id}`}
                className="hover:text-foreground transition-colors"
              >
                {paper.topic.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground truncate max-w-xs">
            {paper.arxivId}
          </span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Main content */}
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight mb-4">
                {paper.title}
              </h1>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{formatDate(paper.publishedAt)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <UserGroupIcon className="h-4 w-4" />
                  <span>
                    {paper.authors.length} author{paper.authors.length !== 1 && "s"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BookOpenIcon className="h-4 w-4" />
                  <span>{paper.savedCount} saves</span>
                </div>
                {paper.topic && (
                  <Link
                    href={`/dashboard?topics=${paper.topic.id}`}
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <TagIcon className="h-4 w-4" />
                    <span>{paper.topic.name}</span>
                  </Link>
                )}
              </div>

              {/* Actions */}
              <PaperActions
                paperId={paper.id}
                arxivId={paper.arxivId}
                pdfUrl={paper.pdfUrl}
                initialSaved={isSaved}
              />
            </div>

            {/* Authors */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Authors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {paper.authors.map((author, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-sm bg-muted hover:bg-muted/80 transition-colors"
                    >
                      {author}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Summary */}
            {paper.summary ? (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  AI Summary
                </h2>
                <PaperSummary summary={paper.summary} />
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    No AI summary available for this paper yet.
                  </p>
                  {session?.user ? (
                    <Button asChild>
                      <Link href={`/api/summarize?paperId=${paper.id}`}>
                        Generate Summary
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild variant="outline">
                      <Link href="/auth/signin">Sign in to generate</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Abstract */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Abstract</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {paper.abstract}
                </p>
              </CardContent>
            </Card>

            {/* arXiv info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Paper Info</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">arXiv ID</dt>
                    <dd className="font-mono">{paper.arxivId}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Published</dt>
                    <dd>{formatDate(paper.publishedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Added to TrendScholar</dt>
                    <dd>{formatDate(paper.createdAt)}</dd>
                  </div>
                  {paper.topic && (
                    <div>
                      <dt className="text-muted-foreground">Topic</dt>
                      <dd>{paper.topic.name}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {/* Related Papers */}
            <Suspense fallback={<RelatedPapersSkeleton />}>
              <RelatedPapersSection paperId={paper.id} />
            </Suspense>

            {/* Quick links */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <a
                  href={`https://arxiv.org/abs/${paper.arxivId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 -mx-2 rounded-md hover:bg-muted text-sm transition-colors"
                >
                  <span>arXiv Abstract</span>
                  <span className="text-muted-foreground">↗</span>
                </a>
                {paper.pdfUrl && (
                  <a
                    href={paper.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 -mx-2 rounded-md hover:bg-muted text-sm transition-colors"
                  >
                    <span>PDF Download</span>
                    <span className="text-muted-foreground">↗</span>
                  </a>
                )}
                <a
                  href={`https://scholar.google.com/scholar?q=${encodeURIComponent(paper.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 -mx-2 rounded-md hover:bg-muted text-sm transition-colors"
                >
                  <span>Google Scholar</span>
                  <span className="text-muted-foreground">↗</span>
                </a>
                <a
                  href={`https://www.semanticscholar.org/search?q=${encodeURIComponent(paper.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 -mx-2 rounded-md hover:bg-muted text-sm transition-colors"
                >
                  <span>Semantic Scholar</span>
                  <span className="text-muted-foreground">↗</span>
                </a>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
