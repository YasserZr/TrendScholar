"use client";

// src/components/ui/AuthHeader.tsx
// Header with authentication state (client component)

import Link from "next/link";
import { useSession } from "next-auth/react";
import { SignInButton } from "@/components/auth/SignInButton";
import { UserMenu } from "@/components/auth/UserMenu";
import { Button } from "@/components/ui/button";

interface AuthHeaderProps {
  showNav?: boolean;
}

export function AuthHeader({ showNav = true }: AuthHeaderProps) {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            TrendScholar
          </span>
        </Link>

        {showNav && (
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/landing"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Home
            </Link>
            <Link
              href="/explore"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Explore
            </Link>
            {session && (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Profile
                </Link>
              </>
            )}
          </nav>
        )}

        {/* Auth buttons */}
        <div className="flex items-center space-x-4">
          {isLoading ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
          ) : session ? (
            <UserMenu />
          ) : (
            <>
              <SignInButton variant="ghost" size="sm">
                Sign In
              </SignInButton>
              <Button asChild size="sm">
                <Link href="/auth/signin">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default AuthHeader;
