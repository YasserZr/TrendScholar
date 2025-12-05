// src/components/pricing/CheckoutButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Testing mode flag - when enabled, checkout buttons are disabled
 * Matches TESTING_MODE in checkSubscription.ts
 */
const TESTING_MODE = process.env.NEXT_PUBLIC_TESTING_MODE === "true";

interface CheckoutButtonProps {
  plan: "PRO" | "PLUS";
  highlighted?: boolean;
  children: React.ReactNode;
}

interface CheckoutResponse {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
  code?: string;
}

export function CheckoutButton({ plan, highlighted, children }: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    // Prevent checkout during testing mode
    if (TESTING_MODE) {
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const data: CheckoutResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // In testing mode, show disabled button with special text
  if (TESTING_MODE) {
    return (
      <div className="w-full">
        <Button
          disabled
          className={`w-full opacity-60 cursor-not-allowed ${highlighted ? "bg-blue-600" : ""}`}
          variant={highlighted ? "default" : "outline"}
        >
          🧪 Plus Active (Testing)
        </Button>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 text-center">
          Payments disabled during testing
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Button
        onClick={handleCheckout}
        disabled={isLoading}
        className={`w-full ${highlighted ? "bg-blue-600 hover:bg-blue-700" : ""}`}
        variant={highlighted ? "default" : "outline"}
      >
        {isLoading ? "Redirecting..." : children}
      </Button>
      {error && (
        <p className="text-sm text-red-500 mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
