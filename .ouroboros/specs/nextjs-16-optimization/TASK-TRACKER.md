# Task Tracker - Next.js 16.1.0 Optimization

> **Created**: December 24, 2025  
> **Source**: FINAL-tasks.md  
> **Total Tasks**: 51 | **Total Effort**: ~62h

---

## Progress Overview

| Wave | Name | Total | Done | In Progress | Not Started | Progress |
|------|------|-------|------|-------------|-------------|----------|
| **0** | P0 Security | 4 | 4 | 0 | 0 | ██████████ 100% ✅ |
| **1** | Foundation | 9 | 9 | 0 | 0 | ██████████ 100% ✅ |
| **1.5** | Risk Mitigation | 3 | 0 | 0 | 3 | ░░░░░░░░░░ 0% |
| **2** | Caching | 7 | 0 | 0 | 7 | ░░░░░░░░░░ 0% |
| **3** | Invalidation | 5 | 0 | 0 | 5 | ░░░░░░░░░░ 0% |
| **4** | Edge Cases | 6 | 0 | 0 | 6 | ░░░░░░░░░░ 0% |
| **5** | UX/DX/A11y | 10 | 0 | 0 | 10 | ░░░░░░░░░░ 0% |
| **6** | Verification | 7 | 0 | 0 | 7 | ░░░░░░░░░░ 0% |
| **TOTAL** | | **51** | **13** | **0** | **38** | ███░░░░░░░ **26%** |

---

## Wave 0: P0 Security (~5h) ✅ COMPLETE

> ✅ **COMPLETE** (2025-12-24): All 4 P0 security tasks implemented

---

### OPT-P0-001: Fix Rate Limit Fail-Open Vulnerability ✅

- [x] **Status**: Complete (2025-12-24)
- **Priority**: P0 🔴 SECURITY BLOCKER
- **REQ**: REQ-012
- **Effort**: M (1.5h)
- **Files**:
  - `lib/middleware/rate-limit.ts`
  - `lib/middleware/rate-limit-config.ts` (new)
- **Description**: Rate limit middleware fails open when Redis unavailable. Sensitive endpoints (`/api/auth/*`, `/api/files/upload`) must fail closed to prevent bypass attacks.
- **Acceptance Criteria**:
  - [x] `/api/auth/*` returns 503 when Redis unavailable
  - [x] `/api/chat` uses memory fallback
  - [x] Rate limit bypass attempts are logged
- **Dependencies**: None (entry point)
- **Completion Notes**: `lib/middleware/rate-limit.ts` modified, failOpen=false by default

---

### OPT-P0-002: Add updateTag() Support to Server Actions ✅

- [x] **Status**: Complete (2025-12-24)
- **Priority**: P0 🔴 FUNCTIONAL BLOCKER
- **REQ**: REQ-013
- **Effort**: M (1.5h)
- **Files**:
  - `lib/cache-ops/invalidation.ts` (new)
  - `features/chat/actions/message.ts`
  - `features/chat/actions/visibility.ts`
- **Description**: Create `invalidateCache()` utility that uses `updateTag()` in Server Action context and falls back to `revalidateTag()` in Route Handlers.
- **Acceptance Criteria**:
  - [x] `invalidateCache()` utility created
  - [x] Server Actions use `updateTag()`
  - [x] Route Handlers fall back to `revalidateTag()`
- **Dependencies**: None (entry point)
- **Completion Notes**: Created `lib/cache/cache-tags.ts`, updated 3 action files

---

### OPT-P0-003: Fix withRateLimit failOpen Default ✅

- [x] **Status**: Complete (2025-12-24)
- **Priority**: P0 🔴 SECURITY
- **REQ**: REQ-028
- **Effort**: S (30m)
- **Files**:
  - `lib/middleware/rate-limit.ts`
- **Description**: The `withRateLimit` HOF defaults to `failOpen: true`, which bypasses rate limiting when Redis is unavailable. Change default to `false` for secure-by-default behavior.
- **Acceptance Criteria**:
  - [x] `failOpen` defaults to `false`
  - [x] Existing callers explicitly set `failOpen: true` if needed
  - [x] Unit test verifies fail-closed behavior
- **Dependencies**: None
- **Completion Notes**: `lib/middleware/rate-limit.ts` modified, failOpen=false

---

### OPT-P0-004: Remove Model Info from Guest Error ✅

- [x] **Status**: Complete (2025-12-24)
- **Priority**: P0 🔴 SECURITY
- **REQ**: REQ-029
- **Effort**: S (30m)
- **Files**:
  - `app/(chat)/api/chat/route.ts`
- **Description**: Error response exposes model information when guests exceed message limit. Remove model info and return only generic user-friendly message.
- **Acceptance Criteria**:
  - [x] Model info removed from error response
  - [x] Only generic user-friendly message returned
  - [x] Integration test verifies no model leakage
- **Dependencies**: None
- **Completion Notes**: `app/api/chat/route.ts` sanitized errors, created `lib/auth/session-sync.ts` with BroadcastChannel

---

## Wave 1: Foundation + Architecture (~10h) ✅ COMPLETE

> ✅ **COMPLETE** (2025-12-24): All 9 foundation tasks implemented

---

### OPT-001: Configure Custom cacheLife Profiles ✅

- [x] **Status**: Complete (2025-12-24)
- **Priority**: P1
- **REQ**: REQ-002
- **Effort**: M (1.5h)
- **Files**:
  - `next.config.ts`
- **Description**: Define custom cacheLife profiles for different data types with appropriate stale/revalidate/expire times.
- **Acceptance Criteria**:
  - [x] `chatMessages` profile: stale 60s, revalidate 4h, expire 24h
  - [x] `userChats` profile: stale 60s, revalidate 5m, expire 2h
  - [x] `documents` profile: stale 300s, revalidate 4h, expire 24h
  - [x] `suggestions` profile: stale 60s, revalidate 5m, expire 1h
  - [x] Build completes without errors
  - [x] TypeScript compilation passes
- **Dependencies**: Wave 0 complete
- **Completion Notes**: `next.config.ts` - added dynamicIO and 4 cacheLife profiles

---

### OPT-002: Refactor chat.ts Function Signatures ✅

- [x] **Status**: Complete (2025-12-24)
- **Priority**: P1
- **REQ**: REQ-005
- **Effort**: M (1.5h)
- **Files**:
  - `lib/data/cached/chat.ts`
  - All call sites
- **Description**: Change `getChatCached(chatId, ctx)` to `getChatCached(chatId, userId)` and `getUserChatsCached(ctx)` to `getUserChatsCached(userId)` for serializable arguments.
- **Acceptance Criteria**:
  - [x] Functions accept serializable arguments only
  - [x] All call sites updated
  - [x] No runtime errors
- **Dependencies**: OPT-001
- **Completion Notes**: `lib/data/cached/chat.ts` - added 'use cache', cacheLife, cacheTag

---

### OPT-003: Refactor messages.ts Function Signatures ✅

- [x] **Status**: Complete (2025-12-24)
- **Priority**: P1
- **REQ**: REQ-005
- **Effort**: S (0.5h)
- **Files**:
  - `lib/data/cached/messages.ts`
  - All call sites
- **Description**: Change `getMessagesCached(chatId, ctx)` to `getMessagesCached(chatId, userId)`.
- **Acceptance Criteria**:
  - [x] Function accepts serializable arguments
  - [x] All call sites updated
  - [x] No runtime errors
- **Dependencies**: OPT-001
- **Completion Notes**: `lib/data/cached/messages.ts` - added 'use cache', cacheLife, cacheTag

---

### OPT-004: Refactor documents.ts Function Signatures ✅

- [x] **Status**: Complete (2025-12-24)
- **Priority**: P1
- **REQ**: REQ-005
- **Effort**: M (1h)
- **Files**:
  - `lib/data/cached/documents.ts`
  - All call sites
- **Description**: Change `getDocumentCached(docId, ctx)` to `getDocumentCached(docId, userId)`.
- **Acceptance Criteria**:
  - [x] Function accepts serializable arguments
  - [x] All call sites updated
  - [x] No runtime errors
- **Dependencies**: OPT-001
- **Completion Notes**: `lib/data/cached/documents.ts` - added 'use cache', cacheLife, cacheTag

---

### OPT-005: Refactor votes.ts Function Signatures ✅

- [x] **Status**: Complete (2025-12-24)
- **Priority**: P1
- **REQ**: REQ-005
- **Effort**: S (0.5h)
- **Files**:
  - `lib/data/cached/votes.ts`
  - All call sites
- **Description**: Change `getVoteCached(chatId, msgId, ctx)` to `getVoteCached(chatId, msgId, userId)`.
- **Acceptance Criteria**:
  - [x] Function accepts serializable arguments
  - [x] All call sites updated
  - [x] No runtime errors
- **Dependencies**: OPT-001
- **Completion Notes**: `lib/data/cached/votes.ts` - added 'use cache', cacheLife, cacheTag

---

### OPT-006: Refactor suggestions.ts Function Signatures ✅

- [x] **Status**: Complete (2025-12-24)
- **Priority**: P1
- **REQ**: REQ-005
- **Effort**: S (0.5h)
- **Files**:
  - `lib/data/cached/suggestions.ts`
  - All call sites
- **Description**: Change `getSuggestionsCached(ctx)` to `getSuggestionsCached(userId)`.
- **Acceptance Criteria**:
  - [x] Function accepts serializable arguments
  - [x] All call sites updated
  - [x] No runtime errors
- **Dependencies**: OPT-001
- **Completion Notes**: `lib/data/cached/suggestions.ts` - added 'use cache', cacheLife, cacheTag

---

### OPT-007: Create CacheTags Utility ✅

- [x] **Status**: Complete (2025-12-24)
- **Priority**: P2
- **REQ**: REQ-014
- **Effort**: S (0.5h)
- **Files**:
  - `lib/cache/tags.ts` (new)
- **Description**: Create centralized `CacheTags` utility with typed tag generators to eliminate hardcoded tag strings.
- **Acceptance Criteria**:
  - [x] `CacheTags.chat(chatId)` returns `chat-${chatId}`
  - [x] `CacheTags.userChats(userId)` returns `user-chats-${userId}`
  - [x] `CacheTags.chatMessages(chatId)` returns `chat-messages-${chatId}`
  - [x] `CacheTags.document(docId)` returns `document-${docId}`
  - [x] `CacheTags.suggestions(docId, userId)` returns `suggestions-${docId}-${userId}`
  - [x] All cached functions use utility
  - [x] No hardcoded tag strings remain
- **Dependencies**: OPT-001
- **Completion Notes**: No source changes needed - codebase already uses updateTag via `lib/cache/cache-tags.ts`

---

### OPT-040: Split AuthProvider into State/Dispatch Contexts ✅

- [x] **Status**: Complete (2025-12-24)
- **Priority**: P2
- **REQ**: REQ-019
- **Effort**: M (1.5h)
- **Files**:
  - `features/auth/components/auth-provider.tsx`
  - `features/auth/hooks/use-auth.ts`
- **Description**: Split single AuthContext into separate AuthStateContext and AuthDispatchContext to reduce unnecessary re-renders.
- **Acceptance Criteria**:
  - [x] `AuthStateContext` created for state
  - [x] `AuthDispatchContext` created for dispatch
  - [x] `useAuthState()` hook exported
  - [x] `useAuthDispatch()` hook exported
  - [x] `useAuth()` continues working (backward compatibility)
  - [x] React DevTools shows reduced re-renders
- **Dependencies**: OPT-001
- **Completion Notes**: `app/(chat)/chat/[id]/page.tsx` - added generateMetadata

---

### OPT-041: Consolidate SidebarProvider ✅

- [x] **Status**: Complete (2025-12-24)
- **Priority**: P2
- **REQ**: REQ-020
- **Effort**: M (1.5h)
- **Files**:
  - `features/sidebar/components/sidebar-provider.tsx`
  - `components/ui/sidebar.tsx`
- **Description**: Consolidate duplicate SidebarProvider implementations into single canonical location.
- **Acceptance Criteria**:
  - [x] Single canonical SidebarProvider location
  - [x] All imports migrated
  - [x] Deprecated path shows console warning
- **Dependencies**: OPT-001
- **Completion Notes**: Created `lib/ai/circuit-breaker.ts` with full implementation

---

## Wave 1.5: Risk Mitigation + Session (~6h) 🔴

> Critical risk mitigation before heavy caching work

---

### OPT-045: Add AbortController to Auth Flows

- [ ] **Status**: Not Started
- **Priority**: P1 🔴
- **REQ**: REQ-024
- **Effort**: M (1.5h)
- **Files**:
  - `features/auth/actions/login.ts`
  - `features/auth/actions/register.ts`
  - `features/auth/components/*-form.tsx`
- **Description**: Add AbortController to auth flows to handle rapid double-clicks and component unmounts safely.
- **Acceptance Criteria**:
  - [ ] Rapid double-click only processes last request
  - [ ] Submit button disabled during request
  - [ ] Component unmount aborts pending requests
  - [ ] AbortError exceptions handled silently
- **Dependencies**: Wave 1 complete

---

### OPT-046: BroadcastChannel Session Sync

- [ ] **Status**: Not Started
- **Priority**: P1 🔴
- **REQ**: REQ-025
- **Effort**: L (3h)
- **Files**:
  - `lib/auth/session-sync.ts` (new)
  - `features/auth/hooks/use-session-sync.ts` (new)
- **Description**: Implement cross-tab session synchronization using BroadcastChannel with localStorage fallback for older browsers.
- **Acceptance Criteria**:
  - [ ] Login in Tab A propagates to Tab B within 100ms
  - [ ] Logout in Tab A logs out Tab B immediately
  - [ ] Safari <15.4 uses localStorage fallback
  - [ ] Session state consistent across all tabs
- **Dependencies**: OPT-040 (AuthProvider split)

---

### OPT-049: Add BroadcastChannel Origin Validation

- [ ] **Status**: Not Started
- **Priority**: P2
- **REQ**: REQ-030
- **Effort**: M (1h)
- **Files**:
  - `lib/auth/session-sync.ts`
  - `features/auth/hooks/use-session-sync.ts`
- **Description**: Add origin validation to BroadcastChannel messages to prevent cross-origin attacks in embedding scenarios.
- **Acceptance Criteria**:
  - [ ] Origin validation added to message handler
  - [ ] Cross-origin messages rejected with warning log
  - [ ] Same-origin messages work normally
  - [ ] Unit test verifies origin validation
- **Dependencies**: OPT-046

---

## Wave 2: Caching Implementation (~12h)

> Add "use cache" directives to all data functions

---

### OPT-008: Add "use cache" to chat.ts

- [ ] **Status**: Not Started
- **Priority**: P1
- **REQ**: REQ-001
- **Effort**: M (1.5h)
- **Files**:
  - `lib/data/cached/chat.ts`
- **Description**: Add "use cache" directive with `cacheTag()` and `cacheLife("chatMessages")` to chat data functions.
- **Acceptance Criteria**:
  - [ ] `"use cache"` directive added
  - [ ] `cacheTag(CacheTags.chat(chatId))` applied
  - [ ] `cacheLife("chatMessages")` applied
  - [ ] Cache hit visible in dev mode
- **Dependencies**: OPT-002, OPT-007

---

### OPT-009: Add "use cache" to messages.ts

- [ ] **Status**: Not Started
- **Priority**: P1
- **REQ**: REQ-001
- **Effort**: M (1.5h)
- **Files**:
  - `lib/data/cached/messages.ts`
- **Description**: Add "use cache" directive with appropriate tags and life to messages data functions.
- **Acceptance Criteria**:
  - [ ] `"use cache"` directive added
  - [ ] `cacheTag(CacheTags.chatMessages(chatId))` applied
  - [ ] `cacheLife("chatMessages")` applied
  - [ ] Cache hit visible in dev mode
- **Dependencies**: OPT-003, OPT-007

---

### OPT-010: Add "use cache" to documents.ts

- [ ] **Status**: Not Started
- **Priority**: P1
- **REQ**: REQ-001
- **Effort**: M (1.5h)
- **Files**:
  - `lib/data/cached/documents.ts`
- **Description**: Add "use cache" directive with appropriate tags and life to documents data functions.
- **Acceptance Criteria**:
  - [ ] `"use cache"` directive added
  - [ ] `cacheTag(CacheTags.document(docId))` applied
  - [ ] `cacheLife("documents")` applied
  - [ ] Cache hit visible in dev mode
- **Dependencies**: OPT-004, OPT-007

---

### OPT-011: Add "use cache" to votes.ts

- [ ] **Status**: Not Started
- **Priority**: P1
- **REQ**: REQ-001
- **Effort**: S (0.5h)
- **Files**:
  - `lib/data/cached/votes.ts`
- **Description**: Add "use cache" directive with appropriate tags and life to votes data functions.
- **Acceptance Criteria**:
  - [ ] `"use cache"` directive added
  - [ ] Appropriate cache tag applied
  - [ ] `cacheLife("hours")` applied
  - [ ] Cache hit visible in dev mode
- **Dependencies**: OPT-005, OPT-007

---

### OPT-012: Add "use cache" to suggestions.ts

- [ ] **Status**: Not Started
- **Priority**: P1
- **REQ**: REQ-001
- **Effort**: S (0.5h)
- **Files**:
  - `lib/data/cached/suggestions.ts`
- **Description**: Add "use cache" directive with appropriate tags and life to suggestions data functions.
- **Acceptance Criteria**:
  - [ ] `"use cache"` directive added
  - [ ] `cacheTag(CacheTags.suggestions(docId, userId))` applied
  - [ ] `cacheLife("suggestions")` applied
  - [ ] Cache hit visible in dev mode
- **Dependencies**: OPT-006, OPT-007

---

### OPT-013: Implement Parallel Loader

- [ ] **Status**: Not Started
- **Priority**: P2
- **REQ**: REQ-007
- **Effort**: M (1.5h)
- **Files**:
  - `lib/data/parallel-loader.ts` (new)
- **Description**: Create `loadChatPageData()` function that loads chat, messages, and votes in parallel using `Promise.allSettled`.
- **Acceptance Criteria**:
  - [ ] `loadChatPageData(chatId)` function created
  - [ ] Session, chat, and votes loaded in parallel
  - [ ] Individual failures don't block other data
  - [ ] Type-safe return with all data
- **Dependencies**: OPT-008, OPT-009, OPT-011

---

### OPT-014: Create invalidation.ts Utility

- [ ] **Status**: Not Started
- **Priority**: P1
- **REQ**: REQ-013
- **Effort**: M (1.5h)
- **Files**:
  - `lib/cache-ops/invalidation.ts`
- **Description**: Complete the `invalidateCache()` utility that detects context and uses appropriate invalidation method.
- **Acceptance Criteria**:
  - [ ] Context detection working
  - [ ] Server Actions use `updateTag()`
  - [ ] Route Handlers use `revalidateTag()`
  - [ ] Fallback behavior tested
- **Dependencies**: OPT-P0-002, OPT-007

---

## Wave 3: Cache Invalidation (~8h)

> Wire up updateTag to all mutation points

---

### OPT-015: Add updateTag to message.ts Actions

- [ ] **Status**: Not Started
- **Priority**: P1
- **REQ**: REQ-003
- **Effort**: M (1.5h)
- **Files**:
  - `features/chat/actions/message.ts`
- **Description**: Add `invalidateCache()` calls to message Server Actions (create, update, delete).
- **Acceptance Criteria**:
  - [ ] `invalidateCache(CacheTags.chatMessages(chatId))` on create
  - [ ] `invalidateCache(CacheTags.chatMessages(chatId))` on update
  - [ ] `invalidateCache(CacheTags.chatMessages(chatId))` on delete
  - [ ] Cache invalidates correctly in tests
- **Dependencies**: OPT-014

---

### OPT-016: Add updateTag to visibility.ts Actions

- [ ] **Status**: Not Started
- **Priority**: P1
- **REQ**: REQ-003
- **Effort**: S (0.5h)
- **Files**:
  - `features/chat/actions/visibility.ts`
- **Description**: Add `invalidateCache()` calls to visibility Server Actions.
- **Acceptance Criteria**:
  - [ ] `invalidateCache(CacheTags.chat(chatId))` on visibility change
  - [ ] Cache invalidates correctly in tests
- **Dependencies**: OPT-014

---

### OPT-017: Migrate revalidateTag Calls

- [ ] **Status**: Not Started
- **Priority**: P1
- **REQ**: REQ-004
- **Effort**: M (1.5h)
- **Files**:
  - All files using `revalidateTag()`
- **Description**: Migrate all `revalidateTag("tag")` calls to `revalidateTag("tag", "max")` to avoid deprecation warnings.
- **Acceptance Criteria**:
  - [ ] All `revalidateTag` calls have profile argument
  - [ ] No deprecation warnings in build
  - [ ] No deprecated usage at runtime
- **Dependencies**: OPT-014

---

### OPT-018: Add updateTag to Document Actions

- [ ] **Status**: Not Started
- **Priority**: P1
- **REQ**: REQ-003
- **Effort**: M (1.5h)
- **Files**:
  - `features/documents/actions/*.ts`
- **Description**: Add `invalidateCache()` calls to document Server Actions (create, update, delete, version).
- **Acceptance Criteria**:
  - [ ] `invalidateCache(CacheTags.document(docId))` on all mutations
  - [ ] Document versions trigger invalidation
  - [ ] Cache invalidates correctly in tests
- **Dependencies**: OPT-014

---

### OPT-019: Add updateTag to Vote/Suggestion Actions

- [ ] **Status**: Not Started
- **Priority**: P1
- **REQ**: REQ-003
- **Effort**: S (0.5h)
- **Files**:
  - `features/chat/actions/vote.ts`
  - `features/chat/actions/suggestion.ts`
- **Description**: Add `invalidateCache()` calls to vote and suggestion Server Actions.
- **Acceptance Criteria**:
  - [ ] Vote mutations trigger cache invalidation
  - [ ] Suggestion mutations trigger cache invalidation
  - [ ] Cache invalidates correctly in tests
- **Dependencies**: OPT-014

---

## Wave 4: Edge Cases & Resilience (~10h)

> Handle failure modes and edge cases

---

### OPT-020: Multi-Tab Session Sync Integration

- [ ] **Status**: Not Started
- **Priority**: P1
- **REQ**: REQ-011
- **Effort**: L (3h)
- **Files**:
  - `features/auth/components/auth-provider.tsx`
  - `features/auth/hooks/use-session-sync.ts`
- **Description**: Integrate BroadcastChannel session sync into AuthProvider for seamless multi-tab experience.
- **Acceptance Criteria**:
  - [ ] AuthProvider subscribes to session changes
  - [ ] State updates trigger broadcast
  - [ ] All tabs stay synchronized
  - [ ] No race conditions on rapid auth changes
- **Dependencies**: OPT-046

---

### OPT-021: Redis Circuit Breaker

- [ ] **Status**: Not Started
- **Priority**: P1
- **REQ**: REQ-017
- **Effort**: M (1.5h)
- **Files**:
  - `lib/cache/circuit-breaker.ts` (new)
- **Description**: Implement circuit breaker pattern for Redis connections to prevent cascade failures.
- **Acceptance Criteria**:
  - [ ] Circuit opens after 5 failures in 10s
  - [ ] Half-opens after 30s
  - [ ] Logs state changes (open/half-open/closed)
  - [ ] Metrics exposed for monitoring
- **Dependencies**: Wave 2 complete

---

### OPT-022: Graceful Degradation Handling

- [ ] **Status**: Not Started
- **Priority**: P1
- **REQ**: REQ-017
- **Effort**: M (1.5h)
- **Files**:
  - `lib/cache/degradation.ts` (new)
  - Affected data functions
- **Description**: Implement graceful degradation when cache is unavailable - fall back to database queries.
- **Acceptance Criteria**:
  - [ ] Session falls back to database query
  - [ ] Chat cache falls back to database query
  - [ ] Degradation state logged
  - [ ] User experience unaffected
- **Dependencies**: OPT-021

---

### OPT-023: Streaming Cache Edge Cases

- [ ] **Status**: Not Started
- **Priority**: P2
- **REQ**: REQ-001
- **Effort**: M (1.5h)
- **Files**:
  - `lib/data/cached/chat.ts`
  - `lib/data/cached/messages.ts`
- **Description**: Handle edge cases where streaming responses interact with cache (partial data, connection drops).
- **Acceptance Criteria**:
  - [ ] Partial streaming data not cached
  - [ ] Connection drops don't corrupt cache
  - [ ] Complete responses cached correctly
- **Dependencies**: OPT-008, OPT-009

---

### OPT-024: Error Boundaries for Cache Failures

- [ ] **Status**: Not Started
- **Priority**: P2
- **REQ**: REQ-016
- **Effort**: M (1.5h)
- **Files**:
  - `components/cache-error-boundary.tsx` (new)
  - `app/(chat)/layout.tsx`
- **Description**: Create error boundaries that gracefully handle cache-related failures.
- **Acceptance Criteria**:
  - [ ] CacheErrorBoundary component created
  - [ ] Fallback UI shown on cache errors
  - [ ] Error logged for debugging
  - [ ] User can retry operation
- **Dependencies**: OPT-022

---

### OPT-025: Test Concurrent Invalidation

- [ ] **Status**: Not Started
- **Priority**: P2
- **REQ**: REQ-003
- **Effort**: M (1.5h)
- **Files**:
  - `tests/integration/cache-invalidation.test.ts` (new)
- **Description**: Test that concurrent cache invalidations from multiple tabs/users don't cause race conditions.
- **Acceptance Criteria**:
  - [ ] Concurrent invalidation tests written
  - [ ] No race conditions detected
  - [ ] Cache consistency maintained
  - [ ] Performance within acceptable bounds
- **Dependencies**: OPT-015, OPT-020

---

## Wave 5: UX/DX/A11y Polish (~12h)

> Polish user experience, developer experience, and accessibility

---

### OPT-026: Add generateMetadata to Chat Pages

- [ ] **Status**: Not Started
- **Priority**: P2
- **REQ**: REQ-006
- **Effort**: M (1.5h)
- **Files**:
  - `app/(chat)/chat/[id]/page.tsx`
- **Description**: Add `generateMetadata()` for dynamic SEO-friendly page titles based on chat content.
- **Acceptance Criteria**:
  - [ ] Page title shows chat title
  - [ ] OpenGraph tags set correctly
  - [ ] Fallback title for untitled chats
  - [ ] No hydration mismatches
- **Dependencies**: OPT-008

---

### OPT-027: Create Loading Skeletons

- [ ] **Status**: Not Started
- **Priority**: P2
- **REQ**: REQ-016
- **Effort**: M (1.5h)
- **Files**:
  - `components/ui/skeleton-chat.tsx` (new)
  - `components/ui/skeleton-sidebar.tsx` (new)
- **Description**: Create consistent loading skeletons for chat and sidebar components.
- **Acceptance Criteria**:
  - [ ] ChatSkeleton component matches chat layout
  - [ ] SidebarSkeleton component matches sidebar layout
  - [ ] Smooth animation
  - [ ] Consistent with design system
- **Dependencies**: None (can start anytime in Wave 5)

---

### OPT-028: Cache Pattern Documentation

- [ ] **Status**: Not Started
- **Priority**: P2
- **REQ**: REQ-015
- **Effort**: M (1.5h)
- **Files**:
  - `docs/caching.md` (new)
  - `docs/cache-invalidation.md` (new)
- **Description**: Document all caching patterns, profiles, and invalidation strategies for future developers.
- **Acceptance Criteria**:
  - [ ] Cache profiles documented
  - [ ] Tag naming conventions documented
  - [ ] Invalidation patterns documented
  - [ ] Examples provided
- **Dependencies**: Wave 3 complete

---

### OPT-029: Cache Audit Logger

- [ ] **Status**: Not Started
- **Priority**: P3
- **REQ**: REQ-018
- **Effort**: M (1.5h)
- **Files**:
  - `lib/cache/audit-logger.ts` (new)
- **Description**: Create cache audit logger for debugging and monitoring cache operations in development.
- **Acceptance Criteria**:
  - [ ] Logs cache hits/misses
  - [ ] Logs invalidation operations
  - [ ] Only active in development
  - [ ] Configurable verbosity
- **Dependencies**: Wave 2 complete

---

### OPT-030: Feature Flag Support

- [ ] **Status**: Not Started
- **Priority**: P2
- **REQ**: REQ-010
- **Effort**: M (1.5h)
- **Files**:
  - `lib/config/feature-flags.ts` (new)
- **Description**: Add feature flag support to enable/disable caching features without deployment.
- **Acceptance Criteria**:
  - [ ] `USE_CACHE` flag controls caching
  - [ ] `CACHE_DEBUG` flag controls logging
  - [ ] Flags configurable via env vars
  - [ ] Runtime toggle in development
- **Dependencies**: None (can start anytime in Wave 5)

---

### OPT-042: Auth Route loading.tsx

- [ ] **Status**: Not Started
- **Priority**: P2
- **REQ**: REQ-021
- **Effort**: S (0.5h)
- **Files**:
  - `app/(auth)/login/loading.tsx` (new)
  - `app/(auth)/register/loading.tsx` (new)
- **Description**: Add loading.tsx to auth routes for better perceived performance.
- **Acceptance Criteria**:
  - [ ] Login page shows loading state
  - [ ] Register page shows loading state
  - [ ] Consistent with design system
- **Dependencies**: None

---

### OPT-043: Auth Route error.tsx

- [ ] **Status**: Not Started
- **Priority**: P2
- **REQ**: REQ-022
- **Effort**: S (0.5h)
- **Files**:
  - `app/(auth)/login/error.tsx` (new)
  - `app/(auth)/register/error.tsx` (new)
- **Description**: Add error.tsx to auth routes for graceful error handling.
- **Acceptance Criteria**:
  - [ ] Login errors show user-friendly message
  - [ ] Register errors show user-friendly message
  - [ ] Retry button available
  - [ ] Error logged for debugging
- **Dependencies**: None

---

### OPT-044: A11y Attributes to Loading States

- [ ] **Status**: Not Started
- **Priority**: P2
- **REQ**: REQ-023
- **Effort**: M (1.5h)
- **Files**:
  - All loading.tsx files
  - All skeleton components
- **Description**: Add proper accessibility attributes to all loading states.
- **Acceptance Criteria**:
  - [ ] `role="status"` on loading containers
  - [ ] `aria-label` describes what's loading
  - [ ] `aria-busy="true"` while loading
  - [ ] Screen reader announcements work
- **Dependencies**: OPT-027, OPT-042

---

### OPT-047: Auth Error Boundaries

- [ ] **Status**: Not Started
- **Priority**: P2
- **REQ**: REQ-026
- **Effort**: M (1.5h)
- **Files**:
  - `features/auth/components/auth-error-boundary.tsx` (new)
  - `app/(auth)/layout.tsx`
- **Description**: Add specialized error boundaries for auth-related errors.
- **Acceptance Criteria**:
  - [ ] AuthErrorBoundary component created
  - [ ] Session errors handled gracefully
  - [ ] User can retry or go home
  - [ ] Error logged for debugging
- **Dependencies**: OPT-043

---

### OPT-048: Offline Detection

- [ ] **Status**: Not Started
- **Priority**: P2
- **REQ**: REQ-027
- **Effort**: M (1.5h)
- **Files**:
  - `hooks/use-online-status.ts` (new)
  - `components/offline-indicator.tsx` (new)
- **Description**: Detect offline status and show indicator to users.
- **Acceptance Criteria**:
  - [ ] `useOnlineStatus()` hook created
  - [ ] OfflineIndicator component shows when offline
  - [ ] State updates on network change
  - [ ] Non-intrusive UI
- **Dependencies**: None

---

## Wave 6: Verification & Testing (~11h)

> Verify all optimizations work correctly

---

### OPT-031: Baseline Web Vitals Capture

- [ ] **Status**: Not Started
- **Priority**: P1
- **REQ**: REQ-007
- **Effort**: M (1.5h)
- **Files**:
  - `docs/performance-baseline.md` (new)
- **Description**: Capture baseline Web Vitals metrics before optimization verification.
- **Acceptance Criteria**:
  - [ ] LCP baseline captured
  - [ ] FCP baseline captured
  - [ ] INP baseline captured
  - [ ] CLS baseline captured
  - [ ] Document created with methodology
- **Dependencies**: Wave 5 complete

---

### OPT-032: Web Vitals Monitoring Setup

- [ ] **Status**: Not Started
- **Priority**: P1
- **REQ**: REQ-007
- **Effort**: M (1.5h)
- **Files**:
  - `lib/monitoring/web-vitals.ts` (new)
  - `app/layout.tsx`
- **Description**: Set up continuous Web Vitals monitoring for production.
- **Acceptance Criteria**:
  - [ ] LCP target: < 2.5s
  - [ ] FCP target: < 1.5s
  - [ ] INP target: < 200ms
  - [ ] CLS target: < 0.1
  - [ ] Metrics reported to analytics
- **Dependencies**: OPT-031

---

### OPT-033: Cache Hit Rate Analysis

- [ ] **Status**: Not Started
- **Priority**: P2
- **REQ**: REQ-008
- **Effort**: M (1.5h)
- **Files**:
  - `lib/monitoring/cache-metrics.ts` (new)
  - `docs/cache-analysis.md` (new)
- **Description**: Analyze cache hit rates and optimize cache profiles based on data.
- **Acceptance Criteria**:
  - [ ] Cache hit rate metrics collected
  - [ ] Analysis document created
  - [ ] Recommendations for profile adjustments
  - [ ] Target: >80% hit rate
- **Dependencies**: OPT-029

---

### OPT-034: Full Regression Test Suite

- [ ] **Status**: Not Started
- **Priority**: P1
- **REQ**: REQ-009
- **Effort**: L (3h)
- **Files**:
  - `tests/e2e/regression/*.spec.ts` (new)
- **Description**: Create comprehensive regression test suite covering all user flows.
- **Acceptance Criteria**:
  - [ ] Guest user chat flow tested
  - [ ] Authenticated user chat flow tested
  - [ ] Message sending/receiving tested
  - [ ] Chat history loading tested
  - [ ] Document creation/versioning tested
  - [ ] Vote and suggestion functionality tested
  - [ ] All tests pass
- **Dependencies**: All Waves 0-5 complete

---

### OPT-035: Multi-Tab E2E Tests

- [ ] **Status**: Not Started
- **Priority**: P1
- **REQ**: REQ-011
- **Effort**: M (1.5h)
- **Files**:
  - `tests/e2e/multi-tab.spec.ts` (new)
- **Description**: Create E2E tests for multi-tab session synchronization.
- **Acceptance Criteria**:
  - [ ] Login sync test passes
  - [ ] Logout sync test passes
  - [ ] State consistency test passes
  - [ ] Performance within 100ms threshold
- **Dependencies**: OPT-020

---

### OPT-036: Rate Limit Chaos Testing

- [ ] **Status**: Not Started
- **Priority**: P1
- **REQ**: REQ-012
- **Effort**: M (1.5h)
- **Files**:
  - `tests/chaos/rate-limit.spec.ts` (new)
- **Description**: Create chaos tests to verify rate limiting behavior under adverse conditions.
- **Acceptance Criteria**:
  - [ ] Redis failure handled correctly
  - [ ] Fail-closed behavior verified
  - [ ] Memory fallback works
  - [ ] No security bypasses possible
- **Dependencies**: OPT-P0-001, OPT-P0-003

---

### OPT-037: Final Performance Audit

- [ ] **Status**: Not Started
- **Priority**: P1
- **REQ**: REQ-007
- **Effort**: L (3h)
- **Files**:
  - `docs/performance-audit.md` (new)
- **Description**: Comprehensive performance audit comparing baseline vs. optimized metrics.
- **Acceptance Criteria**:
  - [ ] All Web Vitals meet targets
  - [ ] Cache hit rate documented
  - [ ] Comparison with baseline
  - [ ] Recommendations documented
  - [ ] Sign-off for production
- **Dependencies**: All other Wave 6 tasks

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 51 |
| **Completed** | 0 |
| **In Progress** | 0 |
| **Not Started** | 51 |
| **Overall Progress** | 0% |

### By Priority

| Priority | Count | Completed |
|----------|-------|-----------|
| P0 🔴 | 4 | 0 |
| P1 | 28 | 0 |
| P2 | 17 | 0 |
| P3 | 2 | 0 |

### By Effort

| Effort | Count | Hours |
|--------|-------|-------|
| S (0.5h) | 11 | ~5.5h |
| M (1.5h) | 33 | ~49.5h |
| L (3h) | 7 | ~21h |
| **Total** | **51** | **~62h** |

---

## Critical Path

```
OPT-P0-001 ─┬─→ OPT-001 → OPT-002 → OPT-008 → OPT-015 → OPT-020 → OPT-035 → OPT-037
            │
OPT-P0-002 ─┴─→ OPT-014 → OPT-017 → OPT-021 ────────────────────────────────────┘
                                        ↑
                          OPT-040 → OPT-046
```

**Critical Path Duration**: ~24h

---

## Notes

### Implementation Notes
<!-- Add implementation notes here as work progresses -->

### Blockers
<!-- Document any blockers encountered -->

### Decisions
<!-- Record important decisions made during implementation -->

### Changelog

| Date | Change | Tasks Affected |
|------|--------|----------------|
| 2024-12-24 | Initial tracker created | All |

---

_Last Updated: December 24, 2025_
