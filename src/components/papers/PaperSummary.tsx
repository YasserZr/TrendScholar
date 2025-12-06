// src/components/papers/PaperSummary.tsx
"use client";

import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LightBulbIcon,
  SparklesIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import type { ParsedSummary } from "@/lib/papers";

interface PaperSummaryProps {
  summary: ParsedSummary;
}

export function PaperSummary({ summary }: PaperSummaryProps) {
  return (
    <div className="space-y-6">
      {/* TL;DR */}
      {summary.tldr && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-blue-600" />
              TL;DR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="mb-3 text-sm leading-relaxed">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-gray-700 dark:text-gray-300">{children}</em>
                  ),
                  code: ({ children }) => (
                    <code className="bg-blue-200 dark:bg-blue-900 px-1.5 py-0.5 rounded text-xs font-mono">
                      {children}
                    </code>
                  ),
                }}
              >
                {summary.tldr}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Contributions */}
      {summary.contributions && summary.contributions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <LightBulbIcon className="h-5 w-5 text-amber-600" />
              Key Contributions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {summary.contributions.map((contribution, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center justify-center text-xs font-medium mt-0.5">
                    {index + 1}
                  </span>
                  <div className="flex-1 prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <p className="mb-0 text-sm leading-relaxed">{children}</p>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic text-gray-700 dark:text-gray-300">{children}</em>
                        ),
                        code: ({ children }) => (
                          <code className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">
                            {children}
                          </code>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside mt-1 space-y-0.5">{children}</ul>
                        ),
                        li: ({ children }) => (
                          <li className="text-xs">{children}</li>
                        ),
                      }}
                    >
                      {contribution}
                    </ReactMarkdown>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Keywords */}
      {summary.keywords && summary.keywords.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-purple-600" />
              Keywords
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model info */}
      <p className="text-xs text-muted-foreground text-right">
        Generated by {summary.model} on{" "}
        {new Date(summary.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}

/**
 * Fallback for raw markdown summary (legacy format)
 */
export function RawSummary({ content }: { content: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-blue-600" />
          AI Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-lg font-bold mt-4 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-base font-bold mt-4 mb-2">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-semibold mt-3 mb-2">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="mb-3 text-sm leading-relaxed">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside mb-3 space-y-1.5 text-sm">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside mb-3 space-y-1.5 text-sm">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="ml-2 leading-relaxed">{children}</li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="italic text-gray-700 dark:text-gray-300">{children}</em>
              ),
              code: ({ children }) => (
                <code className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-gray-200 dark:bg-gray-800 p-3 rounded-lg mb-3 overflow-x-auto text-xs">
                  {children}
                </pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-3 bg-blue-50 dark:bg-blue-950/30 rounded-r text-sm italic">
                  {children}
                </blockquote>
              ),
              hr: () => (
                <hr className="my-4 border-gray-300 dark:border-gray-700" />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
