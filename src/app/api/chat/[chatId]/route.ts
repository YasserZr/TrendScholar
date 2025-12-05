// src/app/api/chat/[chatId]/route.ts
// API routes for individual chat operations

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateChatCompletion } from "@/lib/gemini";

/**
 * GET /api/chat/[chatId]
 * Get chat details with message history
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: user.id,
      },
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            abstract: true,
            authors: true,
            arxivId: true,
            summaries: {
              where: { userId: user.id },
              take: 1,
              orderBy: { createdAt: "desc" },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json({ chat });
  } catch (error) {
    console.error("Error fetching chat:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/[chatId]
 * Send a message and get AI response
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Fetch chat with paper context and message history
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: user.id,
      },
      include: {
        paper: {
          include: {
            summaries: {
              where: { userId: user.id },
              take: 1,
              orderBy: { createdAt: "desc" },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        chatId: chat.id,
        role: "USER",
        content: message,
      },
    });

    // Build conversation history
    const conversationHistory = chat.messages.map((msg: { role: string; content: string }) => ({
      role: msg.role.toLowerCase() as "user" | "assistant",
      content: msg.content,
    }));

    // Add the new user message
    conversationHistory.push({
      role: "user",
      content: message,
    });

    // Prepare paper context if available
    const paperContext = chat.paper
      ? {
          title: chat.paper.title,
          abstract: chat.paper.abstract,
          authors: chat.paper.authors,
          summary: chat.paper.summaries[0]?.content,
        }
      : undefined;

    // Generate AI response
    const completion = await generateChatCompletion({
      messages: conversationHistory,
      paperContext,
      temperature: 0.7,
      maxTokens: 2048,
    });

    // Save assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        chatId: chat.id,
        role: "ASSISTANT",
        content: completion.content,
        promptTokens: completion.usage.promptTokens,
        completionTokens: completion.usage.completionTokens,
      },
    });

    // Update chat timestamp
    await prisma.chat.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() },
    });

    // Auto-generate title from first message if not set
    if (!chat.title && chat.messages.length === 0) {
      const titlePrompt = `Generate a short title (max 6 words) for this conversation: "${message}"`;
      try {
        const titleCompletion = await generateChatCompletion({
          messages: [{ role: "user", content: titlePrompt }],
          temperature: 0.5,
          maxTokens: 20,
        });
        
        await prisma.chat.update({
          where: { id: chat.id },
          data: { title: titleCompletion.content.replace(/['"]/g, "").trim() },
        });
      } catch (error) {
        console.error("Failed to generate chat title:", error);
      }
    }

    return NextResponse.json({
      userMessage,
      assistantMessage,
      usage: completion.usage,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    
    // Check for Gemini-specific errors
    if (error instanceof Error) {
      if (error.message?.includes("API key")) {
        return NextResponse.json(
          { error: "AI service not configured", code: "GEMINI_ERROR" },
          { status: 503 }
        );
      }
      if (error.message?.includes("quota")) {
        return NextResponse.json(
          { error: "AI service quota exceeded", code: "GEMINI_ERROR" },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chat/[chatId]
 * Delete a chat and all its messages
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify ownership
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: user.id,
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Delete chat (messages will be cascade deleted)
    await prisma.chat.delete({
      where: { id: chatId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}
