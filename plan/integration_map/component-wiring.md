> **Updated per redesign audit (2026-03-01)**

# Component Wiring

> Provider tree hierarchy, context dependencies per component, data flow parent→child,
> event flow child→parent, and render trees for every screen.
> Updated to reflect: server layout + client islands, ChatShell + ChatSessionContext,
> useSyncExternalStore for artifacts/settings, PendingChatsProvider, StreamBridge thin bridge.

---

## 1. Provider Tree (Root → Leaf)

```
<html lang="en" className={fontVars} suppressHydrationWarning>
  <body className="antialiased">
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SessionProvider session={session}>         // server-fetched via getAppSession()
        <TooltipProvider delayDuration={0}>       // DEV-028: retained at root layout
          {children}                              // ← route group content
        </TooltipProvider>
      </SessionProvider>
    </ThemeProvider>
    <Toaster position="top-center" />             // sonner toast target
  </body>
</html>
```

> **What's NOT here (removed per redesign):**
> - ~~SWRConfig~~ — SWR only used in specific features, configure at point of use
> - ~~AppShell wrapper~~ — root layout is a SERVER component, not a Suspense wrapper
> - ~~SettingsProvider~~ — replaced by `useSyncExternalStore` module store (no provider needed)
<!-- audit: SOFT-003 — TooltipProvider moved from "NOT here" list to root tree per DEV-028 -->

### Server/Client Component Summary (Redesign Baseline)

| Type | Count |
|------|-------|
| Server Components | 10 |
| Client Components | 32 |
| **Total** | **42** |

### Chat Route Group (`(chat)/`)

```
app/(chat)/layout.tsx                              SERVER (async)
│ Fetches: session, sidebar cookie preference
│ Renders: sidebar structure + SidebarInset + children
│
├── NoticeHandler                                  'use client' (client island)
│     Purpose: Read ?notice=chat_not_found → show toast (renders null, ~15 lines)
│     Why extracted: Prevents layout from becoming 'use client'
│
├── Script src="pyodide.js" strategy="lazyOnload"  SERVER (Next.js <Script>)
│
└── PendingChatsProvider                           'use client'
      │ Purpose: Optimistic UI for chat CRUD
      │ Scope: Entire chat layout (sidebar + pages)
      │ Why here: Both sidebar (reads) and chat pages (writes) need access
      │ Survives: Chat-to-chat navigation (layout-level)
      │ API: add(chat), remove(id), updateTitle(id, title), markConfirmed(id)
      │
      └── SidebarProvider(defaultOpen)             'use client'
            │ Purpose: Sidebar open/close state + cookie persistence
            │ Source: shadcn/ui sidebar primitive
            │
            ├── Suspense fallback={<SidebarSkeleton />}
            │     └── SidebarShell()               SERVER (async)
            │           Uses: 'use cache' + cacheTag('chats:{userId}')
            │           Fetches: Chat history (first 20)
            │           ├── SidebarHistoryClient   'use client'
            │           │     Props: initialChats, initialHasMore
            │           │     Pattern: Server data + SWR for pagination
            │           │     Reads: PendingChatsProvider (merges optimistic entries)
            │           │     └── SidebarHistoryItem × N  'use client'
            │           └── SidebarUserNav          'use client'
            │
            └── SidebarInset                        SERVER (passthrough)
                  └── {children}                    ← Chat pages
```

### Chat Page (inside {children})

```
app/(chat)/page.tsx OR app/(chat)/chat/[id]/page.tsx   SERVER (async)
│ Fetches: session, chat+messages, votes, models (parallel)
│
└── ChatStreamProvider                             'use client' (PAGE-scoped)
      │ Purpose: SSE data part accumulation with RAF batching
      │ Split contexts: StateCtx (readers) + DispatchCtx (writers)
      │ Why page-scoped: MUST NOT cascade to sidebar
      │
      └── VotesProvider                            'use client' (existing chat only)
            │ Purpose: React Context for deferred vote hydration
            │ Initially empty; VoteResolver hydrates via use()
            │
            ├── ChatShell                                'use client' (~60 lines)
            │     Props: id, initialMessages, initialChatModel, isReadonly, availableModels
            │     Creates: ChatSessionContext via useChatSession()
            │     Calls: useChatSideEffects()
            │     │
            │     └── ChatSessionContext.Provider
            │           ├── ChatHeader                   'use client' (reads context)
            │           ├── Messages                     'use client' (reads context)
            │           ├── MultimodalInput              'use client' (reads context)
            │           └── ArtifactPanel (conditional)  'use client' (reads artifactStore)
            │
            ├── StreamBridge(id)                         'use client' (~20 lines, renders null)
            │     Reads: ChatStreamProvider (useChatStream)
            │     Writes: artifactStore.setState() via processStreamDelta()
            │
            └── Suspense (existing chat only)
                  └── VoteResolver(chatId, votesPromise) 'use client'
                        Uses: React 19 use() for deferred vote hydration → hydrates VotesProvider
```
<!-- Wave 4-VOTING: CONF-020 fix — added VotesProvider wrapping to match patterns.md §7.5 canonical structure -->

### Auth Route Group (`(auth)/`)

```
app/(auth)/layout.tsx                              SERVER
│ Minimal centered container
│
├── app/(auth)/login/page.tsx                      SERVER
│     └── AuthForm(mode="login")                   'use client'
│
└── app/(auth)/register/page.tsx                   SERVER
      └── AuthForm(mode="register")                'use client'
```

---

## 2. Provider Isolation Analysis

> **SettingsProvider removed** — settings use `useSyncExternalStore` module store.
> Any component imports `useSettings()` directly — no Context provider necessary.

| Context Change | Cascade Reaches | Does NOT Reach |
|---------------|-----------------|---------------|
| Theme toggle | All components | — (expected, rare) |
| Auth change | All components | — (expected, rare) |
| Sidebar toggle | Sidebar + layout | Chat page content |
| PendingChats update | Sidebar + chat pages | Root providers |
| **Settings change** | **Only components calling useSettings()** | **No cascade — module store** |
| **ChatStream delta** | **Chat page only** | **Sidebar, root** |
| ChatSessionContext update | Chat children only | Sidebar, root |
| **Artifact store delta** | **Only subscribed components (selector-based)** | **Most components** |
| **VotesProvider update** | **VoteButtons, Message components (chat page only)** | **Sidebar, root, other pages** |
<!-- audit: SOFT-001 — added VotesProvider cascade row; scoped to existing-chat page, hydrated by VoteResolver -->

---

## 3. Context Dependencies Per Component

### Top-Level Components

| Component | Contexts Required | Hooks Used |
|-----------|-------------------|------------|
| `ChatShell` | ChatStreamProvider (dispatch) | `useChatSession`, `useChatSideEffects`, `usePendingChats` |
| `ChatHeader` | ChatSessionContext, Sidebar | `useChatSessionContext`, `useSidebar` |
| `Messages` | ChatSessionContext | `useChatSessionContext`, `useScrollToBottom` |
| `MultimodalInput` | ChatSessionContext | `useChatSessionContext`, `useSettings` (module store) |
| `ArtifactPanel` | ChatSessionContext | `useArtifact` (useSyncExternalStore), `useChatSessionContext` |
| `StreamBridge` | ChatStreamProvider (state) | `useChatStream`, `artifactStore` (module store) |
| `SidebarShell` | (none — server component) | — |
| `SidebarHistoryClient` | PendingChats | `usePendingChats`, `useSWRInfinite` |
| `SidebarUserNav` | Session, Theme | `useSession`, `useTheme` |
| `ModelSelector` | (none — props-driven) | — |
| `VisibilitySelector` | (none — props + useOptimistic) | `useOptimistic` |
| `VoteResolver` | (none — promise resolution) | React 19 `use()` |

> **Visibility ownership:** `ChatSessionContext` exposes `visibility` (read) and `setVisibility` (write) fields, consumed by `ChatHeader`, `Messages`, `MultimodalInput`, and `ArtifactPanel`. The `VisibilitySelector` calls `setVisibility` (which triggers `updateChatVisibility` Server Action + `useOptimistic`) for per-chat `Chat.visibility` column mutation.
<!-- wave4-cleanup: CONF-001 CV-01 Option A -->

### Artifact Sub-Components

| Component | Contexts Required | Hooks Used |
|-----------|-------------------|------------|
| `TextEditor` | (none — props-driven) | TipTap editor hooks |
| `CodeEditor` | (none — props-driven) | CodeMirror state hooks |
| `SheetEditor` | (none — props-driven) | react-data-grid |
| `ImageEditor` | (none — props-driven) | — |
| `ArtifactActions` | — | `useArtifactSelector` |
| `ArtifactCloseButton` | — | `useArtifactSelector(s => s.isVisible)` — minimal re-renders |
| `VersionFooter` | — | `useArtifactSelector(s => s.artifactId)`, `useSWR` (on-demand versions) |
| `ArtifactErrorBoundary` | (none — error boundary) | — |

### Message Sub-Components

| Component | Contexts Required | Hooks Used |
|-----------|-------------------|------------|
| `Message` | — | Props: message, isLoading |
| `MessageActions` | — | Props-driven |
| `MessageEditor` | — | Props-driven |
| `MessageReasoning` | — | Local state (expanded, streaming) |
| `VoteButtons` | — | `useOptimistic`, `voteOnMessage` Server Action |
| `ArtifactPreview` | — | `useArtifactSelector(s => s.isVisible)` |
| `Weather` | — | `useIsMobile` |
| `SuggestedActions` | ChatSessionContext | `useChatSessionContext` (sendMessage) |

---

## 4. Data Flow: Parent → Child

### Home Page (`/`)

```
Page (SERVER)
  ├── generates: id (UUID)
  ├── fetches: session, models (server-side)
  │
  └── ChatStreamProvider
        ├── ChatShell (client)
        │     Creates ChatSessionContext from useChatSession()
        │     Props: id, initialMessages=[], initialChatModel=getDefaultModel(session),
        │            isReadonly=false, availableModels
        │     │
        │     └── ChatSessionContext.Provider
        │           ├── → ChatHeader: (reads context — chatModel, status)
        │           ├── → Messages: (reads context — messages, status, sendMessage)
        │           ├── → MultimodalInput: (reads context — input, setInput, sendMessage, stop,
        │           │                       status, attachments, setAttachments) + availableModels
        │           └── → ArtifactPanel (conditional on artifact.isVisible):
        │                 reads from artifactStore via useArtifact()
        │
        └── StreamBridge(id) (client, renders null)
              Reads: ChatStreamProvider state → processStreamDelta() → artifactStore
```

### Existing Chat Page (`/chat/[id]`)

```
Page (SERVER, async)
  ├── Fetches: session, chat+messages, votes, models (parallel via Promise.all)
  ├── Access control: notFound() if missing/unauthorized
  │
  └── ChatStreamProvider
        └── VotesProvider                          (empty context initially)
              ├── ChatShell (client) — same as Home but with:
              │     initialMessages = chat.messages
              │     initialChatModel = chat.model
              │     isReadonly = (chat.userId !== session.user.id)
              │
              ├── StreamBridge(id) (client, renders null)
              │
              └── Suspense
                    └── VoteResolver(chatId, votesPromise) — deferred vote hydration → hydrates VotesProvider
```
<!-- Wave 4-VOTING: CONF-020 fix — added VotesProvider wrapping to match patterns.md §7.5 canonical structure -->

### Sidebar (Server-Rendered Initial + Client Pagination)

```
SidebarShell (SERVER, async)
  ├── Fetches: chats via 'use cache' + cacheTag('chats:{userId}')
  ├── Passes: initialChats (slice 0-20), initialHasMore
  │
  ├── SidebarHistoryClient (client)
  │     ├── Merges: initialChats + PendingChatsProvider optimistic entries
  │     ├── Pagination: useSWRInfinite → GET /api/history
  │     └── SidebarHistoryItem × N (link + dropdown)
  │
  └── SidebarUserNav (client)
        ├── session (from props)
        ├── Theme toggle, logout
        └── Avatar
```

---

## 5. Event Flow: Child → Parent / Cross-Component

### Chat → Sidebar (Optimistic Chat Creation)

```
ChatShell.useChatSession.sendMessage()
  → PendingChats.add({ id, title: input.slice(0,50), createdAt, visibility })
  → PendingChatsProvider context update
  → SidebarHistoryClient re-renders with new optimistic entry
```

### Stream → Sidebar (Title Update — Single Channel)

```
useChat.onData receives { type: 'chat-title', content: title }
  → PendingChats.updateTitle(chatId, title)
  → PendingChatsProvider context update
  → SidebarHistoryItem re-renders with real title
```

> **Removed:** `pollForTitle()` 3×500ms polling, `window.dispatchEvent('chat-title-updated')`.
> Title is AWAITED server-side before stream close — single delivery mechanism.

### Chat onFinish → Cache Revalidation

```
Server onFinish callback:
  → saveMessages(chatId, messages)
  → updateChatTitle(chatId, title)
  → revalidateTag('chat:{chatId}', 'max')         ← stale-while-revalidate
  → revalidateTag('chats:{userId}', 'max')         ← sidebar refresh on next nav
```

### Sidebar Delete → Chat (Navigation)

```
SidebarHistoryItem.delete()
  → PendingChats.remove(id) → context update (optimistic removal)
  → Server Action deleteChat() → DB delete → updateTag('chats:{userId}')
  → If deleting active chat: router.push('/')
```

### Artifact Tool Result → Artifact Panel

```
Message renders ArtifactPreview (inline thumbnail)
  → User clicks inline preview
  → artifactStore.setState({ ...state, isVisible: true, artifactId })
  → ArtifactPanel renders (conditional on artifact.isVisible)
```

### ArtifactCloseButton → Artifact State

```
ArtifactCloseButton.onClick()
  → artifactStore.setState({ isVisible: false })
```

### MessageEditor → Messages State

```
MessageEditor.send()
  → deleteTrailingMessages({ id: messageId, chatId }) — Server Action → updateTag('chat:{id}')
  → useChatSessionContext().editMessage(messageId, newContent)
    → Encapsulates: truncate messages + regenerate
```

### Settings → Chat Request

```
Settings change via useSettingsSetter() (module-level store, no provider)
  → useSyncExternalStore subscribers notified
  → Next sendMessage(): prepareSendMessagesRequest includes new settings
  → Server reads: temperature, topP, maxOutputTokens, systemPrompt, enableReasoning
```

### Vote → Server Action

```
VoteButtons.handleVote(type)
  → useOptimistic(type) — immediate UI update
  → voteOnMessage({ chatId, messageId, type }) — Server Action
  → Server: upsert vote → updateTag('votes:{chatId}')
  → On failure: toast.error(), optimistic rolls back
```

---

## 6. Render Trees Per Screen

### Login/Register Screen

```
RootLayout → ThemeProvider → SessionProvider
  └── AuthLayout (SERVER, centered container)
        └── AuthForm(mode) ('use client')
              ├── Form (useActionState)
              │     ├── Input (email, autofocus)
              │     ├── Input (password)
              │     └── SubmitButton
              └── Link (to /register or /login)
```

### Chat Error Screen

```
RootLayout → ChatLayout → PendingChatsProvider → SidebarProvider
  └── error.tsx (error boundary)
        ├── Heading: "Something went wrong"
        ├── Error digest display
        ├── "Go Home" button
        └── "Try Again" button → reset()
```

### Global Error Screen

```
global-error.tsx (standalone html/body)
  └── NextError statusCode={0}
```

---

## 7. Key Wiring Patterns

### Split Context (ChatStreamProvider)

ChatStreamProvider creates TWO React contexts to prevent re-render cascades:
- `StateContext` — components reading stream data subscribe here (StreamBridge)
- `DispatchContext` — components dispatching updates subscribe here (useChatSession.onData)

Components that only dispatch (useChatSession setting stream data) don't re-render when stream state changes. RAF batching coalesces ~200 SSE deltas/sec to ~60 React updates/sec.

### useSyncExternalStore for Artifact State

Artifact state is managed via `artifactStore` — a module-level store using `useSyncExternalStore`:
- `useArtifact()` — full artifact state, re-renders on ANY change
- `useArtifactSelector(selector)` — re-renders ONLY when selected slice changes
- `artifactStore.setState()` — called by StreamBridge's `processStreamDelta()`
- ~80% fewer re-renders during streaming vs SWR synthetic key approach

> **Replaced:** SWR with synthetic key `"artifact"` and no fetcher.

### useSyncExternalStore for Settings

Settings state managed via `settingsStore` module-level store + `localStorage`:
- `useSettings()` — full settings state
- `useSettingsSetter()` — write-only, no subscription
- Cross-tab sync via `StorageEvent` listener
- No provider needed — any component imports directly

> **Replaced:** SettingsProvider React Context.

> **Settings fields scope (redesign clarification):**
> Active settings: `{ temperature, topP, maxOutputTokens, systemPrompt, enableReasoning }`
> Old plan fields intentionally removed or relocated:
> - `streamArtifacts`: Removed — artifacts always stream
> - `autoScroll`: Retained via `useScrollToBottom` hook, not a user-facing setting
> - `reasoningBudget`: Removed — reasoning controlled by `enableReasoning` boolean
> - `selectedModelId`: Stored in cookie (`chat-model`), not in settings store

### Optimistic Pattern (PendingChatsProvider)

Chat list uses optimistic updates with dedup:
- Internal `Set<string>` for O(1) ID lookup
- `add(chat)` prepends entry (skips if ID exists)
- `updateTitle(id, title)` updates optimistic entry title
- `remove(id)` removes on delete
- `markConfirmed(id)` marks server-confirmed

> **Removed:** `window.dispatchEvent('chat-title-updated')`, auto-cleanup > 2min.
> Title sync uses single-channel `PendingChats.updateTitle()` via `chat-title` stream part.

### Transport Customization (useChat)

The AI SDK `useChat` hook uses `DefaultChatTransport` with custom request preparation:
- `prepareSendMessagesRequest` injects model ID, visibility, and settings into every request
- Only the latest message is sent (not full history — server loads from DB/cache)
- Adaptive throttle: 50ms (fast), 100ms (medium), 150ms (slow connection)
- `onData` routes `chat-title` to `PendingChats.updateTitle()`, `artifact-*` to `ChatStreamProvider`
