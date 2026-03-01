# Data Flows

## Database Schema

### Tables

| Table | PK | Key Columns | Indexes |
|-------|-----|-------------|---------|
| `User` | `id` (uuid) | email, passwordHash, createdAt, lastLogin | email (unique) |
| `Chat` | `id` (uuid) | createdAt, updatedAt, title, userId (FK→User), visibility (enum), lastContext (jsonb) | `chat_user_created_idx(userId, createdAt)` |
| `Message_v2` | `id` (uuid) | chatId (FK→Chat), role (enum), parts (jsonb), attachments (jsonb), createdAt | `message_chat_created_idx(chatId, createdAt)`, `message_chat_created_role_idx(chatId, createdAt, role)` |
| `Vote_v2` | composite(chatId, messageId, userId) | isUpvoted (boolean) | — |
| `Document` | composite(id, createdAt) | title, content, kind (enum), userId (FK→User), chatId (FK→Chat), updatedAt | `document_user_idx(userId)`, `document_chat_idx(chatId)` |
| `Suggestion` | `id` (uuid) | documentId, documentCreatedAt, originalText, suggestedText, description, isResolved, userId | `suggestion_doc_idx(documentId)` |

### Enums
- `visibility`: `public` | `private`
- `role`: `user` | `assistant` | `system`
- `document_kind`: `text` | `code` | `image` | `sheet`

### Versioning Strategy
Documents use composite PK `(id, createdAt)` — each save creates a new row with same `id` but different `createdAt`. Versions are ordered chronologically. The latest version is `documents.at(-1)`.

---

## Data Access Layer Architecture

### Layer Structure
```
Route/Action → Guards (auth, rate limit) → Data Layer → Cache Layer → DB Layer
```

### Data Layer (`lib/data/`)
- `base.ts` — `DataContext` type, `createContext()`, `isGuest()`
- `chat.ts` — `chatData` object with: get, getWithMessages, list, updateTitle, updateVisibility, delete, deleteAll
- `chat-operations.ts` — `saveChat()`, `updateChatTitle()` (higher-level orchestration)
- `document.ts` — `documentData` object with: get, getAll, save, getSuggestions

### Cache-First Strategy
All data access follows this pattern:
1. **Check cache** (Redis) — both guest and auth users
2. **Cache hit** → return cached data
3. **Cache miss + guest** → return `null` (NO database call)
4. **Cache miss + auth** → query database, warm cache in background, return

### Guest vs Authenticated Flow
| Operation | Guest | Authenticated |
|-----------|-------|---------------|
| Read chat | Cache only → null if miss | Cache first → DB fallback |
| Write chat | Cache only | DB first → cache update |
| List chats | Cache ZSET + batch MGET | DB with pagination |
| Delete chat | Cache delete only | DB delete + cache delete |

---

## Cache Layer (`lib/cache/`)

### Redis Client
- Provider: Upstash Redis (HTTP-based, stateless, edge-compatible)
- Singleton via `globalThis` pattern for HMR safety
- Env vars: `CACHE_KV_REST_API_URL`, `CACHE_KV_REST_API_TOKEN`

### Key Structure
| Key Pattern | Type | Content |
|-------------|------|---------|
| `chat:{chatId}:{userId}:meta` | String (JSON) | `CachedChatMeta` — id, userId, title, visibility, timestamps, lastContext |
| `chat:{chatId}:{userId}:msgs` | Sorted Set | Members = JSON messages, Scores = timestamps |
| `user:{userId}:chats` | Sorted Set | Members = `{chatId}`, Scores = timestamps |
| `doc:{docId}:{userId}` | String (JSON) | `CachedDocument` — id, userId, chatId, versions[] |
| `quota:{userId}:messages` | String | Message count for daily quota |

### Performance Characteristics
- Message append: O(log N) via ZADD
- Get all messages: O(N) via ZRANGE
- Delete after timestamp: O(log N + M) via ZREMRANGEBYSCORE
- Chat metadata: O(1) via GET/SET
- Batch reads: MGET for O(1) per key

### Circuit Breaker
- Threshold: 5 consecutive failures
- Reset timeout: 30 seconds
- When open: cache operations skipped, falls through to DB for auth users
- Guest users: cache is only source, returns null when circuit open

### TTL Strategy
- Guest data: 7-day TTL applied via pipeline
- Auth data: No TTL (persisted to DB, cache is optimization)

---

## Flow: Send Chat Message

```
Client                    Server                        Cache              DB
  │                         │                             │                 │
  ├──POST /api/chat────────>│                             │                 │
  │                         ├──getAppSession()            │                 │
  │                         ├──RateLimiters.chat()───────>│ (Redis)         │
  │                         ├──getUserMessageCount()─────>│ (Redis)         │
  │                         ├──chatData.getWithMessages()>│ (Redis first)   │
  │                         │                             ├─cache miss──────>│ (DB fallback)
  │                         │                             │<─────result──────│
  │                         │                             │<─warm cache──────│
  │                         │                             │                 │
  │                         ├──createUIMessageStream()    │                 │
  │                         │  ├──generateTitleFromUserMessage() (parallel) │
  │                         │  ├──executeChatCompletion() │                 │
  │                         │  │  ├──streamText()         │                 │
  │<───SSE stream───────────│  │  ├──onFinish: usage calc │                 │
  │                         │  │  │                       │                 │
  │                         │  ├──onFinish:               │                 │
  │                         │  │  ├──saveChat()──────────>│ (cache)─────────>│ (DB)
  │                         │  │  ├──incrementQuota()────>│ (Redis)         │
  │                         │  │  └──updateTitle()───────>│ (cache)─────────>│ (DB)
```

## Flow: Load Chat Page (`/chat/[id]`)

```
1. getAppSession() → Supabase JWT or Guest JWT
2. createContext(session) → DataContext { userId, isGuest }
3. chatData.getWithMessages(id, ctx)
   a. Redis: GET meta + ZRANGE msgs (single roundtrip)
   b. Miss + auth: DB SELECT chat + messages, warm cache
   c. Miss + guest: return null → redirect
4. Verify visibility + ownership
5. convertToUIMessages(messagesFromDb) → UIMessage[]
6. getVotesByChatIdAndUserId (DB, only for auth users with messages)
7. Render <Chat> with all data server-side
```

## Flow: Save Document (Artifact)

```
AI Tool (createDocument/updateDocument)
  │
  ├──Stream data parts to client:
  │   data-id → data-title → data-kind → data-clear → content deltas → data-finish
  │
  ├──documentHandler.onCreateDocument():
  │   ├──streamObject/streamText (AI SDK)
  │   ├──Stream deltas to dataStream
  │   └──documentData.save():
  │       ├──Guest: appendDocumentVersionToCache (Redis only)
  │       └──Auth: DB INSERT + appendDocumentVersionToCache
  │
  └──Client processes via DataStreamHandler:
      ├──Updates useArtifact SWR state
      └──Artifact panel renders content
```

## Flow: Chat History Pagination

```
Guest:
  1. getUserChatsFromCache(userId, limit, offset) → ZREVRANGE on user:{userId}:chats
  2. Batch MGET on chat:{chatId}:{userId}:meta for each result
  3. Convert to Chat objects, slice for hasMore

Authenticated:
  1. DB SELECT from Chat WHERE userId = ? ORDER BY createdAt DESC
  2. Cursor-based: starting_after/ending_before for prev/next pages
  3. Extended limit (limit+1) to detect hasMore
  4. Response cached: private, max-age=0, s-maxage=10, stale-while-revalidate=30
```

## Flow: Token Exchange (Auth)

```
Client                    Supabase                Server (/api/auth/exchange)
  │                         │                         │
  ├──signInWithPassword()──>│                         │
  │<──session + accessToken─│                         │
  ├──POST /api/auth/exchange { accessToken }─────────>│
  │                         │                         ├──jwtVerify(token, SUPABASE_JWT_SECRET)
  │                         │                         │  audience: "authenticated"
  │                         │                         │  issuer: "{SUPABASE_URL}/auth/v1"
  │                         │                         ├──Set httpOnly cookie
  │<────────────────────────────{ user }──────────────│
  ├──router.push("/")
```
