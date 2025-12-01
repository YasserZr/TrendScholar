// src/components/explore/TopicList.tsx
"use client";

import { ChevronRightIcon, FireIcon } from "@heroicons/react/24/outline";

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

interface TopicListProps {
  topics: Topic[];
  selectedTopicId?: string;
  onTopicSelect: (topic: Topic) => void;
  className?: string;
}

// Calculate trend direction (up, down, stable)
function getTrendDirection(trendData: TrendDataPoint[] | null): "up" | "down" | "stable" {
  if (!trendData || trendData.length < 2) return "stable";
  
  const recent = trendData.slice(-3);
  const first = recent[0]?.count || 0;
  const last = recent[recent.length - 1]?.count || 0;
  
  const change = ((last - first) / (first || 1)) * 100;
  
  if (change > 10) return "up";
  if (change < -10) return "down";
  return "stable";
}

// Simple sparkline component
function Sparkline({ data }: { data: TrendDataPoint[] }) {
  if (!data || data.length < 2) return null;

  const counts = data.map((d) => d.count);
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  const range = max - min || 1;

  const points = counts
    .map((count, i) => {
      const x = (i / (counts.length - 1)) * 60;
      const y = 20 - ((count - min) / range) * 16;
      return `${x},${y}`;
    })
    .join(" ");

  const trend = getTrendDirection(data);
  const strokeColor = trend === "up" ? "#22c55e" : trend === "down" ? "#ef4444" : "#6b7280";

  return (
    <svg width="60" height="24" className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TopicList({
  topics,
  selectedTopicId,
  onTopicSelect,
  className = "",
}: TopicListProps) {
  if (topics.length === 0) {
    return (
      <div className={`flex items-center justify-center h-40 bg-muted/30 rounded-lg ${className}`}>
        <p className="text-muted-foreground text-sm">No topics available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {topics.map((topic, index) => {
        const isSelected = topic.id === selectedTopicId;
        const trend = getTrendDirection(topic.trendData);
        const isHot = trend === "up" && topic.paperCount > 100;

        return (
          <button
            key={topic.id}
            onClick={() => onTopicSelect(topic)}
            className={`
              w-full flex items-center gap-4 p-4 rounded-lg border transition-all duration-200
              ${
                isSelected
                  ? "bg-blue-50 border-blue-500 dark:bg-blue-950/50 dark:border-blue-600"
                  : "bg-card border-border/40 hover:border-blue-300 hover:bg-muted/50"
              }
            `}
          >
            {/* Rank */}
            <span className="text-sm font-medium text-muted-foreground w-6 text-center">
              {index + 1}
            </span>

            {/* Topic info */}
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-medium truncate ${isSelected ? "text-blue-700 dark:text-blue-300" : ""}`}>
                  {topic.name}
                </span>
                {isHot && (
                  <FireIcon className="h-4 w-4 text-orange-500 shrink-0" title="Trending" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {topic.paperCount.toLocaleString()} papers
                {topic.keywords.length > 0 && ` · ${topic.keywords.slice(0, 2).join(", ")}`}
              </p>
            </div>

            {/* Sparkline */}
            {topic.trendData && topic.trendData.length > 1 && (
              <Sparkline data={topic.trendData} />
            )}

            {/* Chevron */}
            <ChevronRightIcon
              className={`h-4 w-4 shrink-0 transition-transform ${
                isSelected ? "text-blue-600 rotate-90" : "text-muted-foreground"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
