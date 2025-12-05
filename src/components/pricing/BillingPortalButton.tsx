// src/components/pricing/BillingPortalButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Testing mode flag - when enabled, billing portal is disabled
 * Matches TESTING_MODE in checkSubscription.ts
 */
const TESTING_MODE = process.env.NEXT_PUBLIC_TESTING_MODE === "true";

interface BillingPortalButtonProps {
  returnUrl?: string;
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "link";
  className?: string;
}

interface PortalResponse {
  success: boolean;
  portalUrl?: string;
  error?: string;
  code?: string;
}

export function BillingPortalButton({
  returnUrl,
  children,
  variant = "outline",
  className,
}: BillingPortalButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePortal = async () => {
    // Prevent portal access during testing mode
    if (TESTING_MODE) {
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ returnUrl }),
      });

      const data: PortalResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to open billing portal");
      }

      // Redirect to Stripe Billing Portal
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err) {
      console.error("Billing portal error:", err);
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // In testing mode, show disabled button
  if (TESTING_MODE) {
    return (
      <div className={className}>
        <Button
          disabled
          variant={variant}
          className="w-full opacity-60 cursor-not-allowed"
        >
          🧪 Billing Disabled (Testing)
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <Button
        onClick={handlePortal}
        disabled={isLoading}
        variant={variant}
        className="w-full"
      >
        {isLoading ? "Redirecting..." : children}
      </Button>
      {error && (
        <p className="text-sm text-red-500 mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
