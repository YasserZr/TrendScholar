// src/components/landing/Hero.tsx
"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

export function Hero() {
  const { data: session } = useSession();

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      {/* Background gradient - using new palette */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F8FAFC] via-[#D9EAFD]/30 to-[#F8FAFC] dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-[#D9EAFD]/40 to-[#BCCCDC]/20 dark:from-blue-600/10 dark:to-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-[#D9EAFD]/30 to-transparent dark:from-indigo-600/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#BCCCDC] dark:border-slate-700 bg-white/80 dark:bg-slate-800/60 backdrop-blur-sm px-4 py-1.5 text-sm mb-8 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[#64748b] dark:text-slate-300">
              Now tracking <strong className="text-slate-800 dark:text-white">50,000+</strong> papers across ML, AI & NLP
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl mb-6 text-slate-800 dark:text-white">
            Stay ahead of{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              AI research
            </span>
            <br />
            without the overwhelm
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-[#64748b] dark:text-slate-300 max-w-2xl mx-auto mb-10">
            TrendScholar uses AI to summarize the latest papers, track emerging
            topics, and deliver personalized digests — so you can focus on what
            matters.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!session ? (
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 shadow-lg shadow-blue-600/25">
                <Link href="/auth/signin">
                  Start free
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 shadow-lg shadow-blue-600/25">
                <Link href="/dashboard">
                  Go to Dashboard
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="lg" className="px-8 border-[#BCCCDC] bg-white/50 hover:bg-[#D9EAFD]/50 dark:border-slate-600 dark:bg-transparent dark:hover:bg-slate-800">
              <Link href="#pricing">View pricing</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
