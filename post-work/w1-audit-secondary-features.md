# Wave 1 — Static Audit: Secondary Features

**Scope:** `features/sidebar`, `features/models`, `features/settings`, `features/visibility`, `features/voting`
**Date:** 2026-03-07
**Status:** Research only — no code changes

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 3 |
| MEDIUM | 5 |
| LOW | 10 |

Overall the secondary features are well-structured with clean separation of concerns, good use of server/client boundaries, proper Zod validation, and thoughtful optimistic update patterns. The most impactful findings center on a sort/group date mismatch in the sidebar, stale client data after bulk deletion, and a double-submit hazard in the rename flow.

---

## Findings

---

### HIGH

```
SEVERITY: [HIGH]
FILE: features/sidebar/components/sidebar-history-client.tsx:56
FINDING: Date grouping uses `createdAt` but server sort order uses `updatedAt`
  - `groupChatsByDate()` reads `new Date(chat.createdAt)` to bucket chats into Today/Yesterday/etc.
  - `lib/data/chat.ts:68` sorts results by `.orderBy(desc(chats.updatedAt), desc(chats.id))`
  - Result: a chat CREATED 5 days ago but UPDATED today appears at the TOP of the list
    (sorted by updatedAt) but gets grouped under "Last 7 Days" (grouped by createdAt).
  - Users see recently-active chats in the wrong date bucket relative to their visual position.
RECOMMENDATION: Change `groupChatsByDate` to use `chat.updatedAt` instead of `chat.createdAt`,
  so grouping matches the server-side sort order. Alternatively, change the server sort to
  `createdAt` if creation date is the intended semantic.
```

```
SEVERITY: [HIGH]
FILE: features/sidebar/components/sidebar-header-actions.tsx:50
FINDING: `deleteAllChats()` does not invalidate client-side SWR cache
  - After `deleteAllChats()` succeeds, only server-side cache is invalidated via
    `invalidateChatList()`, and pending entries are removed.
  - The SWR cache in `useSidebarHistory` is NOT mutated or cleared.
  - `revalidateFirstPage: false` in the SWR config means SWR won't eagerly re-fetch page 0.
  - Stale chat entries remain visible in the sidebar until the user alt-tabs and returns
    (triggering `revalidateOnFocus`). With `router.push("/")`, the layout persists,
    so the sidebar component is never unmounted.
  - `SidebarHeaderActions` has no access to `useSidebarHistory`'s `mutate` function
    (it's in a sibling component `SidebarHistoryClient`).
RECOMMENDATION: Expose the SWR `mutate` callback (or a `clearHistory` function) via shared
  context or a callback prop, and call it after successful bulk deletion. Alternatively,
  use `mutate(() => [{ chats: [], hasMore: false }], { revalidate: true })` from within
  the sidebar after detecting the navigation to `/` post-deletion.
```

```
SEVERITY: [HIGH]
FILE: features/sidebar/components/sidebar-history-item.tsx:80-97
FINDING: Rename double-submit hazard (Enter key + blur)
  - When the user presses Enter in the rename input:
    1. `handleRenameKeyDown` calls `handleRenameSubmit()`
    2. `handleRenameSubmit` calls `setIsRenaming(false)` → input will unmount
    3. Input unmounting fires `onBlur` → calls `handleRenameSubmit()` again
  - The second call may pass the `trimmed === chat.title` guard since the `chat`
    prop still holds the old title (parent hasn't re-rendered with patched data yet).
  - This results in two parallel `renameChat()` server action calls for the same rename.
  - The second call is wasted work; if the first fails and reverts, the second
    may succeed, causing inconsistent state.
RECOMMENDATION: Guard against double execution with a ref flag:
  `const isSubmittingRef = useRef(false)` — check and set at the top of
  `handleRenameSubmit`, clear in the finally block. Or cancel the blur handler
  when Enter triggers the submit.
```

---

### MEDIUM

```
SEVERITY: [MEDIUM]
FILE: app/(chat)/layout.tsx:73-88
FINDING: Double SidebarSkeleton render — two Suspense boundaries both use SidebarSkeleton
  - Outer: `<Suspense fallback={<ChatLayoutFallback>...}>` renders SidebarSkeleton
  - Inner: `<Suspense fallback={<SidebarSkeleton />}>` in ChatLayoutShell also renders SidebarSkeleton
  - Flow: outer SidebarSkeleton appears → outer Suspense resolves (ChatLayoutShell) → 
    inner SidebarSkeleton replaces it → inner Suspense resolves (SidebarShell) → real sidebar
  - DOM is replaced twice. Visually identical but causes a flash as React swaps DOM trees.
  - Also noted in post-work/flows/INDEX.md (Pattern 11: W11).
RECOMMENDATION: Collapse into a single Suspense boundary. Move the `cookies()` read
  for `getSidebarDefaultOpen` into `SidebarShell` itself (already an async component)
  so only one boundary is needed. Or hoist both async operations into one async wrapper.
```

```
SEVERITY: [MEDIUM]
FILE: features/sidebar/hooks/use-sidebar-history.ts:100-109
FINDING: Fragile cursor derivation — client re-derives cursor that server already computes
  - `fallbackData` construction synthesizes `nextCursor` as `lastChat.id` from initial data.
  - `getCachedChats` in sidebar-shell.tsx returns `{ chats, hasMore }` but discards
    `result.nextCursor` from the data layer.
  - The hook is tightly coupled to the assumption that cursor = last chat ID.
  - If `getChatsByUserId` changes cursor format (e.g., composite cursor encoding),
    the client-side derivation silently breaks pagination.
RECOMMENDATION: Have `getCachedChats` pass through `nextCursor` from the data layer
  response, and use it directly in the fallbackData construction instead of re-deriving it.
```

```
SEVERITY: [MEDIUM]
FILE: features/sidebar/hooks/use-sidebar-history.ts:117-128
FINDING: `revalidateFirstPage: false` may cause stale first page after mutations
  - With `revalidateFirstPage: false`, SWR Infinite will NOT revalidate page 0 when
    `mutate()` is called (e.g., from `retry()`). This means the `retry` function
    (`void mutate()`) won't refresh the first page's data.
  - The `patchChat` optimistic mutation also uses `{ revalidate: false }`, which is
    correct for optimistic updates but means the patched data is never reconciled
    with the server until a focus event.
  - Combined with the deleteAllChats issue above, the first page can be stale for
    extended periods.
RECOMMENDATION: Consider `revalidateFirstPage: true` or explicitly pass page indices
  to `mutate()` when full revalidation is needed.
```

```
SEVERITY: [MEDIUM]
FILE: features/sidebar/components/sidebar-history-client.tsx:295,309,380
FINDING: Semantic misuse of `<output>` HTML element
  - Three instances use `<output>` as a generic text container:
    Line 295: `<output>We couldn't load your conversations.</output>`
    Line 309: `<output className="flex w-full ...">Your conversations will appear...</output>`
    Line 380: `<output aria-label="Loading more chats" ...>Loading more chats…</output>`
  - The `<output>` HTML element is semantically for form calculation results, not static text.
  - Screen readers may announce these incorrectly (as form output, not status messages).
RECOMMENDATION: Replace with `<p>`, `<div>`, or `<div role="status">` for loading indicators.
```

```
SEVERITY: [MEDIUM]
FILE: features/sidebar/components/sidebar-user-nav.tsx:46
FINDING: Mounted hydration guard creates unnecessary loading flash
  - `const [mounted, setMounted] = useState(false)` with `useEffect(() => setMounted(true))`
  - Combined with `isLoading` from session: `showSkeleton = !mounted || isLoading`
  - This always shows a skeleton for at least one render cycle after hydration,
    even when session data is already available (passed via SessionProvider).
  - The sidebar shell already awaits `getAppSession()` and resolves user data server-side,
    yet the client component shows a skeleton anyway because `mounted` starts false.
RECOMMENDATION: The mounted guard is needed for theme (client-only), but not for session
  data which is server-resolved. Separate the theme-dependent rendering from the
  auth-dependent rendering so the user avatar/email renders immediately.
```

---

### LOW

```
SEVERITY: [LOW]
FILE: features/sidebar/components/sidebar-history-client.tsx:123
FINDING: `deletedIds` Set grows unbounded within component lifetime
  - `const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set())`
  - Entries are added on delete but never pruned when SWR revalidates and the deleted
    chat is no longer in server data.
  - In a long session with frequent deletions, the Set accumulates stale IDs.
  - The `.filter((chat) => !deletedIds.has(chat.id))` check runs on every render
    against a growing Set.
RECOMMENDATION: Add a cleanup effect that prunes IDs from `deletedIds` when they
  no longer appear in `historyChats`. Or clear the Set after successful SWR revalidation.
```

```
SEVERITY: [LOW]
FILE: features/sidebar/components/sidebar-user-nav.tsx:7
FINDING: Uses `unstable_rethrow` from `next/navigation`
  - The `unstable_` prefix indicates this API may be renamed or removed in future
    Next.js versions without a semver major.
  - Used to re-throw `NEXT_REDIRECT` errors from `logout()`.
RECOMMENDATION: Monitor Next.js changelog for stabilization of this API. Current
  usage is correct and follows Next.js documentation patterns.
```

```
SEVERITY: [LOW]
FILE: features/models/types/model.types.ts:1-8
FINDING: Pure re-export barrel file creates an inconsistent import pattern
  - `features/models/types/model.types.ts` re-exports `ModelMetadata`, `ProviderId`,
    and `MODEL_COOKIE_NAME` from `@/lib/types/model.types`.
  - `model-selector.tsx` imports from the feature barrel (`@/features/models/types/model.types`).
  - `features/models/lib/models.ts` imports directly from `@/lib/types/model.types`.
  - `features/chat/` components also import from `@/lib/types/model.types` directly.
  - The feature-level re-export layer adds indirection but is not consistently followed.
RECOMMENDATION: Either enforce all feature-internal consumers use the barrel, or
  remove it and import from `@/lib/types/model.types` directly everywhere. The
  barrel provides no transformation or extension, just re-exports.
```

```
SEVERITY: [LOW]
FILE: features/settings/hooks/use-settings.ts:135-137
FINDING: `useSettings()` full-snapshot hook is exported but has no consumers
  - `useSettings()` returns the entire `SettingsState` object, causing re-renders
    on ANY setting change — even if the consumer only reads one field.
  - `useSettingsSelector()` and `useSettingsSetter()` are the actual hooks used
    throughout the codebase.
  - `useSettings()` is an attractive nuisance — future developers may use it
    without realizing the re-render implications.
RECOMMENDATION: Either deprecate/remove `useSettings()` and direct consumers to
  `useSettingsSelector()`, or add a JSDoc warning about full-snapshot re-renders.
```

```
SEVERITY: [LOW]
FILE: features/settings/hooks/use-settings.ts:121-128
FINDING: `useSettingsSelector` wraps selector in inline closures for `useSyncExternalStore`
  - `() => selector(settingsStore.getSnapshot())` creates a new closure per render.
  - `useSyncExternalStore` calls getSnapshot on every render and compares with Object.is.
  - For primitive-returning selectors (temperature, topP, booleans), this is fine.
  - For selectors returning objects/arrays, this would cause infinite re-renders.
  - Current usage is all primitives/booleans — safe today, but no guardrail for future use.
RECOMMENDATION: Add a JSDoc note to `useSettingsSelector` warning that selectors must
  return primitive values or memoized references to avoid re-render loops.
```

```
SEVERITY: [LOW]
FILE: features/settings/types/settings.types.ts + features/settings/schemas/settings.schema.ts
FINDING: Settings definition split across three files
  - Canonical interface: `lib/types/settings.types.ts` → `SettingsState`
  - Validation schema: `features/settings/schemas/settings.schema.ts` → `settingsSchema`
  - Default values: `features/settings/types/settings.types.ts` → `DEFAULT_SETTINGS`
  - The schema and type can drift — no compile-time check that `settingsSchema` matches
    `SettingsState` (they're independently defined).
RECOMMENDATION: Derive `SettingsState` from `z.infer<typeof settingsSchema>` to ensure
  the type and schema stay in sync. Or add a type assertion test.
```

```
SEVERITY: [LOW]
FILE: features/voting/components/vote-resolver.tsx:111
FINDING: `useLayoutEffect` in VoteResolver fires synchronously to set votes into store
  - `useLayoutEffect` is correct for preventing visual flicker, but it fires before paint
    and blocks rendering while the store update propagates.
  - With many votes, this could cause a brief jank on initial load.
  - Also: `useLayoutEffect` emits SSR warnings if the component is ever server-rendered
    (currently safe since it's inside `"use client"` + Suspense).
RECOMMENDATION: No action needed now — usage is correct. Monitor if vote counts grow
  large enough to cause measurable paint blocking.
```

```
SEVERITY: [LOW]
FILE: features/voting/components/vote-resolver.tsx:152-164
FINDING: VoteResolver `useEffect` sets votes after paint — brief empty-vote flash
  - `VoteResolver` uses `use()` to resolve the promise, then `useEffect` to set votes.
  - Between the Suspense resolve and useEffect firing, vote buttons render without data.
  - This is by design (chat-first, votes-second pattern) and usually imperceptible.
RECOMMENDATION: No action needed — intentional architectural trade-off documented in code.
```

```
SEVERITY: [LOW]
FILE: features/models/components/model-selector.tsx:120-132
FINDING: Dynamic model progressive rendering re-animates on every dropdown open
  - `dynamicRenderedCount` resets to 0 on close (`handleOpenChange` sets it to 0).
  - Every open triggers the `requestAnimationFrame` chunk loop from the start.
  - For users who frequently open/close the selector, this is wasteful.
RECOMMENDATION: Consider caching the rendered set after first open, or only resetting
  after a configurable staleness timeout. Low priority since the animation is fast.
```

```
SEVERITY: [LOW]
FILE: features/visibility/components/visibility-selector.tsx:13
FINDING: Cross-feature import — visibility feature imports from chat feature
  - `import { useChatSessionContext } from "@/features/chat/hooks/use-chat-session-context"`
  - This creates a direct dependency from `features/visibility` → `features/chat`.
  - The architecture intends features to communicate via shared `lib/` types and providers,
    not via direct cross-feature hook imports.
  - This is the only cross-feature import in the scoped features (sidebar, models, settings,
    visibility, voting all otherwise respect feature boundaries).
  - Documented as acceptable in plan/deviations — VisibilitySelector is always used inside
    a chat context (chat header), so the coupling is structural. However, it prevents
    reuse of VisibilitySelector outside of chat.
RECOMMENDATION: Accept as pragmatic coupling since VisibilitySelector is always chat-contextual.
  If reuse is ever needed, extract visibility state into props instead of context import.
```

---

## Cross-Cutting Observations

### "use client" Usage
All `"use client"` annotations in the scoped features are **justified**:
- Components with useState, useEffect, event handlers → correctly client
- Hooks using SWR, useSyncExternalStore → correctly client
- Server actions correctly use `"use server"` without `"use client"`
- `SidebarSkeleton` and `SidebarShell` correctly remain server components
- No unnecessary `"use client"` on type/schema files

### SWR Configuration
The SWR Infinite setup in `useSidebarHistory` is well-configured:
- `fallbackData` from server prevents redundant first-page fetch
- `revalidateOnMount: !fallbackData` correctly skips mount revalidation
- `revalidateOnFocus: true` ensures freshness on tab return
- Null key pattern for unauthenticated users correctly skips all fetches

### Settings Store Cross-Tab Sync
The `StorageEvent`-based cross-tab sync is well-implemented for normal usage:
- Same-tab updates go through `setState()` → `emitChange()` → subscriber notifications
- Cross-tab updates arrive via `handleStorageEvent` → `syncStoredSettings` → `setState`
- Listener cleanup is lifecycle-aware (only removes when last subscriber leaves)
- Zod validation on every parse prevents corrupt localStorage from crashing the app
- **Subtle edge case:** `updateSettings()` reads from in-memory `state`, not from
  `localStorage.getItem()`. If Tab A and Tab B both call `updateSettings()` near-simultaneously
  with different fields (e.g., Tab A changes temperature, Tab B changes topP), both read the
  same base state and perform `{ ...state, ...patch }`. The last `localStorage.setItem()` wins,
  silently discarding the other tab's change. This is a classic read-modify-write race on shared
  state. In practice this is extremely unlikely (settings changes are rare, manual user actions)
  but worth documenting. A read-from-localStorage-before-merge pattern would eliminate this.

### Voting Optimistic Patterns
The voting system uses React 19 patterns well:
- `useOptimistic` for instant UI updates with automatic rollback on transition failure
- `useSyncExternalStore` in VoteResolver for efficient per-message vote reads
- `use()` for non-blocking promise resolution inside Suspense
- IDOR protection (message-in-chat verification) in the server action

### Naming Consistency
All files follow `kebab-case` for files, `PascalCase` for components, `camelCase` for hooks/functions. Schema files use `.schema.ts` suffix. Type files use `.types.ts` suffix. Action files use verb-first naming. No violations detected.

---

## Priority Fix Order

1. **HIGH — Date grouping mismatch** (sidebar-history-client.tsx:56) — UX bug, easy fix
2. **HIGH — deleteAllChats SWR stale data** (sidebar-header-actions.tsx:50) — UX bug, needs shared mechanism
3. **HIGH — Rename double-submit** (sidebar-history-item.tsx:80) — Race condition, add ref guard
4. **MEDIUM — Double SidebarSkeleton** (layout.tsx) — UX polish, architectural simplification
5. **MEDIUM — `<output>` semantic misuse** (sidebar-history-client.tsx) — Accessibility, trivial fix
6. **MEDIUM — Fragile cursor derivation** (use-sidebar-history.ts) — Maintainability, pass through server cursor
7. **MEDIUM — revalidateFirstPage interaction** (use-sidebar-history.ts) — Data freshness
8. **MEDIUM — Mounted hydration guard flash** (sidebar-user-nav.tsx) — UX polish
