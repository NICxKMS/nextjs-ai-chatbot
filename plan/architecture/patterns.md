# Pattern Catalog

> Concrete patterns for the new codebase. Each pattern includes when to use it,
> the template, and rules. Replaces the v6 spec's Pattern Catalog (§13-14).
>
> **Updated per redesign audit (2026-03-01)**: Provider names updated (ChatStreamProvider,
> StreamBridge, PendingChatsProvider, SessionProvider). Artifact state uses useSyncExternalStore.
> ActionResult<T> pattern added. Revalidation pattern added. ChatSessionContext pattern added.
> "document" → "artifact" throughout.

---

## 1. Data Access Pattern

### Purpose

Abstract database + cache operations behind plain functions. No classes, no generics.

### Template

```typescript
// lib/data/chat.ts
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { chats } from '@/lib/db/schema'
import type { Chat } from '@/lib/types'
export async function getChatById(
  id: string
): Promise<Chat | null> {
  // Pure DB lookup — no auth, no caching
  // Auth/ownership checks happen at the action/page level, not data level
  // Caching via 'use cache' + cacheTag happens at the page/feature layer
  const chat = await db.query.chats.findFirst({ where: eq(chats.id, id) })
  return chat ?? null
}

export async function createChat(data: {
  id: string
  userId: string
  title: string
  visibility: 'public' | 'private'
}): Promise<Chat> {
  const [chat] = await db.insert(chats).values(data).returning()
  // Revalidation happens at the caller level (Server Action or Route Handler)
  // e.g., SA calls invalidateChatList(userId); RH calls refreshChatList(userId)
  return chat
}

export async function deleteChatById(
  id: string
): Promise<void> {
  await db.delete(chats).where(eq(chats.id, id))
  // Revalidation happens at the caller level (Server Action or Route Handler)
}
```
<!-- wave4: XDL-01/XDL-05 — removed Redis cache.set/cache.del from mutation templates; revalidation at caller level -->

### Page-Level Cache Pattern (`'use cache'` + `cacheTag`)

> **Updated per Wave 4 (XDL-05, 2026-03-02):** Replaced Redis cache-aside `withCache` with
> inline `'use cache'` pattern per redesign. Data functions in `lib/data/` are pure DB operations.
> Caching wrappers live at the page/feature layer.

```typescript
// In page or server component — NOT in lib/data/
import { cacheTag, cacheLife } from 'next/cache'
import { getChatWithMessages } from '@/lib/data/chat'

async function getCachedChat(chatId: string) {
  'use cache'
  cacheTag(`chat:${chatId}`)
  cacheLife('seconds')
  return getChatWithMessages(chatId)  // pure DB function from lib/data/
}

async function getCachedChats(userId: string) {
  'use cache'
  cacheTag(`chats:${userId}`)
  cacheLife('seconds')
  return getChatsByUserId(userId)  // pure DB function from lib/data/
}
```
<!-- wave4: XDL-05 — replaced Redis withCache with inline 'use cache' pattern -->

### Rules

- ✅ One file per entity in `lib/data/`
- ✅ Read functions use bare-ID signatures (no `DataContext` parameter)
- ✅ Auth/ownership checks happen at action/page level, not data level
- ✅ Guest and auth users both use DB persistence
- ✅ Reads use `'use cache'` + `cacheTag` + `cacheLife` at the page/feature layer; writes revalidate tags at the caller level
- ✅ Write functions: DB operations only — no inline cache invalidation; revalidation at caller (SA/RH)
- ❌ No abstract classes or generics
- ❌ No direct DB access from actions (go through `lib/data/`)
- ❌ No Redis cache-aside for data reads — Redis is for rate limiting and operational data only

<!-- audit: HC-3 — bare-ID signatures, no DataContext parameter -->

---

## 2. Server Action Pattern

### Purpose

Feature-owned business logic callable from client or server. Handles validation,
auth, orchestration, and error handling.

### Template

```typescript
// features/chat/actions/save-message.ts
'use server'

import { getAppSession } from '@/lib/auth/session'
import { createMessage } from '@/lib/data/message'
import { sendMessageSchema } from '@/features/chat/schemas/message.schema'
import { AppError } from '@/lib/errors'

export async function saveMessageAction(input: unknown) {
  // 1. Auth
  const session = await getAppSession()
  if (!session) throw AppError.unauthorized()

  // 2. Validate
  const parsed = sendMessageSchema.safeParse(input)
  if (!parsed.success) {
    throw AppError.validation('Invalid message', {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  // 3. Authorize (ownership check — at action level, not data level)
  const chat = await getChatById(parsed.data.chatId)
  if (!chat) throw AppError.notFound('Chat')
  if (chat.userId !== session.user.id) throw AppError.forbidden('Not chat owner')

  // 4. Execute
  return createMessage({
    chatId: parsed.data.chatId,
    role: 'user',
    parts: parsed.data.parts,
  })
}
```

### ActionResult Pattern (for mutations)

> **Added per redesign audit (2026-03-01)**

```typescript
// lib/types/result.types.ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }

// features/chat/actions/delete-chat.ts
'use server'

import { updateTag } from 'next/cache'

export async function deleteChat({ chatId }: { chatId: string }): Promise<ActionResult> {
  const session = await getAppSession()
  if (!session) return { success: false, error: { code: 'unauthorized:chat:auth_required', message: 'Unauthorized' } }

  await deleteChatById(chatId)
  updateTag(`chats:${session.user.id}`)
  return { success: true, data: undefined }
}
```
<!-- W4-CYCLE1: DF-03 fix — removed extra updateTag('chat:{chatId}'), matches §9 matrix and redesign -->
<!-- W4-CYCLE1: DF-W2-01 fix — deleteChatById takes 1 arg per §1 definition -->

### Structure

Every action follows: **Auth → Validate → Authorize → Execute**.

> **Pattern disambiguation:** The first template above (throw-based) is for Server Actions
> called as **delegates from route handlers** — thrown errors are caught by the route handler's
> error boundary. The `ActionResult<T>` template is for Server Actions called **directly from
> client components** (forms, buttons, `useActionState`) — these return structured results
> so the UI can display errors without error boundaries.

### Rules

- ✅ `'use server'` directive at file level (all exports are server functions)
- ✅ Validate with Zod schemas from the feature's `schemas/` directory
- ✅ Auth check first — never process unauthenticated requests
- ✅ Ownership checks before mutations
- ✅ Call `lib/data/` functions for data access
- ❌ No direct DB/cache access in actions
- ❌ No `try/catch` wrapping **in RH-delegated SAs** — let errors propagate to the route handler's catch

---

## 3. Route Handler Pattern (Slim Routes)

### Purpose

Thin HTTP handlers. Parse request, delegate to action, return response.

### Template — Streaming Route

<!-- C2-W4: SOFT-010 fix -->

```typescript
// app/api/chat/route.ts — streaming routes are inline (see §7.1 for full template)
import { createUIMessageStream } from 'ai'
import { getAppSession } from '@/lib/auth/session'
import { chatRequestSchema } from '@/features/chat/schemas/chat.schema'

export async function POST(request: Request) {
  const session = await getAppSession()
  if (!session) throw AppError.unauthorized()
  const body = await request.json()
  const validated = chatRequestSchema.parse(body)
  return createUIMessageStream({ execute: async (writer) => { /* ... see §7.1 */ } })
}
```

### Template — REST Route

```typescript
// app/api/history/route.ts
import { getAppSession } from '@/lib/auth/session'
import { getChatsByUserId } from '@/lib/data/chat'

export async function GET(request: Request) {
  const session = await getAppSession()
  if (!session) return AppError.unauthorized().toResponse()
  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100)
  const cursor = url.searchParams.get('cursor') ?? undefined
  const chats = await getChatsByUserId(session.user.id, { limit: limit + 1, cursor })
  const hasMore = chats.length > limit
  const page = chats.slice(0, limit)
  const nextCursor = hasMore ? page[page.length - 1]?.id : undefined
  return Response.json({ chats: page, hasMore, nextCursor })
}
```

### Rules

- ✅ Route files under 20 lines (streaming route is an exception — see §7.1)
- ✅ Streaming routes implement SSE inline in route handler (no separate action file — P3-T23)
- ✅ REST routes handle auth, parse params, call data layer
- ✅ Error responses via `AppError.toResponse()`
- ❌ No business logic in routes
- ❌ No direct DB access

### When to Use Route vs Server Action

| Need | Use | Why |
|------|-----|-----|
| SSE streaming | Route Handler | Server Actions can't return streams |
| Paginated GET | Route Handler | Server Actions are POST-only |
| File upload | Route Handler | Need Request body parsing |
| Form submission | Server Action | Progressive enhancement |
| Button click mutation | Server Action | Simpler client integration |
| Optimistic update | Server Action | Works with `useOptimistic` |
| Health check | Route Handler | External/programmatic access |

---

## 4. Component Patterns

### 4.1 Server Component (Default)

```tsx
// features/sidebar/components/sidebar-shell.tsx
import { getAppSession } from '@/lib/auth/session'
import { getCachedChats } from '@/features/sidebar/lib/queries'
import { SidebarHistoryClient } from './sidebar-history-client'

export async function SidebarShell() {
  const session = await getAppSession()
  if (!session) return null
  const chats = await getCachedChats(session.user.id)
  return <SidebarHistoryClient initialChats={chats} />
}
```

<!-- SYNC: Wave 4-CHAT — LC-06. Messages is a CLIENT component (reads from ChatSessionContext),
     not a server component. Replaced example with SidebarShell (actual server component). -->

### 4.2 Client Component

```tsx
// features/chat/components/multimodal-input.tsx
'use client'

import { useState, useCallback } from 'react'
import { useChatSessionContext } from '@/features/chat/hooks/use-chat-session-context'

export function MultimodalInput() {
  const { sendMessage, input, setInput, attachments, setAttachments, status } =
    useChatSessionContext()

  const onSubmit = useCallback(() => {
    sendMessage()
    setAttachments([])
  }, [sendMessage, setAttachments])

  return (
    <form onSubmit={onSubmit}>
      {/* ... */}
    </form>
  )
}
```

<!-- SYNC: Wave 4-CHAT — LC-05. MultimodalInput reads from useChatSessionContext() (NOT useChat
     directly, NOT prop-driven). No chatId prop needed — context provides all state. -->

### 4.3 Compound Component (AI Wrappers)

For complex components with internal state sharing:

```tsx
// Compound components use React Context internally
<Message role="assistant" isStreaming={true}>
  <MessageContent>{content}</MessageContent>
  <MessageReasoning>{reasoning}</MessageReasoning>
  <MessageActions chatId={chatId} messageId={id} />
</Message>
```

### 4.4 Error Boundary

```tsx
// features/artifacts/components/artifact-error-boundary.tsx — 'use client'
// Class component wrapping artifact panel content
// Catches editor errors (TipTap, CodeMirror, react-data-grid)
// Shows fallback UI with retry, prevents crash propagation to chat
```

### Rules

- ✅ Server Components by default
- ✅ `'use client'` only when hooks, events, or browser APIs are needed
- ✅ Pick the simplest pattern that works
- ❌ No prop drilling past 2 levels — use context or composition

---

## 5. Hook Patterns

### 5.1 Feature Hook (Colocated)

```typescript
// features/chat/hooks/use-scroll-to-bottom.ts — 'use client'
// Uses MutationObserver + ResizeObserver on container ref
// Returns { containerRef, scrollToBottom, isAtBottom }
// Tracks manual scroll override, auto-scrolls on new content
```

### 5.2 Shared Hook (Generic Utility)

```typescript
// lib/hooks/use-mobile.ts — 'use client'
// Uses useSyncExternalStore + matchMedia('(max-width: 768px)')
// Returns boolean, SSR-safe (getServerSnapshot returns false)
```

### Rules

- ✅ Feature hooks in `features/[name]/hooks/`
- ✅ Shared hooks in `lib/hooks/` ONLY if used by 3+ features
- ✅ All hooks are `'use client'`
- ❌ No hooks in `lib/hooks/` that belong to a single feature

---

## 6. Error Handling Pattern

### AppError Class

```typescript
// lib/errors/app-error.ts
type ErrorCode =
  | 'bad_request:api:invalid_request_body'
  | 'unauthorized:chat:auth_required'
  | 'forbidden:chat:owner_mismatch'
  | 'not_found:chat:chat_not_found'
  | 'rate_limit:chat:too_many_requests'
  | 'ai_error:provider:failed'
  | 'internal_error:database:query_failed'
  | 'internal_error:cache:operation_failed'

export class AppError extends Error {
  // constructor(code, message, statusCode = 500, details?)
  // Static factories: unauthorized(), forbidden(), notFound(resource),
  //   validation(msg, details?), rateLimited()
  // toResponse() → Response.json({ error, code, details }, { status })
}
```
<!-- C2-W4: C2X-006 fix -->

### Usage

```typescript
// In actions: throw AppError.notFound('Chat')
// In routes: catch (e) { if (e instanceof AppError) return e.toResponse() }
```

### Rules

- ✅ Throw `AppError` in route handlers for expected errors
- ✅ Use `ActionResult<T>` in Server Actions (don't throw)
- ✅ Use `.toResponse()` in route handlers to serialize
- ✅ Let unexpected errors propagate to error boundaries
- ❌ No raw `throw new Error()` for expected conditions
- ❌ No `Result<T, E>` wrapper types

---

## 7. Streaming / AI Patterns

### 7.1 Chat Streaming (Route Handler → SSE)

<!-- W4-CYCLE1: CONFLICT-008 fix — getEnabledTools takes ModelMetadata, not raw string -->
<!-- C2-W4: SOFT-010 fix -->

```typescript
// app/api/chat/route.ts — inline route handler (P3-T23)
import { streamText } from 'ai'
import { createUIMessageStream } from 'ai'
import { myProvider } from '@/lib/ai/provider'
import { getModelMetadata } from '@/lib/ai/models'

export async function POST(request: Request) {
  const session = await getAppSession()
  if (!session) throw AppError.unauthorized()

  const body = await request.json()
  const validated = chatRequestSchema.parse(body)
  const model = getModelMetadata(validated.selectedChatModel)

  return createUIMessageStream({
    execute: async (dataStream) => {
      // Title generation — start early, await before close
      const titlePromise = isNewChat
        ? generateTitle(validated.message)
        : null

      // Main chat completion
      const result = streamText({
        model: myProvider.languageModel(validated.selectedChatModel),
        system: buildSystemPrompt(validated, session),
        messages: convertToModelMessages(validated.messages),
        tools: getEnabledTools(model)
          ? buildTools({ session, dataStream, chatId: validated.chatId })
          : undefined,
        abortSignal: AbortSignal.timeout(55_000),
        // ... settings from user preferences
      })

      result.consumeStream()
      dataStream.merge(result.toUIMessageStream({ sendReasoning: true }))

      // Await title before stream closes — ensures client receives it
      if (titlePromise) {
        const title = await titlePromise
        dataStream.writeData({ type: 'chat-title', content: title })
      }
    },
    onFinish: async () => {
      // Persist messages and revalidate cache
      await saveChat(chatId, messages)
    },
  })
}
```

<!-- audit: HC-3 — removed DataContext (ctx) from saveChat call -->

### 7.2 ChatStreamProvider / StreamBridge (Split Context)

> **Updated per redesign audit (2026-03-01)**: Renamed from DataStreamProvider/Handler.
> Split context pattern preserved but with clearer naming.

```tsx
// features/chat/components/chat-stream-provider.tsx
'use client'

const ChatStreamStateContext = createContext<ChatStreamState>(null!)
const ChatStreamDispatchContext = createContext<ChatStreamDispatch>(null!)

// Split prevents re-renders: components reading state don't re-render
// when dispatch functions change, and vice versa.

// RAF batching: Stream deltas arrive at 10-20Hz. Batch state updates
// with requestAnimationFrame to limit re-renders to ~60fps:
// let pending = false
// function batchUpdate(delta) {
//   queue.push(delta)
//   if (!pending) {
//     pending = true
//     requestAnimationFrame(() => { flush(queue); pending = false })
//   }
// }
```

```tsx
// features/chat/components/stream-bridge.tsx (~20 lines)
'use client'

import { processStreamDelta } from '@/features/chat/lib/process-stream-deltas'

// StreamBridge is thin — it receives data parts from useChat and calls
// processStreamDelta() pure function to dispatch updates to ChatStreamProvider
// and artifact store.
```

### 7.3 Artifact Streaming (Tool → Data Parts → Store)

> **Updated per redesign audit (2026-03-01)**: useSyncExternalStore replaces SWR
> for artifact state. StreamBridge replaces DataStreamHandler.

```
Tool call → dataStream.writeData({ type: 'artifact-id/title/kind/clear' })
         → Handler streams content deltas
         → dataStream.writeData({ type: 'artifact-textDelta/codeDelta/sheetDelta' })
         → dataStream.writeData({ type: 'artifact-finish' })

Client: StreamBridge processes parts → processStreamDelta() → artifact store
     → useSyncExternalStore → panel renders
```

### 7.4 ChatSessionContext

> **Added per redesign audit (2026-03-01)**

```tsx
// features/chat/components/chat-shell.tsx (~60 lines)
'use client'

import { ChatSessionContext } from '@/features/chat/hooks/use-chat-session-context'
import { useChatSession } from '@/features/chat/hooks/use-chat-session'

export function ChatShell(props: ChatShellProps) {
  const chatSession = useChatSession(props)
  return (
    <ChatSessionContext.Provider value={chatSession}>
      <ChatHeader />
      <Messages />
      <MultimodalInput />
      <ArtifactPanel />
    </ChatSessionContext.Provider>
  )
}

// NOTE: StreamBridge and VoteResolver are SIBLINGS of ChatShell, NOT children.
// See component-wiring.md § 1 for the canonical layout:
//   <ChatStreamProvider>
//     <VotesProvider>              ← wraps ChatShell + StreamBridge + VoteResolver
//       <ChatShell />
//       <StreamBridge />           ← sibling
//       <Suspense><VoteResolver /></Suspense>  ← sibling, hydrates VotesProvider
//     </VotesProvider>
//   </ChatStreamProvider>
// <!-- Wave 4-VOTING: CONF-004 fix — VoteHydrator→VoteResolver per P7 gate + Implementation Agent Guide -->
```

Children access chat state via `useChatSessionContext()` — no prop drilling.

### 7.5 React 19 `use()` Promise-Passing (VotesProvider + VoteResolver)

> **Added per redesign audit (2026-03-01)**
> **Updated per Wave 4 reconciliation (CV-01/CV-02/CV-03, 2026-03-02):** Replaced `mergeVotes` / `useChatSessionContext()` with VotesProvider context pattern. VoteButtons rendered in message.tsx, not by VoteResolver.

```tsx
// Server component (page.tsx) starts the votes fetch — does NOT await it:
const votesPromise = session.user.type !== 'guest'
  ? getCachedVotes(id, session.user.id)
  : Promise.resolve([])
const chat = await getCachedChat(id)  // only chat is awaited

return (
  <ChatStreamProvider>
    <VotesProvider>                         {/* empty context initially */}
      <ChatShell id={id} initialMessages={chat.messages} />
      <StreamBridge id={id} />
      <Suspense>
        <VoteResolver votesPromise={votesPromise} />  {/* resolves, writes to VotesProvider */}
      </Suspense>
    </VotesProvider>
  </ChatStreamProvider>
)

// VoteResolver resolves with use(), hydrates VotesProvider context:
'use client'
import { use } from 'react'

function VoteResolver({ votesPromise }: { votesPromise: Promise<Vote[]> }) {
  const votes = use(votesPromise)       // Suspends until resolved
  const { setVotes } = useVotesContext()
  useEffect(() => { setVotes(votes) }, [votes, setVotes])
  return null                           // Render-less data bridge
}

// VoteButtons inside message.tsx reads from VotesProvider:
function VoteButtons({ chatId, messageId }: { chatId: string; messageId: string }) {
  const vote = useVoteForMessage(messageId)  // reads from VotesProvider context
  // ... renders ThumbsUp/ThumbsDown with useOptimistic
}
```

This pattern enables **parallel data fetching**: the server starts fetching votes
while the chat page streams — no waterfall. The `<Suspense>` boundary around
`VoteResolver` shows a fallback while votes load. VoteButtons in message.tsx
re-render when VotesProvider context is hydrated.

> **UX Note (AMB-4):** The Suspense boundary around VoteResolver produces a brief fallback flash while votes load. This is architecturally intentional — vote states are non-blocking for the primary chat content render. Inlining votes into the page component would reintroduce `Promise.all` blocking on the critical render path.

### Rules

- ✅ Streaming always via route handler (POST /api/chat)
- ✅ ChatStreamProvider wraps chat UI at page level
- ✅ StreamBridge is thin sibling of ChatShell, dispatches to store
- ✅ Artifact state managed via useSyncExternalStore (module-level store)
- ✅ Every data part prefixed with `artifact-` or `chat-`
- ❌ No Server Actions for streaming endpoints
- ❌ No direct ChatStreamProvider usage outside chat feature

---

## 8. Caching Patterns

### 8.1 Redis Cache (Operational)

> **Updated per Wave 4 reconciliation (HC-2, XDL-01, RC-01, 2026-03-02):** Redis scope corrected.
> Primary reads (chat, messages, artifacts, votes) use `'use cache'` + `cacheTag` (see §8.2 and §9).
> Redis is reserved for rate limiting, session cache, and operational data.

<!-- audit: HC-2 — Redis scope corrected to operational only -->
<!-- wave4: XDL-01/RC-01 — removed data-domain Redis code templates -->

Used for: rate limits, session cache, operational data.

```typescript
// Rate limiting pattern (ONLY valid Redis use for data)
import { redis } from '@/lib/cache/client'

// Rate limit check
const key = `rateLimit:${userId}`
const count = await redis.incr(key)
if (count === 1) await redis.expire(key, 60)
if (count > MAX_REQUESTS_PER_MINUTE) throw AppError.rateLimited()
```

> **Important:** No `cache.get`/`cache.set` for chat, message, artifact, or vote data.
> All data read caching uses `'use cache'` + `cacheTag` + `cacheLife` (§8.2).

### 8.2 `use cache` (Server-Rendered, Tag-Invalidated)

<!-- audit: HC-2 — expanded use cache scope to include primary reads -->

Used for: primary read paths (chat, chat history, artifacts, votes), model catalog, pricing data, static config.

```typescript
// lib/ai/catalog.ts
import { cacheTag, cacheLife } from 'next/cache'

export async function getModelCatalog() {
  'use cache'
  cacheTag('model-catalog')
  cacheLife('hours')   // Controls cache duration (seconds/hours/days)
  const models = await fetchModelsFromProviders()
  return models
}
```

### Decision: Redis vs `use cache`

> **Updated per Wave 4 (XDL-01, 2026-03-02):** Redis is NOT for data reads.
> All data reads (user-specific or shared) use `'use cache'`. Redis handles only rate limiting and operational data.

| Factor | Redis | `use cache` |
|--------|-------|-------------|
| Rate limiting / counters | ✅ | ❌ |
| Session cache | ✅ | ❌ |
| Data reads (chat, messages, artifacts, votes) | ❌ | ✅ |
| Shared/static data (models, config) | ❌ | ✅ |
| Tag-based invalidation | N/A | Built-in |
| Edge compatible | ✅ (Upstash) | ✅ (framework) |
<!-- wave4: XDL-01 — updated decision table to reflect Redis scoping -->

---

## 9. Revalidation Pattern

> **Added per redesign audit (2026-03-01)**

### Purpose

Keep `use cache` data fresh after mutations. Every mutation must pair with tag
invalidation.

### Primitives: `updateTag` vs `revalidateTag`

| Primitive | Used In | Behavior |
|-----------|---------|----------|
| `updateTag(tag)` | **Server Actions** | Immediate invalidation — user sees own writes; cached data expires instantly so the next request fetches fresh |
| `revalidateTag(tag, 'max')` | **Route Handlers** | Cooperative freshness — stale-while-revalidate semantics; serves stale then refreshes in background |

Server Actions use `updateTag` because the user expects immediate freshness after a
mutation (e.g., deleting a chat should immediately remove it from the sidebar — read-your-own-writes). Route
Handlers use `revalidateTag(tag, 'max')` because they serve concurrent requests and stale-while-revalidate
provides better latency.

### Mutation → Tag → Primitive Matrix

| Mutation | Tags Invalidated | Caller | Primitive |
|----------|-----------------|--------|-----------|
| `deleteChat({ chatId })` | `chats:{userId}` | Server Action | `updateTag` |
| `deleteAllChats()` | `chats:{userId}` | Server Action | `updateTag` |
| `renameChat({ chatId, title })` | `chat:{chatId}`, `chats:{userId}` | Server Action | `updateTag` |
| `updateChatVisibility({ chatId, visibility })` | `chat:{chatId}`, `chats:{userId}` | Server Action | `updateTag` |
| `voteOnMessage({ chatId, messageId, type })` | `votes:{chatId}` | Server Action | `updateTag` |
| `saveArtifactVersion(artifactId)` | `artifact:{artifactId}` | Route Handler | `revalidateTag` |
| `streamChat(chatId)` | `chat:{chatId}`, `chats:{userId}` | Route Handler | `revalidateTag` |
| `deleteTrailingMessages({ id, chatId })` | `chat:{chatId}` | Server Action | `updateTag` |

### Template — Server Action Invalidation Functions

```typescript
// lib/cache/revalidate.ts
import { updateTag } from 'next/cache'

// --- Server Action invalidation (immediate, read-your-own-writes) ---

export function invalidateChat(chatId: string) {
  updateTag(`chat:${chatId}`)
}

export function invalidateChatList(userId: string) {
  updateTag(`chats:${userId}`)
}

export function invalidateArtifact(artifactId: string) {
  updateTag(`artifact:${artifactId}`)
}

export function invalidateVotes(chatId: string) {
  updateTag(`votes:${chatId}`)
}
```
<!-- wave4: RC-02 — invalidateChat uses 1-param signature (chatId only); callers compose with invalidateChatList when needed -->

### Template — Route Handler Revalidation Functions

```typescript
// lib/cache/revalidate.ts (continued)
import { revalidateTag } from 'next/cache'

// --- Route Handler revalidation (cooperative freshness, stale-while-revalidate) ---

export function refreshChat(chatId: string) {
  revalidateTag(`chat:${chatId}`, 'max')
}

export function refreshChatList(userId: string) {
  revalidateTag(`chats:${userId}`, 'max')
}

export function refreshArtifact(artifactId: string) {
  revalidateTag(`artifact:${artifactId}`, 'max')
}
```
<!-- wave4: RC-02 — refreshChat uses 1-param signature (chatId only); callers compose with refreshChatList when needed -->

### Rules

- ✅ Every Server Action mutation calls the appropriate `invalidate*` function
- ✅ Every Route Handler mutation calls the appropriate `refresh*` function
- ✅ Tag names follow `entity:{id}` convention
- ✅ Use `updateTag` in Server Actions (immediate invalidation, read-your-own-writes)
- ✅ Use `revalidateTag(tag, 'max')` in Route Handlers (cooperative freshness, stale-while-revalidate)
- ❌ Never skip revalidation after a mutation
- ❌ Never use generic tags like `'all'` or `'data'`
- ❌ Never mix primitives — no `revalidateTag` in Server Actions, no `updateTag` in Route Handlers

---

## 10. Provider Tree

> **Added per redesign audit (2026-03-01)**

### Purpose

Minimal provider tree. Each provider wraps only the components that consume it.

### Layout Provider Tree

```tsx
// app/(chat)/layout.tsx (SERVER)
<PendingChatsProvider>     {/* wraps sidebar + content */}
  <SidebarProvider>
    <SidebarShell />       {/* SERVER component with 'use cache' */}
    {children}             {/* chat page */}
  </SidebarProvider>
</PendingChatsProvider>
```

### Page Provider Tree

```tsx
// app/(chat)/chat/[id]/page.tsx (SERVER)
<ChatStreamProvider>       {/* page-level, not layout */}
  <VotesProvider>            {/* empty context initially — Wave 4: CV-02 reconciliation */}
    <ChatShell>              {/* 'use client' — calls useChat, provides ChatSessionContext */}
      <ChatHeader />
      <Messages />
      <MultimodalInput />
      <ArtifactPanel />      {/* reads from artifact store */}
    </ChatShell>
    <StreamBridge />         {/* sibling — dispatches stream deltas */}
    <Suspense>
      <VoteResolver />       {/* use() for deferred votes — hydrates VotesProvider */}
    </Suspense>
  </VotesProvider>
</ChatStreamProvider>
```

### Rules

- ✅ SessionProvider at root layout level
- ✅ PendingChatsProvider at (chat) layout level
- ✅ ChatStreamProvider at page level (per-chat)
- ✅ No SettingsProvider (direct import)
- ✅ ThemeProvider at root layout level (global theming concern)
