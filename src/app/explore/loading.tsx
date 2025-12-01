// src/app/explore/loading.tsx
// Loading state for the explore route

import { Card, CardContent, CardHeader } from "@/components/ui/card";

function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className={`${height} bg-slate-100 rounded animate-pulse`} />
      </CardContent>
    </Card>
  );
}

function TopicListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-28 bg-slate-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-12 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function ExploreLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header skeleton */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-8 bg-slate-200 rounded-full animate-pulse" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page title */}
        <div className="mb-8">
          <div className="h-8 w-40 bg-slate-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-72 bg-slate-100 rounded animate-pulse" />
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartSkeleton height="h-80" />
          <ChartSkeleton height="h-80" />
        </div>

        {/* Keyword cloud and topics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartSkeleton height="h-64" />
          </div>
          <TopicListSkeleton />
        </div>
      </main>
    </div>
  );
}
