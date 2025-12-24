# FINAL Tasks: Next.js 16.1.0 Optimization

> **Consolidated from**: tasks.md (v1 → v5)  
> **Finalized**: December 24, 2025  
> **Total Tasks**: 51 | **Total Effort**: ~62h  
> **Status**: ⬜ Ready for Implementation

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Requirements** | 30 (REQ-001 to REQ-030) |
| **Active ADRs** | 11 (ADR-001 to ADR-012, excl. ADR-003) |
| **Total Tasks** | 51 |
| **Total Effort** | ~62h |
| **Waves** | 8 (Wave 0–6 + Wave 1.5) |
| **Critical P0 Tasks** | 4 (Security blockers) |

---

## Wave Overview

| Wave | Name | Tasks | Effort | Status | Blocking |
|------|------|-------|--------|--------|----------|
| **Wave 0** | P0 Security Fixes | 4 | ~5h | ⬜ | 🔴 Deploy Blocker |
| **Wave 1** | Foundation + Architecture | 9 | ~10h | ⬜ | Blocks Wave 1.5+ |
| **Wave 1.5** | Risk Mitigation + Session | 3 | ~6h | ⬜ | 🔴 Blocks Wave 2+ |
| **Wave 2** | Caching Implementation | 7 | ~12h | ⬜ | Blocks Wave 3 |
| **Wave 3** | Cache Invalidation | 5 | ~8h | ⬜ | Blocks Wave 4 |
| **Wave 4** | Edge Cases & Resilience | 6 | ~10h | ⬜ | Blocks Wave 5 |
| **Wave 5** | UX/DX/A11y Polish | 10 | ~12h | ⬜ | Blocks Wave 6 |
| **Wave 6** | Verification & Testing | 7 | ~11h | ⬜ | Release Gate |

---

## Task Summary Table

| Task ID | Title | Wave | REQ | Priority | Effort | Status |
|---------|-------|------|-----|----------|--------|--------|
| OPT-P0-001 | Fix Rate Limit Fail-Open | 0 | REQ-012 | P0 🔴 | M | ⬜ |
| OPT-P0-002 | Add updateTag() Support | 0 | REQ-013 | P0 🔴 | M | ⬜ |
| OPT-P0-003 | Fix withRateLimit failOpen default | 0 | REQ-028 | P0 🔴 | S | ⬜ |
| OPT-P0-004 | Remove model info from guest error | 0 | REQ-029 | P0 🔴 | S | ⬜ |
| OPT-001 | Configure cacheLife Profiles | 1 | REQ-002 | P1 | M | ⬜ |
| OPT-002 | Refactor chat.ts Signatures | 1 | REQ-005 | P1 | M | ⬜ |
| OPT-003 | Refactor messages.ts Signatures | 1 | REQ-005 | P1 | S | ⬜ |
| OPT-004 | Refactor documents.ts Signatures | 1 | REQ-005 | P1 | M | ⬜ |
| OPT-005 | Refactor votes.ts Signatures | 1 | REQ-005 | P1 | S | ⬜ |
| OPT-006 | Refactor suggestions.ts Signatures | 1 | REQ-005 | P1 | S | ⬜ |
| OPT-007 | Create CacheTags Utility | 1 | REQ-014 | P2 | S | ⬜ |
| OPT-040 | Split AuthProvider Contexts | 1 | REQ-019 | P2 | M | ⬜ |
| OPT-041 | Consolidate SidebarProvider | 1 | REQ-020 | P2 | M | ⬜ |
| OPT-045 | Add AbortController to Auth | 1.5 | REQ-024 | P1 🔴 | M | ⬜ |
| OPT-046 | BroadcastChannel Session Sync | 1.5 | REQ-025 | P1 🔴 | L | ⬜ |
| OPT-049 | Add BroadcastChannel origin validation | 1.5 | REQ-030 | P2 | M | ⬜ |
| OPT-008 | Add "use cache" to chat.ts | 2 | REQ-001 | P1 | M | ⬜ |
| OPT-009 | Add "use cache" to messages.ts | 2 | REQ-001 | P1 | M | ⬜ |
| OPT-010 | Add "use cache" to documents.ts | 2 | REQ-001 | P1 | M | ⬜ |
| OPT-011 | Add "use cache" to votes.ts | 2 | REQ-001 | P1 | S | ⬜ |
| OPT-012 | Add "use cache" to suggestions.ts | 2 | REQ-001 | P1 | S | ⬜ |
| OPT-013 | Implement parallel-loader | 2 | REQ-007 | P2 | M | ⬜ |
| OPT-014 | Create invalidation.ts Utility | 2 | REQ-013 | P1 | M | ⬜ |
| OPT-015 | Add updateTag to message.ts | 3 | REQ-003 | P1 | M | ⬜ |
| OPT-016 | Add updateTag to visibility.ts | 3 | REQ-003 | P1 | S | ⬜ |
| OPT-017 | Migrate revalidateTag Calls | 3 | REQ-004 | P1 | M | ⬜ |
| OPT-018 | Add updateTag to document actions | 3 | REQ-003 | P1 | M | ⬜ |
| OPT-019 | Add updateTag to vote/suggestion | 3 | REQ-003 | P1 | S | ⬜ |
| OPT-020 | Multi-Tab Session Sync | 4 | REQ-011 | P1 | L | ⬜ |
| OPT-021 | Redis Circuit Breaker | 4 | REQ-017 | P1 | M | ⬜ |
| OPT-022 | Graceful Degradation Handling | 4 | REQ-017 | P1 | M | ⬜ |
| OPT-023 | Streaming Cache Edge Cases | 4 | REQ-001 | P2 | M | ⬜ |
| OPT-024 | Error Boundaries for Cache | 4 | REQ-016 | P2 | M | ⬜ |
| OPT-025 | Test Concurrent Invalidation | 4 | REQ-003 | P2 | M | ⬜ |
| OPT-026 | Add generateMetadata | 5 | REQ-006 | P2 | M | ⬜ |
| OPT-027 | Create Loading Skeletons | 5 | REQ-016 | P2 | M | ⬜ |
| OPT-028 | Cache Pattern Documentation | 5 | REQ-015 | P2 | M | ⬜ |
| OPT-029 | Cache Audit Logger | 5 | REQ-018 | P3 | M | ⬜ |
| OPT-030 | Feature Flag Support | 5 | REQ-010 | P2 | M | ⬜ |
| OPT-042 | Auth Route loading.tsx | 5 | REQ-021 | P2 | S | ⬜ |
| OPT-043 | Auth Route error.tsx | 5 | REQ-022 | P2 | S | ⬜ |
| OPT-044 | A11y Attrs to Loading States | 5 | REQ-023 | P2 | M | ⬜ |
| OPT-047 | Auth Error Boundaries | 5 | REQ-026 | P2 | M | ⬜ |
| OPT-048 | Offline Detection | 5 | REQ-027 | P2 | M | ⬜ |
| OPT-031 | Baseline Web Vitals | 6 | REQ-007 | P1 | M | ⬜ |
| OPT-032 | Web Vitals Monitoring | 6 | REQ-007 | P1 | M | ⬜ |
| OPT-033 | Cache Hit Rate Analysis | 6 | REQ-008 | P2 | M | ⬜ |
| OPT-034 | Full Regression Test Suite | 6 | REQ-009 | P1 | L | ⬜ |
| OPT-035 | Multi-Tab E2E Tests | 6 | REQ-011 | P1 | M | ⬜ |
| OPT-036 | Rate Limit Chaos Testing | 6 | REQ-012 | P1 | M | ⬜ |
| OPT-037 | Final Performance Audit | 6 | REQ-007 | P1 | L | ⬜ |

---

## Dependency Graph

```
Wave 0 (P0 Security) 🔴
├── OPT-P0-001 (Rate Limit Fail-Closed) ────────┐
├── OPT-P0-002 (updateTag Support) ─────────────┤
├── OPT-P0-003 (withRateLimit failOpen) ────────┤
└── OPT-P0-004 (Remove model info) ─────────────┤
                                                 ▼
Wave 1 (Foundation + Architecture) ─────────────┤
├── OPT-001 (cacheLife profiles) ───────────────┤
├── OPT-002 (chat.ts signatures) ───────────────┤
├── OPT-003 (messages.ts signatures) ───────────┤
├── OPT-004 (documents.ts signatures) ──────────┤
├── OPT-005 (votes.ts signatures) ──────────────┤
├── OPT-006 (suggestions.ts signatures) ────────┤
├── OPT-007 (CacheTags utility) ────────────────┤
├── OPT-040 (AuthProvider split) ───────────────┤
└── OPT-041 (SidebarProvider consolidate) ──────┤
                                                 ▼
Wave 1.5 (Risk Mitigation) 🔴 ──────────────────┤
├── OPT-045 (AbortController auth) ─────────────┤
├── OPT-046 (BroadcastChannel sync) ────────────┤
└── OPT-049 (BC origin validation) ─────────────┤
                                                 ▼
Wave 2 (Caching) ───────────────────────────────┤
├── OPT-008 ("use cache" chat.ts) ──────────────┤
├── OPT-009 ("use cache" messages.ts) ──────────┤
├── OPT-010 ("use cache" documents.ts) ─────────┤
├── OPT-011 ("use cache" votes.ts) ─────────────┤
├── OPT-012 ("use cache" suggestions.ts) ───────┤
├── OPT-013 (parallel-loader) ──────────────────┤
└── OPT-014 (invalidation.ts) ──────────────────┤
                                                 ▼
Wave 3 (Invalidation) ──────────────────────────┤
├── OPT-015 (updateTag message.ts) ─────────────┤
├── OPT-016 (updateTag visibility.ts) ──────────┤
├── OPT-017 (revalidateTag migration) ──────────┤
├── OPT-018 (updateTag documents) ──────────────┤
└── OPT-019 (updateTag vote/suggestion) ────────┤
                                                 ▼
Wave 4 (Edge Cases) ────────────────────────────┤
├── OPT-020 (Multi-tab sync) ───────────────────┤
├── OPT-021 (Circuit breaker) ──────────────────┤
├── OPT-022 (Graceful degradation) ─────────────┤
├── OPT-023 (Streaming edge cases) ─────────────┤
├── OPT-024 (Error boundaries) ─────────────────┤
└── OPT-025 (Concurrent invalidation) ──────────┤
                                                 ▼
Wave 5 (UX/DX/A11y) ────────────────────────────┤
├── OPT-026 (generateMetadata) ─────────────────┤
├── OPT-027 (Loading skeletons) ────────────────┤
├── OPT-028 (Documentation) ────────────────────┤
├── OPT-029 (Audit logger) ─────────────────────┤
├── OPT-030 (Feature flags) ────────────────────┤
├── OPT-042 (Auth loading.tsx) ─────────────────┤
├── OPT-043 (Auth error.tsx) ───────────────────┤
├── OPT-044 (A11y loading states) ──────────────┤
├── OPT-047 (Auth error boundaries) ────────────┤
└── OPT-048 (Offline detection) ────────────────┤
                                                 ▼
Wave 6 (Verification) ──────────────────────────┘
├── OPT-031 (Baseline vitals)
├── OPT-032 (Vitals monitoring)
├── OPT-033 (Cache hit analysis)
├── OPT-034 (Regression tests)
├── OPT-035 (Multi-tab E2E)
├── OPT-036 (Rate limit chaos)
└── OPT-037 (Final audit)
```

---

## Wave 0: P0 Security Fixes 🔴

> **⚠️ DEPLOY BLOCKER**: Complete before any production deployment

### OPT-P0-001: Fix Rate Limit Fail-Open Vulnerability

**Priority**: P0 🔴 **SECURITY BLOCKER** | **Effort**: M (1.5h) | **REQ**: REQ-012

**Files**:
- `lib/middleware/rate-limit.ts`
- `lib/middleware/rate-limit-config.ts` (new)

**Implementation**:
```typescript
// lib/middleware/rate-limit-config.ts
export const SENSITIVE_PATTERNS = ['/api/auth', '/api/files/upload'];

export function shouldFailClosed(pathname: string): boolean {
  return SENSITIVE_PATTERNS.some(p => pathname.startsWith(p));
}

// lib/middleware/rate-limit.ts
if (!limiter) {
  if (shouldFailClosed(pathname)) {
    return { success: false, limit: 0, remaining: 0, reset: Date.now() + 60000 };
  }
  return applyMemoryRateLimit(identifier);
}
```

**Done When**:
- [ ] `/api/auth/*` returns 503 when Redis unavailable
- [ ] `/api/chat` uses memory fallback
- [ ] Rate limit bypass attempts are logged

---

### OPT-P0-002: Add updateTag() Support to Server Actions

**Priority**: P0 🔴 **FUNCTIONAL BLOCKER** | **Effort**: M (1.5h) | **REQ**: REQ-013

**Files**:
- `lib/cache-ops/invalidation.ts` (new)
- `features/chat/actions/message.ts`
- `features/chat/actions/visibility.ts`

**Implementation**:
```typescript
// lib/cache-ops/invalidation.ts
export async function invalidateCache(tag: string): Promise<void> {
  try {
    if (isServerActionContext()) {
      updateTag(tag);
      return;
    }
  } catch {}
  revalidateTag(tag, 'max');
}
```

**Done When**:
- [ ] `invalidateCache()` utility created
- [ ] Server Actions use `updateTag()`
- [ ] Route Handlers fall back to `revalidateTag()`

---

### OPT-P0-003: Fix withRateLimit failOpen Default

**Priority**: P0 🔴 **SECURITY** | **Effort**: S (30m) | **REQ**: REQ-028

**Files**:
- `lib/middleware/rate-limit.ts`

**Problem**: The `withRateLimit` HOF defaults to `failOpen: true`, which bypasses rate limiting when Redis is unavailable. This is insecure for sensitive endpoints.

**Implementation**:
```typescript
// Change default from true to false
interface RateLimitOptions {
  failOpen?: boolean; // Default: false (was true)
}

export function withRateLimit<T extends (...args: any[]) => any>(
  fn: T,
  options: RateLimitOptions = { failOpen: false }
): T {
  // ...
}
```

**Done When**:
- [ ] `failOpen` defaults to `false`
- [ ] Existing callers explicitly set `failOpen: true` if needed
- [ ] Unit test verifies fail-closed behavior

---

### OPT-P0-004: Remove Model Info from Guest Error

**Priority**: P0 🔴 **SECURITY** | **Effort**: S (30m) | **REQ**: REQ-029

**Files**:
- `app/(chat)/api/chat/route.ts`

**Problem**: Error response exposes model information when guests exceed message limit.

**Before**:
```typescript
return new Response(
  JSON.stringify({ 
    error: 'Message limit exceeded',
    model: selectedChatModel // ❌ Leaks model info
  }),
  { status: 429 }
);
```

**After**:
```typescript
return new Response(
  JSON.stringify({ 
    error: 'Message limit exceeded. Please sign in to continue.'
  }),
  { status: 429 }
);
```

**Done When**:
- [ ] Model info removed from error response
- [ ] Only generic user-friendly message returned
- [ ] Integration test verifies no model leakage

---

## Wave 1: Foundation + Architecture

### OPT-001: Configure Custom cacheLife Profiles

**Priority**: P1 | **Effort**: M (1.5h) | **REQ**: REQ-002

**Files**: `next.config.ts`

**Implementation**:
```typescript
experimental: {
  cacheLife: {
    chatMessages: { stale: 60, revalidate: 14400, expire: 86400 },
    userChats: { stale: 60, revalidate: 300, expire: 7200 },
    documents: { stale: 300, revalidate: 14400, expire: 86400 },
    suggestions: { stale: 60, revalidate: 300, expire: 3600 },
  },
}
```

**Done When**:
- [ ] 4 custom profiles defined
- [ ] Build completes without errors
- [ ] TypeScript compilation passes

---

### OPT-002 to OPT-006: Refactor Function Signatures

**Priority**: P1 | **Effort**: 3.5h total | **REQ**: REQ-005

**Signature Changes**:
| Task | Function | Before | After |
|------|----------|--------|-------|
| OPT-002 | `getChatCached` | `(chatId, ctx)` | `(chatId, userId)` |
| OPT-002 | `getUserChatsCached` | `(ctx)` | `(userId)` |
| OPT-003 | `getMessagesCached` | `(chatId, ctx)` | `(chatId, userId)` |
| OPT-004 | `getDocumentCached` | `(docId, ctx)` | `(docId, userId)` |
| OPT-005 | `getVoteCached` | `(chatId, msgId, ctx)` | `(chatId, msgId, userId)` |
| OPT-006 | `getSuggestionsCached` | `(ctx)` | `(userId)` |

**Done When**:
- [ ] All functions accept serializable arguments
- [ ] All call sites updated
- [ ] No runtime errors

---

### OPT-007: Create CacheTags Utility

**Priority**: P2 | **Effort**: S (0.5h) | **REQ**: REQ-014

**Files**: `lib/cache/tags.ts` (new)

**Implementation**:
```typescript
export const CacheTags = {
  chat: (chatId: string) => `chat-${chatId}`,
  userChats: (userId: string) => `user-chats-${userId}`,
  chatMessages: (chatId: string) => `chat-messages-${chatId}`,
  document: (docId: string) => `document-${docId}`,
  suggestions: (docId: string, userId: string) => `suggestions-${docId}-${userId}`,
} as const;
```

**Done When**:
- [ ] CacheTags utility exported
- [ ] All cached functions use utility
- [ ] No hardcoded tag strings

---

### OPT-040: Split AuthProvider into State/Dispatch Contexts

**Priority**: P2 | **Effort**: M (1.5h) | **REQ**: REQ-019

**Files**: `features/auth/components/auth-provider.tsx`, `features/auth/hooks/use-auth.ts`

**Implementation**:
```typescript
const AuthStateContext = createContext<AuthState | null>(null);
const AuthDispatchContext = createContext<AuthDispatch | null>(null);

export function useAuthState() {
  return useContext(AuthStateContext);
}

export function useAuthDispatch() {
  return useContext(AuthDispatchContext);
}

// Backward compatibility
export function useAuth() {
  return { ...useAuthState(), ...useAuthDispatch() };
}
```

**Done When**:
- [ ] Separate state/dispatch contexts
- [ ] `useAuth()` continues working
- [ ] React DevTools shows reduced re-renders

---

### OPT-041: Consolidate SidebarProvider

**Priority**: P2 | **Effort**: M (1.5h) | **REQ**: REQ-020

**Files**: `features/sidebar/components/sidebar-provider.tsx`, `components/ui/sidebar.tsx`

**Done When**:
- [ ] Single canonical location
- [ ] All imports migrated
- [ ] Deprecated path shows warning

---

## Wave 1.5: Risk Mitigation 🔴

### OPT-045: Add AbortController to Auth Flows

**Priority**: P1 🔴 | **Effort**: M (1.5h) | **REQ**: REQ-024

**Files**: `features/auth/actions/login.ts`, `register.ts`, `*-form.tsx`

**Implementation**:
```typescript
let abortController: AbortController | null = null;

export async function loginAction(formData: FormData) {
  if (abortController) abortController.abort();
  abortController = new AbortController();
  
  try {
    const response = await fetch('/api/auth/login', {
      signal: abortController.signal,
    });
    if (abortController.signal.aborted) return;
    return response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    throw error;
  }
}
```

**Done When**:
- [ ] Rapid double-click only processes last request
- [ ] Submit button disabled during request
- [ ] Component unmount aborts pending requests

---

### OPT-046: BroadcastChannel Session Sync

**Priority**: P1 🔴 | **Effort**: L (3h) | **REQ**: REQ-025

**Files**: `lib/auth/session-sync.ts` (new), `features/auth/hooks/use-session-sync.ts` (new)

**Implementation**:
```typescript
export function createSessionSync() {
  if (typeof BroadcastChannel !== 'undefined') {
    return new BroadcastChannelSync('session-sync');
  }
  return new LocalStorageSync('session-sync');
}
```

**Done When**:
- [ ] Login in Tab A propagates to Tab B within 100ms
- [ ] Logout in Tab A logs out Tab B immediately
- [ ] Safari <15.4 uses localStorage fallback

---

### OPT-049: Add BroadcastChannel Origin Validation

**Priority**: P2 | **Effort**: M (1h) | **REQ**: REQ-030

**Files**: `lib/auth/session-sync.ts`, `features/auth/hooks/use-session-sync.ts`

**Problem**: BroadcastChannel messages should validate origin to prevent cross-origin attacks in certain embedding scenarios.

**Implementation**:
```typescript
// lib/auth/session-sync.ts
const ALLOWED_ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';

export class BroadcastChannelSync {
  private channel: BroadcastChannel;

  constructor(name: string) {
    this.channel = new BroadcastChannel(name);
    this.channel.onmessage = (event: MessageEvent) => {
      // Validate origin for security
      if (event.origin && event.origin !== ALLOWED_ORIGIN) {
        console.warn('Rejected BroadcastChannel message from unauthorized origin:', event.origin);
        return;
      }
      this.handleMessage(event.data);
    };
  }
}
```

**Done When**:
- [ ] Origin validation added to BroadcastChannel message handler
- [ ] Cross-origin messages are rejected with warning log
- [ ] Same-origin messages continue to work normally
- [ ] Unit test verifies origin validation

---

## Wave 2: Caching Implementation

### OPT-008 to OPT-012: Add "use cache" to Data Functions

**Priority**: P1 | **Effort**: 5h total | **REQ**: REQ-001

**Pattern**:
```typescript
export async function getChatCached(chatId: string, userId: string) {
  "use cache";
  cacheTag(CacheTags.chat(chatId));
  cacheLife("chatMessages");
  
  // ... existing implementation
}
```

**File Mapping**:
| Task | File | Profile |
|------|------|---------|
| OPT-008 | `lib/data/cached/chat.ts` | `chatMessages` |
| OPT-009 | `lib/data/cached/messages.ts` | `chatMessages` |
| OPT-010 | `lib/data/cached/documents.ts` | `documents` |
| OPT-011 | `lib/data/cached/votes.ts` | `hours` |
| OPT-012 | `lib/data/cached/suggestions.ts` | `suggestions` |

---

### OPT-013: Implement Parallel Loader

**Priority**: P2 | **Effort**: M (1.5h) | **REQ**: REQ-007

**Files**: `lib/data/parallel-loader.ts`

**Implementation**:
```typescript
export async function loadChatPageData(chatId: string): Promise<ChatPageData> {
  const session = await getSessionCached();
  if (!session?.user) return { session: null };

  const [chatResult, votesResult] = await Promise.allSettled([
    getChatWithMessagesCached(chatId, session.user.id),
    getVotesByChatIdCached(chatId, session.user.id),
  ]);

  return {
    session,
    chatWithMessages: chatResult.status === 'fulfilled' ? chatResult.value : null,
    votes: votesResult.status === 'fulfilled' ? votesResult.value : [],
  };
}
```

---

### OPT-014: Create invalidation.ts Utility

**Priority**: P1 | **Effort**: M (1.5h) | **REQ**: REQ-013

**Files**: `lib/cache-ops/invalidation.ts`

See OPT-P0-002 for implementation.

---

## Wave 3: Cache Invalidation

### OPT-015 to OPT-019: Add updateTag to Server Actions

**Priority**: P1 | **Effort**: 5h total | **REQ**: REQ-003

**Pattern**:
```typescript
"use server";
import { invalidateCache } from '@/lib/cache-ops/invalidation';
import { CacheTags } from '@/lib/cache/tags';

export async function deleteMessage(chatId: string, messageId: string) {
  await db.delete(messages).where(eq(messages.id, messageId));
  
  invalidateCache(CacheTags.chatMessages(chatId));
  invalidateCache(CacheTags.chat(chatId));
}
```

---

### OPT-017: Migrate revalidateTag Calls

**Priority**: P1 | **Effort**: M (1.5h) | **REQ**: REQ-004

**Migration**:
```typescript
// ❌ Before (deprecated)
revalidateTag("user-chats");

// ✅ After
revalidateTag("user-chats", "max");
```

**Done When**:
- [ ] All revalidateTag calls have profile argument
- [ ] No deprecation warnings in build
- [ ] No deprecated usage at runtime

---

## Wave 4: Edge Cases & Resilience

### OPT-020: Multi-Tab Session Sync

**Priority**: P1 | **Effort**: L (3h) | **REQ**: REQ-011

Extends OPT-046 with integration into AuthProvider.

---

### OPT-021: Redis Circuit Breaker

**Priority**: P1 | **Effort**: M (1.5h) | **REQ**: REQ-017

**Files**: `lib/cache/circuit-breaker.ts`

**Done When**:
- [ ] Circuit opens after 5 failures in 10s
- [ ] Half-opens after 30s
- [ ] Logs state changes

---

### OPT-022: Graceful Degradation Handling

**Priority**: P1 | **Effort**: M (1.5h) | **REQ**: REQ-017

**Done When**:
- [ ] Session falls back to database
- [ ] Chat cache falls back to database
- [ ] Degradation state logged

---

## Wave 5: UX/DX/A11y Polish

### OPT-026: Add generateMetadata

**Priority**: P2 | **Effort**: M (1.5h) | **REQ**: REQ-006

**Files**: `app/(chat)/chat/[id]/page.tsx`

**Implementation**:
```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const { id } = await params;
  const chat = await getChatCached(id, 'metadata-fetch');
  
  return {
    title: chat?.title || 'AI Chat',
    openGraph: { title: chat?.title || 'AI Chat' },
  };
}
```

---

### OPT-042/043: Auth Route Loading/Error States

**Priority**: P2 | **Effort**: 1h total | **REQ**: REQ-021, REQ-022

**Files**: 
- `app/(auth)/login/loading.tsx` (new)
- `app/(auth)/login/error.tsx` (new)
- `app/(auth)/register/loading.tsx` (new)
- `app/(auth)/register/error.tsx` (new)

---

### OPT-044: A11y Attrs to Loading States

**Priority**: P2 | **Effort**: M (1.5h) | **REQ**: REQ-023

**Pattern**:
```tsx
<div role="status" aria-label="Loading chat" aria-busy="true">
  <span className="sr-only">Loading chat conversation...</span>
  {/* Skeleton */}
</div>
```

---

### OPT-048: Offline Detection

**Priority**: P2 | **Effort**: M (1.5h) | **REQ**: REQ-027

**Files**: `hooks/use-online-status.ts` (new), `components/offline-indicator.tsx` (new)

**Implementation**:
```typescript
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
  }, []);
  
  return isOnline;
}
```

---

## Wave 6: Verification & Testing

### OPT-031/032: Web Vitals Baseline & Monitoring

**Priority**: P1 | **Effort**: 3h total | **REQ**: REQ-007

**Target Metrics**:
| Metric | Target |
|--------|--------|
| LCP | < 2.5s |
| FCP | < 1.5s |
| INP | < 200ms |
| CLS | < 0.1 |

---

### OPT-034: Full Regression Test Suite

**Priority**: P1 | **Effort**: L (3h) | **REQ**: REQ-009

**Coverage**:
- [ ] Guest user chat flow
- [ ] Authenticated user chat flow
- [ ] Message sending/receiving
- [ ] Chat history loading
- [ ] Document creation/versioning
- [ ] Vote and suggestion functionality

---

### OPT-035: Multi-Tab E2E Tests

**Priority**: P1 | **Effort**: M (1.5h) | **REQ**: REQ-011

**Files**: `tests/e2e/multi-tab.ts` (new)

---

### OPT-036: Rate Limit Chaos Testing

**Priority**: P1 | **Effort**: M (1.5h) | **REQ**: REQ-012

**Files**: `tests/chaos/rate-limit.ts` (new)

---

### OPT-037: Final Performance Audit

**Priority**: P1 | **Effort**: L (3h) | **REQ**: REQ-007

**Deliverable**: Performance report comparing baseline vs. optimized metrics.

---

## Traceability Matrix

| REQ | Tasks |
|-----|-------|
| REQ-001 | OPT-008, OPT-009, OPT-010, OPT-011, OPT-012, OPT-023 |
| REQ-002 | OPT-001 |
| REQ-003 | OPT-015, OPT-016, OPT-018, OPT-019, OPT-025 |
| REQ-004 | OPT-017 |
| REQ-005 | OPT-002, OPT-003, OPT-004, OPT-005, OPT-006 |
| REQ-006 | OPT-026 |
| REQ-007 | OPT-013, OPT-031, OPT-032, OPT-037 |
| REQ-008 | OPT-033 |
| REQ-009 | OPT-034 |
| REQ-010 | OPT-030 |
| REQ-011 | OPT-020, OPT-035 |
| REQ-012 | OPT-P0-001, OPT-036 |
| REQ-013 | OPT-P0-002, OPT-014 |
| REQ-014 | OPT-007 |
| REQ-015 | OPT-028 |
| REQ-016 | OPT-024, OPT-027 |
| REQ-017 | OPT-021, OPT-022 |
| REQ-018 | OPT-029 |
| REQ-019 | OPT-040 |
| REQ-020 | OPT-041 |
| REQ-021 | OPT-042 |
| REQ-022 | OPT-043 |
| REQ-023 | OPT-044 |
| REQ-024 | OPT-045 |
| REQ-025 | OPT-046 |
| REQ-026 | OPT-047 |
| REQ-027 | OPT-048 |

---

## Implementation Checklist

### Wave 0 Checkpoint
- [ ] OPT-P0-001: Rate limit fail-closed
- [ ] OPT-P0-002: updateTag support
- [ ] Security review approved

### Wave 1 Checkpoint
- [ ] All signatures refactored
- [ ] cacheLife profiles configured
- [ ] CacheTags utility created
- [ ] AuthProvider split
- [ ] SidebarProvider consolidated
- [ ] `npm run build` succeeds

### Wave 1.5 Checkpoint
- [ ] AbortController in auth flows
- [ ] BroadcastChannel sync working
- [ ] Multi-tab session test passes

### Wave 2 Checkpoint
- [ ] All "use cache" directives added
- [ ] Cache hit/miss visible in dev mode
- [ ] invalidation.ts utility complete

### Wave 3 Checkpoint
- [ ] All updateTag calls added
- [ ] revalidateTag migration complete
- [ ] No deprecation warnings

### Wave 4 Checkpoint
- [ ] Circuit breaker implemented
- [ ] Graceful degradation tested
- [ ] Edge cases handled

### Wave 5 Checkpoint
- [ ] generateMetadata working
- [ ] Loading skeletons consistent
- [ ] A11y attributes added
- [ ] Documentation complete

### Wave 6 Checkpoint
- [ ] Baseline metrics captured
- [ ] Regression tests pass
- [ ] Multi-tab E2E passes
- [ ] Chaos tests pass
- [ ] Final audit complete

---

## Critical Path

```
OPT-P0-001 → OPT-001 → OPT-002 → OPT-008 → OPT-015 → OPT-020 → OPT-035 → OPT-037
    ↓                         ↓         ↓         ↑
OPT-P0-002 → OPT-014 → OPT-017 → OPT-021   OPT-046
                                              ↑
                               OPT-040 (AuthProvider Split)
```

**Critical Path Duration**: ~24h

---

_Consolidated Tasks Complete: December 24, 2025_
