"use client";

// src/app/papers/[id]/error.tsx
// Error boundary for the paper detail route

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, RefreshCw, ArrowLeft, Search } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PaperError({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        error_boundary: "paper-detail",
        page: "papers/[id]",
      },
      extra: {
        digest: error.digest,
      },
    });
  }, [error]);

  const isNotFound = error.message?.toLowerCase().includes("not found");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-slate-600" />
          </div>
          <CardTitle className="text-2xl">
            {isNotFound ? "Paper Not Found" : "Error Loading Paper"}
          </CardTitle>
          <CardDescription>
            {isNotFound
              ? "This paper may have been removed or the link is incorrect."
              : "We couldn't load this paper. Please try again."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV !== "production" && !isNotFound && (
            <div className="bg-slate-100 rounded-lg p-4 overflow-auto max-h-40">
              <p className="text-sm font-mono text-slate-700">{error.message}</p>
            </div>
          )}
          <div className="flex gap-3">
            {!isNotFound && (
              <Button onClick={reset} variant="default" className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
            <Button asChild variant="outline" className="flex-1">
              <Link href="/explore">
                <Search className="w-4 h-4 mr-2" />
                Explore Papers
              </Link>
            </Button>
            <Button asChild variant="ghost" className="flex-1">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
