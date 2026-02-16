# Phase 4: Hooks - Issues

**Phase Name:** Hooks
**Comparison Scope:** use-artifact, use-chat-visibility, use-messages, use-mobile, use-optimistic-chats, use-scroll-to-bottom, use-window-size
**Date Started:** 2026-02-14
**Date Completed:** 2026-02-14

## Issue Counts

| Category | Count |
|----------|-------|
| UI Inconsistencies | 0 |
| Bugs | 3 |
| Broken Code | 1 |
| Functional Discrepancies | 1 |
| Improvement Only | 4 |
| **Total** | **9** |

### By Severity

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 1 |
| Medium | 2 |
| Low | 0 |

## Table of Contents

- [Issue Counts](#issue-counts)
- [UI Inconsistencies](#ui-inconsistencies)
- [Bugs](#bugs)
- [Broken Code](#broken-code)
- [Functional Discrepancies](#functional-discrepancies)
- [Improvement Only](#improvement-only)

---

## VERIFICATION SUMMARY

| Issue | Status | Timestamp |
|-------|--------|-----------|
| P4-BUG-001 | Verified | 2026-02-16T18:00:00Z |
| P4-BUG-002 | Verified | 2026-02-16T18:00:00Z |
| P4-BUG-003 | Verified | 2026-02-16T18:00:00Z |
| P4-BRK-001 | Defect | 2026-02-16T18:00:00Z |
| P4-FNC-001 | Verified | 2026-02-16T18:00:00Z |
| P4-IMP-001 | Improvement | 2026-02-16T18:00:00Z |
| P4-IMP-002 | Verified (Improvement) | 2026-02-16T12:00:00Z |
| P4-IMP-003 | Verified (Improvement) | 2026-02-16T12:00:00Z |
| P4-IMP-004 | Verified (Improvement) | 2026-02-16T12:00:00Z |

## UI Inconsistencies

*No UI inconsistencies identified in this phase.*

## Bugs

### [P4-BUG-001] Missing Server Persistence in use-chat-visibility

| Field | Value |
|-------|-------|
| **Issue ID** | P4-BUG-001 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/hooks/use-chat-visibility.ts:62-94` |
| **NEW Path** | `hooks/use-chat-visibility.ts:62-82` |

**Description:** The new `useChatVisibility` hook does not persist visibility changes to the server. It has a TODO comment instead of actual server action integration. The old implementation called `updateChatVisibility` server action with proper error handling and rollback.

**Impact:** Visibility changes are NOT persisted to database. Changes only exist in local SWR cache. On page refresh, visibility reverts to server value. No error handling or user feedback on failure.

**Suggested Fix:** 
1. Create `updateChatVisibility` server action in `features/chat/actions/`
2. Import and call the action in `setVisibilityType`
3. Add error handling with rollback
4. Add toast notifications for success/failure

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T18:00:00Z |

**Findings:** Issue accurately describes a real bug. Old `archive/oldapp/hooks/use-chat-visibility.ts:62-94` imports `updateChatVisibility` from `@/app/(chat)/actions` and calls `await updateChatVisibility({ chatId, visibility: updatedVisibilityType })` inside a try/catch block, with rollback on failure (`setLocalVisibility(previousVisibility)`) and `toast.error("Failed to update visibility")`. New `hooks/use-chat-visibility.ts:62-82` has only `console.log(\`Visibility update for chat ${chatId}: ${updatedVisibilityType}\`)` with a TODO comment: "Implement updateChatVisibility action when available". No server action is imported or called. Visibility changes are purely client-side SWR mutations — they will revert on page refresh since the database is never updated. The optimistic update (`setLocalVisibility(updatedVisibilityType)`) and history cache revalidation (`mutate(...)`) work correctly client-side, but without server persistence the feature is broken.

### [P4-BUG-002] Missing Error Handling in use-chat-visibility

| Field | Value |
|-------|-------|
| **Issue ID** | P4-BUG-002 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/hooks/use-chat-visibility.ts:78-93` |
| **NEW Path** | `hooks/use-chat-visibility.ts:62-82` |

**Description:** The new hook lacks error handling, rollback logic, and user feedback that existed in the old implementation.

**Impact:** Users have no indication when visibility updates fail. Silent failures lead to confusion.

**Suggested Fix:** Add try-catch with rollback and toast notifications.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T18:00:00Z |

**Findings:** Issue accurately describes a real difference. Old `archive/oldapp/hooks/use-chat-visibility.ts:78-93` has a complete error handling flow: (1) saves `previousVisibility` before the optimistic update, (2) wraps the server action in `try/catch`, (3) checks `error.name === "AbortError"` to ignore superseded requests, (4) on non-abort errors calls `setLocalVisibility(previousVisibility)` to rollback the optimistic update, (5) calls `toast.error("Failed to update visibility")` for user feedback, (6) cleans up `pendingUpdateRef.current = null` in `finally` block. New `hooks/use-chat-visibility.ts:62-82` has none of this: no `try/catch`, no rollback, no `previousVisibility` save, no toast import, no `finally` cleanup, and no `toast.error`. If the future server action throws, the error will be unhandled and the optimistic UI will show incorrect visibility state with no way to recover. Even though the server action itself is missing (P4-BUG-001), the error handling infrastructure should be in place for when it's added.

### [P4-BUG-003] Missing History Integration in use-chat-visibility

| Field | Value |
|-------|-------|
| **Issue ID** | P4-BUG-003 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/hooks/use-chat-visibility.ts:28-60` |
| **NEW Path** | `hooks/use-chat-visibility.ts:57-60` |

**Description:** The new hook doesn't properly integrate with chat history to sync visibility from cached data. The old implementation used `getChatHistoryPaginationKey` and found the chat in history to get its visibility.

**Impact:** Visibility may not stay in sync with server state when history is revalidated. The local state could diverge from the actual chat visibility.

**Suggested Fix:** Implement proper history integration once ChatHistory type is available, or ensure history API returns visibility for each chat.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T18:00:00Z |

**Findings:** Issue accurately describes a real difference. Old `archive/oldapp/hooks/use-chat-visibility.ts:28-60` uses `useSWRInfinite<ChatHistory>(getChatHistoryPaginationKey, null, ...)` with typed `ChatHistory` generic and the proper pagination key function from `sidebar-history`. The `visibilityType` memo reads the first history page, finds the chat by ID (`history.chats.find((currentChat) => currentChat.id === chatId)`), and returns `chat.visibility` — syncing visibility from the server-cached history data. New `hooks/use-chat-visibility.ts:40-53` uses `useSWRInfinite<unknown>(() => "/api/history", null, ...)` with `unknown` type instead of `ChatHistory`, a hardcoded key function instead of the shared `getChatHistoryPaginationKey`, and the `visibilityType` memo at line 57-60 only returns `localVisibility` with a comment "For now, just use local visibility since we don't have the full history type". The history cache subscription exists in structure but the data is never read. When history is revalidated (e.g., after a fetch or another component mutates the SWR cache), the old hook would pick up the server-confirmed visibility; the new hook ignores it entirely, potentially diverging from the actual persisted state.

## Broken Code

### [P4-BRK-001] Missing Hook - use-optimistic-chats

| Field | Value |
|-------|-------|
| **Issue ID** | P4-BRK-001 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/hooks/use-optimistic-chats.tsx:1-110` |
| **NEW Path** | N/A (file missing) |

**Description:** The entire `useOptimisticChats` hook and `OptimisticChatsProvider` context are missing from the new application. This hook manages optimistic chat creation for immediate sidebar updates before server confirmation.

**Impact:** 
- New chats don't appear in sidebar immediately after creation
- Users must wait for server response and page refresh to see new chats
- Chat title updates from AI responses won't reflect in sidebar
- Significantly degraded UX for chat creation flow

**Suggested Fix:** Create `features/sidebar/hooks/use-optimistic-chats.tsx` with full implementation from old app, including provider and hook. Add `OptimisticChatsProvider` to `app/(chat)/layout.tsx`.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T18:00:00Z |

**Findings:** Confirmed as a defect — the hook and provider are completely absent from the new codebase. The old `archive/oldapp/hooks/use-optimistic-chats.tsx` (110 lines) provides: (1) `OptimisticChatsProvider` context with `useState<OptimisticChat[]>` and `useRef(new Set<string>())` for O(1) duplicate detection, (2) `addOptimisticChat(chatId, initialTitle?)` — adds a chat instantly with `MAX_OPTIMISTIC_CHATS = 50` limit, (3) `updateOptimisticChatTitle(chatId, title)` — updates the title during streaming, (4) `removeOptimisticChat(chatId)` — removes once server persistence confirms. The old `app/(chat)/chat-layout-client.tsx:13,62-63` wraps the entire layout in `<OptimisticChatsProvider>`. Grep search confirmed: no file matching `use-optimistic-chats` exists anywhere outside `archive/`. No `OptimisticChatsProvider` in `app/(chat)/layout.tsx`. The old `sidebar-history.tsx` uses `useOptimisticChats()` to merge optimistic chats into the displayed list. The old `chat.tsx` calls `addOptimisticChat(id)` on mount and `updateOptimisticChatTitle` in `onData`. Without this hook, new chats don't appear in the sidebar until the first server round-trip completes and the list is refetched — a significant UX degradation.

## Functional Discrepancies

### [P4-FNC-001] Metadata Caching Changed in use-artifact

| Field | Value |
|-------|-------|
| **Issue ID** | P4-FNC-001 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/hooks/use-artifact.ts:103-141` |
| **NEW Path** | `features/artifact/hooks/use-artifact.ts:88-98` |

**Description:** The metadata management changed from SWR-based caching to simple useState. The old implementation used SWR with a dynamic key (`artifact-metadata-${documentId}`) which provided automatic caching, revalidation, and cross-component synchronization.

**Impact:**
- Metadata is not cached across component remounts
- Multiple components viewing the same artifact won't share metadata state
- No automatic revalidation or cache invalidation
- Metadata is lost when navigating away and back

**Suggested Fix:** Consider restoring SWR-based metadata caching for better state persistence, or document this as intentional simplification if metadata is always fetched fresh.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T18:00:00Z |

**Findings:** Issue accurately describes a real architectural change. Old `archive/oldapp/hooks/use-artifact.ts:103-141` uses SWR for metadata: `useSWR<ArtifactMetadata>(() => artifact.documentId !== "init" ? \`artifact-metadata-${artifact.documentId}\` : null, null, { fallbackData: null, revalidateOnMount: true })`. This provides: (a) automatic caching keyed by documentId — switching between artifacts preserves metadata, (b) cross-component synchronization — multiple components calling `useSWR` with the same key share state, (c) `setMetadata` wrapped via `useCallback` to match `Dispatch<SetStateAction<ArtifactMetadata>>` pattern expected by artifact definitions, (d) `revalidateOnMount: true` to clear stale data on key change. New `features/artifact/hooks/use-artifact.ts:88-98` uses `const [metadata, setMetadata] = useState<ArtifactMetadata>(null)` with a `useEffect` to clear metadata on documentId change. This means: metadata is NOT cached when switching between artifacts (lost on remount), multiple components cannot share metadata state, and there is no SWR coordination. Given that the artifact plugin system is currently non-functional (P3-BRK-007, P3-BRK-010), the practical impact is minimal now — but this is a documented regression that must be restored when artifact definitions are re-implemented.

## Improvement Only

### [P4-IMP-001] use-messages Functionally Equivalent

| Field | Value |
|-------|-------|
| **Issue ID** | P4-IMP-001 |
| **Location** | `features/chat/hooks/use-messages.ts` |

**Description:** The new `useMessages` hook is functionally equivalent to the old implementation. Both accept `status` from useChat, use `useScrollToBottom` for scroll management, track `hasSentMessage` state, and return the same interface. The new version has enhanced TypeScript types and documentation.

**Status:** Enhancement - No action required.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T18:00:00Z |

**Findings:** Confirmed as functionally equivalent with improvements. Line-by-line comparison of old `archive/oldapp/hooks/use-messages.tsx` (34 lines) and new `features/chat/hooks/use-messages.ts` (106 lines) shows identical logic: (1) both destructure `{ status }` from options, (2) both call `useScrollToBottom()` and destructure the same 6 properties (`containerRef`, `endRef`, `isAtBottom`, `scrollToBottom`, `onViewportEnter`, `onViewportLeave`), (3) both use `useState(false)` for `hasSentMessage`, (4) both use `useEffect` setting `setHasSentMessage(true)` when `status === "submitted"`, (5) both return the same 7-property object. The new version adds: explicit `UseMessagesOptions` and `UseMessagesReturn` TypeScript interfaces (replacing inline types), JSDoc documentation with usage example, and module-level documentation. Import paths differ (`@/lib/types` → `../types`, `./use-scroll-to-bottom` → `./use-scroll-to-bottom`) reflecting the feature-based reorganization. Zero behavioral differences.

### [P4-IMP-002] use-mobile Enhanced

| Field | Value |
|-------|-------|
| **Issue ID** | P4-IMP-002 |
| **Location** | `hooks/use-mobile.ts` |

**Description:** The new `useIsMobile` hook is functionally equivalent to the old implementation. Both use `MOBILE_BREAKPOINT = 768`, accept `initialIsMobile` option for SSR hydration, and return `boolean | undefined`. The new version is **enhanced** with an additional `useDeviceType` hook that provides `isMobile`, `isTablet`, `isDesktop`, and `isReady` flags.

**Status:** Enhancement - No action required.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Verified (Improvement) |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Line-by-line comparison confirms the issue description is accurate. OLD (`archive/oldapp/hooks/use-mobile.ts`) exports only `useIsMobile` with `MOBILE_BREAKPOINT = 768`, `UseMobileOptions` type, `initialIsMobile` SSR option, `matchMedia` listener, and CLS-avoidance logic. NEW (`hooks/use-mobile.ts`) preserves all of this logic identically (same constants, same state init, same effect body, same CLS check) and adds: (1) enhanced TypeScript JSDoc documentation with usage examples, (2) a new `useDeviceType()` hook returning `{ isMobile, isTablet, isDesktop, isReady }` using `MOBILE_BREAKPOINT` (768) and a `1024` tablet breakpoint with resize listener. The core `useIsMobile` hook is functionally identical. The new `useDeviceType` is a pure addition. This is a genuine enhancement with no regressions.

### [P4-IMP-003] use-scroll-to-bottom Functionally Equivalent

| Field | Value |
|-------|-------|
| **Issue ID** | P4-IMP-003 |
| **Location** | `hooks/use-scroll-to-bottom.tsx`, `features/chat/hooks/use-scroll-to-bottom.ts` |

**Description:** The new `useScrollToBottom` hook exists in two locations and is functionally equivalent to the old implementation. All versions use `SCROLL_BOTTOM_THRESHOLD = 100`, use SWR for `scrollBehavior` state, implement `handleScroll` with hydration-safe `mounted` check, use `ResizeObserver` and `MutationObserver` for content change detection, and provide the same interface.

**Status:** Enhancement - No action required.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Verified (Improvement) |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Diff comparison of OLD (`archive/oldapp/hooks/use-scroll-to-bottom.tsx`) vs NEW (`hooks/use-scroll-to-bottom.tsx`) and NEW (`features/chat/hooks/use-scroll-to-bottom.ts`) confirms functional equivalence. All three versions share: `SCROLL_BOTTOM_THRESHOLD = 100`, SWR key `"messages:should-scroll"` with `fallbackData: false`, `mounted` state for hydration safety, identical `handleScroll` logic (`scrollTop + clientHeight >= scrollHeight - threshold`), `ResizeObserver` with single `requestAnimationFrame`, `MutationObserver` with double `requestAnimationFrame`, same `attributeFilter: ["style", "class", "data-state"]`, identical `scrollToBottom` callback, and same `onViewportEnter`/`onViewportLeave` functions. NEW `hooks/use-scroll-to-bottom.tsx` adds a typed `UseScrollToBottomReturn` export and JSDoc. NEW `features/chat/hooks/use-scroll-to-bottom.ts` adds module-level docs and section comments. Both are pure documentation enhancements with zero behavioral changes. The duplicate existence in two locations is noted but not a bug — it follows the feature-based architecture pattern.

### [P4-IMP-004] use-window-size Enhanced

| Field | Value |
|-------|-------|
| **Issue ID** | P4-IMP-004 |
| **Location** | `hooks/use-window-size.ts` |

**Description:** The new `useWindowSize` hook is functionally equivalent to the old implementation. Both use `MOBILE_BREAKPOINT = 768` and `TABLET_BREAKPOINT = 1024`, return `windowSize`, `width`, `height`, `isReady`, `isMobile`, `isTablet`, `isDesktop`, and handle SSR with null/0 defaults. The new version is **enhanced** with two additional hooks: `useWindowWidth()` and `useWindowHeight()`.

**Status:** Enhancement - No action required.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Verified (Improvement) |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Line-by-line comparison of OLD (`archive/oldapp/hooks/use-window-size.ts`) vs NEW (`hooks/use-window-size.ts`) confirms functional equivalence of the core `useWindowSize` hook. Both have identical: `MOBILE_BREAKPOINT = 768`, `TABLET_BREAKPOINT = 1024`, `WindowSize` type `{ width, height }`, initial state `null`/`isReady: false`, `handleResize` reading `window.innerWidth`/`innerHeight`, `width`/`height` fallback to `0`, and identical breakpoint calculations (`isMobile: isReady && width > 0 && width < 768`, `isTablet: isReady && width >= 768 && width < 1024`, `isDesktop: isReady && width >= 1024`). NEW adds: (1) exported `WindowSize` and `UseWindowSizeReturn` types, (2) JSDoc with examples, (3) `useWindowWidth()` hook — a lightweight width-only variant, (4) `useWindowHeight()` hook — a lightweight height-only variant. Both new hooks follow the same SSR-safe pattern. Pure enhancement, zero regressions.
