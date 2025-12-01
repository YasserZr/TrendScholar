// src/app/api/summarize/route.ts
// Premium API route for paper summarization
// Returns 403 for FREE users

import { NextRequest, NextResponse } from "next/server";
import { checkSubscription, SubscriptionError, requirePremium } from "@/lib/checkSubscription";
import prisma from "@/lib/prisma";
import { openai } from "@/lib/openai";

export const runtime = "nodejs"; // Required for Prisma

/**
 * POST /api/summarize
 * Premium feature: Generate AI summary of an academic paper
 * 
 * Request body:
 * {
 *   paperId: string,
 *   // OR
 *   arxivId: string,
 *   // OR
 *   abstract: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check subscription - will throw if not premium
    const { user, plan } = await requirePremium();

    // Parse request body
    const body = await request.json();
    const { paperId, arxivId, abstract } = body;

    if (!paperId && !arxivId && !abstract) {
      return NextResponse.json(
        { error: "Missing required field: paperId, arxivId, or abstract" },
        { status: 400 }
      );
    }

    // Get paper content
    let paperAbstract: string;
    let paperTitle: string = "Untitled";
    let paperRecord: { id: string } | null = null;

    if (paperId) {
      const paper = await prisma.paper.findUnique({
        where: { id: paperId },
        select: { id: true, title: true, abstract: true },
      });

      if (!paper) {
        return NextResponse.json({ error: "Paper not found" }, { status: 404 });
      }

      paperAbstract = paper.abstract;
      paperTitle = paper.title;
      paperRecord = paper;
    } else if (arxivId) {
      const paper = await prisma.paper.findUnique({
        where: { arxivId },
        select: { id: true, title: true, abstract: true },
      });

      if (!paper) {
        return NextResponse.json({ error: "Paper not found" }, { status: 404 });
      }

      paperAbstract = paper.abstract;
      paperTitle = paper.title;
      paperRecord = paper;
    } else {
      paperAbstract = abstract;
    }

    // Generate summary using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert academic research assistant. Your task is to summarize academic papers in a clear, concise manner that highlights:
1. The main research question or objective
2. Key methodology
3. Principal findings
4. Significance and implications

Keep the summary accessible to researchers but preserve technical accuracy.`,
        },
        {
          role: "user",
          content: `Please summarize the following academic paper abstract:\n\nTitle: ${paperTitle}\n\nAbstract: ${paperAbstract}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const summaryContent = completion.choices[0]?.message?.content || "Unable to generate summary";
    const usage = completion.usage;

    // Save summary to database if we have a paper record
    let summaryRecord = null;
    if (paperRecord) {
      summaryRecord = await prisma.summary.create({
        data: {
          content: summaryContent,
          status: "COMPLETED",
          model: "gpt-4o-mini",
          promptTokens: usage?.prompt_tokens || 0,
          completionTokens: usage?.completion_tokens || 0,
          paperId: paperRecord.id,
          userId: user.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      summary: summaryContent,
      summaryId: summaryRecord?.id,
      usage: {
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
      },
    });
  } catch (error) {
    // Handle subscription errors with appropriate status codes
    if (error instanceof SubscriptionError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.statusCode === 401 ? "UNAUTHORIZED" : "PREMIUM_REQUIRED",
          upgradeUrl: "/pricing",
        },
        { status: error.statusCode }
      );
    }

    console.error("Summarize API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/summarize
 * Get user's summaries (premium feature)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, isProOrPlus } = await checkSubscription();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // FREE users can see their summaries but with limited count
    const limit = isProOrPlus ? 100 : 5;

    const summaries = await prisma.summary.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
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

    return NextResponse.json({
      summaries,
      count: summaries.length,
      limit,
      isPremium: isProOrPlus,
    });
  } catch (error) {
    console.error("Get summaries error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
