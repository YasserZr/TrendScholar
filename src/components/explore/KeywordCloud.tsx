// src/components/explore/KeywordCloud.tsx
"use client";

import { useMemo, useState } from "react";

// Seeded random number generator for deterministic shuffling
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface KeywordCloudProps {
  keywords: { word: string; count: number }[];
  onKeywordClick?: (keyword: string) => void;
  className?: string;
}

// Size classes based on relative frequency
const SIZE_CLASSES = [
  "text-xs px-2 py-0.5",
  "text-sm px-2.5 py-1",
  "text-base px-3 py-1",
  "text-lg px-3.5 py-1.5",
  "text-xl px-4 py-2 font-medium",
];

const COLOR_CLASSES = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300 hover:bg-cyan-200 dark:hover:bg-cyan-800",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-800",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800",
];

export function KeywordCloud({ keywords, onKeywordClick, className = "" }: KeywordCloudProps) {
  // Use a stable seed based on keywords length for deterministic shuffling
  const [seed] = useState(() => Date.now());

  const processedKeywords = useMemo(() => {
    if (keywords.length === 0) return [];

    const maxCount = Math.max(...keywords.map((k) => k.count));
    const minCount = Math.min(...keywords.map((k) => k.count));
    const range = maxCount - minCount || 1;

    const processed = keywords.map((keyword, index) => {
      // Normalize count to 0-4 range for size classes
      const normalizedSize = Math.floor(((keyword.count - minCount) / range) * 4);
      const sizeClass = SIZE_CLASSES[normalizedSize];
      const colorClass = COLOR_CLASSES[index % COLOR_CLASSES.length];

      return {
        ...keyword,
        sizeClass,
        colorClass,
      };
    });

    // Shuffle for visual variety using seeded random for stable rendering
    return shuffleWithSeed(processed, seed);
  }, [keywords, seed]);

  if (processedKeywords.length === 0) {
    return (
      <div className={`flex items-center justify-center h-40 bg-muted/30 rounded-lg ${className}`}>
        <p className="text-muted-foreground text-sm">No keywords available</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 p-4 ${className}`}>
      {processedKeywords.map((keyword) => (
        <button
          key={keyword.word}
          onClick={() => onKeywordClick?.(keyword.word)}
          className={`
            rounded-full transition-all duration-200 
            ${keyword.sizeClass} 
            ${keyword.colorClass}
            hover:scale-105 hover:shadow-md
          `}
          title={`${keyword.count} papers`}
        >
          {keyword.word}
        </button>
      ))}
    </div>
  );
}
