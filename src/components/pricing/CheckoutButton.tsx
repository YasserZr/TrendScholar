// src/components/pricing/CheckoutButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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
