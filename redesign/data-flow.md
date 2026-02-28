# Data Flow & Mutation Architecture

> Complete data fetching, mutation, caching, and revalidation strategy.
> Addresses: VII-1, VII-2, VII-3, VII-5, VII-6, VII-7, VIII-1, VIII-2, Observation A/C

---

## 1. Data Fetching Strategy

| Data | Where Fetched | Pattern | Cache Strategy | Revalidation |
|------|--------------|---------|----------------|--------------|
| Chat by ID (+ messages) | `chat/[id]/page.tsx` (SERVER) | `'use cache'` + `cacheTag` | `cacheTag('chat:{id}')`, `cacheLife('seconds')` | `updateTag` (SA) / `revalidateTag(tag, 'max')` (RH) |
| Chats by user (sidebar) | `SidebarShell` (SERVER) | `'use cache'` + `cacheTag` | `cacheTag('chats:{userId}')`, `cacheLife('seconds')` | `updateTag('chats:{userId}')` on any chat mutation |
| Sidebar pagination | `SidebarHistoryClient` (CLIENT) | `useSWRInfinite` + `GET /api/history` | SWR dedup (10s), `fallbackData` from server | SWR revalidation on mutation + `updateTag` |
| Messages by chat | Co-fetched with chat (SERVER) | Single DB query via `getChatWithMessages` | Tagged with `cacheTag('chat:{id}')` | Same as chat |
| Artifact by ID | `ArtifactPanel` (CLIENT) | `useSWR('/api/artifact?id=')` | SWR client cache + server `cacheTag('artifact:{id}')` | `revalidateTag('artifact:{id}', 'max')` on save |
| Artifact versions | `VersionFooter` (CLIENT) | `useSWR` on-demand | SWR client cache | `revalidateTag('artifact:{id}', 'max')` |
| Votes by chat | `chat/[id]/page.tsx` (SERVER) | `'use cache'` + `cacheTag` | `cacheTag('votes:{chatId}')` | `updateTag('votes:{chatId}')` on vote SA |
| User session | `getAppSession()` in layouts/pages | Server function (cookies) | Request-scoped memoization (`React.cache`) | Cookie mutation invalidates Router Cache |
| Model catalog | `getAvailableModels()` (SERVER) | `'use cache'` + `cacheTag` | `cacheTag('models')`, `cacheLife('hours')` | `revalidateTag('models', 'max')` (admin/deploy) |
| Suggestions | `GET /api/suggestions` (CLIENT) | `useSWR` on-demand | SWR client cache | On artifact update |
| Selected model | Cookie + localStorage | Cookie read (server) / localStorage (client) | No server cache — per-request | N/A (client preference) |

**Fixes:** II-1 (server-fetched sidebar), II-2 (parallel fetches), VII-1 (revalidation after every mutation), Observation C (server-side freshness)

---

## 2. Server-Side Fetching Patterns

### Chat Page — `/chat/[id]`

```tsx
// app/(chat)/chat/[id]/page.tsx — SERVER
import { cacheTag, cacheLife } from 'next/cache'

async function getCachedChat(chatId: string) {
  'use cache'
  cacheTag(`chat:${chatId}`)
  cacheLife('seconds')
  return getChatWithMessages(chatId)
}

async function getCachedVotes(chatId: string, userId: string) {
  'use cache'
  cacheTag(`votes:${chatId}`)
  cacheLife('seconds')
  return getVotesByChatId(chatId, userId)
}

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAppSession()

  // Parallel fetch — fixes II-2
  const [chat, votes] = await Promise.all([
    getCachedChat(id),
    session.user.type !== 'guest'
      ? getCachedVotes(id, session.user.id)
      : Promise.resolve([]),
  ])

  if (!chat) notFound()
  if (chat.userId !== session.user.id && chat.visibility !== 'public') notFound()

  const isReadonly = chat.userId !== session.user.id
  const models = await getAvailableModels()

  return (
    <ChatStreamProvider>
      <ChatShell
        id={id}
        initialMessages={chat.messages}
        initialChatModel={chat.model}
        isReadonly={isReadonly}
        availableModels={models}
      />
      <StreamBridge id={id} />
      <Suspense>
        <VoteResolver chatId={id} initialVotes={votes} />
      </Suspense>
    </ChatStreamProvider>
  )
}
```

### Home Page — `/`

```tsx
// app/(chat)/page.tsx — SERVER
export default async function NewChatPage() {
  const id = generateUUID()
  const session = await getAppSession()
  const models = await getAvailableModels()

  return (
    <ChatStreamProvider>
      <ChatShell
        id={id}
        initialMessages={[]}
        initialChatModel={getDefaultModel(session)}
        isReadonly={false}
        availableModels={models}
      />
      <StreamBridge id={id} />
    </ChatStreamProvider>
  )
}
```

### Sidebar — Server-Rendered Initial + Client Pagination

```tsx
// features/sidebar/components/sidebar-shell.tsx — SERVER
async function getCachedChats(userId: string) {
  'use cache'
  cacheTag(`chats:${userId}`)
  cacheLife('seconds')
  return getChatsByUserId(userId, { limit: 21 })
}

export async function SidebarShell({ session }: { session: AppSession }) {
  const chats = await getCachedChats(session.user.id)
  const hasMore = chats.length > 20

  return (
    <Sidebar>
      <SidebarHeader>{/* brand + new chat button */}</SidebarHeader>
      <SidebarContent>
        <SidebarHistoryClient
          initialChats={chats.slice(0, 20)}
          initialHasMore={hasMore}
        />
      </SidebarContent>
      <SidebarFooter>
        <SidebarUserNav session={session} />
      </SidebarFooter>
    </Sidebar>
  )
}
```

**Fixes:** II-1 (eliminates client waterfall: ~300ms vs ~1000ms)

### Auth Pages — Minimal Fetching

Auth pages (`/login`, `/register`) fetch nothing. Server layout renders a centered container. `AuthForm` is a client component using `useActionState`.

---

## 3. Mutation Architecture

| Mutation | Method | Pattern | Revalidation | Optimistic? |
|----------|--------|---------|--------------|-------------|
| Send message (stream) | `POST /api/chat` (Route Handler) | SSE stream via AI SDK | `revalidateTag('chat:{id}', 'max')` + `revalidateTag('chats:{userId}', 'max')` in `onFinish` | Messages via `useChat` |
| Save messages (post-stream) | Inside `onFinish` callback (Route Handler) | DB insert + cache update | `revalidateTag('chat:{id}', 'max')` | N/A (server-side) |
| Create chat (first message) | Inside `POST /api/chat` (Route Handler) | DB insert if new chat | `revalidateTag('chats:{userId}', 'max')` | `PendingChats.add()` |
| Update chat title | Inside `onFinish` (Route Handler) | Await title gen → stream `data-chatTitle` → DB update | `revalidateTag('chats:{userId}', 'max')` | `PendingChats.updateTitle()` |
| Delete chat | Server Action | `deleteChat()` | `updateTag('chats:{userId}')` | `PendingChats.remove()` |
| Delete all chats | Server Action | `deleteAllChats()` | `updateTag('chats:{userId}')` | Redirect to `/` |
| Update chat visibility | Server Action | `updateChatVisibility()` | `updateTag('chat:{id}')` + `updateTag('chats:{userId}')` | `useOptimistic` |
| Create artifact (AI tool) | Inside SSE stream (Route Handler) | Stream data parts → DB insert | `revalidateTag('artifact:{id}', 'max')` | Artifact store progressive update |
| Update artifact (AI tool) | Inside SSE stream (Route Handler) | Stream data parts → DB insert (new version) | `revalidateTag('artifact:{id}', 'max')` | Artifact store progressive update |
| Save artifact (user edit) | `POST /api/artifact` (Route Handler) | Debounced save → new version row | `revalidateTag('artifact:{id}', 'max')` | Local editor state |
| Vote on message | Server Action | `voteOnMessage()` | `updateTag('votes:{chatId}')` | `useOptimistic` |
| Upload file | `POST /api/files/upload` (Route Handler) | Multipart form → blob storage | None (attachment is ephemeral) | Upload progress state |
| Login | Server Action | `loginAction()` via `useActionState` | `cookies.set()` invalidates Router Cache | Form return value |
| Register | Server Action | `registerAction()` via `useActionState` | `cookies.set()` invalidates Router Cache | Form return value |
| Logout | Server Action | `logoutAction()` | `cookies.delete()` invalidates Router Cache | Redirect to `/login` |
| Delete trailing messages | Server Action | `deleteTrailingMessages()` | `updateTag('chat:{id}')` | `setMessages` via `useChat` |

**Fixes:** VII-1 (every mutation revalidates), VII-2 (unified two-tier pattern), VII-5 (vote as SA)

---

## 4. Revalidation Matrix

| Cache Tag | Tagged By | Invalidated By | Primitive |
|-----------|-----------|---------------|-----------|
| `chat:{id}` | `getCachedChat()` via `cacheTag` | delete trailing messages, update visibility | `updateTag` (SA) |
| `chat:{id}` | `getCachedChat()` via `cacheTag` | save messages (onFinish), update title | `revalidateTag(tag, 'max')` (RH) |
| `chats:{userId}` | `getCachedChats()` via `cacheTag` | delete chat, delete all chats | `updateTag` (SA) |
| `chats:{userId}` | `getCachedChats()` via `cacheTag` | create chat, update title (onFinish) | `revalidateTag(tag, 'max')` (RH) |
| `votes:{chatId}` | `getCachedVotes()` via `cacheTag` | vote on message | `updateTag` (SA) |
| `artifact:{id}` | `getCachedArtifact()` via `cacheTag` | create artifact, update artifact, user save | `revalidateTag(tag, 'max')` (RH) |
| `models` | `getAvailableModels()` via `cacheTag` | Deploy / admin action | `revalidateTag('models', 'max')` |

### Revalidation Utility

```typescript
// lib/cache/revalidate.ts
import { updateTag, revalidateTag } from 'next/cache'

// Server Actions — immediate, read-your-own-writes
export function invalidateChat(chatId: string) {
  updateTag(`chat:${chatId}`)
}
export function invalidateChatList(userId: string) {
  updateTag(`chats:${userId}`)
}
export function invalidateVotes(chatId: string) {
  updateTag(`votes:${chatId}`)
}

// Route Handlers — stale-while-revalidate, background refresh
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

**Rule**: `updateTag` in Server Actions (user sees own writes immediately). `revalidateTag(tag, 'max')` in Route Handlers (stale-while-revalidate, Route Handler can't invalidate Router Cache directly — per Next.js 16 docs).

**Fixes:** VII-1 (CRITICAL), Observation A (missing revalidation strategy)

---

## 5. Server Action vs Route Handler Decision

| Endpoint | Type | Why |
|----------|------|-----|
| Send message / AI streaming | Route Handler (`POST /api/chat`) | Long-lived SSE stream, not a simple request-response |
| Save artifact version (user edit) | Route Handler (`POST /api/artifact`) | Called from debounced editor, returns version data |
| File upload | Route Handler (`POST /api/files/upload`) | Multipart form data, returns blob URL |
| Chat history pagination | Route Handler (`GET /api/history`) | Paginated GET with cursor params, consumed by SWR |
| Suggestions fetch | Route Handler (`GET /api/suggestions`) | On-demand GET, consumed by SWR |
| Health check | Route Handler (`GET /api/health`) | Public status endpoint |
| Delete chat | Server Action | User-triggered mutation → `updateTag` |
| Delete all chats | Server Action | User-triggered mutation → `updateTag` |
| Vote on message | Server Action | User-triggered mutation → `updateTag` + `useOptimistic` |
| Update visibility | Server Action | User-triggered mutation → `updateTag` + `useOptimistic` |
| Rename chat | Server Action | User-triggered mutation → `updateTag` |
| Delete trailing messages | Server Action | User-triggered mutation → `updateTag` |
| Login | Server Action | Form action via `useActionState` → `cookies.set` |
| Register | Server Action | Form action via `useActionState` → `cookies.set` |
| Logout | Server Action | `cookies.delete` → redirect |

### Decision Rule

```
Is it an SSE stream or file upload?           → Route Handler
Is it a paginated GET consumed by SWR?        → Route Handler
Is it a public non-auth endpoint?             → Route Handler
Is it a user-triggered mutation?              → Server Action (updateTag works)
Is it a form submission?                      → Server Action (useActionState)
```

**Fixes:** VII-5 (vote moved from Route Handler to Server Action)

---

## 6. Error Handling for Mutations

### Server Action Throws → Client

Server Actions return `ActionResult<T>`, never throw (React sanitizes thrown errors in production):

```typescript
// lib/types/result.types.ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }
```

```typescript
// Client usage
const result = await deleteChat(chatId)
if (!result.success) {
  toast.error(result.error.message)
  // Optimistic state rolls back automatically via useOptimistic
}
```

**Fixes:** VII-7 (structured errors, no silent swallowing)

### Route Handler Fails → Client

Route Handlers throw `AppError`, caught at the handler boundary, serialized to JSON:

```typescript
// Error propagation: throw AppError → catch → AppError.toResponse() → JSON
// Client: useChat.onError receives structured { code, message, status }
```

### Stream Fails Mid-Way

```
1. Server: AbortSignal fires → save partial assistant response to DB
2. Client: useChat.onError fires → show toast, messages show partial response
3. On next page load: server-fetched messages include the partial response
4. User can regenerate from the partial state
```

**Fixes:** VII-4 (stream interruption saves partial data)

### User Navigates Away During Stream

```
1. useChat's AbortController aborts the SSE connection
2. useChatSession cleanup: stop() + artifactStore.reset()
3. Server: request.signal abort handler saves partial response
4. revalidateTag('chat:{id}', 'max') still fires if onFinish reaches
5. Next visit: fresh server-fetched data shows last saved state
```

### Form Action Error (Login/Register)

```typescript
// Server Action returns error via useActionState pattern
export async function loginAction(prevState: FormState, formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  // ... auth logic
  if (authError) return { error: { form: authError.message } }
  redirect('/')
}
// Client: useActionState renders error inline, form state preserved
```

---

## 7. Data Access Layer

### Directory: `lib/data/`

| File | Functions | Entity |
|------|-----------|--------|
| `chat.ts` | `getChatById`, `getChatWithMessages`, `getChatsByUserId`, `createChat`, `updateChatTitle`, `deleteChat`, `deleteAllChats` | Chat |
| `artifact.ts` | `getArtifactById`, `getArtifactVersions`, `saveArtifactVersion`, `deleteArtifactVersion` | Artifact (NOT "document") |
| `message.ts` | `getMessagesByChatId`, `saveMessages`, `deleteTrailingMessages` | Message |
| `vote.ts` | `getVotesByChatId`, `upsertVote` | Vote |
| `suggestion.ts` | `getSuggestionsByArtifactId`, `saveSuggestions` | Suggestion |
| `user.ts` | `getUserByEmail`, `createUser` | User |

### Cache-Through Pattern

```typescript
// lib/data/chat.ts
import { db } from '@/lib/db/client'
import { chat, message } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function getChatWithMessages(chatId: string) {
  const result = await db.query.chat.findFirst({
    where: eq(chat.id, chatId),
    with: { messages: { orderBy: [desc(message.createdAt)] } },
  })
  return result ?? null
}

export async function getChatsByUserId(userId: string, opts: { limit: number }) {
  return db.query.chat.findMany({
    where: eq(chat.userId, userId),
    orderBy: [desc(chat.createdAt)],
    limit: opts.limit,
  })
}
```

### Write-Through + Invalidation

```typescript
// features/chat/actions/delete-chat.ts
'use server'

import { z } from 'zod'
import { getAppSession } from '@/lib/auth/session'
import { deleteChat as deleteChatFromDb } from '@/lib/data/chat'
import { invalidateChatList } from '@/lib/cache/revalidate'
import type { ActionResult } from '@/lib/types/result.types'

const schema = z.object({ chatId: z.string().uuid() })

export async function deleteChat(input: z.infer<typeof schema>): Promise<ActionResult> {
  const session = await getAppSession()
  if (!session) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Login required' } }

  const { chatId } = schema.parse(input)

  const chat = await getChatById(chatId)
  if (!chat) return { success: false, error: { code: 'NOT_FOUND', message: 'Chat not found' } }
  if (chat.userId !== session.user.id) return { success: false, error: { code: 'FORBIDDEN', message: 'Not owner' } }

  await deleteChatFromDb(chatId)
  invalidateChatList(session.user.id) // updateTag — read-your-own-writes
  return { success: true, data: undefined }
}
```

### Route Handler Mutation (onFinish)

```typescript
// Inside POST /api/chat onFinish callback
async function onStreamFinish(chatId: string, userId: string, messages: Message[]) {
  await saveMessages(chatId, messages)

  const title = await titlePromise  // Awaited — guaranteed before stream close
  await updateChatTitle(chatId, title)

  // Stale-while-revalidate — Route Handler can't use updateTag
  refreshChat(chatId)
  refreshChatList(userId)
}
```

### Naming Discipline

All data access uses "artifact" terminology. The `Document` DB table is renamed to `Artifact`:

```typescript
// lib/db/schema.ts
export const artifact = pgTable('Artifact', {
  id: uuid('id').notNull(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  content: text('content'),
  kind: artifactKindEnum('kind').notNull().default('text'),
  userId: uuid('userId').references(() => user.id).notNull(),
  chatId: uuid('chatId').references(() => chat.id),
})
// Composite PK: (id, createdAt) — each save = new version row
```

**Fixes:** VIII-1 ("document" → "artifact" everywhere)

---

## Summary: What Changed from the Old Architecture

| Old Pattern | New Pattern | Finding |
|------------|-------------|---------|
| Zero `revalidateTag`/`updateTag` calls | Every mutation revalidates | VII-1 (CRITICAL) |
| 3 different mutation→UI patterns | Two-tier: SA+optimistic or Stream+data-part | VII-2 |
| `pollForTitle()` 5×500ms | Title awaited server-side, streamed once | VII-3, III-2 |
| Vote as `PATCH /api/vote` Route Handler | Server Action + `useOptimistic` | VII-5 |
| Visibility toggle missing revalidation | `updateTag` on SA | VII-6 |
| Thrown errors in Server Actions | Return `ActionResult<T>` | VII-7 |
| "document" in data layer | "artifact" everywhere | VIII-1 |
| Client-fetched sidebar (SWR waterfall) | Server-fetched initial data | II-1 |
| Sequential chat page fetches | `Promise.all` parallel | II-2 |
| `window.dispatchEvent` for titles | `PendingChats.updateTitle()` | III-2 |
| SWR-as-state for artifacts | `useSyncExternalStore` | III-1 |
