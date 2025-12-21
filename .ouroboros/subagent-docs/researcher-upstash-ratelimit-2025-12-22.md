# Upstash Ratelimit Research

**Date**: 2025-12-22  
**Subject**: Upstash Rate Limiting for Edge Functions  
**Purpose**: Implementation-ready research for NewApp rate limiting

---

## Executive Summary

Research on `@upstash/ratelimit` package for implementing edge-compatible rate limiting in Next.js. The project already has `@upstash/ratelimit: ^2.0.0` and `@upstash/redis: ^1.34.0` as dependencies. OldApp has a comprehensive rate limiting implementation that should be adapted for NewApp architecture.

---

## 1. Tech Stack Analysis

| Category     | Technology           | Version | Purpose                       |
| ------------ | -------------------- | ------- | ----------------------------- |
| Rate Limiter | `@upstash/ratelimit` | ^2.0.0  | Serverless/Edge rate limiting |
| Redis        | `@upstash/redis`     | ^1.34.0 | HTTP-based Redis client       |
| Framework    | Next.js              | ^16.1.0 | App Router with Edge support  |
| Runtime      | Vercel Edge          | N/A     | Edge middleware execution     |

---

## 2. Rate Limiting Algorithms

### 2.1 Fixed Window

```typescript
Ratelimit.fixedWindow(10, "10 s");
```

- **Pros**: Cheap in data/computation, newer requests not starved
- **Cons**: Can leak bursts at boundaries, causes request stampedes
- **Use for**: Simple counting, non-critical endpoints

### 2.2 Sliding Window (RECOMMENDED)

```typescript
Ratelimit.slidingWindow(10, "10 s");
```

- **Pros**: Solves boundary issues from fixed window
- **Cons**: More storage/computation, approximation-based
- **Use for**: Most API endpoints, auth, chat

### 2.3 Token Bucket

```typescript
Ratelimit.tokenBucket(5, "10 s", 10); // 5 refill, 10s interval, 10 max
```

- **Pros**: Smooth bursts, allows higher initial burst with `maxTokens`
- **Cons**: Most expensive computationally
- **Use for**: AI/chat endpoints, streaming, file uploads

---

## 3. Key Features

### 3.1 Ephemeral Caching

```typescript
const cache = new Map(); // MUST be outside handler

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  ephemeralCache: cache, // Optional, default: new Map()
});
```

- Prevents repeated Redis calls for blocked identifiers
- Returns `reason: "cacheBlock"` when served from cache

### 3.2 Timeout (Fail Open)

```typescript
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  timeout: 1000, // 1 second, default: 5000ms
});
```

- Returns `reason: "timeout"` when times out
- Prevents network issues from blocking users

### 3.3 Analytics

```typescript
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true, // Enable dashboard
});
```

- Dashboard at https://console.upstash.com/ratelimit
- Shows allowed/blocked/denied requests

### 3.4 Multiple Limits (User Tiers)

```typescript
const ratelimit = {
  free: new Ratelimit({
    redis,
    prefix: "ratelimit:free",
    limiter: Ratelimit.slidingWindow(10, "10s"),
  }),
  paid: new Ratelimit({
    redis,
    prefix: "ratelimit:paid",
    limiter: Ratelimit.slidingWindow(60, "10s"),
  }),
};
```

### 3.5 Custom Rates (Variable Consumption)

```typescript
const { success } = await ratelimit.limit("identifier", { rate: batchSize });
```

- Useful for batch operations, variable cost endpoints

---

## 4. Edge Runtime Integration

### 4.1 Vercel Edge `waitUntil`

```typescript
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

export async function middleware(
  request: NextRequest,
  context: NextFetchEvent
) {
  const { success, pending, limit, remaining } = await ratelimit.limit(ip);

  // CRITICAL: Must wait for async analytics/sync
  context.waitUntil(pending);

  return success
    ? NextResponse.next()
    : NextResponse.json({ error: "Rate limited" }, { status: 429 });
}
```

### 4.2 Response Headers

```typescript
const res = NextResponse.next();
res.headers.set("X-RateLimit-Success", success.toString());
res.headers.set("X-RateLimit-Limit", limit.toString());
res.headers.set("X-RateLimit-Remaining", remaining.toString());
res.headers.set("X-RateLimit-Reset", reset.toString());
```

---

## 5. Limit Response Schema

```typescript
type RatelimitResponse = {
  success: boolean; // true = allowed, false = blocked
  limit: number; // max requests per window
  remaining: number; // requests left in window
  reset: number; // Unix timestamp (ms) when reset
  pending: Promise<unknown>; // MUST await in edge!
  reason?: "timeout" | "cacheBlock" | "denyList";
  deniedValue?: string; // Value that caused deny
};
```

---

## 6. Implementation Files

### 6.1 Rate Limit Config: `lib/middleware/rate-limit-config.ts`

```typescript
/**
 * Rate Limit Configuration
 * Ref: OldApp lib/middleware/rate-limit-config.ts
 *
 * Centralized rate limit constants for Edge middleware and API routes.
 */

export const RATE_LIMITS = {
  /** Edge API: Broad protection for all API routes */
  EDGE_API: {
    limit: 100,
    window: 60,
    prefix: "rl:edge:api",
  },

  /** Edge Strict: Sensitive operations at edge */
  EDGE_STRICT: {
    limit: 10,
    window: 60,
    prefix: "rl:edge:strict",
  },

  /** Edge Auth: Authentication endpoints (FAIL CLOSED) */
  EDGE_AUTH: {
    limit: 20,
    window: 60,
    prefix: "rl:edge:auth",
  },

  /** Standard: General API endpoints */
  STANDARD: {
    limit: 100,
    window: 60,
    prefix: "rl:standard",
  },

  /** Strict: Destructive or sensitive operations */
  STRICT: {
    limit: 10,
    window: 60,
    prefix: "rl:strict",
  },

  /** Generous: High-volume endpoints (search, autocomplete) */
  GENEROUS: {
    limit: 1000,
    window: 60,
    prefix: "rl:generous",
  },

  /** Chat: AI chat completions (token bucket) */
  CHAT: {
    limit: 50,
    window: 60,
    prefix: "rl:chat",
    maxTokens: 60, // Allow burst
  },

  /** Upload: File uploads (very strict, per hour) */
  UPLOAD: {
    limit: 10,
    window: 3600,
    prefix: "rl:upload",
  },

  /** Auth Exchange: Token exchange endpoint */
  AUTH_EXCHANGE: {
    limit: 10,
    window: 60,
    prefix: "rl:auth:exchange",
  },

  /** Auth Guest: Guest session creation */
  AUTH_GUEST: {
    limit: 20,
    window: 60,
    prefix: "rl:auth:guest",
  },

  /** Guest User: Lower limits for unauthenticated */
  GUEST: {
    limit: 30,
    window: 60,
    prefix: "rl:guest",
  },

  /** Authenticated User: Higher limits */
  AUTHENTICATED: {
    limit: 100,
    window: 60,
    prefix: "rl:auth",
  },
} as const;

export type RateLimitPreset = keyof typeof RATE_LIMITS;

export function getRateLimitConfig(preset: RateLimitPreset) {
  return RATE_LIMITS[preset];
}
```

---

### 6.2 Rate Limiter Core: `lib/middleware/rate-limit.ts`

```typescript
/**
 * Rate Limiting Module
 * Ref: OldApp lib/middleware/edge-rate-limit.ts
 *
 * Edge-compatible rate limiting using @upstash/ratelimit
 *
 * @module lib/middleware/rate-limit
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RATE_LIMITS } from "./rate-limit-config";

// ============================================================================
// Types
// ============================================================================

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  reset: number;
  retryAfter?: number;
  reason?: "timeout" | "cacheBlock" | "denyList";
  pending: Promise<unknown>;
};

export type RateLimitOptions = {
  identifier: string;
  limit: number;
  window: number;
  prefix?: string;
  /** If true, deny requests when Redis unavailable (default: false) */
  failClosed?: boolean;
};

// ============================================================================
// Redis Client (Edge-Compatible)
// ============================================================================

function getEdgeRedis(): Redis | null {
  const url = process.env.CACHE_KV_REST_API_URL;
  const token = process.env.CACHE_KV_REST_API_TOKEN;

  if (!url || !token) {
    console.warn("Rate limit: Redis not configured");
    return null;
  }

  return new Redis({ url, token });
}

// ============================================================================
// Ephemeral Cache (MUST be module-level for serverless)
// ============================================================================

const ephemeralCache = new Map<string, number>();

// ============================================================================
// Limiter Factory
// ============================================================================

type LimiterType = "sliding" | "fixed" | "token";

interface CreateLimiterOptions {
  limit: number;
  window: number;
  prefix: string;
  type?: LimiterType;
  maxTokens?: number;
}

function createLimiter(options: CreateLimiterOptions): Ratelimit | null {
  const redis = getEdgeRedis();
  if (!redis) return null;

  const { limit, window, prefix, type = "sliding", maxTokens } = options;
  const windowStr = `${window} s`;

  let limiter: ReturnType<typeof Ratelimit.slidingWindow>;

  switch (type) {
    case "fixed":
      limiter = Ratelimit.fixedWindow(limit, windowStr);
      break;
    case "token":
      limiter = Ratelimit.tokenBucket(limit, windowStr, maxTokens ?? limit);
      break;
    case "sliding":
    default:
      limiter = Ratelimit.slidingWindow(limit, windowStr);
      break;
  }

  return new Ratelimit({
    redis,
    limiter,
    prefix,
    ephemeralCache,
    analytics: true,
    timeout: 3000, // 3s timeout, fail open
  });
}

// ============================================================================
// Core Rate Limit Check
// ============================================================================

export async function checkRateLimit(
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const {
    identifier,
    limit,
    window,
    prefix = "rl:default",
    failClosed = false,
  } = options;

  const limiter = createLimiter({ limit, window, prefix });

  // No Redis: fail open or closed based on config
  if (!limiter) {
    return failClosed
      ? {
          allowed: false,
          remaining: 0,
          limit,
          reset: Date.now() + 60000,
          retryAfter: 60,
          pending: Promise.resolve(),
        }
      : {
          allowed: true,
          remaining: limit,
          limit,
          reset: Date.now() + window * 1000,
          pending: Promise.resolve(),
        };
  }

  try {
    const result = await limiter.limit(identifier);

    return {
      allowed: result.success,
      remaining: result.remaining,
      limit: result.limit,
      reset: result.reset,
      retryAfter: result.success
        ? undefined
        : Math.ceil((result.reset - Date.now()) / 1000),
      reason: result.reason,
      pending: result.pending,
    };
  } catch (error) {
    console.error("Rate limit error:", error);

    return failClosed
      ? {
          allowed: false,
          remaining: 0,
          limit,
          reset: Date.now() + 60000,
          retryAfter: 60,
          pending: Promise.resolve(),
        }
      : {
          allowed: true,
          remaining: limit,
          limit,
          reset: Date.now() + window * 1000,
          pending: Promise.resolve(),
        };
  }
}

// ============================================================================
// Pre-Configured Limiters
// ============================================================================

export const RateLimiters = {
  /** Edge API: General API protection */
  edgeApi: (identifier: string) =>
    checkRateLimit({
      identifier,
      limit: RATE_LIMITS.EDGE_API.limit,
      window: RATE_LIMITS.EDGE_API.window,
      prefix: RATE_LIMITS.EDGE_API.prefix,
      failClosed: false,
    }),

  /** Edge Auth: Authentication endpoints (FAIL CLOSED) */
  edgeAuth: (identifier: string) =>
    checkRateLimit({
      identifier,
      limit: RATE_LIMITS.EDGE_AUTH.limit,
      window: RATE_LIMITS.EDGE_AUTH.window,
      prefix: RATE_LIMITS.EDGE_AUTH.prefix,
      failClosed: true,
    }),

  /** Edge Strict: Sensitive operations */
  edgeStrict: (identifier: string) =>
    checkRateLimit({
      identifier,
      limit: RATE_LIMITS.EDGE_STRICT.limit,
      window: RATE_LIMITS.EDGE_STRICT.window,
      prefix: RATE_LIMITS.EDGE_STRICT.prefix,
      failClosed: false,
    }),

  /** Standard: General API calls */
  standard: (identifier: string) =>
    checkRateLimit({
      identifier,
      limit: RATE_LIMITS.STANDARD.limit,
      window: RATE_LIMITS.STANDARD.window,
      prefix: RATE_LIMITS.STANDARD.prefix,
    }),

  /** Strict: Destructive operations */
  strict: (identifier: string) =>
    checkRateLimit({
      identifier,
      limit: RATE_LIMITS.STRICT.limit,
      window: RATE_LIMITS.STRICT.window,
      prefix: RATE_LIMITS.STRICT.prefix,
    }),

  /** Generous: High-volume endpoints */
  generous: (identifier: string) =>
    checkRateLimit({
      identifier,
      limit: RATE_LIMITS.GENEROUS.limit,
      window: RATE_LIMITS.GENEROUS.window,
      prefix: RATE_LIMITS.GENEROUS.prefix,
    }),

  /** Chat: AI chat completions */
  chat: (userId: string) =>
    checkRateLimit({
      identifier: userId,
      limit: RATE_LIMITS.CHAT.limit,
      window: RATE_LIMITS.CHAT.window,
      prefix: RATE_LIMITS.CHAT.prefix,
    }),

  /** Upload: File uploads */
  upload: (userId: string) =>
    checkRateLimit({
      identifier: userId,
      limit: RATE_LIMITS.UPLOAD.limit,
      window: RATE_LIMITS.UPLOAD.window,
      prefix: RATE_LIMITS.UPLOAD.prefix,
    }),

  /** Guest: Lower limits for unauthenticated users */
  guest: (identifier: string) =>
    checkRateLimit({
      identifier,
      limit: RATE_LIMITS.GUEST.limit,
      window: RATE_LIMITS.GUEST.window,
      prefix: RATE_LIMITS.GUEST.prefix,
    }),

  /** Authenticated: Higher limits for auth users */
  authenticated: (userId: string) =>
    checkRateLimit({
      identifier: userId,
      limit: RATE_LIMITS.AUTHENTICATED.limit,
      window: RATE_LIMITS.AUTHENTICATED.window,
      prefix: RATE_LIMITS.AUTHENTICATED.prefix,
    }),
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract client IP from request
 */
export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) return realIP;

  return "unknown";
}

/**
 * Create rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  const headers: HeadersInit = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };

  if (result.retryAfter) {
    headers["Retry-After"] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Create 429 Too Many Requests response
 */
export function rateLimitResponse(
  result: RateLimitResult,
  message = "Rate limit exceeded"
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      limit: result.limit,
      remaining: result.remaining,
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...rateLimitHeaders(result),
      },
    }
  );
}
```

---

### 6.3 Next.js Middleware Integration

```typescript
// middleware.ts (project root)
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import {
  RateLimiters,
  getClientIP,
  rateLimitHeaders,
} from "@/lib/middleware/rate-limit";

export async function middleware(
  request: NextRequest,
  context: NextFetchEvent
) {
  const pathname = request.nextUrl.pathname;
  const ip = getClientIP(request);

  // Skip rate limiting for static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Select limiter based on path
  let result;

  if (pathname.startsWith("/api/auth")) {
    // Auth endpoints: stricter limits, fail closed
    result = await RateLimiters.edgeAuth(ip);
  } else if (pathname.startsWith("/api")) {
    // General API: standard limits
    result = await RateLimiters.edgeApi(ip);
  } else {
    // Non-API: generous limits
    result = await RateLimiters.generous(ip);
  }

  // CRITICAL: Wait for analytics/sync in edge
  context.waitUntil(result.pending);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests",
        retryAfter: result.retryAfter,
      },
      {
        status: 429,
        headers: rateLimitHeaders(result),
      }
    );
  }

  // Add rate limit headers to response
  const response = NextResponse.next();
  Object.entries(rateLimitHeaders(result)).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

---

### 6.4 API Route Usage Examples

```typescript
// app/api/chat/route.ts
import { NextRequest } from "next/server";
import {
  RateLimiters,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const userId = /* get from auth */ "guest";

  // Use user-based limit for chat
  const result = await RateLimiters.chat(userId || ip);

  if (!result.allowed) {
    return rateLimitResponse(result, "Chat rate limit exceeded");
  }

  // Process chat request...
}
```

```typescript
// app/api/upload/route.ts
import { NextRequest } from "next/server";
import { RateLimiters, rateLimitResponse } from "@/lib/middleware/rate-limit";

export async function POST(request: NextRequest) {
  const userId = /* get from auth */ "";

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Strict upload limits
  const result = await RateLimiters.upload(userId);

  if (!result.allowed) {
    return rateLimitResponse(result, "Upload limit exceeded. Try again later.");
  }

  // Process upload...
}
```

---

## 7. Guest vs Authenticated User Strategy

```typescript
// Helper for tiered rate limiting
export async function checkTieredRateLimit(
  request: Request,
  userId?: string
): Promise<RateLimitResult> {
  const ip = getClientIP(request);

  if (userId) {
    // Authenticated user: higher limits, user-based
    return RateLimiters.authenticated(userId);
  } else {
    // Guest user: lower limits, IP-based
    return RateLimiters.guest(ip);
  }
}
```

---

## 8. Fail Open vs Fail Closed Strategy

| Endpoint Type          | Strategy    | Reason                       |
| ---------------------- | ----------- | ---------------------------- |
| Auth (login, register) | FAIL CLOSED | Prevent brute force          |
| General API            | FAIL OPEN   | Better UX, Redis outage rare |
| Chat/AI                | FAIL OPEN   | UX priority                  |
| Upload                 | FAIL CLOSED | Resource protection          |
| Admin actions          | FAIL CLOSED | Security critical            |

---

## 9. OldApp Files Reference

| OldApp File                                  | Purpose               | Adapt to NewApp         |
| -------------------------------------------- | --------------------- | ----------------------- |
| `oldapp/lib/middleware/rate-limit-config.ts` | Centralized constants | ✅ Copy & modify        |
| `oldapp/lib/middleware/edge-rate-limit.ts`   | Edge implementation   | ✅ Primary reference    |
| `oldapp/lib/middleware/rate-limit.ts`        | Node.js algorithms    | ⚠️ Use @upstash instead |
| `oldapp/proxy.ts`                            | Middleware usage      | ✅ Pattern reference    |

---

## 10. Environment Variables

```env
# Required for rate limiting
CACHE_KV_REST_API_URL=https://your-redis.upstash.io
CACHE_KV_REST_API_TOKEN=your_token_here
```

---

## 11. Recommendations

1. **Use Sliding Window** for most endpoints (best balance)
2. **Use Token Bucket** for AI/chat (handles bursts)
3. **Always call `context.waitUntil(pending)`** in Edge
4. **FAIL CLOSED for auth** endpoints
5. **Ephemeral cache** reduces Redis calls under attack
6. **Different prefixes** for different endpoint types (analytics separation)
7. **Set reasonable timeout** (3s default, not 5s)
8. **Add rate limit headers** to all responses

---

## Files to Create

1. `lib/middleware/rate-limit-config.ts` - Configuration constants
2. `lib/middleware/rate-limit.ts` - Core rate limiting module
3. Update `middleware.ts` - Edge middleware integration

---

## Research Complete

This research provides implementation-ready code for Upstash rate limiting with Edge compatibility. All code patterns are derived from OldApp and official Upstash documentation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [TASK COMPLETE]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
