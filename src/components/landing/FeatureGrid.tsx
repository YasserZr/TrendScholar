// src/components/landing/FeatureGrid.tsx
import {
  SparklesIcon,
  ChartBarIcon,
  BellIcon,
  BookOpenIcon,
  LightBulbIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

const features = [
  {
    name: "Daily AI Summaries",
    description:
      "Get concise TL;DR summaries of the latest papers, powered by GPT-4. Never miss a breakthrough again.",
    icon: SparklesIcon,
  },
  {
    name: "Topic Trends",
    description:
      "Track emerging research areas with real-time trend analysis. See what's gaining momentum in your field.",
    icon: ChartBarIcon,
  },
  {
    name: "Smart Digests",
    description:
      "Receive personalized email digests based on your followed topics. Daily or weekly, you choose.",
    icon: BellIcon,
  },
  {
    name: "Semantic Search",
    description:
      "Find related papers using vector similarity. Discover connections you might have missed.",
    icon: BookOpenIcon,
  },
  {
    name: "Key Contributions",
    description:
      "Instantly see the novel contributions of each paper, extracted and structured by AI.",
    icon: LightBulbIcon,
  },
  {
    name: "Save Hours Weekly",
    description:
      "Stop skimming dozens of abstracts. Our AI reads so you can focus on what matters.",
    icon: ClockIcon,
  },
];

export function FeatureGrid() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Everything you need to stay ahead
          </h2>
          <p className="text-lg text-muted-foreground">
            TrendScholar combines cutting-edge AI with a clean interface to
            transform how you consume academic research.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.name}
              className="relative group bg-card rounded-xl border p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-500/50"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600">
                  <feature.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold">{feature.name}</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
