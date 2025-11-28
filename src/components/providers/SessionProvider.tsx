"use client";

// src/components/providers/SessionProvider.tsx
// Client-side SessionProvider wrapper for next-auth/react

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function SessionProvider({ children }: Props) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}

export default SessionProvider;
