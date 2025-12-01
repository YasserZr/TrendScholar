// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

/**
 * User preferences schema
 */
const preferencesSchema = z.object({
  digestFrequency: z.enum(["daily", "weekly", "never"]).optional(),
  digestEnabled: z.boolean().optional(),
  preferredTopics: z.array(z.string()).optional(),
  emailNotifications: z.boolean().optional(),
});

/**
 * Profile update request schema
 */
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  image: z.string().url().max(500).optional().nullable(),
  preferences: preferencesSchema.optional(),
});

/**
 * GET /api/profile
 * Returns the current user's profile data
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        plan: true,
        preferences: true,
        subscriptionStatus: true,
        stripeCurrentPeriodEnd: true,
        createdAt: true,
        _count: {
          select: {
            savedPapers: true,
            summaries: true,
            topicsFollowed: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Calculate usage limits based on plan
    const limits = getPlanLimits(user.plan);
    
    // Get today's summary count for rate limiting display
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todaySummaries = await prisma.summary.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: todayStart },
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        usage: {
          summariesToday: todaySummaries,
          summariesLimit: limits.dailySummaries,
          savedPapers: user._count.savedPapers,
          savedPapersLimit: limits.savedPapers,
          topicsFollowed: user._count.topicsFollowed,
          topicsLimit: limits.topics,
        },
      },
    });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile
 * Updates the current user's profile
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const result = updateProfileSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Validation error", 
          details: result.error.flatten() 
        },
        { status: 400 }
      );
    }

    const { name, image, preferences } = result.data;

    // Get current user for merging preferences
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });

    // Merge preferences with existing ones
    const mergedPreferences = preferences
      ? {
          ...((currentUser?.preferences as Record<string, unknown>) || {}),
          ...preferences,
        }
      : undefined;

    // Build update data object
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (image !== undefined) updateData.image = image;
    if (mergedPreferences !== undefined) updateData.preferences = mergedPreferences;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        plan: true,
        preferences: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

/**
 * Get plan-specific limits
 */
function getPlanLimits(plan: string) {
  switch (plan) {
    case "PLUS":
      return {
        dailySummaries: -1, // Unlimited
        savedPapers: -1,    // Unlimited
        topics: -1,         // Unlimited
        features: [
          "Unlimited AI summaries",
          "Unlimited saved papers",
          "Follow unlimited topics",
          "Priority email digest",
          "API access",
          "Priority support",
        ],
      };
    case "PRO":
      return {
        dailySummaries: 50,
        savedPapers: 500,
        topics: 20,
        features: [
          "50 AI summaries/day",
          "Save up to 500 papers",
          "Follow up to 20 topics",
          "Weekly email digest",
          "Advanced filters",
        ],
      };
    case "FREE":
    default:
      return {
        dailySummaries: 5,
        savedPapers: 25,
        topics: 3,
        features: [
          "5 AI summaries/day",
          "Save up to 25 papers",
          "Follow up to 3 topics",
          "Basic search",
        ],
      };
  }
}
