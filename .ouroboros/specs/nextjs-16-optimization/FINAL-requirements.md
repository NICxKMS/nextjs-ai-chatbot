# FINAL Requirements: Next.js 16.1.0 Optimization

> **Consolidated from**: requirements.md (v1 → v5)  
> **Finalized**: December 24, 2025  
> **Total Requirements**: 30 (15 P0/P1, 14 P2, 1 P3)  
> **Status**: ✅ Approved

---

## Executive Summary

This document contains all 27 requirements for the Next.js 16.1.0 optimization project in clean EARS format. Requirements span caching, performance, security, UX/A11y, and developer experience domains.

### Requirements by Priority

| Priority      | Count | Domains                                        |
| ------------- | ----- | ---------------------------------------------- |
| P0 (Critical) | 2     | Security (SEV-001, SEV-003)                    |
| P1 (Must)     | 13    | Caching, Security, Performance, Session        |
| P2 (Should)   | 14    | Metadata, UX, A11y, DX, Architecture, Security |
| P3 (Could)    | 1     | Audit Logging                                  |

### Breaking Changes 🔴

- **REQ-004**: `revalidateTag()` now requires profile argument
- **REQ-011**: Multi-tab session sync required
- **REQ-012**: Rate limiting must fail-closed for auth
- **REQ-025**: BroadcastChannel implementation required

### Security Findings 🛡️ (v5 Addition)

- **REQ-028** (P0): `withRateLimit` HOF defaults to `failOpen=true` — MUST change to `false`
- **REQ-029** (P0): Guest model info disclosure via error response — MUST remove sensitive fields
- **REQ-030** (P1): BroadcastChannel missing origin validation — MUST validate against window.location.origin

---

## Glossary

| Term            | Definition                                               |
| --------------- | -------------------------------------------------------- |
| EARS            | Easy Approach to Requirements Syntax                     |
| `"use cache"`   | Next.js 16 directive marking functions for caching       |
| `cacheLife`     | Cache duration profiles (`max`, `hours`, `days`, custom) |
| `cacheTag`      | API for tagging cached data for targeted invalidation    |
| `revalidateTag` | Cache invalidation API (now requires profile argument)   |
| `updateTag`     | Server Actions-only API for immediate cache updates      |
| DataContext     | Current function parameter pattern (userId + userType)   |
| Core Web Vitals | Google's metrics: LCP, INP, CLS                          |

---

## Requirements Matrix

| REQ ID  | Priority | Category       | Wave | Title                              |
| ------- | -------- | -------------- | ---- | ---------------------------------- |
| REQ-001 | P1 🎯    | Caching        | 2    | Adopt "use cache" directive        |
| REQ-002 | P1 🎯    | Caching        | 1    | Configure cacheLife profiles       |
| REQ-003 | P1       | Caching        | 3    | Implement updateTag invalidation   |
| REQ-004 | P1 🔴    | Migration      | 3    | Update revalidateTag signature     |
| REQ-005 | P1 🎯    | Caching        | 1    | Refactor function signatures       |
| REQ-006 | P2       | Metadata       | 5    | Add generateMetadata               |
| REQ-007 | P1 🎯    | Performance    | 6    | Core Web Vitals targets            |
| REQ-008 | P2       | Performance    | 6    | Data fetch performance             |
| REQ-009 | P1 🎯    | Compatibility  | 6    | Backward compatibility             |
| REQ-010 | P2       | Compatibility  | 5    | Incremental rollout support        |
| REQ-011 | P1 🔴    | Session        | 4    | Multi-tab session sync             |
| REQ-012 | P1 🔴    | Security       | 0    | Fail-closed rate limiting          |
| REQ-013 | P1       | Caching        | 2    | Invalidation fallback strategy     |
| REQ-014 | P2       | Caching        | 1    | Cache tag naming convention        |
| REQ-015 | P2       | DX             | 5    | Cache pattern documentation        |
| REQ-016 | P2       | UX             | 5    | Loading state consistency          |
| REQ-017 | P1       | Operations     | 4    | Redis graceful degradation         |
| REQ-018 | P3       | Security       | 5    | Cache invalidation audit log       |
| REQ-019 | P2       | Architecture   | 1    | Split AuthProvider contexts        |
| REQ-020 | P2       | Architecture   | 1    | Consolidate SidebarProvider        |
| REQ-021 | P2       | UX             | 5    | Auth route loading.tsx             |
| REQ-022 | P2       | UX             | 5    | Auth route error.tsx               |
| REQ-023 | P2       | A11y           | 5    | Loading state accessibility        |
| REQ-024 | P1       | Race Condition | 1.5  | Auth flow AbortController          |
| REQ-025 | P1 🔴    | Session        | 1.5  | BroadcastChannel session sync      |
| REQ-026 | P2       | Error Handling | 5    | Auth error boundaries              |
| REQ-027 | P2       | UX             | 5    | Offline detection                  |
| REQ-028 | P0 🔴    | Security       | 0    | Fix withRateLimit HOF default      |
| REQ-029 | P0 🔴    | Security       | 0    | Remove model info from guest error |
| REQ-030 | P2       | Security       | 1.5  | BroadcastChannel origin validation |

---

## Caching Requirements

### REQ-001: Adopt "use cache" Directive for Data Functions

**Priority**: P1 🎯 | **Category**: Caching | **Wave**: 2

**User Story**: As a user, I want chat data to load faster through optimized caching, so that I experience minimal latency when accessing conversations.

**Depends On**: REQ-002, REQ-005, REQ-014

**Acceptance Criteria** (EARS):

1. WHEN `getChatCached()` is called, THE System SHALL use `"use cache"` directive with `cacheTag("chat-{chatId}")`
2. WHEN `getMessagesCached()` is called, THE System SHALL use `"use cache"` directive with `cacheTag("messages-{chatId}")`
3. WHEN `getUserChatsCached()` is called, THE System SHALL use `"use cache"` directive with `cacheTag("user-chats-{userId}")`
4. WHILE cache is valid, THE System SHALL serve cached data without database queries
5. IF database query fails after cache miss, THEN THE System SHALL return graceful error with cached stale data if available

**Target Files**: `lib/data/cached/chat.ts`, `messages.ts`, `documents.ts`, `votes.ts`, `suggestions.ts`

**Verified By**: Unit Test | Performance Test | Integration Test

---

### REQ-002: Configure Custom cacheLife Profiles

**Priority**: P1 🎯 | **Category**: Caching | **Wave**: 1

**User Story**: As a system administrator, I want cache durations to be explicitly defined with domain-specific profiles, so that data freshness is optimized per data type.

**Depends On**: None

**Acceptance Criteria** (EARS):

1. WHEN next.config.ts is loaded, THE System SHALL define `chatMessages` profile (stale: 60s, revalidate: 4h, expire: 24h)
2. WHEN next.config.ts is loaded, THE System SHALL define `userChats` profile (stale: 60s, revalidate: 5m, expire: 2h)
3. WHEN next.config.ts is loaded, THE System SHALL define `documents` profile (stale: 300s, revalidate: 4h, expire: 24h)
4. WHEN next.config.ts is loaded, THE System SHALL define `suggestions` profile (stale: 60s, revalidate: 5m, expire: 1h)
5. WHERE built-in profile suffices, THE System SHALL use `hours` or `minutes` instead of custom

**Profile Configuration**:

```typescript
cacheLife: {
  chatMessages: { stale: 60, revalidate: 14400, expire: 86400 },
  userChats: { stale: 60, revalidate: 300, expire: 7200 },
  documents: { stale: 300, revalidate: 14400, expire: 86400 },
  suggestions: { stale: 60, revalidate: 300, expire: 3600 },
}
```

**Target Files**: `next.config.ts`

**Verified By**: Build Verification | Cache Inspection

---

### REQ-003: Implement Cache Invalidation with updateTag

**Priority**: P1 | **Category**: Caching | **Wave**: 3

**User Story**: As a user, I want my actions to immediately reflect in the UI, so that I have confidence my changes are saved.

**Depends On**: REQ-001, REQ-002

**Acceptance Criteria** (EARS):

1. WHEN a new message is appended, THE System SHALL call `updateTag("messages-{chatId}")`
2. WHEN a chat is created, THE System SHALL call `updateTag("user-chats-{userId}")`
3. WHEN a chat is deleted, THE System SHALL call `updateTag("chat-{chatId}")` AND `updateTag("user-chats-{userId}")`
4. WHEN chat visibility changes, THE System SHALL call `updateTag("chat-{chatId}")`
5. IF updateTag fails, THEN THE System SHALL fall back to `revalidateTag(tag, "max")`

**Target Files**: `features/chat/actions/message.ts`, `visibility.ts`, all Server Action files

**Verified By**: Integration Test | E2E Test

---

### REQ-004: Update revalidateTag Signature 🔴 BREAKING CHANGE

**Priority**: P1 🔴 | **Category**: Migration | **Wave**: 3

**User Story**: As a developer, I want all `revalidateTag` calls updated to the new signature, so that cache invalidation behavior is predictable.

**Depends On**: REQ-002

**Acceptance Criteria** (EARS):

1. WHEN `revalidateTag` is called in Server Actions, THE System SHALL include profile argument
2. WHEN invalidating user-specific data, THE System SHALL use `revalidateTag(tag, "max")`
3. WHEN invalidating shared data, THE System SHALL use `revalidateTag(tag, "hours")`
4. WHERE legacy single-argument calls exist, THE System SHALL migrate to two-argument format
5. WHEN build completes, THE System SHALL produce zero deprecation warnings

**Migration Pattern**:

```typescript
// ❌ Before (deprecated)
revalidateTag("user-chats");

// ✅ After (compliant)
revalidateTag("user-chats", "max");
```

**Verified By**: Static Analysis | Build Verification | Runtime Log Analysis

---

### REQ-005: Refactor Cached Functions for Serializable Arguments

**Priority**: P1 🎯 | **Category**: Caching | **Wave**: 1

**User Story**: As a developer, I want cached functions to accept userId as a direct parameter, so that cache keys are correctly generated.

**Depends On**: None

**Acceptance Criteria** (EARS):

1. WHEN `getChatCached()` is called, THE System SHALL accept `(chatId: string, userId: string)`
2. WHEN `getUserChatsCached()` is called, THE System SHALL accept `(userId: string)`
3. WHEN `getMessagesCached()` is called, THE System SHALL accept `(chatId: string, userId: string)`
4. WHILE refactoring signatures, THE System SHALL maintain backward compatibility via wrapper functions if needed
5. WHERE DataContext is still needed for write operations, THE System SHALL keep original signature for mutation functions

**Signature Changes**:
| Function | Before | After |
|----------|--------|-------|
| `getChatCached` | `(chatId, ctx)` | `(chatId, userId)` |
| `getUserChatsCached` | `(ctx)` | `(userId)` |
| `getMessagesCached` | `(chatId, ctx)` | `(chatId, userId)` |

**Target Files**: `lib/data/cached/*.ts` (6 files)

**Verified By**: TypeScript Compilation | Unit Test | Integration Test

---

### REQ-013: Cache Invalidation Fallback Strategy

**Priority**: P1 | **Category**: Caching | **Wave**: 2

**User Story**: As a developer, I want a consistent cache invalidation strategy that works in both Server Actions and Route Handlers.

**Depends On**: REQ-003, REQ-004

**Acceptance Criteria** (EARS):

1. WHEN cache invalidation is needed in Server Action, THE System SHALL use `updateTag(tag)`
2. WHEN cache invalidation is needed in Route Handler, THE System SHALL use `revalidateTag(tag, "max")`
3. WHERE invalidation context is unknown, THE System SHALL use unified `invalidateCache(tag)` utility
4. WHEN `updateTag` fails, THE System SHALL automatically fall back to `revalidateTag(tag, "max")`
5. IF both methods fail, THEN THE System SHALL log error and continue (eventual consistency)

**Target Files**: `lib/cache-ops/invalidation.ts` (new), `app/api/*/route.ts`, `features/*/actions/*.ts`

**Verified By**: Integration Test | Unit Test

---

### REQ-014: Cache Tag Naming Convention

**Priority**: P2 | **Category**: Caching | **Wave**: 1

**User Story**: As a developer, I want a consistent cache tag naming convention, so that tags are predictable and don't collide.

**Depends On**: REQ-001

**Acceptance Criteria** (EARS):

1. WHEN tagging user-specific cache, THE System SHALL use format `user-{entity}-{userId}`
2. WHEN tagging entity-specific cache, THE System SHALL use format `{entity}-{id}`
3. WHEN tagging relationship cache, THE System SHALL use format `{parent}-{child}-{parentId}`
4. WHERE batch invalidation is needed, THE System SHALL use hierarchy prefix matching
5. IF developer uses non-conforming tag, THEN ESLint SHALL warn

**Tag Schema**:

```typescript
const CacheTags = {
  chat: (chatId: string) => `chat-${chatId}`,
  userChats: (userId: string) => `user-chats-${userId}`,
  chatMessages: (chatId: string) => `chat-messages-${chatId}`,
  document: (docId: string) => `document-${docId}`,
  suggestions: (docId: string, userId: string) =>
    `suggestions-${docId}-${userId}`,
};
```

**Target Files**: `lib/cache/tags.ts` (new)

**Verified By**: Code Review | Lint Rule | Static Analysis

---

## Security Requirements

### REQ-012: Fail-Closed Rate Limiting for Auth Endpoints 🔴 HIGH RISK

**Priority**: P1 🔴 | **Category**: Security | **Wave**: 0

**User Story**: As a security administrator, I want authentication endpoints to fail closed when rate limiting is unavailable, so that brute force attacks cannot bypass protection.

**Depends On**: None

**Acceptance Criteria** (EARS):

1. WHEN Redis is unavailable AND request targets `/api/auth/*`, THE System SHALL return 503 Service Unavailable
2. WHEN Redis is unavailable AND request targets `/api/chat`, THE System SHALL apply in-memory fallback (10 req/min)
3. WHILE Redis is down, THE System SHALL log rate limit bypass attempts
4. IF rate limit Redis timeout exceeds 1000ms, THEN THE System SHALL treat as unavailable
5. WHERE endpoint is classified as "sensitive", THE System SHALL always fail-closed

**Endpoint Classification**:
| Endpoint Pattern | Classification | Fail Behavior |
|-----------------|----------------|---------------|
| `/api/auth/*` | Sensitive | Fail-Closed (503) |
| `/api/chat` | Standard | Fail-Open with Memory Limit |
| `/api/files/upload` | Sensitive | Fail-Closed (503) |

**Target Files**: `lib/middleware/rate-limit.ts`, `lib/middleware/rate-limit-config.ts` (new)

**Verified By**: Integration Test | Chaos Engineering | Security Audit

---

### REQ-028: Fix withRateLimit HOF Default to Fail-Closed 🔴 SECURITY CRITICAL

**Priority**: P0 🔴 | **Category**: Security | **Wave**: 0 | **Severity**: HIGH (SEV-001)

**User Story**: As a security administrator, I want the rate limiting wrapper to fail securely by default, so that attackers cannot bypass rate limiting.

**Depends On**: REQ-012

**Security Finding**:

- **Location**: `lib/middleware/rate-limit.ts:391`
- **Issue**: `withRateLimit` HOF defaults to `failOpen = true`, allowing requests when rate limiter fails
- **Risk**: Attackers can bypass rate limiting during Redis outages or errors

**Acceptance Criteria** (EARS):

1. WHEN `withRateLimit` is used without explicit `failOpen` parameter, THE System SHALL default to `failOpen = false`
2. WHEN rate limiting fails AND `failOpen = false`, THE System SHALL return 503 Service Unavailable
3. WHERE endpoint requires fail-open behavior explicitly, THE System SHALL require explicit `failOpen: true` parameter
4. IF legacy code relies on fail-open default, THEN THE System SHALL log deprecation warning
5. WHEN rate limit check fails, THE System SHALL log the failure with structured context

**Fix**:

```typescript
// ❌ Before (insecure)
export function withRateLimit(config: { failOpen?: boolean } = {}) {
  const { failOpen = true } = config;  // Line 391

// ✅ After (secure)
export function withRateLimit(config: { failOpen?: boolean } = {}) {
  const { failOpen = false } = config;  // Fail-closed by default
```

**Target Files**: `lib/middleware/rate-limit.ts`

**Verified By**: Security Audit | Integration Test | Chaos Engineering

---

### REQ-029: Remove Model Info from Guest Error Response 🔴 SECURITY CRITICAL

**Priority**: P0 🔴 | **Category**: Security | **Wave**: 0 | **Severity**: HIGH (SEV-003)

**User Story**: As a security administrator, I want error responses to not disclose internal model configuration, so that attackers cannot enumerate available models.

**Depends On**: None

**Security Finding**:

- **Location**: `app/api/chat/route.ts:220`
- **Issue**: Error response includes `modelId` and `allowedModels` when guest tries restricted model
- **Risk**: Information disclosure enables attackers to enumerate internal model configuration

**Acceptance Criteria** (EARS):

1. WHEN guest user requests restricted model, THE System SHALL NOT include `modelId` in error response
2. WHEN guest user requests restricted model, THE System SHALL NOT include `allowedModels` array in error response
3. WHEN returning model access error, THE System SHALL use generic message without specifics
4. WHERE debugging is needed, THE System SHALL log full details server-side only
5. IF error occurs, THEN THE System SHALL return sanitized error with correlation ID only

**Fix**:

```typescript
// ❌ Before (information disclosure)
return new Response(
  JSON.stringify({
    error: "Model not allowed for guests",
    modelId: selectedModelId, // Line 220 - REMOVE
    allowedModels: guestAllowedModels, // REMOVE
  }),
  { status: 403 }
);

// ✅ After (secure)
return new Response(
  JSON.stringify({
    error: "Access denied",
    code: "MODEL_ACCESS_DENIED",
  }),
  { status: 403 }
);
```

**Target Files**: `app/api/chat/route.ts`

**Verified By**: Security Audit | Penetration Test | Code Review

---

### REQ-030: Add BroadcastChannel Origin Validation

**Priority**: P2 | **Category**: Security | **Wave**: 1.5 | **Severity**: MEDIUM (SEV-008)

**User Story**: As a security administrator, I want BroadcastChannel messages to be origin-validated, so that cross-origin attacks cannot manipulate session state.

**Depends On**: REQ-025

**Security Finding**:

- **Location**: BroadcastChannel implementation (REQ-025)
- **Issue**: Missing origin validation allows messages from different origins
- **Risk**: Cross-origin tab injection attacks could manipulate session sync

**Acceptance Criteria** (EARS):

1. WHEN receiving BroadcastChannel message, THE System SHALL validate origin matches `window.location.origin`
2. WHEN message origin is invalid, THE System SHALL ignore message and log warning
3. WHILE sending BroadcastChannel message, THE System SHALL include origin field
4. WHERE fallback to localStorage is used, THE System SHALL validate storage event origin
5. IF origin validation fails repeatedly (>10/minute), THEN THE System SHALL disable cross-tab sync temporarily

**Implementation Pattern**:

```typescript
// Session sync message validation
interface SessionMessage {
  type: "SESSION_LOGIN" | "SESSION_LOGOUT";
  origin: string; // Required for validation
  payload: unknown;
  timestamp: number;
}

channel.onmessage = (event: MessageEvent<SessionMessage>) => {
  // Validate origin before processing
  if (event.data.origin !== window.location.origin) {
    console.warn("BroadcastChannel: origin mismatch", event.data.origin);
    return; // Ignore invalid origin
  }
  // Process valid message...
};
```

**Target Files**: `lib/auth/session-sync.ts`, `features/auth/hooks/use-session-sync.ts`

**Verified By**: Security Audit | Cross-Origin Test | Integration Test

---

### REQ-018: Cache Invalidation Audit Log

**Priority**: P3 | **Category**: Security | **Wave**: 5

**User Story**: As a security auditor, I want to review cache invalidation events, so that I can detect unusual patterns.

**Depends On**: REQ-003, REQ-013

**Acceptance Criteria** (EARS):

1. WHEN cache is invalidated, THE System SHALL log event with userId, tag, and method used
2. WHEN bulk invalidation occurs, THE System SHALL log with aggregate count
3. WHERE invalidation rate exceeds 100/minute, THE System SHALL alert
4. IF unauthorized invalidation attempt detected, THEN THE System SHALL block and alert
5. WHEN reviewing audit logs, THE analyst SHALL be able to filter by user, tag, and time range

**Target Files**: `lib/cache-ops/invalidation.ts`, `lib/utils/logger.ts`

**Verified By**: Log Analysis | Security Audit

---

## Session Requirements

### REQ-011: Multi-Tab Session Synchronization 🔴 HIGH RISK

**Priority**: P1 🔴 | **Category**: Session | **Wave**: 4

**User Story**: As a guest user with multiple tabs open, I want my session to be synchronized across tabs, so that I don't lose data.

**Depends On**: None

**Acceptance Criteria** (EARS):

1. WHEN a guest session is created, THE System SHALL broadcast via BroadcastChannel to other tabs
2. WHEN a tab receives session broadcast, THE System SHALL adopt the existing session
3. WHILE multiple tabs are open, THE System SHALL maintain single source of truth for session
4. IF session creation race occurs, THEN THE System SHALL use first-writer-wins strategy
5. WHEN BroadcastChannel is unavailable (Safari <15.4), THE System SHALL use localStorage event fallback

**Target Files**: `features/auth/components/auth-bootstrap.tsx`, `lib/auth/session-sync.ts` (new)

**Verified By**: E2E Test | Manual Multi-Tab Test

---

### REQ-025: Implement BroadcastChannel Multi-Tab Session Sync 🔴 HIGH PRIORITY

**Priority**: P1 🔴 | **Category**: Session | **Wave**: 1.5

**User Story**: As a user with multiple tabs open, I want my session to stay synchronized, so that I don't experience inconsistent state.

**Depends On**: REQ-011

**Acceptance Criteria** (EARS):

1. WHEN user logs in, THE System SHALL broadcast `SESSION_LOGIN` event to all tabs
2. WHEN user logs out, THE System SHALL broadcast `SESSION_LOGOUT` event to all tabs
3. WHEN tab receives session event, THE System SHALL update local state within 100ms
4. WHILE BroadcastChannel unavailable (Safari <15.4), THE System SHALL use localStorage events
5. IF tab goes offline then online, THEN THE System SHALL re-sync session state

**Target Files**: `lib/auth/session-sync.ts` (new), `features/auth/hooks/use-session-sync.ts` (new)

**Verified By**: Multi-Tab E2E Test | Browser Compatibility Test

---

## Performance Requirements

### REQ-007: Core Web Vitals Targets

**Priority**: P1 🎯 | **Category**: Performance | **Wave**: 6

**User Story**: As a user, I want the application to load quickly and feel responsive.

**Depends On**: REQ-001, REQ-002, REQ-003

**Acceptance Criteria** (EARS):

1. WHEN the home page loads, THE System SHALL achieve First Contentful Paint (FCP) < 1.5 seconds
2. WHEN the chat page loads, THE System SHALL achieve Largest Contentful Paint (LCP) < 2.5 seconds
3. WHILE user interacts with chat input, THE System SHALL maintain Interaction to Next Paint (INP) < 200ms
4. WHEN page renders, THE System SHALL achieve Cumulative Layout Shift (CLS) < 0.1
5. WHEN API requests are made, THE System SHALL achieve Time to First Byte (TTFB) < 500ms on cache hit

**Verified By**: Lighthouse Audit | Core Web Vitals Report | Real User Monitoring

---

### REQ-008: Data Fetch Performance

**Priority**: P2 | **Category**: Performance | **Wave**: 6

**User Story**: As a developer, I want data fetching to be optimized, so that database load is reduced.

**Depends On**: REQ-002, REQ-003

**Acceptance Criteria** (EARS):

1. WHEN cached data is requested, THE System SHALL return response in < 50ms (P95)
2. WHEN cache miss occurs, THE System SHALL fetch and cache result in < 300ms (P95)
3. WHILE under load (100 concurrent users), THE System SHALL maintain < 200ms response time
4. WHEN parallel data loading is used, THE System SHALL execute all independent fetches concurrently
5. IF database is unavailable, THEN THE System SHALL serve stale cache with indicator for up to 1 hour

**Verified By**: Performance Monitoring | Load Testing

---

## Metadata Requirements

### REQ-006: Add generateMetadata to Dynamic Chat Route

**Priority**: P2 | **Category**: Metadata | **Wave**: 5

**User Story**: As a user sharing chat links, I want shared chats to have proper titles and descriptions.

**Depends On**: REQ-001

**Acceptance Criteria** (EARS):

1. WHEN a chat page is rendered, THE System SHALL generate metadata with chat title from database
2. WHEN chat title is unavailable, THE System SHALL fallback to "AI Chat - [date]" format
3. WHEN generating metadata, THE System SHALL include Open Graph tags for social sharing
4. IF chat is private and user unauthorized, THEN THE System SHALL return generic metadata
5. WHERE chat has `visibility: "public"`, THE System SHALL include full title and description

**Target Files**: `app/(chat)/chat/[id]/page.tsx`

**Verified By**: Manual QA | Lighthouse Audit | Social Media Preview Test

---

## UX/A11y Requirements

### REQ-016: Loading State Consistency

**Priority**: P2 | **Category**: UX | **Wave**: 5

**User Story**: As a user, I want consistent loading indicators across the app.

**Depends On**: REQ-001

**Acceptance Criteria** (EARS):

1. WHEN data is loading, THE System SHALL show consistent Suspense skeleton
2. WHEN cache miss causes >100ms delay, THE System SHALL show skeleton (not blank)
3. WHILE streaming response, THE System SHALL show partial content + loading indicator
4. IF cache hit is <50ms, THEN THE System SHALL show content immediately (no skeleton flash)
5. WHERE error occurs, THE System SHALL show error boundary with retry option

**Target Files**: `components/ui/skeletons/`, `app/(chat)/chat/[id]/page.tsx`

**Verified By**: Visual Regression Test | Manual QA

---

### REQ-021: Add Auth Route Loading States

**Priority**: P2 | **Category**: UX | **Wave**: 5

**User Story**: As a user navigating to login/register, I want to see a loading indicator.

**Depends On**: None

**Acceptance Criteria** (EARS):

1. WHEN navigating to `/login`, THE System SHALL display `LoginSkeleton` loading state
2. WHEN navigating to `/register`, THE System SHALL display `RegisterSkeleton` loading state
3. WHILE loading auth page, THE System SHALL show form skeleton with appropriate dimensions
4. WHERE auth route has Suspense boundary, THE loading state SHALL integrate seamlessly
5. IF loading exceeds 300ms, THEN skeleton SHALL animate to indicate progress

**Target Files**: `app/(auth)/login/loading.tsx` (new), `app/(auth)/register/loading.tsx` (new)

**Verified By**: Visual Regression Test | Playwright Test

---

### REQ-022: Add Auth Route Error Handling

**Priority**: P2 | **Category**: UX | **Wave**: 5

**User Story**: As a user experiencing an error on login/register, I want to see a helpful error message.

**Depends On**: None

**Acceptance Criteria** (EARS):

1. WHEN error occurs in `/login` route, THE System SHALL display error UI with message
2. WHEN error occurs in `/register` route, THE System SHALL display error UI with message
3. WHILE error is displayed, THE System SHALL offer "Try Again" action
4. WHERE error is network-related, THE System SHALL show appropriate offline message
5. IF error is recoverable, THEN "Try Again" SHALL reset the error boundary

**Target Files**: `app/(auth)/login/error.tsx` (new), `app/(auth)/register/error.tsx` (new)

**Verified By**: Error Injection Test | E2E Test

---

### REQ-023: Add Accessibility Attributes to Loading States

**Priority**: P2 | **Category**: A11y | **Wave**: 5

**User Story**: As a screen reader user, I want loading states to be announced.

**Depends On**: None

**Acceptance Criteria** (EARS):

1. WHEN loading state is displayed, THE System SHALL include `role="status"` attribute
2. WHEN loading state is displayed, THE System SHALL include `aria-label="Loading"` attribute
3. WHILE loading, THE System SHALL include `aria-busy="true"` on container
4. WHERE skeleton is animated, THE System SHALL use `aria-hidden="true"` on decorative elements
5. IF loading completes, THEN screen reader SHALL be notified via live region

**Target Files**: `app/(chat)/chat/[id]/loading.tsx`, `app/(auth)/*/loading.tsx`

**Verified By**: Axe Audit | Screen Reader Test

---

### REQ-027: Add Offline Detection to Loading States

**Priority**: P2 | **Category**: UX | **Wave**: 5

**User Story**: As a user on unstable network, I want to know if I'm offline.

**Depends On**: None

**Acceptance Criteria** (EARS):

1. WHEN loading state is displayed AND navigator.onLine is false, THE System SHALL show offline message
2. WHEN user goes offline during load, THE System SHALL update to show offline status
3. WHILE offline, THE System SHALL show cached content if available
4. IF user comes back online, THEN THE System SHALL automatically retry loading
5. WHERE offline detection unavailable, THE System SHALL fall back to timeout-based detection

**Target Files**: `hooks/use-online-status.ts` (new), `components/offline-indicator.tsx` (new)

**Verified By**: Network Throttle Test | Manual Offline Test

---

## Architecture Requirements

### REQ-019: Split AuthProvider into State/Dispatch Contexts

**Priority**: P2 | **Category**: Architecture | **Wave**: 1

**User Story**: As a developer, I want auth context split into separate state and dispatch contexts, so that components only re-render when their specific data changes.

**Depends On**: None

**Acceptance Criteria** (EARS):

1. WHEN AuthProvider mounts, THE System SHALL provide separate `AuthStateContext` and `AuthDispatchContext`
2. WHEN auth dispatch is called, THE System SHALL only re-render components consuming dispatch context
3. WHILE auth state changes, THE System SHALL only re-render components consuming state context
4. WHERE component needs both state and dispatch, THE System SHALL allow consuming both contexts
5. IF legacy `useAuth()` hook is called, THEN THE System SHALL continue working via compatibility wrapper

**Target Files**: `features/auth/components/auth-provider.tsx`, `features/auth/hooks/use-auth.ts`

**Verified By**: React DevTools Profiler | Integration Test

---

### REQ-020: Consolidate Duplicate SidebarProvider Implementations

**Priority**: P2 | **Category**: Architecture | **Wave**: 1

**User Story**: As a developer, I want a single source of truth for sidebar state.

**Depends On**: None

**Acceptance Criteria** (EARS):

1. WHEN sidebar state is needed, THE System SHALL provide single `SidebarProvider` from canonical location
2. WHEN legacy import path is used, THE System SHALL re-export from canonical location
3. WHILE consolidating, THE System SHALL maintain all existing functionality
4. WHERE duplicate exists, THE System SHALL remove after verifying all usages migrated
5. IF import from deprecated path, THEN TypeScript/ESLint SHALL warn

**Target Files**: `features/sidebar/components/sidebar-provider.tsx`, `components/ui/sidebar.tsx`

**Verified By**: Static Analysis | Import Graph Analysis

---

## Race Condition Requirements

### REQ-024: Add AbortController to Auth Flows

**Priority**: P1 | **Category**: Race Condition | **Wave**: 1.5

**User Story**: As a user rapidly clicking login/register, I want previous requests to be cancelled.

**Depends On**: None

**Acceptance Criteria** (EARS):

1. WHEN login form submits, THE System SHALL create AbortController for the request
2. WHEN new login request starts, THE System SHALL abort any pending login request
3. WHILE request is in-flight, THE System SHALL disable submit button
4. IF request is aborted, THEN THE System SHALL not update state from aborted response
5. WHEN component unmounts, THE System SHALL abort pending auth requests

**Target Files**: `features/auth/actions/login.ts`, `register.ts`, `*-form.tsx` components

**Verified By**: Integration Test | Manual Rapid-Click Test

---

## Operations Requirements

### REQ-017: Redis Failure Graceful Degradation

**Priority**: P1 | **Category**: Operations | **Wave**: 4

**User Story**: As an operations engineer, I want the application to gracefully degrade when Redis is unavailable.

**Depends On**: REQ-012

**Acceptance Criteria** (EARS):

1. WHEN Redis connection fails, THE System SHALL open circuit breaker after 5 failures in 10 seconds
2. WHILE circuit breaker is open, THE System SHALL bypass Redis and use database directly
3. WHEN circuit breaker half-opens, THE System SHALL test Redis with single request
4. IF Redis recovers, THEN THE System SHALL close circuit breaker and resume caching
5. WHERE Redis is unavailable, THE System SHALL log degradation state with structured metrics

**Degradation Behavior**:
| Component | Redis Available | Redis Unavailable |
|-----------|----------------|-------------------|
| Session Cache | Redis (30s TTL) | Database (each request) |
| Chat Cache | Redis + framework | Database + framework |
| Rate Limiting | Upstash Ratelimit | Memory fallback (REQ-012) |

**Target Files**: `lib/cache/circuit-breaker.ts`, `lib/services/session-manager.ts`

**Verified By**: Chaos Engineering | Integration Test

---

## Compatibility Requirements

### REQ-009: Backward Compatibility

**Priority**: P1 🎯 | **Category**: Compatibility | **Wave**: 6

**User Story**: As a user, I want all existing functionality to continue working after optimization.

**Depends On**: All other requirements

**Acceptance Criteria** (EARS):

1. WHEN any optimization is applied, THE System SHALL maintain all existing functionality
2. WHEN cache is introduced, THE System SHALL support both authenticated and guest user flows
3. WHILE migrating revalidateTag calls, THE System SHALL not change cache invalidation behavior
4. WHEN function signatures change (REQ-005), THE System SHALL update all call sites to match
5. IF any regression is detected, THEN THE implementation SHALL be rolled back

**Regression Test Coverage**:

- Guest user chat flow
- Authenticated user chat flow
- Message sending/receiving
- Chat history loading
- Document creation/versioning
- Vote and suggestion functionality

**Verified By**: E2E Test Suite | Regression Testing | User Acceptance Testing

---

### REQ-010: Incremental Rollout Support

**Priority**: P2 | **Category**: Compatibility | **Wave**: 5

**User Story**: As a developer, I want to roll out optimizations incrementally.

**Depends On**: None

**Acceptance Criteria** (EARS):

1. WHEN deploying cache changes, THE System SHALL support A/B testing via feature flags
2. WHEN issues are detected, THE System SHALL allow rollback without code deployment
3. WHILE in rollout phase, THE System SHALL log cache hit/miss rates for monitoring
4. WHERE performance degrades, THE System SHALL automatically disable new cache patterns
5. IF cache errors exceed 1% error rate, THEN THE System SHALL alert and consider auto-rollback

**Target Files**: `lib/flags/*.ts`

**Verified By**: Staging Environment Test | Feature Flag Verification

---

## DX Requirements

### REQ-015: Cache Pattern Documentation

**Priority**: P2 | **Category**: DX | **Wave**: 5

**User Story**: As a developer, I want clear documentation for when to use `updateTag` vs `revalidateTag`.

**Depends On**: REQ-003, REQ-004

**Acceptance Criteria** (EARS):

1. WHEN developer needs to invalidate cache, THE System documentation SHALL provide decision flowchart
2. WHEN using `"use cache"` pattern, THE documentation SHALL include code examples
3. WHERE pattern is deprecated, THE documentation SHALL include migration guide
4. IF developer uses deprecated pattern, THEN IDE SHALL show inline documentation link
5. WHEN onboarding new developer, THE documentation SHALL enable self-service understanding

**Deliverables**: `docs/caching/decision-flowchart.md`, `docs/caching/migration-guide.md`, `docs/caching/examples/`

**Verified By**: Code Review | Developer Survey

---

## Error Handling Requirements

### REQ-026: Add Error Boundaries for Auth Routes

**Priority**: P2 | **Category**: Error Handling | **Wave**: 5

**User Story**: As a user, I want auth errors to be caught and handled gracefully.

**Depends On**: REQ-022

**Acceptance Criteria** (EARS):

1. WHEN error occurs in auth route child, THE System SHALL catch at route error boundary
2. WHEN auth error is caught, THE System SHALL display user-friendly message
3. WHILE error boundary is active, THE System SHALL offer recovery options
4. WHERE error is authentication-related, THE System SHALL offer re-login option
5. IF error is transient, THEN "Try Again" SHALL remount the component tree

**Target Files**: `app/(auth)/layout.tsx`, `components/auth-error-fallback.tsx` (new)

**Verified By**: Error Injection Test | E2E Test

---

## Dependency Graph

```
Wave 0 (P0 Security) 🛡️
├── REQ-012 (Fail-Closed Rate Limit) 🔴
├── REQ-028 (Fix withRateLimit HOF Default) 🔴 ──→ REQ-012
└── REQ-029 (Remove Model Info from Error) 🔴

Wave 1 (Foundation)
├── REQ-002 (cacheLife profiles) ──────────┐
├── REQ-005 (Function signatures) ─────────┼──→ REQ-001 (use cache)
├── REQ-014 (Tag naming) ──────────────────┘
├── REQ-019 (AuthProvider split)
└── REQ-020 (SidebarProvider consolidate)

Wave 1.5 (Risk Mitigation) 🔴
├── REQ-024 (AbortController)
├── REQ-025 (BroadcastChannel) ──→ REQ-011 (Multi-tab sync)
└── REQ-030 (BroadcastChannel Origin Validation) ──→ REQ-025

Wave 2-3 (Caching + Invalidation)
├── REQ-001 ──→ REQ-003 (updateTag)
├── REQ-003 ──→ REQ-004 (revalidateTag) 🔴
├── REQ-013 (Fallback strategy)
└── REQ-004 + REQ-003 ──→ REQ-015 (Documentation)

Wave 4 (Edge Cases)
├── REQ-011 (Multi-tab sync)
├── REQ-017 (Redis degradation)
└── REQ-016 (Loading consistency)

Wave 5 (UX/DX/A11y)
├── REQ-006, REQ-010, REQ-015, REQ-018
├── REQ-021, REQ-022, REQ-023, REQ-026, REQ-027

Wave 6 (Verification)
├── REQ-007 (Web Vitals)
├── REQ-008 (Data performance)
└── REQ-009 (Backward compatibility)
```

---

## Edge Cases

| ID     | Scenario                               | Expected Behavior                   | Related REQ      |
| ------ | -------------------------------------- | ----------------------------------- | ---------------- |
| EC-001 | Cache unavailable (Redis down)         | Fall back to database               | REQ-001, REQ-017 |
| EC-002 | Database unavailable                   | Serve stale cache with warning      | REQ-001, REQ-008 |
| EC-003 | Concurrent cache invalidation          | Last write wins                     | REQ-003          |
| EC-004 | Non-serializable argument              | TypeScript error at compile time    | REQ-005          |
| EC-005 | Cache tag collision                    | Namespace tags by feature           | REQ-014          |
| EC-006 | Private chat metadata request          | Return generic metadata             | REQ-006          |
| EC-007 | revalidateTag without profile          | Deprecated warning                  | REQ-004          |
| EC-008 | Large chat history (>1000 messages)    | Paginate cache                      | REQ-008          |
| EC-009 | Simultaneous read/write                | Read-your-writes via updateTag      | REQ-003          |
| EC-010 | Deployment during active sessions      | Graceful transition                 | REQ-009          |
| EC-011 | Multi-tab guest session race 🔴        | BroadcastChannel sync               | REQ-011, REQ-025 |
| EC-012 | Redis unavailable during auth 🔴       | Fail-closed (503)                   | REQ-012          |
| EC-013 | updateTag in Route Handler             | Fallback to revalidateTag           | REQ-013          |
| EC-014 | Cache invalidation from webhook        | Use invalidateCache utility         | REQ-013, REQ-018 |
| EC-015 | Rapid double-click login               | AbortController cancels previous    | REQ-024          |
| EC-016 | Auth error during form submit          | Error boundary catches              | REQ-022, REQ-026 |
| EC-017 | User goes offline during load          | Offline indicator shown             | REQ-027          |
| EC-018 | Screen reader on loading state         | Announces via aria-live             | REQ-023          |
| EC-019 | Tab A logout, Tab B active             | Tab B receives logout broadcast     | REQ-025          |
| EC-020 | Safari <15.4 multi-tab sync            | Falls back to localStorage events   | REQ-025          |
| EC-021 | AuthProvider re-render cascade         | Split contexts prevent cascade      | REQ-019          |
| EC-022 | withRateLimit default during outage 🔴 | Fail-closed (503)                   | REQ-028          |
| EC-023 | Guest requests restricted model 🔴     | Generic error, no model info        | REQ-029          |
| EC-024 | Cross-origin BroadcastChannel message  | Ignored, logged as warning          | REQ-030          |
| EC-025 | Origin spoofing attempt (>10/min)      | Cross-tab sync temporarily disabled | REQ-030          |

---

## Non-Functional Requirements

### Performance Metrics

| Metric         | Requirement     | Measurement       |
| -------------- | --------------- | ----------------- |
| FCP            | < 1.5s (P75)    | Lighthouse, RUM   |
| LCP            | < 2.5s (P75)    | Core Web Vitals   |
| INP            | < 200ms (P75)   | Core Web Vitals   |
| CLS            | < 0.1           | Lighthouse        |
| TTFB           | < 500ms (P95)   | Server monitoring |
| Cache Hit Rate | > 80% for reads | Cache analytics   |
| Cache Response | < 50ms (P95)    | APM               |
| DB Fallback    | < 300ms (P95)   | APM               |

### Security

| Requirement               | Implementation         | Verification        |
| ------------------------- | ---------------------- | ------------------- |
| Cache isolation           | User-scoped cache keys | Integration tests   |
| Serializable args only    | TypeScript enforcement | Compile-time checks |
| No sensitive data in keys | Hash or omit PII       | Code review         |

### Reliability

| Metric         | Requirement          | Measurement    |
| -------------- | -------------------- | -------------- |
| Availability   | 99.9% uptime         | Monitoring     |
| Cache Fallback | Graceful degradation | Chaos testing  |
| Error Rate     | < 0.1% increase      | Error tracking |
| Recovery Time  | < 30 seconds         | Incident drill |

---

## Out of Scope

- ❌ Proxy.ts Migration — No `unstable_noStore` usage found
- ❌ React 19 Hook Migrations — `useActionState`, `use` hook deferred
- ❌ View Transitions Implementation — Already enabled
- ❌ Context Provider Syntax Update — Low priority
- ❌ forwardRef Removal — React 19 nice-to-have
- ❌ Database Schema Changes — No ORM migrations
- ❌ New Feature Development — Focus on optimization
- ❌ Third-party Service Migrations — Unchanged
- ❌ Mobile App Considerations — Web-only scope
- ❌ Admin Dashboard — Separate spec required
- ❌ Analytics Integration — Separate workstream

---

_Consolidated Requirements v5 Complete: December 24, 2025_
_Security Findings Added: SEV-001, SEV-003, SEV-008_
