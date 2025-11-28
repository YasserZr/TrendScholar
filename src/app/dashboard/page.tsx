import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Header, Footer } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | TrendScholar",
  description: "Your personalized research dashboard",
};

export default async function DashboardPage() {
  // Server-side authentication check
  const session = await getServerSession(authOptions);

  // Redirect unauthenticated users to landing page
  if (!session?.user) {
    redirect("/landing");
  }

  const { user } = session;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {user.name || user.email}! Here&apos;s your research overview.
          </p>
          {/* Plan badge */}
          <div className="mt-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user.plan === "PRO"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  : user.plan === "ENTERPRISE"
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
              }`}
            >
              {user.plan} Plan
            </span>
            <span
              className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user.subscriptionStatus === "active"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
              }`}
            >
              {user.subscriptionStatus}
            </span>
          </div>
        </div>

        {/* Dashboard Grid Placeholder */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Stats Card */}
          <div className="rounded-lg border border-border/40 bg-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground">
              Saved Papers
            </h3>
            <p className="text-3xl font-bold mt-2">0</p>
          </div>

          <div className="rounded-lg border border-border/40 bg-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground">
              Summaries Generated
            </h3>
            <p className="text-3xl font-bold mt-2">0</p>
          </div>

          <div className="rounded-lg border border-border/40 bg-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground">
              Topics Following
            </h3>
            <p className="text-3xl font-bold mt-2">0</p>
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="rounded-lg border border-border/40 bg-card p-6">
            <p className="text-muted-foreground text-center py-8">
              No recent activity yet. Start exploring papers to see your
              activity here.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
