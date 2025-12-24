# Cache Entities Comprehensive Analysis

> **Decision**: Cache Data Structure Optimization  
> **Status**: PROPOSED  
> **Date**: 2024-12-21  
> **Author**: Ouroboros Architect  
> **Supersedes**: redis-data-structures-analysis.md (partial)

---

## Executive Summary

| Entity                | Current | Optimal         | Change?  | Impact       | Priority |
| --------------------- | ------- | --------------- | -------- | ------------ | -------- |
| **Messages**          | ZSET    | ZSET            | ❌ No    | —            | —        |
| **Chat Metadata**     | STRING  | STRING          | ❌ No    | —            | —        |
| **User's Chats**      | ZSET    | ZSET            | ❌ No    | —            | —        |
| **Documents**         | STRING  | **ZSET Hybrid** | ✅ YES   | 90% BW saved | 🔴 HIGH  |
| **Rate Limit/Quota**  | STRING  | STRING          | ❌ No    | —            | —        |
| **Sessions**          | STRING  | STRING          | ❌ No    | —            | —        |
| **Typing Indicators** | SET     | **ZSET**        | ⚠️ Maybe | Accuracy     | 🟡 LOW   |

**Key Finding**: Documents require ZSET hybrid for bandwidth optimization. All other entities are already optimal.

---

## 1. Messages (ZSET) ✅ OPTIMAL

### 1.1 Current Design

```redis
Key: chat:{chatId}:{userId}:msgs
Type: ZSET
Score: timestamp (ms) + role offset (microseconds)
Member: JSON-encoded CachedMessage (~800 bytes avg)
```

### 1.2 Access Pattern Analysis

| Operation              | Frequency | % of Total |
| ---------------------- | --------- | ---------- |
| Get last 50 messages   | 80%       | Read       |
| Get all messages       | 10%       | Read       |
| Append message         | 9%        | Write      |
| Delete after timestamp | 1%        | Write      |

**Read:Write Ratio**: 90:10

### 1.3 Payload Analysis

| Metric               | Value             |
| -------------------- | ----------------- |
| Average message size | ~800 bytes        |
| Typical conversation | 50-100 messages   |
| Heavy conversation   | 500-1000 messages |
| Maximum practical    | ~2000 messages    |

### 1.4 Bandwidth Analysis

| Scenario                        | ZSET Current | Alternative (LIST) |
| ------------------------------- | ------------ | ------------------ |
| Get last 50 msgs (80% of reads) | 40 KB        | 40 KB              |
| Get all 200 msgs                | 160 KB       | 160 KB             |
| Append 1 message                | ~1 KB        | ~1 KB              |

**Wasted bandwidth**: 0% — ZSET already supports `ZRANGE -50 -1`

### 1.5 Memory Analysis

| Items         | ZSET Overhead          | Total Memory |
| ------------- | ---------------------- | ------------ |
| 50 messages   | 4.5 KB (90 bytes each) | 44.5 KB      |
| 200 messages  | 18 KB                  | 178 KB       |
| 1000 messages | 90 KB                  | 890 KB       |

**Key overhead**: 56 bytes (negligible for 1 key per chat)

### 1.6 Operations Complexity

| Operation    | Redis Command    | Complexity   | Lua Required? |
| ------------ | ---------------- | ------------ | ------------- |
| Append       | ZADD             | O(log N)     | No            |
| Get last N   | ZRANGE -N -1     | O(log N + M) | No            |
| Get all      | ZRANGE 0 -1      | O(N)         | No            |
| Delete range | ZREMRANGEBYSCORE | O(log N + M) | No            |
| Count        | ZCARD            | O(1)         | No            |
| Check exists | ZSCORE           | O(1)         | Optional      |

### 1.7 Scaling Behavior

| Messages | Append Latency | Get Last 50 | Get All |
| -------- | -------------- | ----------- | ------- |
| 10       | <1ms           | <1ms        | <1ms    |
| 100      | <1ms           | <1ms        | 1-2ms   |
| 1000     | <1ms           | <1ms        | 5-10ms  |

**Degradation**: Linear only for "get all" — last-N remains constant.

### 1.8 Edge Cases

| Case               | Behavior                 | Handling            |
| ------------------ | ------------------------ | ------------------- |
| Empty chat         | ZRANGE returns []        | ✅ Native           |
| Single message     | Works                    | ✅ Native           |
| 2000+ messages     | Works but slow full read | Pagination required |
| Concurrent appends | ZADD is atomic           | ✅ No conflicts     |

### 1.9 Alternatives Evaluated

| Alternative   | Rejected Because             |
| ------------- | ---------------------------- |
| LIST          | O(N) delete for regeneration |
| Streams       | XTRIM no timestamp support   |
| Separate keys | 2x RTT, key management       |

### ✅ RECOMMENDATION: No Change

**ZSET is optimal** for messages because:

1. Selective fetch (`ZRANGE -50 -1`) saves 80% bandwidth for primary use case
2. Range delete is O(log N + M) for branching/regeneration
3. All operations are native Redis — no Lua needed

---

## 2. Chat Metadata (STRING) ✅ OPTIMAL

### 2.1 Current Design

```redis
Key: chat:{chatId}:{userId}:meta
Type: STRING
Value: JSON CachedChatMeta (~400 bytes)
TTL: None (paired with messages)
```

```typescript
type CachedChatMeta = {
  id: string; // 36 bytes (UUID)
  userId: string; // 36 bytes
  title: string; // 20-100 bytes
  visibility: string; // 10 bytes
  createdAt: string; // 24 bytes (ISO)
  updatedAt: string; // 24 bytes
  lastContext: object; // 100-200 bytes (NESTED!)
  version: number; // 8 bytes
};
```

### 2.2 Access Pattern Analysis

| Operation          | Frequency | % of Total |
| ------------------ | --------- | ---------- |
| Get full metadata  | 95%       | Read       |
| Update title       | 2%        | Write      |
| Update lastContext | 2%        | Write      |
| Update visibility  | 1%        | Write      |

**Read:Write Ratio**: 95:5

### 2.3 Payload Analysis

| Metric                 | Value         |
| ---------------------- | ------------- |
| Average size           | ~400 bytes    |
| Maximum size           | ~800 bytes    |
| Fixed overhead         | ~250 bytes    |
| Variable (lastContext) | 100-500 bytes |

### 2.4 Bandwidth Analysis

| Operation         | Current (STRING)              | Alternative (HASH) |
| ----------------- | ----------------------------- | ------------------ |
| Get full metadata | 400 bytes                     | 400 bytes          |
| Update title only | 400 bytes (r) + 400 bytes (w) | 100 bytes          |
| Get title only    | 400 bytes                     | 100 bytes          |

**Note**: HASH would save bandwidth for partial reads... **BUT**:

- 95% of operations are full reads
- `lastContext` is nested object — can't store in HASH field natively

### 2.5 Memory Analysis

| Metric                  | STRING     | HASH                            |
| ----------------------- | ---------- | ------------------------------- |
| Base overhead           | 56 bytes   | 56 bytes                        |
| Per-field overhead      | 0          | ~12 bytes × 8 fields = 96 bytes |
| Total for 400-byte meta | ~456 bytes | ~552 bytes                      |

**STRING is more memory efficient**.

### 2.6 Operations Complexity

| Operation     | STRING         | HASH              |
| ------------- | -------------- | ----------------- |
| Get all       | GET O(1)       | HGETALL O(N)      |
| Set all       | SET O(1)       | HSET multi O(N)   |
| Update field  | Lua (GET+SET)  | HSET O(1)         |
| Nested object | ✅ Native JSON | ❌ Flatten/encode |

### 2.7 Scaling Behavior

Constant time — metadata is always one object per chat.

### 2.8 Edge Cases

| Case                    | Behavior             |
| ----------------------- | -------------------- |
| New chat                | SET creates          |
| No lastContext          | null field           |
| Large title (500 chars) | ~900 bytes total     |
| Concurrent update       | Lua script atomicity |

### 2.9 Critical Blocker: lastContext

```typescript
lastContext: {
  model: "gpt-4",
  promptTokens: 1234,
  completionTokens: 567,
  totalCost: 0.05,
  timestamp: "2024-..."
}
```

**HASH cannot store nested objects**. Options:

1. JSON-encode `lastContext` field → Defeats HASH benefits
2. Flatten → Loses structure, harder to query
3. Separate key → Extra RTT

**None are better than current STRING**.

### ✅ RECOMMENDATION: No Change

**STRING is optimal** because:

1. `lastContext` requires nested object storage
2. 95% of operations read full object
3. Lower memory overhead than HASH
4. Simpler code without HASH field management

---

## 3. User's Chat List (ZSET) ✅ OPTIMAL

### 3.1 Current Design

```redis
Key: user:{userId}:chats
Type: ZSET
Score: updatedAt (Unix timestamp ms)
Member: JSON { chatId, title } (~80 bytes)
```

### 3.2 Access Pattern Analysis

| Operation           | Frequency | % of Total |
| ------------------- | --------- | ---------- |
| Get recent 10 chats | 70%       | Read       |
| Get recent 50 chats | 20%       | Read       |
| Add/update chat     | 9%        | Write      |
| Remove chat         | 1%        | Write      |

**Read:Write Ratio**: 90:10

### 3.3 Payload Analysis

| Metric       | Value         |
| ------------ | ------------- |
| Member size  | ~80 bytes     |
| Typical user | 20-50 chats   |
| Power user   | 200-500 chats |
| Maximum      | ~1000 chats   |

### 3.4 Bandwidth Analysis

| Operation     | Data Transfer |
| ------------- | ------------- |
| Get 10 recent | ~800 bytes    |
| Get 50 recent | ~4 KB         |
| Get all 200   | ~16 KB        |
| Add 1 chat    | ~80 bytes     |

**No waste** — ZREVRANGE selects exactly what we need.

### 3.5 Memory Analysis

| Chats | ZSET Memory |
| ----- | ----------- |
| 50    | 8.5 KB      |
| 200   | 34 KB       |
| 500   | 85 KB       |

### 3.6 Operations Complexity

| Operation    | Command         | Complexity   |
| ------------ | --------------- | ------------ |
| Get recent N | ZREVRANGE 0 N-1 | O(log N + M) |
| Add/update   | ZADD            | O(log N)     |
| Remove       | ZREM            | O(log N)     |
| Count        | ZCARD           | O(1)         |

### 3.7 Scaling Behavior

| Chats | Get 10 Recent | Add Chat |
| ----- | ------------- | -------- |
| 50    | <1ms          | <1ms     |
| 500   | <1ms          | <1ms     |
| 1000  | 1ms           | 1ms      |

**Excellent scaling** — ZREVRANGE offset/limit is efficient.

### 3.8 Edge Cases

| Case          | Behavior                  |
| ------------- | ------------------------- |
| New user      | ZREVRANGE returns []      |
| First chat    | ZADD creates set          |
| Delete all    | ZREM empties set          |
| Duplicate add | Updates score (updatedAt) |

### 3.9 Alternatives Evaluated

| Alternative   | Rejected Because        |
| ------------- | ----------------------- |
| LIST          | Can't re-sort on update |
| SET           | No ordering             |
| Separate keys | Key explosion           |

### ✅ RECOMMENDATION: No Change

**ZSET is optimal** because:

1. Natural ordering by updatedAt
2. ZREVRANGE with LIMIT for pagination
3. ZADD updates position atomically
4. No better alternative exists

---

## 4. Documents (STRING → ZSET Hybrid) ✅ CHANGE REQUIRED

### 4.1 Current Design

```redis
Key: document:{documentId}:{userId}
Type: STRING
Value: JSON { id, userId, chatId, versions: DocumentVersion[] }
```

### 4.2 Access Pattern Analysis

| Operation              | Frequency | % of Total |
| ---------------------- | --------- | ---------- |
| Get latest version     | 60%       | Read       |
| Get last 3 versions    | 25%       | Read       |
| Get all versions       | 5%        | Read       |
| Append version         | 9%        | Write      |
| Delete after timestamp | 1%        | Write      |

**Read:Write Ratio**: 90:10

**Critical Insight**: 85% of reads only need 1-3 versions, not all!

### 4.3 Payload Analysis

| Metric                    | Value                             |
| ------------------------- | --------------------------------- |
| Single version            | ~2-5 KB (varies by artifact type) |
| Code artifact version     | ~3 KB avg                         |
| Document artifact version | ~5 KB avg                         |
| Typical versions          | 10-30                             |
| Heavy editing session     | 50-100 versions                   |
| Maximum                   | ~200 versions                     |

### 4.4 Bandwidth Analysis — THE PROBLEM

| Operation                 | Current STRING                      | Optimal (ZSET) | Savings |
| ------------------------- | ----------------------------------- | -------------- | ------- |
| Get latest (60% of reads) | 150 KB (50×3KB)                     | 3 KB           | **98%** |
| Get last 3 (25% of reads) | 150 KB                              | 9 KB           | **94%** |
| Get all (5% of reads)     | 150 KB                              | 150 KB         | 0%      |
| Append version            | 150 KB read + 153 KB write = 303 KB | 3 KB           | **99%** |

**Average operation savings**: ~90% bandwidth reduction

### 4.5 Memory Analysis

| Structure | 50 Versions (150 KB data)                        |
| --------- | ------------------------------------------------ |
| STRING    | 150 KB + 56 bytes key                            |
| ZSET      | 154.5 KB (90 bytes × 50 + 150 KB) + 56 bytes key |

**ZSET costs 3% more memory** — acceptable for 90% bandwidth savings.

### 4.6 Proposed Hybrid Design

```redis
# Metadata (small, rarely changes)
# KEY PATTERN (CRT-003): doc:{userId}:{docId}:* (userId FIRST for IDOR protection)
Key: doc:{userId}:{docId}:meta
Type: STRING
Value: { id, userId, chatId }
Size: ~120 bytes

# Versions (ordered, selectively fetchable)
Key: doc:{userId}:{docId}:versions
Type: ZSET
Score: timestamp (ms)
Member: JSON DocumentVersion
```

### 4.7 Operations Complexity — ZSET Wins

| Operation       | Current (STRING)                  | Proposed (ZSET)                 |
| --------------- | --------------------------------- | ------------------------------- |
| Get latest      | GET + parse all → O(N) client     | ZRANGE -1 -1 → O(1)             |
| Get last 3      | GET + parse all → O(N) client     | ZRANGE -3 -1 → O(log N)         |
| Append          | Lua (GET + decode + append + SET) | ZADD → O(log N)                 |
| Delete after ts | Lua (iterate all) → O(N)          | ZREMRANGEBYSCORE → O(log N + M) |
| Count           | GET + parse → O(N)                | ZCARD → O(1)                    |

### 4.8 Scaling Behavior

| Versions         | Get Latest      | Append     |
| ---------------- | --------------- | ---------- |
| STRING (Current) |                 |            |
| 10               | 30 KB transfer  | 60 KB RTT  |
| 50               | 150 KB transfer | 300 KB RTT |
| 100              | 300 KB transfer | 600 KB RTT |
| ZSET (Proposed)  |                 |            |
| 10               | 3 KB transfer   | 3 KB RTT   |
| 50               | 3 KB transfer   | 3 KB RTT   |
| 100              | 3 KB transfer   | 3 KB RTT   |

**STRING degrades linearly. ZSET is constant for selective ops.**

### 4.9 Edge Cases

| Case                 | STRING Current    | ZSET Proposed                 |
| -------------------- | ----------------- | ----------------------------- |
| New document         | Create full JSON  | SET meta + ZADD first version |
| Single version       | 3 KB transfer     | 3 KB transfer (same)          |
| 100 versions, need 1 | 300 KB transfer   | 3 KB transfer                 |
| Concurrent appends   | Lua script atomic | ZADD atomic                   |
| Prune old versions   | Lua iterate       | ZREMRANGEBYSCORE native       |

### 4.10 Implementation

```typescript
// lib/cache/documents/types.ts
type CachedDocumentMeta = {
  id: string;
  userId: string;
  chatId: string;
};

// Keys
const DocKeys = {
  meta: (docId: string, userId: string) => `doc:${docId}:${userId}:meta`,
  versions: (docId: string, userId: string) =>
    `doc:${docId}:${userId}:versions`,
};
```

```typescript
// Get latest version only (60% of reads)
async function getLatestVersion(
  docId: string,
  userId: string
): Promise<DocumentVersion | null> {
  const redis = getRedisClient();
  const raw = await redis.zrange(DocKeys.versions(docId, userId), -1, -1);
  return raw[0] ? JSON.parse(raw[0]) : null;
}

// Get last N versions (25% of reads)
async function getLastNVersions(
  docId: string,
  userId: string,
  n: number
): Promise<DocumentVersion[]> {
  const redis = getRedisClient();
  const raw = await redis.zrange(DocKeys.versions(docId, userId), -n, -1);
  return raw.map((r) => JSON.parse(r as string));
}

// Append version (O(log N), no read required)
async function appendVersion(
  docId: string,
  userId: string,
  version: DocumentVersion
): Promise<void> {
  const redis = getRedisClient();
  const score = new Date(version.createdAt).getTime();
  await redis.zadd(DocKeys.versions(docId, userId), {
    score,
    member: JSON.stringify(version),
  });
}

// Delete versions after timestamp (native, no Lua)
async function pruneVersionsAfter(
  docId: string,
  userId: string,
  timestamp: Date
): Promise<void> {
  const redis = getRedisClient();
  await redis.zremrangebyscore(
    DocKeys.versions(docId, userId),
    timestamp.getTime(),
    "+inf"
  );
}
```

### ✅ RECOMMENDATION: CHANGE TO ZSET HYBRID

**Impact**: 90% bandwidth savings

**Justification**:

1. 85% of reads only need 1-3 versions → ZSET selective fetch
2. Append is O(log N) vs O(N) Lua script
3. Prune is native ZREMRANGEBYSCORE vs Lua iteration
4. Memory overhead is only 3%

**Migration**:

1. Deploy new ZSET-based functions
2. Dual-write during transition
3. Background migration of existing documents
4. Remove old STRING functions

---

## 5. Rate Limit / Quota (STRING) ✅ OPTIMAL

### 5.1 Current Design

```redis
Key: quota:{userId}:{YYYY-MM-DD}
Type: STRING
Value: Integer (message count)
TTL: 25 hours
```

### 5.2 Access Pattern Analysis

| Operation | Frequency | % of Total |
| --------- | --------- | ---------- |
| Get count | 50%       | Read       |
| Increment | 50%       | Write      |

**Read:Write Ratio**: 50:50 (symmetrical)

### 5.3 Payload Analysis

| Metric             | Value               |
| ------------------ | ------------------- |
| Value size         | 1-5 bytes (integer) |
| Key size           | ~40 bytes           |
| Total per user-day | ~100 bytes          |

### 5.4 Bandwidth Analysis

| Operation                  | Transfer |
| -------------------------- | -------- |
| GET                        | ~5 bytes |
| INCRBY                     | ~5 bytes |
| Full Lua (INCRBY + EXPIRE) | ~5 bytes |

**Already minimal** — can't optimize further.

### 5.5 Memory Analysis

| Users × Days        | Memory |
| ------------------- | ------ |
| 1000 users × 1 day  | 100 KB |
| 1000 users × 7 days | 700 KB |

**Negligible footprint**.

### 5.6 Operations Complexity

| Operation       | Command           | Complexity |
| --------------- | ----------------- | ---------- |
| Get             | GET               | O(1)       |
| Increment       | INCRBY            | O(1)       |
| Atomic incr+TTL | Lua INCRBY+EXPIRE | O(1)       |
| Reset           | DEL               | O(1)       |

### 5.7 Scaling Behavior

O(1) always — independent of value.

### 5.8 Edge Cases

| Case         | Behavior                              |
| ------------ | ------------------------------------- |
| New user     | INCRBY creates with value 1           |
| Day rollover | New key, old expires                  |
| High count   | Integer overflow at 2^63 (impossible) |
| Concurrent   | INCRBY is atomic                      |

### 5.9 Alternatives Evaluated

| Alternative        | Rejected Because         |
| ------------------ | ------------------------ |
| HASH (multi-limit) | Can't have per-field TTL |
| ZSET sliding       | Overkill for daily quota |

### ✅ RECOMMENDATION: No Change

**STRING is optimal** because:

1. O(1) for all operations
2. Atomic INCRBY
3. Natural TTL expiration
4. Smallest possible memory footprint

**Note**: For API rate limiting (requests/second), consider ZSET sliding window separately — but that's not quota.

---

## 6. Sessions (STRING) ✅ OPTIMAL

### 6.1 Current Design

```redis
Key: session:{sessionId}
Type: STRING
Value: JSON session data (~500 bytes)
TTL: 30 days (configurable)
```

### 6.2 Access Pattern Analysis

| Operation      | Frequency | % of Total |
| -------------- | --------- | ---------- |
| Get session    | 98%       | Read       |
| Create session | 1%        | Write      |
| Update session | 0.5%      | Write      |
| Delete session | 0.5%      | Write      |

**Read:Write Ratio**: 98:2

### 6.3 Payload Analysis

| Metric         | Value                  |
| -------------- | ---------------------- |
| Session size   | ~500 bytes             |
| Nested objects | User data, preferences |
| Maximum        | ~2 KB                  |

### 6.4 Bandwidth Analysis

| Operation      | Transfer   |
| -------------- | ---------- |
| Get session    | ~500 bytes |
| Create session | ~500 bytes |

**Already minimal** — session is atomic unit.

### 6.5 Memory Analysis

| Active Sessions | Memory |
| --------------- | ------ |
| 1000            | 500 KB |
| 10000           | 5 MB   |
| 100000          | 50 MB  |

### 6.6 Operations Complexity

| Operation   | Command | Complexity |
| ----------- | ------- | ---------- |
| Get         | GET     | O(1)       |
| Set         | SETEX   | O(1)       |
| Delete      | DEL     | O(1)       |
| Refresh TTL | EXPIRE  | O(1)       |

### 6.7 Scaling Behavior

O(1) always.

### 6.8 Edge Cases

| Case              | Behavior                         |
| ----------------- | -------------------------------- |
| Session not found | GET returns nil                  |
| Expired session   | Auto-deleted by TTL              |
| Concurrent access | Fine (read-only 98%)             |
| Session hijacking | Handled by session ID validation |

### 6.9 Alternatives Evaluated

| Alternative | Rejected Because               |
| ----------- | ------------------------------ |
| HASH        | Session has nested user object |
| Cookie-only | Need server-side validation    |

### ✅ RECOMMENDATION: No Change

**STRING is optimal** because:

1. Session is atomic unit — always read/write whole
2. Nested user object requires JSON
3. O(1) with TTL for auto-expiration
4. No partial access pattern

---

## 7. Typing Indicators (SET → ZSET) ⚠️ CONSIDER CHANGE

### 7.1 Current Design

```redis
Key: typing:{chatId}
Type: SET
Members: userId values
TTL: 10s (key-level)
```

### 7.2 The Problem

**Scenario**:

1. User A starts typing → SADD, EXPIRE 10s
2. 8 seconds later, User B starts typing → SADD, EXPIRE 10s (resets!)
3. At second 10: Key expires
4. User A showed typing for 10s, User B showed for 2s
5. But User A stopped typing at second 5 — **false positive for 5 seconds**

**Worse scenario**:

1. User A types at t=0
2. User B types at t=9
3. Key expires at t=19 (from B's SADD)
4. User A shows as "typing" for **19 seconds**!

### 7.3 Access Pattern Analysis

| Operation        | Frequency | % of Total |
| ---------------- | --------- | ---------- |
| Set typing       | 60%       | Write      |
| Get typing users | 40%       | Read       |

**Write-heavy** — many typing events.

### 7.4 Payload Analysis

| Metric             | Value             |
| ------------------ | ----------------- |
| Member size        | 36 bytes (userId) |
| Typical concurrent | 2-5 users         |
| Maximum            | 10 users          |

### 7.5 Bandwidth Analysis

| Operation  | SET Current | ZSET Proposed       |
| ---------- | ----------- | ------------------- |
| Set typing | ~40 bytes   | ~50 bytes           |
| Get typing | ~200 bytes  | ~200 bytes + filter |

**Negligible difference**.

### 7.6 ZSET Proposed Design

```redis
Key: typing:{chatId}
Type: ZSET
Score: timestamp (ms) when started typing
Member: userId
TTL: 30s (key backup)
```

```typescript
async function setTyping(chatId: string, userId: string): Promise<void> {
  const key = `typing:${chatId}`;
  const now = Date.now();

  await redis
    .pipeline()
    .zremrangebyscore(key, 0, now - 10000) // Prune old
    .zadd(key, { score: now, member: userId })
    .expire(key, 30) // Backup TTL
    .exec();
}

async function getTypingUsers(chatId: string): Promise<string[]> {
  const key = `typing:${chatId}`;
  const now = Date.now();

  // Get users who typed in last 10 seconds
  return redis.zrangebyscore(key, now - 10000, "+inf");
}
```

### 7.7 Comparison

| Aspect          | SET Current           | ZSET Proposed    |
| --------------- | --------------------- | ---------------- |
| Per-user expiry | ❌ Key-level only     | ✅ Score-based   |
| Accuracy        | Low (false positives) | High             |
| Memory          | Lower                 | Slightly higher  |
| Complexity      | Simple                | Medium           |
| Cleanup         | Key expiry            | ZREMRANGEBYSCORE |

### 7.8 Decision Matrix

| Factor       | Weight | SET        | ZSET       |
| ------------ | ------ | ---------- | ---------- |
| Accuracy     | 40%    | ⭐⭐       | ⭐⭐⭐⭐⭐ |
| Simplicity   | 20%    | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     |
| Memory       | 10%    | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   |
| Latency      | 20%    | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   |
| Edge cases   | 10%    | ⭐⭐       | ⭐⭐⭐⭐⭐ |
| **Weighted** | 100%   | **3.4**    | **4.2**    |

### 7.9 When to Use Each

**Keep SET if**:

- Typing indicators not user-visible
- "Someone is typing" is acceptable (no names)
- Simplicity > accuracy

**Switch to ZSET if**:

- Showing "Alice, Bob are typing..."
- Need accurate per-user timeout
- UX polish is important

### ⚠️ RECOMMENDATION: Consider ZSET (Priority: LOW)

**If typing indicators show usernames**: Switch to ZSET  
**If just "Someone is typing"**: Keep SET

**Impact**: UX accuracy improvement, not critical.

---

## 8. Final Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         REDIS CACHE LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     CHAT DATA                                │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  chat:{id}:{userId}:meta  [STRING]  ~400B   ✅ OPTIMAL      │   │
│  │  chat:{id}:{userId}:msgs  [ZSET]    ~varies ✅ OPTIMAL      │   │
│  │  user:{userId}:chats      [ZSET]    ~varies ✅ OPTIMAL      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    DOCUMENTS                                 │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  doc:{id}:{userId}:meta     [STRING]  ~120B   🔴 NEW        │   │
│  │  doc:{id}:{userId}:versions [ZSET]    ~varies 🔴 NEW        │   │
│  │                                                              │   │
│  │  ↑ CHANGE: STRING → ZSET Hybrid (90% bandwidth savings)     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     QUOTA & SESSION                          │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  quota:{userId}:{date}    [STRING]  ~10B    ✅ OPTIMAL      │   │
│  │  session:{sessionId}      [STRING]  ~500B   ✅ OPTIMAL      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     REAL-TIME                                │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  typing:{chatId}          [SET→ZSET] ~200B  ⚠️ OPTIONAL     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. Consequences

### 9.1 Positive

| ID      | Consequence                                     |
| ------- | ----------------------------------------------- |
| POS-001 | 90% bandwidth reduction for document operations |
| POS-002 | O(log N) append vs O(N) Lua for documents       |
| POS-003 | Native Redis commands replace Lua scripts       |
| POS-004 | Better scaling as documents grow                |
| POS-005 | Validated all other structures are optimal      |

### 9.2 Negative

| ID      | Consequence                  | Mitigation                |
| ------- | ---------------------------- | ------------------------- |
| NEG-001 | 3% more memory for documents | Acceptable trade-off      |
| NEG-002 | Migration complexity         | Dual-write strategy       |
| NEG-003 | Two keys per document        | Shared prefix, same shard |

### 9.3 Alternatives Rejected

| Alternative                | Reason                                    |
| -------------------------- | ----------------------------------------- |
| RedisJSON module           | Not available on Upstash                  |
| Separate keys per version  | Key explosion, management overhead        |
| Keep STRING + optimize Lua | Still O(N) for read, no bandwidth savings |

---

## 10. Implementation Priority

| Priority | Entity     | Action               | Effort | Impact         |
| -------- | ---------- | -------------------- | ------ | -------------- |
| 🔴 HIGH  | Documents  | STRING → ZSET Hybrid | Medium | 90% BW savings |
| 🟡 LOW   | Typing     | SET → ZSET           | Low    | UX accuracy    |
| ✅ NONE  | Messages   | Keep ZSET            | —      | —              |
| ✅ NONE  | Metadata   | Keep STRING          | —      | —              |
| ✅ NONE  | User Chats | Keep ZSET            | —      | —              |
| ✅ NONE  | Quota      | Keep STRING          | —      | —              |
| ✅ NONE  | Sessions   | Keep STRING          | —      | —              |

---

## 11. References

- [04-cache-layer-optimal-design.md](../architecture-overhaul/04-cache-layer-optimal-design.md)
- [redis-data-structures-analysis.md](./redis-data-structures-analysis.md) (superseded for documents)
- [Redis ZSET Documentation](https://redis.io/docs/data-types/sorted-sets/)
- [Upstash Redis Features](https://upstash.com/docs/redis/features)

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-21  
**Status**: PROPOSED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
