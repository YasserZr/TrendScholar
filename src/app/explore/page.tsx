import { AuthHeader, Footer } from "@/components/ui";
import { ExploreClient } from "@/components/explore";
import type { Metadata } from "next";

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

interface TopicsApiResponse {
  success: boolean;
  data?: TopicResponse[];
  error?: string;
}

async function getTopics(): Promise<TopicResponse[]> {
  try {
    // In production, use absolute URL or fetch from API
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/topics?sortBy=paperCount&sortOrder=desc&includeTrends=true`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (!response.ok) {
      console.error("Failed to fetch topics:", response.status);
      return [];
    }

    const data: TopicsApiResponse = await response.json();
    return data.success && data.data ? data.data : [];
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
