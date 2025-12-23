# ADR-006: Session Cache Strategy (30s TTL)

## Status

Accepted

## Date

2024-12-23

## Reference

ARCH-001, NET-002

## Context

Every authenticated request required validating the user session via Supabase's `getUser()` API. This caused:

1. **Network latency**: 50-150ms per API call to Supabase
2. **Redundant calls**: Same session validated multiple times per page load
3. **Rate limiting risk**: High volume of validation requests
4. **Cost**: Each `getUser()` call counts against Supabase quotas

A typical page load pattern:

```
Page Load → Layout (getUser) → Sidebar (getUser) → ChatList (getUser)
                ↓                    ↓                    ↓
            150ms               150ms               150ms
            Total: 450ms of session validation!
```

### Requirements

- Reduce redundant Supabase calls
- Maintain security (session revocation must propagate)
- Support high concurrency
- Work with React Server Components

## Decision

Implement a **two-layer caching strategy**:

1. **Redis Cache** (30s TTL) - Cross-request session validation cache
2. **React `cache()`** - Request-level deduplication

### Implementation

**Layer 1: Redis Session Cache** (lib/auth/session-cache.ts)

```typescript
const SESSION_CACHE_TTL = 30; // seconds
const SESSION_CACHE_PREFIX = "session:valid:";

export async function getCachedSession(
  userId: string
): Promise<AppSession | null> {
  const redis = getRedis();
  if (!redis) return null;

  return redis.get<AppSession>(`${SESSION_CACHE_PREFIX}${userId}`);
}

export async function setCachedSession(
  userId: string,
  session: AppSession
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  await redis.set(`${SESSION_CACHE_PREFIX}${userId}`, session, {
    ex: SESSION_CACHE_TTL,
  });
}

export async function invalidateCachedSession(userId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  await redis.del(`${SESSION_CACHE_PREFIX}${userId}`);
}
```

**Layer 2: React Request Cache** (lib/auth/session.ts)

```typescript
import { cache } from "react";

// Deduplicated within a single request
export const getSession = cache(async (): Promise<AppSession | null> => {
  // 1. Check Redis cache first
  const cached = await getCachedSession(userId);
  if (cached) return cached;

  // 2. Validate with Supabase
  const session = await validateWithSupabase();
  if (!session) return null;

  // 3. Cache for future requests
  await setCachedSession(userId, session);
  return session;
});
```

### Why 30 Seconds?

| TTL  | Pros              | Cons                        |
| ---- | ----------------- | --------------------------- |
| 5s   | Fast revocation   | High Supabase load          |
| 30s  | Good balance      | Acceptable revocation delay |
| 5min | Low Supabase load | Slow revocation             |
| 1hr  | Minimal load      | Unacceptable security       |

**30 seconds** was chosen because:

- User actions rarely require sub-30s revocation
- Logout explicitly invalidates cache
- Reduces Supabase calls by ~95% for active users
- Matches typical "active session" interaction window

## Consequences

### Positive

- **95% reduction in Supabase calls** for active sessions
- **50-150ms saved** per cached hit
- **Request deduplication** via React cache
- **Graceful degradation** - works without Redis (just slower)
- **Explicit invalidation** - logout clears cache immediately

### Negative

- **30s revocation delay** - compromised sessions valid briefly
- **Redis dependency** - optimal performance requires Redis
- **Cache coherency** - stale reads possible in edge cases
- **Memory usage** - session data stored in Redis

### Neutral

- Same security model, just cached
- Requires cache invalidation discipline

## Cache Flow Diagram

```
Request arrives
      ↓
[React cache() hit?] → Yes → Return cached (same request)
      ↓ No
[Redis cache hit?] → Yes → Return cached (cross-request)
      ↓ No
[Supabase getUser()] → Validate session
      ↓
[Cache in Redis] → 30s TTL
      ↓
[Cache in React] → Request lifetime
      ↓
Return session
```

## Alternatives Considered

### 1. No Caching (Current State)

- Validate every request with Supabase
- **Rejected**: Unacceptable latency and cost

### 2. Long TTL (5+ minutes)

- Fewer Supabase calls, longer cache
- **Rejected**: Security risk from delayed revocation

### 3. Local Memory Cache Only

- In-process cache, no Redis
- **Rejected**: Doesn't work with serverless (no shared state)

### 4. JWT-Only Validation

- Trust JWT without server validation
- **Rejected**: Can't detect revocation until expiry

### 5. Supabase Realtime for Invalidation

- Subscribe to session changes via websocket
- **Rejected**: Over-complex for the benefit

## Cache Invalidation Points

| Event              | Action                            |
| ------------------ | --------------------------------- |
| User logout        | `invalidateCachedSession(userId)` |
| Password change    | `invalidateCachedSession(userId)` |
| Session revocation | `invalidateCachedSession(userId)` |
| TTL expiry         | Automatic (Redis handles)         |

## Monitoring Recommendations

- Track cache hit/miss ratio
- Alert if miss ratio exceeds 50%
- Monitor Redis memory usage
- Log cache invalidation events

## Related Files

- [lib/auth/session-cache.ts](../../lib/auth/session-cache.ts) - Redis cache implementation
- [lib/auth/session.ts](../../lib/auth/session.ts) - Session validation with caching
- [lib/cache/client.ts](../../lib/cache/client.ts) - Redis client
