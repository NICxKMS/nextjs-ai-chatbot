# Audit IX: Architectural Redesign Recommendations

> **Auditor**: Oracle (Architecture Consultant)
> **Date**: 2026-02-28
> **Scope**: Synthesis of all 53 findings across Audits I–VIII
> **Inputs**: Prior audits (`audit-rsc-fetching-state.md`, `audit-coupling-props-perf.md`, `audit-actions-structure.md`), plan architecture files, Next.js 16 docs (`.next-docs/`), old app source (`oldapp/`)

---

## 1. Severity Assessment

### Overall Verdict: **REDESIGN REQUIRED**

The 53 findings include **3 CRITICAL**, **15 HIGH**, **19 MEDIUM**, and **6 LOW** issues. The three CRITICALs are not surface-level bugs — they are **structural defects** in how the plan composes components, manages state, and handles data freshness. They cannot be patched incrementally without cascading rework because each sits at the root of a dependency chain that other findings branch from.

**Evidence chain:**

```
CRITICAL-1: ChatLayoutClient monolith ('use client' wrapping everything)
  └── causes HIGH: ~50-70KB client bundle (VI-3)
  └── causes HIGH: PPR defeated (Obs-A in audit 1)
  └── causes HIGH: Sidebar ssr:false waterfall (I-2, II-1)
  └── causes HIGH: Provider scope too wide (V-3, V-5)
  └── causes MEDIUM: Hydration mismatch risk (VI-4)

CRITICAL-2: Chat God Component (14 responsibilities)
  └── causes HIGH: 15-16 props per child (V-1)
  └── causes HIGH: Setter-props as implicit RPC (V-4)
  └── causes HIGH: Cascading re-renders during streaming (VI-1)
  └── causes MEDIUM: Untestable side effects (IV-7, VIII-7)
  └── causes MEDIUM: Artifact state leaking across chats (IV-5)

CRITICAL-3: Zero revalidation strategy
  └── causes HIGH: Router Cache serves stale data after mutations (VII-1)
  └── causes HIGH: No unified mutation→UI pattern (VII-2)
  └── causes HIGH: Error propagation under-specified (VII-7)
  └── causes MEDIUM: Redundant title polling (VII-3)
  └── undermines every recommendation to move data server-side
```

**Fixing any one CRITICAL in isolation** creates inconsistency with the other two. For example:
- Moving the sidebar to server-side rendering (fixing CRITICAL-1) without adding revalidation (CRITICAL-3) means the server-rendered sidebar shows stale data after mutations.
- Decomposing the Chat component (fixing CRITICAL-2) without restructuring the layout (CRITICAL-1) still forces everything into a monolithic `'use client'` boundary.
- Adding revalidation (fixing CRITICAL-3) without server-side data fetching means `revalidateTag`/`updateTag` have nothing to invalidate because all data is fetched client-side via SWR.

The three CRITICALs are **co-dependent**. They must be addressed together.

### Cost of Inaction

| Timeline | Impact |
|----------|--------|
| **Immediate (build)** | Developers constantly fight the Chat God Component — every feature touches it, every change risk breakage. 14 responsibilities = 14 potential merge conflicts per PR. |
| **Short-term (3 months)** | Performance complaints: ~50-70KB bundle on chat route, 540-1250ms sidebar waterfall, visible skeleton flickers on every navigation. Users on mobile/slow networks hit 2-4s TTI. |
| **Medium-term (6 months)** | Stale data bugs surface: user deletes chat in one tab, sees it in another. Visibility changes don't propagate. The lack of revalidation creates a class of bugs that are intermittent and hard to reproduce. |
| **Long-term (12 months)** | Architecture prevents adoption of Next.js features. PPR cannot be leveraged. `use cache` has nothing to cache because everything is client-rendered. The app becomes a React SPA wrapped in Next.js — paying the framework cost without the framework benefits. |

**Quantified cost**: Based on the audit estimates, the current plan ships with:
- **~35-45KB** unnecessary client JavaScript (~60% of chat route bundle)
- **~80%** unnecessary re-renders during streaming
- **2-4x** slower sidebar time-to-content than necessary
- **0** server-side cache invalidation after any mutation
- **~50-100** unnecessary component re-renders per second during active streaming

---

## 2. Proposed Redesign

### A. Component Architecture Redesign

#### Problem: Two Monoliths

The current plan has two structural problems at opposite ends of the component tree:

1. **Top**: `ChatLayoutClient` wraps everything in `'use client'`, defeating server rendering
2. **Bottom**: `Chat` component orchestrates 14 concerns, concentrating all logic in one node

#### Before (Current Plan)

```
app/(chat)/layout.tsx (SERVER — reads cookies only)
└── ChatLayoutClient ('use client' — useSearchParams for toast)
    └── SettingsProvider
        └── DataStreamProvider
            └── OptimisticChatsProvider
                └── SidebarProvider
                    ├── AppSidebar (dynamic, ssr:false) ← SKELETON ONLY
                    └── SidebarInset
                        └── {children} ← pages
                            └── Chat ('use client' — GOD COMPONENT)
                                ├── ChatHeader
                                ├── Messages (12 props)
                                ├── MultimodalInput (15 props)
                                └── Artifact (16 props)
```

**Problems**: Layout is `'use client'`. Sidebar is client-only. Chat has 14 responsibilities. 15-16 props drilled per child. 9 provider levels deep. PPR defeated.

#### After (Redesigned)

```
app/(chat)/layout.tsx (SERVER — async, fetches session + sidebar cookie)
├── <NoticeHandler />                    'use client' island (renders null, ~15 lines)
│                                         Handles ?notice=chat_not_found toasts
│
├── <Script src="pyodide.js" />          Server component can render <Script>
│
└── <SidebarProvider defaultOpen={sidebarOpen}>     'use client' (receives {children})
    │
    ├── <Suspense fallback={<SidebarSkeleton />}>
    │   └── <SidebarShell />                         SERVER component (async)
    │       │   Fetches: session, first page of chat history
    │       │   Renders: brand header, new-chat button structure, footer structure
    │       └── <SidebarHistoryClient                'use client' island
    │               initialChats={chats}             Props: serialized initial data
    │               initialHasMore={hasMore} />      Client: SWR for pagination only
    │           <SidebarUserNav />                   'use client' island (theme, logout)
    │
    └── <SidebarInset>
        └── <OptimisticChatsProvider>                'use client' (wraps {children})
            └── {children}                           SERVER-rendered page content


app/(chat)/page.tsx  (SERVER — new chat)
  └── <ChatPage                                      SERVER component
        id={uuid()}
        initialMessages={[]}
        ... />

app/(chat)/chat/[id]/page.tsx (SERVER — existing chat)
  │   Fetches: session, chat+messages, votes (parallel via Promise.all)
  │   Access control: ownership + visibility check
  │
  └── <SettingsProvider>                             'use client' (page-scoped)
      └── <DataStreamProvider>                       'use client' (page-scoped)
          ├── <ChatShell                             'use client' (THIN orchestrator, ~60 lines)
          │       id={id}
          │       initialMessages={messages}
          │       initialChatModel={model}
          │       isReadonly={isReadonly}
          │       availableModels={models} >
          │   │
          │   │   Internally creates ChatContext via useChatSession() hook
          │   │   ChatContext provides: messages, sendMessage, stop, status,
          │   │                         input, setInput, attachments, etc.
          │   │
          │   ├── <ChatHeader />                     reads ChatContext + useSidebar
          │   ├── <Messages />                       reads ChatContext (3 own props max)
          │   ├── <MultimodalInput />                reads ChatContext (2 own props max)
          │   └── <ArtifactPanel />                  reads ChatContext (2 own props max)
          │
          ├── <DataStreamHandler />                  'use client' (renders null, bridge)
          │
          └── <Suspense>
              └── <VoteHydrator                      'use client' (renders null)
                      chatId={id}
                      votesPromise={votesPromise} /> Resolves promise, seeds SWR
              </Suspense>
```

#### Key Changes Explained

| Change | What | Why | Fixes |
|--------|------|-----|-------|
| Layout stays SERVER | Remove `ChatLayoutClient` entirely | Enables PPR, reduces bundle by ~35KB | CRITICAL-1, VI-3, VI-4 |
| `NoticeHandler` extracted | Tiny `'use client'` component wrapping `useSearchParams` | Prevents layout from becoming client component | I-1, IV-3 |
| Sidebar server-rendered | `SidebarShell` is async SERVER component | Eliminates 6-step waterfall, real HTML on first paint | I-2, II-1 |
| `SidebarHistoryClient` is island | Receives `initialChats` from server, uses SWR for pagination only | 2-4x faster sidebar content, progressive enhancement | II-1 |
| Providers scoped to page | `SettingsProvider` + `DataStreamProvider` move inside page | Streaming re-renders don't cascade to sidebar | I-4, III-3, V-3, V-5 |
| `ChatShell` replaces `Chat` | Thin orchestrator (~60 lines) that creates `ChatContext` | Eliminates God Component, reduces props from 16 to 2-4 per child | CRITICAL-2, V-1, IV-6 |
| `ChatContext` via `useChatSession()` | Custom hook encapsulating all `useChat` config + callbacks | 14 responsibilities become 3 focused units | CRITICAL-2, V-1, V-4 |
| `VoteHydrator` with promise | Non-critical data streams in via `use()` | Votes don't block initial chat render | V-2 |

#### ChatShell Decomposition Detail

The current 524-line `Chat` component decomposes into:

```
useChatSession(id, initialMessages, initialChatModel, ...)    ~120 lines (hook)
├── Encapsulates: useChat config, transport, experimental_prepareRequestBody
├── Encapsulates: onData handler (data-chatTitle, data-usage, data-appendMessage)
├── Encapsulates: onFinish handler (optimistic title update — NO polling)
├── Encapsulates: onError handler (error classification, toast)
├── Encapsulates: adaptive throttle calculation
├── Returns: ChatContextValue (messages, sendMessage, stop, status, input, etc.)
└── Exposes via ChatContext (React context, page-scoped)

useChatSideEffects(id, status, messages)                      ~40 lines (hook)
├── Encapsulates: optimistic chat creation effect
├── Encapsulates: artifact state reset on chat ID change
├── Encapsulates: URL query param handling (?query=)
└── Returns: void (pure side effects)

ChatShell                                                     ~60 lines (component)
├── Calls useChatSession() → provides ChatContext
├── Calls useChatSideEffects()
├── Renders: ChatHeader, Messages, MultimodalInput, ArtifactPanel
└── Renders: CreditAlertDialog (if retained) as self-contained component
```

**Props per child after decomposition:**

| Component | Before (props) | After (props from ChatContext + own) |
|-----------|----------------|--------------------------------------|
| Messages | 12 | 3 (chatError, clearError, isArtifactVisible) |
| MultimodalInput | 15 | 2 (availableModels, onModelChange) |
| ArtifactPanel | 16 | 2 (selectedVisibilityType, availableModels) |
| ChatHeader | 3 | 0 (reads ChatContext + useSidebar) |

---

### B. State Management Redesign

#### B.1 Replace SWR-as-State-Store with `useSyncExternalStore`

**Current**: `useSWR("artifact", null)` — SWR with no fetcher, used as global reactive state.

**Problem**: SWR triggers all 5+ subscribers on every mutation (no selector support). During streaming with deltas at 10-20Hz, this produces ~50-100 unnecessary re-renders/sec.

**Replacement**: Dedicated external store using `useSyncExternalStore` (pattern already validated by `SettingsProvider`):

```typescript
// features/artifacts/lib/artifact-store.ts
import type { UIArtifact } from '@/features/artifacts/types/artifact.types'

const INITIAL: UIArtifact = {
  documentId: '', title: '', kind: 'text', content: '',
  isVisible: false, status: 'idle',
}

let state: UIArtifact = INITIAL
const listeners = new Set<() => void>()

export const artifactStore = {
  getSnapshot: () => state,
  getServerSnapshot: () => INITIAL,
  subscribe: (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  setState: (updater: UIArtifact | ((prev: UIArtifact) => UIArtifact)) => {
    state = typeof updater === 'function' ? updater(state) : updater
    listeners.forEach(l => l())
  },
  reset: () => {
    state = INITIAL
    listeners.forEach(l => l())
  },
}

// Hook with selector — components only re-render when selected slice changes
export function useArtifact(): { artifact: UIArtifact; setArtifact: typeof artifactStore.setState } {
  const artifact = useSyncExternalStore(
    artifactStore.subscribe,
    artifactStore.getSnapshot,
    artifactStore.getServerSnapshot
  )
  return { artifact, setArtifact: artifactStore.setState }
}

export function useArtifactSelector<T>(selector: (s: UIArtifact) => T): T {
  return useSyncExternalStore(
    artifactStore.subscribe,
    () => selector(artifactStore.getSnapshot()),
    () => selector(artifactStore.getServerSnapshot())
  )
}
```

**Impact**:

| Metric | SWR-based | useSyncExternalStore |
|--------|-----------|---------------------|
| Re-renders during streaming (ArtifactPanel) | 10-20/sec | 10-20/sec (necessary) |
| Re-renders during streaming (ArtifactCloseButton) | 10-20/sec | ~0/sec (only isVisible changes) |
| Re-renders during streaming (DocumentPreview) | 10-20/sec | ~0/sec (only documentId changes) |
| Re-renders during streaming (VersionFooter) | 10-20/sec | ~0/sec (only version changes) |
| Bundle contribution | ~12KB (SWR) | 0KB (built-in React) |
| Total component re-renders per delta | ~5 | ~1 |

**SWR retention**: SWR remains for legitimate fetcher-backed uses:
- `useSWRInfinite` for sidebar history pagination (client-side)
- `useSWR` for artifact document version fetching (on-demand)
- Vote data (if not migrated to `useOptimistic`)

If votes and visibility fully migrate to Server Actions with `useOptimistic` (React 19), evaluate removing SWR entirely (~12KB savings).

#### B.2 Reduce Provider Nesting

**Current**: 9 levels deep (Root: 4 + Layout: 5)

**After**:

```
Root layout (SERVER):
  ThemeProvider                    // 'use client' (level 1)
    SWRConfig                      // 'use client' (level 2) — ONLY if SWR retained
      AuthProvider(session)        // 'use client' (level 3)
        {children}

Chat layout (SERVER):
  SidebarProvider                  // 'use client' (level 4)
    OptimisticChatsProvider        // 'use client' (level 5)
      {children}

Chat page (inside {children}):
  SettingsProvider                 // 'use client' (level 6)
    DataStreamProvider             // 'use client' (level 7)
      ChatContext.Provider         // inline (level 8 — NOT a separate file-level provider)
```

**Changes**:
- `TooltipProvider` removed from root — use `<TooltipProvider>` at point of consumption (e.g., inside sidebar, chat header) where tooltips are actually used.
- `SettingsProvider` and `DataStreamProvider` moved from layout to page level.
- `ChatContext` is inline, scoped within `ChatShell`. Not a standalone provider file.
- Maximum depth: **8** (was 9+), but critically, sidebar subtree only sees **5 levels** (Root 3 + Layout 2). Settings/DataStream changes do NOT propagate to sidebar.

#### B.3 Eliminate `window.dispatchEvent` Coupling

**Remove entirely**: The `chat-title-updated` window event. The 3x setTimeout polling pattern. The `pollForTitle()` function.

**Replace with**: Reliable server-side title delivery + optimistic context update.

```
SERVER (stream-chat.ts):
  const titlePromise = generateTitle(userMessage)
  // ... stream main AI content ...
  const title = await titlePromise           // AWAIT before closing
  if (!title) {
    fallbackTitle = userMessage.slice(0, 80)  // Guaranteed fallback
    dataStream.writeData({ type: 'data-chatTitle', content: fallbackTitle })
  } else {
    dataStream.writeData({ type: 'data-chatTitle', content: title })
  }
  // THEN close stream

CLIENT (useChatSession hook, onData handler):
  case 'data-chatTitle':
    updateOptimisticChatTitle(chatId, title)  // Sidebar updates immediately
    // NO polling. NO window events. Done.
```

**Single communication channel**: Stream → OptimisticChatsProvider → Sidebar reads. One mechanism, one path, typed, testable.

#### B.4 DataStream Batching for High-Frequency Updates

During streaming, DataStreamProvider updates on every SSE delta (~10-20Hz). Even with scoped providers, `DataStreamHandler` and any status readers still re-render frequently.

**Add RAF-based batching**:

```typescript
// Inside DataStreamProvider or useChatSession transport config
const pendingDeltas = useRef<DataPart[]>([])
const rafId = useRef<number | null>(null)

function onDataPart(delta: DataPart) {
  pendingDeltas.current.push(delta)
  if (!rafId.current) {
    rafId.current = requestAnimationFrame(() => {
      setDataStream(prev => [...prev, ...pendingDeltas.current])
      pendingDeltas.current = []
      rafId.current = null
    })
  }
}

// Cleanup on unmount
useEffect(() => () => {
  if (rafId.current) cancelAnimationFrame(rafId.current)
}, [])
```

This coalesces rapid deltas into ~60 updates/sec (display refresh rate) instead of 200+/sec from the raw SSE stream. Reduces DataStreamHandler re-renders by ~70% during peak streaming.

---

### C. Data Flow Redesign

#### C.1 Revalidation Strategy

The plan uses **zero** Next.js cache invalidation primitives. Every mutation writes to Redis and SWR only — the Router Cache, Data Cache, and Full Route Cache are never notified.

The redesign introduces server-side rendering for sidebar data and leverages `use cache` for shared data. This means Next.js caches must be invalidated on mutations.

**Revalidation Utility**:

```typescript
// lib/cache/revalidate.ts
import { updateTag } from 'next/cache'

/** Call from Server Actions (read-your-own-writes semantics) */
export function revalidateChat(chatId: string, userId: string) {
  updateTag(`chat:${chatId}`)
  updateTag(`chats:${userId}`)
}

export function revalidateArtifact(artifactId: string) {
  updateTag(`artifact:${artifactId}`)
}

export function revalidateVotes(chatId: string) {
  updateTag(`votes:${chatId}`)
}
```

**Complete Revalidation Matrix**:

| Mutation | Server Action or Route | Redis Action | Next.js Revalidation | Client-Side Update |
|----------|----------------------|-------------|---------------------|-------------------|
| Create chat (stream start) | Route Handler (POST /api/chat) | Set chat + messages | `revalidateTag('chats:{userId}', 'max')` | Optimistic via `addOptimisticChat()` |
| Update chat title | Route Handler (onFinish) | Update chat title | `revalidateTag('chats:{userId}', 'max')` | Optimistic via stream `data-chatTitle` |
| Delete chat | Server Action | Del chat + messages | `updateTag('chats:{userId}')` | Optimistic remove + redirect |
| Delete all chats | Server Action | Del all user chats | `updateTag('chats:{userId}')` | SWR full invalidation + redirect |
| Update visibility | Server Action | Update chat meta | `updateTag('chat:{chatId}')`, `updateTag('chats:{userId}')` | Optimistic via `useOptimistic` |
| Save messages (onFinish) | Route Handler | Set messages | `revalidateTag('chat:{chatId}', 'max')` | Already rendered via stream |
| Vote on message | Server Action | Upsert vote | `updateTag('votes:{chatId}')` | Optimistic via `useOptimistic` |
| Save artifact version | Route Handler | Set doc version | `revalidateTag('artifact:{id}', 'max')` | Already rendered via stream |

**Key distinction** (from Next.js 16 docs):
- `updateTag(tag)` — **Server Actions only**. Blocks until fresh data ready. User sees own writes immediately.
- `revalidateTag(tag, 'max')` — **Route Handlers + Server Actions**. Stale-while-revalidate. Background refresh.

Use `updateTag` for user-initiated mutations (delete, visibility toggle, vote) where the user expects to see the change immediately. Use `revalidateTag(tag, 'max')` for background operations (stream onFinish, title update) where stale-while-revalidate is acceptable.

#### C.2 Cache Tags for Server-Fetched Data

For the revalidation primitives to work, server-fetched data must be tagged. The plan uses Redis as the primary cache, but sidebar data moves server-side:

```typescript
// features/sidebar/components/sidebar-shell.tsx (SERVER component)
import { cacheTag, cacheLife } from 'next/cache'

export async function SidebarShell() {
  'use cache'
  const session = await getAppSession()
  if (!session) return <EmptyState />

  cacheTag(`chats:${session.user.id}`)
  cacheLife('seconds')  // Short-lived — chat list changes frequently

  const chats = await getChatsByUserId(session.user.id, { limit: 21 })
  const hasMore = chats.length > 20

  return (
    <SidebarHistoryClient
      initialChats={chats.slice(0, 20)}
      initialHasMore={hasMore}
    />
  )
}
```

**Note**: `use cache` requires `cacheComponents: true` in `next.config.ts`. The `cacheTag` labels allow `updateTag('chats:{userId}')` to invalidate this cached component output.

For per-chat data in the page server component, tag similarly:

```typescript
// app/(chat)/chat/[id]/page.tsx (SERVER)
async function getCachedChat(chatId: string, userId: string) {
  'use cache'
  cacheTag(`chat:${chatId}`)
  cacheLife('minutes')

  return getChatWithMessages(chatId, createDataContext({ userId, isGuest: false }))
}
```

#### C.3 Server-Side Initial Data + Client-Side Updates Pattern

The unified pattern for all data-bearing components:

```
1. SERVER component fetches initial data (tagged with cacheTag)
2. Passes data as props to CLIENT component (serialized in RSC payload)
3. CLIENT component uses data immediately (no loading state)
4. CLIENT component uses SWR/useOptimistic for subsequent updates
5. Mutations call Server Actions → updateTag → Next.js invalidates cached server data
6. On next navigation, server re-fetches fresh data (cache tags expired)
```

This gives:
- **First paint**: Real content from server (no skeleton, no waterfall)
- **Interactions**: Optimistic client-side updates (instant feedback)
- **Cross-tab consistency**: Server Actions invalidate Router Cache
- **Staleness recovery**: Navigation always gets fresh data post-mutation

#### C.4 Stream Completion → Data Persistence Reliability

**Problem**: If `onFinish` doesn't fire (abort, timeout, disconnect), assistant messages are lost.

**Solution**: Implement partial response saving:

```typescript
// stream-chat.ts (server)
let accumulatedContent = ''

const trackingTransform = new TransformStream({
  transform(chunk, controller) {
    if (chunk.type === 'text-delta') {
      accumulatedContent += chunk.textDelta
    }
    controller.enqueue(chunk)
  }
})

// Register abort handler
const abortHandler = async () => {
  if (accumulatedContent.length > 0) {
    await savePartialMessage(chatId, accumulatedContent, userId)
  }
}
request.signal.addEventListener('abort', abortHandler)

// On stream close, clean up
// (onFinish handles the normal save path)
```

**Client-side**: In `useChatSession`, call `stop()` on unmount and guard against stale stream data:

```typescript
useEffect(() => {
  return () => {
    if (status === 'streaming' || status === 'submitted') {
      stop()
    }
  }
}, [chatId])  // Abort on chat change or unmount
```

---

### D. Domain Boundary Redesign

#### D.1 Chat ↔ Artifacts Interface

**Problem**: `features/chat/lib/tools/create-document.ts` directly imports `documentHandlersByArtifactKind` from `features/artifacts/handlers/`. This violates the declared import rules.

**Solution**: Handler registry in `lib/` as a cross-cutting integration point:

```
lib/ai/artifact-handlers.ts              ← SHARED INTERFACE (registry)
  exports: registerArtifactHandler(), getArtifactHandler()
  depends on: lib/types/artifact.types.ts

lib/types/artifact-handler.types.ts      ← SHARED TYPES (contract)
  exports: ArtifactHandler interface, ArtifactStreamWriter interface

features/artifacts/handlers/index.ts     ← REGISTERS implementations
  imports: registerArtifactHandler from lib/ai/
  calls: registerArtifactHandler('text', textHandler)
  calls: registerArtifactHandler('code', codeHandler)

features/chat/lib/tools/create-artifact.ts  ← CONSUMES via registry
  imports: getArtifactHandler from lib/ai/
  calls: getArtifactHandler(kind).onCreate(dataStream, ...)
```

**DataStream write protocol** — shared interface so artifact handlers don't import from chat:

```typescript
// lib/types/artifact-handler.types.ts
export interface ArtifactStreamWriter {
  writeId(id: string): void
  writeTitle(title: string): void
  writeKind(kind: ArtifactKind): void
  writeClear(): void
  writeContentDelta(deltaType: string, content: string): void
  writeFinish(): void
}

export interface ArtifactHandler {
  kind: ArtifactKind
  onCreate(writer: ArtifactStreamWriter, params: CreateParams): Promise<void>
  onUpdate(writer: ArtifactStreamWriter, params: UpdateParams): Promise<void>
}
```

The route handler creates an adapter from the raw dataStream to `ArtifactStreamWriter`:

```typescript
// In stream-chat.ts or a utility
function createStreamWriter(dataStream: DataStream): ArtifactStreamWriter {
  return {
    writeId: (id) => dataStream.writeData({ type: 'data-id', content: id }),
    writeTitle: (title) => dataStream.writeData({ type: 'data-title', content: title }),
    // ... etc
  }
}
```

**Result**: Chat depends on `lib/ai/` and `lib/types/`. Artifacts depend on `lib/ai/` and `lib/types/`. Neither depends on the other directly. The circular conceptual dependency is broken.

#### D.2 Chat ↔ Sidebar Interface

**Remove**: `window.dispatchEvent('chat-title-updated')` — all three `setTimeout` calls and the event listener.

**Keep**: `OptimisticChatsProvider` as the single communication channel.

**Formalize the contract**:

```typescript
// lib/types/optimistic-chats.ts
export interface OptimisticChatOperations {
  add(chat: { id: string; title: string; visibility: 'public' | 'private' }): void
  remove(id: string): void
  updateTitle(id: string, title: string): void
}

export interface OptimisticChatState {
  entries: Map<string, OptimisticChat>
}
```

Both chat and sidebar import the interface from `lib/types/`. The provider in `features/sidebar/hooks/` implements it. Chat calls it through the typed context; sidebar reads it.

**Data flow (title example)**:

```
Server: stream-chat.ts awaits title → writes data-chatTitle before close
  ↓
Client: useChatSession.onData receives data-chatTitle
  ↓
Client: calls updateOptimisticChatTitle(chatId, title) via OptimisticChatsProvider
  ↓
Client: SidebarHistoryClient merges optimistic entry with server data → renders
  ↓
(No polling. No window events. One path.)
```

#### D.3 DataStreamHandler Boundary Fix

**Problem**: `DataStreamHandler` (in `features/chat/`) imports `useArtifact` from `features/artifacts/`. This is a cross-feature component import.

**Solution**: Extract the delta-processing logic into a pure function. Have `DataStreamHandler` call the pure function and publish results through the artifact store (accessed via `lib/`, not `features/artifacts/`):

```typescript
// features/chat/lib/process-stream-deltas.ts — PURE function, no React
export function processStreamDelta(
  delta: DataPart,
  currentArtifact: UIArtifact,
): { artifact: UIArtifact } {
  switch (delta.type) {
    case 'data-id': return { artifact: { ...currentArtifact, documentId: delta.data, status: 'streaming' } }
    case 'data-title': return { artifact: { ...currentArtifact, title: delta.data } }
    case 'data-clear': return { artifact: { ...currentArtifact, content: '', status: 'streaming' } }
    case 'data-finish': return { artifact: { ...currentArtifact, status: 'idle' } }
    default: return { artifact: currentArtifact }
  }
}
```

`DataStreamHandler` becomes a ~20-line bridge. The artifact store (`artifactStore.setState`) lives in `lib/` or is exported as part of the artifact feature's public API (an explicit, typed export — not reaching into internals).

#### D.4 AppShell Boundary Fix

**Problem**: `components/app-shell.tsx` imports `getAppSession()` from `features/auth/`.

**Solution**: Move `AppShell` to `app/_components/app-shell.tsx`. It's root layout plumbing, not a reusable shared component. Only the root layout uses it. This aligns with the convention that `app/` can import from `features/`.

---

### E. Naming & Cleanup

#### E.1 "document" → "artifact" Complete Rename Strategy

**Scope**: ~25-30 renames across ~15 files. Execution: **P00 (scaffold phase)** to prevent the inconsistency from propagating.

| Layer | Current | Renamed | Files Affected |
|-------|---------|---------|----------------|
| **DB schema** | `Document` table | `Artifact` table | `lib/db/schema.ts` |
| **DB schema** | `document_kind` enum | `artifact_kind` enum | `lib/db/schema.ts` |
| **DB schema** | `documentId` (Suggestion FK) | `artifactId` | `lib/db/schema.ts` |
| **DB schema** | `documentCreatedAt` | `artifactCreatedAt` | `lib/db/schema.ts` |
| **Data access** | `lib/data/document.ts` | `lib/data/artifact.ts` | File rename |
| **Data access** | `getDocumentById()` | `getArtifactById()` | Function rename |
| **Data access** | `saveDocumentVersion()` | `saveArtifactVersion()` | Function rename |
| **Data access** | `getDocumentVersions()` | `getArtifactVersions()` | Function rename |
| **Cache keys** | `doc:{id}:{userId}` | `artifact:{id}:{userId}` | `lib/cache/keys.ts` |
| **AI tools** | `createDocument` tool name | `createArtifact` | `features/chat/lib/tools/` |
| **AI tools** | `updateDocument` tool name | `updateArtifact` | `features/chat/lib/tools/` |
| **AI tool files** | `create-document.ts` | `create-artifact.ts` | File rename |
| **AI tool files** | `update-document.ts` | `update-artifact.ts` | File rename |
| **Handlers** | `documentHandlersByArtifactKind` | `artifactHandlersByKind` | `features/artifacts/handlers/` |
| **Handlers** | `DocumentHandler` interface | `ArtifactHandler` | Handler type rename |
| **API route** | Internal "document" references | "artifact" | `app/api/artifact/route.ts` |
| **Components** | `document-preview.tsx` | `artifact-preview.tsx` | `features/artifacts/components/` |
| **Components** | `DocumentPreview` | `ArtifactPreview` | Component rename |
| **Schemas** | `documentId` in Suggestion | `artifactId` | Zod schema + types |

**Migration note for DB**: If using Drizzle migrations, create a migration that renames the table and enum:
```sql
ALTER TABLE "Document" RENAME TO "Artifact";
ALTER TYPE "document_kind" RENAME TO "artifact_kind";
ALTER TABLE "Suggestion" RENAME COLUMN "documentId" TO "artifactId";
ALTER TABLE "Suggestion" RENAME COLUMN "documentCreatedAt" TO "artifactCreatedAt";
```

#### E.2 Credit/Gateway Logic Removal

| Item | Action | Location |
|------|--------|----------|
| `vercel-gateway` provider | **REMOVE** | `lib/ai/registry.ts` |
| `activate_gateway` error code | **REMOVE** | `lib/errors/codes.ts` |
| Credit depletion `AlertDialog` | **REMOVE** | `features/chat/components/` |
| `data-usage` credit display | **EVALUATE** — keep if useful as token usage display, rename context | DataStreamHandler |
| `setUsage()` state | **REMOVE** if credit display removed, **RENAME** to `setTokenUsage()` if kept | Chat component |
| Gateway-specific error handling | **REMOVE** | `features/chat/lib/chat-callbacks.ts` |
| "entitlements check" terminology | **RENAME** to "daily limit check" | All plan docs + code |
| `incrementQuota()` | **RENAME** to `incrementDailyMessageCount()` | `stream-chat.ts` |
| Daily quota (20 guest/100 auth) | **KEEP** as rate limiting | middleware + actions |
| Rate limiter (50 req/min) | **KEEP** unchanged | middleware |

---

## 3. Implementation Priority Matrix

Ordered by: Impact × Dependencies. Items at the top unblock the most downstream work.

| # | Change | Findings Fixed | Risk | Effort | Dependencies | Phase |
|---|--------|---------------|------|--------|-------------|-------|
| **1** | **Add revalidation strategy** — create `lib/cache/revalidate.ts`, add `updateTag`/`revalidateTag` to all mutations, add `cacheTag` to server-fetched data | CRITICAL-3, VII-1, VII-2, VII-6 | Low (additive, no existing behavior changes) | M (1-2 days) | None — can be added to existing actions | P01 |
| **2** | **Decompose Chat layout** — remove `ChatLayoutClient`, make layout a server component, extract `NoticeHandler`, restructure provider tree | CRITICAL-1, I-1, I-4, I-5, IV-3, V-3, V-5, VI-3, VI-4 | Medium (structural change to layout hierarchy) | L (2-3 days) | P00 scaffold must create correct directory structure | P00/P03 |
| **3** | **Server-render sidebar** — remove `ssr:false`, create `SidebarShell` server component, fetch initial history server-side | I-2, II-1, VI-3, VI-4 | Medium (changes sidebar data flow) | L (2-3 days) | #2 (layout must be server component first) | P05 |
| **4** | **Decompose Chat God Component** — create `useChatSession`, `useChatSideEffects`, `ChatContext`, slim `ChatShell` orchestrator | CRITICAL-2, IV-6, V-1, V-4, VI-1 | High (touches most-connected component) | L (3-4 days) | #2 (provider restructuring must be done first) | P03 |
| **5** | **Fix title delivery + remove window events** — await title in server stream, remove 3x polling, remove `window.dispatchEvent` | III-2, IV-2, VII-3, VIII-7 | Medium (changes server stream protocol) | M (1-2 days) | #4 (useChatSession encapsulates onFinish) | P03 |
| **6** | **Migrate artifact state to useSyncExternalStore** — create `artifactStore`, `useArtifact`/`useArtifactSelector` with native selectors | III-1, VI-1, VI-2, IV-5, VI-6 | Medium (replaces working SWR pattern) | M (2-3 days) | #4 (Chat decomposition defines artifact state boundaries) | P04 |
| **7** | **Introduce handler registry** — create `lib/ai/artifact-handlers.ts`, handler interface in `lib/types/`, registration in artifacts | IV-1, VIII-3, VIII-4 | Low (additive indirection) | S (0.5-1 day) | None | P04 |
| **8** | **Implement stream abort handling** — AbortController on navigation, partial response saving, `stop()` on unmount | VII-4, VI-5 | Medium (changes streaming lifecycle) | M (1-2 days) | #4 (useChatSession manages abort lifecycle) | P03 |
| **9** | **Standardize error handling** — result objects for Server Actions, `.toResponse()` for Route Handlers, define pattern per context | VII-7, VII-8 | Low (pattern change, not behavior change) | M (1-2 days) | #1 (revalidation strategy defines mutation pattern) | P01 |
| **10** | **Extract DataStreamHandler pure logic** — `processStreamDelta()` pure function, thin bridge component | IV-7, VIII-7 | Low (refactor, no behavior change) | S (0.5 day) | #6 (artifact store API must be defined) | P04 |
| **11** | **"document" → "artifact" rename** | VIII-1 | Low (mechanical rename) | M (1-2 days) | None — do in P00 before any code references the names | P00 |
| **12** | **Credit/gateway logic removal** | VIII-2 | Low (deletion) | S (0.5-1 day) | None — do in P00 | P00 |
| **13** | **Convert vote to Server Action** | VII-5 | Low (pattern improvement) | S (0.5 day) | #1 (needs revalidation utility) | P06 |
| **14** | **Add message list virtualization** | VI-7 | Low (additive) | M (1-2 days) | #4 (Messages receives data from ChatContext) | P03 |
| **15** | **DataStream RAF batching** | V-5 | Low (performance optimization) | S (0.5 day) | #4 (batching lives in useChatSession) | P03 |
| **16** | **SWR cache cleanup + memory leak fixes** | VI-6 | Low (additive cleanup) | S (0.5 day) | #6 (depends on whether SWR is retained) | P07 |
| **17** | **Import boundary enforcement** — Biome rules or TS project references | VIII-8 | Low (tooling addition) | M (1-2 days) | P00 scaffold | P07 |
| **18** | **Test infrastructure** — mock utilities, stream test helpers, per-phase test requirements | VIII-5 | Low (additive) | L (2-3 days) | P01 data layer | P01+ |
| **19** | **Promise-passing pattern for non-critical data** (votes, usage) | V-2 | Low (optimization) | S (0.5 day) | #4 (ChatShell defines data flow) | P03 |
| **20** | **Parallelize chat page fetches** | II-2 | Low (easy win) | S (0.5 day) | None | P03 |

**Total estimated additional effort: ~22-32 days** on top of the existing ~19.5 day plan. However, many of these changes **replace** existing planned tasks rather than adding net-new work. The actual net addition is estimated at **~10-15 days**.

---

## 4. Phase Plan Impact

### P00 — Scaffold (was ~1 day, becomes ~2 days)

**New/Modified Tasks**:

| Task | Change | Reason |
|------|--------|--------|
| P00-T0X (NEW) | Execute "document" → "artifact" rename in schema, data layer, cache keys, tool names | Prevents inconsistency from propagating (Finding VIII-1) |
| P00-T0X (NEW) | Remove credit/gateway references from all plan-generated scaffolds | Finding VIII-2 |
| P00-T0X (NEW) | Create `lib/cache/revalidate.ts` with `revalidateChat`, `revalidateArtifact`, `revalidateVotes` | Foundation for CRITICAL-3 fix |
| P00-T0X (NEW) | Create `lib/types/artifact-handler.types.ts` with `ArtifactHandler`, `ArtifactStreamWriter` interfaces | Foundation for D.1 boundary fix |
| P00-T0X (NEW) | Create `lib/types/optimistic-chats.ts` with `OptimisticChatOperations` interface | Foundation for D.2 boundary fix |
| Existing layout tasks | **MODIFY**: `chat-layout-client.tsx` is NOT created. Layout stays server component. Create `NoticeHandler` instead. | CRITICAL-1 fix |
| Existing provider wiring | **MODIFY**: Provider tree follows restructured scoping (SidebarProvider + OptimisticChatsProvider in layout; Settings + DataStream in page) | I-4, V-3 fix |

### P01 — Data Foundation (was ~2 days, becomes ~2.5 days)

**New/Modified Tasks**:

| Task | Change | Reason |
|------|--------|--------|
| All `lib/data/` functions | **MODIFY**: Add `cacheTag()` calls for data used by server components. Use renamed "artifact" naming. | CRITICAL-3 foundation |
| All server actions | **MODIFY**: Add `updateTag`/`revalidateTag` calls per revalidation matrix | CRITICAL-3 fix (VII-1) |
| P01-T0X (NEW) | Define Server Action error pattern — result objects `{ success, data?, error? }` instead of throws | VII-7 fix |
| P01-T0X (NEW) | Create test mock utilities: `mockSession()`, `createTestDb()`, `createTestCache()` | VIII-5 fix |

### P02 — Auth (unchanged, ~1.5 days)

No structural changes needed. Minor:
- AuthProvider guest bootstrap should be evaluated for extraction (Finding III-5), but this is LOW priority and doesn't change the phase.
- If progressive enhancement is desired, implement server-side Supabase auth in login action (VII-8). Otherwise, drop the PE claim.

### P03 — Chat Core (was ~4 days, becomes ~6-7 days) ← **Most impacted**

**New/Modified Tasks**:

| Task | Change | Reason |
|------|--------|--------|
| `chat.tsx` | **REPLACE**: Instead of creating a 524-line God Component, create: `ChatShell` (~60 lines), `useChatSession` hook (~120 lines), `useChatSideEffects` hook (~40 lines), `ChatContext` | CRITICAL-2 fix |
| `data-stream-handler.tsx` | **MODIFY**: Extract `processStreamDelta()` as pure function. Handler becomes ~20-line bridge. | IV-7 fix |
| `data-stream-provider.tsx` | **MODIFY**: Move to page-level rendering (not layout). Add RAF batching for high-frequency deltas. | V-5 fix |
| `stream-chat.ts` | **MODIFY**: Await title generation before stream close. Add abort handler for partial response saving. Remove title polling infrastructure. | VII-3, VII-4, V fix |
| `messages.tsx` | **MODIFY**: Add react-virtuoso for message list. Lazy-mount DocumentPreview with intersection observer. | VI-7 fix |
| Title delivery | **MODIFY**: Remove `pollForTitle()`, remove `window.dispatchEvent('chat-title-updated')`, remove 3x setTimeout pattern | III-2, IV-2 fix |
| `chat-callbacks.ts` (NEW) | **ADD**: Extract onData, onError, onFinish callback logic as pure functions | I-3 fix |
| Chat page | **MODIFY**: Use `Promise.all` for chat+votes fetch. Use promise-passing for non-critical data. | II-2, V-2 fix |
| P03-T0X (NEW) | **ADD**: Stream abort handling — AbortController lifecycle in `useChatSession`, `stop()` on unmount | VII-4, VI-5 fix |

**Tasks INVALIDATED**:
- Any task creating `ChatLayoutClient` — eliminated
- Any task wiring `window.dispatchEvent` for title sync — eliminated
- Any task implementing `pollForTitle()` — eliminated

### P04 — Artifacts (was ~4 days, becomes ~5-6 days)

**New/Modified Tasks**:

| Task | Change | Reason |
|------|--------|--------|
| `use-artifact.ts` | **REPLACE**: Replace SWR-based `useArtifact` with `useSyncExternalStore`-based `artifactStore` | III-1, VI-1, VI-2 fix |
| `use-artifact-selector.ts` | **REPLACE**: Native selector via `useSyncExternalStore` (not SWR + useMemo) | VI-2 fix |
| Handler registration | **MODIFY**: Use `registerArtifactHandler()` from `lib/ai/artifact-handlers.ts` instead of direct handler map export | IV-1, VIII-3 fix |
| Tool files (`create-artifact.ts`, `update-artifact.ts`) | **MODIFY**: Import `getArtifactHandler()` from `lib/ai/` instead of direct import from `features/artifacts/` | IV-1 fix |
| Artifact state scoping | **MODIFY**: Key artifact state by chat ID or implement synchronous reset at store level | IV-5 fix |

### P05 — Sidebar (was ~2 days, becomes ~3-4 days)

**New/Modified Tasks**:

| Task | Change | Reason |
|------|--------|--------|
| `app-sidebar.tsx` | **REPLACE**: Make it a server component shell. Remove `dynamic(import, { ssr: false })`. | I-2 fix |
| `sidebar-shell.tsx` (NEW) | **ADD**: Async server component that fetches initial chat history, renders structural sidebar. | II-1 fix |
| `sidebar-history-client.tsx` | **MODIFY**: Receives `initialChats` as prop. Uses `useSWRInfinite` for pagination only (not initial load). | II-1 fix |
| `sidebar-history.tsx` | **MODIFY**: Remove `window.addEventListener('chat-title-updated')`. Read only from OptimisticChatsProvider. | IV-2 fix |
| OptimisticChatsProvider | **MODIFY**: Move to chat layout level (wraps both SidebarInset and sidebar). Implement `OptimisticChatOperations` interface. | D.2 boundary fix |

### P06 — Enhancements (was ~3 days, becomes ~3.5 days)

**New/Modified Tasks**:

| Task | Change | Reason |
|------|--------|--------|
| Vote system | **MODIFY**: Convert from Route Handler to Server Action. Use `useOptimistic` for optimistic updates. Add `updateTag('votes:{chatId}')`. | VII-5 fix |
| Visibility toggle | **MODIFY**: Add `updateTag` calls to server action | VII-6 fix |
| `data-usage` handling | **EVALUATE**: Keep as token usage display (rename from "credit" terminology) or remove if credit-only | VIII-2 fix |

### P07 — Polish (was ~2 days, becomes ~3-4 days)

**New/Modified Tasks**:

| Task | Change | Reason |
|------|--------|--------|
| P07-T0X (NEW) | SWR cache cleanup utilities — evict stale keys on navigation | VI-6 fix |
| P07-T0X (NEW) | Import boundary enforcement — Biome rule or TS project references or CI script | VIII-8 fix |
| P07-T0X (NEW) | Memory leak audit — verify MutationObserver/ResizeObserver cleanup, DataStream array reset | VI-6 fix |
| Integration testing | **EXPAND**: Add cross-phase integration tests at phase boundaries (auth+data, chat+artifacts, sidebar+chat) | VIII-5 fix |

### Revised Phase Summary

| Phase | Original Est. | Revised Est. | Delta | Key Changes |
|-------|--------------|-------------|-------|-------------|
| P00 | ~1 day | ~2 days | +1 day | Rename strategy, credit removal, interface scaffolds |
| P01 | ~2 days | ~2.5 days | +0.5 days | Revalidation utilities, error pattern, test mocks |
| P02 | ~1.5 days | ~1.5 days | 0 | No structural changes |
| P03 | ~4 days | ~6-7 days | +2-3 days | Chat decomposition, stream reliability, abort handling |
| P04 | ~4 days | ~5-6 days | +1-2 days | Artifact store migration, handler registry |
| P05 | ~2 days | ~3-4 days | +1-2 days | Server-rendered sidebar, initial data pattern |
| P06 | ~3 days | ~3.5 days | +0.5 days | Vote conversion, visibility revalidation |
| P07 | ~2 days | ~3-4 days | +1-2 days | Cleanup, import enforcement, integration tests |
| **Total** | **~19.5 days** | **~27-31 days** | **+7.5-11.5 days** | |

**Net cost**: ~8-12 additional days of effort. This is a **40-60% increase** in timeline. However, it eliminates:
- 3 CRITICAL architectural defects that would require larger rework post-ship
- ~35-45KB unnecessary client bundle
- ~80% unnecessary streaming re-renders
- A class of stale-data bugs with no current mitigation
- Cross-feature coupling through untyped global events

The cost of NOT fixing (debugging stale data bugs + performance optimization post-ship + eventual decomposition of the God Component) is conservatively estimated at **2-3x the upfront cost** based on industry patterns for architectural debt remediation.

---

## 5. Recommended Action Items

Concrete, ordered steps. Each depends on its predecessors.

### Immediate (Before Implementation Begins)

1. **Update `patterns.md`** — Add two new sections:
   - §9: Revalidation Pattern (decision tree: mutation type → `updateTag` vs `revalidateTag(tag, 'max')`)
   - §10: Error Handling by Context (Server Actions return result objects; Route Handlers use `.toResponse()`)

2. **Update `conventions.md`** — Replace the provider tree diagram with the restructured version (server layout + page-scoped providers).

3. **Update `component-wiring.md`** — Replace §1 (Provider Tree) and §4 (Data Flow) with the restructured component architecture.

4. **Update `decisions.md`** — Add ADR-010: "Artifact state uses `useSyncExternalStore`, not SWR" with rationale.

5. **Update `directory-structure.md`** — Remove `chat-layout-client.tsx`. Add `sidebar-shell.tsx` (server component). Rename all "document" references to "artifact".

### Phase P00 Additions

6. **Execute "document" → "artifact" rename** in all schema definitions, data access files, cache keys, tool names, API routes, and component names. Create DB migration.

7. **Remove credit/gateway references** from all scaffolded files. Rename "entitlements" → "daily limits". Remove `activate_gateway` error code. Remove `vercel-gateway` provider.

8. **Create shared interface files**: `lib/types/artifact-handler.types.ts`, `lib/types/optimistic-chats.ts`, `lib/cache/revalidate.ts`.

9. **Enable `cacheComponents: true`** in `next.config.ts` to support `use cache` + `cacheTag`.

### Phase P01 Additions

10. **Add `cacheTag()` calls** to all data functions that will be used by server components (sidebar chat list, individual chat fetch).

11. **Add `updateTag`/`revalidateTag` calls** to every mutation in `lib/data/` and every server action, per the revalidation matrix in §C.1.

12. **Define Server Action error pattern** — implement result-object return type for all Server Actions. Reserve `throw` for unexpected errors only.

13. **Create test infrastructure** — `tests/mocks/auth.ts`, `tests/mocks/db.ts`, `tests/mocks/cache.ts`, `tests/utils/stream.ts`.

### Phase P03 Modifications

14. **Do NOT create `ChatLayoutClient`**. The chat layout is a server component. Period.

15. **Create the Chat decomposition**:
    - `features/chat/hooks/use-chat-session.ts` — encapsulates `useChat` configuration + all callbacks
    - `features/chat/hooks/use-chat-side-effects.ts` — encapsulates navigation effects
    - `features/chat/components/chat-shell.tsx` — thin orchestrator providing `ChatContext`
    - `features/chat/lib/chat-callbacks.ts` — pure functions for onData, onError, onFinish

16. **Fix title delivery**: In `stream-chat.ts`, `await` the title promise before closing the stream. Emit a fallback title if generation fails. Do NOT implement `pollForTitle()` or `window.dispatchEvent`.

17. **Add stream abort handling**: `AbortController` lifecycle in `useChatSession`, partial response saving on server abort.

18. **Add message virtualization**: `react-virtuoso` in `messages.tsx` with `followOutput` for streaming.

### Phase P04 Modifications

19. **Create `artifactStore`** using `useSyncExternalStore`. Implement `useArtifact()` and `useArtifactSelector()` with true selector support.

20. **Create handler registry** in `lib/ai/artifact-handlers.ts`. Artifact handlers register via `registerArtifactHandler()`. Chat tools consume via `getArtifactHandler()`.

21. **Extract `processStreamDelta()`** as a pure function. `DataStreamHandler` becomes a 20-line bridge.

### Phase P05 Modifications

22. **Make `AppSidebar` a server component shell**. Remove `dynamic(import, { ssr: false })`.

23. **Create `SidebarShell`** server component with `use cache` + `cacheTag('chats:{userId}')`. Fetches first page of history. Passes to `SidebarHistoryClient` as props.

24. **Remove `window.addEventListener('chat-title-updated')`** from sidebar history. All title updates flow through `OptimisticChatsProvider`.

### Phase P06 Modifications

25. **Convert vote to Server Action** with `useOptimistic` for optimistic updates and `updateTag('votes:{chatId}')`.

### Phase P07 Additions

26. **Implement SWR cache cleanup** on chat navigation — evict stale vote/visibility keys.

27. **Add import boundary enforcement** — evaluate Biome `noRestrictedImports` nursery rule. If unavailable, create CI script + pre-commit hook. Consider TS project references for strongest enforcement.

28. **Add cross-phase integration test checkpoints** — test auth+data, chat+artifacts, sidebar+chat.

---

## Appendix: Confidence Levels

| Recommendation | Confidence | Rationale |
|---------------|-----------|-----------|
| Server layout (remove ChatLayoutClient) | **95%** | Next.js 16 docs explicitly support this pattern. No technical risk. |
| Chat decomposition (useChatSession + ChatContext) | **90%** | Standard React pattern. Risk is in the exact API surface of ChatContext. |
| Revalidation strategy | **90%** | Directly supported by `updateTag`/`revalidateTag` docs. Risk is in cache tag granularity. |
| Server-rendered sidebar | **85%** | Requires careful handling of `use cache` + `cacheTag` for user-specific data. May need per-user cache partitioning. |
| Artifact store migration | **85%** | `useSyncExternalStore` pattern already validated by SettingsProvider. Risk is in migrating all consumers. |
| Handler registry | **90%** | Dependency Inversion is well-understood. Registration ordering is the only concern (mitigated by import-time execution). |
| Window event removal | **95%** | The fix (await title before stream close) is simple. The current pattern is indefensible. |
| RAF batching for DataStream | **80%** | Performance improvement is guaranteed. Risk is in edge cases where batching delays critical updates (e.g., `data-finish` arriving in the same RAF frame as content deltas). Mitigated by processing `data-finish` synchronously outside the batch. |
| SWR removal | **60%** | SWR has legitimate uses (pagination, on-demand fetching). Full removal is stretch goal; partial replacement is the safe path. |

---

## Appendix: Finding Cross-Reference

Every finding from the three audits mapped to the redesign section that addresses it.

| Finding | Severity | Redesign Section |
|---------|----------|-----------------|
| I-1 ChatLayoutClient monolith | CRITICAL | §A (server layout) |
| I-2 AppSidebar ssr:false | HIGH | §A (server sidebar), Priority #3 |
| I-3 Business logic in client callbacks | MEDIUM | Priority #4 (chat-callbacks.ts) |
| I-4 Provider tree forces client hydration | MEDIUM | §B.2 (provider restructuring) |
| I-5 TooltipProvider at root | LOW | §B.2 (remove from root) |
| II-1 Sidebar waterfall | HIGH | §A (SidebarShell), Priority #3 |
| II-2 Sequential chat page fetches | MEDIUM | Priority #20 |
| II-3 SWR config disables core features | MEDIUM | §B.1 (context + rationale) |
| II-4 Artifact fetch correctly client-side | LOW | No change needed |
| II-5 Model catalog use cache | NONE | Positive finding |
| II-6 Redis + use cache separation | LOW | No change needed |
| III-1 SWR as artifact state store | MEDIUM | §B.1 (useSyncExternalStore), Priority #6 |
| III-2 OptimisticChats + window events | HIGH | §B.3 (remove window events), Priority #5 |
| III-3 DataStreamProvider scope too wide | LOW | §B.2 (page-scoped) |
| III-4 SettingsProvider scope correct | LOW | §B.2 (page-scoped, no behavior change) |
| III-5 AuthProvider guest bootstrap | MEDIUM | P02 evaluation |
| III-6 9 provider levels | MEDIUM | §B.2 (reduced to 8 max, better scoping) |
| IV-1 Chat→Artifacts direct import | HIGH | §D.1 (handler registry), Priority #7 |
| IV-2 Chat↔Sidebar 3-channel coupling | HIGH | §B.3, §D.2 (single channel), Priority #5 |
| IV-3 Business logic in layout | MEDIUM | §A (NoticeHandler extraction) |
| IV-4 AppShell imports from features/auth | MEDIUM | §D.4 |
| IV-5 Artifact state leaks across chats | MEDIUM | §B.1 (keyed or synchronous reset) |
| IV-6 Chat God Component | CRITICAL | §A (ChatShell decomposition), Priority #4 |
| IV-7 DataStreamHandler hidden controller | MEDIUM | §D.3 (pure function extraction), Priority #10 |
| V-1 15-16 props per child | HIGH | §A (ChatContext reduces to 2-4) |
| V-2 Server→Client prop cascade | MEDIUM | Priority #19 (promise-passing) |
| V-3 Providers lifted too high | HIGH | §B.2 (page-scoped Settings + DataStream) |
| V-4 Setter props as implicit RPC | MEDIUM | §A (intent-based callbacks in ChatContext) |
| V-5 DataStream high-frequency cascades | HIGH | §B.2 + §B.4 (page-scoped + RAF batching) |
| VI-1 Two-stage cascading re-renders | HIGH | §B.1 (useSyncExternalStore + selectors) |
| VI-2 SWR "artifact" triggers all consumers | HIGH | §B.1 (native selector support) |
| VI-3 ~50-70KB client bundle | HIGH | §A (server layout saves ~60%) |
| VI-4 Hydration mismatch risks | MEDIUM | §A (server sidebar removes ssr:false) |
| VI-5 No stream abort on navigation | HIGH | Priority #8 |
| VI-6 Memory leaks | MEDIUM | Priority #16 |
| VI-7 Message virtualization not planned | MEDIUM | Priority #14 |
| VII-1 No revalidation after mutations | CRITICAL | §C.1 (full revalidation matrix), Priority #1 |
| VII-2 No unified mutation→UI pattern | HIGH | §C.1, §C.3 (two-tier pattern) |
| VII-3 Title polling redundant | MEDIUM | §B.3 (await title, no polling) |
| VII-4 Stream interruption data loss | HIGH | §C.4, Priority #8 |
| VII-5 Vote as Route Handler | MEDIUM | Priority #13 |
| VII-6 Visibility missing revalidation | MEDIUM | §C.1 (revalidation matrix) |
| VII-7 Error propagation under-specified | HIGH | Priority #9 |
| VII-8 Auth PE broken | MEDIUM | P02 evaluation |
| VIII-1 document/artifact naming | HIGH | §E.1, Priority #11 |
| VIII-2 Credit/gateway persists | HIGH | §E.2, Priority #12 |
| VIII-3 Circular import risk | HIGH | §D.1 (handler registry + stream writer interface) |
| VIII-4 Module boundary violations | MEDIUM | §D.1-D.4 |
| VIII-5 Test coverage inadequate | HIGH | Priority #18 |
| VIII-6 withCache appropriate | LOW | No change needed |
| VIII-7 DataStreamHandler untestable | MEDIUM | §D.3, Priority #10 |
| VIII-8 Import enforcement insufficient | MEDIUM | Priority #17 |
| VIII-9 Legacy patterns preserved | LOW | P00/P07 evaluation |

---

> **Guiding principle**: Every recommendation above serves one purpose — to ship a system where Next.js 16's server-rendering, streaming, and caching capabilities are used rather than defeated. The current plan builds a React SPA using Next.js as a router. The redesign builds a Next.js application that happens to have rich client interactivity where needed.
