// src/app/api/cron/notifier/route.ts
// NotifierAgent: Sends daily/weekly digest emails to PRO/PLUS users
// Features new and trending papers in their followed topics

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max for Vercel Pro

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Notifier configuration
 */
const NOTIFIER_CONFIG = {
  // Maximum users to process per run
  batchSize: 100,
  
  // Number of papers to include in digest
  papersPerDigest: 5,
  
  // Minimum hours between digests for daily frequency
  minHoursBetweenDigests: 20,
  
  // Delay between emails (ms) for rate limiting
  delayBetweenEmailsMs: 100,
  
  // Days to look back for new papers
  newPapersDays: 1,
  
  // App URL for links
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://trendscholar.ai",
  
  // Email sender
  fromEmail: process.env.EMAIL_FROM || "digest@trendscholar.ai",
  fromName: "TrendScholar",
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface NotifierResult {
  success: boolean;
  stats: {
    usersProcessed: number;
    emailsSent: number;
    emailsSkipped: number;
    emailsFailed: number;
    errors: string[];
  };
  duration: number;
}

interface UserPreferences {
  digestEnabled?: boolean;
  digestFrequency?: "daily" | "weekly";
}

interface DigestPaper {
  id: string;
  title: string;
  arxivId: string;
  tldr: string;
  topicName: string;
  publishedAt: Date;
}

interface EligibleUser {
  id: string;
  name: string | null;
  email: string;
  preferences: UserPreferences | null;
  lastDigestAt: Date | null;
  topicIds: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Email Provider Integration (Resend)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send email using Resend API
 * 
 * Alternative providers:
 * - Postmark: POST https://api.postmarkapp.com/email
 * - SendGrid: POST https://api.sendgrid.com/v3/mail/send
 * - AWS SES: Use @aws-sdk/client-ses
 */
async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.warn("[notifier] RESEND_API_KEY not configured, skipping email");
    return { success: false, error: "Email provider not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${NOTIFIER_CONFIG.fromName} <${NOTIFIER_CONFIG.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Resend API error: ${response.status} ${errorData}`);
    }

    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[notifier] Email send failed:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Email Template
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate HTML email template for paper digest
 */
function generateDigestEmail(options: {
  userName: string;
  papers: DigestPaper[];
  frequency: "daily" | "weekly";
}): string {
  const { userName, papers, frequency } = options;
  const greeting = userName ? `Hi ${userName}` : "Hi there";
  const frequencyLabel = frequency === "daily" ? "Daily" : "Weekly";
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const paperCards = papers
    .map(
      (paper) => `
    <tr>
      <td style="padding: 20px; background-color: #ffffff; border-radius: 8px; margin-bottom: 16px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span style="display: inline-block; background-color: #e0e7ff; color: #4338ca; font-size: 12px; font-weight: 500; padding: 4px 8px; border-radius: 4px; margin-bottom: 8px;">
                ${escapeHtml(paper.topicName)}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 8px;">
              <a href="${NOTIFIER_CONFIG.appUrl}/papers/${paper.id}" style="color: #1e293b; font-size: 18px; font-weight: 600; text-decoration: none; line-height: 1.4;">
                ${escapeHtml(paper.title)}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 12px;">
              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">
                ${escapeHtml(paper.tldr)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 16px;">
              <a href="${NOTIFIER_CONFIG.appUrl}/papers/${paper.id}" style="display: inline-block; color: #4f46e5; font-size: 14px; font-weight: 500; text-decoration: none;">
                Read Summary →
              </a>
              <a href="https://arxiv.org/abs/${paper.arxivId}" style="display: inline-block; color: #64748b; font-size: 14px; margin-left: 16px; text-decoration: none;">
                arXiv
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td style="height: 16px;"></td></tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${frequencyLabel} Research Digest</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <!-- Header -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #4f46e5;">
                📚 TrendScholar
              </h1>
              <p style="margin: 8px 0 0 0; color: #64748b; font-size: 14px;">
                ${frequencyLabel} Research Digest • ${dateStr}
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding-bottom: 24px;">
              <p style="margin: 0; font-size: 16px; color: #334155;">
                ${greeting}! 👋
              </p>
              <p style="margin: 12px 0 0 0; font-size: 16px; color: #334155;">
                Here are the latest papers from your followed topics, summarized by AI for quick reading.
              </p>
            </td>
          </tr>

          <!-- Papers -->
          ${paperCards}

          <!-- CTA -->
          <tr>
            <td style="text-align: center; padding: 32px 0;">
              <a href="${NOTIFIER_CONFIG.appUrl}/explore" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-size: 16px; font-weight: 500; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
                Explore More Papers
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align: center; padding-top: 32px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 14px; color: #94a3b8;">
                You're receiving this because you're a ${frequencyLabel.toLowerCase()} digest subscriber.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 14px;">
                <a href="${NOTIFIER_CONFIG.appUrl}/profile" style="color: #64748b; text-decoration: underline;">
                  Manage preferences
                </a>
                <span style="color: #cbd5e1; margin: 0 8px;">•</span>
                <a href="${NOTIFIER_CONFIG.appUrl}/profile" style="color: #64748b; text-decoration: underline;">
                  Unsubscribe
                </a>
              </p>
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} TrendScholar. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate cron secret token
 */
function validateCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("[notifier] CRON_SECRET not configured");
    return false;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const secretHeader = request.headers.get("x-cron-secret");
  if (secretHeader === cronSecret) {
    return true;
  }

  return false;
}

/**
 * Sleep for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if user is due for a digest based on frequency and last sent time
 */
function isDueForDigest(
  lastDigestAt: Date | null,
  frequency: "daily" | "weekly"
): boolean {
  if (!lastDigestAt) return true;

  const now = new Date();
  const hoursSinceLastDigest =
    (now.getTime() - lastDigestAt.getTime()) / (1000 * 60 * 60);

  if (frequency === "daily") {
    return hoursSinceLastDigest >= NOTIFIER_CONFIG.minHoursBetweenDigests;
  } else {
    // Weekly: at least 6 days
    return hoursSinceLastDigest >= 144;
  }
}

/**
 * Parse user preferences from JSON
 */
function parsePreferences(prefs: unknown): UserPreferences {
  if (!prefs || typeof prefs !== "object") {
    return { digestEnabled: true, digestFrequency: "daily" };
  }

  const p = prefs as Record<string, unknown>;
  return {
    digestEnabled: p.digestEnabled !== false, // Default true
    digestFrequency:
      p.digestFrequency === "weekly" ? "weekly" : "daily",
  };
}

/**
 * Parse summary content to extract TL;DR
 */
function extractTldr(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (parsed.tldr) return parsed.tldr;
  } catch {
    // Not JSON, use raw content
  }
  // Truncate to ~200 chars
  return content.length > 200 ? content.slice(0, 200) + "..." : content;
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find eligible users for digest emails
 * 
 * Eligibility:
 * - Plan: PRO or PLUS
 * - Email: Verified and exists
 * - Preferences: Digest enabled (or null = default enabled)
 * - Timing: Due for digest based on frequency
 */
async function findEligibleUsers(limit: number): Promise<EligibleUser[]> {
  const users = await prisma.user.findMany({
    where: {
      // PRO or PLUS plan
      plan: { in: ["PRO", "PLUS"] },
      // Email must exist and be verified
      email: { not: null },
      emailVerified: { not: null },
      // Active subscription
      subscriptionStatus: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      preferences: true,
      lastDigestAt: true,
      topicsFollowed: {
        select: {
          topicId: true,
        },
      },
    },
    take: limit,
    orderBy: {
      lastDigestAt: "asc", // Process oldest first
    },
  });

  // Filter by preferences and timing
  return users
    .filter((user) => {
      const prefs = parsePreferences(user.preferences);
      
      // Skip if digest disabled
      if (!prefs.digestEnabled) return false;
      
      // Skip if not due for digest
      if (!isDueForDigest(user.lastDigestAt, prefs.digestFrequency || "daily")) {
        return false;
      }
      
      return true;
    })
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email!,
      preferences: parsePreferences(user.preferences),
      lastDigestAt: user.lastDigestAt,
      topicIds: user.topicsFollowed.map((t) => t.topicId),
    }));
}

/**
 * Find new/trending papers for a user's followed topics
 * 
 * Query pattern:
 * 1. Get papers from user's followed topics
 * 2. Filter to recent papers (last 24h for daily, 7d for weekly)
 * 3. Prioritize papers with completed summaries
 * 4. Order by publishedAt desc (newest first)
 */
async function findPapersForUser(
  user: EligibleUser
): Promise<DigestPaper[]> {
  const frequency = user.preferences?.digestFrequency || "daily";
  const daysBack = frequency === "daily" ? NOTIFIER_CONFIG.newPapersDays : 7;
  
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - daysBack);

  // If user has no followed topics, get trending papers from any topic
  const topicFilter = user.topicIds.length > 0
    ? { topicId: { in: user.topicIds } }
    : {};

  const papers = await prisma.paper.findMany({
    where: {
      ...topicFilter,
      publishedAt: { gte: sinceDate },
      // Must have a completed summary
      summaries: {
        some: {
          status: "COMPLETED",
        },
      },
    },
    select: {
      id: true,
      title: true,
      arxivId: true,
      publishedAt: true,
      topic: {
        select: {
          name: true,
        },
      },
      summaries: {
        where: { status: "COMPLETED" },
        select: { content: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { publishedAt: "desc" },
    take: NOTIFIER_CONFIG.papersPerDigest,
  });

  return papers.map((paper) => ({
    id: paper.id,
    title: paper.title,
    arxivId: paper.arxivId,
    tldr: paper.summaries[0]
      ? extractTldr(paper.summaries[0].content)
      : "Summary available on TrendScholar.",
    topicName: paper.topic?.name || "Research",
    publishedAt: paper.publishedAt,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cron/notifier
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/cron/notifier
 * 
 * NotifierAgent: Sends digest emails to eligible PRO/PLUS users.
 * 
 * Security:
 * - Requires valid CRON_SECRET in Authorization header
 * - Intended to be called by Vercel Cron daily
 * 
 * Response (200):
 * ```json
 * {
 *   "success": true,
 *   "stats": {
 *     "usersProcessed": 50,
 *     "emailsSent": 45,
 *     "emailsSkipped": 3,
 *     "emailsFailed": 2,
 *     "errors": ["Failed to send to user@example.com: ..."]
 *   },
 *   "duration": 15000
 * }
 * ```
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<NotifierResult>> {
  const startTime = Date.now();

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Validate Secret Token
  // ─────────────────────────────────────────────────────────────────────────
  if (!validateCronSecret(request)) {
    console.error("[notifier] Unauthorized request");
    return NextResponse.json(
      {
        success: false,
        stats: {
          usersProcessed: 0,
          emailsSent: 0,
          emailsSkipped: 0,
          emailsFailed: 0,
          errors: ["Unauthorized: Invalid or missing CRON_SECRET"],
        },
        duration: Date.now() - startTime,
      },
      { status: 401 }
    );
  }

  console.log("[notifier] Starting notification run");

  const stats = {
    usersProcessed: 0,
    emailsSent: 0,
    emailsSkipped: 0,
    emailsFailed: 0,
    errors: [] as string[],
  };

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 2. Find Eligible Users
    // ─────────────────────────────────────────────────────────────────────────
    const users = await findEligibleUsers(NOTIFIER_CONFIG.batchSize);

    console.log(`[notifier] Found ${users.length} eligible users`);

    if (users.length === 0) {
      console.log("[notifier] No users due for digest");
      return NextResponse.json({
        success: true,
        stats,
        duration: Date.now() - startTime,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Process Each User
    // ─────────────────────────────────────────────────────────────────────────
    for (const user of users) {
      stats.usersProcessed++;

      try {
        // Find papers for user
        const papers = await findPapersForUser(user);

        if (papers.length === 0) {
          console.log(`[notifier] No papers for user ${user.id}, skipping`);
          stats.emailsSkipped++;
          continue;
        }

        // Generate email
        const frequency = user.preferences?.digestFrequency || "daily";
        const html = generateDigestEmail({
          userName: user.name || "",
          papers,
          frequency,
        });

        const subject =
          frequency === "daily"
            ? `📚 Your Daily Research Digest - ${papers.length} new papers`
            : `📚 Your Weekly Research Digest - ${papers.length} papers`;

        // Send email
        const result = await sendEmail({
          to: user.email,
          subject,
          html,
        });

        if (result.success) {
          stats.emailsSent++;
          console.log(`[notifier] ✓ Sent digest to ${user.email}`);

          // Update last digest timestamp
          await prisma.user.update({
            where: { id: user.id },
            data: { lastDigestAt: new Date() },
          });
        } else {
          stats.emailsFailed++;
          stats.errors.push(`Failed to send to ${user.email}: ${result.error}`);
        }

        // Rate limiting delay
        await sleep(NOTIFIER_CONFIG.delayBetweenEmailsMs);

      } catch (error) {
        stats.emailsFailed++;
        const errorMsg = `Error processing user ${user.id}: ${error}`;
        console.error(`[notifier] ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }

  } catch (error) {
    const errorMsg = `Notifier error: ${error}`;
    console.error(`[notifier] ${errorMsg}`);
    stats.errors.push(errorMsg);
  }

  const duration = Date.now() - startTime;

  console.log(`[notifier] Completed in ${duration}ms:`, {
    usersProcessed: stats.usersProcessed,
    emailsSent: stats.emailsSent,
    emailsFailed: stats.emailsFailed,
  });

  return NextResponse.json({
    success: stats.emailsFailed === 0,
    stats,
    duration,
  });
}
