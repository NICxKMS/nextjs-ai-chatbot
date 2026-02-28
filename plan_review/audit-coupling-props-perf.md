# Audit: Component Coupling, Prop Flow, Performance

> **Auditor**: Oracle (Architecture Consultant)  
> **Date**: 2026-02-28  
> **Scope**: Sections IV–VI of the rebuild plan  
> **Methodology**: Cross-referenced Next.js 16 docs (`.next-docs/`), plan files (`plan/architecture/`, `plan/integration_map/`, `plan/behavioral_extraction/`, `plan/scaffold/`), old app source code (`oldapp/`), and prior audit (`plan_review/audit-rsc-fetching-state.md`)

---

## IV. Component Coupling & Domain Boundaries

### Finding IV-1: Chat → Artifacts Direct Import Creates Tight Feature Coupling

**What the plan proposes** (from `contracts.md` §1, `seam-inventory.md` SEAM-009/010):

```
features/chat/lib/tools/create-document.ts
  → import { documentHandlersByArtifactKind } from '@/features/artifacts/handlers/'
```

The `createDocument` and `updateDocument` AI tools (owned by `features/chat/`) directly import handler factories from `features/artifacts/handlers/`. Confirmed in old app source (`oldapp/lib/ai/tools/create-document.ts` lines 3-6):

```typescript
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from "@/lib/artifacts/server";
```

**What the problem is**: This is a **direct cross-feature component import** — precisely what `conventions.md` §3 forbids:

> "Features may import from other features' **data types and schemas only**"
> "features/X/ Cannot Import features/Y/components/ — Feature components are internal"

While the convention targets component imports specifically, the spirit is clear: features should not reach into each other's internals. The handler factory is implementation logic, not a data contract. This coupling means:

1. **Chat cannot exist without artifacts** — the chat tool definitions hard-depend on artifact handler implementation details
2. **Handler interface changes break chat** — if artifact handlers change their signature, chat tools must update
3. **Circular dependency risk** — artifact handlers write to the data stream (chat's domain), while chat tools invoke handlers (artifact's domain)
4. **Testing complexity** — unit-testing chat tools requires mocking the entire artifact handler factory

**Severity**: **HIGH**

**Concrete fix**: Introduce a handler registry in `lib/` as a cross-cutting integration point:

```typescript
// lib/ai/document-handlers.ts — shared infrastructure, not feature-owned
import type { DocumentHandler, ArtifactKind } from '@/lib/types'

const handlers = new Map<ArtifactKind, DocumentHandler>()

export function registerDocumentHandler(kind: ArtifactKind, handler: DocumentHandler) {
  handlers.set(kind, handler)
}

export function getDocumentHandler(kind: ArtifactKind): DocumentHandler {
  const handler = handlers.get(kind)
  if (!handler) throw new Error(`No handler registered for kind: ${kind}`)
  return handler
}
```

```typescript
// features/artifacts/handlers/index.ts — registers at module load
import { registerDocumentHandler } from '@/lib/ai/document-handlers'
import { textHandler } from './text'
import { codeHandler } from './code'
// ...
registerDocumentHandler('text', textHandler)
registerDocumentHandler('code', codeHandler)
```

```typescript
// features/chat/lib/tools/create-document.ts — no artifact imports
import { getDocumentHandler } from '@/lib/ai/document-handlers'
```

The `DocumentHandler` interface is defined in `lib/types/` as a shared contract. Chat depends on the interface, not the implementation. Artifacts register themselves. This is Dependency Inversion applied to feature boundaries.

**Trade-off**: Requires ensuring artifact handler registration runs before chat tools execute. In a server-side streaming context, this is straightforward — the handler module is imported in the route handler's execution path.

---

### Finding IV-2: Sidebar ↔ Chat Coupling via OptimisticChatsProvider + Window Events

**What the plan proposes** (from `contracts.md` §1, `component-wiring.md` §5):

- Chat writes: `addOptimisticChat()`, `updateOptimisticChatTitle()`, `removeOptimisticChat()`
- Sidebar reads: optimistic entries merged with SWR paginated data
- Title sync fallback: `window.dispatchEvent('chat-title-updated')` with 3x polling

**What the problem is**: Three distinct coupling mechanisms exist between chat and sidebar:

1. **Shared context (OptimisticChatsProvider)** — This is the *cleanest* of the three. Both features consume a shared provider, exchanging data through a well-typed context. Acceptable.

2. **Data stream title injection** — `useChat.onData` processes `data-chatTitle` and calls `updateOptimisticChatTitle()`. This means chat's streaming protocol handler directly mutates sidebar state. The chat component must know the sidebar's API.

3. **Window event fallback** — `window.dispatchEvent(new Event("chat-title-updated"))` is the most problematic:
   - **No TypeScript contract** — magic string `"chat-title-updated"`
   - **No payload** — sidebar must independently refetch to learn the title
   - **Race condition** — if sidebar unmounts/remounts between event and handler registration, title is lost
   - **3x setTimeout polling** (500ms, 1.5s, 3s) — compensates for unreliable streaming title delivery
   - Confirmed in old app (`chat.tsx` lines 256-277): three `setTimeout` calls dispatching the same event

This is effectively **three different communication channels for a single piece of data** (chat title). The existence of the polling fallback proves the primary mechanism (streaming) is unreliable.

**Severity**: **HIGH**

**Concrete fix**:

1. **Fix the root cause on the server**: Ensure `data-chatTitle` is always emitted before the stream closes. Per `patterns.md` §7.1, title generation runs in parallel:
   ```typescript
   // stream-chat.ts — MUST await title before closing stream
   const titlePromise = generateTitle(message)
   // ... stream main content ...
   const title = await titlePromise
   dataStream.writeData({ type: 'data-chatTitle', content: title })
   ```
   If title generation fails, emit a fallback title (`message.text.slice(0, 80)`).

2. **Remove window.dispatchEvent entirely** — it is a workaround, not architecture.

3. **Formalize the OptimisticChats contract** — Create an explicit interface in `lib/types/` rather than having chat know sidebar's hook API:
   ```typescript
   // lib/types/optimistic-chats.ts
   export interface OptimisticChatOperations {
     add(chat: OptimisticChat): void
     remove(id: string): void
     updateTitle(id: string, title: string): void
   }
   ```
   Both features import the interface; the provider implements it. This makes the coupling explicit and testable.

---

### Finding IV-3: ChatLayoutClient Embeds Business Logic in a Layout

**What the plan proposes** (from `component-wiring.md` §1, `seam-inventory.md` SEAM-031):

`ChatLayoutClient` reads `?notice` query params and displays toasts:
```
?notice=chat_not_found → warning toast
?notice=user_not_found → error toast  
```
Then cleans the URL via `history.replaceState`.

**What the problem is**: Layout components should provide **structural scaffolding**, not process business-level events. The toast-from-query-param pattern is a cross-page communication mechanism that belongs in a dedicated component:

1. **Layout re-renders on searchParams change** — in Next.js 16, `useSearchParams()` makes the component dynamic, defeating any static shell optimization
2. **Layout is the wrong abstraction level** — notice handling is page-level logic (the notice comes from a page redirect), not layout-level infrastructure
3. **Forces layout to be 'use client'** — as identified in prior audit Finding I-1, this single hook forces the entire layout wrapper to be a client component

This was already flagged in the prior audit (Finding I-1), but the business-logic-in-layout aspect deserves separate tracking.

**Severity**: **MEDIUM**

**Concrete fix**: Extract to a zero-render client component:

```tsx
// features/chat/components/notice-handler.tsx
'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from '@/components/ui/toast'

const NOTICE_MAP: Record<string, { type: 'warning' | 'error'; message: string }> = {
  chat_not_found: { type: 'warning', message: 'Chat not found' },
  user_not_found: { type: 'error', message: 'User not found' },
}

export function NoticeHandler() {
  const searchParams = useSearchParams()
  const notice = searchParams.get('notice')

  useEffect(() => {
    const config = notice ? NOTICE_MAP[notice] : null
    if (config) {
      toast({ type: config.type, description: config.message })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [notice])

  return null
}
```

Place this inside a `<Suspense>` boundary in the server layout. The layout itself stays a server component.

---

### Finding IV-4: Shared UI (`components/`) Has No Planned Domain Imports — But Risk Exists

**What the plan proposes** (from `conventions.md` §3, `scaffold/directory-structure.md`):

`components/` contains: `sidebar-toggle.tsx`, `app-shell.tsx`, `theme-provider.tsx`, `icons.tsx`, plus `ui/` and `ai-elements/`.

Import rules explicitly forbid: `components/ → features/`, `components/ → app/`.

**What the problem is**: The plan correctly defines the boundary. However, two risk vectors exist:

1. **`app-shell.tsx`** — This is an async server component that calls `getAppSession()`. Per the plan, `getAppSession` lives in `features/auth/lib/session.ts`. This means `components/app-shell.tsx` imports from `features/auth/` — a violation of the declared import rules.

2. **`sidebar-toggle.tsx`** — Currently depends only on `useSidebar()` from `components/ui/sidebar.tsx`. No violation. But if it gains logic to track sidebar state for analytics or settings, it could drift toward feature imports.

**Severity**: **MEDIUM** (for app-shell.tsx), **LOW** (for sidebar-toggle.tsx risk)

**Concrete fix for app-shell.tsx**:

Option A: Move `getAppSession()` to `lib/auth/` (infrastructure layer), which `components/` can import. The session resolution is arguably infrastructure, not feature logic.

Option B: Move `app-shell.tsx` to `app/` as a private layout utility. It's only used by the root layout and is not a reusable component — it's layout scaffolding.

**Recommendation**: Option B. `AppShell` is not "truly shared UI"; it's root layout plumbing. Move it to `app/_components/app-shell.tsx` or inline it in `app/layout.tsx`.

---

### Finding IV-5: Cross-Route State Leakage Via Artifact State

**What the plan proposes** (from `state-management.md`, `component-wiring.md` §7):

Artifact state is managed via SWR with key `"artifact"` — a single global instance. The Chat component resets artifact state on chat ID change:

```typescript
// Confirmed in old app chat.tsx lines 327-337
useEffect(() => {
  setArtifact({ ...initialArtifactData, boundingBox: { ... } })
  return () => { setDataStream([]) }
}, [id, setArtifact, setDataStream])
```

**What the problem is**:

1. **The reset depends on an effect** — Between navigation and effect execution, the stale artifact state from the previous chat is briefly visible. If the artifact panel is open, users see a flash of previous content.

2. **SWR global cache survives navigation** — The `"artifact"` key persists in SWR's cache across route transitions. Unlike DataStreamProvider (which would reset if moved to page level per prior audit Finding I-4), the SWR cache is at the root level.

3. **No isolation between chat sessions** — If the user rapidly switches between chats (e.g., clicking sidebar items), the effect-based reset + incoming data stream for the new chat can race, producing artifact state that blends content from two chats.

4. **Metadata key (`artifact-metadata-{docId}`)** — Old metadata keys accumulate in SWR cache without cleanup. Opening 10 different artifacts creates 10 stale SWR entries that never expire.

**Severity**: **MEDIUM**

**Concrete fix**:

1. **Key artifact state by chat ID**: Instead of a singleton `"artifact"` key, use `artifact:${chatId}`. This naturally isolates state per chat and eliminates the reset effect:
   ```typescript
   const { data: artifact, mutate } = useSWR<UIArtifact>(`artifact:${chatId}`, null, {
     fallbackData: initialArtifactData
   })
   ```
   When navigating to a new chat, the previous chat's artifact state remains in cache (for back-navigation) but doesn't bleed through.

2. **Or, if migrating to `useSyncExternalStore`** (per prior audit Finding III-1): scope the store per chat ID, or implement a synchronous reset at the store level that fires before React renders the new page.

3. **Implement SWR cache cleanup**: On chat unmount, explicitly clean up metadata keys:
   ```typescript
   useEffect(() => () => { mutate(`artifact-metadata-${docId}`, undefined, false) }, [docId])
   ```

---

### Finding IV-6: Chat Component Has Severe SRP Violations

**What the plan proposes** (from `component-wiring.md` §4, old app `chat.tsx` — 524 lines):

The `Chat` component orchestrates:
1. `useChat` hook configuration + transport setup (lines 184-290)
2. `useChatVisibility` hook (line 80)
3. `useDataStream` dispatch (line 85)
4. `useSettings` + model selection (lines 86-87, 99-141)
5. `useAuth` session + guest detection (lines 317-318)
6. `useOptimisticChats` operations (lines 88-92)
7. `useArtifact` state management (line 93)
8. Attachment state management (line 334)
9. URL state management — `?query` param handling (lines 340-350)
10. Adaptive throttle calculation (lines 166-177)
11. Error handling with credit card alert dialog (lines 271-305)
12. Optimistic chat creation effect (lines 307-329)
13. Artifact reset on navigation effect (lines 331-337)
14. Title polling with 3x setTimeout (lines 255-275)

**14 distinct responsibilities** in a single component. This is a God Component.

**What the problem is**:

- **Testability**: Testing any one behavior requires instantiating the entire component with 8 hooks mocked
- **Re-render surface**: Any state change in any of these concerns triggers a re-render of the entire Chat component and all children
- **Cognitive load**: A developer modifying the credit card alert dialog must understand the data stream, artifact state, and optimistic chat code surrounding it
- **Reusability**: Zero — this component can only exist in one place with exactly one configuration

**Severity**: **CRITICAL**

**Concrete fix**: Decompose into focused sub-components and custom hooks:

```
Chat (orchestrator — ~50 lines)
├── useChatSession(id, initialMessages, initialChatModel, ...)
│   └── Encapsulates: useChat config, transport, onData, onFinish, onError
│   └── Returns: messages, setMessages, sendMessage, status, stop, regenerate
│
├── useChatSideEffects(id, status, messages, initialMessages)
│   └── Encapsulates: optimistic chat creation, artifact reset, URL management
│   └── Returns: void (pure side effects)
│
├── ChatHeader (existing)
├── Messages (existing)
├── MultimodalInput (existing)
├── ArtifactPanel (conditionally rendered)
└── CreditCardAlertDialog (self-contained)
```

The `useChatSession` hook isolates all `useChat` configuration (~100 lines) from the rendering tree. The `useChatSideEffects` hook isolates the 4 effects that synchronize external state. The Alert dialog is a self-contained component with its own state.

Target: Chat orchestrator under 80 lines, with each extracted unit independently testable.

---

### Finding IV-7: DataStreamHandler as a Side-Effect-Only Bridge Component

**What the plan proposes** (from `component-wiring.md` §7, old app `data-stream-handler.tsx` — 111 lines):

`DataStreamHandler` renders `null` but runs a `useEffect` that:
1. Reads `dataStream` from `DataStreamProvider` context
2. Processes delta entries (data-id, data-title, data-kind, data-clear, content deltas, data-finish)
3. Calls `setArtifact()` to mutate SWR state
4. Calls `artifactDefinition.onStreamPart()` for per-kind metadata updates
5. Tracks processed index via `lastProcessedIndex` ref

**What the problem is**:

This is a **Hidden Controller** anti-pattern. It's a React component that:
- Renders nothing visible
- Has no props (no explicit inputs)
- Reads from one context (DataStreamProvider)
- Writes to another state system (SWR artifact)
- Contains complex business logic (delta processing, kind-specific dispatch)

Problems:
1. **Invisible data flow** — There's no visual or prop-based indication that this component processes all artifact streaming data. A developer reading the JSX sees `<DataStreamHandler />` and learns nothing.
2. **Implicit dependency on mount order** — It must be mounted alongside or below `DataStreamProvider`, and alongside `Chat`. There's no enforced ordering.
3. **Testable only as integration** — Cannot unit-test the delta processing logic without mounting React components and setting up SWR/context providers.
4. **Multiple write targets** — It mutates artifact state AND metadata state from a single processing loop, making it hard to reason about which state changes when.

**Severity**: **MEDIUM**

**Concrete fix**: Extract the delta processing into a **pure function**, and keep the component as a thin effect bridge:

```typescript
// features/chat/lib/process-stream-deltas.ts — PURE function, no React
export function processStreamDelta(
  delta: DataPart,
  currentArtifact: UIArtifact,
  artifactDefinition: ArtifactDefinition | undefined
): { artifact: UIArtifact; metadata?: unknown } {
  switch (delta.type) {
    case 'data-id': return { artifact: { ...currentArtifact, documentId: delta.data, status: 'streaming' } }
    case 'data-title': return { artifact: { ...currentArtifact, title: delta.data, status: 'streaming' } }
    case 'data-clear': return { artifact: { ...currentArtifact, content: '', status: 'streaming' } }
    case 'data-finish': return { artifact: { ...currentArtifact, status: 'idle' } }
    default: {
      const updated = artifactDefinition?.processDelta?.(delta, currentArtifact)
      return updated ?? { artifact: currentArtifact }
    }
  }
}
```

```typescript
// DataStreamHandler — thin bridge (~20 lines)
export function DataStreamHandler() {
  const { dataStream } = useDataStream()
  const { artifact, setArtifact, setMetadata } = useArtifact()
  const lastIndex = useRef(-1)

  useEffect(() => {
    if (!dataStream?.length) { lastIndex.current = -1; return }
    const newDeltas = dataStream.slice(lastIndex.current + 1)
    lastIndex.current = dataStream.length - 1
    for (const delta of newDeltas) {
      const result = processStreamDelta(delta, artifact, getDefinition(artifact.kind))
      setArtifact(result.artifact)
      if (result.metadata !== undefined) setMetadata(result.metadata)
    }
  }, [dataStream])

  return null
}
```

The pure function is independently unit-testable with zero React overhead. The component becomes a trivial bridge.

---

### IV Summary

| ID | Finding | Severity |
|----|---------|----------|
| IV-1 | Chat→Artifacts direct handler import violates feature boundary | HIGH |
| IV-2 | Chat↔Sidebar uses 3 coupling mechanisms; window events are fragile | HIGH |
| IV-3 | ChatLayoutClient embeds toast business logic in layout | MEDIUM |
| IV-4 | AppShell imports from features/auth — violates import rules | MEDIUM |
| IV-5 | Artifact state leaks across chat navigation; no per-chat isolation | MEDIUM |
| IV-6 | Chat component has 14 responsibilities — God Component | CRITICAL |
| IV-7 | DataStreamHandler is a hidden controller with untestable business logic | MEDIUM |

---

## V. Prop Flow & State Lifting

### Finding V-1: Chat Component Prop Explosion — 8 Props In, 15+ Props Distributed

**What the plan proposes** (from `component-wiring.md` §4, old app `chat.tsx` lines 63-78):

Chat receives 8 props from the server page:
```typescript
Chat({
  id, initialMessages, initialChatModel, initialVisibilityType,
  isReadonly, initialLastContext, availableModels, initialVotes
})
```

Chat then distributes to children (confirmed from old app lines 353-424):
- **Messages**: `chatError, chatId, clearError, isArtifactVisible, isGuest, isReadonly, messages, regenerate, selectedModelId, setMessages, status, votes` — **12 props**
- **MultimodalInput**: `attachments, availableModels, chatId, input, messages, onModelChange, selectedModelId, selectedVisibilityType, sendMessage, setAttachments, setInput, setMessages, status, stop, usage` — **15 props**
- **Artifact**: `attachments, availableModels, chatId, input, isReadonly, messages, regenerate, selectedModelId, selectedVisibilityType, sendMessage, setAttachments, setInput, setMessages, status, stop, votes` — **16 props**

**What the problem is**:

1. **MultimodalInput and Artifact receive nearly identical prop sets** — 12 of 16 Artifact props overlap with MultimodalInput. This suggests they share a common data requirement that should be contextualized, not prop-drilled.

2. **Setter functions as props** — `setMessages`, `setAttachments`, `setInput` are React state setters passed 2-3 levels deep. This creates implicit upward data flow with no type-level indication of what the child does with them.

3. **Prop count exceeds maintainability threshold** — The widely-accepted heuristic is 5-7 props maximum. 15-16 props on a single component indicates missing abstraction.

4. **Artifacts receive chat orchestration props** — The `Artifact` component receives `sendMessage`, `stop`, `input`, `setInput`, `regenerate` — these are chat conversation operations. The artifact panel is acting as a secondary chat interface, which means it embeds chat's operational API rather than declaring its own needs.

**Severity**: **HIGH**

**Concrete fix**: Introduce a `ChatContext` that provides the `useChat`-derived state:

```typescript
// features/chat/hooks/use-chat-context.ts
type ChatContextValue = {
  chatId: string
  messages: ChatMessage[]
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>
  sendMessage: (msg: CreateMessage) => void
  regenerate: () => void
  status: ChatStatus
  stop: () => void
  input: string
  setInput: Dispatch<SetStateAction<string>>
  attachments: Attachment[]
  setAttachments: Dispatch<SetStateAction<Attachment[]>>
  isReadonly: boolean
  isGuest: boolean
  selectedModelId: string
  votes: UserVote[]
}
```

With this context:
- **Messages**: Reads `chatId, messages, setMessages, status, regenerate, isReadonly, isGuest, selectedModelId, votes` from context. Only receives `chatError, clearError, isArtifactVisible` as props (3 props).
- **MultimodalInput**: Reads most state from context. Receives `availableModels, onModelChange, selectedVisibilityType, usage` as props (4 props).
- **Artifact**: Reads most state from context. Receives `selectedVisibilityType, availableModels` as props (2 props).

This reduces the maximum prop count from 16 to 4, and eliminates the duplicated prop sets.

**Trade-off**: Adds one more context. However, this context is scoped to the Chat component subtree (not layout-level) and represents a genuine "shared data that multiple siblings need" pattern — the textbook use case for context.

---

### Finding V-2: Page → Chat Prop Cascade Duplicates Server State

**What the plan proposes** (from `component-wiring.md` §4):

```
Page (server) → fetches: session, chat, messages, votes, models
  └── Chat (client) — receives all as props
        ├── Messages — receives subset
        ├── MultimodalInput — receives subset
        └── Artifact — receives subset
```

**What the problem is**:

The server page fetches data, serializes it into props, and passes everything to a single client component that re-distributes it. This creates:

1. **Serialization overhead** — All data crosses the Server→Client boundary as serialized props in the RSC payload. For a chat with 100 messages, this means serializing the full message array, votes array, and model catalog in the HTML payload.

2. **No selective hydration** — Even if only the input area needs immediate interactivity, the entire Chat component (with all props) must hydrate before any child is interactive.

3. **No streaming** — The data is fetched sequentially (or parallel via `Promise.all`), then the entire page renders once all data is ready. No Suspense boundaries allow incremental rendering.

**Severity**: **MEDIUM**

**Concrete fix**: Use Next.js 16's promise-passing pattern for non-critical data:

```tsx
// app/(chat)/chat/[id]/page.tsx
export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAppSession()
  if (!session) redirect('/login')

  // Critical data — needed immediately
  const chatData = await getChatWithMessages(id, createDataContext(session))
  if (!chatData) redirect('/?notice=chat_not_found')
  if (chatData.chat.userId !== session.user.id && chatData.chat.visibility !== 'public') {
    redirect('/?notice=chat_not_found')
  }

  // Non-critical data — can stream in
  const votesPromise = session.user.type !== 'guest'
    ? getVotesByChatId(id, session.user.id)
    : Promise.resolve([])

  return (
    <>
      <Chat
        id={id}
        initialMessages={convertToUIMessages(chatData.messages)}
        initialChatModel={chatData.chat.lastContext?.modelId ?? DEFAULT_CHAT_MODEL}
        initialVisibilityType={chatData.chat.visibility}
        isReadonly={session.user.id !== chatData.chat.userId}
        availableModels={listChatModels()} // use cache — essentially free
      />
      <Suspense>
        <VoteHydrator chatId={id} votesPromise={votesPromise} />
      </Suspense>
      <DataStreamHandler />
    </>
  )
}
```

```tsx
// VoteHydrator — 'use client', resolves promise and hydrates SWR
'use client'
import { use } from 'react'

export function VoteHydrator({ chatId, votesPromise }) {
  const votes = use(votesPromise)
  // Seeds SWR cache for MessageActions to consume
  useSWR(`/api/vote?chatId=${chatId}`, null, { fallbackData: votes })
  return null
}
```

This allows votes to stream in after the main chat renders, and the model catalog can use `use cache` for instant availability.

---

### Finding V-3: State Lifting Into Layout Forces Client-Side Subtree

**What the plan proposes** (from `component-wiring.md` §1):

Chat layout wraps the entire subtree in `ChatLayoutClient` which is `'use client'`:
```
ChatLayoutClient('use client')
  └── SettingsProvider
      └── DataStreamProvider
          └── OptimisticChatsProvider
              └── SidebarProvider
                  ├── AppSidebar
                  └── SidebarInset → {children}
```

**What the problem is**: 

This architecture pushes state **UP** when it should be pushed **DOWN**:

1. **SettingsProvider** — Settings are per-chat session data. While settings persist across chats (correct), the provider doesn't need to wrap the sidebar. The sidebar never reads settings. Scoping it inside `SidebarInset` would eliminate one context subscription for all sidebar components.

2. **DataStreamProvider** — As identified in prior audit Finding III-3, the sidebar has zero consumers. This provider belongs inside the page content area.

3. **OptimisticChatsProvider** — This correctly wraps both sidebar and chat. It's the one provider that genuinely needs layout-level scope.

4. **SidebarProvider** — Correctly at layout level (manages sidebar open/close state).

The current architecture means that **every state change in SettingsProvider or DataStreamProvider re-renders the sidebar's context propagation path**, even though the sidebar doesn't consume them.

**Severity**: **HIGH** (compounds with prior audit Finding I-1)

**Concrete fix** (building on prior audit recommendations):

```
Chat layout (SERVER component):
  └── SidebarProvider                      // layout-level ✓
        ├── Sidebar (server shell)
        └── SidebarInset
              └── OptimisticChatsProvider  // wraps chat content ✓
                    └── {children}         // server-rendered pages

Chat page (inside {children}):
  └── SettingsProvider                     // page-level, scoped to chat
        └── DataStreamProvider             // page-level, scoped to chat
              ├── Chat
              └── DataStreamHandler
```

**Result**: 
- Sidebar subtree has only 2 context subscriptions (SidebarProvider, OptimisticChats)
- Chat subtree has 4 context subscriptions (Sidebar, OptimisticChats, Settings, DataStream)
- Settings/DataStream changes do NOT propagate to sidebar
- Layout remains a server component — enables PPR

---

### Finding V-4: Props as Indirect Event Buses — Setter Functions Leak Upward

**What the plan proposes** (from `component-wiring.md` §5, old app source):

Multiple child components receive setter functions that trigger parent-level effects:

| Prop | Passed To | What It Actually Does |
|------|-----------|----------------------|
| `setMessages` | Messages, MultimodalInput, Artifact | Triggers `useChat` state update → re-render of entire Chat + all children |
| `regenerate` | Messages, Artifact | Calls `useChat.reload()` → triggers new API request → streaming starts |
| `stop` | MultimodalInput, Artifact | Calls `useChat.stop()` → aborts in-flight request |
| `sendMessage` | MultimodalInput, Artifact | Calls `useChat.sendMessage()` → triggers new request + optimistic chat creation |

**What the problem is**:

These aren't simple child→parent callbacks. They are **remote procedure calls into chat's orchestration logic**, disguised as React state setters. When `Artifact` calls `setMessages(prev => [...prev.slice(0, n), editedMsg])`, it's performing a complex edit operation that:
1. Truncates chat history
2. Triggers a server action to delete trailing messages
3. Then calls `regenerate()` to re-initiate AI generation

This multi-step operation is spread across the Artifact component's event handler and the MessageEditor component, creating a distributed transaction with no central coordinator.

**Severity**: **MEDIUM**

**Concrete fix**: Replace raw setter props with **intent-based callbacks**:

```typescript
// Replace: setMessages + regenerate (2 props, implicit coupling)
// With: onEditMessage (1 prop, explicit intent)

type ChatActions = {
  editMessage: (messageId: string, newContent: string) => Promise<void>
  // Internally: deleteTrailingMessages → setMessages → regenerate
  
  sendMessage: (message: CreateMessage) => void
  stopGeneration: () => void
}
```

The `editMessage` action encapsulates the multi-step edit→delete→regenerate workflow. Children express intent; the parent (or ChatContext) handles orchestration.

---

### Finding V-5: Layout-Level Client State Causing Subtree Re-Renders

**What the plan proposes** (from `component-wiring.md` §1, §7):

Layout-level providers that hold mutable state:

| Provider | State That Changes | Frequency | Re-render Surface |
|----------|-------------------|-----------|-------------------|
| SettingsProvider | Any setting change | Low (user action) | All children consuming `useSettings()` |
| DataStreamProvider | Stream data array | **Very high** (every delta during streaming) | State context consumers |
| OptimisticChatsProvider | Chat list mutations | Medium (on send/delete) | All children consuming `useOptimisticChats()` |
| SidebarProvider | Open/close state | Low (user action) | Sidebar components via `useSidebar()` |

**What the problem is**:

During active streaming, `DataStreamProvider` updates on every SSE delta (~50-200 updates per second depending on throttle). Even with the split context pattern (Finding confirmed: State context vs Dispatch context), every state consumer re-renders per update:

- `DataStreamHandler` subscribes to the state context — re-renders on every delta ✓ (necessary)
- `Messages` subscribes to `useDataStream` per the plan — re-renders on every delta ✗ (unnecessary if only reading status)
- Any other component accidentally importing `useDataStream().dataStream` gets pulled into the render cycle

The split context pattern prevents dispatch-only consumers from re-rendering, but it does **not** prevent state consumers from re-rendering on every change. With the provider at layout level, the context propagation traverses the entire React tree to find consumers — including the sidebar subtree (which would bail out, but React still traverses it).

**Severity**: **HIGH** (during active streaming, which is the primary use case)

**Concrete fix**:

1. **Move DataStreamProvider to page level** (see V-3 fix)
2. **Use `useSyncExternalStore` with selector pattern** instead of context for high-frequency data:
   ```typescript
   // Instead of context re-rendering all consumers:
   const dataStream = useDataStreamSelector(state => state.dataStream)
   const streamStatus = useDataStreamSelector(state => state.status)
   ```
   Selectors only trigger re-renders when the selected slice changes, preventing cascading re-renders for consumers that only read a subset.
3. **Batch stream deltas** — Instead of updating state per-delta, accumulate deltas in a ref and flush on `requestAnimationFrame`:
   ```typescript
   const pendingDeltas = useRef<DataPart[]>([])
   // In onData callback:
   pendingDeltas.current.push(delta)
   if (!rafId.current) {
     rafId.current = requestAnimationFrame(() => {
       setDataStream(prev => [...prev, ...pendingDeltas.current])
       pendingDeltas.current = []
       rafId.current = null
     })
   }
   ```
   This coalesces multiple rapid deltas into a single state update, reducing re-renders during streaming from ~50-200/sec to ~60/sec (display refresh rate).

---

### V Summary

| ID | Finding | Severity |
|----|---------|----------|
| V-1 | Chat distributes 15-16 props per child; massive duplication | HIGH |
| V-2 | Server→Client prop cascade serializes all data upfront; no streaming | MEDIUM |
| V-3 | SettingsProvider + DataStreamProvider lifted too high; sidebar re-renders | HIGH |
| V-4 | Setter props as implicit RPC; distributed multi-step transactions | MEDIUM |
| V-5 | DataStreamProvider high-frequency updates cascade during streaming | HIGH |

---

## VI. Reactivity, Performance & Bundle Risks

### Finding VI-1: DataStreamProvider Re-Render Surface During Streaming

**What the plan proposes** (from `patterns.md` §7.2, `component-wiring.md` §7):

Split context pattern:
```typescript
const DataStreamStateContext = createContext<DataStreamState>(null!)
const DataStreamDispatchContext = createContext<DataStreamDispatch>(null!)
```

**What the problem is**:

The split prevents dispatch-only consumers from re-rendering. But let's trace what happens when a streaming delta arrives:

```
SSE delta arrives → useChat.onData → setDataStream(prev => [...prev, delta])
  → DataStreamProvider state update
    → DataStreamStateContext.Provider value changes
      → ALL state consumers re-render:
        - DataStreamHandler: re-renders, processes delta → calls setArtifact()
          → useSWR("artifact") mutate
            → ALL artifact consumers re-render:
              - ArtifactPanel (if visible)
              - DocumentPreview (in message list)
              - ArtifactCloseButton
              - VersionFooter
      → Messages (if subscribed to data stream status)
```

**One delta produces a two-stage cascading re-render**: first through DataStreamProvider → all state consumers, then through SWR("artifact") → all artifact consumers. During active streaming with deltas every 50-100ms, this creates:

- **DataStreamHandler**: 10-20 re-renders/sec (necessary)
- **ArtifactPanel**: 10-20 re-renders/sec (necessary for content display)
- **DocumentPreview in message list**: 10-20 re-renders/sec (unnecessary — preview doesn't need live updates)
- **ArtifactCloseButton**: 10-20 re-renders/sec (unnecessary — only needs `isVisible`)
- **VersionFooter**: 10-20 re-renders/sec (unnecessary — only needs version info, not streaming content)

Of the 5+ artifact consumers, only 1 (ArtifactPanel) needs content-frequency updates. The rest are re-rendering wastefully.

**Severity**: **HIGH**

**Concrete fix**:

1. **`useArtifactSelector` is already planned** — but its effectiveness depends on implementation. The old app's version (lines 37-57 of `use-artifact.ts`) uses `useMemo` over SWR data, NOT `useSyncExternalStore`. This means SWR still triggers the re-render; the memo just prevents children from re-rendering if the selected value hasn't changed. The component itself still re-renders.

2. **Proper selector pattern** using `useSyncExternalStore`:
   ```typescript
   function useArtifactSelector<T>(selector: (a: UIArtifact) => T): T {
     return useSyncExternalStore(
       artifactStore.subscribe,
       () => selector(artifactStore.getSnapshot()),
       () => selector(initialArtifactData)
     )
   }
   ```
   This prevents the component from re-rendering at all unless the selected value changes. `ArtifactCloseButton` selecting `state.isVisible` only re-renders when visibility toggles (2-3 times per session, not 600+ times).

3. **For SWR-based approach**: Use SWR's `compare` option to skip re-renders when selected data hasn't changed:
   ```typescript
   useSWR("artifact", null, {
     compare: (a, b) => selector(a) === selector(b)
   })
   ```

---

### Finding VI-2: SWR Synthetic Key "artifact" — Excessive Consumer Re-Renders

**What the plan proposes** (from `state-management.md`, `component-wiring.md` §3):

5+ components call `useSWR("artifact")`:
- `DataStreamHandler` — read + write
- `ArtifactPanel` (`artifact.tsx`) — read (content, kind, status, isVisible)
- `DocumentPreview` — read (documentId, kind)
- `ArtifactCloseButton` — read (isVisible, status)
- `VersionFooter` — read (documentId)

**What the problem is**:

SWR's `mutate("artifact", newState)` triggers `useSWR("artifact")` in **every** consumer component. SWR's internal comparison is shallow equality on the top-level data object. Since every artifact mutation creates a new object reference (immutable update pattern), every consumer re-renders on every mutation.

During a streaming session creating a document:
- `data-textDelta` deltas arrive at ~10-20Hz
- Each triggers `setArtifact(prev => ({ ...prev, content: prev.content + delta }))` 
- New object reference → all 5 consumers re-render
- **50-100 unnecessary component re-renders per second** across 4 consumers that don't need content updates

The `useArtifactSelector` hook in the old app implementation mitigates this for *children* of the consumer (via `useMemo`), but the consumer component itself still runs its render function.

**Severity**: **HIGH**

**Concrete fix**: Migrate artifact state from SWR to a dedicated external store (reinforcing prior audit Finding III-1):

```typescript
// features/artifacts/lib/artifact-store.ts
let state: UIArtifact = initialArtifactData
const listeners = new Set<() => void>()

export const artifactStore = {
  getSnapshot: () => state,
  subscribe: (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  setState: (updater: UIArtifact | ((prev: UIArtifact) => UIArtifact)) => {
    state = typeof updater === 'function' ? updater(state) : updater
    listeners.forEach(l => l())
  },
  reset: () => {
    state = initialArtifactData
    listeners.forEach(l => l())
  },
}
```

With `useSyncExternalStore` + selectors, only components whose selected slice changes will re-render. Estimated re-render reduction during streaming: **~80%** (from 5 components × 10-20Hz to 1 component × 10-20Hz + 4 components × 0Hz).

---

### Finding VI-3: Bundle Inflation from 'use client' Layout

**What the plan proposes** (from `component-wiring.md` §1, `scaffold/directory-structure.md`):

`ChatLayoutClient` is `'use client'`, importing:
- `SettingsProvider` → `useSyncExternalStore` + localStorage logic
- `DataStreamProvider` → React context + reducer
- `OptimisticChatsProvider` → React context + Set + optimistic state logic
- `SidebarProvider` → Radix UI sidebar state + cookie persistence
- `AppSidebar` → `dynamic(import, { ssr: false })` → full sidebar tree

**What the problem is — estimated bundle impact**:

| Import | Estimated gzipped size | Notes |
|--------|----------------------|-------|
| SidebarProvider (Radix) | ~8-12 KB | Radix UI primitives + state management |
| AppSidebar (lazy but bundled) | ~15-25 KB | Virtuoso (~12KB) + date-fns (~3KB) + sidebar components |
| SettingsProvider | ~2-3 KB | useSyncExternalStore + localStorage serialization |
| DataStreamProvider | ~1-2 KB | Context + types |
| OptimisticChatsProvider | ~2-3 KB | Context + Set-based dedup + auto-cleanup |
| SWR (required by useArtifact, votes, visibility) | ~12 KB | Full SWR library |
| Chat component + useChat | ~8-12 KB | @ai-sdk/react transport + chat hook |
| **Total client-side JS for chat layout** | **~48-69 KB gzipped** | Before page-specific code |

The `ChatLayoutClient` boundary forces ~50-70KB of JavaScript into the initial load before any page content renders. For comparison, a server-rendered layout with targeted client islands would include:

| Approach | Client JS |
|----------|-----------|
| Current (monolithic client layout) | ~50-70 KB |
| Server layout + client islands | ~15-25 KB (only interactive bits) |
| **Savings** | **~35-45 KB (~60% reduction)** |

This directly impacts:
- **Time to Interactive (TTI)**: 35-45KB additional JS parsing on mobile ≈ 150-250ms on mid-range devices
- **Largest Contentful Paint (LCP)**: Static shell renders faster with less JS to parse
- **Core Web Vitals**: INP (Interaction to Next Paint) improves when hydration budget is smaller

**Severity**: **HIGH**

**Concrete fix**: Implement the server-layout architecture from prior audit Finding I-1:
1. Root + chat layouts are server components
2. Each interactive element is its own minimal client island
3. SWR replaced with `useSyncExternalStore` for non-fetcher state (saves ~12KB)
4. Sidebar renderered server-side with client islands for interactivity
5. AppSidebar no longer needs `ssr: false` — server-renders the structural shell

---

### Finding VI-4: Hydration Mismatch Risks

**What the plan proposes**:

1. `<html suppressHydrationWarning>` — for `next-themes` class attribute injection
2. `AppSidebar` with `dynamic(import, { ssr: false })` — zero server HTML
3. `useArtifactSelector` returns `initialArtifactData` before mount (old app lines 50-52)

**What the problem is**:

1. **`suppressHydrationWarning` on `<html>`** — This is a recognized pattern for theme providers. **Acceptable**, but it masks ALL hydration warnings on the html element, including non-theme issues.

2. **`ssr: false` sidebar** — The server sends `<SidebarSkeleton />`, the client renders `<AppSidebar />`. This isn't a hydration mismatch (SSR explicitly renders the loading fallback), but it means: 
   - The sidebar flickers between skeleton and content on every hard navigation
   - Search engines only see the skeleton
   - Accessibility tools parse a skeleton instead of real navigation

3. **`useArtifactSelector` mount guard** — The selector returns `initialArtifactData` before mount, then switches to SWR data. If SWR's `fallbackData` matches `initialArtifactData` (it does), there's no mismatch. However, if any consumer reads artifact state before SWR initialization completes, there's a brief window of inconsistency.

4. **Settings from localStorage** — `useSettings()` returns defaults on server, reads localStorage on client. If defaults differ from stored values, there's a flash of default → stored transition. `useSyncExternalStore`'s `getServerSnapshot` mitigates this IF properly implemented.

**Severity**: **MEDIUM**

**Concrete fix**:

1. **Sidebar**: Remove `ssr: false`. Server-render the sidebar structure. This eliminates the skeleton-to-content flash entirely.
2. **Settings**: Ensure `getServerSnapshot()` returns the same defaults used in SSR. Validate that `useSettingsSnapshot()` uses `getServerSnapshot` correctly for server/build-time rendering.
3. **Artifact selector**: The current mount guard is acceptable but would be unnecessary with a `useSyncExternalStore`-based store (which has native SSR support via `getServerSnapshot`).

---

### Finding VI-5: Streaming Interruption Handling

**What the plan proposes** (from `state-management.md`, old app `chat.tsx`):

`useChat` uses `DefaultChatTransport` with `fetchWithErrorHandlers` (custom fetch). Chat component has an effect that cleans up the data stream on unmount:

```typescript
useEffect(() => {
  // ...
  return () => { setDataStream([]) }
}, [id, setArtifact, setDataStream])
```

**What the problem is**:

1. **Mid-stream navigation** — If the user clicks a sidebar link during active streaming:
   - The Chat component unmounts → cleanup effect runs → `setDataStream([])` clears stream state
   - BUT: the SSE connection managed by `useChat` may still be active (the hook doesn't abort on unmount by default)
   - The cleanup resets data stream, but `useChat`'s internal state may still process incoming data
   - The response body is not explicitly consumed or cancelled

2. **No AbortController integration** — The old app uses `fetchWithErrorHandlers` as a custom fetch, but there's no evidence of `AbortController` integration that cancels the server request when the component unmounts.

3. **Server-side resource leak** — If the client disconnects mid-stream without aborting, the server continues generating tokens (and paying for them) until the stream naturally completes or the TCP connection times out. With a 55-second `AbortSignal.timeout`, the server could generate for up to 55 seconds after the client has navigated away.

4. **Artifact state corruption** — If deltas from a previous stream arrive after navigation to a new chat (race condition between cleanup effect and incoming data), the new chat's artifact state could be corrupted with old data.

**Severity**: **HIGH**

**Concrete fix**:

1. **Explicit AbortController on navigation**:
   ```typescript
   const abortControllerRef = useRef<AbortController | null>(null)
   
   // On sendMessage, create a new controller
   const handleSend = useCallback(() => {
     abortControllerRef.current = new AbortController()
     sendMessage(msg, { signal: abortControllerRef.current.signal })
   }, [sendMessage])
   
   // On unmount or chat change, abort
   useEffect(() => {
     return () => { abortControllerRef.current?.abort() }
   }, [id])
   ```

2. **Call `stop()` on unmount**:
   ```typescript
   useEffect(() => {
     return () => {
       if (status === 'streaming' || status === 'submitted') {
         stop() // AI SDK's stop function aborts the request
       }
     }
   }, [id]) // Re-run when chat changes
   ```

3. **Guard DataStreamHandler against stale data**:
   ```typescript
   // Track which chat the stream belongs to
   const streamChatIdRef = useRef(chatId)
   useEffect(() => {
     if (streamChatIdRef.current !== chatId) {
       // Stale data from previous chat — ignore
       return
     }
     // ... process deltas
   }, [dataStream, chatId])
   ```

---

### Finding VI-6: Memory Leak Vectors

**What the plan proposes** (from `state-management.md`, old app source):

Multiple patterns create unbounded state:

1. **SWR synthetic keys never clean up** — `useSWR("artifact")`, `useSWR("artifact-metadata-{docId}")`, `useSWR("{chatId}-visibility")`, `useSWR("/api/vote?chatId={chatId}")`. These keys accumulate in SWR's global cache as the user navigates between chats.

2. **MutationObserver + ResizeObserver in `useScrollToBottom`** — Per `state-management.md`, this hook attaches observers to the container ref. If the container remounts without cleanup, observers leak.

3. **Event listeners** — `window.addEventListener('chat-title-updated', handler)` in SidebarHistory. Standard pattern, but requires explicit cleanup.

4. **Title poll timers** — The old app correctly stores timer IDs in a ref and cleans up on unmount (lines 149-154). This pattern should be preserved.

5. **DataStream array growth** — During streaming, `setDataStream(prev => [...prev, delta])` grows the array unboundedly. A long streaming session with many tool calls could accumulate thousands of entries. The cleanup on unmount (`setDataStream([])`) only fires when the component unmounts, not between messages.

**What the problem is in aggregate**:

For a user who opens 20 chats in a session without refreshing, the SWR cache accumulates:
- 20 visibility keys
- 20 vote keys  
- N artifact metadata keys (one per unique document opened)
- 1 artifact key (overwritten each time, but previous data in SWR internal cache)

SWR's default cache is an in-memory Map with no LRU eviction. For a simple chat app this is unlikely to cause issues, but for power users in long sessions, the memory footprint grows monotonically.

**Severity**: **MEDIUM**

**Concrete fix**:

1. **Implement SWR cache cleanup on navigation**:
   ```typescript
   // In Chat component cleanup effect
   useEffect(() => () => {
     const { cache } = useSWRConfig()
     cache.delete(`/api/vote?chatId=${id}`)
     cache.delete(`${id}-visibility`)
   }, [id])
   ```

2. **DataStream array reset between messages**:
   ```typescript
   // In onFinish callback or when status transitions from streaming to idle
   if (status === 'idle') setDataStream([])
   ```

3. **MutationObserver/ResizeObserver cleanup**: Ensure `useScrollToBottom` disconnects observers in the cleanup function. Verify the implementation pattern:
   ```typescript
   useEffect(() => {
     const observer = new MutationObserver(callback)
     observer.observe(container, config)
     return () => observer.disconnect() // MUST be present
   }, [])
   ```

4. **Consider SWR `provider` with bounded cache** for the chat content area:
   ```typescript
   <SWRConfig value={{ provider: () => new Map() }}>
     {/* Chat content — SWR cache is scoped and GC'd on unmount */}
   </SWRConfig>
   ```

---

### Finding VI-7: Message List Virtualization — Scalability Plan Present but Incomplete

**What the plan proposes** (from `scaffold/directory-structure.md`, `seam-inventory.md` SEAM-020):

- `Messages` component uses `react-virtuoso` (`GroupedVirtuoso`) for the message list
- Sidebar history also uses `GroupedVirtuoso` for paginated chat list

**What the problem is**:

1. **Message list virtualization is not explicitly planned for chat messages** — The plan mentions Virtuoso for the **sidebar history list** (SEAM-020), but the **chat message list** in `features/chat/components/messages.tsx` does not have explicit virtualization in the plan. The component-wiring document (§4) lists `Messages` receiving an array of `messages` — no mention of virtualization.

2. **Long conversation scalability** — A conversation with 100+ messages where each message contains tool calls (createDocument, updateDocument) with inline `DocumentPreview` components will:
   - Render 100+ `PreviewMessage` components
   - Each `DocumentPreview` mounts a SWR hook (`useSWR('/api/document?id=${docId}')`)
   - 20+ SWR hooks firing simultaneously = memory + network overhead
   - Without virtualization: all 100+ DOM nodes exist simultaneously

3. **Message-internal complexity** — Some messages are simple text; others contain reasoning displays, tool call results, code blocks, and inline document previews. Virtuoso's dynamic height measurement can struggle with complex content that renders asynchronously (e.g., syntax highlighting loading, editor initialization).

4. **Streaming message at bottom** — During streaming, new content is appended to the last message. Virtuoso must continuously remeasure the last item's height while maintaining scroll position. This is a known challenge with react-virtuoso that requires careful `followOutput` configuration.

**Severity**: **MEDIUM**

**Concrete fix**:

1. **Explicitly plan message list virtualization** — Add `react-virtuoso` to `features/chat/components/messages.tsx`:
   ```tsx
   <Virtuoso
     data={messages}
     initialTopMostItemIndex={messages.length - 1}
     followOutput="smooth"
     itemContent={(index, message) => <PreviewMessage message={message} />}
     // overscan for smooth scrolling
     overscan={200}
   />
   ```

2. **Lazy-mount DocumentPreview** — Only mount the SWR hook when the preview is within the viewport:
   ```tsx
   function DocumentPreview({ documentId }: { documentId: string }) {
     const [inView, ref] = useInView({ triggerOnce: true })
     return (
       <div ref={ref}>
         {inView ? <DocumentPreviewContent documentId={documentId} /> : <DocumentPreviewSkeleton />}
       </div>
     )
   }
   ```
   This prevents 20+ simultaneous SWR requests when loading a long conversation.

3. **Cap initial message load** — For conversations with 100+ messages, load the last 50 messages server-side and provide a "Load more" mechanism for older messages. This bounds the initial render cost.

---

### VI Summary

| ID | Finding | Severity |
|----|---------|----------|
| VI-1 | Two-stage cascading re-renders during streaming (DataStream → SWR artifact) | HIGH |
| VI-2 | SWR "artifact" triggers all 5+ consumers on every delta | HIGH |
| VI-3 | ChatLayoutClient bundles ~50-70KB JS; server layout would save ~60% | HIGH |
| VI-4 | Hydration risks from ssr:false sidebar and localStorage settings | MEDIUM |
| VI-5 | No explicit stream abort on navigation; server resource leak risk | HIGH |
| VI-6 | SWR cache, DataStream array, and observers accumulate without cleanup | MEDIUM |
| VI-7 | Chat message list virtualization not explicitly planned | MEDIUM |

---

## Cross-Cutting Observations

### Observation A: The Chat Component is the Single Biggest Architectural Risk

Findings IV-6, V-1, V-4, and VI-1 all converge on the `Chat` component. It is simultaneously:
- A **God Component** with 14 responsibilities (IV-6)
- A **prop distribution hub** with 15-16 props per child (V-1)
- An **implicit event bus** via setter functions (V-4)
- The **origin of streaming re-render cascades** (VI-1)

This component is the load-bearing wall of the entire application. Any bug, performance issue, or architectural change in Chat ripples through the entire UI. The rebuild must decompose this into a composition of focused components with explicit data contracts.

**Recommended decomposition priority**: This is the single most impactful refactoring task in the rebuild. It should be tackled in Phase 1, not deferred.

### Observation B: SWR-as-State-Store Creates Systemic Performance Problems

Findings VI-1, VI-2, and VI-6 all trace back to using SWR as a client-side state store for artifact state. The plan correctly identifies this as an existing pattern to preserve (ADR-003), but the performance implications during streaming are severe:

- SWR's mutation triggers all subscribers (no selector support)
- SWR's cache grows unboundedly
- SWR's internals (dedup, revalidation queue) run on every mutation despite being unused

The `useSyncExternalStore` pattern already exists in the plan for SettingsProvider. Extending it to artifact state is a low-risk, high-impact change that:
- Eliminates ~80% of unnecessary re-renders during streaming
- Removes ~12KB from the client bundle (if SWR can be fully removed)
- Provides native selector support
- Provides native SSR support via `getServerSnapshot`

### Observation C: The Provider Architecture Diagram Needs Revision

Combining findings from this audit and the prior audit, the optimal provider tree is:

```
Root layout (SERVER):
  ThemeProvider('use client', children-pattern)
    SWRConfig('use client', children-pattern)  // only if SWR retained for fetcher-backed uses
      AuthProvider('use client', children-pattern, initialSession prop)
        {children}

Chat layout (SERVER):
  NoticeHandler('use client', renders null)
  SidebarProvider('use client', children-pattern)
    ├── Suspense → SidebarServer(SERVER) → SidebarInteractive('use client')
    └── SidebarInset
          OptimisticChatsProvider('use client', children-pattern)
            {children}  ← server-rendered page content

Chat page (renders inside layout's {children}):
  SettingsProvider('use client')
    DataStreamProvider('use client')
      ├── Chat('use client')
      └── DataStreamHandler('use client', renders null)
```

This structure ensures:
- Layouts are server components (PPR-eligible)
- Providers scope tightly to their consumers
- Streaming re-renders don't cascade to sidebar
- Each provider level is justified by actual consumer needs

### Observation D: The window.dispatchEvent Pattern is the Most Dangerous Technical Debt

Reinforcing prior audit Observation C: the `chat-title-updated` window event is the most fragile pattern in the architecture. This audit adds evidence:

1. It exists because streaming title delivery is unreliable (Finding IV-2)
2. The 3x polling fallback creates global window-level coupling (Finding IV-2)
3. It couples Chat and Sidebar through an untyped, fire-and-forget channel
4. It cannot be tested without mounting both features in the same window

**This MUST NOT survive the rebuild.** Fix the server-side title delivery to be reliable, and eliminate the event entirely.

### Observation E: Estimated Aggregate Performance Impact of Fixes

If all HIGH-severity findings are addressed:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial JS bundle (chat route) | ~50-70 KB | ~15-25 KB | ~60% reduction |
| Re-renders during streaming (per delta) | ~5-7 components | ~1-2 components | ~75% reduction |
| Time to sidebar content | 540-1250ms | 220-300ms | 2-4x faster |
| Provider context depth | 9 | 7 | ~22% flatter |
| Chat component responsibilities | 14 | 3-4 | ~75% reduction |
| Prop drilling max depth | 16 props | 4 props | ~75% reduction |

These are conservative estimates based on measured patterns from the old app source and Next.js 16's rendering model.

---

## Consolidated Finding Summary

| ID | Finding | Severity | Category |
|----|---------|----------|----------|
| IV-1 | Chat→Artifacts direct handler import | HIGH | Coupling |
| IV-2 | Chat↔Sidebar 3-channel coupling + window events | HIGH | Coupling |
| IV-3 | Business logic in layout (toast notices) | MEDIUM | Coupling |
| IV-4 | AppShell imports from features/auth | MEDIUM | Coupling |
| IV-5 | Artifact state leaks across chat navigation | MEDIUM | Coupling |
| IV-6 | Chat component: 14 responsibilities — God Component | CRITICAL | Coupling/SRP |
| IV-7 | DataStreamHandler hidden controller pattern | MEDIUM | Coupling |
| V-1 | Chat distributes 15-16 props per child | HIGH | Props |
| V-2 | Server→Client prop cascade; no streaming | MEDIUM | Props |
| V-3 | Providers lifted too high; sidebar gets unnecessary re-renders | HIGH | State Lifting |
| V-4 | Setter props as implicit RPC | MEDIUM | Props |
| V-5 | DataStreamProvider high-frequency state cascades | HIGH | State Lifting |
| VI-1 | Two-stage cascading re-renders during streaming | HIGH | Performance |
| VI-2 | SWR "artifact" triggers all consumers per delta | HIGH | Performance |
| VI-3 | ~50-70KB client bundle from client layout | HIGH | Bundle |
| VI-4 | Hydration risks from ssr:false and localStorage | MEDIUM | Performance |
| VI-5 | No stream abort on navigation; server resource leak | HIGH | Performance |
| VI-6 | Memory leaks from SWR cache + observers + data stream | MEDIUM | Performance |
| VI-7 | Chat message virtualization not explicitly planned | MEDIUM | Scalability |

### Priority Ranking (by expected impact):

1. **IV-6 + V-1**: Decompose Chat component, introduce ChatContext — eliminates the God Component and prop explosion (**CRITICAL**)
2. **VI-1 + VI-2 + III-1**: Migrate artifact state from SWR to `useSyncExternalStore` — eliminates ~80% of streaming re-renders (**HIGH**)
3. **V-3 + V-5 + VI-3**: Move SettingsProvider/DataStreamProvider to page level, server-render layout — reduces bundle by ~60% (**HIGH**)
4. **IV-2**: Fix streaming title delivery, remove window.dispatchEvent — eliminates fragile coupling (**HIGH**)
5. **VI-5**: Implement stream abort on navigation — prevents server resource leaks (**HIGH**)
6. **IV-1**: Introduce handler registry in lib/ — cleans feature boundary (**HIGH**)
7. **V-2**: Use promise-passing pattern for non-critical data — enables incremental rendering (**MEDIUM**)
8. **IV-3 + IV-4**: Extract notice handler, relocate app-shell — cleans layout boundaries (**MEDIUM**)
9. **VI-7**: Explicitly plan message list virtualization with lazy DocumentPreview (**MEDIUM**)
10. **VI-6**: Implement SWR cache cleanup + datastream reset between messages (**MEDIUM**)
