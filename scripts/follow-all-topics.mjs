// scripts/follow-all-topics.mjs
// Make user follow all topics
import pg from 'pg';

const { Pool } = pg;

async function main() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Get all users
    const users = await pool.query('SELECT id, email FROM "User"');
    console.log('Users:', users.rows);

    // Get all topics
    const topics = await pool.query('SELECT id, name FROM "Topic"');
    console.log('Topics:', topics.rows.length);

    // For each user, follow all topics
    for (const user of users.rows) {
      console.log(`\nMaking ${user.email} follow all topics...`);
      
      for (const topic of topics.rows) {
        try {
          await pool.query(
            'INSERT INTO "UserTopic" ("userId", "topicId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [user.id, topic.id]
          );
          console.log(`  ✓ Following: ${topic.name}`);
        } catch (err) {
          console.log(`  - Already following: ${topic.name}`);
        }
      }
    }

    console.log('\n✅ Done! Users now follow all topics.');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
