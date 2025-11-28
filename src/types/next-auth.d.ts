// src/types/next-auth.d.ts
// Extend NextAuth types to include custom session fields

import type { Plan } from "@/generated/prisma/client";
import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      plan: Plan;
      subscriptionStatus: "active" | "inactive" | "past_due" | "canceled";
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    plan: Plan;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    plan: Plan;
    subscriptionStatus: "active" | "inactive" | "past_due" | "canceled";
  }
}
