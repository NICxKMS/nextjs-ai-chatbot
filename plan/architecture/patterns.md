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
import { cache } from '@/lib/cache'
import { cacheKeys } from '@/lib/cache/keys'
import type { Chat } from '@/lib/types'
import type { DataContext } from '@/lib/data/context'

export async function getChatById(
  id: string,
  ctx: DataContext
): Promise<Chat | null> {
  // 1. Check cache
  const cached = await cache.get<Chat>(cacheKeys.chat(id))
  if (cached) return cached

  // 2. Guest: cache-only, no DB fallback
  if (ctx.isGuest) return null

  // 3. Auth: DB fallback + cache warming
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, id),
  })
  if (chat) {
    await cache.set(cacheKeys.chat(id), chat, { ex: 3600 })
  }
  return chat ?? null
}

export async function createChat(data: {
  id: string
  userId: string
  title: string
  visibility: 'public' | 'private'
}): Promise<Chat> {
  const [chat] = await db.insert(chats).values(data).returning()
  // Write-through: update cache after DB write
  await cache.set(cacheKeys.chat(chat.id), chat, { ex: 3600 })
  await cache.del(cacheKeys.userChats(data.userId))
  return chat
}

export async function deleteChatById(
  id: string,
  userId: string
): Promise<void> {
  await db.delete(chats).where(eq(chats.id, id))
  await cache.del(cacheKeys.chat(id))
  await cache.del(cacheKeys.userChats(userId))
}
```

### DataContext

```typescript
// lib/data/context.ts
export type DataContext = {
  userId: string
  isGuest: boolean
}

// Also exported from lib/types/data-context.types.ts for cross-feature use
```

### withCache Helper

```typescript
// lib/cache/with-cache.ts
export async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T | null>
): Promise<T | null> {
  try {
    const cached = await cache.get<T>(key)
    if (cached) return cached
  } catch {
    // Cache failure: fall through to fetcher
  }

  const result = await fetcher()
  if (result) {
    try {
      await cache.set(key, result, { ex: ttl })
    } catch {
      // Cache write failure: non-fatal
    }
  }
  return result
}
```

### Rules

- ✅ One file per entity in `lib/data/`
- ✅ Every read function receives `DataContext`
- ✅ Guest users: cache-only, return null on miss
- ✅ Auth users: cache-first, DB fallback, warm cache
- ✅ Write functions: DB first, then cache update/invalidate
- ❌ No abstract classes or generics
- ❌ No direct DB access from actions (go through `lib/data/`)

---

## 2. Server Action Pattern

### Purpose

Feature-owned business logic callable from client or server. Handles validation,
auth, orchestration, and error handling.

### Template

```typescript
// features/chat/actions/save-message.ts
'use server'

import { getAppSession } from '@/features/auth/lib/session'
import { createDataContext } from '@/lib/data/context'
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

  // 3. Authorize (ownership check)
  const ctx = createDataContext(session)
  const chat = await getChatById(parsed.data.chatId, ctx)
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

import { revalidateTag } from 'next/cache'

export async function deleteChat(chatId: string): Promise<ActionResult> {
  const session = await getAppSession()
  if (!session) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }

  await deleteChatById(chatId, session.user.id)
  revalidateTag(`chat:${chatId}`)
  revalidateTag(`chats:${session.user.id}`)
  return { success: true, data: undefined }
}
```

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

```typescript
// app/api/chat/route.ts
import { streamChatAction } from '@/features/chat/actions/stream-chat'

export async function POST(request: Request) {
  const body = await request.json()
  return streamChatAction(body)
}
```

### Template — REST Route

```typescript
// app/api/history/route.ts
import { getAppSession } from '@/features/auth/lib/session'
import { getChatsByUserId } from '@/lib/data/chat'
import { createDataContext } from '@/lib/data/context'

export async function GET(request: Request) {
  const session = await getAppSession()
  if (!session) return AppError.unauthorized().toResponse()
  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 10), 100)
  const ctx = createDataContext(session)
  const chats = await getChatsByUserId(ctx.userId, { limit: limit + 1 })
  return Response.json({ chats: chats.slice(0, limit), hasMore: chats.length > limit })
}
```

### Rules

- ✅ Route files under 20 lines
- ✅ Streaming routes return SSE response from action
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
// features/chat/components/messages.tsx
import { getChatById } from '@/lib/data/chat'
import { Message } from './message'

export async function Messages({ chatId }: { chatId: string }) {
  const messages = await getMessagesByChatId(chatId)
  return (
    <div>
      {messages.map(msg => <Message key={msg.id} message={msg} />)}
    </div>
  )
}
```

### 4.2 Client Component

```tsx
// features/chat/components/multimodal-input.tsx
'use client'

import { useState, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'

export function MultimodalInput({ chatId }: { chatId: string }) {
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const { handleSubmit, input, setInput, status } = useChat({ id: chatId })

  const onSubmit = useCallback(() => {
    handleSubmit(undefined, { experimental_attachments: attachments })
    setAttachments([])
  }, [handleSubmit, attachments])

  return (
    <form onSubmit={onSubmit}>
      {/* ... */}
    </form>
  )
}
```

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
  | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND'
  | 'VALIDATION' | 'RATE_LIMITED' | 'AI_ERROR'
  | 'DATABASE_ERROR' | 'CACHE_ERROR'

export class AppError extends Error {
  // constructor(code, message, statusCode = 500, details?)
  // Static factories: unauthorized(), forbidden(), notFound(resource),
  //   validation(msg, details?), rateLimited()
  // toResponse() → Response.json({ error, code, details }, { status })
}
```

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

```typescript
// features/chat/actions/stream-chat.ts
import { streamText } from 'ai'
import { createUIMessageStream } from 'ai'
import { myProvider } from '@/lib/ai/providers'

export async function streamChatAction(body: ChatRequestBody) {
  const session = await getAppSession()
  if (!session) throw AppError.unauthorized()

  const ctx = createDataContext(session)
  const validated = chatRequestSchema.parse(body)

  return createUIMessageStream({
    execute: async (dataStream) => {
      // Title generation (parallel, non-blocking)
      if (isNewChat) {
        generateTitle(validated.message).then(title => {
          dataStream.writeData({ type: 'chat-title', content: title })
        })
      }

      // Main chat completion
      const result = streamText({
        model: myProvider.languageModel(validated.selectedChatModel),
        system: buildSystemPrompt(validated, session),
        messages: convertToModelMessages(validated.messages),
        tools: getEnabledTools(validated.selectedChatModel, session, dataStream),
        abortSignal: AbortSignal.timeout(55_000),
        // ... settings from user preferences
      })

      result.consumeStream()
      dataStream.merge(result.toUIMessageStream({ sendReasoning: true }))
    },
    onFinish: async () => {
      // Persist: save messages, increment quota, update title
      await saveChat(chatId, messages, ctx)
    },
  })
}
```

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

import { useChat } from '@ai-sdk/react'
import { ChatSessionContext } from '@/features/chat/hooks/use-chat-session-context'

export function ChatShell({ chatId, initialMessages }: ChatShellProps) {
  const chatSession = useChat({ id: chatId, initialMessages })
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
//     <ChatShell />
//     <StreamBridge />        ← sibling
//     <Suspense><VoteResolver /></Suspense>  ← sibling
//   </ChatStreamProvider>
```

Children access chat state via `useChatSessionContext()` — no prop drilling.

### 7.5 React 19 `use()` Promise-Passing (VoteResolver)

> **Added per redesign audit (2026-03-01)**

```tsx
// Server component (page.tsx) creates the promise — does NOT await it:
const votesPromise = getCachedVotes(chatId)  // returns Promise<Vote[]>
return <ChatShell votesPromise={votesPromise} />

// Client component resolves with use():
'use client'
import { use } from 'react'

function VoteResolver({ votesPromise }: { votesPromise: Promise<Vote[]> }) {
  const votes = use(votesPromise)       // Suspends until resolved
  const { mergeVotes } = useChatSessionContext()
  useEffect(() => { mergeVotes(votes) }, [votes])
  return null                           // Render-less data bridge
}
```

This pattern enables **parallel data fetching**: the server starts fetching votes
while the chat page streams — no waterfall. The `<Suspense>` boundary around
`VoteResolver` shows a fallback while votes load.

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

### 8.1 Redis Cache (User-Specific, Real-Time)

Used for: chat data, messages, artifacts, rate limits.

```typescript
// Read pattern
const chat = await cache.get<Chat>(cacheKeys.chat(id))

// Write-through pattern
await db.insert(chats)...
await cache.set(cacheKeys.chat(id), chat, { ex: 3600 })

// Invalidation pattern
await cache.del(cacheKeys.userChats(userId))
```

### 8.2 `use cache` (Server-Rendered, Shared)

Used for: model catalog, pricing data, static config.

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

| Factor | Redis | `use cache` |
|--------|-------|-------------|
| User-specific | ✅ | ❌ |
| Real-time updates | ✅ | ❌ |
| Guest-only data | ✅ | ❌ |
| Shared/static data | ❌ | ✅ |
| Tag-based invalidation | Manual | Built-in |
| Edge compatible | ✅ (Upstash) | ✅ (framework) |

---

## 9. Revalidation Pattern

> **Added per redesign audit (2026-03-01)**

### Purpose

Keep `use cache` data fresh after mutations. Every mutation must pair with tag
invalidation.

### Template

```typescript
// lib/cache/revalidate.ts
import { revalidateTag } from 'next/cache'

// Server Action revalidation (push invalidation)
export function invalidateChat(chatId: string, userId: string) {
  revalidateTag(`chat:${chatId}`)
  revalidateTag(`chats:${userId}`)
}

export function invalidateArtifact(artifactId: string) {
  revalidateTag(`artifact:${artifactId}`)
}

export function invalidateVotes(chatId: string) {
  revalidateTag(`votes:${chatId}`)
}
```

### Rules

- ✅ Every Server Action mutation calls the appropriate `invalidate*` function
- ✅ Route Handlers use `updateTag` for cooperative freshness
- ✅ Tag names follow `entity:{id}` convention
- ❌ Never skip revalidation after a mutation
- ❌ Never use generic tags like `'all'` or `'data'`

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
  <ChatShell>              {/* 'use client' — calls useChat, provides ChatSessionContext */}
    <ChatHeader />
    <Messages />
    <MultimodalInput />
    <ArtifactPanel />      {/* reads from artifact store */}
  </ChatShell>
  <StreamBridge />         {/* sibling — dispatches stream deltas */}
  <Suspense>
    <VoteResolver />       {/* use() for deferred votes */}
  </Suspense>
</ChatStreamProvider>
```

### Rules

- ✅ SessionProvider at root layout level
- ✅ PendingChatsProvider at (chat) layout level
- ✅ ChatStreamProvider at page level (per-chat)
- ✅ No SettingsProvider (direct import)
- ❌ ThemeProvider NOT at app level — let next-themes handle it
