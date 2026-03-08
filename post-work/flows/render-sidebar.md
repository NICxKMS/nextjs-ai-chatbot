FLOW: Sidebar Render
ENTRY: `app/(chat)/layout.tsx` → ChatLayoutShell → SidebarShell (inside Suspense)

STEPS:
  1. `app/(chat)/layout.tsx` (ChatLayout)
     → Outer Suspense: `<Suspense fallback={<ChatLayoutFallback>{children}</ChatLayoutFallback>}>`
       → Wraps `<ChatLayoutShell>{children}</ChatLayoutShell>`
     → ChatLayoutFallback renders immediately with SidebarSkeleton

  2. `SidebarSkeleton` (Sync component — immediate render)
     → Fixed-position div: `inset-y-0 left-0 z-10 w-64`
     → Skeleton structure:
       - Header: brand name skeleton (h-5 w-20) + button skeleton (h-8 w-8)
       - Content: "Today" label + 5 chat item skeletons with staggered widths [44%, 32%, 28%, 64%, 52%]
       - Footer: avatar circle skeleton (size-8) + name skeleton (h-4 w-24)
     → Staggered animation delays: `index * 50ms`
     → Hidden on mobile: `hidden md:flex`

  3. `ChatLayoutShell` (async Server Component — resolves behind outer Suspense)
     → `getSidebarDefaultOpen()`: `const cookieStore = await cookies()` → reads `sidebar_state` cookie
     → Returns `cookieStore.get("sidebar_state")?.value !== "false"` (defaults to true if missing)
     → Renders `ChatLayoutFrame`:
       ```jsx
       <ChatLayoutFrame
         defaultOpen={sidebarOpen}
         sidebar={
           <Suspense fallback={<SidebarSkeleton />}>
             <SidebarShell />
           </Suspense>
         }
       >
         {children}
       </ChatLayoutFrame>
       ```

  4. `ChatLayoutFrame` (Sync component)
     → `<SidebarProvider defaultOpen={defaultOpen}>` — persists sidebar state to cookie + context
     → `{sidebar}` — the SidebarShell or SidebarSkeleton
     → `<SidebarInset>{children}</SidebarInset>` — main content area

  5. `SidebarShell` (async Server Component — resolves behind inner Suspense)
     → `const session = await getAppSession()` — `React.cache` deduped with layout call
     → `const user = session?.user ?? null`
     → If user exists:
       - `getCachedChats(user.id)`:
         - `'use cache'` directive
         - `cacheLife('seconds')` — revalidates after seconds
         - `cacheTag(cacheKeys.chats(userId))` — tag: `chats:{userId}`
         - Calls `getChatsByUserId(userId, { limit: 20 })`:
           - DB query: `SELECT * FROM chats WHERE userId = ? ORDER BY updatedAt DESC LIMIT 21`
           - Returns `{ chats: first_20, hasMore: results.length > 20 }`
     → If no user: `initialChats = [], initialHasMore = false`
     → Renders:
       ```jsx
       <Sidebar className="group-data-[side=left]:border-r-0">
         <SidebarHeader>
           <SidebarMenu>
             <SidebarHeaderActions hasUser={!!user} />
           </SidebarMenu>
         </SidebarHeader>
         <SidebarContent>
           <SidebarHistoryClient initialChats={initialChats} initialHasMore={initialHasMore} />
         </SidebarContent>
         <SidebarFooter>
           <SidebarUserNav user={{ email: user?.email ?? null }} />
         </SidebarFooter>
       </Sidebar>
       ```

  6. `SidebarHeaderActions` (Client Component)
     → Props: `hasUser: boolean`
     → Brand link to "/"
     → Delete-all button (with AlertDialog confirmation) — only if hasUser
     → New Chat button (Link to "/")
     → Uses `useSidebar()` for mobile menu close

  7. `SidebarHistoryClient` (Client Component — main chat list)
     → Props: `initialChats: Chat[], initialHasMore: boolean`
     → `useSidebarHistory({ initialData: { chats: initialChats, hasMore: initialHasMore } })`
       - Uses `useSWRInfinite` with:
         - `fallbackData` from server-provided initial chats (prevents duplicate fetch)
         - `revalidateOnMount: false` when fallbackData exists
         - `revalidateFirstPage: false`
         - `revalidateOnFocus: true, revalidateOnReconnect: true`
         - Key generator: `/api/history?limit=20` (page 0) → `/api/history?limit=20&cursor={lastId}` (page n)
         - Null key when `!session?.user` — skips fetching for unauthenticated users
       - Returns: `{ chats, hasMore, error, loadMore, isLoading, patchChat, retry }`

     → `usePendingChats()` — reads optimistic pending chat entries from PendingChatsProvider

     → Derives merged state:
       a. `rawServerChats`: filter out deleted IDs from SWR history chats
       b. `serverChats`: layer pending metadata (title, visibility) over matching server chats
       c. `visiblePending`: pending entries not yet in server data, not deleted
       d. `groups`: `groupChatsByDate(serverChats)` → Today, Yesterday, Last 7 Days, Last 30 Days, Older
       e. `todayGroup` vs `otherGroups` — pending chats merge into Today section

     → Confirmation marking: useEffect watches rawServerChats → when a pending entry appears
       in server data, `markConfirmed(entry.id)` or `removePending(entry.id)`

     → Infinite scroll: IntersectionObserver on `sentinelRef` with `rootMargin: "200px"`
       - When sentinel is visible → `loadMore()` → `setSize(prev => prev + 1)`

     → Renders:
       - Empty + error state: "We couldn't load your conversations." + Retry button
       - Empty + no loading: "Your conversations will appear here once you start chatting!"
       - Normal state:
         ```
         <SidebarGroup>
           <SidebarMenu>
             {Today section: visiblePending.map(SidebarHistoryItem) + todayGroup.chats.map(SidebarHistoryItem)}
             {otherGroups.map(group => group.chats.map(SidebarHistoryItem))}
             {hasMore && <div ref={sentinelRef} />}  // Infinite scroll sentinel
             {isLoading && <LoaderIcon spinning />}
             {error && retry button}
           </SidebarMenu>
         </SidebarGroup>
         <AlertDialog> // Delete confirmation
         ```

  8. `SidebarHistoryItem` (Client Component — per-chat row)
     → Props: `chat, isActive, onDelete, onRename, onVisibilityChange, setOpenMobile`
     → Renders link to `/chat/{id}` with title, context menu (rename, visibility, delete)

  9. `SidebarUserNav` (Client Component)
     → Props: `user: { email: string | null }`
     → Uses `useSession()` for auth state, `useTheme()` for theme toggle
     → Hydration guard: `mounted` state prevents SSR/client mismatch
     → Renders DropdownMenu:
       - Avatar with email
       - Theme toggle
       - Sign Out (if authenticated) / Sign In (if guest)
     → Uses `logout()` Server Action for sign-out

SUSPENSE BOUNDARIES (sidebar-specific):
  1. OUTER: `ChatLayout → Suspense(ChatLayoutFallback)` wrapping ChatLayoutShell
     → Blocks on: `cookies()` for sidebar_state
     → Fallback: Full layout with SidebarSkeleton + children (page content visible)
  2. INNER: `ChatLayoutShell → Suspense(SidebarSkeleton)` wrapping SidebarShell
     → Blocks on: `getAppSession()` + `getCachedChats()`
     → Fallback: SidebarSkeleton (page content still visible since it's in SidebarInset)

DATA FLOW:
  ```
  Server: getCachedChats(userId) → {chats: Chat[], hasMore: boolean}
    ↓ (SSR props)
  SidebarHistoryClient(initialChats, initialHasMore)
    ↓ (fallbackData)
  useSWRInfinite → no initial fetch (fallbackData provided)
    ↓ (on focus / reconnect)
  GET /api/history?limit=20 → revalidates page 0
    ↓ (infinite scroll)
  GET /api/history?limit=20&cursor={id} → loads page N
  ```

BOTTLENECKS:
  - **Two-layer Suspense waterfall**: Outer Suspense blocks on cookies() → then inner Suspense blocks on getAppSession() + getCachedChats(). These are sequential, not parallel.
  - **getAppSession()** in SidebarShell is the same React.cache-deduped call as the layout — no extra cost, but it cannot start until cookies() in outer layer resolves.
  - **getCachedChats()** DB hit on cold cache — `getChatsByUserId` queries with cursor-based pagination, ordering by updatedAt DESC.
  - **SWR revalidation on focus**: When user returns to tab, SWR fires GET /api/history even if data is seconds old. Could cause flash of stale → fresh content.

WASTE:
  - SidebarSkeleton is rendered TWICE in the normal flow: once in ChatLayoutFallback (outer), once in inner Suspense fallback. The inner one replaces the outer one when ChatLayoutShell resolves but SidebarShell hasn't yet. Users may see skeleton → frame refresh → skeleton → real content.
  - `SidebarUserNav` has a hydration guard (`mounted` state) that renders nothing until useEffect fires — slight flash of empty footer on first paint.
  - The `pendingToChat` adapter function creates a full Chat object from PendingChat, adding placeholder values for `userId: ""`, `updatedAt: createdAt`, `model: null` — these are never read by SidebarHistoryItem but add allocation overhead.

SIMPLIFICATION OPPORTUNITIES:
  - The two-layer Suspense could be collapsed into one if `getSidebarDefaultOpen()` and `SidebarShell` data fetching were combined into a single async function. The outer Suspense only exists because `cookies()` is async — but SidebarShell also reads cookies via `getAppSession()`. One Suspense boundary could serve both.
  - `getCachedChats` creates a new `{ chats, hasMore }` object on every call — since it's behind `'use cache'`, this is fine, but the cacheLife of 'seconds' means frequent re-execution. Could use 'minutes' for less DB pressure.
  - `SidebarHistoryClient.visibilityRequestIdsRef` tracks concurrent visibility change requests per-chat — this is overly defensive for an operation that's infrequent. A simpler "last-write-wins" approach would suffice.

EXIT: Browser displays a fully interactive sidebar with:
  - Header: brand link + new chat button (+ delete-all if authenticated)
  - Chat history: date-grouped list with initial 20 chats from server cache
  - Infinite scroll: loads more pages via /api/history as user scrolls
  - Each item: clickable link, context menu with rename/visibility/delete
  - Footer: user avatar, email, theme toggle, sign out/in
  - Mobile: sidebar hidden by default, toggled via SidebarToggle button
