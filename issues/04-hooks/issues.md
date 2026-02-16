# Phase 4: Hooks - Issues

**Phase Name:** Hooks
**Comparison Scope:** use-artifact, use-chat-visibility, use-messages, use-mobile, use-optimistic-chats, use-scroll-to-bottom, use-window-size
**Date Started:** 2026-02-14
**Date Completed:** 2026-02-14

---

## Table of Contents

- [UI Inconsistencies](#ui-inconsistencies)
- [Bugs](#bugs)
- [Broken Code](#broken-code)
- [Functional Discrepancies](#functional-discrepancies)
- [Improvement Only](#improvement-only)
- [Issue Counts](#issue-counts)

---

## UI Inconsistencies

*No UI inconsistencies identified in this phase.*

---

## Bugs

### P4-BUG-001: Missing Server Persistence in use-chat-visibility

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

---

### P4-BUG-002: Missing Error Handling in use-chat-visibility

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

---

### P4-BUG-003: Missing History Integration in use-chat-visibility

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

---

## Broken Code

### P4-BRK-001: Missing Hook - use-optimistic-chats

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

---

## Functional Discrepancies

### P4-FNC-001: Metadata Caching Changed in use-artifact

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

---

## Improvement Only

### P4-IMP-001: use-messages Functionally Equivalent

| Field | Value |
|-------|-------|
| **Issue ID** | P4-IMP-001 |
| **Location** | `features/chat/hooks/use-messages.ts` |

**Description:** The new `useMessages` hook is functionally equivalent to the old implementation. Both accept `status` from useChat, use `useScrollToBottom` for scroll management, track `hasSentMessage` state, and return the same interface. The new version has enhanced TypeScript types and documentation.

**Status:** Enhancement - No action required.

---

### P4-IMP-002: use-mobile Enhanced

| Field | Value |
|-------|-------|
| **Issue ID** | P4-IMP-002 |
| **Location** | `hooks/use-mobile.ts` |

**Description:** The new `useIsMobile` hook is functionally equivalent to the old implementation. Both use `MOBILE_BREAKPOINT = 768`, accept `initialIsMobile` option for SSR hydration, and return `boolean | undefined`. The new version is **enhanced** with an additional `useDeviceType` hook that provides `isMobile`, `isTablet`, `isDesktop`, and `isReady` flags.

**Status:** Enhancement - No action required.

---

### P4-IMP-003: use-scroll-to-bottom Functionally Equivalent

| Field | Value |
|-------|-------|
| **Issue ID** | P4-IMP-003 |
| **Location** | `hooks/use-scroll-to-bottom.tsx`, `features/chat/hooks/use-scroll-to-bottom.ts` |

**Description:** The new `useScrollToBottom` hook exists in two locations and is functionally equivalent to the old implementation. All versions use `SCROLL_BOTTOM_THRESHOLD = 100`, use SWR for `scrollBehavior` state, implement `handleScroll` with hydration-safe `mounted` check, use `ResizeObserver` and `MutationObserver` for content change detection, and provide the same interface.

**Status:** Enhancement - No action required.

---

### P4-IMP-004: use-window-size Enhanced

| Field | Value |
|-------|-------|
| **Issue ID** | P4-IMP-004 |
| **Location** | `hooks/use-window-size.ts` |

**Description:** The new `useWindowSize` hook is functionally equivalent to the old implementation. Both use `MOBILE_BREAKPOINT = 768` and `TABLET_BREAKPOINT = 1024`, return `windowSize`, `width`, `height`, `isReady`, `isMobile`, `isTablet`, `isDesktop`, and handle SSR with null/0 defaults. The new version is **enhanced** with two additional hooks: `useWindowWidth()` and `useWindowHeight()`.

**Status:** Enhancement - No action required.

---

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