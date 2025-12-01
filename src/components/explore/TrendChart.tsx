// src/components/explore/TrendChart.tsx
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TrendDataPoint {
  date: string;
  count: number;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  topicName: string;
  className?: string;
}

export function TrendChart({ data, topicName, className = "" }: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-muted/30 rounded-lg ${className}`}>
        <p className="text-muted-foreground text-sm">No trend data available</p>
      </div>
    );
  }

  // Format date for display (e.g., "2024-01" -> "Jan 24")
  const formatDate = (dateStr: string) => {
    const [year, month] = dateStr.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(month, 10) - 1]} '${year.slice(2)}`;
  };

  const formattedData = data.map((d) => ({
    ...d,
    formattedDate: formatDate(d.date),
  }));

  return (
    <div className={`w-full h-64 ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
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
            itemStyle={{ color: "hsl(var(--muted-foreground))" }}
            formatter={(value: number) => [`${value} papers`, "Count"]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="count"
            name={topicName}
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: "#2563eb" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
