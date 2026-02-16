# Phase 9: Middleware - Issues

**Phase Name:** Middleware
**Comparison Scope:** `archive/oldapp/lib/middleware/` (4 files) → `middleware.ts` + `lib/middleware/` (4 files) + `lib/rate-limit/` (3 files)
**Date Started:** 2026-02-15
**Date Completed:** 2026-02-16

> The middleware architecture has been significantly refactored. The OLD app had no root `middleware.ts` but had a comprehensive `lib/middleware/` library with rate limiting, edge-compatible rate limiting, centralized configuration, and request deduplication. The NEW app introduces a root `middleware.ts` for edge-level request handling and reorganizes the middleware library. Critical finding: the entire request deduplication system is missing from the new implementation.

---

## Issue Counts

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 4 |
| Medium | 5 |
| Low | 1 |
| **Total Issues** | **11** |
| Improvements | 3 |
| **Total Entries** | **14** |

---

## Table of Contents

- [Issue Counts](#issue-counts)
- [UI Inconsistencies](#ui-inconsistencies)
- [Bugs](#bugs)
  - [P9-BUG-001 Missing Fail-Closed Mode for Auth Rate Limiting in Root Middleware](#p9-bug-001-missing-fail-closed-mode-for-auth-rate-limiting-in-root-middleware)
- [Broken Code](#broken-code)
- [Functional Discrepancies](#functional-discrepancies)
  - [P9-FNC-001 Missing Request Deduplication System](#p9-fnc-001-missing-request-deduplication-system)
  - [P9-FNC-002 Missing Multiple Rate Limiting Algorithms](#p9-fnc-002-missing-multiple-rate-limiting-algorithms)
  - [P9-FNC-003 Missing OpenTelemetry Integration in Rate Limiting](#p9-fnc-003-missing-opentelemetry-integration-in-rate-limiting)
  - [P9-FNC-004 Missing Granular Rate Limit Configuration Presets](#p9-fnc-004-missing-granular-rate-limit-configuration-presets)
  - [P9-FNC-005 Missing In-Flight Request Tracking](#p9-fnc-005-missing-in-flight-request-tracking)
  - [P9-FNC-006 Missing Response Caching for Duplicate Requests](#p9-fnc-006-missing-response-caching-for-duplicate-requests)
  - [P9-FNC-007 Missing Request Fingerprinting Utility](#p9-fnc-007-missing-request-fingerprinting-utility)
  - [P9-FNC-008 Missing getClientIP Export from Middleware Module](#p9-fnc-008-missing-getclientip-export-from-middleware-module)
  - [P9-FNC-009 Upload Rate Limit Changed from Hourly to Per-Minute](#p9-fnc-009-upload-rate-limit-changed-from-hourly-to-per-minute)
  - [P9-FNC-010 Missing AUTH_EXCHANGE and AUTH_GUEST Rate Limiters](#p9-fnc-010-missing-auth_exchange-and-auth_guest-rate-limiters)
- [Improvement Only](#improvement-only)
  - [P9-IMP-001 New Root Middleware Architecture](#p9-imp-001-new-root-middleware-architecture)
  - [P9-IMP-002 New Middleware Composition System](#p9-imp-002-new-middleware-composition-system)
  - [P9-IMP-003 Simplified Rate Limiter Using @upstash/ratelimit](#p9-imp-003-simplified-rate-limiter-using-upstashratelimit)
- [File Comparison Summary](#file-comparison-summary)

---

## Verification Summary

| Issue | Status | Timestamp |
|-------|--------|-----------|
| P9-BUG-001 | ✅ Verified (Defect) | 2026-02-16T16:00:00Z |
| P9-FNC-001 | ✅ Verified | 2026-02-16T12:00:00Z |
| P9-FNC-002 | ✅ Verified | 2026-02-16T12:00:00Z |
| P9-FNC-003 | ✅ Verified | 2026-02-16T12:00:00Z |
| P9-FNC-004 | ✅ Verified | 2026-02-16T12:00:00Z |
| P9-FNC-005 | ✅ Verified | 2026-02-16T12:00:00Z |
| P9-FNC-006 | ✅ Verified | 2026-02-16T12:00:00Z |
| P9-FNC-007 | ✅ Verified | 2026-02-16T12:00:00Z |
| P9-FNC-008 | ✅ Verified | 2026-02-16T12:00:00Z |
| P9-FNC-009 | ✅ Verified | 2026-02-16T12:00:00Z |
| P9-FNC-010 | ⚠️ Verified (Partial) | 2026-02-16T12:00:00Z |
| P9-IMP-001 | ✅ Verified (Improvement) | 2026-02-16T12:00:00Z |
| P9-IMP-002 | ⚠️ Verified (Incomplete) | 2026-02-16T14:00:00Z |
| P9-IMP-003 | ✅ Verified (Improvement) | 2026-02-16T14:00:00Z |

---

## UI Inconsistencies

*No UI inconsistencies identified in this phase.*

---

## Bugs

### [P9-BUG-001] Missing Fail-Closed Mode for Auth Rate Limiting in Root Middleware

| Field | Value |
|-------|-------|
| **Issue ID** | P9-BUG-001 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/middleware/edge-rate-limit.ts` |
| **NEW Path** | `middleware.ts` |

**Description:** The OLD edge rate limiter had explicit fail-closed mode for auth endpoints:
```typescript
/** Auth: For authentication endpoints (FAIL CLOSED - Task 7.5) */
auth: (identifier: string) =>
    checkEdgeRateLimit({
        failClosed: true, // fail closed for auth - deny requests if Redis unavailable
    }),
```
The NEW root middleware uses `authLimiter` which has `failClosed: true` in its config, but the middleware doesn't check if rate limiting is available before applying it.

**Impact:**
- If Redis is unavailable, auth endpoints may not be properly protected
- Security risk if rate limiting silently fails

**Suggested Fix:** Verify that `authLimiter.failClosed` behavior is correctly applied in the root middleware when Redis is unavailable.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | ✅ Verified (Defect) |
| **Verified At** | 2026-02-16T16:00:00Z |

**Findings (Original):** False Positive. Fail-closed IS correctly implemented in the new code through a three-layer chain:
1. `lib/rate-limit/limits.ts:41-48` creates `authLimiter` with `{ failClosed: true }` option.
2. `lib/rate-limit/rate-limiter.ts` `RateLimiter.performLimitCheck()` L134-138 checks `this.options.failClosed`: when `this.ratelimit` is null (Redis unavailable at init) it calls `createDeniedResult()` returning `{ success: false, remaining: 0 }`. The catch block at L155-160 also checks `failClosed` on runtime errors.
3. `middleware.ts` `getLimiterForRoute()` L170-175 routes `/api/auth/guest` and `/api/auth/logout` to `authLimiter`, then `applyRateLimit()` L163 calls `limiter.consumeToken(identifier)` and checks `result.success` → rejects with 429 if false.
Behavior is functionally equivalent to OLD `checkEdgeRateLimit({ failClosed: true })` which also denied when Redis returned null. Both OLD and NEW deny all auth requests when Redis is unavailable — correct fail-closed behavior.

**Re-Verification (2026-02-16T16:00:00Z) — OVERTURNED:**
The original FP verdict examined the `RateLimiter` class in isolation but did NOT trace the middleware routing. Full end-to-end trace reveals:
1. ✅ `authLimiter` at `lib/rate-limit/limits.ts:36-43` correctly configured with `{ failClosed: true }`.
2. ✅ `RateLimiter.performLimitCheck()` at `rate-limiter.ts:145-155` correctly returns `createDeniedResult()` when `this.ratelimit` is null and `failClosed` is true.
3. ❌ **UNREACHABLE**: `middleware.ts:67-68` — `isAuthCallbackRoute(pathname)` returns `true` for ALL `/api/auth/` routes and immediately returns `NextResponse.next()`. This short-circuits BEFORE the rate limiting check at `middleware.ts:83`.
4. ❌ `getLimiterForRoute()` at `middleware.ts:196-201` routes `/api/auth/guest` and `/api/auth/logout` to `authLimiter`, but this function is never called for auth routes because they exit at step 3.

**Conclusion**: The fail-closed mechanism is correctly implemented at the library level (`RateLimiter` class) but is **completely unreachable** for all auth endpoints due to the middleware's early return at L67-68. Auth routes (`/api/auth/guest`, `/api/auth/logout`) receive NO rate limiting of any kind — neither fail-open nor fail-closed.

**Note**: This overlaps with P8-FNC-004 (Missing Rate Limiting in Auth Guards) which also identifies the middleware bypass, but the original FP verdict on this issue incorrectly claimed the fail-closed path was functional end-to-end.

**VERDICT: OVERTURNED — False Positive → Verified (Defect). Fail-closed code exists but is unreachable for auth routes.**

---

## Broken Code

*No broken code identified in this phase.*

---

## Functional Discrepancies

### [P9-FNC-001] Missing Request Deduplication System

| Field | Value |
|-------|-------|
| **Issue ID** | P9-FNC-001 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/middleware/deduplication.ts` |
| **NEW Path** | N/A |

**Description:** The OLD app had a complete request deduplication system that prevents duplicate request processing for identical operations. This includes:
- `RequestDeduplicator` class with in-flight request tracking
- `deduplicateRequest()` function for automatic response caching
- `generateRequestFingerprint()` for request identification
- `withDeduplication()` middleware wrapper
- Pre-configured presets (short, standard, long, idempotent)

**Impact:**
- Race conditions in concurrent requests are no longer prevented
- Double-submit on slow networks is no longer handled
- Database load for identical queries may increase
- Idempotent operations (payment processing, etc.) are not protected

**Suggested Fix:** Migrate `archive/oldapp/lib/middleware/deduplication.ts` to `lib/middleware/deduplication.ts` and integrate with the new middleware composition system.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | ✅ Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:**
- OLD file confirmed: 386-line `RequestDeduplicator` class with Redis-backed distributed deduplication, in-flight Map tracking, response caching, OpenTelemetry spans, and 4 presets (short/standard/long/idempotent)
- NEW codebase: `file_search` for `**/deduplication*` returns ONLY the archive file; `grep_search` finds no deduplication implementation outside archive
- The v6 spec (`directory-structure-v6.md:671`) lists `deduplication.ts` as expected but it was never created
- Implementation Plan (`.apm/Implementation_Plan.md:361-367`) explicitly planned deduplication but task was not executed
- Entire subsystem is confirmed missing — issue is accurate

---

### [P9-FNC-002] Missing Multiple Rate Limiting Algorithms

| Field | Value |
|-------|-------|
| **Issue ID** | P9-FNC-002 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/middleware/rate-limit.ts` |
| **NEW Path** | `lib/rate-limit/rate-limiter.ts` |

**Description:** The OLD app supported three rate limiting algorithms:
1. **Token Bucket** - Allows bursts while maintaining average rate
2. **Sliding Window** - Precise rate limiting using sorted sets (Lua scripts)
3. **Fixed Window** - Simple counter-based limiting

The NEW app only uses `@upstash/ratelimit` with sliding window algorithm. Token bucket and fixed window algorithms are not available.

**Impact:**
- Chat endpoints that benefited from token bucket's burst handling now use sliding window
- Upload endpoints that used fixed window per-hour limiting have different behavior
- Less flexibility in rate limiting strategies

**Suggested Fix:** Consider implementing token bucket algorithm for chat endpoints where burst handling is beneficial. Evaluate if the simplified approach meets all use cases.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | ✅ Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:**
- OLD `rate-limit.ts` confirmed: Three full class implementations — `TokenBucketLimiter` (refill-based burst control), `SlidingWindowLimiter` (Lua script-backed sorted sets), `FixedWindowLimiter` (counter-based)
- OLD `RateLimiters.chat` used `strategy: "token_bucket"`, `RateLimiters.upload` used `strategy: "fixed_window"` — algorithm selection was use-case specific
- NEW `rate-limiter.ts:103`: Only uses `Ratelimit.slidingWindow()` from `@upstash/ratelimit`; no token bucket or fixed window anywhere in new code
- The trade-off is intentional simplification (using battle-tested `@upstash/ratelimit`) at the cost of algorithm flexibility
- Issue accurately describes the gap

---

### [P9-FNC-003] Missing OpenTelemetry Integration in Rate Limiting

| Field | Value |
|-------|-------|
| **Issue ID** | P9-FNC-003 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/middleware/rate-limit.ts` |
| **NEW Path** | `lib/rate-limit/rate-limiter.ts` |

**Description:** The OLD rate limiting implementation had OpenTelemetry integration:
```typescript
import { trace } from "@opentelemetry/api";
const span = trace.getActiveSpan();
span.setAttribute("rate_limit.strategy", strategy);
span.setAttribute("rate_limit.allowed", result.allowed);
```
The NEW implementation has no OpenTelemetry tracing.

**Impact:**
- Rate limiting events are not traceable in observability dashboards
- Debugging rate limit issues in production is harder
- No distributed tracing context for rate limit operations

**Suggested Fix:** Add OpenTelemetry span attributes to `RateLimiter.performLimitCheck()` method.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | ✅ Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:**
- OLD `rate-limit.ts:3`: `import { trace } from "@opentelemetry/api"` confirmed; `checkRateLimit()` sets span attributes for `rate_limit.strategy`, `rate_limit.limit`, `rate_limit.window`, `rate_limit.namespace`, `rate_limit.allowed`, `rate_limit.remaining`
- OLD `deduplication.ts:3`: Also imports and uses `trace.getActiveSpan()` for dedup tracing
- NEW `rate-limiter.ts`: Zero OpenTelemetry imports, zero span attributes; only `logDebug`/`logWarn` for logging
- `@opentelemetry/api` IS installed in package.json (v1.9.0) and `@vercel/otel` (v2.1.0) is configured in `instrumentation.ts`, so the infrastructure exists — it's just not wired into rate limiting
- Issue is accurate; the gap is straightforward to close since OTel is already available

---

### [P9-FNC-004] Missing Granular Rate Limit Configuration Presets

| Field | Value |
|-------|-------|
| **Issue ID** | P9-FNC-004 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/middleware/rate-limit-config.ts` |
| **NEW Path** | `lib/rate-limit/limits.ts` |

**Description:** The OLD app had more granular rate limit presets:
- `EDGE_API` (100/60s), `EDGE_STRICT` (10/60s), `EDGE_AUTH` (20/60s)
- `STRICT` (10/60s), `STANDARD` (100/60s), `GENEROUS` (1000/60s)
- `CHAT` (50/60s), `UPLOAD` (10/3600s - per hour)
- `AUTH_EXCHANGE` (10/60s), `AUTH_GUEST` (20/60s)

The NEW app only has:
- `chat` (60/60s), `auth` (10/60s), `upload` (20/60s), `api` (100/60s)

Missing presets: `EDGE_*`, `STRICT`, `STANDARD`, `GENEROUS`, `AUTH_EXCHANGE`, `AUTH_GUEST`

**Impact:**
- Less flexibility in rate limiting different endpoint types
- Upload limit changed from 10/hour to 20/minute (significant difference)
- No distinction between edge-level and route-level limits

**Suggested Fix:** Add missing rate limit presets to `lib/rate-limit/limits.ts` or `lib/constants.ts`. Pay special attention to upload limits which changed from hourly to per-minute.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | ✅ Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:**
- OLD `rate-limit-config.ts`: Confirmed 10 presets with exact values as described (EDGE_API, EDGE_STRICT, EDGE_AUTH, STRICT, STANDARD, GENEROUS, CHAT, UPLOAD, AUTH_EXCHANGE, AUTH_GUEST)
- NEW `lib/constants.ts`: Confirmed only 4 presets: `chat`(60req/60s), `auth`(10req/60s), `upload`(20req/60s), `api`(100req/60s)
- NEW `lib/rate-limit/limits.ts`: 4 limiter instances (chatLimiter, authLimiter, uploadLimiter, apiLimiter) mapping 1:1 to constants
- Value changes confirmed: Chat 50→60, Upload 10/3600s→20/60s (120x increase per hour)
- Missing 6 presets: EDGE_API, EDGE_STRICT, EDGE_AUTH, STRICT/STANDARD/GENEROUS tiers, AUTH_EXCHANGE, AUTH_GUEST
- Issue is accurate; upload limit change is the most impactful gap

---

### [P9-FNC-005] Missing In-Flight Request Tracking

| Field | Value |
|-------|-------|
| **Issue ID** | P9-FNC-005 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/middleware/deduplication.ts` |
| **NEW Path** | N/A |

**Description:** The OLD deduplication system tracked in-flight requests within the same process:
```typescript
private readonly inFlightRequests = new Map<string, {
    promise: Promise<unknown>;
    timestamp: number;
}>();
```
This prevented duplicate processing when the same request was already being handled.

**Impact:**
- Concurrent identical requests are not deduplicated
- Wasted resources processing the same operation multiple times
- Potential race conditions in database operations

**Suggested Fix:** Implement in-flight request tracking as part of the missing deduplication system.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | ✅ Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:**
- OLD `deduplication.ts`: Confirmed `inFlightRequests` Map at class level with `{promise, timestamp}` values
- `registerInFlight(key, promise)` adds entries; `.finally()` cleanup removes on completion
- `checkDuplication()` checks in-flight map FIRST (same-process dedup) before Redis (distributed dedup)
- NEW codebase: Zero in-flight tracking anywhere; grep for `inFlight|in_flight|inflight` returns no relevant results outside archive
- This is a subset of P9-FNC-001 (missing deduplication system) but the specific in-process tracking is a distinct concern — it operates without Redis and prevents same-process duplicate work
- Issue is accurate

---

### [P9-FNC-006] Missing Response Caching for Duplicate Requests

| Field | Value |
|-------|-------|
| **Issue ID** | P9-FNC-006 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/middleware/deduplication.ts` |
| **NEW Path** | N/A |

**Description:** The OLD deduplication system could cache responses for duplicate requests:
```typescript
async storeResponse<T>(key: string, response: T, windowSeconds: number) {
    await redis.set(dedupKey, { timestamp: Date.now(), response }, { ex: windowSeconds });
}
```

**Impact:**
- Duplicate requests always re-execute the full operation
- No response caching for repeated identical requests
- Increased load on downstream services

**Suggested Fix:** Implement response caching as part of the deduplication system.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | ✅ Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** OLD `archive/oldapp/lib/middleware/deduplication.ts` L148-167 implements `storeResponse<T>()` on the `RequestDeduplicator` class, storing `{ timestamp, response }` in Redis with TTL via `redis.set(dedupKey, ..., { ex: windowSeconds })`. This is integrated into `deduplicateRequest()` L257-263 which calls `deduplicator.storeResponse()` after successful handler execution when `config.cacheResponse` is true. grep of the entire NEW codebase for `deduplication|deduplicat|RequestDeduplicator` returns zero hits outside `archive/` and issue files. No replacement mechanism exists. The entire `deduplication.ts` (386 lines) including `storeResponse`, `checkDuplication`, in-flight tracking, and all presets is absent from the new codebase.

---

### [P9-FNC-007] Missing Request Fingerprinting Utility

| Field | Value |
|-------|-------|
| **Issue ID** | P9-FNC-007 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/middleware/deduplication.ts` |
| **NEW Path** | N/A |

**Description:** The OLD app had a `generateRequestFingerprint()` function:
```typescript
export function generateRequestFingerprint(
    method: string,
    url: string,
    body?: unknown,
    userId?: string
): string
```
This created consistent keys for request deduplication.

**Impact:**
- No standardized way to identify duplicate requests
- Manual key generation required for any deduplication implementation

**Suggested Fix:** Migrate `generateRequestFingerprint()` to the new middleware library.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | ✅ Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** OLD `archive/oldapp/lib/middleware/deduplication.ts` L299-319 exports `generateRequestFingerprint(method, url, body?, userId?)` which produces deterministic keys by joining `[METHOD, url, user:userId, body:length:first100chars]` with `|` separator. grep of new codebase for `fingerprint|generateRequest` returns zero hits outside `archive/` and issue docs. The function was used by `withDeduplication()` examples and could be consumed by any request-level caching or idempotency layer. No equivalent exists in the new code.

---

### [P9-FNC-008] Missing getClientIP Export from Middleware Module

| Field | Value |
|-------|-------|
| **Issue ID** | P9-FNC-008 |
| **Severity** | Low |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/middleware/edge-rate-limit.ts` |
| **NEW Path** | `lib/rate-limit/rate-limiter.ts` |

**Description:** The OLD app exported `getClientIP()` from the edge-rate-limit module. The NEW app has the same function in `lib/rate-limit/rate-limiter.ts` and it IS exported from `lib/rate-limit/index.ts`. However, it's not re-exported from `lib/middleware/index.ts`.

**Impact:**
- Import path changed but function exists
- Minor developer experience issue

**Suggested Fix:** Re-export `getClientIP` from `lib/middleware/index.ts` for convenience.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | ✅ Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** OLD exported `getClientIP` from `archive/oldapp/lib/middleware/edge-rate-limit.ts:179-191`. NEW has an identical implementation at `lib/rate-limit/rate-limiter.ts:295-307` (same header-parsing logic: x-forwarded-for → first comma-split, x-real-ip fallback, 'unknown' default). It IS exported from `lib/rate-limit/index.ts:33`. But `lib/middleware/index.ts` re-exports from `./auth`, `./rate-limit`, `./compose` — the `./rate-limit` file (`lib/middleware/rate-limit.ts`) does NOT re-export `getClientIP` (it imports from `@/lib/rate-limit` but only re-exports `createRateLimitHeaders`, `getRetryAfter`, `RateLimiter`, `RateLimitResult`). Additionally, `lib/middleware/rate-limit.ts` has its own `getDefaultRateLimitKey()` helper (L148-159) which duplicates the same IP-extraction logic instead of using `getClientIP`. Consumers must import from `@/lib/rate-limit` instead of `@/lib/middleware`. Low severity — function exists, import path change only.

---

### [P9-FNC-009] Upload Rate Limit Changed from Hourly to Per-Minute

| Field | Value |
|-------|-------|
| **Issue ID** | P9-FNC-009 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/middleware/rate-limit-config.ts` |
| **NEW Path** | `lib/rate-limit/limits.ts` |

**Description:** The OLD upload rate limit was:
```typescript
UPLOAD: {
    limit: 10,
    window: 3600, // 1 hour
}
```
The NEW upload rate limit is:
```typescript
uploadLimiter: RateLimiter = createRateLimiter({
    limit: RATE_LIMITS.upload.requests, // 20
    window: RATE_LIMITS.upload.window,  // 60 seconds
})
```
This is a significant change from 10 uploads per hour to 20 uploads per minute.

**Impact:**
- Users can upload 120x more files per hour than before
- Potential for abuse through mass uploads
- Resource consumption may increase significantly

**Suggested Fix:** Review if the new upload limits are intentional. If not, restore the hourly window.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | ✅ Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Full trace:
- OLD: `archive/oldapp/lib/middleware/rate-limit-config.ts:89-94` → `UPLOAD: { limit: 10, window: 3600, namespace: "upload" }` = **10 uploads per hour**.
- NEW: `lib/constants.ts:73-76` → `upload: { requests: 20, window: 60 }` = **20 uploads per 60 seconds**.
- NEW: `lib/rate-limit/limits.ts:51-55` creates `uploadLimiter` consuming `RATE_LIMITS.upload.requests` (20) and `RATE_LIMITS.upload.window` (60).
- NEW: `middleware.ts:179` routes `/api/files/upload` to `uploadLimiter`.
- Effective rate change: OLD = 10/hr, NEW = 20/min × 60 = 1200/hr → **120× increase**. This is a significant security regression for file upload abuse prevention.

---

### [P9-FNC-010] Missing AUTH_EXCHANGE and AUTH_GUEST Rate Limiters

| Field | Value |
|-------|-------|
| **Issue ID** | P9-FNC-010 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/middleware/rate-limit-config.ts` |
| **NEW Path** | `lib/rate-limit/limits.ts` |

**Description:** The OLD app had dedicated rate limiters for:
- `AUTH_EXCHANGE` (10/60s) - for token exchange endpoint, strict to prevent token enumeration
- `AUTH_GUEST` (20/60s) - for guest session creation, moderately strict to prevent session flooding

These specialized limiters are not present in the NEW app.

**Impact:**
- Token exchange endpoint may not have appropriate rate limiting
- Guest session creation may be vulnerable to session flooding attacks

**Suggested Fix:** Add `authExchangeLimiter` and `authGuestLimiter` to `lib/rate-limit/limits.ts`.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | ⚠️ Verified (Partial) |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Partially confirmed.
- **AUTH_EXCHANGE**: False Positive for this specific limiter. OLD `archive/oldapp/app/api/auth/exchange/route.ts` was a Supabase-specific token exchange endpoint. The NEW app uses NextAuth v5 (`lib/auth/config.ts`) with internal session management — no `/api/auth/exchange` route exists. NextAuth's `[...nextauth]` catch-all handles token lifecycle. Confirmed by `issues/06-api-routes/issues.md` which states "The exchange endpoint is Supabase-specific and does NOT apply to the new architecture." AUTH_EXCHANGE limiter is not needed.
- **AUTH_GUEST**: Verified as a real gap. OLD `archive/oldapp/lib/middleware/rate-limit-config.ts:110-115` defined `AUTH_GUEST: { limit: 20, window: 60, namespace: "guest_auth" }`. OLD `archive/oldapp/app/api/auth/guest/route.ts:33-44` applied this via `requireCustomRateLimitForRoute()` per IP. NEW root `middleware.ts:170-175` routes `/api/auth/guest` to the generic `authLimiter` (10/60s with failClosed), which is stricter than OLD (20/60s). While the guest endpoint IS rate-limited (unlike what some issue docs suggest), the limit is 2× stricter than intended (10 vs 20 per minute). Additionally, OLD applied rate limiting per-IP inside the route handler; NEW applies it per-userId/guestId at the edge middleware level — different identifier semantics. The OLD also used `AUTH_EXCHANGE` limits for the logout endpoint (`archive/oldapp/app/api/auth/logout/route.ts:36-37`), which is now covered by the generic `authLimiter`.

---

## Improvement Only

### [P9-IMP-001] New Root Middleware Architecture

| Field | Value |
|-------|-------|
| **Issue ID** | P9-IMP-001 |
| **Location** | `middleware.ts` (247 lines) |
| **Status** | Verified (Improvement) |

**Description:** The NEW app introduces a root `middleware.ts` that runs on Edge runtime. This provides:
- Authentication checks at the edge
- Rate limiting before requests reach route handlers
- Protected route handling
- Auth page redirects for logged-in users
- User context headers for downstream use

This is an architectural improvement over the OLD app which had no root middleware.

**Impact:** Positive - Better security and performance with edge-level request handling.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | ✅ Verified (Improvement) |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Full analysis of `middleware.ts` (247 lines):
1. **Auth Callback Bypass** (L66-68): Skips `/api/auth/` routes — NextAuth handles these internally.
2. **Health Route Bypass** (L72-74): `/api/health` is unblocked for monitoring.
3. **Session Resolution** (L77-78): Calls `auth()` from `@/lib/auth` at edge; extracts `userId` or generates `guest:UUID`.
4. **API Rate Limiting** (L81-93): All `/api/` routes pass through `applyRateLimit()` → `getLimiterForRoute()` which dispatches to `chatLimiter`, `authLimiter`, `uploadLimiter`, or `apiLimiter` based on pathname. Returns 429 with `Retry-After`, `X-RateLimit-*` headers on denial.
5. **Protected Pages** (L96-100): `/chat/` paths redirect unauthenticated users to `/login?callbackUrl=`.
6. **Auth Page Redirect** (L103-105): `/login` and `/register` redirect authenticated users to `/`.
7. **User Context Headers** (L108-110): Sets `x-user-id` and `x-is-authenticated` headers for downstream route handlers.
8. **Matcher Config** (L48-53): Excludes static files and `_next/` paths.

OLD app had NO root middleware — rate limiting and auth checks were per-route inside handlers. NEW centralizes these concerns at the edge, reducing boilerplate and providing consistent enforcement.

---

### [P9-IMP-002] New Middleware Composition System

| Field | Value |
|-------|-------|
| **Issue ID** | P9-IMP-002 |
| **Location** | `lib/middleware/compose.ts` (182 lines) |
| **Status** | Verified (Incomplete) |

**Description:** The NEW app has a middleware composition system:
- `compose()` - Chain multiple middleware functions
- `createPipeline()` - Create reusable middleware pipelines
- `apiMiddleware()` - Pre-built auth + rate limit pipeline
- `publicMiddleware()` - Rate limit only pipeline

This provides better code reuse and cleaner API route implementations.

**Impact:** Positive - More maintainable and composable middleware patterns.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | ⚠️ Verified (Incomplete) |
| **Verified At** | 2026-02-16T14:00:00Z |

**Findings:**
- `lib/middleware/compose.ts` confirmed with 4 exported functions: `compose<T>()`, `createPipeline<T>()`, `apiMiddleware()`, `publicMiddleware()`.
- `compose()` (L64-91): Proper chain implementation — increments index, calls `handler(req, ctx)` when all middleware exhausted. Design is sound.
- `createPipeline()` (L123-132): Thin wrapper over `compose()` that closes over `handler` for convenience.
- **Deficiency 1 — `apiMiddleware()` is PLACEHOLDER** (L153-163): Comment at L159 states "For now, this is a placeholder that will be properly implemented when the full middleware system is integrated". It only wraps `withAuthMiddleware` — no rate limiting despite docs claiming "auth + rate limit pipeline".
- **Deficiency 2 — `publicMiddleware()` has NO rate limiting** (L173-180): Docs say "rate limiting only" but implementation just passes `undefined` context to handler — zero rate limiting applied.
- **Deficiency 3 — ZERO consumers**: grep for import references to `compose`, `apiMiddleware`, `createPipeline`, `publicMiddleware` returns only the barrel export in `lib/middleware/index.ts`. No API route or handler actually uses these utilities.
- The composition primitives (`compose`, `createPipeline`) are architecturally sound but the pre-built pipelines are incomplete and the entire module is unused.

---

### [P9-IMP-003] Simplified Rate Limiter Using @upstash/ratelimit

| Field | Value |
|-------|-------|
| **Issue ID** | P9-IMP-003 |
| **Location** | `lib/rate-limit/rate-limiter.ts` (~340 lines) |
| **Status** | Verified (Improvement) |

**Description:** The NEW app uses `@upstash/ratelimit` package directly instead of implementing custom algorithms. This:
- Reduces code complexity
- Uses battle-tested implementation
- Provides built-in analytics
- Simplifies maintenance

**Impact:** Positive - Simpler, more maintainable rate limiting at the cost of algorithm flexibility.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | ✅ Verified (Improvement) |
| **Verified At** | 2026-02-16T14:00:00Z |

**Findings:**
- **OLD** (`archive/oldapp/lib/middleware/rate-limit.ts`): Three full custom algorithm classes:
  1. `TokenBucketLimiter` (L72-120): Custom refill-based token bucket with Redis `get/set`.
  2. `SlidingWindowLimiter` (L127-195): Lua script-backed sorted set implementation (`ZADD/ZREMRANGEBYSCORE/ZCARD`).
  3. `FixedWindowLimiter` (L202-247): Counter-based with `INCR/EXPIRE`.
  Plus unified `checkRateLimit()` dispatcher, `createRateLimiter()` factory, and `RateLimiters` presets (strict/standard/generous/chat/upload) with per-use-case algorithm selection.
  Also includes OpenTelemetry span attributes (L301-312) via `trace.getActiveSpan()`.
- **NEW** (`lib/rate-limit/rate-limiter.ts`): Single `RateLimiter` class wrapping `@upstash/ratelimit`.
  - L103: `Ratelimit.slidingWindow(limit, window)` — only algorithm available.
  - L106: `analytics: true` — built-in analytics enabled (OLD had none).
  - `checkLimit()` and `consumeToken()` distinguish read-only vs consuming checks.
  - `performLimitCheck()` L134-160: Handles Redis unavailability with `failClosed` option.
  - `resetLimit()`, `getRemaining()` utility methods.
  - Factory `createRateLimiter()` and helpers (`getClientIP`, `getRetryAfter`, `createRateLimitHeaders`).
- **NEW** `lib/rate-limit/limits.ts`: 4 pre-configured instances (chatLimiter, authLimiter, uploadLimiter, apiLimiter) with registry pattern and convenience functions.
- **Trade-offs confirmed**:
  - ✅ Simpler: ~720 LOC of custom algo code → ~340 LOC wrapping battle-tested library.
  - ✅ Analytics: Built-in `analytics: true` (Upstash dashboard integration).
  - ✅ Reliability: Industry-tested sliding window implementation.
  - ❌ Flexibility lost: No token bucket (burst handling for chat), no fixed window (hourly upload limits).
  - ❌ OpenTelemetry removed: Zero span attributes in new code (see P9-FNC-003).
- Issue description is accurate. The simplification is a net positive for maintainability.

---

## File Comparison Summary

| OLD File | NEW File | Status |
|----------|----------|--------|
| N/A (did not exist) | `middleware.ts` | NEW - Edge middleware |
| `lib/middleware/rate-limit.ts` | `lib/rate-limit/rate-limiter.ts` | MIGRATED (simplified) |
| `lib/middleware/edge-rate-limit.ts` | `lib/rate-limit/rate-limiter.ts` | MERGED into rate-limiter |
| `lib/middleware/rate-limit-config.ts` | `lib/constants.ts` + `lib/rate-limit/limits.ts` | SPLIT |
| `lib/middleware/deduplication.ts` | N/A | **MISSING** |
| N/A (did not exist) | `lib/middleware/auth.ts` | NEW |
| N/A (did not exist) | `lib/middleware/compose.ts` | NEW |
| N/A (did not exist) | `lib/middleware/index.ts` | NEW |
