// scripts/update-users-to-plus.js
// One-time script to update all existing users to PLUS plan during testing phase
// Run with: npx tsx --import ./scripts/update-users-to-plus.mjs

import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  const pool = new Pool({ 
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });
  
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  try {
    // First, let's see how many users we have
    const totalUsers = await prisma.user.count();
    console.log(`Total users in database: ${totalUsers}`);
    
    // Update all users to PLUS plan
    const result = await prisma.user.updateMany({
      data: {
        plan: 'PLUS'
      }
    });
    
    console.log(`✅ Successfully updated ${result.count} users to PLUS plan`);
    
    // Verify the update
    const plusUsers = await prisma.user.count({
      where: { plan: 'PLUS' }
    });
    console.log(`Users with PLUS plan: ${plusUsers}`);
    
  } catch (error) {
    console.error('❌ Error updating users:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
