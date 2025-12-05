// src/components/landing/Navbar.tsx
"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/UserMenu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Navbar() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#BCCCDC]/60 dark:border-slate-800/80 bg-[#F8FAFC]/90 dark:bg-slate-950/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/landing" className="flex items-center space-x-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            TrendScholar
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link
            href="#features"
            className="text-sm font-medium text-[#64748b] dark:text-slate-400 transition-colors hover:text-slate-800 dark:hover:text-white"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="text-sm font-medium text-[#64748b] dark:text-slate-400 transition-colors hover:text-slate-800 dark:hover:text-white"
          >
            Pricing
          </Link>
          <Link
            href="/explore"
            className="text-sm font-medium text-[#64748b] dark:text-slate-400 transition-colors hover:text-slate-800 dark:hover:text-white"
          >
            Explore
          </Link>
          {session && (
            <Link
              href="/dashboard"
              className="text-sm font-medium text-[#64748b] dark:text-slate-400 transition-colors hover:text-slate-800 dark:hover:text-white"
            >
              Dashboard
            </Link>
          )}
        </nav>

        {/* Auth Buttons */}
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
              <Button asChild variant="ghost" size="sm" className="text-[#64748b] dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
                <Link href="/auth/signin">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm">
                <Link href="/auth/signin">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
