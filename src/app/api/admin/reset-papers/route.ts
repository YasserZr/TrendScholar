// src/app/api/admin/reset-papers/route.ts
// API route to delete all papers and related data

import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { parse } from "pg-connection-string";

export async function POST(request: NextRequest) {
  let pool: Pool | null = null;
  
  try {
    console.log('🗑️  Starting database cleanup...');

    // Create database connection
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL not set");
    }

    const config = parse(connectionString);
    pool = new Pool({
      host: config.host || undefined,
      port: config.port ? parseInt(config.port) : undefined,
      user: config.user || undefined,
      password: config.password || undefined,
      database: config.database || undefined,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 0,
      connectionTimeoutMillis: 10000,
    });

    // Delete in the correct order to respect foreign key constraints using raw SQL
    
    // 1. Delete saved papers
    console.log('Deleting saved papers...');
    const savedPapersResult = await pool.query('DELETE FROM "SavedPaper"');
    console.log(`✅ Deleted ${savedPapersResult.rowCount} saved papers`);

    // 2. Delete summaries
    console.log('Deleting summaries...');
    const summariesResult = await pool.query('DELETE FROM "Summary"');
    console.log(`✅ Deleted ${summariesResult.rowCount} summaries`);

    // 3. Delete chat messages
    console.log('Deleting chat messages...');
    const messagesResult = await pool.query('DELETE FROM "Message"');
    console.log(`✅ Deleted ${messagesResult.rowCount} chat messages`);

    // 4. Delete chats
    console.log('Deleting chats...');
    const chatsResult = await pool.query('DELETE FROM "Chat"');
    console.log(`✅ Deleted ${chatsResult.rowCount} chats`);

    // 5. Delete papers (main table)
    console.log('Deleting papers...');
    const papersResult = await pool.query('DELETE FROM "Paper"');
    console.log(`✅ Deleted ${papersResult.rowCount} papers`);

    console.log('✨ Database cleanup complete!');

    return NextResponse.json({
      success: true,
      message: 'Database cleanup complete',
      deleted: {
        savedPapers: savedPapersResult.rowCount || 0,
        summaries: summariesResult.rowCount || 0,
        messages: messagesResult.rowCount || 0,
        chats: chatsResult.rowCount || 0,
        papers: papersResult.rowCount || 0,
      },
      nextSteps: [
        'Go to your Qdrant dashboard and delete the "papers" collection',
        'URL: https://cloud.qdrant.io/',
        'Browse papers in the app - they will be re-fetched from arXiv',
        'Generate summaries - they will be created fresh each time (no caching)',
      ],
    });

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  } finally {
    // Clean up connection
    if (pool) {
      await pool.end();
    }
  }
}
