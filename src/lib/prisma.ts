// src/lib/prisma.ts
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { parse } from "pg-connection-string";

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient__: PrismaClient | undefined;
}

/**
 * Singleton PrismaClient for Next.js (prevents multiple instances in dev hot reload).
 * Use server-only code (not suitable for Edge runtime).
 * 
 * Note: Prisma 7 requires a driver adapter for database connections.
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  // Parse the connection string and explicitly set SSL configuration
  const config = parse(connectionString);
  
  const pool = new Pool({
    host: config.host || undefined,
    port: config.port ? parseInt(config.port) : undefined,
    user: config.user || undefined,
    password: config.password || undefined,
    database: config.database || undefined,
    ssl: {
      rejectUnauthorized: false, // Accept self-signed certificates from Supabase pooler
    },
    max: 20, // Maximum pool connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({ adapter }) as unknown as PrismaClient;
}

const prisma = global.__prismaClient__ ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prismaClient__ = prisma;
}

export default prisma;