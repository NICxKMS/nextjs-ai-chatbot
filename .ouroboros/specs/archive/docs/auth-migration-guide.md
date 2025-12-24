# Auth/Session Architecture Migration Guide

> **ARCH-002** | Last Updated: 2024-12-23

This guide helps developers migrate existing code to the new auth/session architecture.

---

## Table of Contents

1. [Overview](#overview)
2. [Breaking Changes](#breaking-changes)
3. [Migration Steps](#migration-steps)
4. [New Features Available](#new-features-available)
5. [Environment Variables](#environment-variables)
6. [Testing Updates](#testing-updates)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### What Changed

The auth system has been refactored to provide:

| Area              | Before                      | After                                          |
| ----------------- | --------------------------- | ---------------------------------------------- |
| Session retrieval | Direct `getSession()` calls | Cached `getSessionCached()` with deduplication |
| Rate limiting     | Scattered config per file   | Centralized `rate-limit-config.ts`             |
| JWT validation    | Basic validation            | Audience claim validation                      |
| Data loading      | Sequential fetches          | Parallel loading with `Promise.allSettled`     |
| Cache management  | Manual                      | Automatic prewarming and deduplication         |

### Why These Changes

1. **Performance** — Reduced redundant session fetches via request-level caching
2. **Security** — Stricter JWT validation with audience claims
3. **Maintainability** — Centralized rate limit configuration
4. **Reliability** — Graceful degradation with `Promise.allSettled` pattern

### Impact on Existing Code

- **High Impact**: Any code calling `getSession()` directly
- **Medium Impact**: Custom rate limiter configurations
- **Low Impact**: JWT token generation (if custom)

---

## Breaking Changes

### 1. `getSession()` Deprecated

```typescript
// ❌ DEPRECATED - Will be removed in next major version
const session = await getSession();

// ✅ USE THIS INSTEAD
const session = await getSessionCached();
```

**Reason**: `getSessionCached()` provides request-level deduplication, preventing multiple auth calls per request.

### 2. Rate Limit Configuration Centralized

Rate limit settings are no longer defined inline. All limits must use the centralized config.

```typescript
// ❌ NO LONGER SUPPORTED
const limiter = new Ratelimit({
  limiter: Ratelimit.slidingWindow(100, "1 m"),
});

// ✅ USE CENTRALIZED CONFIG
import { RATE_LIMITS, createLimiter } from "@/lib/middleware/rate-limit-config";
const limiter = createLimiter(RATE_LIMITS.globalIp);
```

### 3. JWT Audience Claim Required

JWTs now validate the `aud` (audience) claim. **Tokens without the correct audience will be rejected.**

- Default audience: `"nextjs-ai-chatbot"`
- Configurable via `JWT_AUDIENCE` environment variable
- **Old tokens will fail validation** — users may need to re-authenticate

---

## Migration Steps

### Step 1: Update Session Imports

Find and replace all session imports:

```typescript
// BEFORE
import { getSession } from "@/lib/auth";

// AFTER
import { getSessionCached } from "@/lib/auth";
```

**Search pattern**: `from "@/lib/auth"` or `from '@/lib/auth'`

### Step 2: Update Session Calls

Replace all session retrieval calls:

```typescript
// BEFORE
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  // ...
}

// AFTER
export async function GET() {
  const session = await getSessionCached();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  // ...
}
```

### Step 3: Migrate Rate Limit Configuration

#### 3a. Remove inline rate limiters

Delete any inline `Ratelimit` configurations:

```typescript
// ❌ REMOVE THIS
const limiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
  prefix: "api:custom",
});
```

#### 3b. Import centralized config

```typescript
// ✅ ADD THIS
import {
  RATE_LIMITS,
  createLimiter,
  type RateLimitConfig,
} from "@/lib/middleware/rate-limit-config";
```

#### 3c. Use predefined limits

```typescript
// Available rate limit presets:
const globalLimiter = createLimiter(RATE_LIMITS.globalIp); // 100/min
const authLimiter = createLimiter(RATE_LIMITS.authAttempts); // 5/min
const apiLimiter = createLimiter(RATE_LIMITS.apiGeneral); // 60/min
const chatLimiter = createLimiter(RATE_LIMITS.chatMessages); // 20/min
```

### Step 4: Update Data Loading Patterns

If you have sequential data fetches, consider using the parallel loader:

```typescript
// BEFORE - Sequential (slow)
const session = await getSession();
const chat = await getChatById(chatId);
const votes = await getVotesByChatId(chatId);

// AFTER - Parallel (fast)
import { loadChatPageData } from "@/lib/data";

const { session, chatResult, votesResult } = await loadChatPageData(chatId);

// Handle results with proper error checking
if (chatResult.status === "rejected") {
  console.error("Failed to load chat:", chatResult.reason);
}
```

---

## New Features Available

### Parallel Data Loading

Load multiple data sources simultaneously with graceful error handling:

```typescript
import { loadChatPageData, loadSidebarData } from "@/lib/data";

// Chat page data (session + chat + votes)
const { session, chatResult, votesResult } = await loadChatPageData(chatId);

// Sidebar data (session + chat history)
const { session, historyResult } = await loadSidebarData();
```

### Cache Prewarming

Prewarm caches for cold starts to improve first-request latency:

```typescript
import { prewarmIfCold } from "@/lib/cache-ops";

// Call during app initialization or after login
await prewarmIfCold(userId);
```

### Streaming Utilities

Consistent headers and abort handling for streaming responses:

```typescript
import {
  STREAMING_HEADERS,
  createCombinedAbortSignal,
} from "@/lib/utils/streaming";

export async function POST(request: Request) {
  const signal = createCombinedAbortSignal(request.signal, 30000); // 30s timeout

  return new Response(stream, {
    headers: STREAMING_HEADERS,
  });
}
```

### Request-Scoped Caching

The session cache is automatically scoped per request:

```typescript
// These calls are deduplicated within the same request
const session1 = await getSessionCached(); // Fetches from auth
const session2 = await getSessionCached(); // Returns cached value
const session3 = await getSessionCached(); // Returns cached value
// Only ONE actual auth call is made
```

---

## Environment Variables

### New Variables

| Variable       | Required | Default               | Description                     |
| -------------- | -------- | --------------------- | ------------------------------- |
| `JWT_AUDIENCE` | No       | `"nextjs-ai-chatbot"` | Expected audience claim in JWTs |

### Example `.env.local`

```bash
# Auth Configuration
JWT_AUDIENCE=nextjs-ai-chatbot

# Existing variables (unchanged)
AUTH_SECRET=your-auth-secret
NEXTAUTH_URL=http://localhost:3000
```

---

## Testing Updates

### Run Security Tests

Verify JWT and session changes:

```bash
pnpm vitest run tests/unit/security
```

### Run Integration Tests

Verify API routes work with new auth:

```bash
pnpm vitest run tests/integration
```

### Run E2E Tests

Verify full user flows:

```bash
pnpm playwright test tests/e2e
```

### Full Test Suite

Run everything:

```bash
pnpm test
```

---

## Troubleshooting

### "Invalid token" or "Token validation failed"

**Cause**: JWT tokens now require a valid `aud` (audience) claim.

**Solutions**:

1. Have users log out and log back in to get new tokens
2. If using custom token generation, add the audience claim:
   ```typescript
   const token = jwt.sign(payload, secret, {
     audience: process.env.JWT_AUDIENCE || "nextjs-ai-chatbot",
   });
   ```

### Session not persisting / undefined session

**Cause**: Still using deprecated `getSession()` which may not be cached properly.

**Solution**: Update to `getSessionCached()`:

```typescript
// Check your imports
import { getSessionCached } from "@/lib/auth";

// Use the cached version
const session = await getSessionCached();
```

### Rate limit errors in unexpected places

**Cause**: Rate limit configuration moved to centralized file.

**Solutions**:

1. Check `lib/middleware/rate-limit-config.ts` for available presets
2. Verify you're using the correct limit for your use case:
   ```typescript
   // Available presets
   RATE_LIMITS.globalIp; // General requests: 100/min
   RATE_LIMITS.authAttempts; // Login attempts: 5/min
   RATE_LIMITS.apiGeneral; // API calls: 60/min
   RATE_LIMITS.chatMessages; // Chat: 20/min
   ```

### "Cannot find module '@/lib/data'"

**Cause**: New data loading utilities not imported correctly.

**Solution**: Verify the import path exists:

```typescript
import { loadChatPageData } from "@/lib/data";
```

### Cache not warming / cold start issues

**Cause**: `prewarmIfCold` not called at appropriate time.

**Solution**: Call during initialization:

```typescript
// In a server component or API route after auth
import { prewarmIfCold } from "@/lib/cache-ops";

if (session?.user?.id) {
  await prewarmIfCold(session.user.id);
}
```

---

## Migration Checklist

Use this checklist to track your migration progress:

- [ ] Update all `getSession()` imports to `getSessionCached()`
- [ ] Replace all `getSession()` calls with `getSessionCached()`
- [ ] Migrate inline rate limiters to centralized config
- [ ] Add `JWT_AUDIENCE` to environment variables (if customizing)
- [ ] Update data loading to use parallel patterns (optional)
- [ ] Run security tests: `pnpm vitest run tests/unit/security`
- [ ] Run integration tests: `pnpm vitest run tests/integration`
- [ ] Run E2E tests: `pnpm playwright test tests/e2e`
- [ ] Deploy to staging and verify auth flows
- [ ] Monitor for token validation errors post-deploy

---

## Related Documentation

- [Session Architecture](./session-architecture.md)
- [Session Optimization Roadmap](./session-optimization-roadmap.md)
- [Cache Layer Documentation](./cache-layer-stubs.md)

---

## Questions or Issues?

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review related documentation linked above
3. Search existing issues in the repository
4. Open a new issue with the `auth-migration` label
