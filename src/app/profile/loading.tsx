// src/app/profile/loading.tsx
// Loading state for the profile route

import { Card, CardContent, CardHeader } from "@/components/ui/card";

function FormFieldSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
      <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
    </div>
  );
}

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header skeleton */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-8 bg-slate-200 rounded-full animate-pulse" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page title */}
        <div className="mb-8">
          <div className="h-8 w-32 bg-slate-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-56 bg-slate-100 rounded animate-pulse" />
        </div>

        {/* Usage limits */}
        <Card className="mb-6">
          <CardHeader>
            <div className="h-6 w-28 bg-slate-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="h-8 w-16 bg-slate-200 rounded animate-pulse mx-auto mb-2" />
                <div className="h-4 w-20 bg-slate-100 rounded animate-pulse mx-auto" />
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="h-8 w-16 bg-slate-200 rounded animate-pulse mx-auto mb-2" />
                <div className="h-4 w-20 bg-slate-100 rounded animate-pulse mx-auto" />
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="h-8 w-16 bg-slate-200 rounded animate-pulse mx-auto mb-2" />
                <div className="h-4 w-20 bg-slate-100 rounded animate-pulse mx-auto" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile form */}
        <Card className="mb-6">
          <CardHeader>
            <div className="h-6 w-36 bg-slate-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-4">
            <FormFieldSkeleton />
            <FormFieldSkeleton />
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <div className="h-6 w-28 bg-slate-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
              <div className="h-6 w-12 bg-slate-200 rounded-full animate-pulse" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-4 w-36 bg-slate-200 rounded animate-pulse" />
              <div className="h-6 w-12 bg-slate-200 rounded-full animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
