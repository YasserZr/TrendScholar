// src/components/ui/TestingBanner.tsx
"use client";

import { BeakerIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";

export function TestingBanner() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Wait for client-side mount to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't render anything on server or before mount to avoid hydration issues
  if (!isMounted) {
    return null;
  }

  const isTestingMode = process.env.NEXT_PUBLIC_TESTING_MODE === "true";

  // Don't render if not in testing mode or dismissed
  if (!isTestingMode || isDismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 relative">
      <div className="container mx-auto flex items-center justify-center gap-3">
        <BeakerIcon className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium text-center">
          <span className="font-bold">🎉 Testing Mode Active:</span>{" "}
          All users have <span className="underline decoration-2">Plus plan features</span> enabled for free during our testing phase. Payments are temporarily disabled.
        </p>
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Dismiss banner"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
