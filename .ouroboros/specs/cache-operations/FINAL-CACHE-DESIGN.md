# Final Cache Design Summary

> **Module**: Complete Cache System Reference  
> **Status**: FINAL SPECIFICATION  
> **Version**: 1.0  
> **Date**: 2024-12-21  
> **Author**: Ouroboros Architect  
> **Consolidates**: cache-operations-spec.md, cache-entities-comprehensive-analysis.md, design.md, validation-report.md

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Entity-by-Entity Final Design](#2-entity-by-entity-final-design)
3. [Key Pattern Reference](#3-key-pattern-reference)
4. [TTL Reference](#4-ttl-reference)
5. [Operation Reference](#5-operation-reference)
6. [Lua Script Reference](#6-lua-script-reference)
7. [Integration Points](#7-integration-points)
8. [Performance Targets](#8-performance-targets)
9. [Implementation Checklist](#9-implementation-checklist)

---

## 1. Executive Summary

### 1.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Features: Chat, Documents, AI, Auth                                     │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       DATA LAYER (lib/data/)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  cached-read.ts    cached-write.ts    warming.ts                        │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
            ┌───────────────────┴───────────────────┐
            ▼                                       ▼
┌─────────────────────────┐           ┌─────────────────────────┐
│   CACHE LAYER           │           │   DATABASE LAYER        │
│   (lib/cache-ops/)      │           │   (PostgreSQL/Drizzle)  │
├─────────────────────────┤           ├─────────────────────────┤
│  Upstash Redis          │           │  Source of Truth        │
│  Sub-50ms reads         │           │  (Auth users)           │
│  Lua Scripts            │           │                         │
│  Circuit Breaker        │           │                         │
└─────────────────────────┘           └─────────────────────────┘
```

### 1.2 Entity Summary

| Entity                | Data Structure                    | Change Required? | Priority |
| --------------------- | --------------------------------- | ---------------- | -------- |
| **Messages**          | ZSET (timestamp + role offset)    | ❌ No            | —        |
| **Chat Metadata**     | STRING (JSON)                     | ❌ No            | —        |
| **User Chat List**    | ZSET (updatedAt score)            | ❌ No            | —        |
| **Documents**         | **ZSET Hybrid** (meta + versions) | ✅ YES           | 🔴 HIGH  |
| **Quota**             | STRING (atomic counter)           | ❌ No            | —        |
| **Sessions**          | STRING (JSON)                     | ❌ No            | —        |
| **Typing Indicators** | SET → **ZSET** (optional)         | ⚠️ Optional      | 🟡 LOW   |

### 1.3 Key Metrics

| Metric                 | Target |
| ---------------------- | ------ |
| Cache Hit Rate         | > 90%  |
| Cache Hit Latency      | < 10ms |
| Cache Miss + DB        | < 50ms |
| Lua Script Execution   | < 15ms |
| Memory per Active User | ~55KB  |

---

## 2. Entity-by-Entity Final Design

---

### 2.1 Messages

#### Data Structure

```redis
Key: chat:{chatId}:{userId}:msgs
Type: ZSET
Score: timestamp_ms + (role_offset × 100) / 1,000,000
Member: JSON-encoded CachedMessage (~800 bytes avg)
```

#### Type Definition

```typescript
type CachedMessage = {
  id: string; // UUID
  chatId: string; // Parent chat
  role: "user" | "assistant" | "system";
  parts: MessagePart[];
  attachments?: Attachment[];
  createdAt: number; // Unix timestamp ms
};
```

#### Key Pattern

```
chat:{chatId}:{userId}:msgs
Example: chat:abc123:user456:msgs
```

#### TTL Values

| User Type     | TTL                  | Rationale                 |
| ------------- | -------------------- | ------------------------- |
| Guest         | 7 days (604,800s)    | Matches session expiry    |
| Authenticated | 30 days (2,592,000s) | Prevents unbounded growth |

#### Score Calculation (Role Offset)

```typescript
const ROLE_ORDER = { system: 0, user: 1, assistant: 2 };

function getMessageScore(createdAt: number, role: string): number {
  const roleOffset = (ROLE_ORDER[role] ?? 1) * 100;
  return createdAt + roleOffset / 1_000_000;
}

// Examples (same timestamp 1703174400000):
// system:    1703174400000.000000
// user:      1703174400000.000100
// assistant: 1703174400000.000200
```

#### Core Operations

| Operation              | Redis Command            | Complexity   | Lua Script               |
| ---------------------- | ------------------------ | ------------ | ------------------------ |
| Check quota            | GET quota key            | O(1)         | No                       |
| Append single          | ZADD                     | O(log N)     | `APPEND_MESSAGE_SCRIPT`  |
| Append batch           | ZADD (multiple)          | O(M log N)   | `APPEND_MESSAGES_SCRIPT` |
| Get latest N           | ZRANGE -N -1             | O(log N + M) | No                       |
| Get all                | ZRANGE 0 -1              | O(N)         | No                       |
| Delete after timestamp | ZREMRANGEBYSCORE ts +inf | O(log N + M) | No                       |
| Count                  | ZCARD                    | O(1)         | No                       |
| Fork/branch            | ZRANGEBYSCORE + ZADD     | O(log N + M) | `FORK_CHAT_SCRIPT`       |

> **⚠️ IMPORTANT**: Caller MUST check quota BEFORE calling append operations.
> Use `checkQuota()` to verify user hasn't exceeded daily/hourly limits.
> The append scripts do NOT check quota internally for performance reasons.

#### Why ZSET is Optimal

- ✅ Selective fetch (`ZRANGE -50 -1`) saves 80% bandwidth
- ✅ O(log N + M) range delete for regeneration/branching
- ✅ Role offset ensures deterministic ordering
- ✅ ZCARD gives O(1) count
- ❌ LIST rejected: O(N) deletion unacceptable
- ❌ Streams rejected: XTRIM doesn't support timestamp-based deletion

---

### 2.2 Chat Metadata

#### Data Structure

```redis
Key: chat:{chatId}:{userId}:meta
Type: STRING
Value: JSON-encoded CachedChatMeta (~400 bytes)
```

#### Type Definition

```typescript
type CachedChatMeta = {
  id: string; // UUID
  userId: string; // Owner
  title: string; // 20-100 bytes
  visibility: "public" | "private";
  createdAt: number; // Unix timestamp ms
  updatedAt: number; // Unix timestamp ms
  lastContext?: {
    // NESTED object
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalCost: number;
    timestamp: string;
  };
  version: number; // Optimistic locking
};
```

#### Key Pattern

```
chat:{chatId}:{userId}:meta
Example: chat:abc123:user456:meta
```

#### TTL Values

| User Type     | TTL                  | Rationale                 |
| ------------- | -------------------- | ------------------------- |
| Guest         | 7 days (604,800s)    | Matches session expiry    |
| Authenticated | 30 days (2,592,000s) | Prevents unbounded growth |

#### Core Operations

| Operation         | Redis Command               | Complexity | Lua Script               |
| ----------------- | --------------------------- | ---------- | ------------------------ |
| Get               | GET                         | O(1)       | No                       |
| Create            | SET                         | O(1)       | No (Pipeline)            |
| Update title      | GET + decode + encode + SET | O(1)       | `UPDATE_METADATA_SCRIPT` |
| Update visibility | GET + decode + encode + SET | O(1)       | `UPDATE_METADATA_SCRIPT` |
| Delete            | DEL                         | O(1)       | `DELETE_CHAT_SCRIPT`     |

#### Why STRING is Optimal

- ✅ `lastContext` is nested object — HASH can't handle natively
- ✅ 95% of operations read full object
- ✅ Lower memory overhead than HASH
- ❌ HASH rejected: Can't store nested objects without JSON encoding

---

### 2.3 User Chat List

#### Data Structure

```redis
Key: user:{userId}:chats
Type: ZSET
Score: updatedAt (Unix timestamp ms)
Member: chatId (string, ~36 bytes)
```

#### Key Pattern

```
user:{userId}:chats
Example: user:user456:chats
```

#### TTL Values

| User Type     | TTL                  | Rationale                 |
| ------------- | -------------------- | ------------------------- |
| Guest         | 7 days (604,800s)    | Matches session expiry    |
| Authenticated | 30 days (2,592,000s) | Prevents unbounded growth |

#### Core Operations

| Operation    | Redis Command                           | Complexity   | Lua Script             |
| ------------ | --------------------------------------- | ------------ | ---------------------- |
| Get recent N | ZREVRANGE 0 N-1                         | O(log N + M) | No                     |
| Paginated    | ZREVRANGEBYSCORE (cursor -inf LIMIT 0 N | O(log N + M) | No                     |
| Add/update   | ZADD                                    | O(log N)     | No (in message script) |
| Remove       | ZREM                                    | O(log N)     | `DELETE_CHAT_SCRIPT`   |
| Count        | ZCARD                                   | O(1)         | No                     |

#### Why ZSET is Optimal

- ✅ Natural ordering by updatedAt
- ✅ ZREVRANGE with LIMIT for pagination
- ✅ ZADD updates position atomically on chat activity
- ❌ LIST rejected: Can't re-sort on update

---

### 2.4 Documents (ZSET Hybrid) 🔴 REQUIRES CHANGE

#### Data Structure (NEW DESIGN)

```redis
# Metadata (small, rarely changes)
Key: doc:{userId}:{docId}:meta
Type: STRING
Value: JSON CachedDocumentMeta (~120 bytes)

# Versions (ordered, selectively fetchable)
Key: doc:{userId}:{docId}:versions
Type: ZSET
Score: timestamp (ms)
Member: JSON CachedDocumentVersion (~3KB avg)
```

> **⚠️ Note**: Key pattern is `doc:{userId}:{docId}:*` — userId FIRST for IDOR protection.

#### Type Definitions

```typescript
type CachedDocumentMeta = {
  id: string;
  userId: string;
  chatId?: string;
  kind: "text" | "code" | "image" | "sheet";
  createdAt: number;
  updatedAt: number;
};

type CachedDocumentVersion = {
  title: string;
  content: string | null;
  createdAt: number;
};
```

#### Key Patterns

```
doc:{userId}:{docId}:meta
doc:{userId}:{docId}:versions
Examples:
  doc:user456:doc789:meta
  doc:user456:doc789:versions
```

#### TTL Values

| User Type     | TTL                  | Rationale                 |
| ------------- | -------------------- | ------------------------- |
| Guest         | 7 days (604,800s)    | Matches session expiry    |
| Authenticated | 30 days (2,592,000s) | Prevents unbounded growth |

#### Core Operations

| Operation          | Redis Command                    | Complexity   | Lua Script                            |
| ------------------ | -------------------------------- | ------------ | ------------------------------------- |
| Create             | SET meta + ZADD versions         | O(1) + O(1)  | Pipeline                              |
| Get latest version | GET meta + ZRANGE -1 -1          | O(1) + O(1)  | No                                    |
| Get all versions   | GET meta + ZRANGE 0 -1           | O(1) + O(N)  | No                                    |
| Append version     | ZADD versions                    | O(log N)     | `APPEND_DOCUMENT_VERSION_ZSET_SCRIPT` |
| Delete after ts    | ZREMRANGEBYSCORE                 | O(log N + M) | No                                    |
| Prune old          | ZREMRANGEBYRANK 0 -(keepCount+1) | O(log N + M) | No                                    |
| List user docs     | ZREVRANGE user:{userId}:docs     | O(log N + M) | No                                    |

#### Bandwidth Savings (Why Change is Required)

| Operation                 | Old STRING          | New ZSET Hybrid | Savings |
| ------------------------- | ------------------- | --------------- | ------- |
| Get latest (60% of reads) | 150 KB (50×3KB)     | 3 KB            | **98%** |
| Get last 3 (25% of reads) | 150 KB              | 9 KB            | **94%** |
| Append version            | 303 KB (read+write) | 3 KB            | **99%** |

**Average operation savings: ~90% bandwidth reduction**

---

### 2.5 Quota (Rate Limiting)

#### Data Structure

```redis
Key: quota:{userId}:YYYY-MM-DD
Type: STRING
Value: Integer (message count)
```

#### Key Patterns

```
# Daily quota
quota:{userId}:YYYY-MM-DD
Example: quota:user456:2024-12-21

# Hourly quota (burst protection)
quota:{userId}:hour:YYYY-MM-DD-HH
Example: quota:user456:hour:2024-12-21-14
```

> **Note**: No hash tags needed for Upstash (single-node). Key format uses simple `userId` without curly braces.

#### TTL Values

| Type   | TTL                | Rationale                     |
| ------ | ------------------ | ----------------------------- |
| Daily  | 25 hours (90,000s) | Daily reset + timezone buffer |
| Hourly | 1 hour (3,600s)    | Hour boundary + buffer        |

#### Core Operations

| Operation | Redis Command   | Complexity | Lua Script               |
| --------- | --------------- | ---------- | ------------------------ |
| Get count | GET             | O(1)       | No                       |
| Increment | INCRBY + EXPIRE | O(1)       | `INCREMENT_QUOTA_SCRIPT` |
| Reset     | DEL             | O(1)       | No                       |

#### Why STRING is Optimal

- ✅ O(1) for all operations
- ✅ Atomic INCRBY
- ✅ Natural TTL expiration for auto-reset
- ✅ Smallest possible memory footprint

---

### 2.6 Sessions

#### Data Structure

```redis
Key: session:{sessionId}
Type: STRING
Value: JSON CachedSession (~500 bytes)
```

#### Type Definition

```typescript
type CachedSession = {
  userId: string;
  type: "guest" | "regular";
  email?: string;
  expiresAt: number;
};
```

#### Key Pattern

```
session:{sessionId}
Example: session:sess_abc123xyz
```

#### TTL Values

| User Type     | TTL                | Rationale                |
| ------------- | ------------------ | ------------------------ |
| Guest         | 7 days (604,800s)  | Matches session cookie   |
| Authenticated | 24 hours (86,400s) | Security - force re-auth |

#### Core Operations

| Operation   | Redis Command | Complexity | Lua Script |
| ----------- | ------------- | ---------- | ---------- |
| Get         | GET           | O(1)       | No         |
| Set         | SET EX        | O(1)       | No         |
| Delete      | DEL           | O(1)       | No         |
| Refresh TTL | EXPIRE        | O(1)       | No         |

---

### 2.7 Typing Indicators (Optional ZSET Upgrade)

#### Current Design (SET)

```redis
Key: typing:{chatId}:{userId}
Type: STRING (with TTL)
Value: "1"
TTL: 5 seconds
```

#### Recommended Design (ZSET) ⚠️ OPTIONAL

```redis
Key: typing:{chatId}
Type: ZSET
Score: timestamp (ms) when started typing
Member: userId
TTL: 60 seconds (backup)
```

#### Why ZSET is Better (When Showing Usernames)

| Aspect           | Current SET           | Recommended ZSET           |
| ---------------- | --------------------- | -------------------------- |
| Per-user expiry  | ❌ Key-level only     | ✅ Score-based filtering   |
| Accuracy         | Low (false positives) | High                       |
| Get typing users | SCAN O(N) on keyspace | ZRANGEBYSCORE O(log N + M) |

#### When to Upgrade

- **Keep SET if**: Just showing "Someone is typing..."
- **Switch to ZSET if**: Showing "Alice, Bob are typing..."

#### Core Operations (ZSET Pattern)

| Operation  | Redis Command                 | Complexity   | Lua Script               |
| ---------- | ----------------------------- | ------------ | ------------------------ |
| Set typing | ZADD + ZREMRANGEBYSCORE       | O(log N)     | `SET_TYPING_ZSET_SCRIPT` |
| Get typing | ZRANGEBYSCORE (now-5000) +inf | O(log N + M) | No                       |

---

## 3. Key Pattern Reference

### 3.1 Complete Key Patterns

```typescript
export const CacheKeys = {
  // ═══════════════════════════════════════════════════════════════
  // CHAT KEYS (namespaced by userId for IDOR protection)
  // ═══════════════════════════════════════════════════════════════

  /** Chat metadata: chat:{chatId}:{userId}:meta */
  chatMeta: (chatId: string, userId: string) => `chat:${chatId}:${userId}:meta`,

  /** Chat messages ZSET: chat:{chatId}:{userId}:msgs */
  chatMessages: (chatId: string, userId: string) =>
    `chat:${chatId}:${userId}:msgs`,

  // ═══════════════════════════════════════════════════════════════
  // USER KEYS (user-level aggregations)
  // ═══════════════════════════════════════════════════════════════

  /** User's chat list ZSET: user:{userId}:chats */
  userChats: (userId: string) => `user:${userId}:chats`,

  /** User session: session:{sessionId} */
  session: (sessionId: string) => `session:${sessionId}`,

  // ═══════════════════════════════════════════════════════════════
  // DOCUMENT KEYS (ZSET Hybrid - userId FIRST for IDOR protection)
  // ═══════════════════════════════════════════════════════════════

  /** Document metadata: doc:{userId}:{docId}:meta */
  documentMeta: (userId: string, documentId: string) =>
    `doc:${userId}:${documentId}:meta`,

  /** Document versions ZSET: doc:{userId}:{docId}:versions */
  documentVersions: (userId: string, documentId: string) =>
    `doc:${userId}:${documentId}:versions`,

  /** User's document list: user:{userId}:docs */
  userDocuments: (userId: string) => `user:${userId}:docs`,

  // ═══════════════════════════════════════════════════════════════
  // QUOTA KEYS (no hash tags needed for Upstash single-node)
  // ═══════════════════════════════════════════════════════════════

  /** Daily quota: quota:{userId}:YYYY-MM-DD */
  quota: (userId: string, date: string) => `quota:${userId}:${date}`,

  /** Hourly quota: quota:{userId}:hour:YYYY-MM-DD-HH */
  quotaHourly: (userId: string, dateHour: string) =>
    `quota:${userId}:hour:${dateHour}`,

  // ═══════════════════════════════════════════════════════════════
  // REAL-TIME KEYS (ephemeral)
  // ═══════════════════════════════════════════════════════════════

  /** Typing indicator (SET pattern): typing:{chatId}:{userId} */
  typing: (chatId: string, userId: string) => `typing:${chatId}:${userId}`,

  /** Typing indicator (ZSET pattern): typing:{chatId} */
  typingZset: (chatId: string) => `typing:${chatId}`,

  /** User online status: online:{userId} */
  online: (userId: string) => `online:${userId}`,

  /** Active users in chat: chat:{chatId}:active */
  chatActiveUsers: (chatId: string) => `chat:${chatId}:active`,
} as const;
```

### 3.2 Key Examples

| Entity             | Key Pattern                         | Example                            |
| ------------------ | ----------------------------------- | ---------------------------------- |
| Chat metadata      | `chat:{chatId}:{userId}:meta`       | `chat:abc123:user456:meta`         |
| Chat messages      | `chat:{chatId}:{userId}:msgs`       | `chat:abc123:user456:msgs`         |
| User chat list     | `user:{userId}:chats`               | `user:user456:chats`               |
| Document metadata  | `doc:{userId}:{docId}:meta`         | `doc:user456:doc789:meta`          |
| Document versions  | `doc:{userId}:{docId}:versions`     | `doc:user456:doc789:versions`      |
| User document list | `user:{userId}:docs`                | `user:user456:docs`                |
| Daily quota        | `quota:{userId}:YYYY-MM-DD`         | `quota:user456:2024-12-21`         |
| Hourly quota       | `quota:{userId}:hour:YYYY-MM-DD-HH` | `quota:user456:hour:2024-12-21-14` |
| Session            | `session:{sessionId}`               | `session:sess_abc123xyz`           |
| Typing (SET)       | `typing:{chatId}:{userId}`          | `typing:abc123:user456`            |
| Typing (ZSET)      | `typing:{chatId}`                   | `typing:abc123`                    |
| Online status      | `online:{userId}`                   | `online:user456`                   |

---

## 4. TTL Reference

### 4.1 TTL Constants

```typescript
export const TTL = {
  // ═══════════════════════════════════════════════════════════════
  // GUEST USER TTLs (Auto-cleanup)
  // ═══════════════════════════════════════════════════════════════

  /** Guest chat/message data: 7 days */
  GUEST_DATA: 7 * 24 * 60 * 60, // 604,800 seconds

  /** Guest quota counter: 25 hours (timezone buffer) */
  GUEST_QUOTA: 25 * 60 * 60, // 90,000 seconds

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATED USER TTLs (Prevents unbounded memory growth)
  // ═══════════════════════════════════════════════════════════════

  /** Auth chat data: 30 days */
  AUTH_CHAT_DATA: 30 * 24 * 60 * 60, // 2,592,000 seconds

  /** Auth session: 24 hours (security) */
  AUTH_SESSION: 24 * 60 * 60, // 86,400 seconds

  /** Active chat cache (hot data): 24 hours */
  AUTH_CHAT_ACTIVE: 24 * 60 * 60, // 86,400 seconds

  /** Inactive chat cache: 4 hours */
  AUTH_CHAT_INACTIVE: 4 * 60 * 60, // 14,400 seconds

  /** Document cache: 30 days */
  DOCUMENT: 30 * 24 * 60 * 60, // 2,592,000 seconds

  /** User chat list: 30 days */
  USER_CHAT_LIST: 30 * 24 * 60 * 60, // 2,592,000 seconds

  // ═══════════════════════════════════════════════════════════════
  // REAL-TIME TTLs (Short-lived)
  // ═══════════════════════════════════════════════════════════════

  /** Typing indicator: 5 seconds */
  TYPING_INDICATOR: 5,

  /** Online status: 60 seconds */
  ONLINE_STATUS: 60,

  /** Active users in chat: 30 seconds */
  CHAT_ACTIVE_USERS: 30,

  // ═══════════════════════════════════════════════════════════════
  // SESSION TTLs
  // ═══════════════════════════════════════════════════════════════

  /** Session cache: 1 hour */
  SESSION: 60 * 60, // 3,600 seconds
} as const;
```

### 4.2 Complete TTL Matrix

| Entity             | Guest TTL | Auth TTL | Rationale                                             |
| ------------------ | --------- | -------- | ----------------------------------------------------- |
| Chat Metadata      | 7 days    | 30 days  | Guest matches session; auth prevents unbounded growth |
| Chat Messages      | 7 days    | 30 days  | Same as metadata                                      |
| User Chat List     | 7 days    | 30 days  | Pagination ordering                                   |
| Document Metadata  | 7 days    | 30 days  | Versioned content                                     |
| Document Versions  | 7 days    | 30 days  | Same as metadata                                      |
| User Document List | 7 days    | 30 days  | Same as chat list                                     |
| Session            | 7 days    | 24 hours | Security: shorter for auth                            |
| Daily Quota        | 25 hours  | 25 hours | Daily reset + TZ buffer                               |
| Hourly Quota       | 1 hour    | 1 hour   | Hour boundary + buffer                                |
| Typing Indicator   | 5 sec     | 5 sec    | Ephemeral                                             |
| Online Status      | 60 sec    | 60 sec   | Heartbeat refresh                                     |
| Active Users       | 30 sec    | 30 sec   | Short-lived presence                                  |

### 4.3 TTL Helper Function

```typescript
/**
 * Returns TTL value based on user type
 * - Guest users: TTL.GUEST_DATA (7 days)
 * - Auth users: TTL.AUTH_CHAT_DATA (30 days)
 */
export function getTTLForUser(userId: string): number {
  return isGuestUserId(userId) ? TTL.GUEST_DATA : TTL.AUTH_CHAT_DATA;
}

/**
 * For Lua scripts: returns 0 for no TTL (auth), or TTL value (guest)
 * Auth users still have 30-day TTL set via pipeline
 */
export function applyGuestTTL(userId: string): number {
  return isGuestUserId(userId) ? TTL.GUEST_DATA : 0;
}
```

---

## 5. Operation Reference

### 5.1 Chat Operations

| Operation         | Function                      | Redis Command(s)          | Complexity      | Lua Script               |
| ----------------- | ----------------------------- | ------------------------- | --------------- | ------------------------ |
| Create chat       | `createChatInCache`           | SET meta + ZADD userChats | O(1) + O(log N) | Pipeline                 |
| Get chat          | `getChatFromCache`            | GET meta + ZRANGE msgs    | O(1) + O(N)     | No (parallel)            |
| Get chat meta     | `getChatMetaFromCache`        | GET meta                  | O(1)            | No                       |
| List user chats   | `getUserChatsFromCache`       | ZREVRANGE userChats       | O(log N + M)    | No                       |
| Update title      | `updateChatTitleInCache`      | EVAL                      | O(1)            | `UPDATE_METADATA_SCRIPT` |
| Update visibility | `updateChatVisibilityInCache` | EVAL                      | O(1)            | `UPDATE_METADATA_SCRIPT` |
| Delete chat       | `deleteChatFromCache`         | DEL + ZREM                | O(1) + O(log N) | `DELETE_CHAT_SCRIPT`     |

### 5.2 Message Operations

| Operation       | Function                       | Redis Command(s) | Complexity   | Lua Script               |
| --------------- | ------------------------------ | ---------------- | ------------ | ------------------------ |
| Append message  | `appendMessageToCache`         | EVAL             | O(log N)     | `APPEND_MESSAGE_SCRIPT`  |
| Append batch    | `appendMessagesToCache`        | EVAL             | O(M log N)   | `APPEND_MESSAGES_SCRIPT` |
| Get latest N    | `getMessagesFromCache`         | ZRANGE -N -1     | O(log N + M) | No                       |
| Get all         | `getMessagesFromCache`         | ZRANGE 0 -1      | O(N)         | No                       |
| Paginate before | `getMessagesFromCache`         | ZREVRANGEBYSCORE | O(log N + M) | No                       |
| Delete after ts | `deleteMessagesAfterTimestamp` | ZREMRANGEBYSCORE | O(log N + M) | No                       |
| Fork chat       | `forkChatInCache`              | EVAL             | O(M log N)   | `FORK_CHAT_SCRIPT`       |

### 5.3 Document Operations (ZSET Hybrid)

| Operation        | Function                               | Redis Command(s)           | Complexity   | Lua Script                  |
| ---------------- | -------------------------------------- | -------------------------- | ------------ | --------------------------- |
| Create document  | `createDocumentInCache`                | SET meta + ZADD versions   | O(1) + O(1)  | Pipeline                    |
| Get latest       | `getDocumentLatestFromCache`           | GET meta + ZRANGE -1 -1    | O(1) + O(1)  | No                          |
| Get all versions | `getDocumentAllVersionsFromCache`      | GET meta + ZRANGE 0 -1     | O(1) + O(N)  | No                          |
| Append version   | `appendDocumentVersionToCache`         | EVAL                       | O(log N)     | `APPEND_DOC_VERSION_SCRIPT` |
| Fork document    | `forkDocumentInCache`                  | EVAL                       | O(M)         | `FORK_DOCUMENT_SCRIPT`      |
| Delete after ts  | `deleteDocumentVersionsAfterTimestamp` | ZREMRANGEBYSCORE           | O(log N + M) | No                          |
| Prune old        | `pruneDocumentVersions`                | ZREMRANGEBYRANK            | O(log N + M) | No                          |
| List user docs   | `getUserDocumentsFromCache`            | ZREVRANGE + GET (pipeline) | O(log N + K) | No                          |

### 5.4 Quota Operations

| Operation    | Function                    | Redis Command(s) | Complexity | Lua Script               |
| ------------ | --------------------------- | ---------------- | ---------- | ------------------------ |
| Check quota  | `checkQuota`                | GET              | O(1)       | No                       |
| Increment    | `incrementUserMessageCount` | EVAL             | O(1)       | `INCREMENT_QUOTA_SCRIPT` |
| Check hourly | `checkHourlyLimit`          | GET              | O(1)       | No                       |
| Reset        | `resetUserQuota`            | DEL              | O(1)       | No                       |

### 5.5 Session Operations

| Operation      | Function                 | Redis Command(s) | Complexity | Lua Script |
| -------------- | ------------------------ | ---------------- | ---------- | ---------- |
| Get session    | `getSessionFromCache`    | GET              | O(1)       | No         |
| Set session    | `setSessionInCache`      | SET EX           | O(1)       | No         |
| Delete session | `deleteSessionFromCache` | DEL              | O(1)       | No         |

### 5.6 Real-time Operations

| Operation         | Function                 | Redis Command(s) | Complexity    | Lua Script               |
| ----------------- | ------------------------ | ---------------- | ------------- | ------------------------ |
| Set typing (SET)  | `setTypingIndicator`     | SET EX 5         | O(1)          | No                       |
| Get typing (SET)  | `getTypingUsers`         | SCAN MATCH       | O(N) keyspace | No                       |
| Set typing (ZSET) | `setTypingIndicatorZset` | EVAL             | O(log N)      | `SET_TYPING_ZSET_SCRIPT` |
| Get typing (ZSET) | `getTypingUsersZset`     | ZRANGEBYSCORE    | O(log N + M)  | No                       |
| Set online        | `setUserOnline`          | SET EX 60        | O(1)          | No                       |
| Is online         | `isUserOnline`           | EXISTS           | O(1)          | No                       |
| Add active        | `addActiveChatUser`      | SADD + EXPIRE    | O(1)          | No                       |
| Get active        | `getActiveChatUsers`     | SMEMBERS         | O(N)          | No                       |

---

## 6. Lua Script Reference

### 6.1 Script Summary

| Script                         | Purpose                                     | Keys                                          | Args                                                                |
| ------------------------------ | ------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------- |
| `APPEND_MESSAGE_SCRIPT`        | Append single message atomically            | metaKey, msgsKey, userChatsKey                | messageJson, now, score, chatId, msgScore, ttl                      |
| `APPEND_MESSAGES_SCRIPT`       | Batch append messages                       | metaKey, msgsKey, userChatsKey                | now, score, chatId, count, ttl, [score, msg]\*                      |
| `UPDATE_METADATA_SCRIPT`       | Update chat metadata fields                 | metaKey                                       | updatesJson, now                                                    |
| `DELETE_CHAT_SCRIPT`           | Delete chat and clean user list             | metaKey, msgsKey, userChatsKey                | chatId                                                              |
| `DELETE_ALL_USER_CHATS_SCRIPT` | Delete all user's chats                     | userChatsKey                                  | userId                                                              |
| `INCREMENT_QUOTA_SCRIPT`       | Atomic increment with limit check           | quotaKey                                      | delta, ttl, limit → returns {accepted, count, limit}                |
| `UPSERT_CHAT_SCRIPT`           | Create or update chat                       | metaKey, msgsKey, userChatsKey                | newMetaJson, score, chatId, count, updatesJson, ttl, [score, msg]\* |
| `FORK_CHAT_SCRIPT`             | Fork chat from timestamp (preserves scores) | srcMeta, srcMsgs, newMeta, newMsgs, userChats | newChatId, forkTs, now, ttl                                         |
| `FORK_DOCUMENT_SCRIPT`         | Fork document versions (artifact branching) | srcVersions, tgtVersions                      | fromScore, ttl → returns count                                      |
| `APPEND_DOC_VERSION_SCRIPT`    | Append document version                     | metaKey, versionsKey, userDocsKey             | versionJson, timestamp, docId, ttl                                  |
| `SET_TYPING_ZSET_SCRIPT`       | Set typing with cleanup                     | typingKey                                     | userId, now, expiryWindow                                           |

### 6.2 Complete Lua Scripts

```typescript
// lib/cache-ops/scripts.ts

/**
 * APPEND_MESSAGE_SCRIPT
 * Atomic: verify chat exists → append message → update meta → update user list → apply TTL
 */
export const APPEND_MESSAGE_SCRIPT = `
local metaKey = KEYS[1]
local msgsKey = KEYS[2]
local userChatsKey = KEYS[3]

local meta = redis.call('GET', metaKey)
if not meta then return 0 end

redis.call('ZADD', msgsKey, tonumber(ARGV[5]), ARGV[1])

local data = cjson.decode(meta)
data.updatedAt = ARGV[2]
data.version = (data.version or 0) + 1
redis.call('SET', metaKey, cjson.encode(data))

redis.call('ZADD', userChatsKey, tonumber(ARGV[3]), ARGV[4])

local ttl = tonumber(ARGV[6])
if ttl > 0 then
  redis.call('EXPIRE', metaKey, ttl)
  redis.call('EXPIRE', msgsKey, ttl)
  redis.call('EXPIRE', userChatsKey, ttl)
end

return 1
`;

/**
 * APPEND_MESSAGES_SCRIPT (Batch)
 * Same as above but for multiple messages
 */
export const APPEND_MESSAGES_SCRIPT = `
local metaKey = KEYS[1]
local msgsKey = KEYS[2]
local userChatsKey = KEYS[3]

local meta = redis.call('GET', metaKey)
if not meta then return 0 end

local msgCount = tonumber(ARGV[4])
for i = 6, 6 + (msgCount * 2) - 1, 2 do
  redis.call('ZADD', msgsKey, tonumber(ARGV[i]), ARGV[i + 1])
end

local data = cjson.decode(meta)
data.updatedAt = ARGV[1]
data.version = (data.version or 0) + 1
redis.call('SET', metaKey, cjson.encode(data))

redis.call('ZADD', userChatsKey, tonumber(ARGV[2]), ARGV[3])

local ttl = tonumber(ARGV[5])
if ttl > 0 then
  redis.call('EXPIRE', metaKey, ttl)
  redis.call('EXPIRE', msgsKey, ttl)
  redis.call('EXPIRE', userChatsKey, ttl)
end

return 1
`;

/**
 * UPDATE_METADATA_SCRIPT
 * Atomic metadata field update
 */
export const UPDATE_METADATA_SCRIPT = `
local meta = redis.call('GET', KEYS[1])
if not meta then return nil end

local data = cjson.decode(meta)
local updates = cjson.decode(ARGV[1])

for k, v in pairs(updates) do
  data[k] = v
end
data.updatedAt = ARGV[2]
data.version = (data.version or 0) + 1

redis.call('SET', KEYS[1], cjson.encode(data))
return cjson.encode(data)
`;

/**
 * DELETE_CHAT_SCRIPT
 * Atomic chat deletion
 */
export const DELETE_CHAT_SCRIPT = `
redis.call('DEL', KEYS[1])
redis.call('DEL', KEYS[2])
redis.call('ZREM', KEYS[3], ARGV[1])
return 1
`;

/**
 * DELETE_ALL_USER_CHATS_SCRIPT
 * Delete all chats for a user
 * KEYS[1] = user:{userId}:chats
 * ARGV[1] = userId
 */
export const DELETE_ALL_USER_CHATS_SCRIPT = `
local userChatsKey = KEYS[1]
local userId = ARGV[1]

local chatIds = redis.call('ZRANGE', userChatsKey, 0, -1)
for _, chatId in ipairs(chatIds) do
  redis.call('DEL', 'chat:' .. chatId .. ':' .. ARGV[1] .. ':meta')
  redis.call('DEL', 'chat:' .. chatId .. ':' .. ARGV[1] .. ':msgs')
end

redis.call('DEL', userChatsKey)
return #chatIds
`;

/**
 * INCREMENT_QUOTA_SCRIPT
 * Atomic increment with TTL on first increment AND limit check
 * KEYS[1] = quota key
 * ARGV[1] = increment amount
 * ARGV[2] = ttl
 * ARGV[3] = limit (max allowed)
 * Returns: { accepted (0/1), newCount, limit }
 */
export const INCREMENT_QUOTA_SCRIPT = `
local key = KEYS[1]
local delta = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

local current = tonumber(redis.call('GET', key) or '0')

-- Check if already at or over limit
if current >= limit then
  return { 0, current, limit }  -- rejected
end

local newCount = redis.call('INCRBY', key, delta)

-- Set TTL on first increment or if key had no TTL
if current == 0 or redis.call('TTL', key) == -1 then
  redis.call('EXPIRE', key, ttl)
end

return { 1, newCount, limit }  -- accepted
`;

/**
 * UPSERT_CHAT_SCRIPT
 * Create or update chat with messages
 */
export const UPSERT_CHAT_SCRIPT = `
local metaKey = KEYS[1]
local msgsKey = KEYS[2]
local userChatsKey = KEYS[3]

local existingMeta = redis.call('GET', metaKey)
local msgCount = tonumber(ARGV[4])
local ttl = tonumber(ARGV[6])

if existingMeta then
  local data = cjson.decode(existingMeta)
  local updates = cjson.decode(ARGV[5])
  for k, v in pairs(updates) do data[k] = v end
  data.version = (data.version or 0) + 1
  redis.call('SET', metaKey, cjson.encode(data))
else
  redis.call('SET', metaKey, ARGV[1])
end

for i = 7, 7 + (msgCount * 2) - 1, 2 do
  redis.call('ZADD', msgsKey, tonumber(ARGV[i]), ARGV[i + 1])
end

redis.call('ZADD', userChatsKey, tonumber(ARGV[2]), ARGV[3])

if ttl > 0 then
  redis.call('EXPIRE', metaKey, ttl)
  redis.call('EXPIRE', msgsKey, ttl)
  redis.call('EXPIRE', userChatsKey, ttl)
end

return existingMeta and "updated" or "created"
`;

/**
 * FORK_CHAT_SCRIPT
 * Fork conversation from timestamp, preserving original scores (with role offset baked in)
 * KEYS[1] = source meta key, KEYS[2] = source msgs key
 * KEYS[3] = target meta key, KEYS[4] = target msgs key, KEYS[5] = user chats key
 * ARGV[1] = newChatId, ARGV[2] = forkTimestamp, ARGV[3] = now, ARGV[4] = ttl
 */
export const FORK_CHAT_SCRIPT = `
local srcMeta = redis.call('GET', KEYS[1])
if not srcMeta then return nil end

-- Get messages with their scores (scores already include role offset)
local messagesWithScores = redis.call('ZRANGEBYSCORE', KEYS[2], '-inf', ARGV[2], 'WITHSCORES')

local data = cjson.decode(srcMeta)
data.id = ARGV[1]
data.title = data.title .. " (Fork)"
data.createdAt = ARGV[3]
data.updatedAt = ARGV[3]
data.version = 1
redis.call('SET', KEYS[3], cjson.encode(data))

-- Preserve original scores (they already have role offset baked in)
for i = 1, #messagesWithScores, 2 do
  local msg = messagesWithScores[i]
  local score = messagesWithScores[i + 1]
  local msgData = cjson.decode(msg)
  msgData.chatId = ARGV[1]
  redis.call('ZADD', KEYS[4], score, cjson.encode(msgData))
end

redis.call('ZADD', KEYS[5], tonumber(ARGV[3]), ARGV[1])

local ttl = tonumber(ARGV[4])
if ttl > 0 then
  redis.call('EXPIRE', KEYS[3], ttl)
  redis.call('EXPIRE', KEYS[4], ttl)
end

return cjson.encode(data)
`;

/**
 * APPEND_DOCUMENT_VERSION_ZSET_SCRIPT
 * Append document version with ZSET hybrid pattern
 */
export const APPEND_DOCUMENT_VERSION_ZSET_SCRIPT = `
local metaKey = KEYS[1]
local versionsKey = KEYS[2]
local userDocsKey = KEYS[3]

local meta = redis.call('GET', metaKey)
if not meta then return 0 end

local timestamp = tonumber(ARGV[2])
redis.call('ZADD', versionsKey, timestamp, ARGV[1])

local data = cjson.decode(meta)
data.updatedAt = timestamp
redis.call('SET', metaKey, cjson.encode(data))

redis.call('ZADD', userDocsKey, timestamp, ARGV[3])

local ttl = tonumber(ARGV[4])
if ttl > 0 then
  redis.call('EXPIRE', metaKey, ttl)
  redis.call('EXPIRE', versionsKey, ttl)
end

return 1
`;

/**
 * FORK_DOCUMENT_SCRIPT
 * Fork document versions from one document to another (for artifact branching)
 * KEYS[1] = source versions key (doc:{userId}:{srcDocId}:versions)
 * KEYS[2] = target versions key (doc:{userId}:{newDocId}:versions)
 * ARGV[1] = from_score (timestamp - copy versions up to this point)
 * ARGV[2] = ttl
 * Returns: number of versions copied
 */
export const FORK_DOCUMENT_SCRIPT = `
local srcVersionsKey = KEYS[1]
local tgtVersionsKey = KEYS[2]
local fromScore = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local versions = redis.call('ZRANGEBYSCORE', srcVersionsKey, 0, fromScore, 'WITHSCORES')

for i = 1, #versions, 2 do
  redis.call('ZADD', tgtVersionsKey, versions[i + 1], versions[i])
end

if ttl > 0 then
  redis.call('EXPIRE', tgtVersionsKey, ttl)
end

return #versions / 2
`;

/**
 * SET_TYPING_ZSET_SCRIPT
 * Set typing indicator with automatic cleanup
 */
export const SET_TYPING_ZSET_SCRIPT = `
local key = KEYS[1]
local userId = ARGV[1]
local now = tonumber(ARGV[2])
local expiryWindow = tonumber(ARGV[3])

redis.call('ZADD', key, now, userId)
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - expiryWindow)
redis.call('EXPIRE', key, 60)

return 1
`;
```

---

## 7. Integration Points

### 7.1 Architecture Integration

```
┌────────────────────────────────────────────────────────────────┐
│                    lib/data/ (Data Layer)                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────┐    ┌─────────────────────┐           │
│  │    cached-read.ts   │    │   cached-write.ts   │           │
│  │                     │    │                     │           │
│  │  Cache-First Read   │    │  Write-Through      │           │
│  │  ┌───────────────┐  │    │  ┌───────────────┐  │           │
│  │  │ Check Cache   │  │    │  │ DB Write      │  │           │
│  │  │      ↓        │  │    │  │      ↓        │  │           │
│  │  │ Hit? Return   │  │    │  │ Cache Update  │  │           │
│  │  │      ↓        │  │    │  │ (async)       │  │           │
│  │  │ Miss? DB→Warm │  │    │  └───────────────┘  │           │
│  │  └───────────────┘  │    │                     │           │
│  └──────────┬──────────┘    └──────────┬──────────┘           │
│             │                          │                       │
└─────────────┼──────────────────────────┼───────────────────────┘
              │                          │
              ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   lib/cache-ops/ (Cache Operations)             │
├─────────────────────────────────────────────────────────────────┤
│  chat.ts  │  messages.ts  │  documents.ts  │  quota.ts         │
│           │               │                │                    │
│  Uses lib/cache/client.ts for Redis connection                 │
│  Uses lib/cache/circuit-breaker.ts for fault tolerance         │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Read Pattern (Cache-First)

```typescript
async function getChatWithMessages(chatId: string, ctx: Context) {
  // Step 1: Try cache
  const cached = await withCircuitBreaker("getChatFromCache", null, () =>
    getChatFromCache(chatId, ctx.userId)
  );

  if (cached) {
    return cached; // Cache hit
  }

  // Step 2: Cache miss - check user type
  if (isGuestUserId(ctx.userId)) {
    return null; // Guest: no DB fallback
  }

  // Step 3: Auth user: fetch from DB
  const dbChat = await getChatFromDB(chatId);
  if (!dbChat) return null;

  // Step 4: Warm cache async (fire-and-forget)
  warmChatCache(chatId, ctx.userId, dbChat).catch((err) => {
    console.warn("[Cache] Warming failed:", err);
  });

  return dbChat;
}
```

### 7.3 Write Pattern (Write-Through)

```typescript
async function saveMessage(chatId: string, message: Message, ctx: Context) {
  if (isGuestUserId(ctx.userId)) {
    // Guest: cache only
    const success = await appendMessageToCache(chatId, ctx.userId, message);
    return { success };
  }

  // Auth user: DB first
  await db.insert(messages).values(message);

  // Cache update (fire-and-forget)
  appendMessageToCache(chatId, ctx.userId, message).catch((err) => {
    console.warn("[Cache] Update failed:", err);
  });

  return { success: true };
}
```

### 7.4 Error Handling (Circuit Breaker)

```typescript
// lib/cache/circuit-breaker.ts

interface CircuitBreakerState {
  failures: number;
  lastFailure: number | null;
  isOpen: boolean;
}

const CONFIG = {
  threshold: 5, // Open after 5 failures
  resetMs: 30_000, // Try again after 30s
};

export async function withCircuitBreaker<T>(
  operation: string,
  fallback: T,
  fn: () => Promise<T>
): Promise<T> {
  if (isCircuitOpen()) {
    return fallback;
  }

  try {
    const result = await fn();
    recordSuccess();
    return result;
  } catch (error) {
    recordFailure(operation, error);
    return fallback;
  }
}
```

### 7.5 Fallback Strategy

| Scenario     | Guest User         | Auth User                 |
| ------------ | ------------------ | ------------------------- |
| Cache hit    | Return cached data | Return cached data        |
| Cache miss   | Return null        | Fetch from DB, warm cache |
| Cache error  | Return null        | Fetch from DB             |
| Circuit open | Return null        | Fetch from DB             |
| DB error     | N/A                | Return error              |

---

## 8. Performance Targets

### 8.1 Latency Targets

| Operation Type         | Target | P95   | P99   |
| ---------------------- | ------ | ----- | ----- |
| Cache hit (GET)        | < 5ms  | 8ms   | 15ms  |
| Cache hit (ZRANGE)     | < 10ms | 15ms  | 25ms  |
| Lua script execution   | < 10ms | 15ms  | 25ms  |
| Pipeline (10 ops)      | < 15ms | 20ms  | 35ms  |
| Cache miss + DB        | < 50ms | 80ms  | 150ms |
| Cache miss + DB + warm | < 60ms | 100ms | 180ms |

### 8.2 Throughput Targets

| Metric                | Target   | Notes                         |
| --------------------- | -------- | ----------------------------- |
| Cache hit rate        | > 90%    | Active chats should be cached |
| Lua script throughput | 10K/sec  | Per Redis instance            |
| Pipeline efficiency   | > 95%    | Commands in pipelines         |
| Circuit breaker trips | < 1/hour | Under normal operation        |

### 8.3 Memory Estimates

| Entity              | Avg Size | Per User            | 1K Users | 10K Users |
| ------------------- | -------- | ------------------- | -------- | --------- |
| Chat metadata       | ~500B    | ~5KB (10 chats)     | 5MB      | 50MB      |
| Messages (100/chat) | ~80KB    | ~40KB (50 msgs avg) | 40MB     | 400MB     |
| User chat list      | ~2KB     | ~2KB                | 2MB      | 20MB      |
| Documents           | ~10KB    | ~5KB                | 5MB      | 50MB      |
| Session             | ~500B    | ~500B               | 500KB    | 5MB       |
| **Total per user**  | —        | **~55KB**           | **55MB** | **550MB** |

### 8.4 Bandwidth Savings

| Operation              | Without Optimization | With Optimization | Savings              |
| ---------------------- | -------------------- | ----------------- | -------------------- |
| Get latest doc version | 150 KB               | 3 KB              | 98%                  |
| Append doc version     | 303 KB               | 3 KB              | 99%                  |
| Get last 50 messages   | 40 KB                | 40 KB             | 0% (already optimal) |
| Append message         | 4 RTTs               | 1 RTT             | 75%                  |

### 8.5 Round-Trip Savings

| Operation              | Before (RTTs) | After (RTTs) | Savings   | Technique   |
| ---------------------- | ------------- | ------------ | --------- | ----------- |
| appendMessage          | 4             | 1            | 3         | Lua script  |
| appendMessages (batch) | 4N            | 1            | 4N - 1    | Lua script  |
| createChat             | 4             | 1            | 3         | Pipeline    |
| deleteChat             | 3             | 1            | 2         | Lua script  |
| getChatWithMessages    | 2             | 2 (parallel) | ~50% time | Promise.all |
| warmUserChats (10)     | 10            | 1            | 9         | Pipeline    |
| forkChat               | 2 + M         | 1            | 1 + M     | Lua script  |

---

## 9. Implementation Checklist

### 9.1 Priority 1: Critical Changes

- [ ] **Documents ZSET Hybrid Migration**

  - [ ] Create new key pattern functions
  - [ ] Implement `APPEND_DOCUMENT_VERSION_ZSET_SCRIPT`
  - [ ] Migrate existing document data
  - [ ] Update document operations to use ZSET

- [ ] **Add Auth User TTLs**

  - [ ] Set 30-day TTL for all auth user data
  - [ ] Update Lua scripts to apply TTL for auth users
  - [ ] Monitor memory usage

- [ ] **Standardize Key Patterns**
  - [ ] Verify all document keys use `doc:{userId}:{docId}:*` format
  - [ ] Update any inconsistent key patterns

### 9.2 Priority 2: Infrastructure

- [ ] **Cache Operations Module** (`lib/cache-ops/`)

  - [ ] Create `index.ts` with exports
  - [ ] Implement `chat.ts`
  - [ ] Implement `messages.ts`
  - [ ] Implement `documents.ts`
  - [ ] Implement `quota.ts`
  - [ ] Implement `scripts.ts` with all Lua scripts

- [ ] **Data Layer Integration** (`lib/data/`)
  - [ ] Create `cached-read.ts` for cache-first reads
  - [ ] Create `cached-write.ts` for write-through writes
  - [ ] Create `warming.ts` for background cache warming

### 9.3 Priority 3: Optional Improvements

- [ ] **Typing Indicator ZSET** (if showing usernames)
  - [ ] Implement `SET_TYPING_ZSET_SCRIPT`
  - [ ] Update typing operations
  - [ ] Test per-user expiry accuracy

### 9.4 Validation Tests

- [ ] Cache hit/miss scenarios
- [ ] Guest vs auth user TTL behavior
- [ ] Lua script atomicity
- [ ] Circuit breaker activation
- [ ] Memory growth monitoring
- [ ] Latency benchmarks

---

## Appendix A: File Structure

```
lib/
├── cache/                          # Cache Infrastructure
│   ├── index.ts                    # Public exports
│   ├── client.ts                   # Redis singleton (Upstash)
│   ├── circuit-breaker.ts          # Fault tolerance
│   ├── types.ts                    # Type definitions
│   ├── keys.ts                     # Key pattern functions
│   ├── constants.ts                # TTL constants
│   └── helpers.ts                  # Utility functions
│
├── cache-ops/                      # Cache Operations (NEW)
│   ├── index.ts                    # Public exports
│   ├── chat.ts                     # Chat cache operations
│   ├── messages.ts                 # Message cache operations
│   ├── documents.ts                # Document cache operations (ZSET hybrid)
│   ├── quota.ts                    # Rate limiting operations
│   ├── realtime.ts                 # Typing, online status
│   ├── session.ts                  # Session caching
│   ├── scripts.ts                  # All Lua scripts
│   └── helpers.ts                  # Score calculation, etc.
│
└── data/                           # Data Layer
    ├── index.ts                    # Public exports
    ├── chat/
    │   ├── cached-read.ts          # Cache-first reads
    │   ├── cached-write.ts         # Write-through writes
    │   ├── warming.ts              # Cache warming
    │   ├── read.ts                 # DB-only reads
    │   └── write.ts                # DB-only writes
    └── documents/
        ├── cached-read.ts
        ├── cached-write.ts
        └── ...
```

---

## Appendix B: Quick Reference Card

### Key Patterns

```
chat:{chatId}:{userId}:meta      → STRING (chat metadata)
chat:{chatId}:{userId}:msgs      → ZSET (messages, score=timestamp+role)
user:{userId}:chats              → ZSET (chat list, score=updatedAt)
doc:{userId}:{docId}:meta        → STRING (document metadata)
doc:{userId}:{docId}:versions    → ZSET (versions, score=timestamp)
user:{userId}:docs               → ZSET (document list)
quota:{userId}:YYYY-MM-DD        → STRING (daily quota counter, no hash tags)
session:{sessionId}              → STRING (session data)
typing:{chatId}:{userId}         → STRING (SET pattern)
typing:{chatId}                  → ZSET (ZSET pattern)
```

### TTL Quick Reference

```
Guest data:     7 days  (604,800s)
Auth data:      30 days (2,592,000s)
Session (auth): 24 hours (86,400s)
Quota:          25 hours (90,000s)
Typing:         5 seconds
Online:         60 seconds
```

### Lua Scripts

```
APPEND_MESSAGE_SCRIPT            → Single message append
APPEND_MESSAGES_SCRIPT           → Batch message append
UPDATE_METADATA_SCRIPT           → Update chat fields
DELETE_CHAT_SCRIPT               → Delete chat atomically
DELETE_ALL_USER_CHATS_SCRIPT     → Delete all user chats
INCREMENT_QUOTA_SCRIPT           → Atomic quota increment (with limit check)
UPSERT_CHAT_SCRIPT               → Create or update chat
FORK_CHAT_SCRIPT                 → Fork conversation (preserves scores)
FORK_DOCUMENT_SCRIPT             → Fork document versions (artifact branching)
APPEND_DOC_VERSION_SCRIPT        → Append document version
SET_TYPING_ZSET_SCRIPT           → Typing with cleanup
```

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-21  
**Status**: FINAL SPECIFICATION

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [TASK COMPLETE]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
