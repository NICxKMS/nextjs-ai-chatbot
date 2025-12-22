# 🌐 API Routes & Pages Issues

**Total**: 49 issues
**High**: 4 | **Medium**: 18 | **Low**: 27

## Summary Table

| #    | Issue                                | Severity | File                              | Status  | Verified     |
| ---- | ------------------------------------ | -------- | --------------------------------- | ------- | ------------ |
| #198 | No password validation on login      | MEDIUM   | app/(auth)/login/page.tsx         | 🔴 OPEN |              |
| #199 | Inconsistent catch block             | LOW      | app/(auth)/login/page.tsx         | 🔴 OPEN | ✅ CONFIRMED |
| #200 | Empty catch without logging          | MEDIUM   | app/(auth)/login/page.tsx         | 🔴 OPEN | ✅ CONFIRMED |
| #201 | Router race condition                | LOW      | app/(auth)/login/page.tsx         | 🔴 OPEN |
| #202 | Password validation missing register | MEDIUM   | app/(auth)/register/page.tsx      | 🔴 OPEN |
| #203 | Duplicate error handling code        | LOW      | app/(auth)/register/page.tsx      | 🔴 OPEN | ✅ CONFIRMED |
| #204 | Missing React import                 | LOW      | app/(auth)/layout.tsx             | 🔴 OPEN |              |
| #205 | No session check new chat            | MEDIUM   | app/(chat)/page.tsx               | 🔴 OPEN | ✅ CONFIRMED |
| #206 | Magic string literal visibility      | LOW      | app/(chat)/page.tsx               | 🔴 OPEN |              |
| #207 | Vote type mismatch                   | MEDIUM   | app/(chat)/chat/[id]/page.tsx     | 🔴 OPEN | ✅ CONFIRMED |
| #208 | Silent vote error swallow            | LOW      | app/(chat)/chat/[id]/page.tsx     | 🔴 OPEN | ✅ CONFIRMED |
| #209 | Information leakage redirect         | MEDIUM   | app/(chat)/chat/[id]/page.tsx     | 🔴 OPEN | ✅ CONFIRMED |
| #210 | External script without SRI          | MEDIUM   | app/(chat)/chat-layout-client.tsx | 🔴 OPEN |
| #211 | Duplicate URL cleanup code           | LOW      | app/(chat)/chat-layout-client.tsx | 🔴 OPEN |
| #212 | Exposes error message                | MEDIUM   | app/(chat)/error.tsx              | 🔴 OPEN |
| #213 | Same error exposure issue            | MEDIUM   | app/(chat)/chat/[id]/error.tsx    | 🔴 OPEN |
| #214 | Duplicate SidebarSkeleton            | LOW      | app/(chat)/sidebar-container.tsx  | 🔴 OPEN |
| #215 | SUPABASE_URL assertion crash         | HIGH     | app/api/auth/exchange/route.ts    | 🔴 OPEN | ✅ CONFIRMED |
| #216 | ANON_KEY assertion crash             | HIGH     | app/api/auth/exchange/route.ts    | 🔴 OPEN | ✅ CONFIRMED |
| #217 | Unused request parameter             | LOW      | app/api/auth/logout/route.ts      | 🔴 OPEN |
| #218 | Error variable unused                | LOW      | app/api/auth/logout/route.ts      | 🔴 OPEN |
| #219 | No rate limiting guest endpoint      | MEDIUM   | app/api/auth/exchange/route.ts    | 🔴 OPEN |
| #220 | Incomplete URL validation            | LOW      | app/api/auth/exchange/route.ts    | 🔴 OPEN |
| #221 | Type assertion without validation    | HIGH     | app/api/chat/route.ts             | 🔴 OPEN | ✅ CONFIRMED |
| #222 | No try-catch for JSON parse          | MEDIUM   | app/api/chat/route.ts             | 🔴 OPEN |
| #223 | Guest ID leak in session             | LOW      | app/api/chat/route.ts             | 🔴 OPEN |
| #224 | Debug console.log in production      | LOW      | app/api/chat/route.ts             | 🔴 OPEN |
| #225 | Inconsistent error response format   | MEDIUM   | app/api/chat/route.ts             | 🔴 OPEN |
| #226 | Generic 500 error no request ID      | LOW      | app/api/chat/route.ts             | 🔴 OPEN |
| #227 | Stream error callback format         | MEDIUM   | app/api/chat/route.ts             | 🔴 OPEN |
| #228 | Weak content type check              | LOW      | app/api/chat/route.ts             | 🔴 OPEN |
| #229 | Caching private data                 | MEDIUM   | app/api/document/route.ts         | 🔴 OPEN |
| #230 | Duplicate validation logic           | LOW      | app/api/document/route.ts         | 🔴 OPEN |
| #231 | Orphan validation check              | LOW      | app/api/document/route.ts         | 🔴 OPEN |
| #232 | Missing image in artifact kind       | LOW      | app/api/document/route.ts         | 🔴 OPEN |
| #233 | Incomplete MIME type list            | MEDIUM   | app/api/files/upload/route.ts     | 🔴 OPEN |
| #234 | Public blob access                   | MEDIUM   | app/api/files/upload/route.ts     | 🔴 OPEN |
| #235 | Magic number filename length         | LOW      | app/api/files/upload/route.ts     | 🔴 OPEN |
| #236 | Blob type refinement                 | LOW      | app/api/files/upload/route.ts     | 🔴 OPEN |
| #237 | No-cache header incorrect            | LOW      | app/api/health/route.ts           | 🔴 OPEN |
| #238 | Missing AI provider health check     | MEDIUM   | app/api/health/route.ts           | 🔴 OPEN |
| #239 | Inconsistent auth pattern            | MEDIUM   | app/api/history/route.ts          | 🔴 OPEN |
| #240 | Pagination not implemented           | LOW      | app/api/history/route.ts          | 🔴 OPEN |
| #241 | DELETE no deleted count              | LOW      | app/api/history/route.ts          | 🔴 OPEN |
| #242 | Double fetch in vote                 | MEDIUM   | app/api/vote/route.ts             | 🔴 OPEN |
| #243 | Cache header on dynamic data         | LOW      | app/api/suggestions/route.ts      | 🔴 OPEN |
| #244 | Missing guest rate limit             | HIGH     | middleware.ts                     | 🔴 OPEN | ✅ CONFIRMED |
| #245 | Non-existent routes configured       | MEDIUM   | middleware.ts                     | 🔴 OPEN |
| #246 | console.debug with digest            | LOW      | app/global-error.tsx              | 🔴 OPEN |

---

## Critical Issues

### #215 & #216 - Environment Assertion Crashes

**Files**: app/api/auth/exchange/route.ts
**Severity**: 🔴 HIGH
**Verification**: ✅ CONFIRMED (2025-12-22)

```typescript
const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, // Crashes if undefined
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Crashes if undefined
```

**Fix**: Add validation before use.

### #221 - Type Assertion Without Validation

**File**: app/api/chat/route.ts
**Severity**: 🔴 HIGH
**Verification**: ✅ CONFIRMED (2025-12-22)

```typescript
const { messages, id, modelId } = (await request.json()) as { ... };
```

**Fix**: Use zod schema validation.

### #244 - Missing Guest Rate Limit

**File**: middleware.ts
**Severity**: 🔴 HIGH
**Verification**: ✅ CONFIRMED (2025-12-22)

`/api/auth/guest` endpoint not rate limited - allows session flooding attack.

**Fix**: Add to rate limit config.

---

## Auth Pages Issues (#198-#204)

- No client-side password validation
- Silent error handling
- Router race conditions

## Chat Pages Issues (#205-#214)

- No session verification on new chat
- Error messages exposed to users
- External scripts without integrity checks

## API Security Pattern

| Endpoint           | Auth Required | Rate Limited | Status           |
| ------------------ | ------------- | ------------ | ---------------- |
| /api/chat          | ⚠️ Optional   | ✅ Yes       | Needs fix        |
| /api/document      | ✅ Yes        | ✅ Yes       | OK               |
| /api/files/upload  | ✅ Yes        | ✅ Yes       | OK               |
| /api/health        | ❌ No         | ❌ No        | OK               |
| /api/history       | ✅ Yes        | ❌ No        | Needs rate limit |
| /api/vote          | ✅ Yes        | ❌ No        | Needs rate limit |
| /api/auth/exchange | ✅ Yes        | ❌ No        | **CRITICAL**     |
| /api/auth/guest    | ❌ No         | ❌ No        | **CRITICAL**     |
