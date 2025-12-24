# Fix Plan: High Priority Security Issues

**Issues**: #85, #86, #87, #88, #197
**Priority**: 🟠 HIGH
**Total Effort**: 3-4 hours
**Created**: 2025-12-22

---

## Summary

These security issues allow API abuse, information leakage, and bypass of rate limiting protections.

| Issue | Description                             | File                             | Status       |
| ----- | --------------------------------------- | -------------------------------- | ------------ |
| #85   | Chat API allows unauthenticated access  | `app/api/chat/route.ts`          | ✅ CONFIRMED |
| #86   | Health endpoint exposes internal state  | `app/api/health/route.ts`        | ✅ CONFIRMED |
| #87   | Token stored without additional binding | `app/api/auth/exchange/route.ts` | ✅ CONFIRMED |
| #88   | Rate limiting fails open                | `lib/middleware/rate-limit.ts`   | ✅ CONFIRMED |
| #197  | Quota check fails open                  | `lib/cache-ops/quota.ts`         | ✅ CONFIRMED |

---

## Issue #85: Unauthenticated Chat API

### Problem

Chat endpoint allows requests without authentication, enabling AI API abuse and cost attacks.

### Fix

**File**: `app/api/chat/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // Add at the start of handler
  const session = await getSession();

  // Option A: Require authentication
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // Option B: Allow guests with stricter limits
  const isGuest = !session?.user?.id;
  if (isGuest) {
    const guestId = request.cookies.get("guest_id")?.value;
    if (!guestId) {
      return NextResponse.json(
        { error: "Guest session required" },
        { status: 401 }
      );
    }
    // Apply stricter rate limits for guests
  }

  // ... rest of handler
}
```

**Effort**: 1 hour

---

## Issue #86: Health Endpoint Information Leakage

### Problem

Health endpoint exposes internal state including database connection details, Redis status, and internal service names.

### Current (Vulnerable)

```typescript
return NextResponse.json({
  status: "healthy",
  database: { connected: true, latency: 5 },
  redis: { connected: true, memory: "256MB" },
  services: ["openai", "anthropic"],
  version: process.env.APP_VERSION,
});
```

### Fix

**File**: `app/api/health/route.ts`

```typescript
export async function GET(request: NextRequest) {
  // Check for internal access (admin/monitoring)
  const isInternal =
    request.headers.get("X-Health-Token") === process.env.HEALTH_CHECK_TOKEN;

  try {
    const dbHealthy = await checkDatabase();
    const redisHealthy = await checkRedis();

    // Public response - minimal info
    if (!isInternal) {
      return NextResponse.json({
        status: dbHealthy && redisHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
      });
    }

    // Internal response - full details
    return NextResponse.json({
      status: "healthy",
      components: {
        database: { status: dbHealthy ? "up" : "down" },
        cache: { status: redisHealthy ? "up" : "down" },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Never expose error details
    return NextResponse.json({ status: "unhealthy" }, { status: 503 });
  }
}
```

**Effort**: 0.5 hours

---

## Issue #87: Token Without Binding

### Problem

Auth tokens are stored without additional binding (device fingerprint, IP, etc.), making stolen tokens fully usable.

### Fix

**File**: `app/api/auth/exchange/route.ts`

```typescript
import { hashIp } from "@/lib/auth/utils";

export async function POST(request: NextRequest) {
  // ... existing auth flow

  // Add token binding
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.ip ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  // Hash for privacy
  const ipHash = hashIp(ip);
  const uaHash = hashUserAgent(userAgent);

  // Store binding with session
  await storeSession({
    token,
    userId,
    ipHash,
    uaHash,
    createdAt: new Date(),
  });

  // Validate on subsequent requests
  // In auth middleware:
  const session = await getSession(token);
  if (session.ipHash !== hashIp(currentIp)) {
    // Log suspicious activity
    console.warn("[Auth] IP mismatch for session", {
      sessionId: session.id,
      expected: session.ipHash,
      got: hashIp(currentIp),
    });
    // Option: Require re-auth or just log
  }
}
```

**Effort**: 1 hour

---

## Issue #88: Rate Limiting Fails Open

### Problem

When Redis is unavailable, rate limiting is completely bypassed.

### Current (Vulnerable)

```typescript
const { failOpen = true } = config;
if (failOpen) {
  console.warn("[RateLimit] Failing open");
  return null; // Rate limit bypassed!
}
```

### Fix

**File**: `lib/middleware/rate-limit.ts`

```typescript
type RateLimitConfig = {
  // ... existing
  failOpen: boolean;
  fallbackLimit?: number;
};

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    const redis = await getRedis();
    if (!redis) {
      return handleRedisUnavailable(identifier, config);
    }
    // ... existing logic
  } catch (error) {
    return handleRedisUnavailable(identifier, config);
  }
}

function handleRedisUnavailable(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  // For critical endpoints, NEVER fail open
  if (!config.failOpen) {
    console.error("[RateLimit] Redis unavailable, blocking request");
    return {
      allowed: false,
      reason: "rate_limit_unavailable",
    };
  }

  // For non-critical, use in-memory fallback
  return checkMemoryRateLimit(identifier, config.fallbackLimit ?? 10);
}

// Simple in-memory fallback
const memoryLimits = new Map<string, { count: number; resetAt: number }>();

function checkMemoryRateLimit(
  identifier: string,
  limit: number
): RateLimitResult {
  const now = Date.now();
  const window = 60000; // 1 minute

  const entry = memoryLimits.get(identifier);
  if (!entry || entry.resetAt < now) {
    memoryLimits.set(identifier, { count: 1, resetAt: now + window });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    return { allowed: false, reason: "rate_limit_exceeded" };
  }

  entry.count++;
  return { allowed: true };
}
```

**Update middleware config**:

```typescript
// For auth endpoints - never fail open
const authRateLimitConfig = {
  limit: 5,
  window: 60,
  failOpen: false, // CRITICAL: block if Redis down
};

// For general endpoints - can fail open with fallback
const generalRateLimitConfig = {
  limit: 100,
  window: 60,
  failOpen: true,
  fallbackLimit: 20, // Stricter fallback
};
```

**Effort**: 0.5 hours

---

## Issue #197: Quota Fails Open

### Problem

Same issue as #88 but for quota enforcement.

### Current (Vulnerable)

```typescript
if (!redis) {
  return { allowed: true, count: 0, limit }; // Bypasses quota!
}
```

### Fix

**File**: `lib/cache-ops/quota.ts`

```typescript
export async function checkQuota(
  userId: string,
  config: QuotaConfig
): Promise<QuotaResult> {
  const redis = await getRedis();

  if (!redis) {
    console.error("[Quota] Redis unavailable");

    // For AI/expensive operations, deny by default
    if (config.critical) {
      return {
        allowed: false,
        error: "quota_service_unavailable",
        retryAfter: 30, // Suggest retry
      };
    }

    // For less critical, use memory fallback
    return checkMemoryQuota(userId, config);
  }

  // ... existing Redis-based logic
}

// Usage in chat route
const quotaResult = await checkQuota(userId, {
  limit: 100,
  window: "day",
  critical: true, // Don't fail open for AI calls
});

if (!quotaResult.allowed) {
  return NextResponse.json(
    {
      error: "Quota exceeded or unavailable",
      retryAfter: quotaResult.retryAfter,
    },
    { status: 429 }
  );
}
```

**Effort**: 0.5 hours

---

## Files Modified Summary

| File                             | Action        | Issue |
| -------------------------------- | ------------- | ----- |
| `app/api/chat/route.ts`          | MODIFY        | #85   |
| `app/api/health/route.ts`        | MODIFY        | #86   |
| `app/api/auth/exchange/route.ts` | MODIFY        | #87   |
| `lib/auth/utils.ts`              | CREATE/MODIFY | #87   |
| `lib/middleware/rate-limit.ts`   | MODIFY        | #88   |
| `lib/cache-ops/quota.ts`         | MODIFY        | #197  |

---

## Verification Checklist

### #85 - Auth Required

- [ ] Unauthenticated requests get 401
- [ ] Guest flow still works with session
- [ ] Authenticated users unaffected

### #86 - Health Endpoint

- [ ] Public response shows only status
- [ ] Internal token reveals details
- [ ] Errors don't leak info

### #87 - Token Binding

- [ ] Session stores IP/UA hash
- [ ] Mismatches logged
- [ ] Re-auth prompted if needed

### #88 & #197 - Fail Closed

- [ ] Critical endpoints block when Redis down
- [ ] Memory fallback works
- [ ] Non-critical gracefully degrade
- [ ] Logs indicate fallback mode
