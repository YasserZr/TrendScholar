import { Header, Footer } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TrendScholar - AI-Powered Academic Summarizer",
  description: "Discover and summarize the latest academic research with AI-powered insights",
};

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TrendScholar
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            AI-powered academic research summarization. Discover trending papers,
            get instant summaries, and stay ahead in your field.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-medium text-white hover:bg-blue-700 transition-colors">
              Start Exploring
            </button>
            <button className="rounded-lg border border-border px-8 py-3 text-lg font-medium hover:bg-muted transition-colors">
              Learn More
            </button>
          </div>
        </section>

        {/* Features Section Placeholder */}
        <section className="container mx-auto px-4 py-16 border-t border-border/40">
          <h2 className="text-2xl font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {["AI Summaries", "Trend Analysis", "Research Insights"].map(
              (feature) => (
                <div
                  key={feature}
                  className="p-6 rounded-lg border border-border/40 bg-card"
                >
                  <h3 className="text-lg font-semibold mb-2">{feature}</h3>
                  <p className="text-muted-foreground">
                    Feature description placeholder. This will be expanded with
                    actual content.
                  </p>
                </div>
              )
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
