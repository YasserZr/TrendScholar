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
            <p className="text-sm">
              Start a conversation by asking a question about this paper.
            </p>
            <div className="mt-4 space-y-2 text-xs">
              <p className="font-semibold">Example questions:</p>
              <ul className="space-y-1">
                <li>• What are the main findings of this paper?</li>
                <li>• How does this methodology compare to previous work?</li>
                <li>• What are the limitations of this study?</li>
                <li>• Can you explain the key concepts in simpler terms?</li>
              </ul>
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

      {/* Input */}
      <ChatInput onSend={handleSendMessage} disabled={isLoading} />
    </div>
  );
}
