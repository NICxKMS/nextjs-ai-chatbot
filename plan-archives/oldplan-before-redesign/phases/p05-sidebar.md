# Phase P05 — Sidebar & Navigation Vertical

> Sidebar phase. Implements the complete sidebar experience: chat history with infinite scroll,
> optimistic updates, date grouping, user navigation, chat switching, and deletion.
>
> **Entry state**: P04 complete — chat + artifacts work, messages stream, documents created.
> **Exit state**: Full sidebar navigation works — chat switching, history loading, creation, deletion.
> **Est. duration**: ~2 days
> **Tasks**: 12
> **Files created**: ~10

---

## Task Summary

| ID | Title | Type | Complexity | Files |
|----|-------|------|------------|-------|
| P05-T01 | Create optimistic chats provider | IMPLEMENTATION | L | 1 |
| P05-T02 | Create sidebar skeleton | IMPLEMENTATION | S | 1 |
| P05-T03 | Create sidebar user nav | IMPLEMENTATION | M | 1 |
| P05-T04 | Create sidebar history item | IMPLEMENTATION | M | 1 |
| P05-T05 | Create sidebar history list | IMPLEMENTATION | L | 1 |
| P05-T06 | Create app sidebar shell | IMPLEMENTATION | M | 1 |
| P05-T07 | Create history API route | IMPLEMENTATION | M | 1 |
| P05-T08 | Wire optimistic chats into chat | INTEGRATION | M | 1 |
| P05-T09 | Wire title sync flow | INTEGRATION | M | 2 |
| P05-T10 | Wire sidebar into chat layout | INTEGRATION | L | 1 |
| P05-T11 | Move sidebar toggle to feature | IMPLEMENTATION | S | 1 |
| P05-T12 | Verification gate G05 | VERIFICATION | S | 0 |

---

## Seam Coverage

| Seam | Description | Task |
|------|-------------|------|
| SEAM-013 | Optimistic chat creation | P05-T01, P05-T08 |
| SEAM-014 | Title sync (stream + poll + event) | P05-T09 |
| SEAM-020 | Sidebar history pagination | P05-T05, P05-T07 |
| SEAM-030 | Theme system (toggle in user nav) | P05-T03 |

---

## Tasks

---

### TASK: [ID: P05-T01]
Title: Create optimistic chats provider
Phase: 5 — Sidebar & Navigation Vertical
Type: IMPLEMENTATION

Behavior ref: state-management.md (OptimisticChatsProvider: Set-based dedup, auto-cleanup); features.md (optimistic sidebar entries)
Architecture ref: DEV-007 (React context, no Jotai); conventions.md (feature hooks collocation)

Action: Create features/sidebar/hooks/use-optimistic-chats.ts — "use client" context provider + hook. OptimisticChatsProvider wraps children with context. Internal state: array of OptimisticChat (Chat + isOptimistic flag), Set<string> for O(1) dedup by chat ID. Operations: addOptimisticChat(chat) — add unconfirmed chat to list head (dedup by ID), removeOptimisticChat(chatId) — remove by ID (used on delete), markChatConfirmed(chatId) — remove optimistic flag, updateOptimisticChat(chatId, updates) — modify title/visibility in-place (used for streaming title). Auto-cleanup: entries older than 2 minutes are auto-removed via interval or cleanup on next operation. Export OptimisticChatsProvider and useOptimisticChats hook.

Output files:
- features/sidebar/hooks/use-optimistic-chats.ts

Inputs: lib/types/models.types.ts (Chat type from P00-T08)
Outputs: Optimistic chats context consumed by sidebar history (P05-T05), chat component (P05-T08)

AI layer handling: NEW

Dependencies: P00-T08
Dependents: P05-T05, P05-T08, P05-T09, P05-T10

Success criteria:
- addOptimisticChat adds entry with isOptimistic=true
- Duplicate IDs are ignored (Set-based dedup)
- removeOptimisticChat removes by ID
- updateOptimisticChat updates title in-place
- Auto-cleanup removes entries older than 2 minutes
- Context provides stable dispatch functions (no re-render cascading)
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P05-T02]
Title: Create sidebar skeleton loading component
Phase: 5 — Sidebar & Navigation Vertical
Type: IMPLEMENTATION

Behavior ref: components-02.md (sidebar-skeleton.tsx: structure, widths, animation)
Architecture ref: accessibility.md (aria-busy on skeleton sections)

Action: Create features/sidebar/components/sidebar-skeleton.tsx — Server-compatible (pure render) component. Matches exact sidebar structure: hidden md:block, w-64, fixed inset-y-0. Skeleton sections: Header (title placeholder + button placeholder), Content ("Today" label + 5 skeleton items with widths [44%, 32%, 28%, 64%, 52%] and staggered animation delay 50ms increments), Footer (avatar circle + name bar). Uses shadcn/ui Skeleton component. Include aria-busy attribute on skeleton sections for accessibility.

Output files:
- features/sidebar/components/sidebar-skeleton.tsx

Inputs: components/ui/skeleton.tsx (P00-T11), components-02.md (spec)
Outputs: SidebarSkeleton consumed by chat layout (P05-T10) as Suspense fallback

AI layer handling: NEW

Dependencies: P00-T11
Dependents: P05-T10

Success criteria:
- Skeleton matches sidebar structure (header, content with 5 items, footer)
- Staggered animation delay on skeleton items
- Hidden on mobile (md:block)
- aria-busy present on loading sections
- Server-component compatible (no "use client")
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P05-T03]
Title: Create sidebar user navigation
Phase: 5 — Sidebar & Navigation Vertical
Type: IMPLEMENTATION

Behavior ref: components-02.md (sidebar-user-nav.tsx: theme toggle, login/logout, avatar)
Architecture ref: SEAM-030 (theme system — toggle in user nav)

Action: Create features/sidebar/components/sidebar-user-nav.tsx — "use client" component. Props: user: {email?: string | null}. Renders inside SidebarFooter: SidebarMenu → SidebarMenuItem → DropdownMenu. Hydration guard (mounted state, shows skeleton until mounted AND auth resolved). Menu items: theme toggle (dark ↔ light via useTheme from next-themes), separator, auth action (Login link for unauthenticated, "Sign out" for authenticated). Logout flow: POST /api/auth/logout → Supabase signOut() → clear SWR history cache → redirect /. Avatar: avatar.vercel.sh/{seed} (24×24). Loading state: skeleton avatar + pulsing text + spinner.

Output files:
- features/sidebar/components/sidebar-user-nav.tsx

Inputs: components/ui/sidebar.tsx (P00-T11), features/auth/components/auth-provider.tsx (P02-T07 — useAuth), next-themes
Outputs: SidebarUserNav consumed by AppSidebar (P05-T06)

AI layer handling: NEW

Dependencies: P00-T11, P02-T07
Dependents: P05-T06

Success criteria:
- Theme toggle switches between dark and light
- Login link shown for unauthenticated users
- Sign out clears session and redirects to /
- Hydration guard prevents mismatch
- Avatar renders from vercel.sh
- Loading state shows skeleton
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P05-T04]
Title: Create sidebar history item component
Phase: 5 — Sidebar & Navigation Vertical
Type: IMPLEMENTATION

Behavior ref: components-02.md (sidebar-history-item.tsx: memo, dropdown actions, visibility)
Architecture ref: interactions.md (sidebar actions: share, delete)

Action: Create features/sidebar/components/sidebar-history-item.tsx — "use client" memo component. Props: chat (Chat), isActive (boolean), onDelete callback, setOpenMobile callback. Renders: SidebarMenuItem → SidebarMenuButton (as Link to /chat/{id}) with chat title text. DropdownMenu trigger (ellipsis icon) with actions: Share → submenu with Private/Public radio options (using useChatVisibility hook), separator, Delete (destructive style, calls onDelete). Memo: re-renders only on isActive or chat.title change. Active chat highlighted via data-active attribute.

Output files:
- features/sidebar/components/sidebar-history-item.tsx

Inputs: components/ui/sidebar.tsx (P00-T11), features/chat/hooks/use-chat-visibility (future P06, stub for now)
Outputs: SidebarHistoryItem consumed by sidebar history list (P05-T05)

AI layer handling: NEW

Dependencies: P00-T11
Dependents: P05-T05

Success criteria:
- Renders as link to /chat/{id}
- Active state highlighted
- Dropdown menu with share (private/public) and delete actions
- Memo prevents unnecessary re-renders
- Delete calls onDelete callback
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P05-T05]
Title: Create sidebar history list with infinite scroll
Phase: 5 — Sidebar & Navigation Vertical
Type: IMPLEMENTATION

Behavior ref: components-02.md (sidebar-history.tsx: GroupedVirtuoso, date grouping, SWR infinite); features.md (chat history)
Architecture ref: SEAM-020 (sidebar history pagination)

Action: Create features/sidebar/components/sidebar-history.tsx — "use client" component. Props: user: {email?: string | null}. Uses useSWRInfinite with GET /api/history?limit=20&offset=X for paginated chat loading. GroupedVirtuoso (react-virtuoso) for virtualized rendering with group headers. Date grouping: Today, Yesterday, Last 7 days, Last 30 days, Older — computed from pre-calculated date boundaries. Optimistic chats from useOptimisticChats prepended as __optimistic__ group before "Today". Infinite scroll: sentinel at bottom triggers setSize(s => s+1). Auth gating: returns null SWR key when no user or isNewSession (skips fetch for new guests). Delete chat: DELETE /api/history/{id} + optimistic SWR removal + redirect if active chat. Title update: listens for 'chat-title-updated' window event → SWR revalidation. AlertDialog for delete confirmation. Active chat highlighted via pathname matching.

Output files:
- features/sidebar/components/sidebar-history.tsx

Inputs: features/sidebar/hooks/use-optimistic-chats.ts (P05-T01), features/sidebar/components/sidebar-history-item.tsx (P05-T04), components/ui/ (P00-T11), react-virtuoso
Outputs: SidebarHistory consumed by AppSidebar (P05-T06)

AI layer handling: NEW

Dependencies: P05-T01, P05-T04, P00-T11
Dependents: P05-T06, P05-T09

Success criteria:
- Chat history loads via SWR infinite with pagination
- Date grouping renders correctly (Today, Yesterday, Last 7/30 days, Older)
- Optimistic chats appear in __optimistic__ group
- Infinite scroll loads more pages on scroll
- Delete removes chat with SWR optimistic mutation
- Title updates trigger revalidation via window event
- Active chat highlighted
- Guest: skips fetch when no session
- File under 400 lines
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P05-T06]
Title: Create app sidebar shell component
Phase: 5 — Sidebar & Navigation Vertical
Type: IMPLEMENTATION

Behavior ref: components-01.md (app-sidebar.tsx: header, content, footer, delete all)
Architecture ref: conventions.md (feature collocation)

Action: Create features/sidebar/components/app-sidebar.tsx — "use client" component. No props. Structure: Sidebar (shadcn primitive) with border-r-0 override. SidebarHeader: "Assistant" brand text + new chat button (router.push("/") + router.refresh()). SidebarContent: SidebarHistory component. SidebarFooter: SidebarUserNav component. AlertDialog for "Delete All" confirmation — on confirm: DELETE /api/history → redirect to / → SWR mutate. Mobile: closes sidebar on navigation. Hooks: useRouter, useSidebar, useSWRConfig, useAuth.

Output files:
- features/sidebar/components/app-sidebar.tsx

Inputs: features/sidebar/components/sidebar-history.tsx (P05-T05), features/sidebar/components/sidebar-user-nav.tsx (P05-T03), components/ui/sidebar.tsx (P00-T11)
Outputs: AppSidebar consumed by chat layout (P05-T10)

AI layer handling: NEW

Dependencies: P05-T03, P05-T05, P00-T11
Dependents: P05-T10

Success criteria:
- Sidebar renders with header (brand + new chat), content (history), footer (user nav)
- New chat button navigates to / with refresh
- Delete all shows confirmation dialog
- Delete all: DELETE /api/history + redirect + SWR mutate
- Mobile: sidebar closes on navigation
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P05-T07]
Title: Create history API route
Phase: 5 — Sidebar & Navigation Vertical
Type: IMPLEMENTATION

Behavior ref: features.md (GET paginated history, DELETE all chats); api-contracts.md
Architecture ref: conventions.md (route handlers); SEAM-020 (sidebar history pagination)

Action: Create app/api/history/route.ts — GET handler: auth check, rate limit, parse pagination params (limit clamped 1-100 default 20, offset). Guest branch: cache ZSET for chat IDs → batch MGET for chat metadata, return {chats, hasMore}. Auth branch: DB query with cursor pagination (startingAfter/endingBefore), return {chats, hasMore}. Chats ordered by createdAt descending. DELETE handler: auth check, strict rate limit (10/min), delete all chats for user via lib/data/chat.ts deleteAllChatsByUserId(). Both handlers use lib/data/chat.ts functions. Error handling via AppError.toResponse().

Output files:
- app/api/history/route.ts

Inputs: lib/data/chat.ts (P01-T07), features/auth/lib/session.ts (P02-T01), lib/api/ (P01-T12), lib/rate-limit/ (P01-T13)
Outputs: History API consumed by SidebarHistory SWR (P05-T05) and delete all (P05-T06)

AI layer handling: NEW

Dependencies: P01-T07, P02-T01, P01-T12, P01-T13
Dependents: P05-T05, P05-T06, P05-T12

Success criteria:
- GET returns paginated chat list with hasMore flag
- Pagination: limit clamped 1-100, offset-based
- Guest: cache-only reads
- Auth: DB cursor pagination
- DELETE removes all user chats with strict rate limit
- Error handling present
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P05-T08]
Title: Wire optimistic chats into chat component
Phase: 5 — Sidebar & Navigation Vertical
Type: INTEGRATION

Behavior ref: state-management.md (first message → addOptimisticChat); interactions.md (send flow step 3)
Architecture ref: SEAM-013 (optimistic chat creation)

Action: Update features/chat/components/chat.tsx — In handleSubmit: if this is the first message (messages.length === 0), call addOptimisticChat({ id: chatId, title: input.slice(0, 50), createdAt: new Date(), visibility: selectedVisibilityType, isOptimistic: true }) from useOptimisticChats context. This creates an immediate sidebar entry before the server creates the chat. On chat deletion from sidebar: removeOptimisticChat(chatId). Import useOptimisticChats from features/sidebar/hooks/.

Output files:
- features/chat/components/chat.tsx (modify)

Inputs: features/sidebar/hooks/use-optimistic-chats.ts (P05-T01), features/chat/components/chat.tsx (P03-T19)
Outputs: Optimistic sidebar entries appear immediately on first message

AI layer handling: NEW

Dependencies: P05-T01, P03-T19
Dependents: P05-T09, P05-T12

Success criteria:
- First message triggers addOptimisticChat with correct data
- Optimistic entry appears in sidebar immediately
- Chat title is first 50 chars of input
- Only triggers on first message (not subsequent messages)
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P05-T09]
Title: Wire title sync flow
Phase: 5 — Sidebar & Navigation Vertical
Type: INTEGRATION

Behavior ref: features.md (title generation + streaming + polling); interactions.md (title update flow)
Architecture ref: SEAM-014 (title sync: stream + poll + event)

Action: Update 2 files. (1) features/chat/components/chat.tsx — In useChat onData handler: when data-chatTitle part received, call updateOptimisticChat(chatId, { title: newTitle }) to update sidebar entry in-place. In onFinish: implement pollForTitle (5 attempts, 500ms interval, GET /api/chat?id={chatId} until title populated), then dispatch window event 'chat-title-updated' with chatId detail. (2) features/sidebar/components/sidebar-history.tsx — Add window event listener for 'chat-title-updated' events → trigger SWR revalidation for the affected page. This ensures the sidebar title updates from three sources: optimistic (immediate), stream (real-time), poll+event (final).

Output files:
- features/chat/components/chat.tsx (modify)
- features/sidebar/components/sidebar-history.tsx (modify)

Inputs: features/chat/components/chat.tsx (P03-T19), features/sidebar/components/sidebar-history.tsx (P05-T05)
Outputs: Title synchronization between chat and sidebar

AI layer handling: NEW

Dependencies: P05-T05, P05-T08
Dependents: P05-T12

Success criteria:
- data-chatTitle stream part updates optimistic chat title immediately
- pollForTitle retries up to 5 times with 500ms interval
- 'chat-title-updated' window event dispatched after poll success
- SidebarHistory listens for event and triggers SWR revalidation
- Title appears in sidebar within seconds of AI generating it
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P05-T10]
Title: Wire sidebar into chat layout
Phase: 5 — Sidebar & Navigation Vertical
Type: INTEGRATION

Behavior ref: screens.md (ChatLayoutClient provider stack with sidebar)
Architecture ref: SEAM-029 (provider tree — chat level with sidebar); SEAM-013 (OptimisticChatsProvider in layout)

Action: Update app/(chat)/chat-layout-client.tsx — Wire the complete sidebar infrastructure: (1) Add OptimisticChatsProvider wrapping content, (2) Add SidebarProvider (from shadcn/ui) with defaultOpen based on sidebar_state cookie, (3) Add Suspense boundary with SidebarSkeleton fallback wrapping dynamic import of AppSidebar (ssr: false), (4) Wrap main content area in SidebarInset. Final provider order in ChatLayoutClient: Script (Pyodide) → SettingsProvider → DataStreamProvider → OptimisticChatsProvider → SidebarProvider → [Suspense→AppSidebar] + [SidebarInset → Suspense → children]. Read sidebar_state from cookies and x-device-type header for initialIsMobile detection.

Output files:
- app/(chat)/chat-layout-client.tsx (modify)

Inputs: features/sidebar/components/app-sidebar.tsx (P05-T06), features/sidebar/components/sidebar-skeleton.tsx (P05-T02), features/sidebar/hooks/use-optimistic-chats.ts (P05-T01)
Outputs: Complete sidebar rendered in chat layout

AI layer handling: NEW

Dependencies: P05-T01, P05-T02, P05-T06, P03-T21
Dependents: P05-T12

Success criteria:
- AppSidebar rendered via dynamic import with Suspense fallback
- SidebarSkeleton shows during loading
- OptimisticChatsProvider wraps sidebar and chat content
- SidebarProvider initialized with sidebar_state cookie value
- SidebarInset wraps main content
- Provider ordering matches screens.md specification
- Mobile: sidebar as overlay sheet
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P05-T11]
Title: Move sidebar toggle to feature module
Phase: 5 — Sidebar & Navigation Vertical
Type: IMPLEMENTATION

Behavior ref: components-02.md (sidebar-toggle.tsx: tooltip, toggleSidebar, hidden on mobile)
Architecture ref: DEV-003 (feature-specific components colocated)

Action: If components/sidebar-toggle.tsx (copied in P00-T13) is only consumed by chat header and sidebar, consider whether it should remain shared or move to features/sidebar/components/sidebar-toggle.tsx. Evaluate usage: chat-header.tsx imports it, app-sidebar.tsx may use it. If 2+ consumers in different features, keep shared. If only sidebar feature, move to feature. Either way, ensure the component: wraps Button (outline variant) with Tooltip ("Toggle Sidebar"), calls toggleSidebar() from useSidebar hook, has className="hidden md:block" (hidden on mobile where sidebar is sheet overlay). Update imports as needed.

Output files:
- components/sidebar-toggle.tsx or features/sidebar/components/sidebar-toggle.tsx

Inputs: components/sidebar-toggle.tsx (P00-T13), components-02.md
Outputs: SidebarToggle consumed by ChatHeader and potentially AppSidebar

AI layer handling: COPY_CONTENT

Dependencies: P00-T13
Dependents: P05-T12

Success criteria:
- SidebarToggle renders button with tooltip
- Calls toggleSidebar() on click
- Hidden on mobile (md:block or similar)
- Import path consistent across all consumers
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P05-T12]
Title: Verification gate G05
Phase: 5 — Sidebar & Navigation Vertical
Type: VERIFICATION

Behavior ref: features.md (chat history, sidebar navigation)
Architecture ref: AGENTS.md (post-implementation validation)

Action: Run complete validation: (1) pnpm typecheck passes, (2) pnpm lint passes, (3) pnpm format passes. Functional verification: (4) Sidebar renders with chat history grouped by date, (5) Infinite scroll loads more pages, (6) New chat creates optimistic sidebar entry immediately, (7) Title updates stream from AI to sidebar, (8) Click chat → navigates to /chat/{id} and loads messages, (9) Delete chat → optimistic removal + server delete, (10) Delete all → redirect to / + clear history, (11) New chat button → navigates to /, (12) User nav shows theme toggle and login/logout, (13) Guest: sidebar shows cache-only chats, (14) Auth: sidebar shows DB-backed chats with pagination, (15) Active chat highlighted in sidebar, (16) Mobile: sidebar as overlay sheet.

Output files: none (validation only)

Inputs: all P05-T01 through P05-T11 outputs
Outputs: Gate G05 passed — P06 (enhancements) can begin

AI layer handling: N/A

Dependencies: P05-T01 through P05-T11
Dependents: P06-T01 (start of next phase)

Success criteria:
- pnpm typecheck exits 0
- pnpm lint exits 0
- pnpm format --check exits 0
- Sidebar renders with grouped chat history
- Optimistic chat creation works on first message
- Title sync works (stream → sidebar update)
- Chat navigation works (click → load)
- Delete (single + all) works
- Theme toggle works
- Mobile sidebar overlay works

Complexity: S
