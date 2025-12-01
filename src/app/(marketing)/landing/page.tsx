import type { Metadata } from "next";
import {
  Navbar,
  Hero,
  FeatureGrid,
  PricingSection,
  SocialProof,
  LandingFooter,
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

        {/* Social Proof / Use Cases */}
        <SocialProof />

        {/* Pricing Section */}
        <PricingSection />

        {/* CTA Section */}
        <section className="py-24">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                Ready to transform your research workflow?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join thousands of researchers who save hours every week with
                TrendScholar. Start free, upgrade when you need more.
              </p>
              <a
                href="/auth/signin"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-8 py-3 text-lg font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Get started for free
              </a>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
