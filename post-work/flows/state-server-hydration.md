FLOW: Server State → Client Hydration
ENTRY: Next.js App Router renders server components (layout.tsx, page.tsx)
STEPS:
  1. `app/(chat)/layout.tsx` (server) → calls `getAppSession()` (React.cache memoized) → returns `Promise<AppSession | null>` (not awaited — passed as promise to SessionProvider)
  2. `app/(chat)/layout.tsx` → wraps children in `SessionProvider` (session={sessionPromise}), `PendingChatsProvider`, and `Suspense` boundary around `ChatLayoutShell`
  3. `ChatLayoutShell` (async server component) → awaits `getSidebarDefaultOpen()` (reads sidebar_state cookie) + renders `<Suspense fallback={SidebarSkeleton}>` around `SidebarShell`
  4. `SidebarShell` (async server component) → awaits `getAppSession()` (request-cached, shares with layout) → calls `getCachedChats(userId)` with `'use cache'` + `cacheTag` + `cacheLife('seconds')` → returns `{ chats: Chat[], hasMore: boolean }`
  5. `SidebarShell` → passes `initialChats` + `initialHasMore` as props to `SidebarHistoryClient` (client component)
  6. `app/(chat)/chat/[id]/page.tsx` (server) → `getChatPageState(chatId)` (React.cache) → parallel awaits: `getAppSession()` + `getCachedChat(chatId)` with `'use cache'` + visibility check
  7. Page → parallel awaits: `getMessagesForChatRender(chatId)` + `getAvailableModels()` → `convertToUIMessages(dbMessages)` → passes as `initialMessages` to `ChatShell`
  8. Page → starts `votesPromise = getCachedVotes(chatId, userId)` (non-blocking) → renders `<VoteResolver votesPromise={votesPromise}>` inside `Suspense` (streams vote data without blocking chat UI)
  9. Server RSC payload (HTML + flight data) → shipped to client → React hydrates client components
  10. `SessionProvider` (client) → receives `sessionPromise` as prop → initializes `session=null, isLoading=true` → `useEffect` resolves promise → `setSession(resolvedSession), setIsLoading(false)` → context consumers re-render
  11. `SidebarHistoryClient` (client) → passes `initialData` to `useSidebarHistory({ initialData })` → SWR uses it as `fallbackData` with `revalidateOnMount: false` → no redundant first-page fetch
  12. `ChatShell` (client) → passes `initialMessages` to `useChatSession({ initialMessages })` → `useChat({ messages: initialMessages })` hydrates message list without fetch
  13. `VoteResolver` (client, inside Suspense) → `use(votesPromise)` suspends until votes resolve → `setServerVotes(resolvedVotes)` → `useVotes(chatId, serverVotes)` base state updates → `VotesProvider.store.setVotes(votes)` → per-message subscribers re-render
BOTTLENECKS:
  - `getAppSession()` is the critical path — everything depends on user identity. However, it's `React.cache`-memoized so only resolves once per request.
  - `getCachedChat(chatId)` and `getCachedChats(userId)` use `'use cache'` with `cacheLife('seconds')` — cold cache requires full DB roundtrip.
  - `SidebarShell` is behind a Suspense boundary — sidebar loading doesn't block page content, but sidebar data fetch still waterfalls behind `getAppSession()`.
  - `generateMetadata()` also calls `getChatPageState(chatId)` — React.cache ensures deduplication, but metadata resolution is serial with the page.
WASTE:
  - `SessionProvider` initializes with `session=null, isLoading=true` even though the promise was started server-side — causes a brief flash where `isGuest=true` regardless of actual auth state, potentially hiding vote buttons momentarily.
  - `getVisibleChat` runs inline in the page component scope — it's a pure function that doesn't need to be called separately from `getChatPageState`, adding an extra abstraction layer for a simple null/permission check.
  - `convertToUIMessages(dbMessages)` runs on every page render (no cache) — messages are already immutable once written, could be cached with the chat.
SIMPLIFICATION OPPORTUNITIES:
  - The session promise pattern (passing a `Promise<AppSession>` to `SessionProvider` and resolving in `useEffect`) could be replaced by React 19 `use()` for cleaner suspension — eliminate the `isLoading` state entirely.
  - `getChatPageState` wraps `getAppSession()` + `getCachedChat()` + visibility check in a `React.cache` function. Since `getAppSession()` is already `React.cache`-wrapped, the outer cache wrapping adds minimal value for the session part — only the combined result benefits.
  - The `ChatStreamProvider` is rendered in both `NewChatPage` and `ExistingChatPage` as an immediate parent of `ChatShell` — could be lifted to the layout level to avoid re-mounting on navigation between new/existing chat routes.
EXIT: Client-side React tree is fully hydrated with: session context populated, chat messages rendered, sidebar history loaded without duplicate fetch, votes streaming in via Suspense, and all stores (artifact, settings) initialized with default/SSR-safe values.
