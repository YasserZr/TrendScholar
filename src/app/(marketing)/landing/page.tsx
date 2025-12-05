import type { Metadata } from "next";
import {
  Navbar,
  Hero,
  FeatureGrid,
  PricingSection,
  LandingFooter,
  LandingCTA,
} from "@/components/landing";

export const metadata: Metadata = {
  title: "TrendScholar - AI-Powered Academic Paper Summaries & Research Trends",
  description:
    "Stay ahead of AI research without the overwhelm. Get AI-powered paper summaries, track emerging topics, and receive personalized digests.",
  openGraph: {
    title: "TrendScholar - AI-Powered Academic Paper Summaries",
    description:
      "Stay ahead of AI research without the overwhelm. Get AI-powered paper summaries, track emerging topics, and receive personalized digests.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrendScholar - AI-Powered Academic Paper Summaries",
    description:
      "Stay ahead of AI research without the overwhelm. Get AI-powered paper summaries, track emerging topics, and receive personalized digests.",
  },
};

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <Hero />

        {/* Features Section */}
        <section id="features">
          <FeatureGrid />
        </section>

        {/* Pricing Section */}
        <PricingSection />

        {/* CTA Section - hidden when logged in */}
        <LandingCTA />
      </main>

      <LandingFooter />
    </div>
  );
}
