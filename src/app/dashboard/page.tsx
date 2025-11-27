import { Header, Footer } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | TrendScholar",
  description: "Your personalized research dashboard",
};

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here&apos;s your research overview.
          </p>
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
