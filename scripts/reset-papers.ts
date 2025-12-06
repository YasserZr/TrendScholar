// scripts/reset-papers.ts
// Script to delete all papers and related data for a fresh start

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetPapers() {
  console.log('🗑️  Starting database cleanup...\n');

  try {
    // Delete in the correct order to respect foreign key constraints
    
    // 1. Delete saved papers (references papers and users)
    const savedPapers = await prisma.savedPaper.deleteMany({});
    console.log(`✅ Deleted ${savedPapers.count} saved papers`);

    // 2. Delete summaries (references papers)
    const summaries = await prisma.summary.deleteMany({});
    console.log(`✅ Deleted ${summaries.count} summaries`);

    // 3. Delete chat messages (references papers)
    const chatMessages = await prisma.chatMessage.deleteMany({});
    console.log(`✅ Deleted ${chatMessages.count} chat messages`);

    // 4. Delete papers (main table)
    const papers = await prisma.paper.deleteMany({});
    console.log(`✅ Deleted ${papers.count} papers`);

    console.log('\n✨ Database cleanup complete!');
    console.log('\nNext steps:');
    console.log('1. Restart your dev server if it\'s running');
    console.log('2. Go to your Qdrant dashboard and delete the "papers" collection');
    console.log('   URL: https://cloud.qdrant.io/');
    console.log('3. Browse papers in the app - they will be re-fetched from arXiv');
    console.log('4. Generate summaries - they will be created fresh each time (no caching)');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
resetPapers()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });
