// src/components/chat/ChatInterface.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

export interface Message {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: Date;
}

interface ChatInterfaceProps {
  chatId: string;
  paperId?: string;
  initialMessages?: Message[];
}

export function ChatInterface({
  chatId,
  initialMessages = [],
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Generate context-aware suggested prompts based on conversation
  const getSuggestedPrompts = (): string[] => {
    if (messages.length === 0) {
      return [
        "What are the main contributions?",
        "Explain the methodology",
        "Summarize the key findings",
      ];
    }

    const lastMessage = messages[messages.length - 1];
    const lastContent = lastMessage.content.toLowerCase();

    // Context-aware suggestions based on last message
    if (lastContent.includes("contribution") || lastContent.includes("finding")) {
      return [
        "How does this compare to related work?",
        "What are the limitations?",
        "What are practical applications?",
      ];
    }

    if (lastContent.includes("method") || lastContent.includes("approach")) {
      return [
        "What are the results?",
        "What datasets were used?",
        "Can you explain in simpler terms?",
      ];
    }

    if (lastContent.includes("limitation") || lastContent.includes("future")) {
      return [
        "How significant is this work?",
        "What problems does this solve?",
        "Who would benefit from this?",
      ];
    }

    // Default follow-up suggestions
    return [
      "Tell me more about that",
      "What are the implications?",
      "Can you provide an example?",
    ];
  };

  const suggestedPrompts = getSuggestedPrompts();

  const handleSendMessage = async (content: string) => {
    setIsLoading(true);
    setError(null);

    // Add user message optimistically
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "USER",
      content,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      const data = await response.json();

      // Replace temp message with actual messages from server
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempUserMessage.id);
        return [
          ...filtered,
          {
            id: data.userMessage.id,
            role: data.userMessage.role,
            content: data.userMessage.content,
            createdAt: new Date(data.userMessage.createdAt),
          },
          {
            id: data.assistantMessage.id,
            role: data.assistantMessage.role,
            content: data.assistantMessage.content,
            createdAt: new Date(data.assistantMessage.createdAt),
          },
        ];
      });
    } catch (err) {
      // Remove the temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gray-50 dark:bg-gray-900">
        <h3 className="font-semibold text-lg">AI Research Assistant</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Ask questions about this paper
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm mb-4">
              Start a conversation by asking a question about this paper.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
              <button
                onClick={() => handleSendMessage("What are the main contributions of this paper?")}
                disabled={isLoading}
                className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="font-medium">📊 Main Contributions</span>
                <p className="text-gray-600 dark:text-gray-400 mt-1">What are the main contributions of this paper?</p>
              </button>
              <button
                onClick={() => handleSendMessage("Can you explain the methodology used in simple terms?")}
                disabled={isLoading}
                className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="font-medium">🔬 Methodology</span>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Explain the methodology in simple terms</p>
              </button>
              <button
                onClick={() => handleSendMessage("What are the key findings and results?")}
                disabled={isLoading}
                className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="font-medium">✨ Key Findings</span>
                <p className="text-gray-600 dark:text-gray-400 mt-1">What are the key findings and results?</p>
              </button>
              <button
                onClick={() => handleSendMessage("What are the limitations and potential future work?")}
                disabled={isLoading}
                className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="font-medium">⚠️ Limitations</span>
                <p className="text-gray-600 dark:text-gray-400 mt-1">What are the limitations and future work?</p>
              </button>
              <button
                onClick={() => handleSendMessage("How does this compare to previous related work?")}
                disabled={isLoading}
                className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="font-medium">🔄 Related Work</span>
                <p className="text-gray-600 dark:text-gray-400 mt-1">How does this compare to related work?</p>
              </button>
              <button
                onClick={() => handleSendMessage("What are the practical applications of this research?")}
                disabled={isLoading}
                className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="font-medium">💡 Applications</span>
                <p className="text-gray-600 dark:text-gray-400 mt-1">What are the practical applications?</p>
              </button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role.toLowerCase() as "user" | "assistant"}
            content={msg.content}
            timestamp={msg.createdAt}
          />
        ))}

        {isLoading && (
          <div className="flex gap-3 mb-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 mr-8">
            <div className="shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold bg-purple-600 text-white">
                AI
              </div>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm mb-1">AI Assistant</div>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts - shown above input */}
      {messages.length > 0 && !isLoading && (
        <div className="px-4 py-2 border-t bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
              Try asking:
            </span>
            {suggestedPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={handleSendMessage} disabled={isLoading} />
    </div>
  );
}
