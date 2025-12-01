// src/components/dashboard/FilterBar.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, FunnelIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface Topic {
  id: string;
  name: string;
  slug: string;
}

interface FilterBarProps {
  topics: Topic[];
  followedTopicIds: string[];
  currentTimeRange: string;
  currentTopicIds: string[];
}

const timeRanges = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
];

export function FilterBar({
  topics,
  followedTopicIds,
  currentTimeRange,
  currentTopicIds,
}: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);

  const updateFilters = useCallback(
    (updates: { timeRange?: string; topicIds?: string[] }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.timeRange !== undefined) {
        if (updates.timeRange === "week") {
          params.delete("time");
        } else {
          params.set("time", updates.timeRange);
        }
      }

      if (updates.topicIds !== undefined) {
        if (updates.topicIds.length === 0) {
          params.delete("topics");
        } else {
          params.set("topics", updates.topicIds.join(","));
        }
      }

      // Reset to page 1 when filters change
      params.delete("page");

      router.push(`/dashboard?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleTimeRangeChange = (value: string) => {
    updateFilters({ timeRange: value });
  };

  const handleTopicToggle = (topicId: string) => {
    const newTopicIds = currentTopicIds.includes(topicId)
      ? currentTopicIds.filter((id) => id !== topicId)
      : [...currentTopicIds, topicId];
    updateFilters({ topicIds: newTopicIds });
  };

  const handleClearTopics = () => {
    updateFilters({ topicIds: [] });
    setShowTopicDropdown(false);
  };

  const handleShowFollowed = () => {
    updateFilters({ topicIds: followedTopicIds });
    setShowTopicDropdown(false);
  };

  const activeFiltersCount =
    (currentTimeRange !== "week" ? 1 : 0) + (currentTopicIds.length > 0 ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Time Range Filter */}
      <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
        {timeRanges.map((range) => (
          <Button
            key={range.value}
            variant={currentTimeRange === range.value ? "default" : "ghost"}
            size="sm"
            className={`h-7 px-3 text-xs ${
              currentTimeRange === range.value
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : ""
            }`}
            onClick={() => handleTimeRangeChange(range.value)}
          >
            {range.label}
          </Button>
        ))}
      </div>

      {/* Topic Filter */}
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2"
          onClick={() => setShowTopicDropdown(!showTopicDropdown)}
        >
          <FunnelIcon className="h-4 w-4" />
          Topics
          {currentTopicIds.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-xs">
              {currentTopicIds.length}
            </span>
          )}
          <ChevronDownIcon className="h-3 w-3" />
        </Button>

        {showTopicDropdown && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowTopicDropdown(false)}
            />

            {/* Dropdown */}
            <div className="absolute top-full left-0 mt-1 w-64 max-h-80 overflow-y-auto rounded-lg border bg-card shadow-lg z-20">
              <div className="p-2 border-b">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Filter by topic
                  </span>
                  <div className="flex gap-1">
                    {followedTopicIds.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={handleShowFollowed}
                      >
                        My topics
                      </Button>
                    )}
                    {currentTopicIds.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-red-500 hover:text-red-600"
                        onClick={handleClearTopics}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-2 space-y-1">
                {topics.map((topic) => {
                  const isSelected = currentTopicIds.includes(topic.id);
                  const isFollowed = followedTopicIds.includes(topic.id);

                  return (
                    <button
                      key={topic.id}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                        isSelected
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => handleTopicToggle(topic.id)}
                    >
                      <span className="truncate">{topic.name}</span>
                      <div className="flex items-center gap-1">
                        {isFollowed && (
                          <span className="text-xs text-blue-600">★</span>
                        )}
                        {isSelected && (
                          <span className="text-blue-600">✓</span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {topics.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No topics available
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Active Filters Summary */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""} active
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => {
              updateFilters({ timeRange: "week", topicIds: [] });
            }}
          >
            <XMarkIcon className="h-3 w-3 mr-1" />
            Reset all
          </Button>
        </div>
      )}
    </div>
  );
}
