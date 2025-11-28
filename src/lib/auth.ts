// src/lib/auth.ts
// NextAuth configuration for TrendScholar

import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import EmailProvider from "next-auth/providers/email";
import GithubProvider from "next-auth/providers/github";
import prisma from "@/lib/prisma";
import type { Plan } from "@/generated/prisma/client";

/**
 * NextAuth configuration
 * - Uses PrismaAdapter for database sessions
 * - Email provider (magic link) as default, easy to extend
 * - GitHub OAuth as secondary option
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,

  providers: [
    // Email magic link provider (requires SMTP setup)
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM || "noreply@trendscholar.com",
    }),

    // GitHub OAuth (optional, easy to add more OAuth providers)
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GithubProvider({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
          }),
        ]
      : []),
  ],

  session: {
    strategy: "database", // Use database sessions (works with PrismaAdapter)
  },

  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },

  callbacks: {
    /**
     * Session callback - extend session with custom user fields
     */
    async session({ session, user }) {
      if (session.user) {
        // Fetch full user data from database
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            plan: true,
            stripeCustomerId: true,
            stripeSubscriptionId: true,
            stripeCurrentPeriodEnd: true,
          },
        });

        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.plan = dbUser.plan;
          session.user.subscriptionStatus = getSubscriptionStatus(dbUser);
        }
      }
      return session;
    },
  },

  events: {
    async createUser({ user }) {
      // Optional: Send welcome email, create Stripe customer, etc.
      console.log(`New user created: ${user.email}`);
    },
  },

  debug: process.env.NODE_ENV === "development",
};

/**
 * Derive subscription status from user data
 */
function getSubscriptionStatus(user: {
  plan: Plan;
  stripeSubscriptionId: string | null;
  stripeCurrentPeriodEnd: Date | null;
}): "active" | "inactive" | "past_due" | "canceled" {
  if (user.plan === "FREE") {
    return "active"; // Free tier is always "active"
  }

  if (!user.stripeSubscriptionId) {
    return "inactive";
  }

  if (user.stripeCurrentPeriodEnd && user.stripeCurrentPeriodEnd < new Date()) {
    return "past_due";
  }

  return "active";
}

export default authOptions;
