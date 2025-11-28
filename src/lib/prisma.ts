// src/lib/prisma.ts
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  var __prismaClient__: PrismaClient | undefined;
}

/**
 * Singleton PrismaClient for Next.js (prevents multiple instances in dev hot reload).
 * Use server-only code (not suitable for Edge runtime).
 */
function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = global.__prismaClient__ ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prismaClient__ = prisma;
}

export default prisma;