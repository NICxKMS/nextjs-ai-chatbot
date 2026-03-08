FLOW: First Paint (New Chat)
ENTRY: Browser navigates to `/` → Next.js resolves `app/(chat)/page.tsx`

STEPS:
  1. `app/layout.tsx` (RootLayout, Server Component)
     → Renders static `<html>` shell with GeistSans/GeistMono font class variables
     → `suppressHydrationWarning` on `<html>` for next-themes
     → Wraps children in: ThemeProvider → TooltipProvider → {children} + Toaster
     → Output: `<html><body class="antialiased">` shell with providers

  2. `app/(chat)/layout.tsx` (ChatLayout, Server Component)
     → `getAppSession()` called (returns a Promise, NOT awaited here — passed to SessionProvider)
     → Wraps children with:
       a. `<Suspense fallback={null}><NoticeHandler /></Suspense>` — deferred, renders null initially
       b. `<SessionProvider session={sessionPromise}>` — receives unresolved promise
       c. `<PendingChatsProvider>` — client context for optimistic sidebar entries
       d. `<Suspense fallback={<ChatLayoutFallback>{children}</ChatLayoutFallback>}>`
          → Wraps `<ChatLayoutShell>{children}</ChatLayoutShell>`
     → Output: Immediate shell with ChatLayoutFallback while async resolves

  3. `ChatLayoutFallback` (Sync function component)
     → Renders `ChatLayoutFrame` with `defaultOpen={true}` and `<SidebarSkeleton />` as sidebar
     → `SidebarProvider(defaultOpen=true)` → `{sidebar}` + `<SidebarInset>{children}</SidebarInset>`
     → Output: Two-column layout — skeleton sidebar on left, page content on right

  4. `app/(chat)/loading.tsx` (Loading skeleton, Server Component)
     → While `page.tsx` awaits async data, this loading.tsx is shown
     → Renders header skeleton (toggle + model selector shapes) + empty message area + input skeleton
     → Output: Full chat UI skeleton matching ChatShell structure

  5. `app/(chat)/page.tsx` (NewChatPage, async Server Component)
     → Calls `getAvailableModels()` (cached, 'use cache' + hourly cacheLife)
     → `Promise.all([searchParams, availableModels, getDefaultModel(null, availableModelsPromise)])`
       - searchParams: reads `?q=` or `?query=` URL params
       - availableModels: resolves model catalog (static + discovered models)
       - getDefaultModel: reads `chat-model` cookie, validates against catalog, falls back to DEFAULT_CHAT_MODEL
     → Generates UUID for new chat via `generateUUID()`
     → Output: `<ChatStreamProvider><ChatShell id={uuid} initialMessages={[]} ... /></ChatStreamProvider>`

  6. `ChatStreamProvider` (Client Component)
     → Creates split contexts: StateCtx (chatStream array) + DispatchCtx (setChatStream)
     → RAF-batched setter coalesces SSE deltas into ~60 React updates/sec
     → Output: Provider wrapping ChatShell

  7. `ChatShell` (Client Component — orchestrator, ~55 lines)
     → Props: `id, initialMessages=[], initialChatModel, isReadonly=false, initialVisibility="private", availableModels, initialQuery?`
     → Calls `usePendingChats()` for sidebar optimistic updates
     → Calls `useChatSession(params)` → returns ChatSessionValue:
       - Internally: useChat (AI SDK) with DefaultChatTransport to `/api/chat`
       - Local state: input, chatModel, visibility, usage
       - Refs for stale-closure safety in transport callbacks
       - Adaptive throttle based on network connection type
     → Calls `useChatSideEffects({id, messages, stop, onChatChange: artifactStore.reset})`
     → If `initialQuery` present + no messages → auto-submits via `session.sendMessage(initialQuery)` on mount
     → Renders via `ChatSessionContext.Provider value={session}`:
       a. `<div class="flex h-dvh min-w-0 flex-col bg-background">`
       b. `<ChatHeader />` — SidebarToggle, ModelSelector, VisibilitySelector, New Chat link, Settings button
       c. `<Messages />` — reads from context; empty state shows Greeting + SuggestedActions
       d. `<div sticky bottom>` → `<MultimodalInput />` (if !isReadonly)
       e. `<StreamBridge chatId={id} onArtifactDelta={...} />` — renders null, bridges stream → artifact store
       f. `<ArtifactPanel chatId={id} />` — dynamic import, SSR=false, code-split

  8. `ChatHeader` (Client Component)
     → Reads `chatModel, setChatModel, availableModels` from ChatSessionContext
     → Renders: SidebarToggle | ModelSelector | VisibilitySelector | ml-auto: [New Chat link, Settings btn]
     → SettingsPanel as Sheet (closed by default)

  9. `Messages` (Client Component, memo'd)
     → Reads `messages, status, isReadonly` from ChatSessionContext
     → Empty state (`messages.length === 0`):
       - Container with `useScrollToBottom()` (IntersectionObserver)
       - `<Greeting />` — "Hello there! How can I help you today?" with fade-in animation
       - `<SuggestedActions />` — 4 hardcoded suggestions rendered via ai-element `<Suggestion />`
     → Uses endRef sentinel for scroll detection

  10. `MultimodalInput` (Client Component)
      → Reads `sendMessage, stop, status, isReadonly, chatModel, setChatModel, availableModels, setInput, usage` from context
      → Wraps ai-element PromptInput compound components
      → File upload goes through `/api/files/upload` before message send
      → Renders: PromptInputTextarea + ContextDisplay (token usage) + PromptInputFooter with submit/stop

  11. `StreamBridge` (Client Component — renders null)
      → Subscribes to `useChatStream()` state changes
      → Processes new deltas via `processStreamDelta()` → calls `onArtifactDelta` → `artifactStore.setState`

  12. `ArtifactPanel` (Client Component — dynamic import, SSR=false)
      → NOT loaded initially — code-split chunk
      → Only loads when `artifact.isVisible` triggers import
      → Uses `useArtifact()` (useSyncExternalStore on artifactStore singleton)

CONCURRENT ASYNC RESOLUTION:
  13. `ChatLayoutShell` (async Server Component — resolves behind Suspense)
      → `getSidebarDefaultOpen()` awaits `cookies()` for `sidebar_state` cookie
      → Renders `ChatLayoutFrame` with actual defaultOpen + `<SidebarShell />` in inner Suspense
      → Replaces ChatLayoutFallback when resolved

  14. `SidebarShell` (async Server Component — resolves behind inner Suspense)
      → `getAppSession()` (request-scoped cache) — same promise as layout
      → `getCachedChats(user.id)` — `'use cache'` + `cacheLife('seconds')` + `cacheTag(chats:{userId})`
      → DB query: `getChatsByUserId(userId, {limit: 20})` → returns {chats, hasMore}
      → Renders: Sidebar → SidebarHeader(SidebarHeaderActions) + SidebarContent(SidebarHistoryClient) + SidebarFooter(SidebarUserNav)
      → Replaces SidebarSkeleton when resolved

  15. `SessionProvider` (Client Component)
      → Receives session promise; starts as `{session: null, isLoading: true}`
      → Promise resolves → `{session: AppSession, isLoading: false}`
      → Subscribes to Supabase `onAuthStateChange` for cross-tab auth events

  16. `NoticeHandler` (Client Component — Suspense fallback=null)
      → Reads `useSearchParams()` for `?notice=` param
      → Shows toast for known notices (chat_not_found, user_not_found)
      → Strips notice param from URL via `history.replaceState`

HYDRATION:
  17. Server HTML streamed to browser
      → React hydrates the static shell first (RootLayout + ThemeProvider + body)
      → ChatLayoutFallback with SidebarSkeleton shown immediately
      → loading.tsx skeleton shown in SidebarInset while page.tsx awaits
      → After page.tsx resolves, ChatShell replaces loading skeleton
      → After ChatLayoutShell resolves, real sidebar replaces skeleton
      → ArtifactPanel chunk NOT loaded (deferred until artifact opens)

BOTTLENECKS:
  - `page.tsx` awaits `Promise.all([searchParams, availableModels, getDefaultModel()])` — serialized
    behind the `(chat)/loading.tsx` Suspense boundary. Model discovery (if uncached) hits provider APIs.
  - `getDefaultModel` reads `cookies()` — dynamic API forces request-time evaluation
  - `ChatLayoutShell` awaits `cookies()` for sidebar_state — blocks sidebar resolution
  - `SidebarShell` awaits `getAppSession()` then `getCachedChats()` — two sequential awaits
  - Session resolution pipeline: Supabase `getUser()` → cookie read → network round-trip to Supabase

WASTE:
  - `getAppSession()` is called in ChatLayout (as promise) AND in SidebarShell (awaited). Both share
    the same `React.cache` wrapper, so only one actual resolution occurs — this is correct, no waste.
  - `ChatLayoutFallback` renders `SidebarProvider(defaultOpen=true)` then `ChatLayoutShell` re-renders
    with actual cookie value — potential re-mount of sidebar provider if value differs. The children
    are passed through, so the page content is preserved.
  - ThemeProvider and TooltipProvider are always client components in the root — every page pays the
    hydration cost even if tooltips/themes aren't used.

SIMPLIFICATION OPPORTUNITIES:
  - `getDefaultModel` takes `(session, availableModelsPromise)` but `session` is unused (`_session`).
    Could reduce to `getDefaultModel(availableModelsPromise)` — one less parameter to thread.
  - NoticeHandler renders in its own Suspense with `fallback={null}` — `useSearchParams()`  
    requires client component anyway; could be merged into ChatShell or removed from Suspense
    if there's no server cost.
  - The `ChatLayoutFallback → ChatLayoutShell` swap re-creates the SidebarProvider. If the
    sidebar_state cookie is nearly always available (>99% of requests), the initial fallback
    adds overhead for minimal benefit.

EXIT: Browser displays the new-chat UI with:
  - Two-column layout: sidebar (skeleton → real) | main content
  - ChatHeader with model selector showing default model
  - Greeting message + 4 suggested actions
  - MultimodalInput text area at bottom
  - No messages rendered
  - ArtifactPanel code not loaded
  - SessionProvider resolves async, enabling auth-aware features
