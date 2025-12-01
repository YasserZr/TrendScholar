// src/components/pricing/CheckoutButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CheckoutButtonProps {
  plan: "PRO" | "PLUS";
  highlighted?: boolean;
  children: React.ReactNode;
}

export function CheckoutButton({ plan, highlighted, children }: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={isLoading}
      className={`w-full ${highlighted ? "bg-blue-600 hover:bg-blue-700" : ""}`}
      variant={highlighted ? "default" : "outline"}
    >
      {isLoading ? "Loading..." : children}
    </Button>
  );
}
