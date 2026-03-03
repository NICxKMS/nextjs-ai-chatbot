> **Updated per redesign audit (2026-03-01)**

# Phase 5 — Sidebar & Navigation

> Server-rendered sidebar with `'use cache'`, PendingChatsProvider for optimistic updates, single-channel title delivery, cursor-based pagination.

---

## Objective

Implement the server-rendered sidebar with client pagination: SidebarShell as a SERVER component with `'use cache'` + `cacheTag`, PendingChatsProvider for optimistic chat operations, SidebarHistoryClient with `useSWRInfinite` for pagination only (not initial load), single-channel title delivery via `PendingChats.updateTitle()`, user navigation, chat switching, and history API route.

**Entry state:** P3 complete — chat core works end-to-end, layout has sidebar stub
**Sequencing note:** P4 and P5 execute in parallel; P6 entry requires both G04 and G05.
**Exit state:** Full sidebar navigation works — server-rendered initial load, chat switching, history pagination, creation, deletion, title syncing via single channel
**Est. duration:** ~2 days
**Tasks:** 13

---

## Task Table

| ID | Title | Type | Files Created | Dependencies | Complexity |
|---|---|---|---|---|---|
| P5-T01 | Create sidebar types | IMPL | `features/sidebar/types/sidebar.types.ts` | P0-T07 | S |
| P5-T02 | Create PendingChatsProvider | IMPL | `lib/providers/pending-chats-provider.tsx` (context: `add`, `remove`, `updateTitle`, `markConfirmed`) | P0-T07 | L |
| P5-T03 | Create useSidebarHistory hook | IMPL | `features/sidebar/hooks/use-sidebar-history.ts` (`useSWRInfinite` wrapper) | P5-T01 | M |
| P5-T04 | Create SidebarHistoryItem | IMPL | `features/sidebar/components/sidebar-history-item.tsx` (link + rename + delete dropdown) | P5-T01 | M |
| P5-T05 | Create SidebarHistoryClient | IMPL | `features/sidebar/components/sidebar-history-client.tsx` (initial data from server + SWR pagination + optimistic merge). Note: GroupedVirtuoso virtualization is deferred. Initial implementation uses native scrolling with SWR infinite pagination. Virtualization can be added in a future optimization pass if chat history performance becomes an issue. | P5-T02, P5-T03, P5-T04 | L |
| P5-T06 | Create SidebarUserNav | IMPL | `features/sidebar/components/sidebar-user-nav.tsx` (avatar, theme toggle, logout) | P2-T04 | M |
| P5-T07 | Create SidebarSkeleton | IMPL | `features/sidebar/components/sidebar-skeleton.tsx` (PPR fallback, SERVER) | P0-T11 | S |
| P5-T08 | Create SidebarShell (SERVER) | IMPL | `features/sidebar/components/sidebar-shell.tsx` (async, `'use cache'` + `cacheLife('seconds')` + `cacheTag('chats:{userId}')`, renders structure) | P1-T06, P5-T05, P5-T06 | L |
| P5-T09 | Create rename chat action | IMPL | `features/sidebar/actions/rename-chat.ts` (Server Action + `updateTag`) | P1-T06, P1-T03 | S |
| P5-T10 | Create history API route | IMPL | `app/api/history/route.ts` (GET: cursor-based paginated chat history) | P1-T06 | M |
| P5-T11 | Wire sidebar into chat layout | INTEG | Update `app/(chat)/layout.tsx`: replace stub with `PendingChatsProvider` → `SidebarProvider` → `Suspense` → `SidebarShell` | P5-T08, P5-T02 | L |
| P5-T12 | Verification gate G05 | VERIFY | — | P5-T01..T11, P5-T13 | S |
| P5-T13 | Delete All Chats UI | IMPL | Modifies `sidebar-history-client.tsx` — adds Delete All button + AlertDialog | P5-T05, P3-T22, P0-T11 | S |

---

## Key Changes from Pre-Redesign Plan

| Aspect | Before | After |
|--------|--------|-------|
| Provider name | `OptimisticChatsProvider` | `PendingChatsProvider` (wraps both sidebar + content) |
| Sidebar shell | Client component | **SERVER** component with `'use cache'` + `cacheTag('chats:{userId}')` |
| Initial load | Client-side SWR fetch | Server-fetched first 20 chats (no client waterfall) |
| SWR role | Full data loading + pagination | **Pagination only** (not initial load) |
| Title sync | Stream + poll + `window.dispatchEvent` (3 channels) | **Single channel:** `chat-title` stream → `PendingChats.updateTitle()` (no polling, no window events) |
| Task IDs | P05-T01..T12 (12 tasks) | P5-T01..T12 (12 tasks) |
| Delete API | Included in history route | Moved to Server Action (consistent with mutation policy) |
| Layout composition | `'use client'` layout with providers | **SERVER** layout — `PendingChatsProvider` + `SidebarProvider` as client islands |

---

## Entry/Exit States

| State | Condition |
|-------|-----------|
| Entry | P3 gate passed; chat core functional; layout has sidebar stub |
| Exit | Sidebar loads chat history with server-rendered initial page; chat switching works; pending entries appear instantly; title syncs from single-channel stream; delete removes chats and redirects if active |

---

## Exit Criteria

- [ ] `SidebarShell` is a SERVER component with `'use cache'` + `cacheLife('seconds')` + `cacheTag`
- [ ] Initial 20 chats fetched server-side (no client waterfall)
- [ ] `SidebarHistoryClient` uses `useSWRInfinite` only for pagination (not initial load)
- [ ] `PendingChatsProvider` provides `add`, `remove`, `updateTitle`, `markConfirmed` operations
- [ ] Title flows via single channel: `chat-title` stream → `PendingChats.updateTitle()` (no polling, no window events)
- [ ] `SidebarSkeleton` renders as Suspense fallback
- [ ] Chat layout is a SERVER component (no `'use client'` on layout)
- [ ] `pnpm typecheck && pnpm lint` pass

**Verification:** `pnpm typecheck && pnpm lint && pnpm format`

---

## Integration Verification

- Sidebar loads initial 20 chats server-rendered (no loading flash)
- Infinite scroll loads subsequent pages via `useSWRInfinite`
- Date grouping: Today, Yesterday, Last 7 days, Last 30 days, Older
- Pending entry appears in sidebar before server confirms
- Title updates flow: `chat-title` stream part → `PendingChats.updateTitle()` → sidebar re-renders
- Delete chat removes from list and redirects if active
- Rename chat via Server Action + `updateTag` invalidation
- Mobile: sidebar as overlay sheet

---

## Seams Addressed

| Seam | Description | Task |
|------|-------------|------|
| SEAM-013 | Optimistic chat creation (PendingChatsProvider) | P5-T02, P5-T05 |
| SEAM-014 | Title sync (single-channel stream → PendingChats) | P5-T02, P5-T05 |
| SEAM-020 | Sidebar history pagination (server initial + SWR pagination) | P5-T05, P5-T10 |
| SEAM-030 | Theme system (toggle in user nav) | P5-T06 |
