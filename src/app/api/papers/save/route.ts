// src/app/api/papers/save/route.ts
// API route for saving/unsaving papers

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { PlanError } from "@/lib/plans";
import { assertCanSavePaper } from "@/lib/plan-assertions";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Parse request body
    const body = await request.json();
    const { paperId, action } = body;

    if (!paperId || !action || !["save", "unsave"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request. Provide paperId and action (save/unsave)" },
        { status: 400 }
      );
    }

    // Verify paper exists
    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
    });

    if (!paper) {
      return NextResponse.json(
        { error: "Paper not found" },
        { status: 404 }
      );
    }

    if (action === "save") {
      // Check if already saved
      const existing = await prisma.savedPaper.findUnique({
        where: {
          userId_paperId: { userId, paperId },
        },
      });

      if (existing) {
        return NextResponse.json({
          success: true,
          message: "Paper already saved",
          saved: true,
        });
      }

      // Get user's plan to check limits using centralized plan system
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, plan: true },
      });

      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      // Use centralized assertion helper
      try {
        await assertCanSavePaper(user);
      } catch (error) {
        if (error instanceof PlanError) {
          return NextResponse.json(
            {
              error: error.message,
              code: error.code,
              details: error.details,
            },
            { status: error.statusCode }
          );
        }
        throw error;
      }

      // Save the paper
      await prisma.savedPaper.create({
        data: {
          userId,
          paperId,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Paper saved",
        saved: true,
      });
    } else {
      // Unsave the paper
      await prisma.savedPaper.deleteMany({
        where: {
          userId,
          paperId,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Paper removed from saved",
        saved: false,
      });
    }
  } catch (error) {
    console.error("Save paper error:", error);
    return NextResponse.json(
      { error: "Failed to save paper" },
      { status: 500 }
    );
  }
}

// GET: Check if a paper is saved
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const paperId = searchParams.get("paperId");

    if (!paperId) {
      return NextResponse.json(
        { error: "paperId is required" },
        { status: 400 }
      );
    }

    const saved = await prisma.savedPaper.findUnique({
      where: {
        userId_paperId: {
          userId: session.user.id,
          paperId,
        },
      },
    });

    return NextResponse.json({
      saved: !!saved,
    });
  } catch (error) {
    console.error("Check saved paper error:", error);
    return NextResponse.json(
      { error: "Failed to check saved status" },
      { status: 500 }
    );
  }
}
