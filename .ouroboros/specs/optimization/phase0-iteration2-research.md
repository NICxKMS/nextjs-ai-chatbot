# Informed Research Report - Phase 0 (Iteration 2)

> **Phase**: Research - Second Pass (Informed)  
> **Input**: ADR decisions, Phase 0-2 gaps  
> **Created**: 2024-12-24  
> **Status**: 🟢 Complete

---

## Executive Summary

This informed research report provides **implementation-ready documentation** for the Next.js 16.1.0 caching optimization project. Based on gaps identified in Phase 0-2, this report delivers:

1. **Complete `"use cache"` implementation guide** with exact syntax for our codebase
2. **`cacheLife` profile recommendations** tailored to our data access patterns
3. **Cache invalidation strategy** using `updateTag()` vs `revalidateTag()` decision matrix
4. **`connection()` migration guide** from `unstable_noStore`
5. **PPR assessment** for candidate routes

---

## 1. "use cache" Implementation Guide

### 1.1 Syntax Reference

The `"use cache"` directive can be placed at three levels:

```typescript
// File level - all exports cached
"use cache";
import { cacheLife, cacheTag } from "next/cache";

export async function getData() {
  cacheTag("my-data");
  cacheLife("hours");
  return await fetch("/api/data");
}
```

```typescript
// Function level - single function cached
export async function getData() {
  "use cache";
  cacheTag("my-data");
  cacheLife("hours");
  return await fetch("/api/data");
}
```

```typescript
// Component level - component output cached
export async function MyComponent() {
  "use cache";
  cacheLife("days");
  const data = await fetchData();
  return <div>{data}</div>;
}
```

### 1.2 Cache Key Generation

Cache keys are automatically generated from:

1. **Build ID** - Unique per build, invalidates all cache entries on deploy
2. **Function ID** - Secure hash of function location/signature
3. **Serializable arguments** - Props (components) or function arguments
4. **Closure variables** - Automatically captured from outer scope

**Critical**: All arguments must be serializable. Supported types:

- ✅ Primitives: `string`, `number`, `boolean`, `null`, `undefined`
- ✅ Plain objects: `{ key: value }`
- ✅ Arrays, Dates, Maps, Sets, TypedArrays
- ❌ Class instances, Functions (except pass-through), Symbols, URLs

### 1.3 Implementation for Our Codebase

**Target files for migration**: `lib/data/cached/*.ts` (6 files)

#### Before (Current Pattern):

```typescript
// lib/data/cached/chat.ts
export async function getChatCached(
  chatId: string,
  ctx: DataContext
): Promise<Chat | null> {
  const cached = await getChatFromCache(chatId, ctx.userId);
  if (cached) return cachedChatToChat(cached);
  // ... manual cache logic
}
```

#### After (with "use cache"):

```typescript
// lib/data/cached/chat.ts
import { cacheLife, cacheTag } from "next/cache";

export async function getChatCached(
  chatId: string,
  userId: string // Note: Extracted from ctx for serialization
): Promise<Chat | null> {
  "use cache";
  cacheTag(`chat-${chatId}`, `user-chats-${userId}`);
  cacheLife("hours");

  // Direct DB fetch - framework handles caching
  return await getChat(chatId, { userId, userType: "regular" });
}
```

### 1.4 User-Specific Caching Strategy

**Question answered**: How to handle dynamic data with user-specific caching?

**Solution**: Pass user ID as a serializable argument (not in context object):

```typescript
// ✅ CORRECT: userId as argument (becomes cache key part)
export async function getUserChatsCached(userId: string) {
  "use cache";
  cacheTag(`user-chats-${userId}`);
  cacheLife("hours");
  return await listChats({ userId, userType: "regular" });
}

// ❌ WRONG: ctx object may not serialize correctly
export async function getUserChatsCached(ctx: DataContext) {
  "use cache"; // Will fail - ctx has non-serializable fields
  return await listChats(ctx);
}
```

### 1.5 Error Handling Within Cached Functions

Errors thrown inside `"use cache"` functions are **not cached**. The cache only stores successful return values:

```typescript
export async function getDataSafely(id: string) {
  "use cache";
  cacheTag(`data-${id}`);
  cacheLife("hours");

  const data = await fetchData(id);
  if (!data) {
    // Short cache for "not found" to reduce load
    cacheLife("minutes"); // Conditional cacheLife
    return null;
  }
  return data;
}
```

---

## 2. cacheLife Configuration

### 2.1 Built-in Profiles Reference

| Profile   | stale (client) | revalidate (server) | expire   |
| --------- | -------------- | ------------------- | -------- |
| `default` | 5 minutes      | 15 minutes          | 1 year   |
| `seconds` | 30 seconds     | 1 second            | 1 minute |
| `minutes` | 5 minutes      | 1 minute            | 1 hour   |
| `hours`   | 5 minutes      | 1 hour              | 1 day    |
| `days`    | 5 minutes      | 1 day               | 1 week   |
| `weeks`   | 5 minutes      | 1 week              | 30 days  |
| `max`     | 5 minutes      | 30 days             | 1 year   |

### 2.2 Custom Profile Definition in next.config.ts

**Question answered**: How to define custom profiles?

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true, // ✅ Already enabled in project
  reactCompiler: true, // ✅ Already enabled in project

  // Custom cache profiles
  cacheLife: {
    // Chat messages - frequently updated
    chatMessages: {
      stale: 60, // 1 minute client cache
      revalidate: 300, // 5 minute server revalidate
      expire: 3600, // 1 hour max lifetime
    },
    // User chat list - medium freshness
    userChats: {
      stale: 300, // 5 minutes client cache
      revalidate: 900, // 15 minute server revalidate
      expire: 7200, // 2 hour max lifetime
    },
    // Documents - less frequent updates
    documents: {
      stale: 300, // 5 minutes client cache
      revalidate: 1800, // 30 minute server revalidate
      expire: 86400, // 24 hour max lifetime
    },
    // Suggestions - can be cached longer
    suggestions: {
      stale: 600, // 10 minutes client cache
      revalidate: 3600, // 1 hour server revalidate
      expire: 86400, // 24 hour max lifetime
    },
  },
};

export default nextConfig;
```

### 2.3 Recommended Profiles for Our Data

| Data Type      | Recommended Profile     | Rationale                           |
| -------------- | ----------------------- | ----------------------------------- |
| Chat metadata  | `hours`                 | Changes infrequently after creation |
| Chat messages  | `chatMessages` (custom) | User expects recent messages        |
| User chat list | `userChats` (custom)    | Balance freshness vs load           |
| Documents      | `documents` (custom)    | Edits less frequent                 |
| Suggestions    | `suggestions` (custom)  | AI-generated, cached longer         |
| Votes          | `hours`                 | User actions, moderate freshness    |
| Guest data     | `minutes`               | Ephemeral, short-lived              |

---

## 3. Cache Invalidation Strategy

### 3.1 updateTag() vs revalidateTag() Comparison

| Aspect           | `updateTag()`          | `revalidateTag(tag, profile)`       |
| ---------------- | ---------------------- | ----------------------------------- |
| **Context**      | Server Actions ONLY    | Server Actions + Route Handlers     |
| **Behavior**     | Immediate invalidation | Stale-while-revalidate              |
| **Next request** | Waits for fresh data   | Serves stale, fetches in background |
| **Use case**     | Read-your-writes       | Background refresh                  |
| **Import**       | `'next/cache'`         | `'next/cache'`                      |

### 3.2 Decision Matrix for Our Codebase

| Action            | API to Use                          | Rationale                          |
| ----------------- | ----------------------------------- | ---------------------------------- |
| Create new chat   | `updateTag('user-chats-{userId}')`  | User must see new chat immediately |
| Send message      | `updateTag('chat-{chatId}')`        | Message must appear instantly      |
| Edit message      | `updateTag('chat-{chatId}')`        | Edit must reflect immediately      |
| Delete chat       | `updateTag('user-chats-{userId}')`  | Chat must disappear immediately    |
| Update visibility | `updateTag('chat-{chatId}')`        | Visibility change immediate        |
| Save document     | `updateTag('doc-{docId}')`          | User expects immediate save        |
| Background sync   | `revalidateTag(tag, 'max')`         | Can tolerate stale data            |
| Webhook triggers  | `revalidateTag(tag, { expire: 0 })` | External system, Route Handler     |

### 3.3 Implementation Pattern for Server Actions

```typescript
// features/chat/actions/message.ts
"use server";

import { updateTag, revalidatePath } from "next/cache";

export async function deleteTrailingMessages(
  input: DeleteTrailingMessagesInput
) {
  // ... validation and deletion logic

  // Use updateTag for read-your-writes semantics
  updateTag(`chat-${input.chatId}`);
  updateTag(`messages-${input.chatId}`);

  // Also revalidate path for full page refresh
  revalidatePath(`/chat/${input.chatId}`);

  return { success: true };
}
```

### 3.4 Fallback Pattern

```typescript
"use server";

import { updateTag, revalidateTag } from "next/cache";

export async function updateChat(chatId: string, data: ChatUpdate) {
  try {
    await db.chat.update(chatId, data);

    // Primary: Immediate invalidation for user
    updateTag(`chat-${chatId}`);
  } catch (error) {
    // Fallback: Background revalidation if updateTag fails
    revalidateTag(`chat-${chatId}`, "max");
    throw error;
  }
}
```

---

## 4. connection() Migration Guide

### 4.1 API Reference

```typescript
import { connection } from "next/server";

// Signature
function connection(): Promise<void>;
```

**Purpose**: Indicates rendering should wait for incoming user request before continuing. Excludes everything after it from prerendering.

### 4.2 Before/After Migration

#### Before (unstable_noStore):

```typescript
// oldapp/proxy.ts or similar
import { unstable_noStore } from "next/cache";

export async function getDynamicData() {
  unstable_noStore(); // Opts out of static rendering
  return await fetchUserSpecificData();
}
```

#### After (connection):

```typescript
import { connection } from "next/server";

export async function getDynamicData() {
  await connection(); // Wait for request context
  return await fetchUserSpecificData();
}
```

### 4.3 Key Differences

| Aspect    | `unstable_noStore` | `connection()`          |
| --------- | ------------------ | ----------------------- |
| Status    | **Deprecated**     | **Stable (v15+)**       |
| Return    | `void` (sync)      | `Promise<void>` (async) |
| Usage     | Call anywhere      | Must `await`            |
| Semantics | "Don't cache"      | "Wait for request"      |

### 4.4 proxy.ts Migration Assessment

**Current file**: `oldapp/proxy.ts` (248 lines)

**Analysis**: This file is a Next.js 16 proxy file for edge rate limiting and guest session management. It uses:

- `NextRequest` / `NextResponse` (compatible)
- JWT handling with `jose` (compatible)
- Cookie operations (compatible)
- **No `unstable_noStore` usage found**

**Recommendation**: The proxy.ts file does **not require `connection()` migration**. It operates at the edge/middleware level, not as a data fetching function.

For data fetching functions that need dynamic rendering without using Dynamic APIs (like `cookies()`, `headers()`), use:

```typescript
import { connection } from "next/server";

export async function getRandomData() {
  await connection();
  // Everything below is excluded from prerendering
  const rand = Math.random();
  return { value: rand, timestamp: new Date().toISOString() };
}
```

---

## 5. PPR Assessment

### 5.1 What is Partial Prerendering (PPR)?

PPR allows a route to have both:

- **Static shell** - Prerendered at build time
- **Dynamic holes** - Rendered at request time using Suspense

### 5.2 Candidate Routes Assessment

| Route                 | Static Parts          | Dynamic Parts        | PPR Candidate?        |
| --------------------- | --------------------- | -------------------- | --------------------- |
| `/` (chat page)       | Layout, sidebar shell | Chat list, user info | ✅ Yes                |
| `/chat/[id]`          | Message container     | Messages, input      | ⚠️ Partial            |
| `/login`, `/register` | Forms                 | Auth state           | ❌ No (fully dynamic) |
| `/api/*`              | N/A                   | All dynamic          | ❌ No (API routes)    |

### 5.3 PPR Implementation (When Available)

**Note**: PPR is still experimental in Next.js 16. To enable:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    ppr: true, // or 'incremental' for per-route
  },
};
```

**Per-route opt-in**:

```typescript
// app/(chat)/page.tsx
export const experimental_ppr = true;

export default async function ChatPage() {
  return (
    <div>
      {/* Static shell - prerendered */}
      <Header />
      <Suspense fallback={<ChatListSkeleton />}>
        {/* Dynamic hole - rendered at request time */}
        <ChatList />
      </Suspense>
    </div>
  );
}
```

### 5.4 Recommendation

**Current Status**: `cacheComponents: true` is enabled, which is the foundation for PPR.

**Action**:

1. PPR is not a priority for this optimization sprint
2. Focus on `"use cache"` + `cacheLife` adoption first
3. Revisit PPR after cache optimization is complete
4. The `"use cache"` directive provides similar benefits for data functions

---

## 6. Updated ADR Validations

### ADR-001: "use cache" with cacheLife

| Aspect                | Original Decision          | Validation                                    | Status        |
| --------------------- | -------------------------- | --------------------------------------------- | ------------- |
| Directive placement   | Function-level             | ✅ Confirmed - all three levels supported     | **Validated** |
| cacheLife profiles    | Built-in (`hours`, `days`) | ✅ Confirmed + custom profiles supported      | **Validated** |
| User-specific caching | Pass userId as argument    | ✅ Confirmed - becomes part of cache key      | **Validated** |
| Error handling        | Errors not cached          | ✅ Confirmed - only successful returns cached | **Validated** |

**ADR-001 Status**: ✅ **VALIDATED** - Implementation can proceed as designed

### ADR-002: updateTag() for Invalidation

| Aspect              | Original Decision             | Validation                                | Status        |
| ------------------- | ----------------------------- | ----------------------------------------- | ------------- |
| API signature       | `updateTag(tag)`              | ✅ Confirmed - single string argument     | **Validated** |
| Context restriction | Server Actions only           | ✅ Confirmed - throws in Route Handlers   | **Validated** |
| Timing              | Immediate invalidation        | ✅ Confirmed - read-your-writes semantics | **Validated** |
| Fallback            | `revalidateTag(tag, profile)` | ✅ Confirmed - new signature with profile | **Updated**   |

**ADR-002 Status**: ✅ **VALIDATED** - Note `revalidateTag` now requires profile argument

### ADR-003: Phased Proxy Migration

| Aspect              | Original Decision                          | Validation                                        | Status        |
| ------------------- | ------------------------------------------ | ------------------------------------------------- | ------------- |
| API                 | `connection()` replaces `unstable_noStore` | ✅ Confirmed - stable since v15                   | **Validated** |
| Drop-in replacement | Nearly drop-in                             | ⚠️ **Revision needed** - must `await`             | **Revised**   |
| proxy.ts migration  | Required                                   | ❌ **Not required** - no `unstable_noStore` usage | **Revised**   |

**ADR-003 Status**: ⚠️ **REVISED**

- `connection()` migration is **not needed for proxy.ts**
- Only needed for data functions using `Math.random()` or `new Date()` without Dynamic APIs

---

## 7. Implementation Checklist

### Phase 1: Configuration

- [ ] Add custom `cacheLife` profiles to `next.config.ts`
- [ ] Verify `cacheComponents: true` is enabled (already done)

### Phase 2: Data Layer Migration

- [ ] `lib/data/cached/chat.ts` - Add `"use cache"` to read functions
- [ ] `lib/data/cached/messages.ts` - Add `"use cache"` to read functions
- [ ] `lib/data/cached/documents.ts` - Add `"use cache"` to read functions
- [ ] `lib/data/cached/suggestions.ts` - Add `"use cache"` to read functions
- [ ] `lib/data/cached/votes.ts` - Add `"use cache"` to read functions

### Phase 3: Server Actions Migration

- [ ] `features/chat/actions/message.ts` - Replace `revalidatePath` with `updateTag`
- [ ] `features/chat/actions/visibility.ts` - Replace `revalidatePath` with `updateTag`
- [ ] `features/chat/actions/vote.ts` - Add `updateTag` for vote mutations
- [ ] `features/artifacts/actions/index.ts` - Add `updateTag` for artifact mutations

### Phase 4: Testing & Validation

- [ ] Verify cache hit/miss behavior in development (`NEXT_PRIVATE_DEBUG_CACHE=1`)
- [ ] Test read-your-writes with `updateTag`
- [ ] Measure Core Web Vitals (LCP, CLS, INP)

---

## 8. Core Web Vitals Measurement

### Recommended Tooling

| Tool                 | Purpose               | Usage                 |
| -------------------- | --------------------- | --------------------- |
| `useReportWebVitals` | Client-side metrics   | Built-in Next.js hook |
| Vercel Analytics     | Production monitoring | Dashboard on Vercel   |
| Chrome DevTools      | Development profiling | Performance tab       |
| Lighthouse           | Audit reports         | Chrome DevTools       |

### Implementation

```typescript
// app/layout.tsx
import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
  useReportWebVitals((metric) => {
    console.log(metric.name, metric.value);
    // Send to analytics
  });
  return null;
}
```

### Targets

| Metric | Target | Current (estimate) |
| ------ | ------ | ------------------ |
| LCP    | <2.5s  | TBD (measure)      |
| CLS    | <0.1   | TBD (measure)      |
| INP    | <200ms | TBD (measure)      |

---

## Files Created

- `.ouroboros/specs/optimization/phase0-iteration2-research.md` (this file)

---

## Next Steps

1. **Proceed to Architecture Phase** with validated ADRs
2. **Update design.md** with implementation patterns from this research
3. **Create task breakdown** based on Implementation Checklist

---

_Research completed: 2024-12-24_
