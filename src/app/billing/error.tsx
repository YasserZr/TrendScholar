"use client";

// src/app/billing/error.tsx
// Error boundary for the billing route

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BillingError({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        error_boundary: "billing",
        page: "billing",
        payment_flow: "true",
      },
      extra: {
        digest: error.digest,
      },
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <CreditCard className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Billing Error</CardTitle>
          <CardDescription>
            We couldn&apos;t load your billing information. Please try again or contact support if the issue persists.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV !== "production" && (
            <div className="bg-slate-100 rounded-lg p-4 overflow-auto max-h-40">
              <p className="text-sm font-mono text-slate-700">{error.message}</p>
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={reset} variant="default" className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
            </Button>
          </div>
          <p className="text-center text-sm text-slate-500">
            Need help?{" "}
            <a href="mailto:support@trendscholar.com" className="text-blue-600 hover:underline">
              Contact support
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
