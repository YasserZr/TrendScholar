import { AuthHeader, Footer } from "@/components/ui";
import { ExploreClient } from "@/components/explore";
import type { Metadata } from "next";
import prisma from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Explore Topics | TrendScholar",
  description: "Discover trending research topics and explore academic paper trends",
};

// Force dynamic rendering to avoid build-time fetch errors
export const dynamic = 'force-dynamic';

interface TrendDataPoint {
  date: string;
  count: number;
}

interface TopicResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  keywords: string[];
  paperCount: number;
  trendData: TrendDataPoint[] | null;
}

async function getTopics(): Promise<TopicResponse[]> {
  try {
    // Fetch topics directly from database to avoid localhost fetch issues
    const topics = await prisma.topic.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      take: 50, // Limit to top 50 topics
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        keywords: true,
        trendData: true,
        _count: {
          select: {
            papers: true,
          },
        },
      },
    });

    return topics.map((topic) => ({
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
      description: topic.description,
      keywords: topic.keywords,
      paperCount: topic._count.papers,
      trendData: topic.trendData as TrendDataPoint[] | null,
    }));
  } catch (error) {
    console.error("Error fetching topics:", error);
    return [];
  }
}

export default async function ExplorePage() {
  const topics = await getTopics();

  return (
    <div className="flex min-h-screen flex-col">
      <AuthHeader />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Explore</h1>
          <p className="text-muted-foreground mt-2">
            Discover trending research topics and track the pulse of academic innovation.
          </p>
        </div>

        <ExploreClient initialTopics={topics} />
      </main>

      <Footer />
    </div>
  );
}
