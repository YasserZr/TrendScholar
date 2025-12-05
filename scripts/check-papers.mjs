// scripts/check-papers.mjs
import pg from 'pg';

const { Pool } = pg;

async function main() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Count papers
    const paperCount = await pool.query('SELECT COUNT(*) as count FROM "Paper"');
    console.log('Papers in database:', paperCount.rows[0].count);

    // Count summaries
    const summaryCount = await pool.query('SELECT COUNT(*) as count FROM "Summary"');
    console.log('Summaries in database:', summaryCount.rows[0].count);

    // Count completed summaries
    const completedCount = await pool.query('SELECT COUNT(*) as count FROM "Summary" WHERE status = \'COMPLETED\'');
    console.log('Completed summaries:', completedCount.rows[0].count);

    // Count topics
    const topicCount = await pool.query('SELECT COUNT(*) as count FROM "Topic"');
    console.log('Topics in database:', topicCount.rows[0].count);

    // List topics
    const topics = await pool.query('SELECT id, name, slug FROM "Topic"');
    console.log('\nTopics:');
    topics.rows.forEach(t => console.log(`  - ${t.name} (${t.slug}) - ID: ${t.id}`));

    // Check UserTopic (users following topics)
    const userTopicCount = await pool.query('SELECT COUNT(*) as count FROM "UserTopic"');
    console.log('\nUser-Topic follows:', userTopicCount.rows[0].count);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
