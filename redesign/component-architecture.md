# Component Architecture — Component Tree & RSC Boundaries

> The ENTIRE component tree showing server/client boundaries, layout hierarchy,  
> decomposition patterns, and provider placement.  
> Addresses: CRITICAL-1, CRITICAL-2, I-1, I-2, I-4, IV-6, V-1, V-3, V-5, VI-3

---

## Component Rendering Decision Tree

```
Does this component need:
  ├── Browser APIs (window, localStorage, IntersectionObserver)?  → 'use client'
  ├── React state (useState, useReducer)?                         → 'use client'
  ├── Event handlers (onClick, onSubmit, onChange)?                → 'use client'
  ├── React effects (useEffect)?                                  → 'use client'
  ├── Context consumption (useContext)?                            → 'use client'
  ├── Custom hooks that use any of the above?                     → 'use client'
  └── None of the above?                                          → SERVER (default)
```

**Key insight**: The question is not "should this be a server component?" but "does this NEED to be a client component?" Server is the default; client is the exception.

---

## Complete Component Tree

```
app/layout.tsx                                                    SERVER
│ Reads: cookies (theme preference)
│ Renders: <html>, <body>, global styles
│ Provides: ThemeProvider, SessionProvider
│
├── ThemeProvider                                                  'use client'
│   │ Purpose: Dark/light mode via next-themes
│   │ Scope: ENTIRE app
│   │ Why client: Reads system preference, manages theme state
│   │
│   └── SessionProvider(session)                                     'use client'
│       │ Purpose: Auth session context
│       │ Scope: ENTIRE app (auth state needed everywhere)
│       │ Why client: Manages session state, guest bootstrap effect
│       │ Props: session (from server getAppSession())
│       │
│       └── {children}    ← Route group layouts
│
│
├── app/(auth)/layout.tsx                                          SERVER
│   │ Minimal layout for auth pages
│   │ Renders: Centered container
│   │
│   ├── app/(auth)/login/page.tsx                                  SERVER
│   │   └── AuthForm(mode="login")                                'use client'
│   │       Why client: Form state, submit handler, useActionState
│   │
│   └── app/(auth)/register/page.tsx                               SERVER
│       └── AuthForm(mode="register")                             'use client'
│
│
└── app/(chat)/layout.tsx                                          SERVER (async)
    │ Fetches: session, sidebar cookie preference
    │ Renders: Sidebar structure + SidebarInset + children
    │ Provides: SidebarProvider, PendingChatsProvider
    │
    │ CODE SKETCH:
    │ ```tsx
    │ export default async function ChatLayout({ children }) {
    │   const session = await getAppSession()
    │   const cookieStore = await cookies()
    │   const sidebarOpen = cookieStore.get('sidebar:state')?.value !== 'false'
    │
    │   return (
    │     <>
    │       <NoticeHandler />
    │       <Script src="/pyodide/pyodide.js" strategy="lazyOnload" />
    │       <SidebarProvider defaultOpen={sidebarOpen}>
    │         <Suspense fallback={<SidebarSkeleton />}>
    │           <SidebarShell session={session} />
    │         </Suspense>
    │         <SidebarInset>
    │           <PendingChatsProvider>
    │             {children}
    │           </PendingChatsProvider>
    │         </SidebarInset>
    │       </SidebarProvider>
    │     </>
    │   )
    │ }
    │ ```
    │
    ├── NoticeHandler                                              'use client'
    │   │ Purpose: Read ?notice=chat_not_found from URL → show toast
    │   │ Renders: null (side-effect only, ~15 lines)
    │   │ Why client: useSearchParams, useEffect, toast()
    │   │ Why extracted: Prevents layout from becoming 'use client' (CRITICAL-1)
    │   │ Fixes: I-1, IV-3
    │
    ├── Script (pyodide)                                           SERVER
    │   │ Next.js <Script> component — no 'use client' needed
    │   │ strategy="lazyOnload" — non-blocking
    │
    ├── SidebarProvider                                            'use client'
    │   │ Purpose: Sidebar open/close state + cookie persistence
    │   │ Scope: Chat layout (sidebar + main content)
    │   │ Why client: useState, keyboard shortcut listener
    │   │ Source: shadcn/ui sidebar primitive
    │   │
    │   ├── Suspense boundary
    │   │   │ Fallback: <SidebarSkeleton />
    │   │   │ Purpose: PPR — sidebar shell streams when ready
    │   │   │
    │   │   └── SidebarShell                                      SERVER (async)
    │   │       │ Purpose: Fetch initial sidebar data, render structure
    │   │       │ Fetches: Chat history (first 20), session
    │   │       │ Uses: 'use cache' + cacheTag('chats:{userId}')
    │   │       │ Renders: Brand header, new-chat button, history list, user nav
    │   │       │ Fixes: I-2, II-1 (server-fetched, no waterfall)
    │   │       │
    │   │       │ CODE SKETCH:
    │   │       │ ```tsx
    │   │       │ async function SidebarShell({ session }) {
    │   │       │   'use cache'
    │   │       │   cacheTag(`chats:${session.user.id}`)
    │   │       │   cacheLife('seconds')
    │   │       │   const chats = await getChatsByUserId(session.user.id, { limit: 21 })
    │   │       │   const hasMore = chats.length > 20
    │   │       │   return (
    │   │       │     <Sidebar>
    │   │       │       <SidebarHeader>...</SidebarHeader>
    │   │       │       <SidebarContent>
    │   │       │         <SidebarHistoryClient
    │   │       │           initialChats={chats.slice(0, 20)}
    │   │       │           initialHasMore={hasMore}
    │   │       │         />
    │   │       │       </SidebarContent>
    │   │       │       <SidebarFooter>
    │   │       │         <SidebarUserNav session={session} />
    │   │       │       </SidebarFooter>
    │   │       │     </Sidebar>
    │   │       │   )
    │   │       │ }
    │   │       │ ```
    │   │       │
    │   │       ├── SidebarHistoryClient                          'use client'
    │   │       │   │ Purpose: Render chat list, handle pagination
    │   │       │   │ Props: initialChats, initialHasMore
    │   │       │   │ Why client: useSWRInfinite (pagination), click handlers
    │   │       │   │ Pattern: Initial data from server, SWR for subsequent pages
    │   │       │   │ Reads: PendingChatsProvider (merges optimistic entries)
    │   │       │   │
    │   │       │   └── SidebarHistoryItem (× N)                  'use client'
    │   │       │       Purpose: Single chat item with rename, delete actions
    │   │       │       Why client: onClick, dropdown menu state
    │   │       │
    │   │       └── SidebarUserNav                                'use client'
    │   │           Purpose: User avatar, theme toggle, logout
    │   │           Why client: onClick, theme toggle, dropdown state
    │   │
    │   └── SidebarInset                                          SERVER (passthrough)
    │       │ Pure layout wrapper from shadcn/ui sidebar
    │       │
    │       └── PendingChatsProvider                           'use client'
    │           │ Purpose: Optimistic UI for chat CRUD
    │           │ Scope: All chat pages within SidebarInset
    │           │ Why here: Sidebar reads it, chat pages write to it
    │           │ Survives: Chat-to-chat navigation (layout-level)
    │           │ API: add(chat), remove(id), updateTitle(id, title)
    │           │ Fixes: IV-2 (single communication channel)
    │           │
    │           └── {children}    ← Chat pages


    ┌─────────────────────────────────────────────────────────────
    │ app/(chat)/page.tsx                                          SERVER
    │   New chat page — generates UUID, renders empty ChatShell
    │   ```tsx
    │   export default async function NewChatPage() {
    │     const id = generateUUID()
    │     const session = await getAppSession()
    │     const models = await getAvailableModels()
    │     return (
    │       <SettingsProvider>
    │         <ChatStreamProvider>
    │           <ChatShell
    │             id={id}
    │             initialMessages={[]}
    │             initialChatModel={getDefaultModel(session)}
    │             isReadonly={false}
    │             availableModels={models}
    │           />
    │           <StreamBridge id={id} />
    │         </ChatStreamProvider>
    │       </SettingsProvider>
    │     )
    │   }
    │   ```
    └─────────────────────────────────────────────────────────────


    ┌─────────────────────────────────────────────────────────────
    │ app/(chat)/chat/[id]/page.tsx                                SERVER (async)
    │   Existing chat page — fetches data, renders ChatShell
    │
    │   DATA FETCHING:
    │   ```tsx
    │   const session = await getAppSession()
    │   const [chat, votesPromise] = await Promise.all([
    │     getCachedChat(params.id),
    │     getVotes(params.id),        // Returns Promise (not awaited)
    │   ])
    │   // Access control
    │   if (!chat) notFound()
    │   if (chat.userId !== session.user.id && chat.visibility !== 'public')
    │     notFound()
    │   const isReadonly = chat.userId !== session.user.id
    │   ```
    │
    │   RENDERING:
    │   ```tsx
    │   <SettingsProvider>
    │     <ChatStreamProvider>
    │       <ChatShell
    │         id={params.id}
    │         initialMessages={chat.messages}
    │         initialChatModel={chat.model}
    │         isReadonly={isReadonly}
    │         availableModels={models}
    │       />
    │       <StreamBridge id={params.id} />
    │       <Suspense>
    │         <VoteResolver chatId={params.id} votesPromise={votesPromise} />
    │       </Suspense>
    │     </ChatStreamProvider>
    │   </SettingsProvider>
    │   ```
    │
    │   Fixes: II-2 (parallel fetches), V-2 (promise-passing for votes)
    └─────────────────────────────────────────────────────────────
```

---

## Detailed Component Decomposition

### ChatShell — The Thin Orchestrator

**Replaces:** The 524-line `Chat` God Component (CRITICAL-2, IV-6)

**What it does:** Creates `ChatSessionContext`, renders child components. That's it.

**What it does NOT do:**
- Business logic (moved to `useChatSession`)
- Side effects (moved to `useChatSideEffects`)
- Callback definitions (moved to `chat-callbacks.ts`)
- Prop drilling (children read from `ChatSessionContext`)

```
ChatShell ('use client', ~60 lines)                               
│   Props: id, initialMessages, initialChatModel, isReadonly, availableModels
│   Creates: ChatSessionContext via useChatSession()
│   Calls: useChatSideEffects()
│
│   INTERNAL CODE SKETCH:
│   ```tsx
│   'use client'
│   export function ChatShell({ id, initialMessages, initialChatModel, isReadonly, availableModels }) {
│     const chatSession = useChatSession({
│       id, initialMessages, initialChatModel, isReadonly
│     })
│     useChatSideEffects({ id, status: chatSession.status, messages: chatSession.messages })
│
│     return (
│       <ChatSessionContext.Provider value={chatSession}>
│         <div className="flex flex-col min-w-0 h-dvh bg-background">
│           <ChatHeader />
│           <Messages />
│           <MultimodalInput availableModels={availableModels} />
│         </div>
│         {chatSession.artifact.isVisible && (
│           <ArtifactPanel availableModels={availableModels} />
│         )}
│       </ChatSessionContext.Provider>
│     )
│   }
│   ```
│
├── ChatHeader                                                    'use client'
│   │ Reads: ChatSessionContext (chatModel, status), useSidebar (toggle)
│   │ Props: NONE (reads from context)
│   │ Purpose: Model selector, sidebar toggle, new chat button
│   │ Renders: ModelSelector, SidebarToggle, share button
│   │ ~40 lines
│
├── Messages                                                      'use client'
│   │ Reads: ChatSessionContext (messages, status, sendMessage)
│   │ Own Props: none or chatError, clearError (if error display is here)
│   │ Purpose: Virtualized message list
│   │ Pattern: react-virtuoso with followOutput for streaming
│   │ Renders: Message × N, Greeting (when empty), SuggestedActions
│   │ Fixes: VI-7 (virtualization)
│   │
│   ├── Message × N                                               'use client'
│   │   │ Props: message, isLoading
│   │   │ Purpose: Single message (user or assistant)
│   │   │
│   │   ├── MessageReasoning                                      'use client'
│   │   │   Purpose: Collapsible reasoning display
│   │   │
│   │   ├── MessageActions                                        'use client'
│   │   │   Purpose: Copy, edit, delete actions
│   │   │
│   │   ├── MessageEditor                                         'use client'
│   │   │   Purpose: Inline message editing (when edit mode active)
│   │   │
│   │   ├── VoteButtons                                           'use client'
│   │   │   Props: chatId, messageId
│   │   │   Purpose: Upvote/downvote with useOptimistic
│   │   │   Reads: Votes from useVotes hook (SWR or server-seeded)
│   │   │
│   │   ├── ArtifactPreview                                       'use client'
│   │   │   Purpose: Inline artifact thumbnail in message
│   │   │   Reads: artifactStore via useArtifactSelector (isVisible only)
│   │   │   Pattern: Lazy-mounted via IntersectionObserver
│   │   │
│   │   └── Weather                                               'use client'
│   │       Purpose: Weather tool result display
│   │
│   ├── Greeting                                                  SERVER or 'use client'
│   │   Purpose: Empty state with welcome message
│   │
│   └── SuggestedActions                                          'use client'
│       Purpose: Clickable action suggestions
│       Reads: ChatSessionContext (sendMessage)
│
├── MultimodalInput                                               'use client'
│   │ Reads: ChatSessionContext (input, setInput, sendMessage, stop, status, attachments)
│   │ Own Props: availableModels (for model switching)
│   │ Purpose: Text input + file upload + send/stop buttons
│   │ Contains: Auto-resize textarea, attachment handling
│   │ ~80 lines (main component, extracted helpers)
│   │
│   ├── SubmitButton                                              'use client'
│   │   Purpose: Send or stop button, loading state
│   │
│   └── PreviewAttachment × N                                    'use client'
│       Purpose: Thumbnail preview of attached files
│
└── ArtifactPanel                                                 'use client'
    │ Reads: ChatSessionContext (messages, for suggestion context)
    │ Reads: artifactStore via useArtifact()
    │ Own Props: availableModels
    │ Purpose: Side panel for artifact display + editing
    │ Conditionally rendered: only when artifact.isVisible
    │ Wrapped in: ArtifactErrorBoundary (component-level)
    │
    ├── ArtifactErrorBoundary                                     'use client'
    │   Purpose: Catches editor crashes, shows fallback
    │
    ├── ArtifactActions                                           'use client'
    │   Purpose: Toolbar (undo, redo, copy, version switch)
    │   Reads: artifactStore via useArtifactSelector
    │
    ├── ArtifactCloseButton                                       'use client'
    │   Purpose: Close the artifact panel
    │   Reads: useArtifactSelector(s => s.isVisible) — minimal re-renders
    │   Fixes: VI-2 (selector prevents re-render on content change)
    │
    ├── Kind-Specific Editor (one of:)                            'use client'
    │   ├── TextEditor (Tiptap)
    │   ├── CodeEditor (CodeMirror)
    │   ├── SheetEditor (table)
    │   └── ImageEditor (canvas)
    │   Each: Reads artifact.content from artifactStore
    │   Pattern: Editor receives content changes via store subscription
    │
    ├── VersionFooter                                             'use client'
    │   Purpose: Version navigation (prev/next)
    │   Reads: useArtifactSelector(s => s.artifactId) — minimal re-renders
    │   Uses: useSWR for on-demand version fetching
    │
    └── VisibilitySelector                                        'use client'
        Purpose: Public/private toggle for shared artifacts
        Action: updateVisibility server action + useOptimistic
```

---

## 'use client' Boundary Map

Every `'use client'` boundary and why it exists:

| Component | Why 'use client' | Can it be avoided? |
|-----------|-------------------|-------------------|
| **ThemeProvider** | next-themes requires client state | No — theme needs client detection |
| **SessionProvider** | Session state, guest bootstrap effect | No — client needs auth context |
| **SidebarProvider** | Open/close state, keyboard shortcuts | No — interactive toggle |
| **PendingChatsProvider** | Optimistic state management | No — React state management |
| **SettingsProvider** | localStorage reads, state | No — browser API |
| **ChatStreamProvider** | SSE subscription, state | No — streaming requires client |
| **NoticeHandler** | useSearchParams, useEffect | No — but extracted to prevent contamination |
| **SidebarHistoryClient** | SWR pagination, click handlers | No — interactive list |
| **SidebarHistoryItem** | Click handlers, dropdown state | No — interactive item |
| **SidebarUserNav** | Theme toggle, logout, dropdown | No — interactive menu |
| **ChatShell** | ChatSessionContext provider, hooks | No — chat orchestration |
| **ChatHeader** | Click handlers, context read | No — interactive header |
| **Messages** | Virtualization, scroll handling | No — dynamic list |
| **Message** | Message actions, tool results | No — interactive message |
| **MultimodalInput** | Form state, textarea, attachments | No — interactive input |
| **ArtifactPanel** | Editor state, store subscription | No — interactive editor |
| **AuthForm** | Form state, form handlers | No — interactive form |
| **VoteButtons** | useOptimistic, click handler | No — optimistic UI |
| **StreamBridge** | useEffect, context reads | No — stream bridge |
| **VoteResolver** | use() to resolve promise | No — async data hydration |

### What IS a Server Component

| Component | Why Server | Benefit |
|-----------|-----------|---------|
| **Root layout** | Just HTML shell + provider wrappers | 0 bytes client JS from layout |
| **Chat layout** | Fetches session, reads cookies, renders structure | Server-fetched sidebar data |
| **Chat page** | Fetches chat data, renders provider tree | Parallel server fetches, 0 waterfall |
| **SidebarShell** | Async fetch of chat history | ~35KB saved vs client-side fetch |
| **SidebarSkeleton** | Pure HTML, no interactivity | Instant PPR fallback |
| **Auth pages** | Route shell, renders AuthForm | Minimal client JS on auth |

---

## Layout Hierarchy

```
Root Layout (SERVER)                          app/layout.tsx
│ - <html lang="en">
│ - <body>
│ - ThemeProvider
│ - SessionProvider(session)
│
├── Auth Layout (SERVER)                      app/(auth)/layout.tsx
│   - Centered white card container
│   - No sidebar, no navigation
│   - Error boundary: app/(auth)/error.tsx
│
└── Chat Layout (SERVER, async)               app/(chat)/layout.tsx
    - NoticeHandler (client island)
    - Script (pyodide, lazy)
    - SidebarProvider(defaultOpen)
    - Suspense → SidebarShell (server, async)
    - SidebarInset → PendingChatsProvider → {children}
    - Error boundary: app/(chat)/error.tsx

    ├── New Chat Page (SERVER)                app/(chat)/page.tsx
    │   - SettingsProvider → ChatStreamProvider
    │   - ChatShell (empty state)
    │   - StreamBridge
    │
    └── Existing Chat Page (SERVER)           app/(chat)/chat/[id]/page.tsx
        - SettingsProvider → ChatStreamProvider
        - ChatShell (with initialMessages)
        - StreamBridge
        - Suspense → VoteResolver (deferred)
```

---

## Provider Placement — Siblings, Not Nested

### Root Layout — Global Concerns Only

```tsx
// app/layout.tsx (SERVER)
export default async function RootLayout({ children }) {
  const session = await getAppSession()
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SessionProvider session={session}>
            {children}
          </SessionProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  )
}
```

**What's NOT here:**
- ~~SWRConfig~~ — SWR only used in specific features, configure at point of use
- ~~TooltipProvider~~ — moved to point of consumption (sidebar, chat header)
- ~~SettingsProvider~~ — page-scoped, not app-wide
- ~~ChatStreamProvider~~ — page-scoped, not app-wide

**Fixes:** I-5 (TooltipProvider at root), V-3 (providers too high)

### Chat Layout — Layout-Scoped Concerns

```tsx
// app/(chat)/layout.tsx (SERVER)
export default async function ChatLayout({ children }) {
  const session = await getAppSession()
  const cookieStore = await cookies()
  const sidebarOpen = cookieStore.get('sidebar:state')?.value !== 'false'

  return (
    <>
      <NoticeHandler />
      <Script src="/pyodide/pyodide.js" strategy="lazyOnload" />
      <SidebarProvider defaultOpen={sidebarOpen}>
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarShell session={session} />
        </Suspense>
        <SidebarInset>
          <PendingChatsProvider>
            {children}
          </PendingChatsProvider>
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}
```

**Why PendingChatsProvider is here (layout-level):**
- Both sidebar (reads) and chat pages (writes) need access
- Must survive chat-to-chat navigation (layout persists across pages)
- Scoped to chat route group only — auth pages don't see it

**Why SidebarProvider is here:**
- Sidebar state (open/close) must persist across page navigations
- Keyboard shortcut (Cmd+B) needs to work anywhere in chat

### Chat Page — Page-Scoped Concerns

```tsx
// app/(chat)/chat/[id]/page.tsx (SERVER)
export default async function ChatPage({ params }) {
  // ... data fetching ...
  return (
    <SettingsProvider>
      <ChatStreamProvider>
        <ChatShell id={id} initialMessages={messages} ... />
        <StreamBridge id={id} />
        <Suspense>
          <VoteResolver chatId={id} votesPromise={votesPromise} />
        </Suspense>
      </ChatStreamProvider>
    </SettingsProvider>
  )
}
```

**Why SettingsProvider is here (page-level):**
- Only chat pages need settings context
- Settings don't need to survive navigation (localStorage persists independently)
- Keeps sidebar free from settings re-renders

**Why ChatStreamProvider is here (page-level):**
- Highest-frequency updates in the app (~10-20 deltas/sec during streaming)
- MUST NOT cascade to sidebar (layout-level would cause this)
- Resets naturally on page navigation (new page = new provider instance)
- **Fixes:** V-5 (high-frequency cascades), III-3 (scope too wide)

---

## ChatSessionContext Design

The single most important state container in the app. Replaces 15-16 props per child.

### What ChatSessionContext Holds

```typescript
// features/chat/types/chat.types.ts
export interface ChatSessionValue {
  // From useChat
  messages: Message[]
  status: 'idle' | 'submitted' | 'streaming' | 'error' | 'ready'
  input: string
  setInput: (input: string) => void
  attachments: Attachment[]
  setAttachments: Dispatch<SetStateAction<Attachment[]>>

  // Intent-based callbacks (NOT raw setter functions)
  sendMessage: (event?: { preventDefault?: () => void }) => void
  stop: () => void
  appendMessage: (message: Message) => void

  // Chat metadata
  chatId: string
  chatModel: string
  isReadonly: boolean

  // Error state
  error: Error | null
  clearError: () => void
}
```

### What ChatSessionContext Does NOT Hold

- **Artifact state** — lives in `artifactStore` (useSyncExternalStore, separate)
- **Settings** — lives in `SettingsProvider` (separate context)  
- **ChatStream raw data** — lives in `ChatStreamProvider` (separate context)
- **Sidebar state** — lives in `SidebarProvider` (layout-level)
- **Votes** — lives in `useVotes` hook (per-message, local)
- **Visibility** — lives in server-fetched data + `useOptimistic`

### Why Intent-Based Callbacks

**Before (setter props as implicit RPC):**
```tsx
// Child component — unclear what the contract is
<MultimodalInput
  setMessages={setMessages}
  setInput={setInput}
  handleSubmit={handleSubmit}
  stop={stop}
  setAttachments={setAttachments}
  append={append}
  // ... 10 more props
/>
```

**After (intent-based callbacks):**
```tsx
// Child reads from context — clear API
const { sendMessage, stop, input, setInput } = useChatSessionContext()
// sendMessage encapsulates: validation, attachment processing, handleSubmit
// stop encapsulates: abort controller, cleanup
```

**Fixes:** V-4 (setter props as implicit RPC), V-1 (15-16 props)

---

## StreamBridge Pattern

### Current Problem (IV-7)

`StreamBridge` is a null-rendering component with complex logic — a "hidden controller." It cross-feature imports `useArtifact` from `features/artifacts/`.

### Redesigned Pattern

```
StreamBridge ('use client', ~20 lines)                       BRIDGE
│ Purpose: Connect ChatStreamProvider to artifact store
│ Renders: null
│ Logic: ~3 lines — delegates to pure function
│
│ CODE SKETCH:
│ ```tsx
│ 'use client'
│ import { useChatStream } from '@/features/chat/hooks/use-data-stream'
│ import { processStreamDelta } from '@/features/chat/lib/process-stream-deltas'
│ import { artifactStore } from '@/features/artifacts/lib/artifact-store'
│
│ export function StreamBridge({ id }: { id: string }) {
│   const { ChatStream } = useChatStream()
│
│   useEffect(() => {
│     if (!ChatStream.length) return
│     const latest = ChatStream[ChatStream.length - 1]
│     const current = artifactStore.getSnapshot()
│     const { artifact } = processStreamDelta(latest, current)
│     artifactStore.setState(artifact)
│   }, [ChatStream])
│
│   return null
│ }
│ ```
│
│ processStreamDelta (PURE FUNCTION, testable):
│ ```typescript
│ export function processStreamDelta(
│   delta: DataPart,
│   current: UIArtifact
│ ): { artifact: UIArtifact } {
│   switch (delta.type) {
│     case 'data-id':
│       return { artifact: { ...current, artifactId: delta.content, status: 'streaming' } }
│     case 'data-title':
│       return { artifact: { ...current, title: delta.content } }
│     case 'data-kind':
│       return { artifact: { ...current, kind: delta.content as ArtifactKind } }
│     case 'data-clear':
│       return { artifact: { ...current, content: '', status: 'streaming' } }
│     case 'data-finish':
│       return { artifact: { ...current, status: 'idle' } }
│     default: {
│       // Content deltas (text-delta, code-delta, sheet-delta, image-delta)
│       if (delta.type.endsWith('-delta')) {
│         return { artifact: { ...current, content: current.content + delta.content } }
│       }
│       return { artifact: current }
│     }
│   }
│ }
│ ```
```

**Cross-feature import note:** `StreamBridge` (in `features/chat/`) imports `artifactStore` from `features/artifacts/lib/artifact-store.ts`. This is an intentional exception documented as the public API of the artifacts feature. Alternative: move `artifactStore` to `lib/stores/artifact-store.ts` to make it a shared infrastructure concern. Both are acceptable; the key improvement is that the logic is pure and testable.

**Fixes:** IV-7 (hidden controller), VIII-7 (untestable), D.3 (cross-feature boundary)

---

## VoteResolver Pattern — Deferred Non-Critical Data

```tsx
// Renders null, hydrates vote data without blocking initial render
'use client'

import { use } from 'react'

export function VoteResolver({
  chatId,
  votesPromise,
}: {
  chatId: string
  votesPromise: Promise<Vote[]>
}) {
  const votes = use(votesPromise)  // React 19 use() — suspends until resolved
  // Seed the vote store/SWR cache with server data
  useEffect(() => {
    seedVoteCache(chatId, votes)
  }, [chatId, votes])
  return null
}
```

**Wrapped in `<Suspense>`** in the page — the chat UI renders immediately while votes load. Votes are not critical for the initial chat experience.

**Fixes:** V-2 (server→client prop cascade — votes don't block render)

---

## Summary: Server vs Client Component Count

| Category | Server | Client | Total |
|----------|--------|--------|-------|
| Layouts | 3 | 0 | 3 |
| Pages | 4 | 0 | 4 |
| Structural (shells, skeletons) | 2 | 0 | 2 |
| Providers | 0 | 5 | 5 |
| Chat components | 0 | 10 | 10 |
| Artifact components | 0 | 8 | 8 |
| Sidebar components | 1 | 4 | 5 |
| Auth components | 0 | 2 | 2 |
| Bridges (render null) | 0 | 3 | 3 |
| **Total** | **10** | **32** | **42** |

**Previous plan:** ~2 server components, ~40 client components. Nearly everything was forced client by the `ChatLayoutClient` monolith.

**This redesign:** 10 server components handling data fetching and layout structure. 32 client components for interactivity. The client components are smaller and more focused (~60 lines average vs ~200+ lines average).

**Bundle impact estimate:** ~35-45KB reduction in client JavaScript for the chat route. The sidebar alone saves ~15KB by not shipping SWR + fetcher + loading logic to the client for initial data.
