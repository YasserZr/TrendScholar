-- Manual SQL Migration for Chat Feature
-- Run this in your Supabase SQL Editor

-- Create MessageRole enum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- Create Chat table
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "paperId" TEXT,
    "userId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- Create Message table
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "chatId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- Create indexes for Chat
CREATE INDEX "Chat_userId_idx" ON "Chat"("userId");
CREATE INDEX "Chat_paperId_idx" ON "Chat"("paperId");
CREATE INDEX "Chat_createdAt_idx" ON "Chat"("createdAt");

-- Create indexes for Message  
CREATE INDEX "Message_chatId_idx" ON "Message"("chatId");
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- Add foreign key constraints
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Verify tables were created
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('Chat', 'Message');
