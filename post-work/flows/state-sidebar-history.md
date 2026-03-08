FLOW: Sidebar History (Server Hydration → SWR Fallback → Infinite Scroll → Refresh)
ENTRY: `SidebarShell` (server component) fetches first page of chats → passes to `SidebarHistoryClient` → `useSidebarHistory` initializes with server data as SWR fallback
STEPS:
  1. `SidebarShell` (server) → `getAppSession()` → `getCachedChats(userId)` with `'use cache'` + `cacheTag(cacheKeys.chats(userId))` + `cacheLife('seconds')` → `getChatsByUserId(userId, { limit: 20 })` → returns `{ chats: Chat[], hasMore: boolean }`
  2. `SidebarShell` → renders `<SidebarHistoryClient initialChats={chats} initialHasMore={hasMore}>`
  3. `SidebarHistoryClient` → calls `useSidebarHistory({ initialData: { chats: initialChats, hasMore: initialHasMore } })`
  4. `useSidebarHistory` → constructs `fallbackData = [{ chats, hasMore, nextCursor: lastChat.id }]` from `options.initialData` — single page in SWR's page array format
  5. `useSWRInfinite<HistoryPage>()` initialized with:
     - Key function: `session?.user ? getKey : () => null` — returns null key when no user (skips all fetches)
     - `getKey(pageIndex, previousPageData)`: page 0 → `/api/history?limit=20`, page N → `/api/history?limit=20&cursor=${prevPage.nextCursor}`, null when `!previousPageData.hasMore`
     - Config: `{ revalidateFirstPage: false, revalidateOnFocus: true, revalidateOnReconnect: true, fallbackData, revalidateOnMount: !fallbackData }`
  6. Initial render: SWR uses `fallbackData` → no network request → `data = [{ chats, hasMore, nextCursor }]` immediately available → `chats = data.flatMap(page => page.chats)` → 20 chats rendered
  7. Focus/reconnect revalidation: SWR revalidates loaded pages (`revalidateFirstPage: false` means only page 0 is checked, but other pages are NOT refreshed unless explicitly done)
  8. Infinite scroll: `SidebarHistoryClient.useEffect` → `IntersectionObserver` on sentinel div → `rootMargin: "200px"` (pre-fetch) → when sentinel enters viewport → `loadMore()` → `if (!isValidating && !error && hasMore) setSize(prev => prev + 1)` → SWR fetches next page
  9. `getKey(pageIndex=1, previousPageData)` → `/api/history?limit=20&cursor=${previousPageData.nextCursor}` → `historyFetcher(url)` → `fetch(url).json()` → returns `{ chats, hasMore, nextCursor }`
  10. SWR appends page to `data` array → `chats = data.flatMap(page => page.chats)` → flat chat array grows → UI re-renders with new chats appended
  11. `patchChat(chatId, patch)` → `mutate(currentPages => pages.map(page => { ...page, chats: page.chats.map(c => c.id === chatId ? { ...c, ...patch } : c) }), { revalidate: false })` → local SWR mutation without network request
  12. `SidebarHistoryClient` → `historyChats` filtered by `deletedIds` → merged with `pendingEntryById` → grouped by date via `groupChatsByDate(serverChats)` → rendered as `SidebarGroup` entries
  13. `isLoadingMore = isLoading || (isValidating && size > (data?.length ?? 0))` — accounts for both initial load and pagination states
BOTTLENECKS:
  - `revalidateFirstPage: false` means stale data can persist after new chats are created by other sessions/tabs — the first page is only refreshed on focus/reconnect. For a single-user scenario this is fine; for shared accounts, chats could be delayed.
  - `data.flatMap(page => page.chats)` recomputes on every render — no memoization, creates a new array reference each time, triggering downstream useMemo recalculations.
  - `IntersectionObserver` is recreated on every `[error, hasMore, loadMore]` change — `loadMore` is a new function on every render (depends on `[error, hasMore, isValidating, setSize]`). This means the observer is disconnected and reconnected frequently during loading states.
  - `groupChatsByDate(serverChats)` runs on every render where `serverChats` changes — for 100+ chats, iterating and classifying by date could be noticeable. It's memoized via `useMemo` so only reruns when `serverChats` reference changes.
WASTE:
  - `fallbackData` construction in `useSidebarHistory` computes `nextCursor` from the last chat's ID — this duplicates cursor logic that the server already knows. If the server returned a cursor with the initial page, this computation would be unnecessary.
  - `historyFetcher` is a bare `fetch` — no deduplication, no abort controller. If `loadMore` is called rapidly (e.g., fast scrolling), multiple concurrent fetches for the same page could be in flight. SWR handles this via key deduplication, but the fetcher itself doesn't cancel.
  - `rawServerChats = historyChats.filter(chat => !deletedIds.has(chat.id))` creates a new array on every render when `historyChats` or `deletedIds` change — for deleted chats, this filter runs on every SWR update even when no chats have been deleted (empty Set).
  - The `retry` callback `() => void mutate()` forces a full revalidation of all loaded pages — if only page 2 failed, pages 0 and 1 are re-fetched unnecessarily.
SIMPLIFICATION OPPORTUNITIES:
  - `loadMore` callback could be stabilized with `useCallback` over a ref to avoid recreating the `IntersectionObserver` on every render. The current dependencies `[error, hasMore, isValidating, setSize]` cause frequent rebuilds.
  - `data.flatMap(page => page.chats)` should be memoized — move to a `useMemo` with `data` as dependency in the hook itself. Currently the consumer `SidebarHistoryClient` must handle this.
  - The `deletedIds` filter and `pendingEntryById` overlay should be a single transform pass instead of two sequential `useMemo` blocks — reduces intermediate array allocations.
  - Consider server-side cursor in initial data to avoid client-side `nextCursor` inference.
EXIT: Sidebar renders a scrollable, date-grouped chat list. Initial 20 chats are server-rendered (no fetch). Subsequent pages load on scroll via SWR infinite. Chats can be locally patched (rename, visibility change), optimistically deleted, and overlaid with pending chat metadata. SWR handles focus/reconnect revalidation.
