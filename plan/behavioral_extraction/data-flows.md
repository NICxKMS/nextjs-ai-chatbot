# Data Flows

> **Updated per redesign audit (2026-03-01)**

## Database Schema

### Tables

| Table | PK | Key Columns | Indexes |
|-------|-----|-------------|---------|
| `User` | `id` (uuid) | email, passwordHash, createdAt, lastLogin | email (unique) |
| `Chat` | `id` (uuid) | createdAt, updatedAt, title, userId (FK→User), visibility (enum), lastContext (jsonb) | `chat_user_created_idx(userId, createdAt)` |
| `Message_v2` | `id` (uuid) | chatId (FK→Chat), role (enum), parts (jsonb), attachments (jsonb), createdAt | `message_chat_created_idx(chatId, createdAt)`, `message_chat_created_role_idx(chatId, createdAt, role)` |
| `Vote_v2` | composite(chatId, messageId, userId) | isUpvoted (boolean) | — |
| `Artifact` | composite(id, createdAt) | title, content, kind (enum), userId (FK→User), chatId (FK→Chat), updatedAt | `artifact_user_idx(userId)`, `artifact_chat_idx(chatId)` |
| `Suggestion` | `id` (uuid) | artifactId, artifactCreatedAt, originalText, suggestedText, description, isResolved, userId | `suggestion_artifact_idx(artifactId)` |

### Enums
- `visibility`: `public` | `private`
- `role`: `user` | `assistant` | `system`
- `artifact_kind`: `text` | `code` | `image` | `sheet`

### Versioning Strategy
Artifacts use composite PK `(id, createdAt)` — each save creates a new row with same `id` but different `createdAt`. Versions are ordered chronologically. The latest version is `artifacts.at(-1)`.

---

## Data Access Layer Architecture

### Layer Structure
```
Route/Action → Guards (auth, rate limit) → Data Layer → Cache Layer → DB Layer
```

### Data Layer (`lib/data/`)
- `base.ts` — `DataContext` type, `createContext()`, `isGuest()`
- `chat.ts` — plain functions: `getChatById`, `getChatWithMessages`, `getChatsByUserId`, `updateChatTitle`, `updateVisibility`, `deleteChatById`, `deleteAllChatsByUserId`
- `chat-operations.ts` — `saveChat()`, `updateChatTitle()` (higher-level orchestration)
- `artifact.ts` — plain functions: `getArtifactById`, `getArtifactVersions`, `saveArtifactVersion`, `getSuggestionsByArtifactId`

> *Every mutation in the data layer calls `revalidateTag`/`updateTag` for Next.js cache invalidation. `'use cache'` + `cacheTag` replace Redis-based caching for most reads.*

### Server Cache Strategy

All data access follows redesign semantics:
1. Reads are server-side via `'use cache'` + `cacheTag`
2. Writes persist to DB and trigger `updateTag` (Server Actions) or `revalidateTag(tag, 'max')` (Route Handlers)
3. No guest-only cache mode: guest and authenticated users both persist chat/artifact data to DB

### Guest vs Authenticated Flow
| Operation | Guest | Authenticated |
|-----------|-------|---------------|
| Read chat | Server fetch with `'use cache'` + ownership/visibility rules | Server fetch with `'use cache'` + ownership checks |
| Write chat | Persist to DB + cache revalidation | Persist to DB + cache revalidation |
| List chats | DB-backed list with cache tags | DB-backed list with cache tags |
| Delete chat | Allowed by ownership + DB delete | Allowed by ownership + DB delete |

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
| `artifact:{artifactId}:{userId}` | String (JSON) | `CachedArtifact` — id, userId, chatId, versions[] |

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
- Guest users also fall through to DB-backed reads/writes (cache outage degrades performance, not availability)

### TTL Strategy
- Guest data: 7-day TTL applied via pipeline
- Auth data: No TTL (persisted to DB, cache is optimization)

---

## Flow: Send Chat Message

> *`updateTag`/`revalidateTag` called after saveChat, updateChatTitle. Title generated via `chat-title` stream part (single-channel).*

```
Client                    Server                        Cache              DB
  │                         │                             │                 │
  ├──POST /api/chat────────>│                             │                 │
  │                         ├──getAppSession()            │                 │
  │                         ├──RateLimiters.chat()───────>│ (Redis)         │
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
  │                         │  │  └──updateTitle()───────>│ (cache)─────────>│ (DB)
```

## Flow: Load Chat Page (`/chat/[id]`)

> *Page is a Server Component. Chat data fetched server-side with `'use cache'` + `cacheTag('chat:{id}')`. `ChatShell` replaces monolithic `<Chat>` component. `VoteResolver` is deferred (Suspense-wrapped).*

```
1. getAppSession() → Supabase JWT or Guest JWT
2. createContext(session) → DataContext { userId, isGuest }
3. getChatWithMessages(id, ctx)
  a. Server cache-tagged read path (`'use cache'` + `cacheTag`)
  b. DB SELECT chat + messages (guest/auth use same persistence model)
4. Verify visibility + ownership
5. convertToUIMessages(messagesFromDb) → UIMessage[]
6. getVotesByChatIdAndUserId (DB, only for auth users with messages)
7. Render <ChatShell> with all data server-side
```

## Flow: Save Artifact

> *Tool names: `createArtifact`/`updateArtifact`. Stream parts: `artifact-*`. StreamBridge processes deltas via pure `processStreamDelta()` into `artifactStore` (useSyncExternalStore). `saveArtifactVersion()` persists. `revalidateTag('artifact:{id}')` after save.*

```
AI Tool (createArtifact/updateArtifact)
  │
  ├──Stream data parts to client:
  │   artifact-id → artifact-title → artifact-kind → artifact-clear → content deltas → artifact-finish
  │
  ├──artifactHandler.create() / .update():
  │   ├──streamObject/streamText (AI SDK)
  │   ├──Stream deltas to dataStream
  │   └──saveArtifactVersion():
  │       └──DB INSERT + revalidateTag('artifact:{id}')
  │
  └──Client processes via StreamBridge:
      ├──processStreamDelta() → artifactStore (useSyncExternalStore)
      └──ArtifactPanel renders content
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

## Flow: Auth Server Actions

> *Auth mutations use Server Actions (`login`, `register`, `logout`). Guest bootstrap/rotation is handled in `proxy.ts`.*

```
Client (AuthForm)          Supabase                 Server Action (login/register)
  │                           │                               │
  ├──submit form─────────────>│                               │
  │                           ├──signIn/signUp───────────────>│
  │                           │<──────── result ──────────────│
  │                           │                               ├──Set-Cookie sb_token
  │<───────────────────────────────────────────────────────────│
  ├──redirect("/") + router refresh
```

---

## Revalidation Matrix

> *Every mutation calls `revalidateTag`/`updateTag`. Server Actions use `updateTag` (read-your-own-writes). Route Handlers use `revalidateTag(tag, 'max')` (stale-while-revalidate).*

| Cache Tag | Tagged By | Invalidated By | Primitive |
|-----------|-----------|---------------|-----------|
| `chat:{id}` | `getCachedChat()` via `cacheTag` | delete trailing messages, update visibility | `updateTag` (SA) |
| `chat:{id}` | `getCachedChat()` via `cacheTag` | save messages (onFinish), update title | `revalidateTag(tag, 'max')` (RH) |
| `chats:{userId}` | `getCachedChats()` via `cacheTag` | delete chat, delete all chats | `updateTag` (SA) |
| `chats:{userId}` | `getCachedChats()` via `cacheTag` | create chat, update title (onFinish) | `revalidateTag(tag, 'max')` (RH) |
| `votes:{chatId}` | `getCachedVotes()` via `cacheTag` | vote on message | `updateTag` (SA) |
| `artifact:{id}` | `getCachedArtifact()` via `cacheTag` | create artifact, update artifact, user save | `revalidateTag(tag, 'max')` (RH) |
| `models` | `getAvailableModels()` via `cacheTag` | Deploy / admin action | `revalidateTag('models', 'max')` |

---

## Mutation Architecture

| Mutation | Method | Pattern | Revalidation | Optimistic? |
|----------|--------|---------|--------------|-------------|
| Send message (stream) | `POST /api/chat` (Route Handler) | SSE stream via AI SDK | `revalidateTag('chat:{id}', 'max')` + `revalidateTag('chats:{userId}', 'max')` in `onFinish` | Messages via `useChat` |
| Create chat (first message) | Inside `POST /api/chat` | DB insert if new chat | `revalidateTag('chats:{userId}', 'max')` | `PendingChats.add()` |
| Update chat title | Inside `onFinish` | Await title gen → stream `chat-title` → DB update | `revalidateTag('chats:{userId}', 'max')` | `PendingChats.updateTitle()` |
| Delete chat | Server Action | `deleteChat()` | `updateTag('chats:{userId}')` | `PendingChats.remove()` |
| Delete all chats | Server Action | `deleteAllChats()` | `updateTag('chats:{userId}')` | Redirect to `/` |
| Update chat visibility | Server Action | `updateChatVisibility()` | `updateTag('chat:{id}')` + `updateTag('chats:{userId}')` | `useOptimistic` |
| Create artifact (AI tool) | Inside SSE stream | Stream data parts → DB insert | `revalidateTag('artifact:{id}', 'max')` | Artifact store progressive update |
| Update artifact (AI tool) | Inside SSE stream | Stream data parts → DB insert | `revalidateTag('artifact:{id}', 'max')` | Artifact store progressive update |
| Save artifact (user edit) | `POST /api/artifact` | Debounced save → new version row | `revalidateTag('artifact:{id}', 'max')` | Local editor state |
| Vote on message | Server Action | `voteOnMessage()` | `updateTag('votes:{chatId}')` | `useOptimistic` |
| Login / Register | Server Action | `useActionState` | `cookies.set()` invalidates Router Cache | Form return value |
| Logout | Server Action | `logout()` | `cookies.delete()` invalidates Router Cache | Redirect to `/login` |
| Delete trailing messages | Server Action | `deleteTrailingMessages()` | `updateTag('chat:{id}')` | `setMessages` via `useChat` |
```
