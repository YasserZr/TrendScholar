// src/components/pricing/BillingPortalButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface BillingPortalButtonProps {
  returnUrl?: string;
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "link";
  className?: string;
}

export function BillingPortalButton({
  returnUrl,
  children,
  variant = "outline",
  className,
}: BillingPortalButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePortal = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ returnUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to open billing portal");
      }

      // Redirect to Stripe Billing Portal
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Billing portal error:", error);
      alert(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePortal}
      disabled={isLoading}
      variant={variant}
      className={className}
    >
      {isLoading ? "Loading..." : children}
    </Button>
  );
}
