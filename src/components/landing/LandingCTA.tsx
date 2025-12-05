// src/components/landing/LandingCTA.tsx
"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

export function LandingCTA() {
  const { data: session } = useSession();

  // Hide CTA section if user is logged in
  if (session) {
    return null;
  }

  return (
    <section className="py-24 bg-gradient-to-b from-[#F8FAFC] to-[#e8f0f8] dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-slate-800 dark:text-white">
            Ready to transform your research workflow?
          </h2>
          <p className="text-lg text-[#64748b] dark:text-slate-300 mb-8">
            Save hours every week with TrendScholar. Start free, upgrade
            when you need more.
          </p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8 py-3 text-lg font-medium text-white transition-all shadow-lg shadow-blue-600/25"
          >
            Get started for free
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
