// src/components/chat/ChatMessage.tsx
"use client";

import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === "user";

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
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}
