// src/app/papers/[id]/loading.tsx
// Loading state for the paper detail route

import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function PaperLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header skeleton */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-8 bg-slate-200 rounded-full animate-pulse" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <div className="h-10 w-24 bg-slate-200 rounded animate-pulse mb-6" />

        {/* Paper header */}
        <div className="mb-8">
          <div className="h-8 w-full bg-slate-200 rounded animate-pulse mb-2" />
          <div className="h-8 w-3/4 bg-slate-200 rounded animate-pulse mb-4" />
          
          {/* Authors */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="h-6 w-32 bg-slate-100 rounded animate-pulse" />
            <div className="h-6 w-28 bg-slate-100 rounded animate-pulse" />
            <div className="h-6 w-36 bg-slate-100 rounded animate-pulse" />
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4">
            <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-8">
          <div className="h-10 w-28 bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-24 bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-slate-200 rounded animate-pulse" />
        </div>

        {/* Abstract */}
        <Card className="mb-6">
          <CardHeader>
            <div className="h-6 w-24 bg-slate-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-4/5 bg-slate-100 rounded animate-pulse" />
          </CardContent>
        </Card>

        {/* AI Summary */}
        <Card className="mb-6">
          <CardHeader>
            <div className="h-6 w-28 bg-slate-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
            </div>
            <div className="mt-6 space-y-2">
              <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="h-6 w-24 bg-slate-100 rounded-full animate-pulse" />
                <div className="h-6 w-28 bg-slate-100 rounded-full animate-pulse" />
                <div className="h-6 w-20 bg-slate-100 rounded-full animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Related papers */}
        <Card>
          <CardHeader>
            <div className="h-6 w-36 bg-slate-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border border-slate-200 rounded-lg">
                <div className="h-5 w-3/4 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse" />
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
