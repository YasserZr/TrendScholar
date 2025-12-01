// src/app/dashboard/loading.tsx
// Loading state for the dashboard route

import { Card, CardContent, CardHeader } from "@/components/ui/card";

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

function PaperCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-3">
        <div className="h-5 w-3/4 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
          <div className="h-3 w-5/6 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="flex gap-2 pt-2">
          <div className="h-6 w-16 bg-slate-200 rounded-full animate-pulse" />
          <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse" />
        </div>
      </div>
    </Card>
  );
}

export default function DashboardLoading() {
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
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-slate-100 rounded animate-pulse" />
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Filter bar skeleton */}
        <div className="flex gap-4 mb-6">
          <div className="h-10 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-48 bg-slate-200 rounded animate-pulse" />
        </div>

        {/* Paper feed */}
        <div className="space-y-4">
          <PaperCardSkeleton />
          <PaperCardSkeleton />
          <PaperCardSkeleton />
        </div>
      </main>
    </div>
  );
}
