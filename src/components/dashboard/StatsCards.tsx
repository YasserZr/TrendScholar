// src/components/dashboard/StatsCards.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookmarkIcon,
  SparklesIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import type { DashboardStats } from "@/lib/dashboard";

interface StatsCardsProps {
  stats: DashboardStats;
  plan: "FREE" | "PRO" | "PLUS";
}

const planLimits = {
  FREE: { saved: 10, summaries: 5, topics: 1 },
  PRO: { saved: 100, summaries: 10, topics: 10 },
  PLUS: { saved: Infinity, summaries: 50, topics: Infinity },
};

export function StatsCards({ stats, plan }: StatsCardsProps) {
  const limits = planLimits[plan];

  const statItems = [
    {
      label: "Saved Papers",
      value: stats.savedPapersCount,
      limit: limits.saved,
      icon: BookmarkIcon,
      color: "blue",
    },
    {
      label: "Summaries Generated",
      value: stats.summariesCount,
      limit: limits.summaries,
      suffix: "/day",
      icon: SparklesIcon,
      color: "purple",
    },
    {
      label: "Topics Following",
      value: stats.topicsFollowedCount,
      limit: limits.topics,
      icon: TagIcon,
      color: "green",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-8">
      {statItems.map((stat) => {
        const percentage =
          stat.limit === Infinity ? 0 : (stat.value / stat.limit) * 100;
        const isNearLimit = percentage >= 80;

        return (
          <Card key={stat.label} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div
                className={`p-2 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}
              >
                <stat.icon
                  className={`h-4 w-4 text-${stat.color}-600 dark:text-${stat.color}-400`}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{stat.value}</span>
                {stat.limit !== Infinity && (
                  <span className="text-sm text-muted-foreground">
                    / {stat.limit}
                    {stat.suffix || ""}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {stat.limit !== Infinity && (
                <div className="mt-3">
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isNearLimit ? "bg-orange-500" : "bg-blue-600"
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  {isNearLimit && plan === "FREE" && (
                    <p className="text-xs text-orange-500 mt-1">
                      Approaching limit
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
