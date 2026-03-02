# Phase P5 — Sidebar & Navigation Vertical

> **Updated per redesign audit (2026-03-01)**

> Sidebar phase. Implements the complete sidebar experience: server-rendered shell with
> client pagination, pending chat operations, chat history, user navigation, and chat switching.
>
> **Entry state**: P3 complete — chat core works, messages stream, layout has sidebar stub.
> **Sequencing note**: P5 starts after P3 (no hard P4 dependency). P4 and P5 proceed in parallel; P6 begins when both G04 and G05 pass.
> **Exit state**: Full sidebar navigation works — chat switching, history loading, creation, deletion, rename.
> **Est. duration**: ~4.25 days
> **Tasks**: 12
> **Files created**: ~12

---

## Task Summary

| ID | Title | Type | Complexity | Files |
|----|-------|------|------------|-------|
| P5-T01 | Create sidebar types | IMPL | S | 1 |
| P5-T02 | Create PendingChatsProvider | IMPL | L | 1 |
| P5-T03 | Create useSidebarHistory hook | IMPL | M | 1 |
| P5-T04 | Create SidebarHistoryItem | IMPL | M | 1 |
| P5-T05 | Create SidebarHistoryClient | IMPL | L | 1 |
| P5-T06 | Create SidebarUserNav | IMPL | M | 1 |
| P5-T07 | Create SidebarSkeleton | IMPL | S | 1 |
| P5-T08 | Create SidebarShell (SERVER) | IMPL | L | 1 |
| P5-T09 | Create rename chat action | IMPL | S | 1 |
| P5-T10 | Create history API route | IMPL | M | 1 |
| P5-T11 | Wire sidebar into chat layout | INTEG | L | 1 |
| P5-T12 | Verification gate G05 | VERIFY | S | 0 |

---

## Seam Coverage

| Seam | Description | Task |
|------|-------------|------|
| SEAM-013 | Pending chat creation (optimistic sidebar entries) | P5-T02, P5-T05 |
| SEAM-014 | Title sync (single-channel stream delivery) | P5-T02, P5-T05 |
| SEAM-020 | Sidebar history pagination | P5-T03, P5-T05, P5-T10 |
| SEAM-030 | Theme system (toggle in user nav) | P5-T06 |

---

## Tasks

---

### TASK: [ID: P5-T01]
Title: Create sidebar types
Phase: 5 — Sidebar & Navigation Vertical
Type: IMPL

Behavior ref: state-management.md (pending chats types)
Architecture ref: conventions.md (feature types collocation); redesign (features/sidebar/types/)

Action: Create features/sidebar/types/sidebar.types.ts — Define sidebar-related types: PendingChat (Chat + isPending flag), SidebarHistoryGroup, PendingChatsContextValue (add, remove, updateTitle, markConfirmed operations). Export all types for consumption by sidebar components.

Output files:
- features/sidebar/types/sidebar.types.ts

Inputs: lib/types/pending-chats.types.ts (P0-T07)
Outputs: Sidebar types consumed by all P5 tasks

AI layer handling: NEW

Dependencies: P0-T07
Dependents: P5-T02, P5-T03, P5-T04, P5-T05

Success criteria:
- PendingChat type includes isPending flag
- PendingChatsContextValue defines add, remove, updateTitle, markConfirmed
- All types exported
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P5-T02]
Title: Create PendingChatsProvider
Phase: 5 — Sidebar & Navigation Vertical
Type: IMPL

Behavior ref: state-management.md (pending chats: Set-based dedup, auto-cleanup); redesign (PendingChatsProvider, NOT OptimisticChatsProvider)
Architecture ref: conventions.md (feature hooks collocation); redesign (use-pending-chats.ts)

Action: Create features/sidebar/hooks/use-pending-chats.ts — "use client" context provider + hook. PendingChatsProvider wraps both sidebar AND content (placed in chat layout). Internal state: array of PendingChat, Set<string> for O(1) dedup by chat ID. Operations: add(chat) — add unconfirmed chat to list head (dedup by ID), remove(chatId) — remove by ID (used on delete), updateTitle(chatId, title) — update title in-place (used for streaming title via single-channel delivery), markConfirmed(chatId) — remove pending flag. Auto-cleanup: entries older than 2 minutes auto-removed. Export PendingChatsProvider and usePendingChats hook. Title flows via single channel: `chat-title` stream event → `PendingChats.updateTitle()` — NO window.dispatchEvent, NO polling.

Output files:
- features/sidebar/hooks/use-pending-chats.ts

Inputs: features/sidebar/types/sidebar.types.ts (P5-T01)
Outputs: Pending chats context consumed by SidebarHistoryClient (P5-T05), ChatShell (P5-T11)

AI layer handling: NEW

Dependencies: P0-T07
Dependents: P5-T05, P5-T11, P5-T12

Success criteria:
- add() adds entry with isPending=true
- Duplicate IDs are ignored (Set-based dedup)
- remove() removes by ID
- updateTitle() updates title in-place (single-channel title delivery)
- markConfirmed() removes pending flag
- Auto-cleanup removes entries older than 2 minutes
- Context provides stable dispatch functions (no re-render cascading)
- NO window.dispatchEvent, NO polling for title sync
- Named PendingChatsProvider (NOT OptimisticChatsProvider)
- File named use-pending-chats.ts (NOT use-optimistic-chats.ts)
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P5-T03]
Title: Create useSidebarHistory hook
Phase: 5 — Sidebar & Navigation Vertical
Type: IMPL

Behavior ref: features.md (paginated chat history)
Architecture ref: SEAM-020 (sidebar history pagination); redesign (useSWRInfinite only for pagination, not initial load)

Action: Create features/sidebar/hooks/use-sidebar-history.ts — "use client" hook that wraps `useSWRInfinite` for paginated chat history loading. Used by SidebarHistoryClient for pagination beyond the initial server-fetched data. Key: GET `/api/history?limit=20` for first page, then `/api/history?limit=20&cursor={nextCursor}`. Only used for loading additional pages — initial 20 chats come from server via SidebarShell.

Output files:
- features/sidebar/hooks/use-sidebar-history.ts

Inputs: features/sidebar/types/sidebar.types.ts (P5-T01), swr package
Outputs: useSidebarHistory consumed by SidebarHistoryClient (P5-T05)

AI layer handling: NEW

Dependencies: P5-T01, P2-T06
Dependents: P5-T05

Success criteria:
- Uses useSWRInfinite with pagination
- Only for loading additional pages (not initial load)
- Null key when no authenticated user
- Returns chats, hasMore, loadMore, isLoading
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P5-T04]
Title: Create SidebarHistoryItem component
Phase: 5 — Sidebar & Navigation Vertical
Type: IMPL

Behavior ref: components-02.md (sidebar-history-item.tsx: memo, dropdown actions, visibility)
Architecture ref: interactions.md (sidebar actions: rename, share, delete)

Action: Create features/sidebar/components/sidebar-history-item.tsx — "use client" memo component. Props: chat (Chat), isActive (boolean), onDelete callback, setOpenMobile callback. Renders: SidebarMenuItem → SidebarMenuButton (as Link to /chat/{id}) with chat title text. DropdownMenu trigger (ellipsis icon) with actions: Rename (inline edit or rename-chat action), Share → submenu with Private/Public radio options (using visibility toggle), separator, Delete (destructive style, calls onDelete). Memo: re-renders only on isActive or chat.title change. Active chat highlighted via data-active attribute.

Output files:
- features/sidebar/components/sidebar-history-item.tsx

Inputs: components/ui/sidebar.tsx (P0-T11)
Outputs: SidebarHistoryItem consumed by SidebarHistoryClient (P5-T05)

AI layer handling: NEW

Dependencies: P5-T01
Dependents: P5-T05

Success criteria:
- Renders as link to /chat/{id}
- Active state highlighted
- Dropdown menu with rename, share, and delete actions
- Memo prevents unnecessary re-renders
- Delete calls onDelete callback
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P5-T05]
Title: Create SidebarHistoryClient component
Phase: 5 — Sidebar & Navigation Vertical
Type: IMPL

Behavior ref: features.md (chat history with infinite scroll, date grouping)
Architecture ref: SEAM-020 (sidebar history pagination); redesign (SidebarHistoryClient, NOT SidebarHistory)

Action: Create features/sidebar/components/sidebar-history-client.tsx — "use client" component. Receives initial data from SidebarShell (server-fetched first 20 chats). Uses useSWRInfinite only for pagination beyond initial data. Uses native scrolling with grouped sections (Today, Yesterday, Last 7 days, Last 30 days, Older); virtualization may be added in a future optimization pass if needed. Pending chats from usePendingChats prepended before "Today" group. Infinite scroll: sentinel at bottom triggers loadMore. Delete chat: Server Action delete + pending removal + redirect if active chat. Title update: received via PendingChatsProvider.updateTitle() single-channel delivery (NO window.dispatchEvent, NO polling). AlertDialog for delete confirmation. Active chat highlighted via pathname matching.

Output files:
- features/sidebar/components/sidebar-history-client.tsx

Inputs: features/sidebar/hooks/use-pending-chats.ts (P5-T02), features/sidebar/hooks/use-sidebar-history.ts (P5-T03), features/sidebar/components/sidebar-history-item.tsx (P5-T04), components/ui/ (P0-T11)
Outputs: SidebarHistoryClient consumed by SidebarShell (P5-T08)

AI layer handling: NEW

Dependencies: P5-T02, P5-T03, P5-T04, P0-T11
Dependents: P5-T08, P5-T12

Success criteria:
- Receives initial server-fetched data (no client waterfall for first 20)
- useSWRInfinite used ONLY for pagination (not initial load)
- Date grouping renders correctly (Today, Yesterday, Last 7/30 days, Older)
- Pending chats appear before "Today" group
- Infinite scroll loads more pages on scroll
- Delete removes chat with server action
- Title updates via PendingChatsProvider (NO polling, NO window events)
- Active chat highlighted
- Named SidebarHistoryClient (NOT SidebarHistory)
- File under 400 lines
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P5-T06]
Title: Create SidebarUserNav component
Phase: 5 — Sidebar & Navigation Vertical
Type: IMPL

Behavior ref: components-02.md (sidebar-user-nav.tsx: theme toggle, login/logout, avatar)
Architecture ref: SEAM-030 (theme system — toggle in user nav)

Action: Create features/sidebar/components/sidebar-user-nav.tsx — "use client" component. Props: user: {email?: string | null}. Renders inside SidebarFooter: SidebarMenu → SidebarMenuItem → DropdownMenu. Hydration guard (mounted state, shows skeleton until mounted AND auth resolved). Menu items: theme toggle (dark ↔ light via useTheme from next-themes), separator, auth action (Login link for unauthenticated, "Sign out" for authenticated). Logout flow: sign out → clear caches → redirect /. Avatar: avatar.vercel.sh/{seed} (24×24). Loading state: skeleton avatar + pulsing text + spinner.

Output files:
- features/sidebar/components/sidebar-user-nav.tsx

Inputs: components/ui/sidebar.tsx (P0-T11), features/auth/components/session-provider.tsx (P2-T06 — SessionProvider), next-themes
Outputs: SidebarUserNav consumed by SidebarShell (P5-T08)

AI layer handling: NEW

Dependencies: P2-T04
Dependents: P5-T08

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

### TASK: [ID: P5-T07]
Title: Create SidebarSkeleton loading component
Phase: 5 — Sidebar & Navigation Vertical
Type: IMPL

Behavior ref: components-02.md (sidebar-skeleton.tsx: structure, widths, animation)
Architecture ref: accessibility.md (aria-busy on skeleton sections); redesign (SERVER component, PPR fallback)

Action: Create features/sidebar/components/sidebar-skeleton.tsx — Server-compatible (pure render, NO "use client") component. Matches exact sidebar structure: hidden md:block, w-64, fixed inset-y-0. Skeleton sections: Header (title placeholder + button placeholder), Content ("Today" label + 5 skeleton items with widths [44%, 32%, 28%, 64%, 52%] and staggered animation delay 50ms increments), Footer (avatar circle + name bar). Uses shadcn/ui Skeleton component. Include aria-busy attribute on skeleton sections for accessibility. Used as Suspense fallback for SidebarShell.

Output files:
- features/sidebar/components/sidebar-skeleton.tsx

Inputs: components/ui/skeleton.tsx (P0-T11)
Outputs: SidebarSkeleton consumed by chat layout (P5-T11) as Suspense fallback

AI layer handling: NEW

Dependencies: P0-T11
Dependents: P5-T11

Success criteria:
- Skeleton matches sidebar structure (header, content with 5 items, footer)
- Staggered animation delay on skeleton items
- Hidden on mobile (md:block)
- aria-busy present on loading sections
- Server-component compatible (NO "use client")
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P5-T08]
Title: Create SidebarShell (SERVER component)
Phase: 5 — Sidebar & Navigation Vertical
Type: IMPL

Behavior ref: features.md (server-rendered sidebar); redesign (SidebarShell is async SERVER component)
Architecture ref: redesign (use cache + cacheTag('chats:{userId}'), NOT ssr:false client dynamic import)

Action: Create features/sidebar/components/sidebar-shell.tsx — Async SERVER component (NOT "use client"). Uses `'use cache'` + `cacheTag('chats:{userId}')` for cached data fetching. Fetches initial 20 chats server-side via lib/data/chat.ts. Renders sidebar structure: SidebarHeader with "Assistant" brand text + new chat button, SidebarContent with SidebarHistoryClient (passing server-fetched initial data), SidebarFooter with SidebarUserNav. This eliminates the client waterfall — first 20 chats are available on initial render.

Output files:
- features/sidebar/components/sidebar-shell.tsx

Inputs: lib/data/chat.ts (P1-T06), features/sidebar/components/sidebar-history-client.tsx (P5-T05), features/sidebar/components/sidebar-user-nav.tsx (P5-T06), components/ui/sidebar.tsx (P0-T11)
Outputs: SidebarShell consumed by chat layout (P5-T11)

AI layer handling: NEW

Dependencies: P1-T06, P5-T05, P5-T06, P0-T11, P2-T01
Dependents: P5-T11, P5-T12

Success criteria:
- SidebarShell is a SERVER component (NOT "use client")
- Uses `'use cache'` + `cacheTag('chats:{userId}')` for data fetching
- Initial 20 chats fetched server-side (no client waterfall)
- Passes initial data to SidebarHistoryClient
- SidebarHistoryClient uses useSWRInfinite only for pagination (not initial load)
- Renders header, content, and footer sections
- NOT a dynamic import with ssr:false
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P5-T09]
Title: Create rename chat Server Action
Phase: 5 — Sidebar & Navigation Vertical
Type: IMPL

Behavior ref: interactions.md (rename chat in sidebar)
Architecture ref: conventions.md (Server Actions for mutations); redesign (rename-chat.ts + updateTag)

Action: Create features/sidebar/actions/rename-chat.ts — "use server" action renameChat({chatId, title}). Flow: auth check, validate ownership, update chat title in DB via lib/data/chat.ts, call `updateTag` to invalidate chat and chats-list cache tags. Returns ActionResult<void>. Used by SidebarHistoryItem rename action.

Output files:
- features/sidebar/actions/rename-chat.ts

Inputs: lib/data/chat.ts (P1-T06), lib/cache/revalidate.ts (P1-T03), lib/auth/session.ts (P2-T01)
Outputs: renameChat action consumed by SidebarHistoryItem (P5-T04)

AI layer handling: NEW

Dependencies: P1-T06, P1-T03, P2-T01, P0-T08
Dependents: P5-T04, P5-T12

Success criteria:
- Server Action validates auth and ownership
- Updates chat title in DB
- Calls updateTag to invalidate relevant cache tags
- Returns ActionResult (never throws)
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P5-T10]
Title: Create history API route
Phase: 5 — Sidebar & Navigation Vertical
Type: IMPL

Behavior ref: features.md (GET paginated history); api-contracts.md
Architecture ref: SEAM-020 (sidebar history pagination)

Action: Create app/api/history/route.ts — GET handler: auth check, rate limit, parse pagination params (limit clamped 1-100 default 20, cursor). Chats ordered by createdAt descending. Return { chats, hasMore, nextCursor? }. Error handling via AppError.toResponse().

Output files:
- app/api/history/route.ts

Inputs: lib/data/chat.ts (P1-T06), lib/auth/session.ts (P2-T01)
Outputs: History API consumed by SidebarHistoryClient useSWRInfinite pagination (P5-T05)

AI layer handling: NEW

Dependencies: P1-T06, P2-T01, P0-T08
Dependents: P5-T05, P5-T12

Success criteria:
- GET returns paginated chat list with hasMore flag
- Pagination: limit clamped 1-100, cursor-based
- Auth check present
- Error handling present
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P5-T11]
Title: Wire sidebar into chat layout
Phase: 5 — Sidebar & Navigation Vertical
Type: INTEG

Behavior ref: screens.md (chat layout with sidebar)
Architecture ref: SEAM-029 (provider tree); redesign (PendingChatsProvider wraps both sidebar + content, chat layout is SERVER component)

Action: Update app/(chat)/layout.tsx — Wire the complete sidebar infrastructure into the SERVER layout: (1) Add PendingChatsProvider wrapping both sidebar AND content, (2) Add SidebarProvider (from shadcn/ui) with defaultOpen based on `sidebar:state` cookie, (3) Add Suspense boundary with SidebarSkeleton fallback wrapping SidebarShell (SERVER component, NOT dynamic import with ssr:false), (4) Wrap main content area in SidebarInset. Chat layout remains a SERVER component (no 'use client' on layout). PendingChatsProvider is placed here so it covers both sidebar and chat content areas.

Output files:
- app/(chat)/layout.tsx (modify)

Inputs: features/sidebar/components/sidebar-shell.tsx (P5-T08), features/sidebar/components/sidebar-skeleton.tsx (P5-T07), features/sidebar/hooks/use-pending-chats.ts (P5-T02)
Outputs: Complete sidebar rendered in chat layout

AI layer handling: NEW

Dependencies: P5-T02, P5-T07, P5-T08, P0-T11
Dependents: P5-T12

Success criteria:
- SidebarShell rendered as SERVER component with Suspense fallback (NOT ssr:false dynamic import)
- SidebarSkeleton shows during Suspense loading
- PendingChatsProvider wraps both sidebar AND chat content
- SidebarProvider initialized with `sidebar:state` cookie value
- SidebarInset wraps main content
- Chat layout is a SERVER component (no 'use client' on layout)
- Mobile: sidebar as overlay sheet
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P5-T12]
Title: Verification gate G05
Phase: 5 — Sidebar & Navigation Vertical
Type: VERIFY

Behavior ref: features.md (chat history, sidebar navigation)
Architecture ref: AGENTS.md (post-implementation validation); redesign (P5 exit criteria)

Action: Run complete validation: (1) pnpm typecheck passes, (2) pnpm lint passes, (3) pnpm format passes. Functional verification: (4) Sidebar renders with chat history grouped by date, (5) Infinite scroll loads more pages, (6) New chat creates pending sidebar entry immediately, (7) Title updates stream from AI to sidebar via single-channel delivery, (8) Click chat → navigates to /chat/{id} and loads messages, (9) Delete chat → removal + server delete, (10) Rename chat via Server Action works, (11) New chat button → navigates to /, (12) User nav shows theme toggle and login/logout, (13) Active chat highlighted in sidebar, (14) Mobile: sidebar as overlay sheet.

Output files: none (validation only)

Inputs: all P5-T01 through P5-T11 outputs
Outputs: Gate G05 passed — sidebar prerequisites for P6 satisfied (P6 starts when G04 + G05 are both complete)

AI layer handling: N/A

Dependencies: P5-T01 through P5-T11
Dependents: P6-T01 (start of next phase)

Success criteria:
- pnpm typecheck exits 0
- pnpm lint exits 0
- pnpm format --check exits 0
- `SidebarShell` is a SERVER component with `'use cache'` + `cacheTag`
- Initial 20 chats fetched server-side (no client waterfall)
- `SidebarHistoryClient` uses `useSWRInfinite` only for pagination (not initial load)
- `PendingChatsProvider` provides `add`, `remove`, `updateTitle` operations
- Title flows via single channel: `chat-title` stream → `PendingChats.updateTitle()` (no polling, no window events)
- `SidebarSkeleton` renders as Suspense fallback (SERVER component)
- Chat layout is a SERVER component (no `'use client'` on layout)
- Rename chat action works via Server Action
- Sidebar renders with grouped chat history
- Pending chat creation works on first message
- Chat navigation works (click → load)
- Delete works
- Theme toggle works
- Mobile sidebar overlay works

Complexity: S
