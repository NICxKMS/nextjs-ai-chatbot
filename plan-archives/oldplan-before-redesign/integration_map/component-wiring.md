# Component Wiring

> Provider tree hierarchy, context dependencies per component, data flow parent→child,
> event flow child→parent, and render trees for every screen.

---

## 1. Provider Tree (Root → Leaf)

```
<html lang="en" className={fontVars} suppressHydrationWarning>
  <body className="antialiased">
    <Script id="theme-color" />            // Inline: sync theme-color meta
    <SpeedInsights />                      // Vercel analytics
    <Analytics />                          // Vercel analytics
    <Suspense fallback={<AppShellFallback />}>
      <AppShell>                           // async server component → getAppSession()
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider delayDuration={0}>
            <Toaster position="top-center" />   // sonner toast target
            <SWRConfig value={globalSWRConfig}>
              <AuthProvider initialSession={session}>
                {children}                 // ← route group content
              </AuthProvider>
            </SWRConfig>
          </TooltipProvider>
        </ThemeProvider>
      </AppShell>
    </Suspense>
  </body>
</html>
```

### Chat Route Group (`(chat)/`)

```
<ChatLayoutClient>                        // "use client" — reads ?notice params
  <Script src="pyodide.js" strategy="lazyOnload" />
  <SettingsProvider>                       // localStorage pub/sub for settings
    <DataStreamProvider>                   // Split state/dispatch contexts
      <OptimisticChatsProvider>            // Sidebar optimistic chat entries
        <SidebarProvider defaultOpen={true}>
          <Suspense fallback={<SidebarSkeleton />}>
            <AppSidebar />                 // dynamic import, ssr=false
          </Suspense>
          <SidebarInset>
            <Suspense fallback={<Loader />}>
              {children}                   // ← page content (Chat + DataStreamHandler)
            </Suspense>
          </SidebarInset>
        </SidebarProvider>
      </OptimisticChatsProvider>
    </DataStreamProvider>
  </SettingsProvider>
</ChatLayoutClient>
```

### Auth Route Group (`(auth)/`)

```
{children}                                // Direct child of AuthProvider
// No additional providers — auth pages are minimal
```

---

## 2. Global SWR Configuration

```typescript
{
  dedupingInterval: 10_000,          // 10s dedup for identical keys
  revalidateOnFocus: false,          // No refetch on window focus
  revalidateOnReconnect: false,      // No refetch on reconnect
  refreshWhenHidden: false,          // No refresh in background tabs
  refreshWhenOffline: false,         // No refresh when offline
  revalidateIfStale: true,           // Revalidate stale data on mount
}
```

---

## 3. Context Dependencies Per Component

### Top-Level Components

| Component | Contexts Required | Hooks Used |
|-----------|-------------------|------------|
| `AppSidebar` | Auth, OptimisticChats, Sidebar, SWRConfig | `useAuth`, `useSidebar`, `useRouter`, `useSWRConfig` |
| `Chat` | Auth, DataStream, Settings, OptimisticChats, SWRConfig | `useChat`, `useChatVisibility`, `useDataStream`, `useSettings`, `useAuth`, `useOptimisticChats`, `useArtifact`, `useSearchParams` |
| `DataStreamHandler` | DataStream, Artifact (SWR) | `useDataStream`, `useArtifact` |
| `ChatHeader` | Sidebar | `useSidebar` (via SidebarToggle) |
| `Messages` | DataStream, Settings | `useDataStream`, `useSettingsSnapshot` |
| `MultimodalInput` | Settings | `useSettings` (for localStorage input) |
| `Artifact` | DataStream, SWR (artifact + document) | `useArtifact`, `useArtifactSelector`, `useMessages`, SWR for document |
| `SidebarHistory` | Auth, OptimisticChats, SWRConfig | `useAuth`, `useOptimisticChats`, `useSWRInfinite` |
| `SidebarUserNav` | Auth, Theme, SWRConfig | `useAuth`, `useTheme`, `useSWRConfig` |
| `SettingsSheet` | Settings | `useSettings`, `useSettingsSnapshot` |
| `ModelSelector` | (none — props-driven) | — |
| `VisibilitySelector` | SWR (visibility) | `useChatVisibility` |

### Artifact Sub-Components

| Component | Contexts Required | Hooks Used |
|-----------|-------------------|------------|
| `TextEditor` | (none — props-driven) | TipTap editor hooks |
| `CodeEditor` | (none — props-driven) | CodeMirror state hooks |
| `SheetEditor` | (none — props-driven) | react-data-grid |
| `ImageEditor` | (none — props-driven) | — |
| `Toolbar` | (none — props-driven) | framer-motion drag |
| `VersionFooter` | (none — props-driven) | SWR for document mutation |
| `ArtifactMessages` | Messages context | `useMessages` |
| `ArtifactActions` | (none — props-driven) | — |
| `ArtifactCloseButton` | Artifact (SWR) | `useArtifact` |

### Message Sub-Components

| Component | Contexts Required | Hooks Used |
|-----------|-------------------|------------|
| `PreviewMessage` | (none — props-driven) | — |
| `MessageActions` | SWR (votes) | SWR optimistic mutate for votes |
| `MessageEditor` | (none — props-driven) | `useFormStatus`-like pattern |
| `MessageReasoning` | (none — props-driven) | local state (expanded, streaming) |
| `Weather` | (none — props-driven) | `useIsMobile` |
| `DocumentPreview` | Artifact (SWR) | `useArtifact`, SWR for document fetch |
| `SuggestedActions` | (none — props-driven) | — |

---

## 4. Data Flow: Parent → Child

### Home Page (`/`)

```
Page (server)
  ├── props: id (UUID), initialMessages (empty), initialChatModel (from cookie),
  │         initialVisibilityType ("private"), initialVotes ([]), isReadonly (false),
  │         availableModels (from listChatModels())
  │
  ├── Chat (client)
  │     ├── → ChatHeader: chatId, selectedVisibilityType, isReadonly
  │     ├── → Messages: chatId, status, votes, messages, setMessages, regenerate,
  │     │               isReadonly, isGuest, isArtifactVisible, selectedModelId
  │     ├── → MultimodalInput: chatId, input, setInput, status, stop, attachments,
  │     │                      setAttachments, messages, setMessages, sendMessage,
  │     │                      selectedVisibilityType, selectedModelId, usage, availableModels
  │     └── → Artifact (dynamic): chatId, input, setInput, status, stop, attachments,
  │                               setAttachments, sendMessage, messages, setMessages,
  │                               regenerate, votes, isReadonly, selectedVisibilityType,
  │                               selectedModelId, availableModels
  │
  └── DataStreamHandler (client, renders null)
        ← reads: dataStream (from DataStreamProvider context)
        → writes: useArtifact SWR state
```

### Existing Chat Page (`/chat/[id]`)

```
Page (server)
  ├── Fetches: session, chat+messages (cache-first), votes, models
  ├── Access control: redirect if missing/unauthorized
  │
  ├── Chat (client) — same as Home but with:
  │     initialMessages = convertToUIMessages(messagesFromDb)
  │     initialChatModel = chat.lastContext?.modelId || DEFAULT
  │     initialVisibilityType = chat.visibility
  │     initialVotes = votes (from DB, non-guest only)
  │     isReadonly = session.user.id !== chat.userId
  │     initialLastContext = chat.lastContext
  │
  └── DataStreamHandler (client, renders null)
```

### Sidebar

```
AppSidebar (client, dynamic import)
  ├── SidebarHeader
  │     ├── Brand text: "Assistant"
  │     └── New Chat button → router.push('/') + router.refresh()
  │
  ├── SidebarContent → SidebarHistory
  │     ├── user (from useAuth): { email }
  │     ├── GroupedVirtuoso renders ChatItem per chat
  │     │     ├── chat: Chat object (from SWR/optimistic)
  │     │     ├── isActive: pathname === `/chat/${chat.id}`
  │     │     └── onDelete, setOpenMobile callbacks
  │     └── SidebarHistoryItem
  │           ├── SidebarMenuButton (Link to /chat/{id})
  │           └── DropdownMenu (Share, Delete)
  │
  └── SidebarFooter → SidebarUserNav
        ├── user: { email }
        ├── DropdownMenu: Theme toggle, Login/Logout
        └── Avatar from avatar.vercel.sh
```

---

## 5. Event Flow: Child → Parent / Cross-Component

### Chat → Sidebar (Optimistic Chat Creation)

```
Chat.handleSubmit()
  → addOptimisticChat({ id, title: input.slice(0,50), createdAt, visibility })
  → OptimisticChatsProvider context update
  → SidebarHistory re-renders with new entry in __optimistic__ group
```

### Stream → Sidebar (Title Update)

```
useChat.onData receives data-chatTitle
  → updateOptimisticChat(chatId, { title })
  → OptimisticChatsProvider context update
  → SidebarHistoryItem re-renders with new title
```

### Chat onFinish → Sidebar (Title Confirmation)

```
Chat.onFinish
  → Poll /api/chat?id= for title (5 attempts, 500ms)
  → window.dispatchEvent(new Event('chat-title-updated'))
  → SidebarHistory listens: revalidate SWR
```

### Sidebar Delete → Chat (Navigation)

```
SidebarHistoryItem.delete()
  → DELETE /api/history/{id}
  → removeOptimisticChat(id) → context update
  → SWR mutate (remove from cache pages)
  → If deleting active chat: router.push('/')
```

### Artifact Tool Result → Artifact Panel

```
PreviewMessage renders DocumentToolResult/DocumentToolCall
  → User clicks inline document preview
  → setArtifact({ ...state, isVisible: true, boundingBox, documentId })
  → Artifact panel opens with AnimatePresence animation
```

### ArtifactCloseButton → Artifact State

```
ArtifactCloseButton.onClick()
  → If streaming: setArtifact({ isVisible: false }) (keep content)
  → If idle: setArtifact(initialArtifactData) (full reset)
```

### MessageEditor → Messages State

```
MessageEditor.send()
  → deleteTrailingMessages(messageId, chatId) — server action
  → setMessages(prev => [...prev.slice(0, editIndex), editedMessage])
  → regenerate() — re-sends from edited message
```

### Settings → Chat Request

```
SettingsSheet changes setting
  → SettingsProvider localStorage update + notify subscribers
  → Chat.useSettings() reads updated settings
  → Next sendMessage(): prepareSendMessagesRequest includes new settings
  → Server reads: temperature, topP, maxOutputTokens, systemPrompt, enableReasoning
```

### Vote → SWR Cache

```
MessageActions.vote()
  → SWR mutate(`/api/vote?chatId=${chatId}`, optimisticVotes) — immediate
  → PATCH /api/vote { chatId, messageId, type }
  → On success: SWR mutation confirmed
  → On failure: SWR rollback
```

---

## 6. Render Trees Per Screen

### Login/Register Screen

```
RootLayout → AppShell(ThemeProvider → SWRConfig → AuthProvider)
  └── AuthForm (server component)
        ├── Form (next/form)
        │     ├── Input (email, autofocus)
        │     ├── Input (password)
        │     └── SubmitButton (useFormStatus)
        └── Link (to /register or /login)
```

### Chat Error Screen

```
RootLayout → ChatLayout → ChatLayoutClient(providers)
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

### Split Context (DataStreamProvider)

DataStreamProvider creates TWO React contexts to prevent re-render cascades:
- `DataStreamStateContext` — components reading stream data subscribe here
- `DataStreamDispatchContext` — components dispatching updates subscribe here

Components that only dispatch (e.g., Chat setting stream data) don't re-render when stream state changes. Components that only read (DataStreamHandler) don't trigger re-renders in dispatch consumers.

### SWR as State (useArtifact)

Artifact state is managed via SWR with a synthetic key `"artifact"` and no fetcher:
- Acts as a global reactive store
- `mutate("artifact", updater)` triggers re-renders in all `useSWR("artifact")` consumers
- `useArtifactSelector(selector)` subscribes to derived slices for performance
- No API fetching — purely client-side state management using SWR as infrastructure

### Optimistic Pattern (useOptimisticChats)

Chat list uses optimistic updates with dedup:
- Internal `Set<string>` for O(1) ID lookup
- `addOptimisticChat()` prepends entry (skips if ID exists)
- `markChatConfirmed()` replaces optimistic flag
- Auto-cleanup: optimistic entries > 2 min are removed
- Window event `chat-title-updated` triggers SWR revalidation

### Transport Customization (useChat)

The AI SDK `useChat` hook uses `DefaultChatTransport` with custom request preparation:
- `prepareSendMessagesRequest` injects model ID, visibility, and settings into every request
- Only the latest message is sent (not full history — server loads from DB/cache)
- Adaptive throttle: 50ms (fast), 100ms (medium), 150ms (slow connection)
