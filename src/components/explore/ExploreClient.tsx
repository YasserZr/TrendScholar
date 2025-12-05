// src/components/explore/ExploreClient.tsx
"use client";

import { useState, useMemo } from "react";
import { TopicList } from "./TopicList";
import { TopicDetail } from "./TopicDetail";
import { TopicBarChart } from "./TopicBarChart";
import { KeywordCloud } from "./KeywordCloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

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

interface ExploreClientProps {
  initialTopics: Topic[];
}

export function ExploreClient({ initialTopics }: ExploreClientProps) {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter topics based on search
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return initialTopics;

    const query = searchQuery.toLowerCase();
    return initialTopics.filter(
      (topic) =>
        topic.name.toLowerCase().includes(query) ||
        topic.keywords.some((k) => k.toLowerCase().includes(query))
    );
  }, [initialTopics, searchQuery]);

  // Aggregate all keywords across topics
  const allKeywords = useMemo(() => {
    const keywordMap = new Map<string, number>();

    initialTopics.forEach((topic) => {
      topic.keywords.forEach((keyword) => {
        const existing = keywordMap.get(keyword) || 0;
        keywordMap.set(keyword, existing + topic.paperCount);
      });
    });

    return Array.from(keywordMap.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 40); // Top 40 keywords
  }, [initialTopics]);

  const handleKeywordClick = (keyword: string) => {
    setSearchQuery(keyword);
  };

  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(selectedTopic?.id === topic.id ? null : topic);
  };

  const handleBarChartClick = (topicId: string) => {
    const topic = initialTopics.find((t) => t.id === topicId);
    if (topic) {
      setSelectedTopic(selectedTopic?.id === topicId ? null : topic);
    }
  };

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="relative max-w-2xl">
        <input
          type="text"
          placeholder="Search topics or keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-[#BCCCDC] dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 pl-10 text-sm placeholder:text-[#9AA6B2] dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9AA6B2] dark:text-slate-500" />
      </div>

      {/* All Keywords Cloud */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Research Keywords</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click a keyword to filter topics
          </p>
        </CardHeader>
        <CardContent>
          <KeywordCloud keywords={allKeywords} onKeywordClick={handleKeywordClick} />
        </CardContent>
      </Card>

      {/* Main content grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: Topics by paper count chart + list */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Topics by Paper Count</CardTitle>
              <p className="text-sm text-muted-foreground">
                Click a bar to see topic details
              </p>
            </CardHeader>
            <CardContent>
              <TopicBarChart
                topics={initialTopics}
                selectedTopicId={selectedTopic?.id}
                onTopicClick={handleBarChartClick}
              />
            </CardContent>
          </Card>

          <div>
            <h3 className="text-lg font-semibold mb-4">
              All Topics {filteredTopics.length < initialTopics.length && `(${filteredTopics.length} of ${initialTopics.length})`}
            </h3>
            <TopicList
              topics={filteredTopics}
              selectedTopicId={selectedTopic?.id}
              onTopicSelect={handleTopicSelect}
            />
          </div>
        </div>

        {/* Right: Selected topic detail */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          {selectedTopic ? (
            <TopicDetail
              topic={selectedTopic}
              onKeywordClick={handleKeywordClick}
            />
          ) : (
            <Card className="h-96 flex items-center justify-center">
              <CardContent className="text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <MagnifyingGlassIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Select a topic</h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Click on a topic from the list or chart to see detailed
                  trends and keywords.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
