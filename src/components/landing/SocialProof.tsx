// src/components/landing/SocialProof.tsx
import { Card, CardContent } from "@/components/ui/card";
import {
  AcademicCapIcon,
  BeakerIcon,
  CodeBracketIcon,
} from "@heroicons/react/24/outline";

const testimonials = [
  {
    quote:
      "TrendScholar cut my paper review time in half. The AI summaries are surprisingly accurate and help me quickly identify relevant work for my research.",
    author: "Dr. Sarah Chen",
    role: "ML Research Lead",
    company: "Stanford AI Lab",
    icon: AcademicCapIcon,
  },
  {
    quote:
      "As a PhD student, keeping up with arxiv was overwhelming. Now I get a daily digest of papers in my niche, with the key contributions highlighted.",
    author: "Marcus Rodriguez",
    role: "PhD Candidate",
    company: "MIT CSAIL",
    icon: BeakerIcon,
  },
  {
    quote:
      "I use TrendScholar to track emerging techniques in my field. The topic trends feature helped me spot transformer alternatives before they went mainstream.",
    author: "Priya Patel",
    role: "Senior ML Engineer",
    company: "Google DeepMind",
    icon: CodeBracketIcon,
  },
];

const useCases = [
  {
    title: "Researchers",
    description:
      "Stay current with your field without spending hours on arxiv. Get AI summaries and track citation trends.",
    icon: AcademicCapIcon,
  },
  {
    title: "Graduate Students",
    description:
      "Build your literature review faster. Discover related work and understand key contributions at a glance.",
    icon: BeakerIcon,
  },
  {
    title: "ML Engineers",
    description:
      "Track the latest techniques and architectures. Know when new SOTA methods drop in your domain.",
    icon: CodeBracketIcon,
  },
];

export function SocialProof() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Use Cases */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Built for the research community
          </h2>
          <p className="text-lg text-muted-foreground">
            Whether you&apos;re publishing papers or building products, TrendScholar
            helps you stay informed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20">
          {useCases.map((useCase) => (
            <div
              key={useCase.title}
              className="text-center p-6"
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 mb-4">
                <useCase.icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{useCase.title}</h3>
              <p className="text-muted-foreground">{useCase.description}</p>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold tracking-tight mb-2">
            Loved by researchers worldwide
          </h3>
          <p className="text-muted-foreground">
            See what our community has to say
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.author} className="bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500">
                    <testimonial.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </div>
                <blockquote className="text-muted-foreground text-sm leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
