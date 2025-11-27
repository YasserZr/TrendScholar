import { Header, Footer } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore | TrendScholar",
  description: "Explore trending academic research papers",
};

export default function ExplorePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Explore</h1>
          <p className="text-muted-foreground mt-2">
            Discover trending research papers across various fields.
          </p>
        </div>

        {/* Search Bar Placeholder */}
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <input
              type="text"
              placeholder="Search papers, topics, or authors..."
              className="w-full rounded-lg border border-border/40 bg-background px-4 py-3 pl-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Categories Placeholder */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Categories</h2>
          <div className="flex flex-wrap gap-2">
            {[
              "Machine Learning",
              "Natural Language Processing",
              "Computer Vision",
              "Robotics",
              "Bioinformatics",
              "Quantum Computing",
            ].map((category) => (
              <button
                key={category}
                className="rounded-full border border-border/40 px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Papers Grid Placeholder */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Trending Papers</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-lg border border-border/40 bg-card p-6"
              >
                <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                <div className="h-3 w-1/2 bg-muted rounded mb-4" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-3 w-2/3 bg-muted rounded" />
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Paper placeholder #{i}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
