# Redis Data Structures Analysis

> **Decision**: Redis Data Structure Optimization  
> **Status**: PROPOSED  
> **Date**: 2024-12-21  
> **Author**: Ouroboros Architect

---

## 1. Context

The cache system requires optimal Redis data structures for:

- Chat messages (ordered, time-based operations)
- Chat metadata (key-value access)
- User's chat list (sorted pagination)
- Documents with versions (nested data)
- Rate limiting quota (atomic counters)
- Session storage (key-value access)
- Typing indicators (ephemeral presence)

This analysis evaluates current design choices and explores alternatives including Redis 7+ features.

---

## 2. Entity-by-Entity Analysis

### 2.1 Messages: ZSET (score = timestamp)

#### Current Design

```redis
Key: chat:{chatId}:{userId}:msgs
Type: ZSET
Score: timestamp (with role-based microsecond offset for ordering)
Member: JSON-encoded message
```

#### Performance Profile

| Operation              | Complexity   | Latency (typical) |
| ---------------------- | ------------ | ----------------- |
| Append message         | O(log N)     | <1ms              |
| Get all messages       | O(N)         | 2-10ms            |
| Get last N messages    | O(log N + M) | <1ms              |
| Delete after timestamp | O(log N + M) | <1ms              |
| Count messages         | O(1)         | <1ms              |

#### Alternative 1: Redis LIST

```redis
Key: chat:{chatId}:{userId}:msgs
Type: LIST
Operations: RPUSH (append), LRANGE (read)
```

| Pros                     | Cons                                            |
| ------------------------ | ----------------------------------------------- |
| O(1) append              | O(N) time-based deletion requires Lua filtering |
| Simple mental model      | No native timestamp ordering                    |
| Lower memory (no scores) | Index-based access, not timestamp-based         |

**Verdict**: ❌ Rejected - Deletion performance unacceptable for message regeneration

#### Alternative 2: Redis Streams

```redis
Key: chat:{chatId}:{userId}:stream
Type: STREAM
Operations: XADD, XRANGE, XTRIM
```

| Pros                             | Cons                                      |
| -------------------------------- | ----------------------------------------- |
| Auto-generated IDs with ordering | More complex API                          |
| Consumer groups for pub/sub      | Overkill for simple storage               |
| XTRIM for size limits            | Member format differs (field-value pairs) |
| Memory efficient for append-only | Harder to delete specific ranges          |

**Detailed Comparison**:

| Feature           | ZSET                          | Stream                     |
| ----------------- | ----------------------------- | -------------------------- |
| Append            | ZADD O(log N)                 | XADD O(1)                  |
| Range read        | ZRANGEBYSCORE O(log N + M)    | XRANGE O(log N + M)        |
| Range delete      | ZREMRANGEBYSCORE O(log N + M) | XTRIM (age-based only)     |
| Arbitrary delete  | ✅ ZREM by member             | ⚠️ No native support       |
| Message branching | ✅ Copy subset by score       | ❌ Must copy entire stream |
| Memory per entry  | ~90 bytes + data              | ~70 bytes + data           |

**Verdict**: ❌ Rejected for messages - XTRIM doesn't support timestamp-based deletion needed for branching/regeneration

#### Alternative 3: Separate Keys per Message

```redis
Keys: msg:{chatId}:{messageId}
Type: STRING
Index: ZSET chat:{chatId}:index with score=timestamp, member=messageId
```

| Pros                           | Cons                            |
| ------------------------------ | ------------------------------- |
| Smaller per-key reads          | 2x RTT (fetch index + messages) |
| Can update individual messages | More keys to manage             |
| Clearer key structure          | EXPIRE complexity               |

**Verdict**: ❌ Rejected - RTT overhead outweighs benefits for read-heavy workload

#### Branching (Fork) Analysis

**Current ZSET approach**:

```lua
-- Copy messages up to branch point
local messages = redis.call('ZRANGEBYSCORE', srcKey, '-inf', branchTimestamp)
for i, msg in ipairs(messages) do
  redis.call('ZADD', destKey, score, msg)
end
```

- ✅ Single Lua script, atomic
- ✅ O(log N + M) where M = messages to copy
- ✅ Natural timestamp filtering

**Stream approach would require**:

```lua
-- XRANGE doesn't support < comparison on ID timestamp
-- Would need client-side filtering or complex ID manipulation
```

- ❌ Stream IDs are `{timestamp}-{sequence}`, harder to split

#### Memory Comparison (per 1000 messages)

| Structure     | Memory Overhead  | Total (1KB msg avg) |
| ------------- | ---------------- | ------------------- |
| ZSET          | ~90 bytes/entry  | ~1.09 MB            |
| LIST          | ~48 bytes/entry  | ~1.05 MB            |
| Stream        | ~70 bytes/entry  | ~1.07 MB            |
| Separate keys | ~120 bytes/entry | ~1.12 MB            |

**Winner**: LIST has lowest overhead, but ZSET's operational efficiency justifies ~4% premium.

#### ✅ RECOMMENDATION: Keep ZSET

**Rationale**:

1. O(log N + M) range deletion is critical for regeneration
2. Branching works naturally with timestamp scores
3. Memory overhead is marginal (4-8%)
4. ZCARD gives O(1) count

---

### 2.2 Chat Metadata: STRING (JSON)

#### Current Design

```redis
Key: chat:{chatId}:{userId}:meta
Type: STRING
Value: JSON-encoded CachedChatMeta
```

#### Alternative: HASH

```redis
Key: chat:{chatId}:{userId}:meta
Type: HASH
Fields: id, userId, title, visibility, createdAt, updatedAt, version
```

| Aspect              | STRING (JSON)     | HASH                    |
| ------------------- | ----------------- | ----------------------- |
| Get all fields      | GET O(1)          | HGETALL O(N)            |
| Get single field    | GET + parse       | HGET O(1)               |
| Update single field | GET + parse + SET | HSET O(1)               |
| Atomic updates      | ❌ Need Lua       | ❌ Need Lua for complex |
| Memory (small)      | ~120 bytes        | ~160 bytes              |
| Memory (large)      | More efficient    | Less efficient          |
| Nested objects      | ✅ Native JSON    | ❌ Flatten required     |

**Field Analysis**:

```typescript
type CachedChatMeta = {
  id: string; // Rarely updated
  userId: string; // Never updated
  title: string; // Updated on rename
  visibility: string; // Rarely updated
  createdAt: string; // Never updated
  updatedAt: string; // Always updated
  lastContext: object; // Updated on each message (NESTED!)
  version: number; // Always updated
};
```

**Problem with HASH**: `lastContext` is a nested object (AppUsage). HASH can't store nested structures natively.

**Options**:

1. Flatten: `lastContext:model`, `lastContext:tokens` → Loses structure
2. JSON encode lastContext field → Partially defeats HASH benefits
3. Separate key for lastContext → Adds RTT

#### Lua Script Comparison

**Current (STRING)**:

```lua
local meta = redis.call('GET', KEYS[1])
local data = cjson.decode(meta)
data.title = ARGV[1]
data.updatedAt = ARGV[2]
redis.call('SET', KEYS[1], cjson.encode(data))
```

**With HASH** (for simple fields):

```lua
redis.call('HSET', KEYS[1], 'title', ARGV[1], 'updatedAt', ARGV[2])
```

**Winner for updates**: HASH (simpler, faster for flat updates)

**BUT**: lastContext is nested, requiring JSON anyway.

#### ✅ RECOMMENDATION: Keep STRING (JSON)

**Rationale**:

1. `lastContext` is nested object - HASH can't handle natively
2. Atomic updates require Lua regardless
3. Read pattern is always "get all" (never single field)
4. Memory difference is negligible at our scale
5. Simpler code with single pattern

**Consider HASH if**:

- Remove or flatten `lastContext`
- Frequently update single fields without needing others

---

### 2.3 User's Chats Index: ZSET (score = updatedAt)

#### Current Design

```redis
Key: user:{userId}:chats
Type: ZSET
Score: updatedAt (Unix timestamp)
Member: chatId
```

#### Performance

| Operation       | Complexity   | Use Case               |
| --------------- | ------------ | ---------------------- |
| Add chat        | O(log N)     | New chat created       |
| Get recent N    | O(log N + M) | Pagination (ZREVRANGE) |
| Update position | O(log N)     | Chat updated, re-sort  |
| Remove chat     | O(log N)     | Chat deleted           |
| Count chats     | O(1)         | Display count          |

#### Alternative: LIST

```redis
Key: user:{userId}:chats
Type: LIST
Operations: LPUSH (add), LRANGE (read)
```

| Pros              | Cons                              |
| ----------------- | --------------------------------- |
| O(1) prepend      | Can't re-sort on update           |
| Simple pagination | Requires LREM + LPUSH for reorder |

**Verdict**: ❌ Rejected - Chat updates need re-sorting

#### Alternative: Streams

Not applicable - need random access and reordering.

#### ✅ RECOMMENDATION: Keep ZSET

**Rationale**:

1. Natural sorting by updatedAt
2. Efficient pagination with ZREVRANGE
3. O(log N) re-sort on chat update
4. No better alternative exists

---

### 2.4 Documents: STRING (JSON with versions array)

#### Current Design

```redis
Key: document:{documentId}:{userId}
Type: STRING
Value: JSON { id, userId, chatId, versions: DocumentVersion[] }
```

#### Problem Analysis

**Version append pattern**:

```typescript
// Current: Read-modify-write
const doc = await redis.get(key);
doc.versions.push(newVersion);
await redis.set(key, doc);
```

**With 50 versions** (typical for long editing session):

- Read: Transfer ~100KB
- Modify: Parse + append
- Write: Transfer ~100KB back

**Total RTT data**: ~200KB per version append

#### Alternative 1: Separate Keys per Version

```redis
Keys:
  doc:{docId}:meta      → { id, userId, chatId }
  doc:{docId}:v:{n}     → DocumentVersion
  doc:{docId}:versions  → LIST of version numbers
```

| Pros                          | Cons                          |
| ----------------------------- | ----------------------------- |
| O(1) append new version       | 3+ RTT for full doc read      |
| Only fetch latest version     | Key management complexity     |
| Smaller individual operations | Atomic version pruning harder |

#### Alternative 2: ZSET for Versions

```redis
Keys:
  doc:{docId}:meta     → STRING { id, userId, chatId }
  doc:{docId}:versions → ZSET (score = timestamp, member = JSON version)
```

| Pros                        | Cons                   |
| --------------------------- | ---------------------- |
| O(log N) append             | 2 RTT for full doc     |
| Easy range deletion         | More complex structure |
| Efficient "last N versions" | Slightly more memory   |

#### Alternative 3: Lua Script Optimization (Keep STRING)

```lua
-- Append version without reading full doc
local doc = redis.call('GET', KEYS[1])
if not doc then
  -- Create new doc
  local newDoc = { id = ARGV[1], userId = ARGV[2], chatId = ARGV[3], versions = { cjson.decode(ARGV[4]) } }
  redis.call('SET', KEYS[1], cjson.encode(newDoc))
else
  local data = cjson.decode(doc)
  table.insert(data.versions, cjson.decode(ARGV[4]))
  redis.call('SET', KEYS[1], cjson.encode(data))
end
```

**Still transfers full doc in Lua memory**, but avoids client-side RTT.

#### Trade-off Matrix

| Approach       | Append RTT    | Read RTT | Memory | Complexity |
| -------------- | ------------- | -------- | ------ | ---------- |
| Current STRING | 1 (but large) | 1        | Low    | Low        |
| Separate keys  | 1 (small)     | 3        | Medium | High       |
| ZSET versions  | 1 (small)     | 2        | Medium | Medium     |
| Lua optimized  | 1 (small)     | 1        | Low    | Medium     |

#### ✅ RECOMMENDATION: Keep STRING with Lua Optimization

**Current implementation already uses Lua** (see `appendDocumentVersionToCache`).

**Rationale**:

1. Lua script already handles append without client RTT
2. Separate keys adds complexity with marginal benefit
3. Documents are typically <50 versions
4. Read pattern is "get all versions" for artifact panel

**Future optimization** (if versions exceed 100):

- Consider ZSET with version pruning
- Keep only last N versions in cache, older in DB

---

### 2.5 Rate Limit Quota: STRING (number)

#### Current Design

```redis
Key: quota:{userId}:{date}
Type: STRING
Value: Number (message count)
Operations: INCRBY, GET, SET
TTL: 24 hours (auto-expire at day end)
```

#### Alternative 1: HASH (multiple limits)

```redis
Key: quota:{userId}
Type: HASH
Fields: daily, hourly, minute
```

| Pros                     | Cons                            |
| ------------------------ | ------------------------------- |
| All limits in one key    | TTL applies to whole hash       |
| Atomic multi-limit check | Can't expire individual limits  |
| Fewer keys               | Complex Lua for varying windows |

**Problem**: Different limits need different TTLs:

- Daily: 24h TTL
- Hourly: 1h TTL
- Minute: 60s TTL

HASH can't have per-field TTL.

#### Alternative 2: Sliding Window with ZSET

```redis
Key: ratelimit:{userId}:{action}
Type: ZSET
Score: timestamp
Member: request ID or "1"
```

```lua
-- Sliding window rate limit
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])  -- e.g., 60000 for 1 minute
local limit = tonumber(ARGV[3])

-- Remove old entries
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, now - window)

-- Count current entries
local count = redis.call('ZCARD', KEYS[1])

if count < limit then
  redis.call('ZADD', KEYS[1], now, ARGV[4])  -- unique ID
  redis.call('EXPIRE', KEYS[1], math.ceil(window / 1000))
  return 1  -- Allowed
else
  return 0  -- Denied
end
```

| Pros                      | Cons                     |
| ------------------------- | ------------------------ |
| True sliding window       | More complex             |
| Precise rate limiting     | Higher memory per window |
| Multiple windows possible | More Lua code            |

#### Trade-off Analysis

| Approach         | Precision     | Memory   | Complexity | Use Case              |
| ---------------- | ------------- | -------- | ---------- | --------------------- |
| STRING (current) | Fixed window  | Very low | Simple     | Daily quotas          |
| HASH             | Fixed windows | Low      | Medium     | Multi-limit, same TTL |
| ZSET sliding     | True sliding  | Medium   | Higher     | Precise rate limiting |

#### ✅ RECOMMENDATION: Keep STRING for Quotas

**For daily message quota**: STRING is perfect.

- Simple INCRBY
- Natural 24h TTL
- O(1) operations

**For API rate limiting** (requests/minute): Consider ZSET sliding window.

- More precise
- Handles bursts better
- Already used in middleware

---

### 2.6 Session: STRING (JSON)

#### Current Design

```redis
Key: session:{sessionId}
Type: STRING
Value: JSON session data
TTL: 30 days (or configured)
```

#### Alternative: HASH

Same analysis as Chat Metadata - sessions often have nested data.

#### ✅ RECOMMENDATION: Keep STRING

**Rationale**:

1. Session data is often nested
2. Always read/write whole session
3. Simple expiration with TTL
4. No partial updates needed

---

### 2.7 Typing Indicators: SET (TTL 10s)

#### Current Design

```redis
Key: typing:{chatId}
Type: SET
Members: userId values
TTL: 10s (key-level)
```

**Problem**: TTL is on the key, not per member. If user A types, then user B types 8s later, key expires after 10s from last SADD, meaning user A shows as "typing" for 18s.

#### Alternative: ZSET with per-member expiry

```redis
Key: typing:{chatId}
Type: ZSET
Score: timestamp when started typing
Member: userId
```

```lua
-- Check typing users (last 10s only)
local now = tonumber(ARGV[1])
local window = 10000  -- 10 seconds

-- Remove expired
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, now - window)

-- Return current typers
return redis.call('ZRANGE', KEYS[1], 0, -1)
```

| Pros                | Cons                   |
| ------------------- | ---------------------- |
| Per-user expiry     | Slightly more complex  |
| Accurate indicators | Need periodic cleanup  |
| No false positives  | Marginally more memory |

#### ⚠️ RECOMMENDATION: Consider ZSET for Accuracy

**If typing indicators are user-visible** (showing "Alice is typing..."):

- ZSET provides accurate per-user expiry
- Worth the small complexity increase

**If just presence detection** (someone is typing):

- SET is fine, occasional false positives acceptable

---

## 3. Redis 7+ Features Evaluation

### 3.1 Redis Streams

**Evaluated for**: Messages

**Conclusion**: Not recommended

- XTRIM doesn't support timestamp-based pruning
- Branching requires complex ID manipulation
- Overkill for simple ordered storage

### 3.2 RedisJSON (Stack Module)

**Evaluated for**: Metadata, Documents, Sessions

**What it offers**:

```redis
JSON.SET doc:123 $ '{"id":"123","versions":[...]}'
JSON.ARRAPPEND doc:123 $.versions '{"title":"v2",...}'
JSON.GET doc:123 $.versions[-1]
```

**Pros**:

- Native JSON operations
- Partial updates without full read
- JSONPath queries

**Cons**:

- Requires Redis Stack (not Upstash vanilla)
- Additional module dependency
- Upstash has limited module support

**Conclusion**: ❌ Not available on Upstash

- Would be ideal for documents
- Check if Upstash Redis supports modules

### 3.3 Redis TimeSeries

**Evaluated for**: Metrics, analytics

**What it offers**:

- Time-series data storage
- Aggregation (avg, min, max)
- Downsampling

**Use case fit**:

- ✅ Token usage over time
- ✅ Message count trends
- ❌ Chat messages (not metrics)

**Conclusion**: ❌ Out of scope for cache layer

- Consider for separate analytics module
- Not available on Upstash

### 3.4 RedisSearch

**Evaluated for**: Chat search, message search

**What it offers**:

- Full-text search indexing
- Secondary indexes

**Conclusion**: ❌ Not applicable

- Search should use PostgreSQL full-text or dedicated search (Algolia/Meilisearch)
- Not available on Upstash

---

## 4. Recommended Changes Summary

### 4.1 Changes

| Entity            | Current | Recommendation  | Change?                          |
| ----------------- | ------- | --------------- | -------------------------------- |
| Messages          | ZSET    | ZSET            | ❌ No change                     |
| Chat Metadata     | STRING  | STRING          | ❌ No change                     |
| User's Chats      | ZSET    | ZSET            | ❌ No change                     |
| Documents         | STRING  | STRING + Lua    | ❌ No change (already optimized) |
| Rate Limit Quota  | STRING  | STRING          | ❌ No change                     |
| Session           | STRING  | STRING          | ❌ No change                     |
| Typing Indicators | SET     | ZSET (optional) | ⚠️ Consider if user-visible      |

### 4.2 Optimization Opportunities

1. **Typing Indicators**: Change from SET to ZSET for accurate per-user expiry
2. **Document Versions**: Consider ZSET if documents exceed 100 versions
3. **Sliding Window Rate Limit**: Use ZSET for API rate limiting (not quota)

---

## 5. Trade-off Matrix

### 5.1 Messages Structure Comparison

| Factor             | Weight | ZSET       | LIST       | Stream     | Separate Keys |
| ------------------ | ------ | ---------- | ---------- | ---------- | ------------- |
| Range delete       | 25%    | ⭐⭐⭐⭐⭐ | ⭐⭐       | ⭐⭐⭐     | ⭐⭐⭐⭐      |
| Append speed       | 15%    | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐        |
| Read speed         | 20%    | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   | ⭐⭐          |
| Branching          | 20%    | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     | ⭐⭐       | ⭐⭐⭐⭐      |
| Memory             | 10%    | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   | ⭐⭐          |
| Complexity         | 10%    | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     | ⭐⭐          |
| **Weighted Total** | 100%   | **4.2**    | 3.7        | 3.4        | 3.1           |

### 5.2 Metadata Structure Comparison

| Factor             | Weight | STRING (JSON) | HASH       |
| ------------------ | ------ | ------------- | ---------- |
| Nested data        | 30%    | ⭐⭐⭐⭐⭐    | ⭐⭐       |
| Partial updates    | 20%    | ⭐⭐⭐        | ⭐⭐⭐⭐⭐ |
| Read full object   | 25%    | ⭐⭐⭐⭐⭐    | ⭐⭐⭐⭐   |
| Memory             | 15%    | ⭐⭐⭐⭐      | ⭐⭐⭐     |
| Complexity         | 10%    | ⭐⭐⭐⭐⭐    | ⭐⭐⭐⭐   |
| **Weighted Total** | 100%   | **4.3**       | 3.4        |

---

## 6. Final Recommendation

### 6.1 Decision

**Maintain current data structure design** with one optional enhancement:

| Entity        | Structure              | Status             |
| ------------- | ---------------------- | ------------------ |
| Messages      | ZSET (timestamp score) | ✅ OPTIMAL         |
| Chat Metadata | STRING (JSON)          | ✅ OPTIMAL         |
| User's Chats  | ZSET (updatedAt score) | ✅ OPTIMAL         |
| Documents     | STRING (JSON + Lua)    | ✅ OPTIMAL         |
| Quota         | STRING (atomic)        | ✅ OPTIMAL         |
| Session       | STRING (JSON)          | ✅ OPTIMAL         |
| Typing        | SET → ZSET             | ⚠️ CONSIDER CHANGE |

### 6.2 Rationale

1. **ZSET for messages** is the optimal choice:

   - Range deletion is O(log N + M) vs O(N) for LIST
   - Branching works naturally with timestamp scores
   - Memory overhead (4%) is acceptable

2. **STRING for metadata** is optimal:

   - Nested `lastContext` object requires JSON
   - Read pattern is always "get all"
   - Lua scripts handle atomic updates

3. **No Redis 7+ features needed**:
   - Streams don't support our deletion pattern
   - RedisJSON not available on Upstash
   - Current structures are well-suited

### 6.3 Implementation Notes

**No code changes required** for main structures.

**Optional enhancement** (typing indicators):

```typescript
// If switching to ZSET for typing indicators
async function setUserTyping(chatId: string, userId: string): Promise<void> {
  const redis = getRedisClient();
  const key = `typing:${chatId}`;
  const now = Date.now();

  // Atomic: remove old + add new
  await redis
    .multi()
    .zremrangebyscore(key, 0, now - 10000)
    .zadd(key, { score: now, member: userId })
    .expire(key, 15) // Key-level expiry as backup
    .exec();
}

async function getTypingUsers(chatId: string): Promise<string[]> {
  const redis = getRedisClient();
  const key = `typing:${chatId}`;
  const now = Date.now();

  // Get users typing in last 10s
  return redis.zrangebyscore(key, now - 10000, "+inf");
}
```

---

## 7. Consequences

### Positive

- **POS-001**: Validation that current design is optimal - no wasted refactoring
- **POS-002**: Clear documentation of trade-offs for future decisions
- **POS-003**: Identified typing indicator improvement opportunity

### Negative

- **NEG-001**: No performance gains from changes (already optimal)
- **NEG-002**: Redis 7+ features unavailable on Upstash

### Alternatives Rejected

| Alternative                | Reason for Rejection                           |
| -------------------------- | ---------------------------------------------- |
| Redis Streams for messages | XTRIM doesn't support timestamp-based deletion |
| HASH for metadata          | Can't handle nested `lastContext` object       |
| Separate keys per message  | 2x RTT overhead unacceptable                   |
| RedisJSON module           | Not available on Upstash                       |

---

## 8. References

- [04-cache-layer-optimal-design.md](../architecture-overhaul/04-cache-layer-optimal-design.md)
- [Redis ZSET Documentation](https://redis.io/docs/data-types/sorted-sets/)
- [Redis Streams vs ZSET](https://redis.io/docs/data-types/streams/)
- [Upstash Redis Features](https://upstash.com/docs/redis/features)

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-21  
**Status**: PROPOSED → Pending review

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [TASK COMPLETE]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
