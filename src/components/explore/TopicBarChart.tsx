// src/components/explore/TopicBarChart.tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface TopicData {
  id: string;
  name: string;
  paperCount: number;
}

interface TopicBarChartProps {
  topics: TopicData[];
  selectedTopicId?: string;
  onTopicClick?: (topicId: string) => void;
  className?: string;
}

const COLORS = [
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#ec4899", // pink-500
  "#6366f1", // indigo-500
];

export function TopicBarChart({
  topics,
  selectedTopicId,
  onTopicClick,
  className = "",
}: TopicBarChartProps) {
  // Sort by paper count and take top 10
  const sortedTopics = [...topics]
    .sort((a, b) => b.paperCount - a.paperCount)
    .slice(0, 10);

  if (sortedTopics.length === 0) {
    return (
      <div className={`flex items-center justify-center h-80 bg-muted/30 rounded-lg ${className}`}>
        <p className="text-muted-foreground text-sm">No topic data available</p>
      </div>
    );
  }

  const handleBarClick = (data: TopicData) => {
    if (onTopicClick) {
      onTopicClick(data.id);
    }
  };

  return (
    <div className={`w-full h-80 ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedTopics}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12 }}
            width={90}
            className="text-muted-foreground"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            formatter={(value: number) => [`${value.toLocaleString()} papers`, "Papers"]}
          />
          <Bar
            dataKey="paperCount"
            radius={[0, 4, 4, 0]}
            cursor="pointer"
            onClick={(data) => handleBarClick(data as unknown as TopicData)}
          >
            {sortedTopics.map((entry, index) => (
              <Cell
                key={`cell-${entry.id}`}
                fill={entry.id === selectedTopicId ? "#2563eb" : COLORS[index % COLORS.length]}
                opacity={entry.id === selectedTopicId ? 1 : 0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
