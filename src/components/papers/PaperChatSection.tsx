// src/components/papers/PaperChatSection.tsx
"use client";

import { useState, useEffect } from "react";
import { ChatInterface } from "@/components/chat";
import type { Message } from "@/components/chat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface PaperChatSectionProps {
  paperId: string;
  paperTitle: string;
}

export function PaperChatSection({ paperId, paperTitle }: PaperChatSectionProps) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Check for existing chat or create new one when expanded
  useEffect(() => {
    if (isExpanded && !chatId) {
      initializeChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded, chatId]);

  const initializeChat = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if there's an existing chat for this paper
      const listResponse = await fetch(`/api/chat?paperId=${paperId}`);
      
      if (!listResponse.ok) {
        throw new Error("Failed to fetch chats");
      }

      const listData = await listResponse.json();
      
      if (listData.chats && listData.chats.length > 0) {
        // Use the most recent existing chat
        const existingChat = listData.chats[0];
        setChatId(existingChat.id);
        
        // Fetch full chat history
        const chatResponse = await fetch(`/api/chat/${existingChat.id}`);
        if (chatResponse.ok) {
          const chatData = await chatResponse.json();
          setMessages(chatData.chat.messages || []);
        }
      } else {
        // Create a new chat
        const createResponse = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paperId,
            title: `Discussion: ${paperTitle.slice(0, 50)}${paperTitle.length > 50 ? "..." : ""}`,
          }),
        });

        if (!createResponse.ok) {
          throw new Error("Failed to create chat");
        }

        const createData = await createResponse.json();
        setChatId(createData.chat.id);
        setMessages([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize chat");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isExpanded) {
    return (
      <Card className="p-6 text-center">
        <h3 className="text-lg font-semibold mb-2">Discuss with AI</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Ask questions and get insights about this research paper
        </p>
        <Button onClick={() => setIsExpanded(true)}>
          Start Conversation
        </Button>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-muted-foreground">Loading chat...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <Button onClick={initializeChat} variant="outline">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  if (!chatId) {
    return null;
  }

  return (
    <div className="h-[600px]">
      <ChatInterface
        chatId={chatId}
        paperId={paperId}
        initialMessages={messages}
      />
    </div>
  );
}
