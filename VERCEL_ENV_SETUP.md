# Vercel Environment Variables Setup

## Required Environment Variables for Production

### Database Configuration

Make sure your `DATABASE_URL` in Vercel includes proper SSL parameters:

```
DATABASE_URL="postgresql://postgres.mzxvadpanbitbwbogokf:3Wfb0P6FFrrj1Apc@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require&sslaccept=accept_invalid_certs"
```

**Important:** The Supabase pooler uses self-signed certificates, so we need:
- `sslmode=require` - Forces SSL connection
- `sslaccept=accept_invalid_certs` - Accepts Supabase's self-signed certificate

### Alternative: Use Direct Connection

If pooler SSL continues to cause issues, use the direct (non-pooling) connection in production:

```
DATABASE_URL="postgresql://postgres.mzxvadpanbitbwbogokf:Rz65IuL6p3EQ5t4y@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

Or from your Supabase dashboard, use the "Connection string" (not "Session mode").

### Other Required Variables

Make sure these are set in Vercel:
- `NEXTAUTH_URL` - Your production URL (e.g., https://trendscholar.vercel.app)
- `NEXTAUTH_SECRET` - Same as in .env.local
- `GITHUB_ID` - GitHub OAuth App ID
- `GITHUB_SECRET` - GitHub OAuth App Secret
- `EMAIL_SERVER_HOST` - SMTP server host (e.g., smtp.resend.com)
- `EMAIL_SERVER_PORT` - SMTP port (usually 587)
- `EMAIL_SERVER_USER` - SMTP username
- `EMAIL_SERVER_PASSWORD` - SMTP password or API key
- `EMAIL_FROM` - Sender email address (e.g., noreply@trendscholar.com)
- `GEMINI_API_KEY` - Google AI API Key
- `QDRANT_URL` - Qdrant vector database URL
- `QDRANT_API_KEY` - Qdrant API key
- `TESTING_MODE` - "true" or "false"
- `NEXT_PUBLIC_TESTING_MODE` - Same as TESTING_MODE
- `CRON_SECRET` - Secret for cron job authentication

**Note:** See `EMAIL_SETUP.md` for detailed email configuration instructions.

### How to Add in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable for Production, Preview, and Development environments
4. Redeploy to apply changes

## Troubleshooting SSL Issues

If you continue to see "self-signed certificate" errors:

1. **Check the DATABASE_URL format** - Must include SSL parameters
2. **Use direct connection** - Avoid pooler if SSL issues persist
3. **Verify Supabase settings** - Ensure SSL is enabled in Supabase dashboard
4. **Check connection pooling** - Some environments may need connection pooling disabled
