# Data Flows

> **Updated per redesign audit (2026-03-01)**

## Database Schema

### Tables

| Table | PK | Key Columns | Indexes |
|-------|-----|-------------|---------|
| `User` | `id` (uuid) | email, passwordHash, createdAt, lastLogin | email (unique) |
| `Chat` | `id` (uuid) | createdAt, updatedAt, title, userId (FK→User), visibility (enum), model (text) | `chat_user_created_idx(userId, createdAt)` | <!-- W4-CYCLE1: SOFT-009 fix — replaced lastContext (jsonb) with model (text) per CONF-013 and redesign -->
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

> **Scope:** `visibility` is a **chat-level** field only. Artifacts do not have their own visibility column; they inherit access rules from their parent chat via `Artifact.chatId`.

---

## Data Access Layer Architecture

### Layer Structure
```
Route/Action → Guards (auth, rate limit) → Data Layer → Cache Layer → DB Layer
```

### Data Layer (`lib/data/`)
- `chat.ts` — plain functions: `getChatById`, `getChatWithMessages`, `getChatsByUserId`, `updateChatTitle`, `updateChatVisibility`, `deleteChatById`, `deleteAllChatsByUserId`
- `message.ts` — plain functions: `getMessagesByChatId`, `saveMessages`, `deleteMessagesByIdAfter`, `deleteMessagesByChatId`
- `artifact.ts` — plain functions: `getArtifactById`, `getArtifactVersions`, `saveArtifactVersion` <!-- audit: DF-AP6 — getSuggestionsByArtifactId moved to suggestion.ts -->
- `suggestion.ts` — plain functions: `getSuggestionsByArtifactId`, `saveSuggestions`, `deleteSuggestionsByArtifactId` <!-- audit: DF-AP6 -->
- `vote.ts` — DB-only plain functions: `getVotesByChatId`, `upsertVote`, `deleteVotesByChatId`; no `'use cache'`, `cacheTag`, or `cacheLife` directives, and no `getAppSession()` — it receives only IDs and remains session-agnostic.
- `user.ts` — plain functions: `getUserByEmail`, `getUserById`, `createUser`, `updateUserLastLogin`

> **Note (DF-AP5, 2026-03-02):** `chat-operations.ts` was a legacy ghost and has been removed. Redesign calls `saveMessages()` (from `message.ts`) and `updateChatTitle()` (from `chat.ts`) directly in `onFinish` — no orchestration layer. <!-- audit: DF-AP5 -->

> *Every mutation's caller (Server Action or Route Handler) calls the appropriate revalidation utility for Next.js cache invalidation. For votes, this happens in the `voteOnMessage` Server Action via `invalidateVotes(chatId)` → `updateTag('votes:{chatId}')` — `lib/data/vote.ts` itself stays DB-only and does not import `next/cache`. `'use cache'` + `cacheTag` + `cacheLife` are the sole read-caching mechanism — Redis is reserved for rate limiting and operational data only.* <!-- wave4: XDL-06a — clarified revalidation lives at caller level, not data layer -->

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

### Redis Client (Rate Limiting & Operational Data Only)

> **Updated per Wave 4 (XDL-01, RC-01, 2026-03-02):** Redis is scoped to rate limiting and operational data. All read caching uses `'use cache'` + `cacheTag` + `cacheLife` (Next.js framework caching). No Redis cache-aside for chat, message, artifact, or vote data.

- Provider: Upstash Redis (HTTP-based, stateless, edge-compatible)
- Singleton via `globalThis` pattern for HMR safety
- Env vars: `CACHE_KV_REST_API_URL`, `CACHE_KV_REST_API_TOKEN`
- **Scope:** Rate limiting keys, session cache. NOT for data reads.

### Framework Caching (`'use cache'` + `cacheTag` + `cacheLife`)

All data read caching uses Next.js `'use cache'` directive at the page/component level:

| Cache Tag | Tagged By | `cacheLife` |
|-----------|-----------|-------------|
| `chat:{id}` | `getCachedChat()` | `'seconds'` |
| `chats:{userId}` | `getCachedChats()` | `'seconds'` |
| `votes:{chatId}` | `getCachedVotes()` | `'seconds'` |
| `artifact:{id}` | `getCachedArtifact()` | `'seconds'` |
| `models` | `getAvailableModels()` | `'hours'` |

Data functions in `lib/data/` are pure DB operations. `'use cache'` wrappers live at the page/feature layer (e.g., `getCachedChat` in the chat page). Revalidation happens at the caller level (Server Actions call `invalidate*`, Route Handlers call `refresh*`). <!-- wave4: XDL-01 — Redis cache-aside residue removed -->

---

## Flow: Send Chat Message

> *`revalidateTag` called after `saveMessages`, `updateChatTitle` in `onFinish`. Title generated via `chat-title` stream part (single-channel). Revalidation uses `refresh*` helpers (stale-while-revalidate) per Route Handler convention.*

```
Client                    Server                        DB
  │                         │                            │
  ├──POST /api/chat────────>│                            │
  │                         ├──getAppSession()           │
  │                         ├──RateLimiters.chat()       │  (Redis — rate limit only)
  │                         ├──getChatWithMessages(id)──>│  (server-cached via 'use cache')
  │                         │<──────result───────────────│
  │                         │                            │
  │                         ├──createUIMessageStream()   │
  │                         │  ├──streamText()           │
  │<───SSE stream───────────│  │                         │
  │                         │  │                         │
  │                         │  ├──onFinish:              │
  │                         │  │  ├──saveMessages()─────>│  (DB INSERT)
  │                         │  │  ├──updateChatTitle()──>│  (DB UPDATE)
  │                         │  │  ├──refreshChat(chatId) │  (revalidateTag)
  │                         │  │  └──refreshChatList(uid)│  (revalidateTag)
```
<!-- wave4: XDL-04 — legacy flow diagram replaced with redesign-aligned version -->

## Flow: Load Chat Page (`/chat/[id]`)

> *Page is a Server Component. Chat data fetched server-side with `'use cache'` + `cacheTag('chat:{id}')`. `ChatShell` replaces monolithic `<Chat>` component. `VoteResolver` is deferred (Suspense-wrapped).*

```
1. getAppSession() → Supabase JWT or Guest JWT
2. getChatWithMessages(id) <!-- audit: HC-3 — bare-ID signature per redesign, no DataContext -->
  a. Server cache-tagged read path (`'use cache'` + `cacheTag`)
  b. DB SELECT chat + messages (guest/auth use same persistence model)
3. Verify visibility + ownership (at page/action level, not data level)
4. convertToUIMessages(messagesFromDb) → UIMessage[]
5. `getCachedVotes(chatId, session.user.id)` helper (only for non-guest authenticated users with messages)
  a. RSC cache wrapper: `'use cache'` + `cacheTag('votes:{chatId}')` + `cacheLife('seconds')`
  b. Internally calls `lib/data/vote.ts` (DB-only, session-agnostic)
6. Render <ChatShell> with all data server-side
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
  │   ├──Stream deltas to ChatStream <!-- wave4-cleanup: CONF-037 dataStream→ChatStream -->
  │   └──saveArtifactVersion():
  │       └──DB INSERT + revalidateTag('artifact:{id}')
  │
  └──Client processes via StreamBridge:
      ├──processStreamDelta() → artifactStore (useSyncExternalStore)
      └──ArtifactPanel renders content
```

## Flow: Chat History Pagination

```
Guest + Authenticated (same DB-backed flow):
  1. DB SELECT from Chat WHERE userId = ? ORDER BY createdAt DESC
  2. Cursor-based pagination (`cursor`, `limit`) for next pages
  3. Extended limit (limit+1) to detect hasMore
  4. Response shape: { chats, hasMore, nextCursor? }
  5. SidebarShell provides first page server-side; SWR infinite fetches subsequent pages
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
| `chat:{id}` | `getCachedChat()` via `cacheTag` | delete trailing messages, update visibility, rename chat | `updateTag` (SA) |
| `chat:{id}` | `getCachedChat()` via `cacheTag` | save messages (onFinish), update title | `revalidateTag(tag, 'max')` (RH) |
| `chats:{userId}` | `getCachedChats()` via `cacheTag` | delete chat, delete all chats, rename chat, update visibility | `updateTag` (SA) |

<!-- AUDIT: W4-VI-03 — "update visibility" added to chats:{userId} SA invalidators.
     Traceability: wave3/chat-visibility-conflicts.md CV-05.
     Evidence: mutation table (redesign data-flow.md §3) and code sketch (state-management.md §7) both call
     updateTag('chats:{userId}') on visibility change. Revalidation matrix was editorially inconsistent. -->
| `chats:{userId}` | `getCachedChats()` via `cacheTag` | create chat, update title (onFinish) | `revalidateTag(tag, 'max')` (RH) |
| `votes:{chatId}` | `getCachedVotes()` via `cacheTag` | `voteOnMessage` Server Action via `invalidateVotes(chatId)` | `updateTag` (SA) |
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
| Vote on message | Server Action | `voteOnMessage()` | `invalidateVotes(chatId)` → `updateTag('votes:{chatId}')` | `useOptimistic` |
| Login / Register | Server Action | `useActionState` | `cookies.set()` invalidates Router Cache | Form return value |
| Logout | Server Action | `logout()` | `cookies.delete()` invalidates Router Cache | Redirect to `/login` |
| Delete trailing messages | Server Action | `deleteTrailingMessages()` | `updateTag('chat:{id}')` | `setMessages` via `useChat` |
| Rename chat | Server Action | `renameChat()` | `updateTag('chat:{chatId}')` + `updateTag('chats:{userId}')` | Optimistic title update |
```
<!-- wave4: RC-04 — renameChat added with both chat:{id} and chats:{userId} invalidation -->
