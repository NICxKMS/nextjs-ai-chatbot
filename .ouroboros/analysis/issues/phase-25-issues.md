# Phase 25: Deployment Issues

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 5            | 0   | 2   | 2   | 1   | 5.75h |

---

### ISSUE-P25-001: Health Check Missing Readiness/Liveness Separation

**File**: `app/api/health/route.ts`
**Severity**: P2 (High)
**Category**: Deployment
**Hours**: 1.5h

**Problem**: Single `/api/health` endpoint for all checks. Container orchestration needs separate endpoints.

**Current**:

```typescript
export async function GET() {
    // Checks DB, cache, dependencies
    return Response.json({ status: "healthy", ... });
}
```

**Fix**: Implement separate endpoints:

```typescript
// app/api/health/live/route.ts - Liveness probe
export async function GET() {
  // Simple check: app is running
  return Response.json({ status: "alive" });
}

// app/api/health/ready/route.ts - Readiness probe
export async function GET() {
  // Full check: can accept traffic
  const checks = await Promise.all([
    checkDatabase(),
    checkCache(),
    checkExternalServices(),
  ]);

  const allHealthy = checks.every((c) => c.status === "healthy");
  return Response.json({
    status: allHealthy ? "ready" : "not-ready",
    checks,
  });
}
```

**Kubernetes Config**:

```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

### ISSUE-P25-002: No Graceful Shutdown Handler

**File**: Instrumentation files
**Severity**: P2 (High)
**Category**: Deployment
**Hours**: 1.5h

**Problem**: No SIGTERM/SIGINT handling for graceful shutdown. In-flight requests may be dropped.

**Fix**:

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { gracefulShutdown } = await import("./lib/utils/shutdown");
    gracefulShutdown.register();
  }
}

// lib/utils/shutdown.ts
export const gracefulShutdown = {
  register() {
    process.on("SIGTERM", this.handleSignal.bind(this, "SIGTERM"));
    process.on("SIGINT", this.handleSignal.bind(this, "SIGINT"));
  },

  async handleSignal(signal: string) {
    logger.info(`Received ${signal}, starting graceful shutdown`);

    // Stop accepting new connections
    // Wait for in-flight requests (max 30s)
    // Close database connections
    await closeDb();

    // Close Redis connections
    await closeRedis();

    logger.info("Graceful shutdown complete");
    process.exit(0);
  },
};
```

---

### ISSUE-P25-003: Environment Validation Not Enforced at Build Time

**File**: `lib/config/env.ts`
**Severity**: P3 (Medium)
**Category**: Deployment
**Hours**: 0.5h

**Problem**: Validation only at runtime, not at build time.

**Current**:

```typescript
export function validateEnvOrThrow(): void {
  if (isTest) {
    return;
  } // Skipped in test
  // Validation only happens at runtime
}
```

**Fix**: Add prebuild validation script:

```json
// package.json
{
  "scripts": {
    "prebuild": "tsx scripts/validate-env.ts",
    "build": "next build"
  }
}
```

```typescript
// scripts/validate-env.ts
import { envSchema } from "../lib/config/env";

try {
  envSchema.parse(process.env);
  console.log("✅ Environment validation passed");
} catch (error) {
  console.error("❌ Environment validation failed:");
  console.error(error.format());
  process.exit(1);
}
```

---

### ISSUE-P25-004: Incomplete .env.example

**File**: `.env.example`
**Severity**: P3 (Medium)
**Category**: Deployment
**Hours**: 0.25h

**Problem**: Variables lack required/optional indicators.

**Fix**:

```bash
# .env.example

# ============================================
# REQUIRED VARIABLES
# ============================================

# Database - PostgreSQL connection string
DATABASE_URL=

# Authentication - NextAuth secret (generate with: openssl rand -base64 32)
AUTH_SECRET=

# ============================================
# OPTIONAL VARIABLES
# ============================================

# AI Providers (at least one required for chat functionality)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Caching (optional, enables response caching)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

### ISSUE-P25-005: Missing Docker Configuration

**File**: Repository root (missing Dockerfile)
**Severity**: P4 (Low)
**Category**: Deployment
**Hours**: 2h

**Problem**: No Dockerfile for non-Vercel deployments.

**Fix**: Create multi-stage Dockerfile:

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

---

## Deployment Checklist

- [ ] Health endpoints separated (live/ready)
- [ ] Graceful shutdown implemented
- [ ] Environment validated at build time
- [ ] .env.example documented
- [ ] Docker configuration added

## Deployment Architecture

```
                    ┌─────────────┐
                    │ Load Balancer│
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────┴────┐       ┌────┴────┐       ┌────┴────┐
    │ Pod 1   │       │ Pod 2   │       │ Pod 3   │
    │ /live ✓ │       │ /live ✓ │       │ /live ✓ │
    │/ready ✓ │       │/ready ✓ │       │/ready ✓ │
    └─────────┘       └─────────┘       └─────────┘
```
