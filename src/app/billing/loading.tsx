// src/app/billing/loading.tsx
// Loading state for the billing route

import { Card, CardContent, CardHeader } from "@/components/ui/card";

function PlanCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="h-6 w-20 bg-slate-200 rounded animate-pulse" />
        <div className="h-10 w-24 bg-slate-200 rounded animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-slate-100 rounded animate-pulse" />
          <div className="h-4 w-4/5 bg-slate-100 rounded animate-pulse" />
          <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="h-10 w-full bg-slate-200 rounded animate-pulse mt-4" />
      </div>
    </Card>
  );
}

export default function BillingLoading() {
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
        {/* Page title */}
        <div className="mb-8 text-center">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mx-auto mb-2" />
          <div className="h-4 w-72 bg-slate-100 rounded animate-pulse mx-auto" />
        </div>

        {/* Current plan */}
        <Card className="mb-8">
          <CardHeader>
            <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="h-10 w-32 bg-slate-200 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>

        {/* Plan comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PlanCardSkeleton />
          <PlanCardSkeleton />
          <PlanCardSkeleton />
        </div>
      </main>
    </div>
  );
}
