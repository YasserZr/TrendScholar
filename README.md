# TrendScholar

AI-powered academic research platform that helps researchers discover, track, and understand trending topics in their field.

## Features

- 🔍 **Smart Paper Discovery**: Find relevant research papers with AI-powered search
- 📊 **Topic Tracking**: Follow research topics and see trending papers
- 🤖 **AI Summaries**: Get instant paper summaries using Google Gemini
- 💬 **Chat with Papers**: Ask questions about papers using AI
- 🔐 **Flexible Authentication**: 
  - GitHub OAuth for developers
  - Email magic links for all users (no password needed)
- 📈 **Trend Analytics**: Visualize research trends over time
- ⭐ **Save & Organize**: Build your personal research library

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or Supabase account)
- Google Gemini API key
- Qdrant vector database instance

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YasserZr/TrendScholar.git
   cd TrendScholar
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   - Database: Add your `DATABASE_URL`
   - Authentication: Configure email SMTP or GitHub OAuth
   - AI: Add `GEMINI_API_KEY`
   - Vector DB: Add `QDRANT_URL` and `QDRANT_API_KEY`

4. **Set up the database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the app.

## Authentication Setup

TrendScholar supports two authentication methods:

### Email Magic Links (Recommended for All Users)

No password required - users receive a sign-in link via email.

**Setup:** See [EMAIL_SETUP.md](./EMAIL_SETUP.md) for detailed instructions.

Quick setup options:
- **Development**: Use Gmail SMTP
- **Production**: Use Resend or SendGrid

### GitHub OAuth (Optional)

For users with GitHub accounts.

**Setup:**
1. Create GitHub OAuth App at https://github.com/settings/developers
2. Add `GITHUB_ID` and `GITHUB_SECRET` to `.env.local`
3. Set Authorization callback URL to `http://localhost:3000/api/auth/callback/github`

## Environment Variables

See [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md) for complete list of required variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Your app URL
- `NEXTAUTH_SECRET` - Random secret for sessions
- `EMAIL_SERVER_*` - SMTP configuration (see EMAIL_SETUP.md)
- `GEMINI_API_KEY` - Google AI API key
- `QDRANT_URL` & `QDRANT_API_KEY` - Vector database

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── auth/         # Authentication pages
│   ├── dashboard/    # User dashboard
│   ├── explore/      # Topic exploration
│   └── api/          # API routes
├── components/       # React components
├── lib/              # Utilities and configurations
│   ├── auth.ts       # NextAuth configuration
│   ├── prisma.ts     # Database client
│   └── plans.ts      # Subscription plans
└── generated/        # Prisma generated types
```

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js (Email + GitHub OAuth)
- **AI**: Google Gemini (summaries + chat)
- **Vector DB**: Qdrant (semantic search)
- **UI**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel

## Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables (see VERCEL_ENV_SETUP.md)
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- AWS Amplify
- Netlify
- Railway
- Self-hosted with Docker

## Documentation

- [Email Setup Guide](./EMAIL_SETUP.md) - Configure email authentication
- [Vercel Environment Variables](./VERCEL_ENV_SETUP.md) - Production setup
- [Production Checklist](./docs/production-checklist.md) - Pre-launch checklist
- [SSL Fix Guide](./PRODUCTION_SSL_FIX.md) - Database SSL troubleshooting

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues or questions:
- Open an issue on GitHub
- Check documentation files in the repo
- Review NextAuth.js docs for authentication issues
