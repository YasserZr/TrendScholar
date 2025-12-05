"use client";

// src/components/ui/AuthHeader.tsx
// Header with authentication state (client component)

import Link from "next/link";
import { useSession } from "next-auth/react";
import { SignInButton } from "@/components/auth/SignInButton";
import { UserMenu } from "@/components/auth/UserMenu";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface AuthHeaderProps {
  showNav?: boolean;
}

export function AuthHeader({ showNav = true }: AuthHeaderProps) {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#BCCCDC]/60 dark:border-slate-700/40 bg-[#F8FAFC]/95 dark:bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-[#F8FAFC]/80 dark:supports-[backdrop-filter]:bg-slate-950/60">
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
              className="text-sm font-medium text-[#64748b] transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            >
              Home
            </Link>
            <Link
              href="/explore"
              className="text-sm font-medium text-[#64748b] transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            >
              Explore
            </Link>
            {session && (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-[#64748b] transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="text-sm font-medium text-[#64748b] transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                >
                  Profile
                </Link>
              </>
            )}
          </nav>
        )}

        {/* Auth buttons */}
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 animate-pulse rounded-full bg-[#BCCCDC] dark:bg-slate-700" />
              <div className="h-4 w-20 animate-pulse rounded bg-[#BCCCDC] dark:bg-slate-700 hidden sm:block" />
            </div>
          ) : session ? (
            <UserMenu showName />
          ) : (
            <>
              <SignInButton variant="ghost" size="sm">
                Sign In
              </SignInButton>
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
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
