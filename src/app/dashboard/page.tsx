import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Header, Footer } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { checkSubscription } from "@/lib/checkSubscription";
import {
  getFeedPapers,
  getDashboardStats,
  getAllTopics,
  getUserFollowedTopicIds,
  type TimeRange,
} from "@/lib/dashboard";
import { FilterBar, PaperFeed, StatsCards } from "@/components/dashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | TrendScholar",
  description: "Your personalized research dashboard",
};

interface DashboardPageProps {
  searchParams: Promise<{
    time?: string;
    topics?: string;
    page?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  // Server-side subscription check (includes auth check)
  const { user, plan, isProOrPlus, isFree, isAuthenticated } = await checkSubscription();

  // Redirect unauthenticated users to landing page
  if (!isAuthenticated || !user) {
    redirect("/landing");
  }

  // Parse search params
  const params = await searchParams;
  const timeRange = (params.time || "week") as TimeRange;
  const topicIds = params.topics ? params.topics.split(",").filter(Boolean) : [];
  const page = parseInt(params.page || "1", 10);

  // Fetch data in parallel
  const [feedResult, stats, allTopics, followedTopicIds] = await Promise.all([
    getFeedPapers({
      userId: user.id,
      timeRange,
      topicIds: topicIds.length > 0 ? topicIds : undefined,
      page,
      limit: 12,
    }),
    getDashboardStats(user.id),
    getAllTopics(),
    getUserFollowedTopicIds(user.id),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Upgrade Banner for FREE users */}
        {isFree && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  Upgrade to unlock premium features
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Get unlimited summaries, advanced search, and more with PRO or PLUS.
                </p>
              </div>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/pricing">View Plans</Link>
              </Button>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {user.name || user.email}! Here&apos;s your research overview.
          </p>
          {/* Plan badge */}
          <div className="mt-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                plan === "PRO"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  : plan === "PLUS"
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
              }`}
            >
              {plan} Plan
            </span>
            {isProOrPlus && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Premium
              </span>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={stats} plan={plan || "FREE"} />

        {/* Filters */}
        <Suspense fallback={<div className="h-10 bg-muted/50 rounded animate-pulse mb-6" />}>
          <FilterBar
            topics={allTopics}
            followedTopicIds={followedTopicIds}
            currentTimeRange={timeRange}
            currentTopicIds={topicIds}
          />
        </Suspense>

        {/* Paper Feed */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Your Feed</h2>
          <PaperFeed papers={feedResult.papers} total={feedResult.total} />

          {/* Pagination */}
          {feedResult.total > 12 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {page > 1 && (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/dashboard?time=${timeRange}${topicIds.length > 0 ? `&topics=${topicIds.join(",")}` : ""}&page=${page - 1}`}
                  >
                    Previous
                  </Link>
                </Button>
              )}
              <span className="text-sm text-muted-foreground px-4">
                Page {page} of {Math.ceil(feedResult.total / 12)}
              </span>
              {page < Math.ceil(feedResult.total / 12) && (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/dashboard?time=${timeRange}${topicIds.length > 0 ? `&topics=${topicIds.join(",")}` : ""}&page=${page + 1}`}
                  >
                    Next
                  </Link>
                </Button>
              )}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/explore"
              className="rounded-lg border border-border/40 bg-card p-4 hover:border-blue-500 transition-colors"
            >
              <h3 className="font-medium">Explore Papers</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Discover trending research in your field
              </p>
            </Link>

            {isProOrPlus ? (
              <Link
                href="/summarize"
                className="rounded-lg border border-border/40 bg-card p-4 hover:border-blue-500 transition-colors"
              >
                <h3 className="font-medium">Generate Summary</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  AI-powered paper summarization
                </p>
              </Link>
            ) : (
              <Link
                href="/pricing"
                className="rounded-lg border border-dashed border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 p-4 hover:border-blue-500 transition-colors"
              >
                <h3 className="font-medium text-blue-700 dark:text-blue-300">
                  🔒 Generate Summary
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Upgrade to PRO to unlock
                </p>
              </Link>
            )}

            <Link
              href="/profile"
              className="rounded-lg border border-border/40 bg-card p-4 hover:border-blue-500 transition-colors"
            >
              <h3 className="font-medium">Profile Settings</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your account and preferences
              </p>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
