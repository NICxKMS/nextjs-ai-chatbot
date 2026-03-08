FLOW: Client Hydration
ENTRY: Server-streamed HTML arrives at browser → React hydration begins

STEPS:
  1. **Server HTML streaming** (what the browser receives):
     → Root `<html>` with font class variables (GeistSans, GeistMono) + `suppressHydrationWarning`
     → `<body class="antialiased">` with server-rendered content
     → For new chat: static shell + ChatLayoutFallback(SidebarSkeleton + loading.tsx skeleton)
     → For existing chat: static shell + ChatLayoutFallback(SidebarSkeleton + [id]/loading.tsx skeleton)
     → Suspense boundaries produce placeholder HTML with `<!--$!-->` markers
     → Out-of-order streaming delivers resolved Suspense content via `<script>` tags

  2. **React hydration initialization**:
     → React attaches event listeners to the server-rendered DOM
     → `suppressHydrationWarning` on `<html>` prevents mismatch from next-themes class injection
     → Client components begin hydration in tree order:
       a. ThemeProvider (next-themes) — injects `class="dark"` or `class="light"` on `<html>`
       b. TooltipProvider — attaches tooltip event handlers
       c. Toaster (sonner) — renders toast container

  3. **SessionProvider hydration** (Chat routes only):
     → Receives `sessionPromise` from server (a serialized Promise reference)
     → Initial state: `{ session: null, isLoading: true }` (promise is unresolved)
     → `useEffect` attaches `.then()` on the promise:
       - On resolve: `setSession(resolvedSession)`, `setIsLoading(false)`
       - On reject: `setSession(null)`, `setIsLoading(false)`
     → Subscribes to Supabase `onAuthStateChange`:
       - Events: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED
       - On event: `router.refresh()` → revalidates server components

  4. **PendingChatsProvider hydration**:
     → Initial state: `entries: []` (empty, no pending chats)
     → Context available for ChatShell and SidebarHistoryClient

  5. **ChatStreamProvider hydration**:
     → Initial state: `chatStream: []` (empty, no stream data)
     → RAF batching refs initialized

  6. **ChatShell hydration** (main orchestrator):
     → `useChatSession(params)` initializes:
       - `useChat()` (AI SDK) — creates internal message state from `initialMessages`
       - `DefaultChatTransport` — stable transport instance (no re-create)
       - Adaptive throttle computed: `getAdaptiveThrottle()` checks `navigator.connection.effectiveType`
       - `useChatStreamDispatch()` — gets stable `setChatStream` from DispatchCtx
       - `useSettingsSelector(s => s)` — reads settings from external store
     → `useChatSideEffects()` — attaches side effect watchers
     → `ChatSessionContext.Provider` wraps all children — context now available

  7. **ChatHeader hydration**:
     → `useChatSessionContext()` — reads from ChatSessionContext
     → `useState(false)` for settingsOpen

  8. **Messages hydration**:
     → `useChatSessionContext()` — reads messages, status, isReadonly
     → `useScrollToBottom()` — creates IntersectionObserver on sentinel element
     → For empty state: Greeting (static) + SuggestedActions (reads sendMessage from context)
     → For existing chat: MessageItem[] hydrates — memo boundaries established

  9. **MultimodalInput hydration**:
     → `usePromptInputController()` — ai-element hook
     → `useChatSessionContext()` — reads sendMessage, stop, status, etc.
     → `autoFocus` on PromptInputTextarea — input gets focus after hydration

  10. **StreamBridge hydration**:
      → `useChatStream()` — subscribes to ChatStreamProvider state
      → `useEffect` initializes refs: `lastProcessedRef = -1`, `artifactRef = DEFAULT_ARTIFACT`
      → No processing (chatStream is empty)

  11. **ArtifactPanel hydration**:
      → Dynamic import with `ssr: false` — NOT hydrated from server HTML
      → Component loads lazily on client side only
      → Initial render: `useArtifact()` via `useSyncExternalStore(artifactStore)`
      → `artifact.isVisible === false` → panel is hidden (AnimatePresence)

  12. **SidebarHistoryClient hydration** (after SidebarShell Suspense resolves):
      → `useSidebarHistory({ initialData })` — SWR initializes with fallbackData
      → `revalidateOnMount: false` — NO duplicate fetch on hydration
      → `usePendingChats()` reads from PendingChatsProvider
      → IntersectionObserver created on sentinel element for infinite scroll
      → Groups computed via `groupChatsByDate()`

  13. **SidebarUserNav hydration**:
      → `useState(false)` for mounted → `useEffect(() => setMounted(true))` fires post-hydration
      → Until mounted: renders safely without auth/theme-dependent content
      → After mounted: full render with avatar, email, theme toggle

  14. **VoteResolver hydration** (existing chat only):
      → `use(votesPromise)` — if promise already resolved by server, immediately available
      → If not yet resolved: component suspends, Suspense shows `null` fallback
      → On resolution: `setServerVotes(resolvedVotes)` → VotesStore updated → VoteButtons re-render

  15. **NoticeHandler hydration**:
      → `useSearchParams()` — triggers Suspense if not available
      → `useEffect` checks for `?notice=` param
      → If found: shows toast + strips param via `history.replaceState`

HYDRATION TIMELINE:
  ```
  T=0ms       Browser receives first bytes of HTML
  T=0-50ms    Static HTML paints (skeleton UI visible)
  T=50ms      React JS bundle loads + parses
  T=50-100ms  React.hydrate() begins — attaches event listeners
  T=100ms     ThemeProvider hydrates (theme class applied to <html>)
  T=100ms     SessionProvider hydrates (isLoading=true)
  T=100ms     ChatShell hydrates (useChatSession initializes)
  T=100ms     MultimodalInput gets autoFocus
  T=100ms+    Suspense boundaries resolve server-side, stream in:
                - ChatLayoutShell (sidebar cookie resolved)
                - SidebarShell (session + chats resolved)
                - VoteResolver (votes resolved)
  T=150ms     SidebarUserNav mounted guard fires → full render
  T=200ms+    SessionProvider.useEffect resolves promise → isLoading=false
  T=varies    Supabase onAuthStateChange subscription active
  ```

STORE INITIALIZATION ORDER:
  ```
  1. artifactStore (module-level singleton) — initialized at import time
     → state = initialArtifactData, listeners = empty Set
  2. SettingsStore (external store) — initialized at import time
     → Read by useSettingsSelector in useChatSession
  3. ChatStreamProvider — initialized at component mount
     → chatStream = [], RAF refs initialized
  4. PendingChatsProvider — initialized at component mount
     → entries = [], reservedIds = new Set
  5. SessionProvider — initialized at component mount
     → session = null (or resolved value if not promise)
  6. VotesProvider (existing chat only) — initialized at component mount
     → VotesStore created, empty votes
  7. useSWRInfinite (sidebar) — initialized with fallbackData from server
  ```

BOTTLENECKS:
  - **React JS bundle size**: All client components must be loaded before hydration begins. ChatShell, Messages, MultimodalInput, SidebarHistoryClient, ArtifactPanel (deferred) are all client components.
  - **SessionProvider promise resolution**: Until the session promise resolves, all components that read `useSession()` show loading/default state. This includes SidebarUserNav (mounted guard) and SidebarHistoryClient (null SWR key if no user).
  - **useSyncExternalStore for artifactStore**: Fires on every store change — minimal cost when artifact is hidden, but adds overhead when visible.

WASTE:
  - **SidebarUserNav mounted guard**: Renders with empty/default content until `useEffect` fires, then re-renders with full content. This is a necessary hydration safety pattern but causes an extra render cycle.
  - **useScrollToBottom IntersectionObserver**: Created even for new chat with no messages (empty container). The observer watches the sentinel but has nothing to do until messages appear.
  - **Adaptive throttle computation**: `getAdaptiveThrottle()` checks `navigator.connection.effectiveType` — this runs inside `useMemo(getAdaptiveThrottle, [])` so it's computed once, but it's a synchronous check during hydration.

SIMPLIFICATION OPPORTUNITIES:
  - SidebarUserNav's mounted guard could be replaced by using `useId()` or checking for `typeof window !== 'undefined'` in the render function, avoiding the extra re-render cycle.
  - The SessionProvider's promise-handling logic (`isPromiseLike` check + useEffect with cleanup) is complex. Since the server always passes a promise (started in ChatLayout), the non-promise code path (`isPromiseLike === false`) is dead code for the initial render in production.
  - VotesProvider creates a new VotesStore on every mount via `useRef(null)` + `if (storeRef.current === null)`. Since VotesProvider is page-scoped (remounts on navigation), this is fine — but the store initialization could be simplified to `useRef(createVotesStore())`.

EXIT: Fully interactive application with:
  - All event listeners attached (clicks, submits, scroll, keyboard)
  - Session resolved → auth-aware features active
  - SWR initialized with server data → no redundant fetches
  - Artifact store ready to receive stream deltas
  - Settings store accessible for model parameters
  - IntersectionObserver active for scroll detection and infinite scroll
  - Supabase onAuthStateChange listening for cross-tab auth events
  - autoFocus on input textarea → user can type immediately
