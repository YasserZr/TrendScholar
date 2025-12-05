// src/app/api/chat/route.ts
// API routes for chat management

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/chat
 * List all chats for the current user
 */
export async function GET(req: NextRequest) {
  try {
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

    const { searchParams } = new URL(req.url);
    const paperId = searchParams.get("paperId");

    // Build query
    const where: { userId: string; paperId?: string } = { userId: user.id };
    if (paperId) {
      where.paperId = paperId;
    }

    const chats = await prisma.chat.findMany({
      where,
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            arxivId: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 1, // Just get the first message for preview
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ chats });
  } catch (error) {
    console.error("Error fetching chats:", error);
    return NextResponse.json(
      { error: "Failed to fetch chats" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat
 * Create a new chat
 */
export async function POST(req: NextRequest) {
  try {
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
    const { paperId, title, initialMessage } = body;

    // Validate paper exists if provided
    if (paperId) {
      const paper = await prisma.paper.findUnique({
        where: { id: paperId },
      });

      if (!paper) {
        return NextResponse.json(
          { error: "Paper not found" },
          { status: 404 }
        );
      }
    }

    // Create chat
    const chat = await prisma.chat.create({
      data: {
        userId: user.id,
        paperId: paperId || null,
        title: title || null,
      },
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            arxivId: true,
          },
        },
      },
    });

    // Add initial message if provided
    if (initialMessage) {
      await prisma.message.create({
        data: {
          chatId: chat.id,
          role: "USER",
          content: initialMessage,
        },
      });
    }

    return NextResponse.json({ chat }, { status: 201 });
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 }
    );
  }
}
