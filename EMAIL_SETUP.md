# Email Authentication Setup for TrendScholar

## Overview

TrendScholar supports email-based "magic link" authentication for users without GitHub accounts. This guide covers how to set up SMTP for email delivery.

## Current Status

✅ **UI Complete**: Email sign-in form is ready at `/auth/signin`
✅ **Verification Page**: Email sent confirmation page exists at `/auth/verify-request`
✅ **NextAuth Config**: Email provider is configured in `src/lib/auth.ts`
❌ **SMTP Not Configured**: Email environment variables are missing

## Required Environment Variables

Add these to your `.env.local` (development) and Vercel (production):

### Option 1: Gmail SMTP (Recommended for Development)

```env
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=noreply@trendscholar.com
```

**How to get Gmail App Password:**
1. Enable 2-Factor Authentication on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Create a new app password for "Mail"
4. Use the generated 16-character password as `EMAIL_SERVER_PASSWORD`

### Option 2: SendGrid (Recommended for Production)

```env
EMAIL_SERVER_HOST=smtp.sendgrid.net
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=apikey
EMAIL_SERVER_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=noreply@trendscholar.com
```

**How to get SendGrid API Key:**
1. Sign up at https://sendgrid.com/ (free tier: 100 emails/day)
2. Go to Settings → API Keys
3. Create a new API key with "Mail Send" permissions
4. Copy the key and use as `EMAIL_SERVER_PASSWORD`

### Option 3: Resend (Modern Alternative)

```env
EMAIL_SERVER_HOST=smtp.resend.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=resend
EMAIL_SERVER_PASSWORD=your-resend-api-key
EMAIL_FROM=noreply@trendscholar.com
```

**How to get Resend API Key:**
1. Sign up at https://resend.com/ (free tier: 3000 emails/month)
2. Go to API Keys
3. Create a new API key
4. Use the key as `EMAIL_SERVER_PASSWORD`

### Option 4: AWS SES (Enterprise)

```env
EMAIL_SERVER_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-ses-smtp-username
EMAIL_SERVER_PASSWORD=your-ses-smtp-password
EMAIL_FROM=noreply@trendscholar.com
```

## Setup Instructions

### Local Development

1. **Add to `.env.local`:**
   ```bash
   # Email Configuration (choose one option from above)
   EMAIL_SERVER_HOST=smtp.gmail.com
   EMAIL_SERVER_PORT=587
   EMAIL_SERVER_USER=your-email@gmail.com
   EMAIL_SERVER_PASSWORD=your-app-password
   EMAIL_FROM=noreply@trendscholar.com
   ```

2. **Test the setup:**
   ```bash
   npm run dev
   ```
   
3. **Try signing in with email:**
   - Go to http://localhost:3000/auth/signin
   - Enter your email address
   - Click "Send Magic Link"
   - Check your inbox for the magic link

### Production (Vercel)

1. **Go to Vercel Dashboard:**
   - Your Project → Settings → Environment Variables

2. **Add the email variables:**
   - `EMAIL_SERVER_HOST`
   - `EMAIL_SERVER_PORT`
   - `EMAIL_SERVER_USER`
   - `EMAIL_SERVER_PASSWORD`
   - `EMAIL_FROM`

3. **Redeploy your application**

## Email Template Customization (Optional)

The default NextAuth email template is functional but basic. To customize it:

1. **Create custom email template:**
   ```typescript
   // src/lib/email-template.ts
   export function html({ url, host }: { url: string; host: string }) {
     return `
   <!DOCTYPE html>
   <html>
     <head>
       <style>
         body { font-family: Arial, sans-serif; }
         .container { max-width: 600px; margin: 0 auto; padding: 20px; }
         .button { 
           background: #2563eb; 
           color: white; 
           padding: 12px 24px; 
           text-decoration: none;
           border-radius: 6px;
           display: inline-block;
         }
       </style>
     </head>
     <body>
       <div class="container">
         <h1>Sign in to TrendScholar</h1>
         <p>Click the button below to sign in to your account:</p>
         <a href="${url}" class="button">Sign in</a>
         <p>Or copy and paste this link: ${url}</p>
         <p>This link will expire in 24 hours.</p>
       </div>
     </body>
   </html>
     `;
   }

   export function text({ url, host }: { url: string; host: string }) {
     return `Sign in to ${host}\n\n${url}\n\n`;
   }
   ```

2. **Update auth config:**
   ```typescript
   import { html, text } from "@/lib/email-template";

   EmailProvider({
     server: { /* ... */ },
     from: process.env.EMAIL_FROM,
     // Add custom templates
     sendVerificationRequest: async ({ identifier, url, provider }) => {
       await provider.sendMail({
         to: identifier,
         from: provider.from,
         subject: "Sign in to TrendScholar",
         text: text({ url, host: process.env.NEXTAUTH_URL! }),
         html: html({ url, host: process.env.NEXTAUTH_URL! }),
       });
     },
   })
   ```

## Testing

### Test Email Delivery Locally

1. Use a service like **Mailtrap** for development:
   ```env
   EMAIL_SERVER_HOST=sandbox.smtp.mailtrap.io
   EMAIL_SERVER_PORT=2525
   EMAIL_SERVER_USER=your-mailtrap-user
   EMAIL_SERVER_PASSWORD=your-mailtrap-password
   EMAIL_FROM=noreply@trendscholar.com
   ```

2. Sign up at https://mailtrap.io/ (free for development)
3. All emails will be captured in Mailtrap's inbox for testing

## Troubleshooting

### "Failed to send email" error

**Check:**
- SMTP credentials are correct
- Port is correct (usually 587 for TLS)
- Gmail: Using app password, not account password
- SendGrid: API key has "Mail Send" permission
- Firewall/antivirus not blocking port 587

### Email not arriving

**Check:**
- Spam folder
- Email provider's logs (SendGrid/Resend dashboard)
- `EMAIL_FROM` address is valid
- For production: Verify sender domain

### "Invalid login" error

**Common causes:**
- Gmail: Not using app password
- Gmail: 2FA not enabled
- SendGrid: Username should be exactly `apikey`
- Wrong password/API key

## Security Best Practices

1. **Never commit `.env.local`** to git (already in .gitignore)
2. **Use different credentials** for development and production
3. **Rotate API keys** regularly
4. **Monitor email sending** quotas and logs
5. **Verify sender domain** in production (reduces spam)

## Free Tier Limits

| Provider | Free Tier | Best For |
|----------|-----------|----------|
| Gmail | 500/day | Development |
| SendGrid | 100/day | Small projects |
| Resend | 3000/month | Modern apps |
| Mailtrap | Unlimited* | Testing only |

*Mailtrap emails don't actually send, they're captured for testing

## Next Steps

1. Choose an email provider (Resend recommended for production)
2. Add environment variables to `.env.local`
3. Test sign-in with email
4. Add same variables to Vercel for production
5. (Optional) Customize email template
6. Monitor email delivery in provider dashboard

## Support

If you encounter issues:
- Check NextAuth.js docs: https://next-auth.js.org/providers/email
- Check provider's documentation (SendGrid/Resend/Gmail)
- Test with Mailtrap first to isolate email delivery issues
