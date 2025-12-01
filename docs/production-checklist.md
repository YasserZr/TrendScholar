# TrendScholar Production Readiness Checklist

> Last updated: December 2025  
> Architecture: Next.js 15 + Prisma + Stripe + OpenAI + Qdrant on Vercel

---

## Table of Contents

1. [Environment Variables](#1-environment-variables)
2. [Vercel Configuration](#2-vercel-configuration)
3. [Database (PostgreSQL)](#3-database-postgresql)
4. [Stripe Configuration](#4-stripe-configuration)
5. [Cron Jobs](#5-cron-jobs)
6. [Security](#6-security)
7. [Performance](#7-performance)
8. [Monitoring & Observability](#8-monitoring--observability)
9. [Testing](#9-testing)
10. [Pre-Launch Final Checks](#10-pre-launch-final-checks)

---

## 1. Environment Variables

### Required Variables Checklist

#### Database
- [ ] `DATABASE_URL` - Production PostgreSQL connection string
- [ ] `DATABASE_URL_UNPOOLED` - Direct connection for migrations
- [ ] Verify connection uses `?sslmode=require` or `?sslmode=verify-full`

#### Authentication (NextAuth.js)
- [ ] `NEXTAUTH_URL` - Production URL (e.g., `https://trendscholar.com`)
- [ ] `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- [ ] `EMAIL_SERVER` - SMTP connection string for magic links
- [ ] `EMAIL_FROM` - Sender email address

#### Stripe
- [ ] `STRIPE_SECRET_KEY` - Live mode key (starts with `sk_live_`)
- [ ] `STRIPE_WEBHOOK_SECRET` - From Stripe Dashboard webhook config
- [ ] `STRIPE_PRICE_ID_PRO` - Live price ID for PRO plan
- [ ] `STRIPE_PRICE_ID_PLUS` - Live price ID for PLUS plan
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Live publishable key

#### OpenAI
- [ ] `OPENAI_API_KEY` - Production API key
- [ ] Verify billing is set up and usage limits are configured

#### Vector Database (Qdrant)
- [ ] `QDRANT_URL` - Production Qdrant Cloud URL
- [ ] `QDRANT_API_KEY` - API key for authentication
- [ ] Verify collection exists and is configured

#### Cron Security
- [ ] `CRON_SECRET` - Generate with `openssl rand -hex 32`

#### Error Tracking
- [ ] `SENTRY_DSN` - Sentry project DSN
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - Same DSN for client-side
- [ ] `SENTRY_AUTH_TOKEN` - For source map uploads (optional)

#### Application
- [ ] `NEXT_PUBLIC_APP_URL` - Production URL for links in emails
- [ ] `NODE_ENV` - Set to `production`

### Environment Variable Security
- [ ] All secrets are stored in Vercel Environment Variables (not `.env` files)
- [ ] Secrets are scoped to Production environment only where appropriate
- [ ] No secrets in git history (check with `git log -p | grep -i secret`)
- [ ] Team members use Vercel CLI to pull env vars (`vercel env pull`)

---

## 2. Vercel Configuration

### Project Settings
- [ ] Framework Preset: Next.js (auto-detected)
- [ ] Build Command: `prisma generate && next build`
- [ ] Install Command: `npm install` or `pnpm install`
- [ ] Root Directory: `.` (or subfolder if monorepo)

### Regions
- [ ] Function Region: Choose closest to your database
  - Recommended: Same region as your PostgreSQL instance
  - Example: `iad1` (US East) if using Neon/Supabase in `us-east-1`
- [ ] Edge Functions: Consider for auth checks if latency-critical

### Function Configuration
- [ ] Default timeout: 10s for most routes
- [ ] Cron job routes: 300s (5 min) - set in `vercel.json`
- [ ] Memory: 1024MB default, increase for AI routes if needed

### vercel.json Configuration
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/collector",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/summarizer", 
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/cron/notifier",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/cluster",
      "schedule": "0 0 * * 0"
    }
  ],
  "functions": {
    "src/app/api/cron/**/*.ts": {
      "maxDuration": 300
    },
    "src/app/api/summarize/route.ts": {
      "maxDuration": 60
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

### Domain Configuration
- [ ] Custom domain added and verified
- [ ] SSL certificate auto-provisioned
- [ ] WWW redirect configured (www → apex or vice versa)
- [ ] Preview deployments restricted to team (Settings → General)

---

## 3. Database (PostgreSQL)

### Connection Configuration
- [ ] Connection pooling enabled (PgBouncer or built-in)
  - Neon: Use pooled connection string
  - Supabase: Use connection pooler URL
  - Vercel Postgres: Pooling automatic
- [ ] Connection limit appropriate for serverless
  - Recommended: `connection_limit=10` in connection string
- [ ] SSL required: `?sslmode=require`

### Prisma Configuration
```typescript
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL_UNPOOLED") // For migrations
}

generator client {
  provider = "prisma-client-js"
}
```

### Database Checklist
- [ ] Migrations applied: `npx prisma migrate deploy`
- [ ] Indexes created for common queries:
  - `Paper.publishedAt`
  - `Paper.topicId`
  - `Summary.userId`
  - `Summary.paperId`
  - `UserTopic.userId`
  - `SavedPaper.userId`
- [ ] Database backups configured (daily minimum)
- [ ] Point-in-time recovery enabled (if available)
- [ ] Database region matches Vercel function region

### Performance
- [ ] Query performance tested with production-like data
- [ ] N+1 queries identified and fixed (use `include`/`select`)
- [ ] Large tables have appropriate pagination
- [ ] Connection pool size appropriate for expected traffic

---

## 4. Stripe Configuration

### Products & Prices (Live Mode)
- [ ] Create PRO product with monthly price
- [ ] Create PLUS product with monthly price
- [ ] Note price IDs and add to environment variables
- [ ] Configure product tax codes if required

### Customer Portal
- [ ] Enable Customer Portal in Stripe Dashboard
- [ ] Configure allowed actions:
  - [ ] Update payment methods
  - [ ] View invoice history
  - [ ] Cancel subscription
  - [ ] Switch plans (if desired)
- [ ] Set cancellation behavior (immediate vs. end of period)
- [ ] Customize portal branding

### Webhooks
- [ ] Create webhook endpoint in Stripe Dashboard
- [ ] Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
- [ ] Subscribe to events:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
- [ ] Copy signing secret to `STRIPE_WEBHOOK_SECRET`
- [ ] Test webhook with Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### Checkout Configuration
- [ ] Success URL configured: `https://yourdomain.com/dashboard?checkout=success`
- [ ] Cancel URL configured: `https://yourdomain.com/pricing`
- [ ] Customer email collection enabled
- [ ] Tax ID collection enabled (if required)

### Testing
- [ ] Test complete checkout flow with test card
- [ ] Test subscription upgrade/downgrade
- [ ] Test subscription cancellation
- [ ] Test failed payment handling
- [ ] Verify user plan updates correctly after each event

---

## 5. Cron Jobs

### Schedule Configuration
| Job | Schedule | Purpose | Max Duration |
|-----|----------|---------|--------------|
| Collector | `0 6 * * *` (6 AM UTC daily) | Fetch papers from ArXiv | 5 min |
| Summarizer | `0 7 * * *` (7 AM UTC daily) | Generate AI summaries | 5 min |
| Notifier | `0 8 * * *` (8 AM UTC daily) | Send digest emails | 5 min |
| Cluster | `0 0 * * 0` (Sunday midnight) | Update topic clusters | 5 min |

### Cron Security
- [ ] All cron routes validate `CRON_SECRET` header
- [ ] Routes return 401 for invalid/missing secret
- [ ] Vercel automatically sends `Authorization: Bearer <CRON_SECRET>`

### Cron Monitoring
- [ ] Structured logging implemented
- [ ] Success/failure metrics tracked
- [ ] Alerts configured for consecutive failures
- [ ] Manual trigger capability for testing

### Rate Limits & Quotas
- [ ] ArXiv API: Max 1 request per 3 seconds (implemented)
- [ ] OpenAI API: Rate limits monitored
- [ ] Email provider: Daily send limits checked

---

## 6. Security

### Authentication
- [ ] NextAuth.js configured with secure options
- [ ] Session strategy: JWT (recommended for serverless)
- [ ] CSRF protection enabled (automatic with NextAuth)
- [ ] Secure cookies in production (`secure: true`)

### Authorization
- [ ] All API routes check authentication
- [ ] Plan-based access control implemented
- [ ] User can only access their own data
- [ ] Admin routes protected (if any)

### Input Validation
- [ ] API request bodies validated with Zod
- [ ] URL parameters sanitized
- [ ] File uploads validated (if any)
- [ ] SQL injection prevented (Prisma handles this)

### Rate Limiting
- [ ] API routes rate limited (consider Vercel KV or Upstash)
- [ ] Auth routes rate limited (prevent brute force)
- [ ] Plan-based rate limits enforced:
  - FREE: 5 summaries/day
  - PRO: 50 summaries/day
  - PLUS: Unlimited

### Headers & CORS
- [ ] Security headers configured in `vercel.json` or `next.config.ts`
- [ ] CORS restricted to your domain for sensitive APIs
- [ ] Content-Security-Policy header (if needed)
- [ ] Referrer-Policy: `strict-origin-when-cross-origin`

### Secrets Management
- [ ] No secrets in client-side code
- [ ] API keys use `NEXT_PUBLIC_` prefix only when necessary
- [ ] Stripe publishable key is the only exposed payment key
- [ ] Server-only modules use `import "server-only"`

### Data Protection
- [ ] User data deletion capability exists
- [ ] Password hashing (if using credentials - N/A for magic links)
- [ ] Sensitive data encrypted at rest (database provider responsibility)
- [ ] PII handling compliant with regulations (GDPR, etc.)

---

## 7. Performance

### Next.js Optimization
- [ ] React Server Components used by default
- [ ] Client components minimized (`"use client"` only when needed)
- [ ] Dynamic imports for heavy components
- [ ] Route segments configured correctly:
  - Static pages use `export const dynamic = 'force-static'`
  - Dynamic pages use `export const dynamic = 'force-dynamic'`

### Caching Strategy
- [ ] Static pages cached appropriately
- [ ] API responses use `Cache-Control` headers where safe
- [ ] ISR (Incremental Static Regeneration) for semi-static content
- [ ] Explore page: `revalidate = 3600` (1 hour)

### Database Performance
- [ ] Queries optimized with proper `select` clauses
- [ ] Pagination implemented for list endpoints
- [ ] Indexes created for filtered/sorted columns
- [ ] Connection pooling configured

### Asset Optimization
- [ ] Images use `next/image` component
- [ ] External images configured in `next.config.ts`:
  ```ts
  images: {
    remotePatterns: [
      { hostname: 'avatars.githubusercontent.com' },
      { hostname: 'lh3.googleusercontent.com' },
    ],
  }
  ```
- [ ] Fonts optimized with `next/font`
- [ ] Bundle size monitored (`@next/bundle-analyzer`)

### Loading States
- [ ] `loading.tsx` files for all dynamic routes
- [ ] Suspense boundaries for async components
- [ ] Skeleton loaders provide good UX

### Error Handling
- [ ] `error.tsx` files for all routes
- [ ] Global error boundary in root layout
- [ ] Graceful degradation for failed API calls

---

## 8. Monitoring & Observability

### Error Tracking (Sentry)
- [ ] Sentry SDK installed and configured
- [ ] Source maps uploaded for production builds
- [ ] Error filtering configured (ignore expected errors)
- [ ] Performance monitoring enabled
- [ ] Alert rules configured for critical errors

### Logging
- [ ] Structured JSON logging implemented
- [ ] Request IDs for tracing
- [ ] User context included (when authenticated)
- [ ] Log levels appropriate for production

### Metrics to Track
- [ ] Cron job success/failure rates
- [ ] API response times (P50, P95, P99)
- [ ] Error rates by route
- [ ] Subscription conversion rates
- [ ] Daily active users

### Alerting
- [ ] Cron job failures → Slack/Email alert
- [ ] Error rate spike → PagerDuty/Slack
- [ ] Payment failures → Immediate notification
- [ ] Database connection issues → Alert

### Uptime Monitoring
- [ ] External uptime monitor configured (e.g., BetterUptime, Pingdom)
- [ ] Health check endpoint: `/api/health`
- [ ] Status page configured (optional)

---

## 9. Testing

### Unit Tests (Priority 1)
- [ ] `src/lib/plans.ts` - Plan features/limits helpers
- [ ] `src/lib/stripe.ts` - Price mapping, status mapping
- [ ] `src/lib/openai.ts` - Summary parsing, error handling
- [ ] `src/lib/log.ts` - Logger output format

### Integration Tests (Priority 2)
- [ ] Authentication flow (sign in, sign out)
- [ ] Subscription lifecycle (checkout → active → cancel)
- [ ] Paper summarization (rate limits, caching)
- [ ] Cron job execution (mocked external APIs)

### E2E Tests (Priority 3)
- [ ] Landing → Sign up → Dashboard flow
- [ ] Dashboard → Paper detail → Summary generation
- [ ] Billing → Checkout → Plan upgrade
- [ ] Profile update flow

### API Smoke Tests
- [ ] `GET /api/health` → 200
- [ ] `GET /api/papers` → 401 (unauthenticated)
- [ ] `GET /api/topics` → 200 with data
- [ ] `POST /api/stripe/webhook` → 400 (invalid signature)

### Test Commands
```bash
# Run all tests
npm test

# Run unit tests only
npm test -- --testPathPattern=unit

# Run with coverage
npm test -- --coverage

# E2E tests (requires running server)
npm run test:e2e
```

---

## 10. Pre-Launch Final Checks

### One Week Before Launch
- [ ] All environment variables set in Vercel Production
- [ ] Database migrated to production
- [ ] Stripe live mode configured and tested
- [ ] Cron jobs tested manually
- [ ] Error tracking verified (trigger test error)
- [ ] Performance tested under load
- [ ] Security audit completed
- [ ] Backup and restore procedure tested

### One Day Before Launch
- [ ] DNS propagation verified
- [ ] SSL certificate active
- [ ] All team members have appropriate access
- [ ] Rollback procedure documented
- [ ] Support email/channel ready
- [ ] Analytics tracking verified

### Launch Day
- [ ] Deploy to production
- [ ] Verify all routes accessible
- [ ] Test sign up flow end-to-end
- [ ] Test payment flow with real card (small amount, refund)
- [ ] Monitor error rates for first hour
- [ ] Verify cron jobs execute (wait for scheduled time or trigger manually)

### Post-Launch (First Week)
- [ ] Monitor error rates daily
- [ ] Review Sentry issues daily
- [ ] Check cron job logs daily
- [ ] Monitor database performance
- [ ] Collect user feedback
- [ ] Address critical bugs immediately

---

## Common Pitfalls to Avoid

### Database
1. **Cold start connection failures**: Use connection pooling
2. **Transaction timeouts**: Keep transactions short in serverless
3. **Missing indexes**: Add indexes before launch, not after performance issues
4. **N+1 queries**: Use `include` in Prisma queries

### Stripe
1. **Test vs Live keys**: Double-check environment variables
2. **Webhook signature verification**: Always verify in production
3. **Missing webhook events**: Subscribe to all necessary events
4. **Customer ID mismatch**: Ensure user.stripeCustomerId is set correctly

### Vercel
1. **Function timeout**: Cron jobs need extended timeout in `vercel.json`
2. **Region mismatch**: Function and database in different regions = latency
3. **Cold starts**: Keep functions warm with health checks
4. **Build size**: Monitor bundle size, use dynamic imports

### Security
1. **Exposed secrets**: Never use `NEXT_PUBLIC_` for sensitive keys
2. **Missing auth checks**: Every API route needs authentication
3. **Rate limiting**: Implement before launch to prevent abuse
4. **CORS**: Restrict origins in production

### Performance
1. **Client components everywhere**: Use Server Components by default
2. **Large page props**: Fetch data in Server Components, not as props
3. **Missing loading states**: Always provide feedback during loads
4. **Unoptimized images**: Use `next/image` for all images

---

## Quick Reference Commands

```bash
# Generate Prisma client
npx prisma generate

# Apply migrations to production
DATABASE_URL="<production-url>" npx prisma migrate deploy

# Test Stripe webhook locally
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Generate secure secrets
openssl rand -base64 32  # For NEXTAUTH_SECRET
openssl rand -hex 32     # For CRON_SECRET

# Check build locally
npm run build

# Analyze bundle size
ANALYZE=true npm run build
```

---

## Support & Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Sentry Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

---

*Checklist maintained by the TrendScholar team. Update as architecture evolves.*
