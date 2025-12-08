# Deployment Guide

Production deployment, environment configuration, and operations.

## Deployment Architecture

```mermaid
flowchart TB
    subgraph Vercel["Vercel Platform"]
        Next[Next.js App]
        Edge[Edge Middleware]
        Fluid[Fluid Compute]
    end

    subgraph External["External Services"]
        Neon[(Neon PostgreSQL)]
        Upstash[(Upstash Redis)]
        Supabase[Supabase Auth]
        NewRelic[New Relic APM]
    end

    subgraph AI["AI Providers"]
        OpenAI[OpenAI]
        Google[Google Gemini]
        CF[Cloudflare AI]
    end

    Next --> Edge
    Edge --> Fluid
    Fluid --> Neon
    Fluid --> Upstash
    Fluid --> Supabase
    Fluid --> NewRelic
    Fluid --> OpenAI
    Fluid --> Google
    Fluid --> CF
```

## Environment Configuration

### Required Variables

```bash
# Database (Neon PostgreSQL recommended)
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Cache (Upstash Redis)
CACHE_KV_REST_API_URL="https://xxx.upstash.io"
CACHE_KV_REST_API_TOKEN="your-token"

# Authentication
SUPABASE_JWT_SECRET="your-supabase-jwt-secret"
GUEST_JWT_SECRET="your-guest-jwt-secret"
SUPABASE_ACCESS_TOKEN_COOKIE_NAME="sb-access-token"
```

### AI Providers (at least one required)

```bash
# Google Gemini (recommended)
GOOGLE_GENERATIVE_AI_API_KEY="your-key"

# OpenAI
OPENAI_API_KEY="sk-..."

# OpenRouter (for Claude, DeepSeek, Qwen)
OPENROUTER_API_KEY="sk-or-..."

# Cloudflare Workers AI
CLOUDFLARE_ACCOUNT_ID="your-account-id"
CLOUDFLARE_API_KEY="your-api-key"

# Cloudflare AI Gateway (with fallback)
CLOUDFLARE_AI_GATEWAY_NAME="chat-api"
CLOUDFLARE_AI_GATEWAY_API_KEY="your-key"

# Vercel AI Gateway
AI_GATEWAY_API_KEY="your-key"
```

### Monitoring (optional but recommended)

```bash
# Required
NEW_RELIC_LICENSE_KEY="your-license-key"
NEW_RELIC_APP_NAME="ai-assistant"

# Required for Vercel (read-only filesystem)
NEW_RELIC_LOG="stdout"
NEW_RELIC_LOG_LEVEL="info"

# Optional: Disable security agent in serverless
NEW_RELIC_SECURITY_ENABLED="false"
```

> **Important**: On Vercel, you must set `NEW_RELIC_LOG=stdout` to avoid filesystem errors.

---

## Vercel Deployment

### Setup

1. Connect GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

### Build Configuration

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
```

### Vercel Fluid Compute

Detected via `VERCEL_FLUID=1`. Optimizes:

- Connection pool: max 5, idle 10s
- Function timeout: 60s

---

## Database Setup (Neon)

### Create Database

1. Create project at [neon.tech](https://neon.tech)
2. Copy connection string
3. Add to `DATABASE_URL`

### Run Migrations

```bash
# Push schema changes
pnpm db:push

# Generate migration files (if needed)
pnpm db:generate

# Run migrations
pnpm db:migrate
```

### Supabase Auth Sync

Apply trigger in Supabase SQL editor:

```sql
-- Creates User row when auth.users row is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."User" (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## Cache Setup (Upstash)

### Create Database

1. Create database at [upstash.com](https://upstash.com)
2. Copy REST URL and token
3. Add to environment variables

### Test Connection

```bash
curl -X GET "$CACHE_KV_REST_API_URL/ping" \
  -H "Authorization: Bearer $CACHE_KV_REST_API_TOKEN"
```

---

## Development

### Local Setup

```bash
# Clone repository
git clone https://github.com/nicxkms/nextjs-ai-chatbot.git
cd nextjs-ai-chatbot

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your keys

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

### Available Scripts

| Script           | Description                     |
| ---------------- | ------------------------------- |
| `pnpm dev`       | Start dev server with Turbopack |
| `pnpm build`     | Build for production            |
| `pnpm start`     | Start production server         |
| `pnpm lint`      | Run linter                      |
| `pnpm db:push`   | Push schema to database         |
| `pnpm db:studio` | Open Drizzle Studio             |
| `pnpm test`      | Run Playwright tests            |

---

## Troubleshooting

### Database Connection

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check SSL
psql $DATABASE_URL -c "SHOW ssl;"
```

### Redis Connection

```bash
# Test ping
curl "$CACHE_KV_REST_API_URL/ping" \
  -H "Authorization: Bearer $CACHE_KV_REST_API_TOKEN"
```

### Build Errors

```bash
# Clear caches
rm -rf .next node_modules
pnpm install
pnpm build
```

### Common Issues

| Issue                         | Solution                                     |
| ----------------------------- | -------------------------------------------- |
| `SUPABASE_JWT_SECRET` not set | Get from Supabase dashboard → Settings → API |
| `GUEST_JWT_SECRET` not set    | Generate with `openssl rand -base64 32`      |
| Database timeout              | Check connection string, SSL mode            |
| Redis errors                  | Verify REST URL and token                    |
