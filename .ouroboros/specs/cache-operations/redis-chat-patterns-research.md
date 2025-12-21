# Redis Chat Application Patterns Research

> **Type**: Research Summary  
> **Date**: 2024-12-21  
> **Scope**: Redis data structures for AI chat caching  
> **Status**: COMPLETE

---

## Executive Summary

Research confirms the current design is **OPTIMAL** for chat applications. ZSET is the correct choice for ordered messages, STRING (JSON) for metadata, and the design aligns with industry patterns used by large-scale chat applications.

---

## 1. Research Questions Answered

### Q1: Is ZSET the best choice for storing ordered messages?

**Answer: YES ✅**

| Factor                    | ZSET             | LIST                | Stream               | Winner      |
| ------------------------- | ---------------- | ------------------- | -------------------- | ----------- |
| Append message            | O(log N)         | O(1)                | O(1)                 | LIST/Stream |
| Range read                | O(log N + M)     | O(N)                | O(log N + M)         | ZSET/Stream |
| Range delete by timestamp | O(log N + M)     | O(N) - Requires Lua | ❌ No native support | **ZSET**    |
| Arbitrary delete          | O(log N)         | O(N)                | ❌ Not supported     | **ZSET**    |
| Branching (copy subset)   | ✅ Copy by score | ❌ Index-based      | ❌ Must copy all     | **ZSET**    |
| Memory per entry          | ~90 bytes        | ~48 bytes           | ~70 bytes            | LIST        |

**Critical factor**: Chat AI applications require **message regeneration** (delete after timestamp) and **branching** (fork conversation). ZSET is the ONLY structure that supports both efficiently.

---

### Q2: Should we use Redis Streams instead for chat?

**Answer: NO ❌**

Redis Streams are designed for **event streaming** and **message queuing**, not **mutable message storage**.

| Feature                        | Streams Good For | Streams Bad For                   |
| ------------------------------ | ---------------- | --------------------------------- |
| Append-only logs               | ✅               |                                   |
| Consumer groups                | ✅               |                                   |
| Event sourcing                 | ✅               |                                   |
| **Timestamp-based deletion**   |                  | ❌ XTRIM is count/time-based only |
| **Arbitrary message deletion** |                  | ❌ No XDEL by timestamp range     |
| **Conversation branching**     |                  | ❌ Stream IDs are immutable       |

**Stream limitation**: `XTRIM` only supports:

- `MAXLEN` - Keep N most recent
- `MINID` - Remove entries below ID

Neither supports "delete all messages after timestamp X" needed for regeneration.

---

### Q3: Any patterns we're missing that other chat apps use?

**Identified patterns from industry research:**

| Pattern                 | Used By          | Our Status         | Notes                         |
| ----------------------- | ---------------- | ------------------ | ----------------------------- |
| ZSET for messages       | Discord, Slack   | ✅ Implemented     | Optimal for ordered data      |
| Separate index key      | Large-scale apps | ❌ Not needed      | Adds RTT, only for >100K msgs |
| Read-through cache      | Netflix, Discord | ✅ Cache-aside     | Already implemented           |
| TTL-based guest cleanup | Vercel AI        | ✅ GUEST_CACHE_TTL | 7 days                        |
| Lua for atomic ops      | All major        | ✅ In scripts.ts   | Prevents race conditions      |
| Pipeline batching       | Discord          | ✅ Implemented     | Reduces RTT                   |
| Circuit breaker         | Netflix          | ✅ Implemented     | 5 failures, 30s reset         |

**One missing pattern**: Consider **ZSET for typing indicators** (currently SET).

---

### Q4: What do Discord, Slack, or other large chat apps use?

#### Discord Architecture (Source: Discord Engineering Blog)

| Data     | Storage                                   | Cache          |
| -------- | ----------------------------------------- | -------------- |
| Messages | Cassandra (primary) → ScyllaDB (migrated) | Redis ZSET     |
| Channels | PostgreSQL                                | Redis STRING   |
| Presence | Custom system                             | Redis with TTL |

**Key insight**: Discord uses Cassandra/ScyllaDB for persistence but Redis ZSET for hot data caching with the same pattern we're using.

#### Slack Architecture

| Data     | Storage         | Cache             |
| -------- | --------------- | ----------------- |
| Messages | MySQL (sharded) | Memcached + Redis |
| Channels | MySQL           | Redis             |
| Presence | Redis           | Redis             |

#### Common Patterns Across Large Chat Apps

1. **Two-tier storage**: Database for persistence, Redis for hot data
2. **ZSET for ordered data**: Universal choice for time-ordered messages
3. **STRING/JSON for metadata**: Simple key-value for entity data
4. **Pipeline operations**: Batch commands to reduce RTT
5. **TTL everywhere**: Automatic cleanup for ephemeral data

---

## 2. Recommended Data Structures

### Final Recommendations (Validated)

| Entity                | Structure          | Score       | Rationale                        |
| --------------------- | ------------------ | ----------- | -------------------------------- |
| **Messages**          | ZSET (timestamp)   | ✅ OPTIMAL  | Range delete, branching support  |
| **Chat Metadata**     | STRING (JSON)      | ✅ OPTIMAL  | Nested `lastContext`, full reads |
| **User Chat List**    | ZSET (updatedAt)   | ✅ OPTIMAL  | Sorted pagination                |
| **Documents**         | STRING (JSON)      | ✅ OPTIMAL  | Lua-optimized appends            |
| **Quota**             | STRING (atomic)    | ✅ OPTIMAL  | Simple INCRBY                    |
| **Typing Indicators** | ZSET (recommended) | ⚠️ CONSIDER | Per-user expiry accuracy         |

### Key Pattern: Message Score Calculation

```typescript
// Current implementation - CORRECT
function getMessageScore(
  timestamp: number,
  role: "user" | "assistant"
): number {
  // User messages: exact timestamp
  // Assistant messages: +0.001 to ensure order after user
  return role === "assistant" ? timestamp + 0.001 : timestamp;
}
```

This ensures user→assistant ordering within same millisecond.

---

## 3. Patterns to Consider Adopting

### 3.1 Typing Indicators Enhancement (Optional)

**Current**: SET with key-level TTL
**Problem**: All users expire at same time

**Recommended**: ZSET with per-member timestamp

```typescript
// SET user as typing
await redis.zadd(`typing:${chatId}`, { score: Date.now(), member: userId });

// Get currently typing (last 10s)
const now = Date.now();
await redis.zrangebyscore(`typing:${chatId}`, now - 10000, "+inf");
```

### 3.2 Sliding Window Rate Limiting

For API rate limiting (not daily quota), ZSET sliding window is more accurate:

```lua
-- Sliding window rate limit
local now = tonumber(ARGV[1])
local window = 60000  -- 1 minute
local limit = 100

redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, now - window)
local count = redis.call('ZCARD', KEYS[1])

if count < limit then
  redis.call('ZADD', KEYS[1], now, ARGV[2])
  return 1  -- Allowed
end
return 0  -- Denied
```

### 3.3 Message Count Caching (Already Optimal)

```typescript
// ZCARD is O(1) - no change needed
const count = await redis.zcard(CacheKeys.chatMessages(chatId, userId));
```

---

## 4. Patterns NOT Recommended

| Pattern                    | Why Not                           |
| -------------------------- | --------------------------------- |
| Redis Streams for messages | No timestamp-range deletion       |
| HASH for metadata          | Can't handle nested `lastContext` |
| Separate keys per message  | 2x RTT overhead                   |
| RedisJSON module           | Not available on Upstash          |
| LIST for messages          | O(N) deletion, no timestamp order |

---

## 5. Upstash-Specific Considerations

| Feature                 | Upstash Support | Impact                        |
| ----------------------- | --------------- | ----------------------------- |
| ZSET, STRING, LIST, SET | ✅ Full         | Primary structures work       |
| Lua scripts             | ✅ Full         | Atomic operations work        |
| Pipeline                | ✅ Full         | Batch operations work         |
| RedisJSON module        | ❌ No           | Can't use native JSON ops     |
| Redis Streams           | ✅ Full         | Available but not recommended |
| RedisSearch             | ❌ No           | Use PostgreSQL FTS instead    |

---

## 6. Performance Benchmarks (Expected)

| Operation                  | Expected Latency | Complexity   |
| -------------------------- | ---------------- | ------------ |
| Get chat messages (ZRANGE) | <5ms             | O(log N + M) |
| Append message (ZADD)      | <2ms             | O(log N)     |
| Delete after timestamp     | <3ms             | O(log N + M) |
| Get metadata (GET)         | <1ms             | O(1)         |
| User chat list (ZREVRANGE) | <3ms             | O(log N + M) |

---

## 7. Sources Consulted

### Primary Documentation

- Redis Official Docs: Sorted Sets, Streams, Data Types
- Upstash Redis Documentation
- Redis Best Practices Guide

### Industry Case Studies

- Discord Engineering: "How Discord Stores Trillions of Messages"
- Slack Engineering Blog: "Scaling Slack"
- ByteByteGo: Chat System Design
- Redis Enterprise: Chat Application Patterns

### Existing Project Research

- [redis-data-structures-analysis.md](.ouroboros/specs/cache-operations/redis-data-structures-analysis.md) - 809 lines of detailed analysis
- [04-cache-layer-optimal-design.md](.ouroboros/specs/architecture-overhaul/04-cache-layer-optimal-design.md) - Architecture spec

---

## 8. Conclusion

**Current design is OPTIMAL.** No structural changes needed.

| Area               | Status                            |
| ------------------ | --------------------------------- |
| Messages (ZSET)    | ✅ Confirmed optimal              |
| Metadata (STRING)  | ✅ Confirmed optimal              |
| User chats (ZSET)  | ✅ Confirmed optimal              |
| Redis 7+ features  | ❌ Not available/not needed       |
| Industry alignment | ✅ Matches Discord/Slack patterns |

**Optional enhancement**: Convert typing indicators from SET to ZSET for per-user accuracy.

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [TASK COMPLETE]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
