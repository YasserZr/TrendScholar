// src/lib/plan-assertions.ts
// Server-only plan assertion helpers that require Prisma
// NOTE: Do NOT import this file in client components

import "server-only";
import prisma from "@/lib/prisma";
import type { Plan as PlanEnum } from "@/generated/prisma/client";
import { 
  getPlanLimits, 
  getPlanFeatures,
  isUnlimited, 
  PlanError, 
  PlanErrorCode,
  type PlanFeatures,
} from "./plans";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UserForAssert {
  id: string;
  plan: PlanEnum;
}

// ─────────────────────────────────────────────────────────────────────────────
// Assertion Helpers (for API routes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assert user can create a summary (check daily limit)
 * @throws PlanError if limit exceeded
 */
export async function assertCanSummarize(user: UserForAssert): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}> {
  const limits = getPlanLimits(user.plan);
  const limit = limits.dailySummaries;

  // Unlimited
  if (isUnlimited(limit)) {
    return { allowed: true, used: 0, limit: -1, remaining: -1 };
  }

  // Count today's summaries
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const used = await prisma.summary.count({
    where: {
      userId: user.id,
      createdAt: { gte: todayStart },
    },
  });

  const remaining = Math.max(0, limit - used);

  if (used >= limit) {
    throw new PlanError(
      `Daily summary limit reached (${used}/${limit}). Upgrade your plan for more.`,
      PlanErrorCode.RATE_LIMIT_EXCEEDED,
      429,
      { currentPlan: user.plan, limit, used }
    );
  }

  return { allowed: true, used, limit, remaining };
}

/**
 * Assert user can save a paper (check saved papers limit)
 * @throws PlanError if limit exceeded
 */
export async function assertCanSavePaper(user: UserForAssert): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}> {
  const limits = getPlanLimits(user.plan);
  const limit = limits.savedPapers;

  // Unlimited
  if (isUnlimited(limit)) {
    return { allowed: true, used: 0, limit: -1, remaining: -1 };
  }

  const used = await prisma.savedPaper.count({
    where: { userId: user.id },
  });

  const remaining = Math.max(0, limit - used);

  if (used >= limit) {
    throw new PlanError(
      `Saved papers limit reached (${used}/${limit}). Upgrade your plan for more storage.`,
      PlanErrorCode.LIMIT_REACHED,
      403,
      { currentPlan: user.plan, limit, used }
    );
  }

  return { allowed: true, used, limit, remaining };
}

/**
 * Assert user can follow a topic (check topics limit)
 * @throws PlanError if limit exceeded
 */
export async function assertCanFollowTopic(user: UserForAssert): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}> {
  const limits = getPlanLimits(user.plan);
  const limit = limits.topics;

  // Unlimited
  if (isUnlimited(limit)) {
    return { allowed: true, used: 0, limit: -1, remaining: -1 };
  }

  const used = await prisma.userTopic.count({
    where: { userId: user.id },
  });

  const remaining = Math.max(0, limit - used);

  if (used >= limit) {
    throw new PlanError(
      `Topic limit reached (${used}/${limit}). Upgrade your plan to follow more topics.`,
      PlanErrorCode.LIMIT_REACHED,
      403,
      { currentPlan: user.plan, limit, used }
    );
  }

  return { allowed: true, used, limit, remaining };
}

/**
 * Assert user has access to a specific feature
 * @throws PlanError if feature not available
 */
export function assertHasFeature(
  user: UserForAssert,
  feature: keyof PlanFeatures,
  featureName: string
): void {
  const features = getPlanFeatures(user.plan);

  if (!features[feature]) {
    throw new PlanError(
      `${featureName} is not available on your plan. Upgrade to access this feature.`,
      PlanErrorCode.FEATURE_NOT_AVAILABLE,
      403,
      { currentPlan: user.plan, feature }
    );
  }
}

/**
 * Assert user has API access
 * @throws PlanError if no API access
 */
export function assertHasAPIAccess(user: UserForAssert): void {
  assertHasFeature(user, "hasAPI", "API access");
}

/**
 * Assert user can use advanced filters
 * @throws PlanError if not available
 */
export function assertHasAdvancedFilters(user: UserForAssert): void {
  assertHasFeature(user, "hasAdvancedFilters", "Advanced filters");
}

/**
 * Assert user can use semantic search
 * @throws PlanError if not available
 */
export function assertHasSemanticSearch(user: UserForAssert): void {
  assertHasFeature(user, "hasSemanticSearch", "Semantic search");
}

// ─────────────────────────────────────────────────────────────────────────────
// Usage Stats Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get comprehensive usage stats for a user
 */
export async function getUserUsageStats(userId: string, plan: PlanEnum | string) {
  const limits = getPlanLimits(plan);

  // Get today's summary count
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [summariesToday, savedPapersCount, topicsCount] = await Promise.all([
    prisma.summary.count({
      where: { userId, createdAt: { gte: todayStart } },
    }),
    prisma.savedPaper.count({
      where: { userId },
    }),
    prisma.userTopic.count({
      where: { userId },
    }),
  ]);

  return {
    summaries: {
      used: summariesToday,
      limit: limits.dailySummaries,
      remaining: isUnlimited(limits.dailySummaries) 
        ? -1 
        : Math.max(0, limits.dailySummaries - summariesToday),
      isUnlimited: isUnlimited(limits.dailySummaries),
    },
    savedPapers: {
      used: savedPapersCount,
      limit: limits.savedPapers,
      remaining: isUnlimited(limits.savedPapers)
        ? -1
        : Math.max(0, limits.savedPapers - savedPapersCount),
      isUnlimited: isUnlimited(limits.savedPapers),
    },
    topics: {
      used: topicsCount,
      limit: limits.topics,
      remaining: isUnlimited(limits.topics)
        ? -1
        : Math.max(0, limits.topics - topicsCount),
      isUnlimited: isUnlimited(limits.topics),
    },
  };
}
