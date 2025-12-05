// src/app/profile/page.tsx
import { redirect } from "next/navigation";
import { AuthHeader, Footer } from "@/components/ui";
import { checkSubscription } from "@/lib/checkSubscription";
import { ProfileClient } from "./ProfileClient";
import { getPlanLimits } from "@/lib/plans";
import prisma from "@/lib/prisma";
import type { Metadata } from "next";
import type { UserPreferences, UsageLimits } from "@/types/profile";

export const metadata: Metadata = {
  title: "Profile | TrendScholar",
  description: "Manage your TrendScholar profile and preferences",
};

export default async function ProfilePage() {
  const { user, plan, isAuthenticated } = await checkSubscription();

  if (!isAuthenticated || !user) {
    redirect("/auth/signin?callbackUrl=/profile");
  }

  // Fetch full user data with counts
  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      plan: true,
      preferences: true,
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

  if (!userData) {
    redirect("/auth/signin?callbackUrl=/profile");
  }

  // Get today's summary count
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todaySummaries = await prisma.summary.count({
    where: {
      userId: user.id,
      createdAt: { gte: todayStart },
    },
  });

  // Get available topics for preferences
  const availableTopics = await prisma.topic.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  // Get user's followed topics
  const followedTopics = await prisma.userTopic.findMany({
    where: { userId: user.id },
    select: { topicId: true },
  });

  const limits = getPlanLimits(plan || "FREE");

  const usage: UsageLimits = {
    summariesToday: todaySummaries,
    summariesLimit: limits.dailySummaries,
    savedPapers: userData._count.savedPapers,
    savedPapersLimit: limits.savedPapers,
    topicsFollowed: userData._count.topicsFollowed,
    topicsLimit: limits.topics,
  };

  return (
    <div className="flex min-h-screen flex-col">
      <AuthHeader />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and preferences.
          </p>
        </div>

        <ProfileClient
          user={{
            id: userData.id,
            name: userData.name,
            email: userData.email,
            image: userData.image,
            plan: userData.plan,
            preferences: userData.preferences as UserPreferences | null,
            createdAt: userData.createdAt,
          }}
          usage={usage}
          availableTopics={availableTopics}
          followedTopicIds={followedTopics.map((t) => t.topicId)}
        />
      </main>

      <Footer />
    </div>
  );
}
