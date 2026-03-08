# Wave 1 — Static Audit: lib/cache/ + lib/auth/ + lib/utils/ + lib/errors/ + lib/hooks/ + lib/providers/ + lib/types/

**Auditor:** Thoth  
**Date:** 2026-03-07  
**Scope:** 19 files across 7 lib/ subdirectories  
**Confidence:** HIGH — every finding traced to source code with line references  

---

## Executive Summary

The lib/ infrastructure layer is **well-structured, type-safe, and intentionally designed**. No `any` types exist in any audited file. Error handling is consistently defensive (never-throws pattern). However, the audit surfaces **3 critical issues**, **5 high-severity findings**, **8 medium**, and **6 low**. The most impactful finding is the non-atomic rate limiting (T4), followed by the triple JWT verification (T1) and env var re-computation per request (T2/T5).

### Finding Distribution

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH | 5 |
| MEDIUM | 8 |
| LOW | 6 |

---

## Findings

---

### F1 — Non-Atomic INCR + EXPIRE Race Condition

```
FLOW: rate-limiting | STEP: 4
SEVERITY: [CRITICAL]
FILE: lib/cache/rate-limit.ts:20-22
FINDING: When count === 1 (first request in a window), `expire(key, windowSeconds)` is called
  as a separate Redis command after `incr(key)`. If the process crashes, network fails, or the
  `expire()` call returns null (Redis error) between INCR and EXPIRE, the key persists with no
  TTL — it increments forever, permanently blocking the user from that action.
  
  Additionally, this is two serial HTTP round-trips to Upstash Redis for every first request in
  a window (INCR + EXPIRE), doubling latency for that request.
  
  The current code:
    const count = await incr(key)       // HTTP call 1
    if (count === 1) {
      await expire(key, windowSeconds)  // HTTP call 2 — can fail independently
    }

RECOMMENDATION: Replace INCR+EXPIRE with a single atomic operation. Options:
  1. Upstash Redis supports Lua scripts via `client.eval()`:
     `redis.eval("local c = redis.call('INCR',KEYS[1]) if c == 1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end return c", [key], [windowSeconds])`
  2. Use Upstash pipeline: `client.pipeline().incr(key).expire(key, windowSeconds).exec()`
     (not fully atomic but reduces to one HTTP round-trip)
  Both eliminate the race condition and halve latency for window-initial requests.
```

---

### F2 — Triple JWT Verification Per Guest Request

```
FLOW: auth-guest-lifecycle | STEP: 4-5, auth-session-resolution | STEP: 4
SEVERITY: [CRITICAL]
FILE: proxy.ts:108, proxy.ts:214-216, lib/auth/session.ts:101 (resolveGuestSession)
FINDING: Each guest request verifies the JWT up to 3 times:
  1. proxy.ts:108 — `hasVerifiedGuestToken()` calls `verifyGuestToken(token)` for route-level check
  2. proxy.ts:214 — `verifyGuestToken(guestToken)` again for rotation decision
  3. lib/auth/session.ts:101 — `resolveGuestSession()` calls `verifyGuestToken(guestToken)` a third time
  
  Each call performs HMAC-SHA256 computation + jose validation. While each is fast (~1-5ms),
  the cumulative overhead is wasteful and the pattern breaks the DRY principle.
  
  The proxy already knows the guest userId after verification #1 or #2. This information is
  discarded — not forwarded downstream.

RECOMMENDATION: After proxy verifies the token, forward the result via a trusted internal header:
  `requestHeaders.set("x-guest-user-id", verified.userId)`
  In `resolveGuestSession()`, check for this header first — if present, trust it (internal header
  from proxy is trusted). Fall back to JWT verification only if the header is absent.
  Also refactor `rotateGuestToken()` to accept a pre-verified payload parameter, eliminating
  verification #2.
```

---

### F3 — Env Var Re-Computation on Every Request

```
FLOW: auth-session-resolution | STEP: 2, rate-limiting | STEP: 2, csrf-protection | STEP: 3
SEVERITY: [CRITICAL]
FILE: lib/auth/session.ts:32-33, lib/cache/client.ts:31-32, lib/utils/validate-origin.ts:5-20
FINDING: Three files re-read env vars on every function invocation:

  1. lib/auth/session.ts:32-33 — `createSupabaseServerClient()` reads
     `process.env.NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` on EVERY call.
     Though `getAppSession` is memoized per request via React.cache, the env read itself is
     repeated per-request.

  2. lib/cache/client.ts:31-32 — `getClient()` reads `CACHE_KV_REST_API_URL` and 
     `CACHE_KV_REST_API_TOKEN` on every call. Mitigated by the singleton pattern (reads only
     on first call per process), but the env access is inside the function body, not at module
     level, so it's re-evaluated on every invocation path.

  3. lib/utils/validate-origin.ts:5-20 — `getAllowedOrigins()` reads `VERCEL_URL`,
     `NEXT_PUBLIC_APP_URL`, and `NODE_ENV` AND constructs a new `Set<string>` on every call.
     This runs on every POST request.

  Note: lib/auth/guest.ts does this correctly — `getSecret()` caches the raw string and encoded
  result at module level, only re-encoding when the value changes.

RECOMMENDATION:
  - For validate-origin.ts: Cache the allowed origins `Set` at module level. `VERCEL_URL` and
    `NEXT_PUBLIC_APP_URL` do not change during a process lifetime.
  - For session.ts: Extract env reads to module-level constants with null checks.
  - For client.ts: The singleton already handles this adequately. The env reads inside `getClient()`
    serve as fallback-safe checks. This is the lowest priority of the three.
```

---

### F4 — Session Type Not Forwarded From Proxy

```
FLOW: auth-session-resolution | STEP: 2-5
SEVERITY: [HIGH]
FILE: proxy.ts:195-230, lib/auth/session.ts:70-88
FINDING: The proxy classifies users by cookie presence (`hasSupabaseToken`, `guestToken`) but
  does NOT forward this classification to downstream code. `getAppSession()` then re-discovers
  the session type by:
  1. Constructing a Supabase client + HTTP call to Supabase (50-200ms) for ALL users
  2. Only falling back to guest resolution if Supabase returns null
  
  For guest users, step 1 is pure waste — the proxy already knows there's no Supabase cookie.
  For authenticated users, step 2 never runs, so no waste — but the type is still not forwarded.

RECOMMENDATION: Set `requestHeaders.set("x-session-type", hasSupabaseToken ? "auth" : "guest")`
  in proxy.ts. In `getAppSession()`, read this header:
  - If "guest" → skip `resolveSupabaseSession()` entirely → save 50-200ms per guest request
  - If "auth" → skip `resolveGuestSession()` → minor optimization
  This is the T9 optimization from Wave 0.
```

---

### F5 — `expire()` Failure Leaves Key Without TTL (Rate Limit Leak)

```
FLOW: rate-limiting | STEP: 4
SEVERITY: [HIGH]
FILE: lib/cache/rate-limit.ts:22
FINDING: If `expire(key, windowSeconds)` returns null (Redis connection error after INCR succeeded),
  the key exists in Redis with no TTL. On subsequent requests, `incr()` will keep incrementing the
  counter. Once it exceeds `limit`, the user is permanently rate-limited for that action until
  the Redis key is manually deleted or evicted by Upstash's memory policies.
  
  The `checkRateLimit` function does not check the return value of `expire()`:
    if (count === 1) {
      await expire(key, windowSeconds)  // Return value ignored
    }

RECOMMENDATION: Either:
  1. Use the atomic Lua script from F1 (preferred — eliminates this issue entirely)
  2. Check the return value: if `expire()` returns null/false, delete the key to prevent
     a permanent block: `if (!await expire(key, windowSeconds)) await del(key)`
```

---

### F6 — Dead Code: `refreshVotes()` Export

```
FLOW: cache-invalidation | STEP: N/A
SEVERITY: [HIGH]
FILE: lib/cache/revalidate.ts:39-41
FINDING: `refreshVotes(chatId)` is exported but never imported or called anywhere in the codebase.
  Confirmed via grep: only references are in flow documentation and the definition itself.
  This is dead code that adds noise to the API surface.

RECOMMENDATION: Remove `refreshVotes()` from lib/cache/revalidate.ts. If a Route Handler voting
  path is added in the future, it can be re-added then.
```

---

### F7 — Dead Code: Reserved Rate Limit Keys

```
FLOW: rate-limiting | STEP: N/A
SEVERITY: [HIGH]
FILE: lib/cache/keys.ts:24-27
FINDING: Two rate limit key builders are defined but never used:
  - `rateLimitKeys.rateLimit(userId)` → `"rate-limit:<userId>"`
  - `rateLimitKeys.rateLimitDaily(userId)` → `"rate-limit-daily:<userId>"`
  
  Both are marked as "Reserved for future ... Currently test-only." but there are no tests
  that use them either (confirmed via grep across all .ts files).

RECOMMENDATION: Remove both unused key builders. The "reserved" comment pattern creates
  maintenance debt with no benefit. If future rate limiting needs arise, keys can be added then
  with proper tests.
```

---

### F8 — `_resetSecretCache()` Exported But Never Called

```
FLOW: auth-guest-lifecycle | STEP: N/A
SEVERITY: [HIGH]
FILE: lib/auth/guest.ts:29-32
FINDING: `_resetSecretCache()` is exported as test-only (`@internal`) but is never imported
  or called anywhere in the codebase. There are no test files visible that use it.
  The `@internal` tag is a JSDoc convention only — TypeScript still exports it publicly.

RECOMMENDATION: Remove the export or guard it behind a `process.env.NODE_ENV === 'test'` check.
  If tests are added later that need to reset the cache, they can use module mocking
  (vi.mock / jest.mock) to control the module state without a public escape hatch.
```

---

### F9 — Guest Cookie maxAge vs JWT TTL Mismatch

```
FLOW: auth-guest-lifecycle | STEP: 2-3, 5
SEVERITY: [MEDIUM]
FILE: proxy.ts:16 (GUEST_COOKIE_MAX_AGE = 7 days), lib/auth/constants.ts:6 (GUEST_TOKEN_TTL_SECONDS = 1 hour)
FINDING: The cookie persists for 7 days but the JWT inside expires after 1 hour. A guest who
  returns after >1 hour has an expired JWT in a valid cookie. The proxy detects the expired
  token, mints a NEW identity — the guest's previous chats are orphaned (associated with the
  old guest UUID, which is now inaccessible).
  
  If the intent is guest continuity across visits, the maxAge is too long relative to the TTL.
  If the intent is fresh-identity-per-visit, the maxAge should equal the TTL (1 hour).
  
  The maxAge constant is defined in proxy.ts as a raw number (604800), not using the
  constants from lib/auth/constants.ts, creating an additional consistency risk.

RECOMMENDATION: Either:
  1. Align maxAge with TTL: set `GUEST_COOKIE_MAX_AGE = GUEST_TOKEN_TTL_SECONDS` (1 hour)
  2. Or implement a refresh-token pattern: store the guest UUID in a separate long-lived cookie,
     and use it to re-mint the JWT on return (preserving identity)
  3. At minimum, move `GUEST_COOKIE_MAX_AGE` to lib/auth/constants.ts alongside the other
     TTL constants for co-located configuration.
```

---

### F10 — `validateOrigin()` Creates New Objects Per Request

```
FLOW: csrf-protection | STEP: 3
SEVERITY: [MEDIUM]
FILE: lib/utils/validate-origin.ts:5-20, 53-55
FINDING: Every call to `validateOrigin(request)`:
  1. Creates `new URL(request.url)` — parses the full request URL
  2. Calls `getAllowedOrigins(requestUrl)` which creates `new Set<string>()` and populates it
  3. Reads 3 env vars (`VERCEL_URL`, `NEXT_PUBLIC_APP_URL`, `NODE_ENV`)
  
  This runs on every POST to /api/chat, /api/artifact, /api/files/upload. The allowed origins
  do not change during a process lifetime.

RECOMMENDATION: Cache the allowed origins `Set` at module level (excluding the request-specific
  `requestUrl.origin`, which can be added per-call). This eliminates object allocation and env
  var reads on every request.
```

---

### F11 — `reservedIds` Ref Never Cleaned on Unmount

```
FLOW: state-pending-chats | STEP: 3
SEVERITY: [MEDIUM]
FILE: lib/providers/pending-chats-provider.tsx:28
FINDING: `reservedIds` is a `useRef(new Set<string>())`. IDs are added when a pending chat is
  created and deleted when `remove(id)` is called (via `dropEntry(id, true)`). However:
  1. `markConfirmed(id)` does NOT release the ID from `reservedIds` — the ID stays forever
  2. If the provider unmounts (unlikely in layout but possible during HMR), the ref is lost but
     a new one is created on remount — stale entries don't carry over
  3. In a long-running session with many chats, `reservedIds` grows monotonically until `remove()`
     is called. Confirmed chats that are never explicitly removed accumulate in the Set.
  
  The `markConfirmed` → sidebar reconciliation flow does eventually call `removePending(id)` →
  `dropEntry(id, true)` which releases the ID. But there's a window between confirmation and
  removal where the ID is stuck in both `entries` (as non-optimistic) and `reservedIds`.

RECOMMENDATION: Either:
  1. Release the ID in `markConfirmed()` — once confirmed, the server owns the ID
  2. Add a cleanup effect that periodically prunes `reservedIds` for IDs no longer in `entries`
  3. Document clearly that the reconciliation flow is the only path that releases IDs, and ensure
     all confirmed entries eventually reach `remove()`
```

---

### F12 — `ArtifactKind` Re-Export Chain

```
FLOW: N/A (type architecture)
SEVERITY: [MEDIUM]
FILE: lib/types/artifact.types.ts:1-3, lib/types/models.types.ts:22
FINDING: `ArtifactKind` is defined in `models.types.ts` (line 22), then both imported AND
  re-exported from `artifact.types.ts`:
    import type { ArtifactKind } from "./models.types"
    export type { ArtifactKind } from "./models.types"
  
  The `import type` on line 1 is unused — the re-export on line 3 handles everything.
  Consumers import from both locations:
  - `lib/data/artifact.ts` → imports from `models.types` directly
  - `features/chat/types/chat.types.ts` → imports from `artifact.types`
  - `lib/ai/artifact-handlers.ts` → imports from `artifact.types`
  
  This creates confusion about the canonical import path.

RECOMMENDATION: Remove the unused `import type` on line 1 of artifact.types.ts. Standardize on
  one import path: either all consumers import from `models.types` (source of truth for DB-derived
  types) or all import from `artifact.types` (domain-scoped). Given the naming pattern,
  `artifact.types` is the better canonical path for artifact-domain types.
```

---

### F13 — `models.types.ts` Name Conflicts with `model.types.ts`

```
FLOW: N/A (naming)
SEVERITY: [MEDIUM]
FILE: lib/types/models.types.ts, lib/types/model.types.ts
FINDING: Two type files differ by a single character:
  - `models.types.ts` — Drizzle DB entity types (User, Chat, Message, Artifact, Vote, Suggestion)
  - `model.types.ts` — AI model metadata types (ModelMetadata, ProviderId, constants)
  
  This is confusing. `models.types.ts` contains ALL entity types (not just "models"), while
  `model.types.ts` contains AI model configuration. The names suggest they're related but they
  serve completely different domains.

RECOMMENDATION: Rename for clarity:
  - `models.types.ts` → `entities.types.ts` or `db.types.ts` (it derives from DB schema)
  - `model.types.ts` is fine as-is (clearly about THE AI model)
  This would eliminate the visual ambiguity.
```

---

### F14 — `AppSession` Types Defined in Session Module, Not Types Directory

```
FLOW: auth-session-resolution | STEP: N/A (architecture)
SEVERITY: [MEDIUM]
FILE: lib/auth/session.ts:13-23
FINDING: `AppSession` and `UserType` are defined inline in `lib/auth/session.ts` alongside the
  runtime logic. Comment says "P2-T02 (features/auth/types/auth.types.ts) will re-export these
  types" — but every consumer (20+ files) imports from `lib/auth/session`, not from a types file.
  
  This co-location works but is inconsistent with the project pattern of having dedicated
  `.types.ts` files in `lib/types/` for shared types. `AppSession` is arguably the most widely
  shared type in the entire codebase.

RECOMMENDATION: Move `AppSession` and `UserType` to `lib/types/session.types.ts` (or
  `lib/types/auth.types.ts`), with `lib/auth/session.ts` re-exporting for backward compatibility.
  This maintains the pattern where shared types live in `lib/types/`.
```

---

### F15 — `dropEntry` Internally Scoped But Exposed Via Closure

```
FLOW: state-pending-chats | STEP: N/A (code quality)
SEVERITY: [MEDIUM]
FILE: lib/providers/pending-chats-provider.tsx:30-35
FINDING: `dropEntry(id, shouldReleaseId)` is an internal helper created via `useCallback`. It's
  used by both `remove()` (with `shouldReleaseId = true`) and is the sole mechanism for releasing
  IDs from `reservedIds`. However, `dropEntry` is not exposed in the context value — only
  `remove` and `markConfirmed` are.
  
  The `shouldReleaseId` parameter defaults to `false`, meaning only the `remove` path releases IDs.
  The `markConfirmed` path explicitly does NOT call `dropEntry`. This is intentional (confirmed
  entries stay in `reservedIds` until reconciliation removes them) but the semantics are subtle
  and not documented.

RECOMMENDATION: Add a brief inline comment explaining why `markConfirmed` deliberately doesn't
  release from `reservedIds` — it's to prevent re-adding a confirmed chat if a duplicate `add()`
  is somehow triggered between confirmation and server reconciliation.
```

---

### F16 — `withCache()` TypeScript Overload Workaround

```
FLOW: cache-layer | STEP: 2
SEVERITY: [LOW]
FILE: lib/cache/with-cache.ts:36-39
FINDING: `applyCacheLife()` casts `life as CacheLifePreset & "default"` to satisfy Next.js
  overload resolution. The comment explains this is because `.next/dev/types/cache-life.d.ts`
  removes the generic `cacheLife(string)` overload, leaving only per-preset overloads.
  
  This is a valid workaround, but the cast is unsafe — it tells TypeScript that any preset string
  is simultaneously "default", which is a lie. If Next.js ever changes the overload signatures,
  this will silently compile but potentially misbehave.

RECOMMENDATION: Monitor Next.js 16 type updates. If `cacheLife()` types are expanded to accept
  a union directly, remove this workaround. For now, add a `// @ts-expect-error` comment
  instead of the cast if feasible, to catch when it becomes unnecessary.
```

---

### F17 — `AppError.details` Is `unknown` But Never Serialized

```
FLOW: N/A (error handling)
SEVERITY: [LOW]
FILE: lib/errors/app-error.ts:25, 33-36
FINDING: `AppError` accepts a `details?: unknown` parameter in the constructor and all factory
  methods, but `toResponse()` only serializes `{ code, message }` — `details` is discarded.
  
  This means `details` is only useful if the caller catches the error and reads `.details`
  directly. Currently, all Route Handlers call `.toResponse()`, losing the details. Server
  Actions construct their own `{ code, message }` objects. The `details` field is never consumed
  anywhere in the codebase.

RECOMMENDATION: Either:
  1. Include `details` in `toResponse()` (for debugging in non-production environments):
     `{ code, message, ...(process.env.NODE_ENV !== 'production' && details ? { details } : {}) }`
  2. Or remove the `details` parameter entirely to reduce API surface noise.
  Option 1 is preferred for future debugging value.
```

---

### F18 — `useIsMobile()` Returns `boolean | undefined`

```
FLOW: N/A (hooks)
SEVERITY: [LOW]
FILE: lib/hooks/use-mobile.ts:29, 45
FINDING: `useState<boolean | undefined>(initialIsMobile)` means the return type is
  `boolean | undefined`. When no `initialIsMobile` is provided, the initial render returns
  `undefined` — consumers must handle this:
    const isMobile = useIsMobile()
    if (isMobile === undefined) { /* SSR / initial render */ }
  
  The hook's `useEffect` only updates state "if different from initial value to avoid CLS":
    if (actualIsMobile !== initialIsMobile) {
      setIsMobile(actualIsMobile)
    }
  
  If `initialIsMobile` is undefined and the actual value matches nothing, the state stays
  undefined until a resize event fires.

RECOMMENDATION: After the `matchMedia` listener is attached, always call `setIsMobile(actualIsMobile)`
  at least once unconditionally to ensure a defined value after mount. The CLS concern is valid
  for the SSR→client transition, but `undefined` as a stable state after hydration is surprising.
  
  Alternative: Change the return type to `boolean` and default `initialIsMobile ?? false`.
```

---

### F19 — `PendingChatsProvider` Context Value Uses Object Property Shorthand

```
FLOW: N/A (React best practices)
SEVERITY: [LOW]
FILE: lib/providers/pending-chats-provider.tsx:70
FINDING: The context uses the new JSX `<PendingChatsContext value={value}>` syntax (React 19
  Context.Provider shorthand). This is correct for React 19 but differs from the traditional
  `<PendingChatsContext.Provider value={value}>` pattern. Worth noting for consistency but
  not a bug — React 19 supports both.

RECOMMENDATION: No change needed. This is the modern React 19 pattern and is correct.
```

---

### F20 — `api.types.ts` Has Only One Consumer

```
FLOW: N/A (type architecture)
SEVERITY: [LOW]
FILE: lib/types/api.types.ts (entire file)
FINDING: `HistoryResponse<T>` and `PaginationParams` are defined in `lib/types/api.types.ts`
  but only imported by `lib/data/chat.ts`. These types are very specific to the history API
  pagination pattern and could be co-located with the data layer.
  
  Having a shared `api.types.ts` with 2 types and 1 consumer is premature extraction.

RECOMMENDATION: Keep as-is if more API routes will use pagination (likely). If not, co-locate
  in `lib/data/chat.ts` or `features/sidebar/types/`. Low priority.
```

---

### F21 — `SettingsState.contextDisplayMode` Not Used in Settings UI

```
FLOW: N/A (type completeness)
SEVERITY: [LOW]
FILE: lib/types/settings.types.ts:10
FINDING: `contextDisplayMode: "compact" | "detailed"` is defined in `SettingsState` but there's
  no settings UI that exposes this option. The `DEFAULT_SETTINGS` in
  `features/settings/types/settings.types.ts` sets it to `"compact"`, and the chat system prompt
  builder reads it, but the user has no way to change it.

RECOMMENDATION: If this is intentionally hidden (power-user feature for future UI), document it.
  If it's dead config, remove it from `SettingsState`. Low priority.
```

---

### F22 — `artifact.types.ts` Line 1 Unused Import

```
FLOW: N/A (dead code)
SEVERITY: [LOW]
FILE: lib/types/artifact.types.ts:1
FINDING: Line 1 imports `ArtifactKind` with `import type`, but line 3 re-exports it directly
  from the same source using `export type { ArtifactKind } from "./models.types"`. The import
  on line 1 is unused — the re-export on line 3 is self-sufficient.

RECOMMENDATION: Remove line 1: `import type { ArtifactKind } from "./models.types"`.
  The re-export on line 3 handles both the export and the type availability.
```

---

## Wave 0 Target Verification

| Target | Status | Findings |
|--------|--------|----------|
| T1 — Triple JWT verification | ✅ CONFIRMED | F2 — proxy.ts verifies 1-2x, resolveGuestSession verifies again |
| T2/T5 — Env var re-computation | ✅ CONFIRMED | F3 — session.ts, client.ts, validate-origin.ts all re-read per-request |
| T4 — Atomic rate limiting | ✅ CONFIRMED | F1, F5 — INCR+EXPIRE is non-atomic, expire failure leaves permanent key |
| T9 — Session type forwarding | ✅ CONFIRMED | F4 — proxy knows session type but doesn't forward via header |

---

## Files Audited — Summary

| File | Status | Key Findings |
|------|--------|-------------|
| `lib/cache/client.ts` | ✅ Sound | F3 (env re-read, low severity due to singleton) |
| `lib/cache/keys.ts` | ⚠️ Dead code | F7 — 2 unused rate limit key builders |
| `lib/cache/rate-limit.ts` | ❌ Critical | F1, F5 — non-atomic, expire failure unhandled |
| `lib/cache/revalidate.ts` | ⚠️ Dead code | F6 — `refreshVotes()` unused |
| `lib/cache/with-cache.ts` | ✅ Sound | F16 — minor TS overload workaround |
| `lib/auth/constants.ts` | ✅ Sound | F9 (related — maxAge lives in proxy.ts, not here) |
| `lib/auth/guest.ts` | ⚠️ Dead export | F2 (triple verify), F8 (_resetSecretCache unused) |
| `lib/auth/session.ts` | ⚠️ Optimization | F2, F3, F4, F14 — triple verify + env re-compute + type co-location |
| `lib/errors/app-error.ts` | ✅ Sound | F17 — `details` never serialized |
| `lib/errors/codes.ts` | ✅ Sound | No issues |
| `lib/hooks/use-mobile.ts` | ⚠️ Minor | F18 — returns `undefined` after mount |
| `lib/providers/pending-chats-provider.tsx` | ⚠️ Minor | F11, F15 — reservedIds growth, subtle semantics |
| `lib/types/api.types.ts` | ✅ Sound | F20 — single consumer (low priority) |
| `lib/types/artifact-handler.types.ts` | ✅ Sound | No issues |
| `lib/types/artifact.types.ts` | ⚠️ Minor | F12, F22 — re-export chain, unused import |
| `lib/types/model.types.ts` | ✅ Sound | F13 (naming collision with models.types.ts) |
| `lib/types/models.types.ts` | ✅ Sound | F13 (naming collision) |
| `lib/types/pending-chats.types.ts` | ✅ Sound | No issues |
| `lib/types/result.types.ts` | ✅ Sound | No issues — 11 consumers, well-shared |
| `lib/types/settings.types.ts` | ✅ Sound | F21 — unused contextDisplayMode |
| `lib/utils/cn.ts` | ✅ Sound | No issues |
| `lib/utils/generate-uuid.ts` | ✅ Sound | No issues — thin wrapper, widely used |
| `lib/utils/validate-origin.ts` | ⚠️ Optimization | F3, F10 — env re-read + object allocation per request |
| `lib/utils.ts` | ✅ Sound | Re-export barrel, clean |

---

## Positive Observations

1. **Zero `any` types** — All audited files use strict TypeScript. No `any`, no unsafe casts (except the one intentional `as unknown as` in client.ts for globalThis typing, which is justified).

2. **Consistent never-throws pattern** — `verifyGuestToken()`, `rotateGuestToken()`, `getAppSession()`, `resolveSupabaseSession()`, `resolveGuestSession()`, all Redis operations — every public API returns null/fallback on error. This is excellent defensive design.

3. **Well-typed error system** — `AppError` with `Extract<ErrorCode, pattern>` factory methods ensures type-safe error creation. The error code taxonomy (`type:surface:detail`) is consistent and readable.

4. **`ActionResult<T>` discriminated union** — Clean, widely adopted (11 consumers). No raw throw/catch patterns in Server Actions.

5. **Redis singleton pattern** — `globalForRedis.__upstashRedis` with `__upstashRedisInitFailed` flag is a solid pattern for HMR-safe singleton initialization.

6. **React.cache memoization** — `getAppSession` is correctly wrapped in `React.cache()` for request-scoped deduplication.

7. **Secret caching in guest.ts** — `getSecret()` with module-level cache + auto-invalidation on env change is the correct pattern. Other files should follow this example.

---

## Priority Implementation Order

| Priority | Findings | Impact | Effort |
|----------|----------|--------|--------|
| 1 | F1 + F5 | Atomic rate limiting eliminates race condition + permanent block risk | Small (Lua script or pipeline) |
| 2 | F2 + F4 | Session type + guest ID forwarding from proxy | Medium (proxy + session.ts changes) |
| 3 | F3 + F10 | Env var caching (validate-origin.ts is highest value) | Small |
| 4 | F6 + F7 + F8 + F22 | Dead code removal | Trivial |
| 5 | F9 | Cookie maxAge/TTL alignment (requires design decision) | Small but needs discussion |
| 6 | F13 + F14 | Naming + type organization | Medium (many import updates) |
| 7 | F11 + F15 | PendingChats reservedIds documentation/cleanup | Trivial |
| 8 | F17 + F18 + F21 | Minor improvements | Trivial |

---

## Appendix A — Atomic Rate Limiting: Research & Recommendations

### Problem Recap (F1 + F5)

The current `checkRateLimit()` in `lib/cache/rate-limit.ts` uses a two-command pattern:

```ts
const count = await incr(key)      // HTTP call 1 — always
if (count === 1) {
  await expire(key, windowSeconds)  // HTTP call 2 — window start only
}
return count <= limit
```

**Issues:**
1. Two serial HTTP round-trips on window-initial requests (~50-100ms each to Upstash)
2. Non-atomic: if `expire()` fails after `incr()`, the key has no TTL → permanent rate block
3. Fixed-window boundary burst: user can send `limit` requests at end of window and `limit` more at start of next

### Key Discovery: `@upstash/ratelimit` Is Already a Dependency

**The project already has `@upstash/ratelimit@^2.0.8` in `package.json` but it is unused in the current codebase.** It was used in the old app (`oldapp/lib/middleware/edge-rate-limit.ts`) but the new codebase rolled its own INCR+EXPIRE pattern instead.

This means the dependency is already paid for (install size, lockfile), but none of its benefits are utilized.

### Three Approaches (Ordered by Recommendation)

---

#### Approach 1: Use `@upstash/ratelimit` (RECOMMENDED) ★

**What it is:** Upstash's official rate limiting library (v2.0.8, GA, 2k+ stars, actively maintained). Uses Lua scripts internally for atomic operations. Supports fixed window, sliding window, token bucket, and cached fixed window algorithms.

**How the Lua scripts work internally** (from `src/lua-scripts/single.ts`):

```lua
-- fixedWindowLimitScript (actual Upstash source)
local r = redis.call("INCRBY", key, incrementBy)
if r == tonumber(incrementBy) then
  -- First time: INCRBY and PEXPIRE in same Lua script = atomic
  redis.call("PEXPIRE", key, window)
end
return {r, effectiveLimit}
```

The key insight: `INCRBY` + `PEXPIRE` inside a Lua EVAL are executed **atomically** on the Redis server. No race condition possible. One HTTP round-trip via `evalsha`.

**Implementation sketch:**

```ts
// lib/cache/rate-limit.ts — replacement
import "server-only"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Singleton Ratelimit instances (one per config)
const limiters = new Map<string, Ratelimit>()

function getLimiter(prefix: string, limit: number, windowSeconds: number): Ratelimit | null {
  const key = `${prefix}:${limit}:${windowSeconds}`
  const cached = limiters.get(key)
  if (cached) return cached

  const url = process.env.CACHE_KV_REST_API_URL
  const token = process.env.CACHE_KV_REST_API_TOKEN
  if (!url || !token) return null

  const limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.fixedWindow(limit, `${windowSeconds} s`),
    prefix,
  })
  limiters.set(key, limiter)
  return limiter
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  // Extract prefix from key pattern (e.g., "rate-limit-chat" from "rate-limit-chat:userId")
  const limiter = getLimiter("rl", limit, windowSeconds)
  if (!limiter) return true // graceful degradation

  try {
    const { success } = await limiter.limit(key)
    return success
  } catch {
    return true // graceful degradation
  }
}
```

**Pros:**
- ✅ Atomic Lua scripts — eliminates F1 and F5 completely
- ✅ One HTTP round-trip per check (evalsha)
- ✅ Already a dependency — no new package to add
- ✅ Sliding window option eliminates boundary burst issue
- ✅ Built-in caching: if a key is already blocked, skips Redis entirely (0 commands)
- ✅ Timeout support: auto-allow if Redis is slow
- ✅ Analytics dashboard in Upstash console
- ✅ Battle-tested in production by Vercel/Upstash

**Cons:**
- ⚠️ Slightly different API surface — need to migrate 4 call sites
- ⚠️ Creates one Ratelimit instance per config (memory: trivial, <1KB each)
- ⚠️ Uses `evalsha` internally — first call per script loads the script into Redis (one-time cost)

**Cost per operation** (from Upstash pricing docs):
- Fixed window, first request in window: 3 commands (EVAL + INCR + PEXPIRE) — but ONE HTTP request
- Fixed window, subsequent: 2 commands (EVAL + INCR) — ONE HTTP request
- Cached fixed window, blocked: 0 commands — no HTTP at all!

**Migration scope:**
1. `lib/cache/rate-limit.ts` — replace `checkRateLimit()` implementation
2. `lib/cache/client.ts` — `incr()` and `expire()` can be removed if only used by rate-limit
3. `features/auth/lib/action-utils.ts` — no change (calls `checkRateLimit`)
4. `features/chat/lib/chat-route.ts` — no change (calls `checkRateLimit`)
5. `features/voting/actions/vote.ts` — no change (calls `checkRateLimit`)
6. `app/api/files/upload/route.ts` — no change (calls `checkRateLimit`)

---

#### Approach 2: Lua Script via `client.eval()` (DIY Atomic)

**What it is:** Write a custom Lua script and execute via Upstash's `eval()` command. Same atomicity guarantee as Approach 1 but without the library overhead.

**Implementation sketch:**

```ts
// lib/cache/rate-limit.ts — Lua version
import "server-only"

const RATE_LIMIT_SCRIPT = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local count = redis.call("INCR", key)
  if count == 1 then
    redis.call("EXPIRE", key, window)
  end
  if count > limit then
    return 0
  end
  return 1
`

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  return withRedisClient(async (client) => {
    const result = await client.eval(RATE_LIMIT_SCRIPT, [key], [limit, windowSeconds])
    return result === 1
  }) ?? true  // graceful degradation
}
```

**Pros:**
- ✅ Atomic — same guarantee as Approach 1
- ✅ One HTTP round-trip
- ✅ No new dependency
- ✅ Full control over the logic
- ✅ Minimal code change

**Cons:**
- ⚠️ No caching (blocked keys still hit Redis)
- ⚠️ No timeout support (must implement manually)
- ⚠️ Must maintain the Lua script ourselves
- ⚠️ No sliding window (still fixed-window boundary burst)
- ⚠️ Duplicates what `@upstash/ratelimit` already provides with tests and maintenance

---

#### Approach 3: Redis Pipeline (Non-Atomic, Fewer Round-Trips)

**What it is:** Use Upstash's `pipeline()` API to send INCR + EXPIRE as a single HTTP request. Not fully atomic (other commands can interleave), but eliminates the double-HTTP problem.

```ts
const p = client.pipeline()
p.incr(key)
p.expire(key, windowSeconds)
const [count] = await p.exec<[number, boolean]>()
return (count ?? 0) <= limit
```

**Pros:**
- ✅ One HTTP round-trip
- ✅ Simple change

**Cons:**
- ❌ NOT atomic — pipeline execution can interleave with other commands
- ❌ Doesn't eliminate the race condition fully (just reduces the window)
- ❌ EXPIRE runs on every call, not just count === 1 (resets TTL on each request — window becomes sliding-ish)
- ❌ Or if conditional, requires same logic as current approach

---

### Recommendation Summary

| Criteria | Approach 1: @upstash/ratelimit | Approach 2: Lua EVAL | Approach 3: Pipeline |
|----------|-------------------------------|---------------------|---------------------|
| Atomicity | ✅ Full | ✅ Full | ❌ Partial |
| HTTP round-trips | 1 (evalsha) | 1 (eval) | 1 (pipeline) |
| Boundary burst fix | ✅ (sliding window) | ❌ (still fixed) | ❌ (still fixed) |
| Caching (0 calls for blocked) | ✅ | ❌ | ❌ |
| Already in package.json | ✅ | N/A | N/A |
| Maintenance burden | ✅ Upstream | ⚠️ Ours | ⚠️ Ours |
| Migration effort | Small | Small | Smallest |

**Strong recommendation: Approach 1 (`@upstash/ratelimit`).** The package is already a dependency, battle-tested, and provides atomic operations, sliding window, caching, and timeout — all for free. The current hand-rolled INCR+EXPIRE pattern duplicates its functionality with worse guarantees.

### Sources

1. `@upstash/ratelimit` GitHub: https://github.com/upstash/ratelimit-js (2k stars, v2.0.8, GA)
2. Fixed window Lua script: `src/lua-scripts/single.ts` lines 0-24 in upstash/ratelimit-js
3. Upstash EVAL docs: https://upstash.com/docs/redis/sdks/ts/commands/scripts/eval
4. Upstash Pipeline docs: https://upstash.com/docs/redis/sdks/ts/pipelining
5. Algorithm comparison: `skills/algorithms.md` in upstash/ratelimit-js
6. Cost analysis: `skills/pricing-cost.md` in upstash/ratelimit-js
7. Old app usage: `oldapp/lib/middleware/edge-rate-limit.ts` (uses `Ratelimit.slidingWindow`)
8. Current dependency: `package.json` line 58 — `"@upstash/ratelimit": "^2.0.8"`

---

## Appendix B — `@upstash/ratelimit` Migration Guide (Detailed)

### Current State Summary

**`lib/cache/rate-limit.ts`** — 28 lines, single export:
```ts
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean>
```

**`lib/cache/client.ts`** — Redis singleton + 3 exports:
- `incr(key)` — used ONLY by `rate-limit.ts`
- `expire(key, seconds)` — used ONLY by `rate-limit.ts`
- `ping()` — used ONLY by `app/api/health/route.ts`

### 5 Distinct Rate Limit Configurations

| Route | Key Pattern | Limit | Window | Identifier |
|-------|------------|-------|--------|------------|
| Chat API | `rate-limit-chat:{userId}` | 20 | 60s | userId |
| Vote action | `rate-limit-vote:{userId}` | 20 | 60s | userId |
| File upload | `rate-limit-upload:{userId}` | 10 | 3600s | userId |
| Login action | `rate-limit-login:{ip}` | 5 | 60s | client IP |
| Register action | `rate-limit-register:{ip}` | 3 | 60s | client IP |

### 4 Call Sites

```
features/auth/lib/action-utils.ts:40    → enforceAuthRateLimit(config) → checkRateLimit(...)
features/chat/lib/chat-route.ts:123     → enforceChatRateLimit(userId) → checkRateLimit(...)
features/voting/actions/vote.ts:90      → checkRateLimit(rateLimitKeys.rateLimitVote(userId), ...)
app/api/files/upload/route.ts:53        → checkUploadRateLimit(userId) → checkRateLimit(...)
```

### `@upstash/ratelimit` SDK API Quick Reference

```ts
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis,                    // @upstash/redis instance
  limiter: Ratelimit.fixedWindow(  // algorithm — also: slidingWindow, tokenBucket
    10,                            // max requests per window
    "60 s",                        // window duration string
  ),
  prefix: "@upstash/ratelimit",   // default; all keys prefixed with this
  ephemeralCache: new Map(),       // default; blocks known-blocked IDs locally → 0 Redis calls
  timeout: 5000,                   // default; auto-allow if Redis slow
  analytics: false,                // default; set true for Upstash dashboard
})

const { success, limit, remaining, reset, pending, reason } = await ratelimit.limit("identifier")
// success: boolean — whether request is allowed
// limit: number — max requests
// remaining: number — remaining in window
// reset: number — unix ms when counter resets
// pending: Promise — background analytics (call waitUntil if available)
// reason?: "timeout" | "cacheBlock" | "denyList"
```

**Key behavior:** The SDK prepends `prefix` to the identifier. So `ratelimit.limit("chat:user123")` creates Redis key `@upstash/ratelimit:chat:user123`.

**Key behavior:** `ephemeralCache` (default: `new Map()`) blocks already-rate-limited identifiers without any Redis call. This works because the Ratelimit instance is a singleton (module-level) that persists across requests in the same container.

**Key behavior:** `timeout` defaults to 5000ms — if Redis doesn't respond within this time, the request is auto-allowed. This IS the graceful degradation we manually implement.

### Migration Strategy: Preserve `checkRateLimit` Signature

The simplest migration path is to **keep the existing function signature** and swap the internals. This means zero changes at call sites.

#### Design: Lazy Singleton Ratelimit Instances

Since we have 5 different configurations (limit/window combos), we need multiple `Ratelimit` instances. We cache them by a composite key.

**Why multiple instances?** Each `Ratelimit` instance is bound to a single `(limit, window)` pair at construction time. Different routes have different limits (chat=20/60s, upload=10/3600s, login=5/60s, etc.).

**Why not 5 named instances?** Because `checkRateLimit` is generic — it takes `(key, limit, windowSeconds)` as parameters. The caller decides the limit. Creating instances lazily by config means the function signature doesn't change.

### Proposed Implementation

#### File 1: `lib/cache/rate-limit.ts` (REPLACEMENT)

```ts
import "server-only"

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

/**
 * Lazy-initialized Ratelimit instances keyed by "limit:windowSeconds".
 *
 * Each unique (limit, window) pair gets its own Ratelimit instance with
 * a dedicated Lua script + ephemeral cache. Instances are singletons —
 * created once per container lifetime, surviving across requests while hot.
 */
const limiters = new Map<string, Ratelimit>()

/** Tracks whether Redis env vars are missing — avoids logging on every call. */
let envMissing = false

function getOrCreateLimiter(
	limit: number,
	windowSeconds: number,
): Ratelimit | null {
	const cacheKey = `${limit}:${windowSeconds}`
	const cached = limiters.get(cacheKey)
	if (cached) return cached

	const url = process.env.CACHE_KV_REST_API_URL
	const token = process.env.CACHE_KV_REST_API_TOKEN

	if (!url || !token) {
		if (!envMissing) {
			console.warn("[rate-limit] CACHE_KV_REST_API_URL or TOKEN missing — rate limiting disabled")
			envMissing = true
		}
		return null
	}

	const limiter = new Ratelimit({
		redis: new Redis({ url, token }),
		limiter: Ratelimit.fixedWindow(limit, `${windowSeconds} s`),
		prefix: "rl",
		// ephemeralCache defaults to new Map() — blocks known-blocked IDs locally (0 Redis calls)
		// timeout defaults to 5000ms — auto-allows if Redis is slow (graceful degradation)
	})

	limiters.set(cacheKey, limiter)
	return limiter
}

/**
 * Check rate limit for the given Redis key.
 *
 * Returns `true` if the request is within the limit.
 * Gracefully degrades to `true` if Redis is unavailable or slow (5s timeout).
 *
 * Uses @upstash/ratelimit internally — each (limit, window) pair gets a
 * dedicated Ratelimit instance with atomic Lua scripts and ephemeral caching.
 */
export async function checkRateLimit(
	key: string,
	limit: number,
	windowSeconds: number,
): Promise<boolean> {
	const limiter = getOrCreateLimiter(limit, windowSeconds)
	if (!limiter) return true // graceful degradation — no Redis

	try {
		const { success } = await limiter.limit(key)
		return success
	} catch {
		return true // graceful degradation — unexpected error
	}
}
```

#### File 2: `lib/cache/client.ts` (CLEANUP)

After migration, `incr()` and `expire()` become dead code (only used by rate-limit.ts). Remove them:

```ts
// REMOVE: incr() — no longer needed (was only for rate limiting)
// REMOVE: expire() — no longer needed (was only for rate limiting)
// KEEP: ping() — still used by app/api/health/route.ts
// KEEP: getClient() + withRedisClient() + singleton — needed by ping()
```

The client.ts reduces from 80 lines → ~55 lines. `ping()` remains the only export besides the internal client.

**Note:** `getClient()` and the singleton pattern must remain because `ping()` uses them. However, `incr` and `expire` imports should be removed from rate-limit.ts since it will import directly from `@upstash/ratelimit`.

#### File 3: `lib/cache/keys.ts` (OPTIONAL CLEANUP)

The `rateLimitKeys` still work as before — they just produce string identifiers passed to `checkRateLimit()`. No change needed.

**Optional:** Remove the 2 dead key builders: `rateLimit(userId)` and `rateLimitDaily(userId)` that were identified in W1 audit finding F6.

#### Files 4-7: Call Sites (NO CHANGES)

All 4 call sites import and call `checkRateLimit` with the same signature:
```ts
import { checkRateLimit } from "@/lib/cache/rate-limit"

// These calls remain UNCHANGED:
checkRateLimit(key, limit, windowSeconds) // → boolean
```

### Migration Execution Order

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Replace lib/cache/rate-limit.ts internals               │
│   - Remove import { expire, incr } from "@/lib/cache/client"   │
│   - Add import { Ratelimit } from "@upstash/ratelimit"         │
│   - Add import { Redis } from "@upstash/redis"                 │
│   - Replace function body with SDK-based implementation         │
│   - Keep same export signature: checkRateLimit(key,limit,win)  │
├─────────────────────────────────────────────────────────────────┤
│ Step 2: Clean up lib/cache/client.ts                            │
│   - Remove incr() export                                        │
│   - Remove expire() export                                      │
│   - Keep getClient(), withRedisClient(), ping()                 │
├─────────────────────────────────────────────────────────────────┤
│ Step 3: Verify                                                   │
│   - pnpm typecheck                                               │
│   - pnpm lint                                                    │
│   - pnpm format                                                  │
│   - Grep: no remaining imports of incr/expire                   │
├─────────────────────────────────────────────────────────────────┤
│ Step 4 (optional): Clean dead code in keys.ts                   │
│   - Remove rateLimit() and rateLimitDaily() builders            │
└─────────────────────────────────────────────────────────────────┘
```

### Redis Key Format Change

**Before:** Keys are stored exactly as the caller provides them:
```
rate-limit-chat:user_abc123          ← raw key in Redis
rate-limit-login:203.0.113.1         ← raw key in Redis
```

**After:** `@upstash/ratelimit` prepends its prefix and appends a window bucket:
```
rl:rate-limit-chat:user_abc123:1234567  ← prefix:identifier:bucket
rl:rate-limit-login:203.0.113.1:1234567
```

**Impact:** Existing rate limit counters in Redis will NOT carry over. Users who were mid-window will get a fresh window. This is **acceptable** because:
1. Rate limit windows are short (60s for most, 3600s for uploads)
2. The old keys (without prefix) will auto-expire via their TTL
3. No data loss — rate limits are ephemeral abuse prevention

### Algorithm Choice: fixedWindow vs slidingWindow

**Recommended: Start with `fixedWindow` for 1:1 parity**, then optionally upgrade to `slidingWindow` for auth routes.

| Route | Algorithm | Rationale |
|-------|-----------|-----------|
| Chat (20/60s) | `fixedWindow` | Parity with current behavior. Burst at boundaries is acceptable — chat has its own UX throttling. |
| Vote (20/60s) | `fixedWindow` | High volume, low consequence. Burst tolerance acceptable. |
| Upload (10/3600s) | `fixedWindow` | 1-hour window — boundary burst gives max 20 uploads, still acceptable. |
| Login (5/60s) | `slidingWindow` | **Security-sensitive.** Sliding window prevents bruteforce burst at boundary (10 attempts in 2s). 5 commands vs 3, but auth frequency is low. |
| Register (3/60s) | `slidingWindow` | **Security-sensitive.** Same reasoning as login. |

If all routes use `fixedWindow` for initial parity, the migration is simpler. Auth routes can be upgraded to `slidingWindow` in a follow-up.

### Ephemeral Cache Behavior

With `ephemeralCache: new Map()` (the default), a blocked identifier is cached locally. Subsequent requests from the same identifier **do not hit Redis at all** until the window resets.

```
Request 1:  userId=abc → Redis EVALSHA → count=1, allowed     (1 HTTP call)
Request 20: userId=abc → Redis EVALSHA → count=20, allowed    (1 HTTP call)
Request 21: userId=abc → Redis EVALSHA → count=21, BLOCKED    (1 HTTP call, cached locally)
Request 22: userId=abc → ephemeral cache → BLOCKED             (0 HTTP calls!)
Request 23: userId=abc → ephemeral cache → BLOCKED             (0 HTTP calls!)
...until window resets...
```

**Savings for abusive users:** If a user sends 100 requests after being blocked, that's 79 Redis calls saved.

**Caveat in serverless:** Ephemeral cache only works if the Ratelimit instance persists across requests. In our case it will — the module-level `limiters` Map survives across requests in the same container (same pattern as the existing `globalForRedis` singleton).

### Timeout / Graceful Degradation

The SDK's default timeout is 5000ms. If Redis doesn't respond within that time, `limiter.limit()` returns `{ success: true, reason: "timeout" }` — auto-allowing the request.

This replaces our manual `try/catch → return true` graceful degradation. The outer `catch` in our implementation still provides a safety net for truly unexpected errors (e.g., SDK bug).

### Testing Considerations

1. **Integration test:** Call `checkRateLimit("test-key", 2, 10)` three times — first two should return `true`, third should return `false`.
2. **Graceful degradation test:** Unset `CACHE_KV_REST_API_URL` → all calls should return `true`.
3. **No existing tests to update:** The current codebase has no rate-limit unit tests (confirmed by W1 audit).

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Key format change resets in-flight windows | Certain | Negligible | Windows are 60s-3600s; old keys auto-expire |
| Ratelimit SDK has a bug | Very Low | Medium | Catch-all returns `true`; revert is simple |
| Multiple Ratelimit instances use too much memory | Very Low | Negligible | ~1KB per instance, 5 instances max |
| Ephemeral cache causes false blocks after code deploy | Low | Low | Container restart clears module-level Map |

### Summary

Total migration touches **2 files** (rate-limit.ts replacement + client.ts cleanup), with **0 call site changes**. The `checkRateLimit(key, limit, windowSeconds) → boolean` contract is preserved exactly. The SDK handles atomicity, caching, timeout, and graceful degradation — all things we currently implement partially or incorrectly.
