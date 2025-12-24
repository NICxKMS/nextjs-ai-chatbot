# ADR-007: Cache Prewarming Strategy

## Status

Accepted

## Date

2024-12-23

## Reference

ARCH-001, PERF-004

## Context

Even with session caching (ADR-006), users experience **cold cache latency** on their first interaction after authentication. The first request to load the sidebar/chat list would:

1. Cache miss on session → Validate with Supabase (50-150ms)
2. Cache miss on chat list → Query database (100-300ms)
3. Cache miss on recent messages → Query database (50-100ms)

**Total cold-start penalty: 200-550ms**

This latency is most noticeable right after login, exactly when users expect a responsive experience. The "login → slow first page" pattern creates a poor impression.

### Observation

Authentication callbacks already have all the context needed:

- User ID is known
- User type (regular/guest) is known
- We're in a server context with DB access

Why not use this moment to proactively warm caches?

## Decision

Implement **cache prewarming** triggered after successful authentication, with a **smart cold-check flag** to prevent redundant work.

### Implementation

**Core Prewarm Function** (lib/cache-ops/prewarm.ts)

```typescript
/**
 * PERF-004: Prewarm critical caches for a user.
 * Call after successful authentication.
 */
export async function prewarmUserCache(
  userId: string,
  userType: "regular" | "guest" = "regular"
): Promise<void> {
  // Guests don't need DB prewarm (cache-only mode)
  if (userType === "guest") {
    return;
  }

  const ctx = createContext(userId, userType);

  await Promise.allSettled([
    prewarmChatList(ctx),
    // Future: prewarmSettings(userId),
    // Future: prewarmRecentMessages(userId),
  ]);
}
```

**Smart Prewarm with Cold-Check** (lib/cache-ops/prewarm.ts)

```typescript
const PREWARM_KEY_PREFIX = "prewarm:user:";
const PREWARM_FLAG_TTL = 300; // 5 minutes

/**
 * PERF-004: Smart prewarm - only warms if cache is cold.
 * Safe to call frequently without performance impact.
 */
export async function prewarmIfCold(
  userId: string,
  userType: "regular" | "guest" = "regular"
): Promise<void> {
  if (userType === "guest") return;

  const isWarmed = await isCacheWarmed(userId);
  if (isWarmed) return;

  await prewarmUserCache(userId, userType);
  await setCacheWarmed(userId); // Set 5-minute flag
}

async function isCacheWarmed(userId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  const flag = await redis.get(`${PREWARM_KEY_PREFIX}${userId}`);
  return flag !== null;
}

async function setCacheWarmed(userId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  await redis.set(`${PREWARM_KEY_PREFIX}${userId}`, "1", {
    ex: PREWARM_FLAG_TTL,
  });
}
```

**Chat List Prewarmer** (lib/cache-ops/prewarm.ts)

```typescript
async function prewarmChatList(ctx: DataContext): Promise<void> {
  // Check if cache is already populated
  const cached = await getUserChatsFromCache(ctx.userId, { limit: 1 });
  if (cached && cached.length > 0) return; // Already warm

  // Load from DB
  const result = await listChats(ctx, { limit: RECENT_CHATS_LIMIT });

  // Warm cache with each chat's metadata
  await Promise.allSettled(
    result.items.map((chat) => createChatInCache(chatToCachedMeta(chat), false))
  );
}
```

### Trigger Points

1. **Auth callback** - After OAuth success, before redirect
2. **First authenticated request** - Fallback if callback missed
3. **Page load** - Via `prewarmIfCold()` (safe to call always)

### Constants

| Constant           | Value        | Purpose                            |
| ------------------ | ------------ | ---------------------------------- |
| PREWARM_FLAG_TTL   | 300s (5 min) | How long to remember cache is warm |
| RECENT_CHATS_LIMIT | 5            | Number of recent chats to prewarm  |

## Consequences

### Positive

- **Eliminates cold-start latency** for authenticated users
- **Better perceived performance** - instant sidebar on first load
- **Non-blocking** - uses `Promise.allSettled`, doesn't break auth flow
- **Idempotent** - smart flag prevents redundant prewarms
- **Extensible** - easy to add more prewarm targets

### Negative

- **Additional DB queries** on auth (acceptable trade-off)
- **Cache storage** - prewarmed data uses Redis memory
- **Stale data risk** - prewarmed data may be slightly outdated
- **Auth callback latency** - adds 50-100ms to callback

### Neutral

- Guest users skip prewarming (cache-only mode)
- 5-minute flag window is a tunable parameter

## Design Decisions

### Why Promise.allSettled?

```typescript
await Promise.allSettled([prewarmChatList(ctx), prewarmSettings(ctx)]);
```

Instead of `Promise.all()`, we use `Promise.allSettled()` because:

- Partial success is acceptable
- One failure shouldn't break entire prewarm
- Auth flow must not fail due to cache issues

### Why 5-Minute Flag?

The `PREWARM_FLAG_TTL` of 5 minutes:

- Prevents repeated prewarms within short window
- Allows prewarm after longer absence
- Matches typical "session activity" duration

### Why Skip Guests?

Guest users:

- Don't have DB records to prewarm
- Already in cache-only mode
- Would prewarm empty data

## Alternatives Considered

### 1. No Prewarming

- Accept cold-start latency
- **Rejected**: Poor UX after login

### 2. Eager Loading in Layout

- Load all user data in root layout
- **Rejected**: Blocks page render, not all routes need all data

### 3. Background Job

- Queue prewarm job on auth
- **Rejected**: Added complexity, timing uncertainty

### 4. WebSocket Push

- Server pushes warm data after auth
- **Rejected**: Over-engineered for the benefit

### 5. Service Worker Cache

- Service worker prefetches data
- **Rejected**: Can't access server-side session

## Monitoring

Track these metrics:

- Prewarm execution time
- Prewarm success/failure rate
- Cold-check flag hit rate
- First-request latency (warm vs cold)

## Future Enhancements

```typescript
// Potential additions to prewarmUserCache()
await Promise.allSettled([
  prewarmChatList(ctx), // ✅ Implemented
  // prewarmSettings(ctx),         // TODO: User preferences
  // prewarmRecentMessages(ctx),   // TODO: Last 3 conversations
  // prewarmModelConfig(ctx),      // TODO: AI model settings
]);
```

## Related Files

- [lib/cache-ops/prewarm.ts](../../lib/cache-ops/prewarm.ts) - Implementation
- [lib/cache-ops/index.ts](../../lib/cache-ops/index.ts) - Cache operations
- [lib/cache/client.ts](../../lib/cache/client.ts) - Redis client
- [lib/data/chat.ts](../../lib/data/chat.ts) - Chat data access
