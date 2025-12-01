// src/components/explore/TopicDetail.tsx
"use client";

import Link from "next/link";
import { TrendChart } from "./TrendChart";
import { KeywordCloud } from "./KeywordCloud";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

interface TrendDataPoint {
  date: string;
  count: number;
}

interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  keywords: string[];
  paperCount: number;
  trendData: TrendDataPoint[] | null;
}

interface TopicDetailProps {
  topic: Topic;
  onKeywordClick?: (keyword: string) => void;
}

export function TopicDetail({ topic, onKeywordClick }: TopicDetailProps) {
  // Calculate growth rate
  const getGrowthRate = () => {
    if (!topic.trendData || topic.trendData.length < 2) return null;

    const recent = topic.trendData.slice(-2);
    const prev = recent[0]?.count || 0;
    const current = recent[1]?.count || 0;

    if (prev === 0) return null;

    const rate = ((current - prev) / prev) * 100;
    return rate;
  };

  const growthRate = getGrowthRate();

  // Convert keywords to word cloud format
  const keywordData = topic.keywords.map((word, index) => ({
    word,
    count: topic.keywords.length - index, // Higher weight for earlier keywords
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold">{topic.name}</h3>
          {topic.description && (
            <p className="text-muted-foreground mt-1">{topic.description}</p>
          )}
        </div>
        <Button asChild className="shrink-0">
          <Link href={`/dashboard?topics=${topic.id}`}>
            View Papers
          </Link>
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <DocumentTextIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{topic.paperCount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Papers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {growthRate !== null ? (
                    <span className={growthRate >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {growthRate >= 0 ? "+" : ""}
                      {growthRate.toFixed(1)}%
                    </span>
                  ) : (
                    "—"
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Monthly Growth</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <TagIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{topic.keywords.length}</p>
                <p className="text-xs text-muted-foreground">Keywords</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      {topic.trendData && topic.trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Publication Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={topic.trendData} topicName={topic.name} />
          </CardContent>
        </Card>
      )}

      {/* Keywords */}
      {topic.keywords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <KeywordCloud keywords={keywordData} onKeywordClick={onKeywordClick} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
