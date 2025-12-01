# Cache System Analysis

> Comprehensive analysis of the Redis caching layer for the AI Chat application.
> Last updated: December 1, 2025

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Key Structure & Data Types](#2-key-structure--data-types)
3. [Module Structure](#3-module-structure)
4. [Cache Operations Reference](#4-cache-operations-reference)
5. [Lua Scripts Analysis](#5-lua-scripts-analysis)
6. [Cache Flow Diagrams](#6-cache-flow-diagrams)
7. [Command Summary](#7-command-summary)
8. [TTL & Expiration Policies](#8-ttl--expiration-policies)
9. [Resilience Patterns](#9-resilience-patterns)
10. [Performance Characteristics](#10-performance-characteristics)
11. [Statistics Summary](#11-statistics-summary)
12. [User Operations - Redis Command Analysis](#12-user-operations---redis-command-analysis)

---

## 1. Architecture Overview

### 1.1 Technology Stack

| Component         | Technology             | Description                  |
| ----------------- | ---------------------- | ---------------------------- |
| **Provider**      | Upstash Redis          | HTTP-based, stateless Redis  |
| **Client**        | `@upstash/redis`       | Global singleton pattern     |
| **Runtime**       | Vercel Edge compatible | No persistent connections    |
| **Serialization** | JSON (automatic)       | Built-in with Upstash client |

### 1.2 Design Principles

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CACHE-FIRST STRATEGY                         │
├─────────────────────────────────────────────────────────────────────┤
│  • Cache checked FIRST for all operations (guest and auth)         │
│  • Cache miss for guests → return null (no DB call)                │
│  • Cache miss for auth → single DB query, warm cache in background │
│  • Write operations: cache always updated, DB write only for auth  │
│  • Zero extra DB/cache calls compared to original implementation   │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 User Flow Differentiation

| User Type         | Read Strategy            | Write Strategy        | Storage            |
| ----------------- | ------------------------ | --------------------- | ------------------ |
| **Guest**         | Cache-only               | Cache-only            | Redis (7-day TTL)  |
| **Authenticated** | Cache-first, DB fallback | Cache + DB (parallel) | Redis + PostgreSQL |

---

## 2. Key Structure & Data Types

### 2.1 Key Patterns

| Key Pattern                      | Redis Type      | Purpose                              | TTL                   |
| -------------------------------- | --------------- | ------------------------------------ | --------------------- |
| `chat:{chatId}:{userId}:meta`    | String (JSON)   | Chat metadata                        | None / 7 days (guest) |
| `chat:{chatId}:{userId}:msgs`    | Sorted Set      | Messages (score = timestamp)         | None / 7 days (guest) |
| `user:{userId}:chats`            | Sorted Set      | User's chat list (score = updatedAt) | None / 7 days (guest) |
| `document:{documentId}:{userId}` | String (JSON)   | Document with versions               | None                  |
| `quota:{userId}:{date}`          | String (Number) | Daily message quota                  | 25 hours              |

### 2.2 Data Structures

#### CachedChatMeta (String/JSON)

```typescript
type CachedChatMeta = {
  id: string; // Chat UUID
  userId: string; // Owner user UUID
  title: string; // Chat title
  visibility: VisibilityType; // 'public' | 'private'
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
  lastContext: AppUsage | null; // Last usage metadata
  version: number; // Optimistic locking version
};
```

#### CachedMessage (ZSET member as JSON string)

```typescript
type CachedMessage = {
  id: string; // Message UUID
  chatId: string; // Parent chat UUID
  role: "user" | "assistant" | "system";
  parts: MessagePart[]; // JSON parts array
  attachments: MessageAttachment[];
  createdAt: string; // ISO 8601 (also used as ZSET score)
};
```

#### CachedDocument (String/JSON)

```typescript
type CachedDocument = {
  id: string; // Document UUID
  userId: string; // Owner user UUID
  chatId: string; // Associated chat UUID
  versions: DocumentVersion[];
};

type DocumentVersion = {
  title: string;
  content: string | null;
  kind: ArtifactKind; // 'text' | 'code' | 'image' | 'sheet'
  createdAt: string;
  updatedAt: string;
};
```

### 2.3 Key Generation Functions

```typescript
const CacheKeys = {
  chatMeta: (chatId, userId) => `chat:${chatId}:${userId}:meta`,
  chatMessages: (chatId, userId) => `chat:${chatId}:${userId}:msgs`,
  userChats: (userId) => `user:${userId}:chats`,
  document: (documentId, userId) => `document:${documentId}:${userId}`,
};

// Quota key uses hash tag for cluster co-location
const getQuotaKey = (userId, date) => `quota:{${userId}}:${date}`;
```

---

## 3. Module Structure

### 3.1 File Organization

```
lib/cache/
├── redis.ts           # Redis client initialization (singleton)
├── types.ts           # TypeScript type definitions & CacheKeys
├── operations.ts      # Core CRUD operations (ZSET-based)
├── batch-operations.ts # Optimized batch ops with Lua scripts
├── quota.ts           # Rate limiting with atomic counters
├── service.ts         # Resilient layer (circuit breaker, retries)
├── helpers.ts         # Conversion utilities
└── README.md          # Module documentation
```

### 3.2 Module Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                         lib/data/chat.ts                        │
│                    (Data Access Layer)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  batch-operations.ts  │  operations.ts  │  quota.ts             │
│  (Lua-optimized)      │  (Core CRUD)    │  (Rate limiting)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          redis.ts (Client) │ types.ts │ helpers.ts              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      service.ts (Optional)                       │
│              Circuit Breaker + Retries + Logging                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Cache Operations Reference

### 4.1 Redis Client (`redis.ts`)

| Function             | Description                       | Commands |
| -------------------- | --------------------------------- | -------- |
| `getRedisClient()`   | Get/create singleton Redis client | -        |
| `isRedisAvailable()` | Check if Redis is configured      | -        |

### 4.2 Core Operations (`operations.ts`)

#### Read Operations

| Function                                          | Redis Commands | Round-trips  | Complexity   |
| ------------------------------------------------- | -------------- | ------------ | ------------ |
| `getChatFromCache(chatId, userId)`                | GET + ZRANGE   | 1 (parallel) | O(1) + O(N)  |
| `getChatMetaFromCache(chatId, userId)`            | GET            | 1            | O(1)         |
| `getLastMessagesFromCache(chatId, userId, count)` | ZRANGE         | 1            | O(log N + M) |
| `getMessageCountFromCache(chatId, userId)`        | ZCARD          | 1            | O(1)         |
| `getUserChatsFromCache(userId, limit, offset)`    | ZRANGE (rev)   | 1            | O(log N + M) |
| `getDocumentFromCache(documentId, userId)`        | GET            | 1            | O(1)         |

#### Write Operations

| Function                                             | Redis Commands                         | Round-trips  | Complexity   |
| ---------------------------------------------------- | -------------------------------------- | ------------ | ------------ |
| `setChatInCache(chatId, userId, chat)`               | SET + DEL + ZADD×M + ZADD [+ EXPIRE×3] | 1 (pipeline) | O(M log N)   |
| `appendMessageToCache(chatId, userId, msg)`          | EVAL (Lua)                             | 1            | O(log N)     |
| `appendMessagesToCache(chatId, userId, msgs)`        | EVAL (Lua)                             | 1            | O(M log N)   |
| `updateChatTitleInCache(chatId, userId, title)`      | EVAL (Lua)                             | 1            | O(1)         |
| `updateChatLastContextInCache(chatId, userId, ctx)`  | EVAL (Lua)                             | 1            | O(1)         |
| `updateChatVisibilityInCache(chatId, userId, vis)`   | EVAL (Lua)                             | 1            | O(1)         |
| `deleteChatFromCache(chatId, userId)`                | DEL×2 + ZREM                           | 1 (pipeline) | O(1)         |
| `deleteMessagesFromCacheAfterTimestamp(...)`         | ZREMRANGEBYSCORE                       | 1            | O(log N + M) |
| `setDocumentInCache(documentId, userId, doc)`        | SET                                    | 1            | O(1)         |
| `appendDocumentVersionToCache(...)`                  | EVAL (Lua)                             | 1            | O(1)         |
| `deleteDocumentVersionsFromCacheAfterTimestamp(...)` | EVAL (Lua)                             | 1            | O(V)         |

#### Cache Warming

| Function                                      | Description            | Commands                   |
| --------------------------------------------- | ---------------------- | -------------------------- |
| `warmChatCache(chatId, userId, chat, msgs)`   | Populate cache from DB | calls `setChatInCache`     |
| `warmDocumentCache(documentId, userId, docs)` | Populate cache from DB | calls `setDocumentInCache` |

### 4.3 Batch Operations (`batch-operations.ts`)

| Function                                                               | Description                          | Round-trips |
| ---------------------------------------------------------------------- | ------------------------------------ | ----------- |
| `batchUpdateChatCache({chatId, userId, messages, lastContext, title})` | Atomic update meta + append messages | 1 (Lua)     |
| `createOrUpdateChatWithMessages({...})`                                | Create new or update existing chat   | 1 (Lua)     |

### 4.4 Quota Operations (`quota.ts`)

| Function                                        | Redis Commands              | Round-trips | Complexity |
| ----------------------------------------------- | --------------------------- | ----------- | ---------- |
| `getUserMessageCount(userId)`                   | GET                         | 1           | O(1)       |
| `incrementUserMessageCount(userId, delta)`      | EVAL (Lua: INCRBY + EXPIRE) | 1           | O(1)       |
| `incrementUserMessageCountAsync(userId, delta)` | EVAL (fire-and-forget)      | 1           | O(1)       |
| `resetUserQuota(userId)`                        | DEL                         | 1           | O(1)       |
| `getBatchUserMessageCounts(userIds)`            | Pipeline: GET×N             | 1           | O(N)       |

### 4.5 Service Layer (`service.ts`)

Wrapper functions with circuit breaker and retry logic:

| Function                             | Base Command    | Features                  |
| ------------------------------------ | --------------- | ------------------------- |
| `get<T>(key)`                        | GET             | + retry + circuit breaker |
| `set<T>(key, value, ttl?)`           | SET [EX]        | + retry + circuit breaker |
| `del(key)`                           | DEL             | + retry + circuit breaker |
| `eval(script, keys, args)`           | EVAL            | + retry + circuit breaker |
| `zadd(key, score, member)`           | ZADD            | + retry + circuit breaker |
| `zrange<T>(key, start, stop, opts?)` | ZRANGE          | + retry + circuit breaker |
| `zrem(key, member)`                  | ZREM            | + retry + circuit breaker |
| `expire(key, seconds)`               | EXPIRE          | + retry + circuit breaker |
| `batchGet<T>(keys)`                  | MGET            | + retry + circuit breaker |
| `batchSet<T>(items)`                 | Pipeline: SET×N | + retry + circuit breaker |
| `batchDel(keys)`                     | DEL×N           | + retry + circuit breaker |

---

## 5. Lua Scripts Analysis

### 5.1 Scripts Overview

| Script Name                 | Location               | Purpose                          | Commands Inside                        |
| --------------------------- | ---------------------- | -------------------------------- | -------------------------------------- |
| `APPEND_MESSAGE_SCRIPT`     | operations.ts          | Append single message atomically | GET + ZADD + SET + ZADD + [EXPIRE×3]   |
| `APPEND_MESSAGES_SCRIPT`    | operations.ts          | Bulk append messages             | GET + ZADD×M + SET + ZADD + [EXPIRE×3] |
| `UPDATE_META_SCRIPT`        | operations.ts          | Update metadata fields           | GET + SET                              |
| `BATCH_UPDATE_SCRIPT`       | batch-operations.ts    | Update meta + messages           | GET + SET + ZADD×M + ZADD + [EXPIRE×3] |
| `CREATE_OR_UPDATE_SCRIPT`   | batch-operations.ts    | Upsert chat with messages        | GET + SET + ZADD×M + ZADD + [EXPIRE×3] |
| `INCREMENT_WITH_TTL_SCRIPT` | quota.ts               | Atomic counter + conditional TTL | INCRBY + [EXPIRE]                      |
| Document append script      | operations.ts (inline) | Append version to doc            | GET + SET                              |
| Document delete script      | operations.ts (inline) | Delete versions after timestamp  | GET + SET                              |

### 5.2 APPEND_MESSAGE_SCRIPT (Detailed)

```lua
-- Purpose: Atomically append a single message to chat
-- Keys: [metaKey, msgsKey, userChatsKey]
-- Args: [messageStr, now, userChatsScore, chatId, msgScore, ttl]

local metaKey = KEYS[1]
local msgsKey = KEYS[2]
local userChatsKey = KEYS[3]
local messageStr = ARGV[1]
local now = ARGV[2]
local userChatsScore = tonumber(ARGV[3])
local chatId = ARGV[4]
local msgScore = tonumber(ARGV[5])
local ttl = tonumber(ARGV[6])

-- 1. Check if chat exists (GET)
local meta = redis.call('GET', metaKey)
if not meta then return 0 end

-- 2. Add message to ZSET (ZADD)
redis.call('ZADD', msgsKey, msgScore, messageStr)

-- 3. Update metadata version (SET)
local data = cjson.decode(meta)
data.updatedAt = now
data.version = (data.version or 0) + 1
redis.call('SET', metaKey, cjson.encode(data))

-- 4. Update user chats list (ZADD)
redis.call('ZADD', userChatsKey, userChatsScore, chatId)

-- 5. Apply TTL for guest users (EXPIRE×3)
if ttl > 0 then
    redis.call('EXPIRE', metaKey, ttl)
    redis.call('EXPIRE', msgsKey, ttl)
    redis.call('EXPIRE', userChatsKey, ttl)
end

return 1
```

**Command Count:** 3-6 commands, 1 network round-trip

### 5.3 INCREMENT_WITH_TTL_SCRIPT (Detailed)

```lua
-- Purpose: Atomic increment with conditional TTL
-- Keys: [quotaKey]
-- Args: [delta, ttl]

local key = KEYS[1]
local delta = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

-- 1. Increment counter
local newCount = redis.call('INCRBY', key, delta)

-- 2. Set expiration only on first use
if newCount == delta then
    redis.call('EXPIRE', key, ttl)
end

return newCount
```

**Command Count:** 1-2 commands, 1 network round-trip

---

## 6. Cache Flow Diagrams

### 6.1 Chat Read Flow (Guest User)

```
┌─────────────────────────────────────────────────────────────────┐
│                     chatData.get() [Guest]                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    ┌──────────────────────────────────────┐       │
│  │ Request │───▶│ getChatFromCache(chatId, userId)     │       │
│  └─────────┘    └──────────────────────────────────────┘       │
│                              │                                  │
│                              ▼                                  │
│                 ┌────────────────────────┐                     │
│                 │  Promise.all([        │                     │
│                 │    GET meta,          │  ◄── 2 commands     │
│                 │    ZRANGE msgs 0 -1   │      1 round-trip   │
│                 │  ])                   │                     │
│                 └────────────────────────┘                     │
│                              │                                  │
│              ┌───────────────┴───────────────┐                 │
│              ▼                               ▼                 │
│        ┌──────────┐                   ┌──────────┐            │
│        │ Hit ✓    │                   │ Miss ✗   │            │
│        └────┬─────┘                   └────┬─────┘            │
│             │                              │                   │
│             ▼                              ▼                   │
│     Return CachedChat              Return null                │
│     (meta + messages)              (NO DB call)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Chat Read Flow (Authenticated User)

```
┌─────────────────────────────────────────────────────────────────┐
│                     chatData.get() [Auth]                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    ┌──────────────────────────────────────┐       │
│  │ Request │───▶│ getChatFromCache(chatId, userId)     │       │
│  └─────────┘    └──────────────────────────────────────┘       │
│                              │                                  │
│              ┌───────────────┴───────────────┐                 │
│              ▼                               ▼                 │
│        ┌──────────┐                   ┌──────────┐            │
│        │ Hit ✓    │                   │ Miss ✗   │            │
│        └────┬─────┘                   └────┬─────┘            │
│             │                              │                   │
│             ▼                              ▼                   │
│     Return Chat               ┌─────────────────────┐         │
│                               │ DB: SELECT chat     │         │
│                               └─────────┬───────────┘         │
│                                         │                      │
│                                         ▼                      │
│                               ┌─────────────────────┐         │
│                               │ Background:         │         │
│                               │ warmChatCache()     │         │
│                               │                     │         │
│                               │ DB: SELECT messages │         │
│                               │ setChatInCache():   │         │
│                               │  • SET meta         │         │
│                               │  • DEL msgs         │         │
│                               │  • ZADD×M msgs      │         │
│                               │  • ZADD userChats   │         │
│                               └─────────────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Message Save Flow (Guest)

```
┌─────────────────────────────────────────────────────────────────┐
│             messageData.saveWithContext() [Guest]               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    New Chat?                             │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                           │                                     │
│           ┌───────────────┴───────────────┐                    │
│           ▼                               ▼                    │
│    ┌─────────────┐               ┌─────────────┐              │
│    │ Yes (new)   │               │ No (existing)│              │
│    └──────┬──────┘               └──────┬──────┘              │
│           │                             │                      │
│           ▼                             ▼                      │
│  ┌────────────────────┐     ┌────────────────────┐            │
│  │ Lua Script:        │     │ Lua Script:        │            │
│  │ CREATE_OR_UPDATE   │     │ BATCH_UPDATE       │            │
│  │                    │     │                    │            │
│  │ • GET meta (check) │     │ • GET meta         │            │
│  │ • SET meta         │     │ • SET meta         │            │
│  │ • ZADD×M msgs      │     │ • ZADD×M msgs      │            │
│  │ • ZADD userChats   │     │ • ZADD userChats   │            │
│  │ • EXPIRE×3 (guest) │     │ • EXPIRE×3 (guest) │            │
│  └────────────────────┘     └────────────────────┘            │
│           │                             │                      │
│           └─────────────┬───────────────┘                      │
│                         ▼                                      │
│            ┌─────────────────────────┐                        │
│            │ incrementUserMessage    │                        │
│            │ CountAsync() [Lua]      │                        │
│            │ • INCRBY quota          │                        │
│            │ • EXPIRE (conditional)  │                        │
│            └─────────────────────────┘                        │
│                                                                 │
│  Total: 2 Lua evals = 2 network round-trips                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Message Save Flow (Authenticated)

```
┌─────────────────────────────────────────────────────────────────┐
│             messageData.saveWithContext() [Auth]                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌─────────────────┐                         │
│                    │  Promise.all()  │                         │
│                    └────────┬────────┘                         │
│                             │                                   │
│         ┌───────────────────┼───────────────────┐              │
│         ▼                   ▼                   ▼              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │ DB Insert   │    │ DB Update   │    │ Cache Lua   │        │
│  │ (messages)  │    │ (context)   │    │ Script      │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│         │                   │                   │              │
│         └───────────────────┴───────────────────┘              │
│                             │                                   │
│                             ▼                                   │
│            ┌────────────────────────────┐                      │
│            │ incrementUserMessageCount  │                      │
│            │ Async() [fire-and-forget]  │                      │
│            └────────────────────────────┘                      │
│                                                                 │
│  Total: Parallel DB + 1 Lua + 1 async Lua                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.5 Chat List Flow (Guest with MGET optimization)

```
┌─────────────────────────────────────────────────────────────────┐
│                    chatData.list() [Guest]                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: Get chat IDs from sorted set                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ZRANGE user:{userId}:chats offset limit REV             │   │
│  │                                                          │   │
│  │ Returns: [chatId1, chatId2, chatId3, ...]              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                             │                                   │
│                             ▼                                   │
│  Step 2: Batch fetch metadata (eliminates N+1)                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ MGET chat:id1:user:meta chat:id2:user:meta ...          │   │
│  │                                                          │   │
│  │ Returns: [meta1, meta2, meta3, ...]                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                             │                                   │
│                             ▼                                   │
│                    ┌─────────────────┐                         │
│                    │ Map to Chat[]   │                         │
│                    │ Return result   │                         │
│                    └─────────────────┘                         │
│                                                                 │
│  Total: 2 Redis commands, 2 round-trips                        │
│  (vs N+1 pattern which would be 1 + N commands)                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.6 Chat Delete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   deleteChatFromCache()                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Pipeline                             │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ DEL chat:{chatId}:{userId}:meta                 │    │   │
│  │  │ DEL chat:{chatId}:{userId}:msgs                 │    │   │
│  │  │ ZREM user:{userId}:chats {chatId}               │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  │  await pipeline.exec()                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Total: 3 commands, 1 network round-trip (pipeline)            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Command Summary

### 7.1 Redis Commands Used

| Command            | Usage Locations                | Purpose                  |
| ------------------ | ------------------------------ | ------------------------ |
| `GET`              | operations, quota, service     | Read strings/JSON        |
| `SET`              | operations, service            | Write strings/JSON       |
| `DEL`              | operations, quota, service     | Delete keys              |
| `ZADD`             | operations, batch-ops, service | Add to sorted sets       |
| `ZRANGE`           | operations, service            | Read sorted set ranges   |
| `ZREM`             | operations, service            | Remove from sorted sets  |
| `ZCARD`            | operations                     | Count sorted set members |
| `ZREMRANGEBYSCORE` | operations                     | Delete by score range    |
| `MGET`             | data/chat, service             | Batch read               |
| `INCRBY`           | quota (via Lua)                | Atomic increment         |
| `EXPIRE`           | operations, quota, service     | Set TTL                  |
| `EVAL`             | operations, batch-ops, quota   | Execute Lua scripts      |

### 7.2 Commands by Operation

#### Read Operations

| Operation            | Commands     | Round-trips  |
| -------------------- | ------------ | ------------ |
| Get chat (full)      | GET + ZRANGE | 1 (parallel) |
| Get chat (meta only) | GET          | 1            |
| Get last N messages  | ZRANGE       | 1            |
| Get message count    | ZCARD        | 1            |
| Get user chats       | ZRANGE       | 1            |
| Batch get metas      | MGET         | 1            |
| Get document         | GET          | 1            |
| Get quota            | GET          | 1            |

#### Write Operations

| Operation          | Commands                                    | Round-trips  |
| ------------------ | ------------------------------------------- | ------------ |
| Set full chat      | SET + DEL + ZADD×M + ZADD [+ EXPIRE×3]      | 1 (pipeline) |
| Append message     | Lua: GET + ZADD + SET + ZADD [+ EXPIRE×3]   | 1            |
| Append messages    | Lua: GET + ZADD×M + SET + ZADD [+ EXPIRE×3] | 1            |
| Update metadata    | Lua: GET + SET                              | 1            |
| Delete chat        | DEL×2 + ZREM                                | 1 (pipeline) |
| Delete messages    | ZREMRANGEBYSCORE                            | 1            |
| Increment quota    | Lua: INCRBY [+ EXPIRE]                      | 1            |
| Set document       | SET                                         | 1            |
| Append doc version | Lua: GET + SET                              | 1            |

---

## 8. TTL & Expiration Policies

### 8.1 TTL Configuration

| Data Type      | User Type     | TTL Value | Constant                  |
| -------------- | ------------- | --------- | ------------------------- |
| Chat metadata  | Guest         | 7 days    | `GUEST_CACHE_TTL_SECONDS` |
| Chat messages  | Guest         | 7 days    | `GUEST_CACHE_TTL_SECONDS` |
| User chat list | Guest         | 7 days    | `GUEST_CACHE_TTL_SECONDS` |
| All chat data  | Authenticated | None      | -                         |
| Quota counter  | All           | 25 hours  | `TTL_25_HOURS`            |
| Documents      | All           | None      | -                         |

### 8.2 TTL Application Points

```typescript
// Guest user detection
const isGuest = userId.startsWith("guest:");

// TTL constant
const GUEST_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 604800 seconds

// Applied in Lua scripts when ttl > 0
if ttl > 0 then
    redis.call('EXPIRE', metaKey, ttl)
    redis.call('EXPIRE', msgsKey, ttl)
    redis.call('EXPIRE', userChatsKey, ttl)
end
```

---

## 9. Resilience Patterns

### 9.1 Circuit Breaker (`service.ts`)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Circuit Breaker States                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│     ┌──────────┐                          ┌──────────┐         │
│     │  CLOSED  │──── 5 failures ────────▶│   OPEN   │         │
│     │ (normal) │                          │ (reject) │         │
│     └────▲─────┘                          └────┬─────┘         │
│          │                                     │                │
│          │                              30s timeout             │
│    3 successes                                 │                │
│          │                                     ▼                │
│     ┌────┴─────────────────────────────────────────┐           │
│     │                 HALF-OPEN                     │           │
│     │           (test with limited requests)        │           │
│     └───────────────────────────────────────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Configuration Values

| Parameter             | Value  | Description                      |
| --------------------- | ------ | -------------------------------- |
| `failureThreshold`    | 5      | Failures before opening circuit  |
| `resetTimeoutMs`      | 30,000 | Time before testing recovery     |
| `halfOpenMaxAttempts` | 3      | Test requests in half-open state |
| `maxRetries`          | 3      | Retry attempts per operation     |
| `baseDelayMs`         | 100    | Initial retry delay              |
| `maxDelayMs`          | 2,000  | Maximum retry delay              |

### 9.3 Retryable Errors

```typescript
const retryableErrors = [
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EPIPE",
  "ERR_NETWORK",
  "fetch failed",
];
```

### 9.4 Graceful Degradation

```typescript
// All cache operations follow this pattern
try {
  const result = await cacheOperation();
  return result;
} catch (error) {
  logError("Cache operation failed", error);
  return null; // Falls through to DB query for auth users
}
```

---

## 10. Performance Characteristics

### 10.1 Complexity Comparison (Old vs New Architecture)

| Operation              | Old (JSON Blob) | New (ZSET)    | Improvement                      |
| ---------------------- | --------------- | ------------- | -------------------------------- |
| Append 1 message       | O(N) rewrite    | O(log N)      | **~100x faster for large chats** |
| Append M messages      | O(N) rewrite    | O(M log N)    | **Proportional to new messages** |
| Get last 20 messages   | O(N) parse all  | O(log N + 20) | **~50x faster**                  |
| Delete after timestamp | O(N) Lua loop   | O(log N + M)  | **Non-blocking**                 |
| Count messages         | O(N) parse      | O(1) ZCARD    | **O(N) → O(1)**                  |
| Update metadata        | O(N) rewrite    | O(1)          | **Constant time**                |

### 10.2 Latency Expectations

| Operation Type        | Expected Latency | Notes             |
| --------------------- | ---------------- | ----------------- |
| Single GET            | 10-30ms          | Upstash REST API  |
| Pipeline (3 commands) | 20-50ms          | Single round-trip |
| MGET (10 keys)        | 50-100ms         | Single round-trip |
| Lua script            | 10-40ms          | Single round-trip |
| DB query              | 50-150ms         | NeonDB with pool  |

### 10.3 Network Round-trips Comparison

| User Action          | Without Optimization | With Optimization       |
| -------------------- | -------------------- | ----------------------- |
| Load chat            | 2-3 calls            | 1-2 calls (parallel)    |
| Send message (guest) | 2-3 calls            | 1-2 calls (Lua)         |
| Send message (auth)  | 2-3 calls + DB       | 1-2 calls (Lua) + DB    |
| List chats (guest)   | N+1 calls            | 2 calls (ZRANGE + MGET) |

---

## 11. Statistics Summary

### 11.1 Module Statistics

| Metric                   | Count |
| ------------------------ | ----- |
| Total exported functions | 29    |
| Lua scripts              | 8     |
| Key patterns             | 5     |
| TTL policies             | 2     |

### 11.2 Functions by Category

| Category   | Functions | File                |
| ---------- | --------- | ------------------- |
| Chat Read  | 6         | operations.ts       |
| Chat Write | 8         | operations.ts       |
| Document   | 4         | operations.ts       |
| Quota      | 5         | quota.ts            |
| Batch      | 2         | batch-operations.ts |
| Service    | 12        | service.ts          |
| Helpers    | 3         | helpers.ts          |

### 11.3 Redis Commands Distribution

| Command          | Usage Count | Primary Purpose                 |
| ---------------- | ----------- | ------------------------------- |
| GET              | 12+         | Read metadata, documents, quota |
| SET              | 8+          | Write metadata, documents       |
| ZADD             | 8+          | Add messages, update user lists |
| ZRANGE           | 4+          | Read messages, user lists       |
| DEL              | 4+          | Delete keys                     |
| EVAL             | 8           | Execute Lua scripts             |
| ZREM             | 2+          | Remove from sorted sets         |
| MGET             | 2+          | Batch read                      |
| EXPIRE           | 6+          | Set TTL                         |
| ZCARD            | 1           | Count messages                  |
| ZREMRANGEBYSCORE | 1           | Range delete                    |
| INCRBY           | 1           | Increment counter               |

---

## 12. User Operations - Redis Command Analysis

> **Detailed breakdown of Redis round-trips and internal commands for every user-facing operation.**

### 12.1 Legend

| Symbol | Meaning                                   |
| ------ | ----------------------------------------- |
| 🔄     | Network round-trip to Redis               |
| 📥     | Read command inside Lua/Pipeline          |
| 📤     | Write command inside Lua/Pipeline         |
| ⏱️     | TTL command (conditional for guests)      |
| 🔢     | Variable count based on message count (M) |

---

### 12.2 Chat Operations

#### 📖 **Open/Load Existing Chat**

| Scenario                     | Client Round-trips | Commands Inside                    | Total Commands |
| ---------------------------- | ------------------ | ---------------------------------- | -------------- |
| **Guest - Cache Hit**        | 🔄 1               | 📥 GET meta, 📥 ZRANGE msgs        | 2              |
| **Guest - Cache Miss**       | 🔄 1               | 📥 GET meta (null), 📥 ZRANGE msgs | 2              |
| **Auth - Cache Hit**         | 🔄 1               | 📥 GET meta, 📥 ZRANGE msgs        | 2              |
| **Auth - Cache Miss + Warm** | 🔄 1 + 🔄 1 (bg)   | Read: 2, Warm: 3 + M + (0-3)       | 5-8 + M        |

```
Auth Cache Miss Breakdown:
├── Read (parallel): GET + ZRANGE = 2 commands, 1 round-trip
└── Background Warm (setChatInCache):
    ├── 📤 SET meta                    (1)
    ├── 📤 DEL msgs                    (1)
    ├── 📤 ZADD msgs × M messages      (M)
    ├── 📤 ZADD userChats              (1)
    └── ⏱️ [EXPIRE × 3 if guest]       (0-3)
    Total: 3 + M + (0-3) commands, 1 round-trip (pipeline)
```

---

#### ✏️ **Create New Chat (Empty)**

| Scenario  | Client Round-trips | Commands Inside                             | Total Commands |
| --------- | ------------------ | ------------------------------------------- | -------------- |
| **Guest** | 🔄 1               | 📤 SET meta, 📤 ZADD userChats, ⏱️ EXPIRE×3 | 5              |
| **Auth**  | 🔄 1               | 📤 SET meta, 📤 ZADD userChats              | 2              |

```
Guest New Chat (setChatInCache with empty messages):
├── Pipeline:
│   ├── 📤 SET meta                    (1)
│   ├── 📤 ZADD userChats              (1)
│   └── ⏱️ EXPIRE × 3                  (3)
└── Total: 5 commands, 1 round-trip
```

---

#### 💬 **Send First Message (New Chat)**

| Scenario  | Client Round-trips | Commands Inside                | Total Commands |
| --------- | ------------------ | ------------------------------ | -------------- |
| **Guest** | 🔄 1 + 🔄 1        | Lua: 1 + 3 + M + 3, Quota: 1-2 | 8-9 + M        |
| **Auth**  | 🔄 1 + 🔄 1        | Lua: 1 + 3 + M, Quota: 1-2     | 5-6 + M        |

```
Guest - New Chat with Messages (createOrUpdateChatWithMessages + quota):

Round-trip 1 - CREATE_OR_UPDATE_SCRIPT (Lua):
├── 📥 GET meta (check existence)      (1) - returns null
├── 📤 SET meta (create new)           (1)
├── 📤 ZADD msgs × M messages          (M) - typically 2 (user + assistant)
├── 📤 ZADD userChats                  (1)
└── ⏱️ EXPIRE × 3 (guest TTL)          (3)
Subtotal: 6 + M commands

Round-trip 2 - INCREMENT_WITH_TTL_SCRIPT (Lua, async):
├── 📤 INCRBY quota                    (1)
└── ⏱️ EXPIRE quota (first use only)   (0-1)
Subtotal: 1-2 commands

Total: 7-8 + M commands, 2 round-trips
Typical (M=2): 9-10 commands
```

---

#### 💬 **Send Message (Existing Chat)**

| Scenario  | Client Round-trips | Commands Inside                | Total Commands |
| --------- | ------------------ | ------------------------------ | -------------- |
| **Guest** | 🔄 1 + 🔄 1        | Lua: 1 + 3 + M + 3, Quota: 1-2 | 8-9 + M        |
| **Auth**  | 🔄 1 + 🔄 1        | Lua: 1 + 3 + M, Quota: 1-2     | 5-6 + M        |

```
Guest - Existing Chat (batchUpdateChatCache + quota):

Round-trip 1 - BATCH_UPDATE_SCRIPT (Lua):
├── 📥 GET meta                        (1)
├── 📤 SET meta (update version)       (1)
├── 📤 ZADD msgs × M messages          (M) - typically 2
├── 📤 ZADD userChats                  (1)
└── ⏱️ EXPIRE × 3 (guest TTL)          (3)
Subtotal: 6 + M commands

Round-trip 2 - INCREMENT_WITH_TTL_SCRIPT (Lua, async):
├── 📤 INCRBY quota                    (1)
└── ⏱️ EXPIRE quota (conditional)      (0-1)
Subtotal: 1-2 commands

Total: 7-8 + M commands, 2 round-trips
```

```
Auth - Existing Chat (batchUpdateChatCache + quota):

Round-trip 1 - BATCH_UPDATE_SCRIPT (Lua):
├── 📥 GET meta                        (1)
├── 📤 SET meta (update version)       (1)
├── 📤 ZADD msgs × M messages          (M)
└── 📤 ZADD userChats                  (1)
Subtotal: 3 + M commands

Round-trip 2 - INCREMENT_WITH_TTL_SCRIPT (Lua, async):
├── 📤 INCRBY quota                    (1)
└── ⏱️ EXPIRE quota (conditional)      (0-1)
Subtotal: 1-2 commands

Total: 4-5 + M commands, 2 round-trips
```

---

#### ✏️ **Rename Chat (Update Title)**

| Scenario  | Client Round-trips | Commands Inside | Total Commands |
| --------- | ------------------ | --------------- | -------------- |
| **Guest** | 🔄 1               | 📥 GET + 📤 SET | 2              |
| **Auth**  | 🔄 1               | 📥 GET + 📤 SET | 2              |

```
UPDATE_META_SCRIPT (Lua):
├── 📥 GET meta                        (1)
└── 📤 SET meta (with new title)       (1)
Total: 2 commands, 1 round-trip
```

---

#### 🔒 **Change Chat Visibility**

| Scenario  | Client Round-trips | Commands Inside | Total Commands |
| --------- | ------------------ | --------------- | -------------- |
| **Guest** | 🔄 1               | 📥 GET + 📤 SET | 2              |
| **Auth**  | 🔄 1               | 📥 GET + 📤 SET | 2              |

```
UPDATE_META_SCRIPT (Lua):
├── 📥 GET meta                        (1)
└── 📤 SET meta (with new visibility)  (1)
Total: 2 commands, 1 round-trip
```

---

#### 🗑️ **Delete Chat**

| Scenario  | Client Round-trips | Commands Inside    | Total Commands |
| --------- | ------------------ | ------------------ | -------------- |
| **Guest** | 🔄 1               | 📤 DEL×2 + 📤 ZREM | 3              |
| **Auth**  | 🔄 1               | 📤 DEL×2 + 📤 ZREM | 3              |

```
deleteChatFromCache (Pipeline):
├── 📤 DEL chat:{id}:{user}:meta       (1)
├── 📤 DEL chat:{id}:{user}:msgs       (1)
└── 📤 ZREM user:{user}:chats {id}     (1)
Total: 3 commands, 1 round-trip
```

---

#### 📋 **List User's Chats**

| Scenario  | Client Round-trips | Commands Inside      | Total Commands |
| --------- | ------------------ | -------------------- | -------------- |
| **Guest** | 🔄 2               | 📥 ZRANGE, 📥 MGET×N | 2              |
| **Auth**  | 🔄 0               | (DB query only)      | 0              |

```
Guest - chatData.list():
├── Round-trip 1: ZRANGE user:{user}:chats (rev)  (1)
└── Round-trip 2: MGET meta×N                     (1)
Total: 2 commands, 2 round-trips
```

---

### 12.3 Message Operations

#### 🔄 **Regenerate Message (Delete After Timestamp)**

| Scenario  | Client Round-trips | Commands Inside     | Total Commands |
| --------- | ------------------ | ------------------- | -------------- |
| **Guest** | 🔄 1               | 📤 ZREMRANGEBYSCORE | 1              |
| **Auth**  | 🔄 1               | 📤 ZREMRANGEBYSCORE | 1              |

```
deleteMessagesFromCacheAfterTimestamp:
└── 📤 ZREMRANGEBYSCORE msgs timestamp +inf  (1)
Total: 1 command, 1 round-trip
```

---

#### 📊 **Get Message Count**

| Scenario | Client Round-trips | Commands Inside | Total Commands |
| -------- | ------------------ | --------------- | -------------- |
| **All**  | 🔄 1               | 📥 ZCARD        | 1              |

```
getMessageCountFromCache:
└── 📥 ZCARD chat:{id}:{user}:msgs     (1)
Total: 1 command, 1 round-trip
```

---

### 12.4 Document Operations

#### 📄 **Load Document**

| Scenario | Client Round-trips | Commands Inside | Total Commands |
| -------- | ------------------ | --------------- | -------------- |
| **All**  | 🔄 1               | 📥 GET          | 1              |

```
getDocumentFromCache:
└── 📥 GET document:{id}:{user}        (1)
Total: 1 command, 1 round-trip
```

---

#### 📝 **Save Document Version**

| Scenario | Client Round-trips | Commands Inside | Total Commands |
| -------- | ------------------ | --------------- | -------------- |
| **All**  | 🔄 1               | 📥 GET + 📤 SET | 2              |

```
appendDocumentVersionToCache (Lua):
├── 📥 GET document:{id}:{user}        (1)
└── 📤 SET document:{id}:{user}        (1)
Total: 2 commands, 1 round-trip
```

---

#### 🔄 **Rollback Document**

| Scenario | Client Round-trips | Commands Inside | Total Commands |
| -------- | ------------------ | --------------- | -------------- |
| **All**  | 🔄 1               | 📥 GET + 📤 SET | 2              |

```
deleteDocumentVersionsFromCacheAfterTimestamp (Lua):
├── 📥 GET document:{id}:{user}        (1)
└── 📤 SET document:{id}:{user}        (1)  (with filtered versions)
Total: 2 commands, 1 round-trip
```

---

### 12.5 Quota Operations

#### 📈 **Check Quota**

| Scenario | Client Round-trips | Commands Inside | Total Commands |
| -------- | ------------------ | --------------- | -------------- |
| **All**  | 🔄 1               | 📥 GET          | 1              |

```
getUserMessageCount:
└── 📥 GET quota:{user}:{date}         (1)
Total: 1 command, 1 round-trip
```

---

#### ➕ **Increment Quota**

| Scenario         | Client Round-trips | Commands Inside       | Total Commands |
| ---------------- | ------------------ | --------------------- | -------------- |
| **First of day** | 🔄 1               | 📤 INCRBY + ⏱️ EXPIRE | 2              |
| **Subsequent**   | 🔄 1               | 📤 INCRBY             | 1              |

```
incrementUserMessageCount (INCREMENT_WITH_TTL_SCRIPT):
├── 📤 INCRBY quota:{user}:{date}      (1)
└── ⏱️ EXPIRE quota (if new key)       (0-1)
Total: 1-2 commands, 1 round-trip
```

---

### 12.6 Summary Table - All User Operations

| User Operation         | Guest Round-trips | Auth Round-trips | Guest Commands | Auth Commands |
| ---------------------- | ----------------- | ---------------- | -------------- | ------------- |
| **Open Chat (hit)**    | 1                 | 1                | 2              | 2             |
| **Open Chat (miss)**   | 1                 | 1 + 1 (bg)       | 2              | 2 + (3-6+M)   |
| **Create Empty Chat**  | 1                 | 1                | 5              | 2             |
| **New Chat + Message** | 2                 | 2                | 8-9+M          | 5-6+M         |
| **Send Message**       | 2                 | 2                | 8-9+M          | 5-6+M         |
| **Rename Chat**        | 1                 | 1                | 2              | 2             |
| **Change Visibility**  | 1                 | 1                | 2              | 2             |
| **Delete Chat**        | 1                 | 1                | 3              | 3             |
| **List Chats**         | 2                 | 0                | 2              | 0 (DB only)   |
| **Regenerate Message** | 1                 | 1                | 1              | 1             |
| **Get Message Count**  | 1                 | 1                | 1              | 1             |
| **Load Document**      | 1                 | 1                | 1              | 1             |
| **Save Document**      | 1                 | 1                | 2              | 2             |
| **Rollback Document**  | 1                 | 1                | 2              | 2             |
| **Check Quota**        | 1                 | 1                | 1              | 1             |
| **Increment Quota**    | 1                 | 1                | 1-2            | 1-2           |

> **Note:** M = number of messages being saved (typically 2: user message + assistant response)

---

### 12.7 Typical User Session Analysis

#### Scenario: User sends 5 messages in a conversation

```
Session: Guest User - New Chat with 5 message exchanges
═══════════════════════════════════════════════════════

Message 1 (creates chat):
├── createOrUpdateChatWithMessages: 1 round-trip, 6+2=8 commands
└── incrementQuota (async):          1 round-trip, 1-2 commands
Subtotal: 2 round-trips, 9-10 commands

Messages 2-5 (existing chat × 4):
├── batchUpdateChatCache × 4:        4 round-trips, (6+2)×4=32 commands
└── incrementQuota × 4 (async):      4 round-trips, 4-8 commands
Subtotal: 8 round-trips, 36-40 commands

═══════════════════════════════════════════════════════
TOTAL SESSION: 10 round-trips, 45-50 Redis commands
═══════════════════════════════════════════════════════
```

```
Session: Auth User - New Chat with 5 message exchanges
═══════════════════════════════════════════════════════

Message 1 (creates chat):
├── createOrUpdateChatWithMessages: 1 round-trip, 3+2=5 commands
└── incrementQuota (async):          1 round-trip, 1-2 commands
├── DB: INSERT chat                  (parallel)
└── DB: INSERT messages              (parallel)
Subtotal: 2 round-trips, 6-7 commands + 2 DB ops

Messages 2-5 (existing chat × 4):
├── batchUpdateChatCache × 4:        4 round-trips, (3+2)×4=20 commands
└── incrementQuota × 4 (async):      4 round-trips, 4-8 commands
├── DB: INSERT messages × 4          (parallel)
└── DB: UPDATE context × 4           (parallel)
Subtotal: 8 round-trips, 24-28 commands + 8 DB ops

═══════════════════════════════════════════════════════
TOTAL SESSION: 10 round-trips, 30-35 Redis commands + 10 DB ops
═══════════════════════════════════════════════════════
```

---

## Appendix: Quick Reference

### A. Environment Variables

```bash
CACHE_KV_REST_API_URL=https://your-redis.upstash.io
CACHE_KV_REST_API_TOKEN=your_token_here
```

### B. Import Examples

```typescript
// Core operations
import {
  getChatFromCache,
  appendMessageToCache,
  setChatInCache,
} from "@/lib/cache/operations";

// Check availability
import { isRedisAvailable } from "@/lib/cache/redis";

// Batch operations
import {
  batchUpdateChatCache,
  createOrUpdateChatWithMessages,
} from "@/lib/cache/batch-operations";

// Quota
import { incrementUserMessageCountAsync } from "@/lib/cache/quota";

// Service layer (with resilience)
import { cacheService } from "@/lib/cache/service";
```

### C. Key Pattern Examples

```
# Chat metadata
chat:550e8400-e29b-41d4-a716-446655440000:123e4567-e89b-12d3-a456-426614174000:meta

# Chat messages
chat:550e8400-e29b-41d4-a716-446655440000:123e4567-e89b-12d3-a456-426614174000:msgs

# User chat list
user:123e4567-e89b-12d3-a456-426614174000:chats

# Document
document:770e8400-e29b-41d4-a716-446655440002:123e4567-e89b-12d3-a456-426614174000

# Quota (with hash tag for clustering)
quota:{123e4567-e89b-12d3-a456-426614174000}:2025-12-01
```

---

_End of Cache Analysis Document_
