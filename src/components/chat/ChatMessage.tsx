// src/components/chat/ChatMessage.tsx
"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  isStreaming?: boolean;
}

/**
 * Hook to simulate typing animation for AI responses
 */
function useTypingAnimation(text: string, speed: number = 20, enabled: boolean = true) {
  const [displayedText, setDisplayedText] = useState(enabled ? "" : text);
  const [isComplete, setIsComplete] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    setDisplayedText("");
    setIsComplete(false);
    let index = 0;

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, enabled]);

  return { displayedText, isComplete };
}

export function ChatMessage({ role, content, timestamp, isStreaming = false }: ChatMessageProps) {
  const isUser = role === "user";
  const { displayedText, isComplete } = useTypingAnimation(
    content,
    20,
    !isUser && isStreaming
  );
  
  const contentToDisplay = isUser ? content : displayedText;

  return (
    <div
      className={cn(
        "flex gap-3 mb-4 p-4 rounded-lg",
        isUser
          ? "bg-blue-50 dark:bg-blue-950 ml-8"
          : "bg-gray-50 dark:bg-gray-900 mr-8"
      )}
    >
      <div className="shrink-0">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
            isUser
              ? "bg-blue-600 text-white"
              : "bg-purple-600 text-white"
          )}
        >
          {isUser ? "U" : "AI"}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm">
            {isUser ? "You" : "AI Assistant"}
          </span>
          {timestamp && (
            <span className="text-xs text-gray-500">
              {new Date(timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
        {isUser ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {contentToDisplay}
          </div>
        ) : (
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
              {contentToDisplay}
            </ReactMarkdown>
            {!isComplete && (
              <span className="inline-block w-1.5 h-4 bg-purple-600 ml-0.5 animate-pulse" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
