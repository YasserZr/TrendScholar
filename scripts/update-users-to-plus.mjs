// scripts/update-users-to-plus.mjs
// One-time script to update all existing users to PLUS plan during testing phase
// Run with: node --env-file=.env.local scripts/update-users-to-plus.mjs

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
  
  try {
    // First, let's see how many users we have
    const countResult = await pool.query('SELECT COUNT(*) FROM "User"');
    console.log(`Total users in database: ${countResult.rows[0].count}`);
    
    // Update all users to PLUS plan
    const updateResult = await pool.query(`UPDATE "User" SET "plan" = 'PLUS'`);
    
    console.log(`✅ Successfully updated ${updateResult.rowCount} users to PLUS plan`);
    
    // Verify the update
    const verifyResult = await pool.query(`SELECT COUNT(*) FROM "User" WHERE "plan" = 'PLUS'`);
    console.log(`Users with PLUS plan: ${verifyResult.rows[0].count}`);
    
    // List all users
    const usersResult = await pool.query('SELECT id, name, email, plan FROM "User"');
    console.log('\nUser list:');
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.email || user.name || user.id}: ${user.plan}`);
    });
    
  } catch (error) {
    console.error('❌ Error updating users:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
