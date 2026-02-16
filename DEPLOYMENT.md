# Deployment Guide

This document provides deployment instructions and pre-deployment verification steps for the AI Assistant v6 application.

## ⚠️ Pre-Deployment Requirements

### Critical Issues to Fix Before Deployment

The following issues MUST be resolved before deployment:

1. **TypeScript Errors in `components/ai-elements/`** (27 errors)
   - Files affected:
     - `chain-of-thought.tsx` - exactOptionalPropertyTypes incompatibility
     - `code-block.tsx` - missing modules (dompurify, shiki)
     - `context.tsx` - exactOptionalPropertyTypes incompatibility
     - `edge.tsx` - exactOptionalPropertyTypes incompatibility
     - `message.tsx` - invalid button size variant
     - `prompt-input.tsx` - multiple property type issues
     - `reasoning.tsx` - exactOptionalPropertyTypes incompatibility
     - `shimmer.tsx` - missing module (motion/react)
     - `ai/tools/confirmation.tsx` - content type incompatibility
   - Action: Fix type definitions or install missing dependencies

2. **Missing Database Migration Script**
   - Created `lib/db/migrate.ts` but requires database URL configuration
   - Action: Verify database connection before running migrations

3. **Lint Warnings** (31 warnings)
   - `noImgElement` warnings - Consider using Next.js Image component
   - `noExplicitAny` warnings - Replace `any` with proper types
   - `noEmptyBlockStatements` - Add comments or remove empty blocks
   - Action: Address warnings for production code quality

---

## Environment Variables Checklist

Before deploying, ensure the following environment variables are configured:

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database
# or
POSTGRES_URL=postgresql://user:password@host:5432/database

# Authentication (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Provider Keys (at least one required)
OPENAI_API_KEY=sk-...
# or
GOOGLE_GENERATIVE_AI_API_KEY=...
# or
XAI_API_KEY=...

# Cache (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

### Optional Variables

```bash
# Rate Limiting
UPSTASH_RATE_LIMIT_PREFIX=ai-assistant

# Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ENABLED=true

# Blob Storage
BLOB_READ_WRITE_TOKEN=your-token

# Feature Flags
ENABLE_GUEST_ACCESS=true
ENABLE_FILE_UPLOAD=true
```

---

## Pre-Deployment Verification Steps

### 1. Run Validation Checks

```bash
# Format code
pnpm format

# Check linting
pnpm lint

# TypeScript type check
pnpm typecheck
```

**Expected Result**: All commands should pass with zero errors.

### 2. Run Tests

```bash
# Unit and integration tests
pnpm test:unit

# E2E tests (requires running dev server)
pnpm dev &
pnpm test:e2e
```

**Expected Result**: All 354 unit/integration tests pass. E2E tests require manual verification.

### 3. Build Application

```bash
# Run migrations and build
pnpm build
```

**Expected Result**: Build completes without errors.

### 4. Verify Database Connection

```bash
# Test database connection
pnpm db:studio
```

**Expected Result**: Drizzle Studio opens and can connect to database.

---

## Deployment Platforms

### Vercel (Recommended)

1. Connect repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy:
   ```bash
   vercel --prod
   ```

### Docker

1. Build image:
   ```bash
   docker build -t ai-assistant:v6 .
   ```

2. Run container:
   ```bash
   docker run -p 3000:3000 --env-file .env.local ai-assistant:v6
   ```

### Manual Deployment

1. Install dependencies:
   ```bash
   pnpm install --frozen-lockfile
   ```

2. Run migrations:
   ```bash
   pnpm db:migrate
   ```

3. Build application:
   ```bash
   pnpm next build
   ```

4. Start production server:
   ```bash
   pnpm start
   ```

---

## Post-Deployment Verification

### Health Check

```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-14T...",
  "version": "6.0.0"
}
```

### Database Verification

1. Verify migrations applied:
   ```bash
   pnpm db:studio
   ```

2. Check tables exist: users, chats, messages, artifacts, votes, suggestions

### Authentication Flow

1. Test login page loads
2. Test registration flow
3. Test guest access (if enabled)

### Chat Functionality

1. Create new chat
2. Send message
3. Verify AI response streams correctly

---

## Rollback Procedure

If deployment fails:

1. Revert to previous version:
   ```bash
   vercel rollback
   ```

2. Or restore from backup:
   ```bash
   git checkout <previous-tag>
   pnpm install
   pnpm build
   vercel --prod
   ```

---

## Monitoring

### Recommended Monitoring Setup

1. **Vercel Analytics** - Built-in performance monitoring
2. **Error Tracking** - Configure Sentry or similar
3. **Database Monitoring** - Supabase dashboard
4. **Cache Monitoring** - Upstash Redis dashboard

### Key Metrics to Monitor

- Response time (p50, p95, p99)
- Error rate
- Database connection pool usage
- Cache hit rate
- AI API latency

---

## Support

For issues or questions:
- Review `global-issues.md` for known issues
- Check `.apm/Memory/` for task execution logs
- Consult `AGENTS.md` for project conventions
