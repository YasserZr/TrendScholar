# 🔧 Fix Production SSL Error - Action Required

## Error You're Seeing
```
Error opening a TLS connection: self-signed certificate in certificate chain
Code: P1011
```

## Root Cause
Supabase pooler connections use self-signed SSL certificates. While we've configured the Node.js pg driver to accept them (`rejectUnauthorized: false`), **you must also update your DATABASE_URL in Vercel**.

## ✅ Solution (Choose One)

### Option 1: Update DATABASE_URL with SSL Accept Parameter (Recommended)

1. **Go to Vercel Dashboard:**
   - Your Project → Settings → Environment Variables
   
2. **Find `DATABASE_URL`** and update it to:
   ```
   postgresql://postgres.mzxvadpanbitbwbogokf:3Wfb0P6FFrrj1Apc@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require&sslaccept=accept_invalid_certs
   ```
   
   **What changed:** Added `&sslaccept=accept_invalid_certs` at the end

3. **Save** and **Redeploy** your application

### Option 2: Use Supabase Direct Connection (Alternative)

If Option 1 doesn't work, use the **direct connection** (not pooler):

1. **Go to your Supabase Dashboard:**
   - Project → Settings → Database → Connection string
   - Copy the "Connection string" under **Session mode** (not Transaction mode)

2. **Update in Vercel:**
   ```
   postgresql://postgres.mzxvadpanbitbwbogokf:[YOUR_PASSWORD]@aws-1-eu-central-1.connect.supabase.com:5432/postgres?sslmode=require
   ```
   
   Note: Use port `5432` and `.connect.supabase.com` (not `.pooler.supabase.com`)

3. **Save** and **Redeploy**

### Option 3: Disable SSL Certificate Verification (Last Resort)

Add this environment variable in Vercel:
```
NODE_TLS_REJECT_UNAUTHORIZED=0
```

⚠️ **Warning:** This is insecure and should only be used temporarily for testing.

## Verify It's Working

After redeploying, try to sign in with GitHub. You should see:
- ✅ No SSL errors in logs
- ✅ Successful authentication
- ✅ User session created

## Still Having Issues?

Check these:

1. **Correct password:** Make sure the DATABASE_URL password is correct
2. **Port number:** Should be `5432` for direct or `6543` for pooler
3. **SSL mode:** Must include `sslmode=require`
4. **Supabase status:** Check if Supabase is having issues
5. **Connection limit:** Ensure you haven't exceeded Supabase's connection limit

## Current Configuration

Your current `src/lib/prisma.ts` is configured with:
- ✅ `rejectUnauthorized: false` for SSL
- ✅ Connection pooling (max 20 connections)
- ✅ Proper timeouts configured

The issue is **only** in the Vercel environment variable setup.
