# Upstash Redis Cache Keymap Documentation

## Overview

This document describes the complete Redis cache structure for the AI Chat application, including key patterns, data types, TTL policies, and serialization strategies.

## Architecture: Redis List-Based Storage

**Performance characteristics:**

- **Message append: O(1)** via Redis List RPUSH (vs O(N) JSON rewrite)
- **Get all messages: O(N)** via LRANGE
- **Get last N messages: O(N)** via LRANGE -N -1
- **Metadata updates: O(1)** via simple SET

## Connection Configuration

**Provider:** Upstash Redis (HTTP-based, stateless)

**Configuration:**

```typescript
{
  url: process.env.CACHE_KV_REST_API_URL,
  token: process.env.CACHE_KV_REST_API_TOKEN
}
```

**Client:** Global singleton pattern (safe for serverless/HMR)

**Features:**

- HTTP-based (no persistent connections)
- JSON serialization built-in
- Pipeline support for atomic operations
- Compatible with Vercel Edge runtime

---

## Key Patterns

### 1. Chat Metadata Keys (NEW)

**Pattern:** `chat:{chatId}:{userId}:meta`

**Type:** String (JSON)

**Data Structure:** CachedChatMeta

```typescript
{
  id: string; // Chat UUID
  userId: string; // Owner user UUID
  title: string; // Chat title
  visibility: VisibilityType; // 'public' | 'private'
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
  lastContext: AppUsage | null; // Last usage metadata
  version: number; // Optimistic locking version
}
```

**Purpose:** Store chat metadata separately for O(1) updates

**Operations:**

- `redis.get()` - Retrieve metadata
- `redis.set()` - Store/update metadata
- `redis.del()` - Delete metadata

**Example Key:**

```
chat:550e8400-e29b-41d4-a716-446655440000:123e4567-e89b-12d3-a456-426614174000:meta
```

---

### 2. Chat Messages Keys (NEW)

**Pattern:** `chat:{chatId}:{userId}:msgs`

**Type:** List (Redis List)

**Element:** JSON string of CachedMessage

```typescript
{
  id: string;              // Message UUID
  chatId: string;          // Parent chat UUID
  role: 'user' | 'assistant' | 'system';
  parts: MessagePart[];    // JSON parts array
  attachments: MessageAttachment[]; // JSON attachments array
  createdAt: string;       // ISO 8601 timestamp
}
```

**Purpose:** Store messages as Redis List for O(1) append operations

**Operations:**

- `redis.rpush()` - **O(1) append** new message(s)
- `redis.lrange(0, -1)` - Get all messages
- `redis.lrange(-N, -1)` - Get last N messages
- `redis.llen()` - **O(1) count** messages
- `redis.del()` - Delete all messages

**Example Key:**

```
chat:550e8400-e29b-41d4-a716-446655440000:123e4567-e89b-12d3-a456-426614174000:msgs
```

**Performance Benefits:**

| Operation     | Old (JSON blob) | New (Redis List) |
| ------------- | --------------- | ---------------- |
| Append 1 msg  | O(N) rewrite    | **O(1)** RPUSH   |
| Append M msgs | O(N) rewrite    | **O(M)** RPUSH   |
| Get last 20   | O(N) parse all  | **O(20)** LRANGE |
| Count msgs    | O(N) parse      | **O(1)** LLEN    |

---

### 3. Legacy Chat Keys (DEPRECATED)

**Pattern:** `chat:{chatId}:{userId}`

**Type:** String (JSON)

**Status:** DEPRECATED - migrated automatically on access

**Data Structure:** CachedChat (old format)

```typescript
{
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
  createdAt: string;
  updatedAt: string;
  lastContext: AppUsage | null;
  messages: CachedMessage[];  // Embedded array (slow append)
  version: number;
}
```

**Migration:** When accessed, automatically migrated to new format (meta + msgs)

---

### 4. User Chat List Keys

**Pattern:** `user:{userId}:chats`

**Type:** ZSET (Sorted Set)

**Member:** `chatId` (string)

**Score:** Unix timestamp in milliseconds (from `updatedAt`)

**Purpose:** Maintain user's chat list sorted by most recent activity

**Operations:**

- `redis.zadd()` - Add/update chat in list (uses updatedAt as score)
- `redis.zrange()` - Retrieve paginated chat list (newest first with `rev: true`)
- `redis.zrem()` - Remove chat from list

**TTL:** None (manual cleanup required)

**Pagination:**

```typescript
redis.zrange(key, offset, offset + limit - 1, { rev: true });
```

**Example Key:**

```
user:123e4567-e89b-12d3-a456-426614174000:chats
```

**Example Members:**

```
Score: 1704067200000  Member: "550e8400-e29b-41d4-a716-446655440000"
Score: 1704066000000  Member: "660e8400-e29b-41d4-a716-446655440001"
```

---

### 3. Document Keys

**Pattern:** `document:{documentId}:{userId}`

**Type:** String (JSON)

**Data Structure:** CachedDocument

```typescript
{
  id: string;              // Document UUID
  userId: string;          // Owner user UUID
  chatId: string;          // Associated chat UUID
  versions: DocumentVersion[]; // All document versions
}
```

**DocumentVersion Structure:**

```typescript
{
  title: string; // Version title
  content: string | null; // Version content (nullable for images)
  kind: ArtifactKind; // 'text' | 'code' | 'image' | 'sheet'
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}
```

**Purpose:** Store all document versions in single denormalized structure

**Operations:**

- `redis.get()` - Retrieve document with all versions
- `redis.set()` - Store/update document versions
- Version array manipulation for appending/filtering

**TTL:** None (manual cleanup required)

**Optimization Notes:**

- All versions stored together (single fetch)
- Versions ordered chronologically in array
- Supports filtering by timestamp for rollback operations

**Example Key:**

```
document:770e8400-e29b-41d4-a716-446655440002:123e4567-e89b-12d3-a456-426614174000
```

---

## Data Structures

### CachedMessage

```typescript
{
  id: string;              // Message UUID
  chatId: string;          // Parent chat UUID
  role: 'user' | 'assistant' | 'system';
  parts: any;              // JSON parts array (text, tool-call, tool-result, reasoning)
  attachments: any[];      // JSON attachments array
  createdAt: string;       // ISO 8601 timestamp
}
```

**Notes:**

- Embedded in CachedChat.messages array
- Not stored as separate keys (denormalized)
- Parts array follows AI SDK format

### AppUsage (lastContext)

```typescript
{
  modelId: string;         // Model identifier
  promptTokens?: number;   // Input tokens
  completionTokens?: number; // Output tokens
  totalTokens?: number;    // Total tokens
  costUSD?: number;        // Estimated cost in USD
  // ... other TokenLens fields
}
```

**Notes:**

- Stored in CachedChat.lastContext
- Enriched with TokenLens pricing data
- Used for usage tracking and model selection

---

## TTL Policies

### Current Implementation

**All Keys:** No TTL set (indefinite storage)

**Cleanup Strategy:**

- Manual deletion when user deletes chats
- Guest users: Data persists in cache even after session ends
- No automatic expiration

### Recommended Future Enhancements

**Guest User Keys:**

- Consider TTL of 24-48 hours for guest chats
- Balances: temporary storage vs. session recovery

**Stale Data:**

- Monitor cache size and eviction policies
- Implement LRU eviction if needed

**Implementation:**

```typescript
// Potential future enhancement
redis.setex(key, 86400, value); // 24 hour TTL for guests
```

---

## Serialization

### JSON Encoding

**Method:** Upstash Redis client automatic JSON serialization

**Date Handling:**

- Stored as ISO 8601 strings (`toISOString()`)
- Parsed to Date objects on read (`new Date(isoString)`)

**JSONB Fields:**

- Parts array: Nested JSON structure
- Attachments array: Nested JSON structure
- lastContext: Flat JSON object

**Example:**

```typescript
// Write
await redis.set(key, {
  id: '123',
  createdAt: new Date().toISOString(), // "2024-01-01T12:00:00.000Z"
  messages: [...]
});

// Read
const cached = await redis.get<CachedChat>(key);
const date = new Date(cached.createdAt); // Parse back to Date
```

---

## Cache Operations

### Atomic Operations (Pipeline)

**Purpose:** Ensure consistency for multi-key updates

**Usage:**

```typescript
const pipeline = redis.pipeline();
pipeline.set(CacheKeys.chatMeta(chatId, userId), meta);
pipeline.rpush(CacheKeys.chatMessages(chatId, userId), ...messageStrings);
pipeline.zadd(CacheKeys.userChats(userId), {
  score: Date.parse(chat.updatedAt),
  member: chatId,
});
await pipeline.exec();
```

**Operations Using Pipelines:**

- `setChatInCache` - Update chat + ZSET atomically
- `deleteChatFromCache` - Delete chat + ZSET member atomically

### Batch Operations (MGET)

**Purpose:** Fetch multiple keys in single round-trip

**Usage:**

```typescript
const keys = chatIds.map((id) => CacheKeys.chatMeta(id, userId));
const chatMetas = await redis.mget<CachedChatMeta[]>(...keys);
```

**Operations Using MGET:**

- `getGuestChatsByUserId` - Fetch multiple chats in parallel
- Eliminates N+1 pattern when loading chat lists

### Single Key Operations

**Standard Operations:**

- `redis.get<T>(key)` - Retrieve typed value
- `redis.set(key, value)` - Store value
- `redis.del(key)` - Delete key
- `redis.zrange(key, start, stop, options)` - Range query on ZSET
- `redis.zadd(key, { score, member })` - Add to ZSET
- `redis.zrem(key, member)` - Remove from ZSET

---

## Cache Warming Strategy

### When Warming Occurs

**Authenticated Users Only:**

- Cache miss on read → DB query → background cache population
- Non-blocking (doesn't delay response)

**Guest Users:**

- No cache warming (cache-only, no DB to warm from)

### Implementation Pattern

```typescript
// Cache miss detected
if (userId && isRedisAvailable() && selectedChat.userId === userId) {
  // Non-blocking background warming
  getMessagesByChatId({ id })
    .then((messages) => {
      warmChatCache(id, userId, selectedChat, messages);
    })
    .catch((err) => logError("Cache warming failed", err));
}
```

**Functions Using Warming:**

- `getChatById` - Warms chat + messages on cache miss
- `getDocumentById` - Warms document versions on cache miss

**Optimization Notes:**

- Prevents blocking user response
- Improves subsequent requests
- Errors logged but don't propagate

---

## Cache Invalidation

### Update Strategies

**Immediate Consistency:**

- Write operations update cache immediately
- Cache and DB updated in parallel
- Cache reflects latest state

**Invalidation Patterns:**

```typescript
// Update: Modify cached value
const cached = await getChatFromCache(chatId, userId);
cached.title = newTitle;
cached.version += 1;
await setChatInCache(chatId, userId, cached);

// Delete: Remove from cache
await deleteChatFromCache(chatId, userId);
```

### Array Manipulation

**Append Messages:**

```typescript
cached.messages.push(...newMessages);
cached.version += 1;
```

**Filter Messages (after timestamp):**

```typescript
cached.messages = cached.messages.filter(
  (msg) => new Date(msg.createdAt) < timestamp
);
```

**Append Document Version:**

```typescript
cached.versions.push(newVersion);
```

---

## Error Handling

### Graceful Degradation

**Cache Unavailable:**

```typescript
if (!redis) {
  return null; // Fall through to DB query
}
```

**Redis Errors:**

```typescript
try {
  return await redis.get(key);
} catch (error) {
  logError("Redis getChatFromCache error", error);
  return null; // Fall through to DB query
}
```

**Strategy:**

- Cache errors logged but don't throw
- System continues with DB-only mode
- No user-facing errors from cache failures

---

## Guest User Behavior

### Cache-Only Storage

**What's Cached:**

- Chats (metadata + messages)
- Documents (all versions)
- User chat list (ZSET)

**What's NOT Cached:**

- Votes (DB-only, guests can't vote)
- Suggestions (DB-only, guests can't use)
- Rate limiting data (uses DB for both)

### Guest User Lifecycle

**Creation:**

1. Guest user created in DB (User table) for FK integrity
2. Chat/message data stored ONLY in cache
3. No DB writes for chat/message/document operations

**Persistence:**

- Data lives in cache indefinitely (no TTL)
- Session ends → cache data persists (can resume)
- Manual deletion only

**Conversion to Authenticated:**

- Requires data migration (cache → DB)
- Not currently implemented

---

## Performance Characteristics

### Latency

**Upstash Redis REST API:**

- ~10-30ms for single GET (typical)
- ~20-50ms for pipeline operations
- ~50-100ms for MGET with 10+ keys

**Compared to NeonDB:**

- Redis: ~10-30ms
- NeonDB: ~50-150ms (with connection pool)
- Speedup: 3-5x faster for hot data

### Cache Hit Rates

**Expected Hit Rates:**

- Chat retrieval: 80-90% (warm cache)
- Message retrieval: 80-90% (denormalized with chat)
- Document retrieval: 60-70% (less frequent access)
- Guest users: 100% (cache-only)

### Optimization Wins

**Denormalization Benefits:**

- Eliminates N+1 queries (messages fetched with chat)
- Single cache operation vs. 2 DB queries
- Reduced latency by 60-80% for chat loads

**Pipeline Benefits:**

- Atomic updates (chat + ZSET)
- Single network round-trip
- ~40-50% faster than sequential operations

**MGET Benefits:**

- Batch fetch multiple chats
- Linear cost vs. N sequential GETs
- Essential for chat list rendering

---

## Monitoring & Observability

### Current Implementation

**Logging:**

- Cache errors logged via `logError()`
- Cache warnings logged via `logWarn()`
- No metrics collection

### Recommended Metrics

**Cache Operations:**

- Hit rate: `cache_hits / (cache_hits + cache_misses)`
- Miss rate: `cache_misses / (cache_hits + cache_misses)`
- Error rate: `cache_errors / total_cache_operations`

**Performance:**

- Average latency per operation type
- P95, P99 latencies
- Pipeline vs. single operation times

**Storage:**

- Total keys count
- Memory usage
- Key distribution by pattern

---

## Migration & Compatibility

### Legacy Format Support

**User Chat List:**

- Old format: `{"chatId":"...", "title":"..."}`
- New format: Just `chatId` string
- Code supports both with parsing fallback

**Version Field:**

- Added to CachedChat for optimistic locking
- Missing version treated as version 1
- Backward compatible

### Data Migration Notes

**No Breaking Changes:**

- All cache format changes are additive
- Old cached data still readable
- Gradual migration via cache warming

---

## Security Considerations

### Key Isolation

**User Scoping:**

- All keys include `userId`
- Prevents cross-user data access
- Keys are user-specific: `chat:{chatId}:{userId}`

**Guest User Isolation:**

- Guest users have unique UUIDs
- No special marking in cache keys
- Same isolation as authenticated users

### Data Sensitivity

**Stored in Cache:**

- Chat messages (potentially sensitive)
- Document content (potentially sensitive)
- User IDs (semi-public identifiers)

**NOT Stored in Cache:**

- Passwords (hashed in DB only)
- Email addresses (DB only)
- Payment information (not stored anywhere)

### Recommendations

**Encryption at Rest:**

- Upstash Redis supports encryption
- Enable in production environments

**Key Expiration:**

- Consider TTL for guest users
- Automatic cleanup of old data

**Access Controls:**

- Secure CACHE_KV_REST_API_TOKEN
- Use environment-specific credentials
- Rotate tokens periodically
