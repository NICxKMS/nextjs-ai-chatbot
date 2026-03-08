# Scope 5 — Proxy & Session Optimization Report

## Summary

Eliminated triple JWT verification for guest requests, removed dead code, added module-level caching for hot-path allocations, and fixed the `isGuest` flash bug in SessionProvider.

---

## JWT Verification Count: Before → After

| Path | Before | After | Savings |
|------|--------|-------|---------|
| Guest-eligible route (no rotation) | 3× (proxy verify + rotateGuestToken verify + session.ts verify) | 1× (proxy verify only) | −2 JWT verifications |
| Guest-eligible route (with rotation) | 3× | 1× | −2 JWT verifications |
| Auth-required route (guest user) | 2× (proxy `hasVerifiedGuestToken` + session.ts verify) | 1× (proxy verify only) | −1 JWT verification |
| New guest mint | 1× (session.ts verify only — token just minted) | 0× (userId forwarded via header) | −1 JWT verification |

**Mechanism:** Proxy sets `x-guest-user-id` request header after its single verification. Downstream `resolveGuestSession()` reads this header and trusts it (proxy is sole entry point — header cannot be forged from client). `rotateGuestToken()` receives the pre-verified payload directly.

---

## Files Modified

### `lib/auth/guest.ts`
- **Added** `GuestTokenPayload` exported type (`{ userId: string; exp: number }`)
- **Changed** `verifyGuestToken()` return type from `{ userId: string } | null` → `GuestTokenPayload | null` (non-breaking — adds `exp` field)
- **Changed** `rotateGuestToken()` — accepts optional `preVerified?: GuestTokenPayload` second argument. When provided, skips JWT verification entirely. Backward compatible: without the argument, falls back to self-verification.
- **Removed** `_resetSecretCache()` — dead export never imported anywhere (was `@internal` test-only but no tests use it)

### `proxy.ts`
- **Removed** `MOBILE_UA_PATTERN` constant and `x-device-type` header setting — dead code (no consumer exists in the codebase; `useIsMobile` hook supports it as an optional prop but no server component reads the header)
- **Removed** `hasVerifiedGuestToken()` helper — replaced with inline `verifyGuestToken()` calls that capture the verified payload
- **Added** `x-guest-user-id` header forwarding in all three guest paths:
  - `mintGuestTokenResponse()` — sets header with the newly generated guestId
  - Auth-required branch — sets header after verification
  - Guest-eligible branch — sets header after verification, passes payload to `rotateGuestToken()`
- **Changed** `rotateGuestToken()` call — now passes verified payload to skip re-verification
- **Updated** JSDoc to reflect removed device detection and added header forwarding

### `lib/auth/session.ts`
- **Added** `headers` import from `next/headers`
- **Added** module-level Supabase config cache (`getSupabaseConfig()` lazy singleton) — avoids reading `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars on every `createSupabaseServerClient()` call
- **Changed** `createSupabaseServerClient()` — uses cached config
- **Changed** `resolveGuestSession()` — checks `x-guest-user-id` header first (fast path from proxy), falls back to JWT verification for direct server action calls not routed through proxy

### `lib/cache/client.ts`
- **Reordered** `getClient()` — checks `globalForRedis.__upstashRedis` cache and `__upstashRedisInitFailed` flag *before* reading env vars. Previously, `process.env.CACHE_KV_REST_API_URL` and `process.env.CACHE_KV_REST_API_TOKEN` were read on every call even when the Redis client was already cached.

### `lib/utils/validate-origin.ts`
- **Replaced** `getAllowedOrigins(requestUrl)` (created new `Set` on every POST) with `getStaticAllowedOrigins()` lazy singleton that caches env-derived origins at module level
- **Changed** `validateOrigin()` — checks self-origin (`request.url` origin) via simple string comparison first, then checks cached static origins set

### `features/auth/components/session-provider.tsx`
- **Fixed** `isGuest` flash bug: changed from `session?.user.type === "guest" || isLoading` to `session?.user.type === "guest"`. Previously, authenticated users appeared as guests during the loading state because `isLoading` being `true` short-circuited to `isGuest = true`. Now during loading, `isGuest` is `false` (unknown ≠ guest). The `isLoading` flag is already exposed separately for UI that needs to show loading states.

### `features/sidebar/components/sidebar-user-nav.tsx`
- **No changes needed.** The component already handles `isLoading` via `showSkeleton = !mounted || isLoading` (shows skeleton during loading), and `isAuthenticated = session !== null && !isGuest` correctly evaluates to `false` during loading (since `session` is `null`), which is the desired behavior.

---

## Decisions

1. **`verifyGuestToken` return type expanded** — Added `exp` field to enable passing expiry info to `rotateGuestToken`. Non-breaking change since all consumers access `.userId` which is still present. The `exp` field is used by `rotateGuestToken` to decide rotation without re-verifying.

2. **`x-device-type` removed entirely** — The hook infrastructure (`useIsMobile`, `SidebarProvider.initialIsMobile`) exists for consuming this header, but no server component actually reads `x-device-type` from `headers()` and passes it down. The header was pure dead work. If mobile SSR optimization is needed later, the hook is ready — just wire it up in a server layout.

3. **`validate-origin.ts` self-origin check separated** — Rather than including `requestUrl.origin` in the cached Set (which would make the cache request-dependent), the self-origin check is a simple string comparison before the Set lookup. Functionally equivalent, zero allocation overhead.

4. **`isGuest` flash fix is minimal** — Removing `|| isLoading` is the correct fix because the `isLoading` state is already a separate field in the context. Components that need loading behavior should check `isLoading` directly (as `SidebarUserNav` already does).

---

## Validation

- `pnpm format` — ✅ (228 files, no fixes needed)
- `pnpm typecheck` — ✅ (only pre-existing errors: `playwright.config.ts` missing test module, `ai-elements/reasoning.tsx` read-only type mismatch)
- `pnpm lint` — ✅ (only pre-existing warning: unused import in `lib/data/artifact.ts`)
