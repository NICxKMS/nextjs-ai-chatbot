# Phase 8: Authentication Logic - Issues

**Phase Name:** Authentication Logic
**Comparison Scope:** Auth Client, Session, Guards, Guest Route, Auth Handler, Auth Config, Middleware
**Date Started:** 2026-02-15
**Date Completed:** 2026-02-16

## Issue Counts

| Category | Count |
|----------|-------|
| UI Inconsistencies | 0 |
| Bugs | 3 |
| Broken Code | 0 |
| Functional Discrepancies | 9 |
| Improvement Only | 4 |
| **Total** | **16** |

### By Severity

| Severity | Count |
|----------|-------|
| High | 5 |
| Medium | 2 |
| Low | 3 |

### By Verification Status

| Verdict | Count | Issues |
|---------|-------|--------|
| Verified / Defect | 10 | P8-BUG-001, P8-BUG-002, P8-BUG-003, P8-FNC-003, P8-FNC-004, P8-FNC-005, P8-FNC-006, P8-FNC-007, P8-FNC-008, P8-FNC-009 |
| False Positive | 2 | P8-FNC-001, P8-FNC-002 |
| Improvement | 4 | P8-IMP-001, P8-IMP-002, P8-IMP-003, P8-IMP-004 |

## Table of Contents

- [Issue Counts](#issue-counts)
- [UI Inconsistencies](#ui-inconsistencies)
- [Bugs](#bugs)
- [Broken Code](#broken-code)
- [Functional Discrepancies](#functional-discrepancies)
- [Improvement Only](#improvement-only)

## VERIFICATION SUMMARY

| Issue | Status | Timestamp |
|-------|--------|-----------|
| P8-BUG-001 | Defect | 2026-02-16T14:23:00Z |
| P8-BUG-002 | Defect | 2026-02-16T14:23:00Z |
| P8-BUG-003 | Verified | 2026-02-16T12:00:00Z |
| P8-FNC-001 | False Positive | 2026-02-16T16:00:00Z |
| P8-FNC-002 | False Positive | 2026-02-16T16:00:00Z |
| P8-FNC-003 | Defect | 2026-02-16T14:23:00Z |
| P8-FNC-004 | Defect | 2026-02-16T14:23:00Z |
| P8-FNC-005 | Verified | 2026-02-16T12:00:00Z |
| P8-FNC-006 | Verified | 2026-02-16T12:00:00Z |
| P8-FNC-007 | Verified | 2026-02-16T12:00:00Z |
| P8-FNC-008 | Verified (Arch. Decision) | 2026-02-16T12:00:00Z |
| P8-FNC-009 | Verified | 2026-02-16T12:00:00Z |
| P8-IMP-001 | Improvement | 2026-02-16T14:23:00Z |
| P8-IMP-002 | Improvement | 2026-02-16T12:00:00Z |
| P8-IMP-003 | Improvement | 2026-02-16T12:00:00Z |
| P8-IMP-004 | Improvement | 2026-02-16T12:00:00Z |

## UI Inconsistencies

*No UI inconsistencies identified in this phase.*

## Bugs

### [P8-BUG-001] Guest Session Uses Unsigned Cookies Instead of JWT

| Field | Value |
|-------|-------|
| **Issue ID** | P8-BUG-001 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/auth/session.ts:227-260` |
| **NEW Path** | `lib/auth/session.ts:289-312` |

**Description:**
The OLD app used JWT-signed guest tokens with the following security features:
- JWT signed with `GUEST_JWT_SECRET` (L49-57)
- Token expiration with configurable TTL (L34-35)
- Token rotation mechanism (shorter JWT TTL vs cookie TTL)
- Cryptographic verification of guest identity

The NEW app uses a simple unsigned cookie:
```typescript
// NEW: L289-312
async function createGuestSession(): Promise<AppSession> {
    const guestId = `${GUEST_ID_PREFIX}${crypto.randomUUID()}`
    cookieStore.set(GUEST_COOKIE_NAME, guestId, {...})
}
```

**Impact:**
- Guest sessions can be forged by attackers who can set cookies
- No cryptographic verification of guest identity
- No token expiration enforcement at the cryptographic level
- Reduced security posture for guest-based operations

**Suggested Fix:**
Implement JWT-signed guest tokens similar to the OLD implementation:
1. Add `GUEST_JWT_SECRET` environment variable
2. Use `jose` library to sign and verify guest tokens
3. Implement token rotation for long-lived sessions
4. Add proper expiration validation

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T14:23:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/lib/auth/session.ts` `createGuestSession()` (L227-260): creates JWT with `new SignJWT({sub: guestId, type: "guest"}).setProtectedHeader({alg: "HS256"}).setExpirationTime(expiresAtSeconds).sign(secret)` — cryptographically signed with `GUEST_JWT_SECRET`, 1-hour JWT TTL for security, 7-day cookie TTL for UX, with rotation. OLD `getGuestSessionFromCookies()` (L196-223) verifies the JWT via `verifyJwt(token, secret)` — invalid/expired tokens return null. NEW `lib/auth/session.ts` `createGuestSession()` (L289-312): stores raw `guest:${crypto.randomUUID()}` string directly in cookie. NEW `getGuestSession()` (L261-283) only checks `guestId.startsWith(GUEST_ID_PREFIX)` — format validation only, no cryptographic verification. Any user with browser dev tools or same-domain script can forge a guest identity by setting `guest_id=guest:any-arbitrary-string`. While `httpOnly: true` and `secure` in production mitigate JS-based tampering and MITM, the fundamental issue is that guest identity is NOT cryptographically verified on read-back.

---

### [P8-BUG-002] Missing CSRF Protection in Guest Route

| Field | Value |
|-------|-------|
| **Issue ID** | P8-BUG-002 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/api/auth/guest/route.ts:21-28` |
| **NEW Path** | `app/api/auth/guest/route.ts:19-33` |

**Description:**
The OLD app's guest route had CSRF protection:
```typescript
// OLD: L22-28
if (!validateOrigin(request)) {
    return new ChatSDKError(
        "forbidden:auth:csrf",
        "Invalid request origin"
    ).toResponse();
}
```

The NEW app has no CSRF protection in the guest route.

**Impact:**
- A malicious site can issue cross-origin POST requests to create guest sessions on the victim's browser
- Potentially overwrites or disrupts existing session state
- Combined with missing rate limiting (P8-FNC-005), this endpoint is fully unprotected against automated cross-origin abuse

**Suggested Fix:**
Add `validateOrigin(request)` check to the guest route POST handler. The function is already available in the NEW codebase (exported from `lib/api/context.ts` and re-exported via `lib/api/index.ts`). The NEW logout route already uses this pattern.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T14:23:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/api/auth/guest/route.ts` POST handler: L22 checks `validateOrigin(request)`, returning 403 with `"forbidden:auth:csrf"` error code on failure. NEW `app/api/auth/guest/route.ts:19` defines `export async function POST()` — note: the `request` parameter is not even accepted, making origin validation structurally impossible without signature change. The `validateOrigin` function IS available in the NEW codebase: exported from `lib/api/context.ts` and re-exported via `lib/api/index.ts`. The NEW logout route (`app/api/auth/logout/route.ts`) DOES call `validateOrigin(request)`, proving the pattern is used elsewhere. A malicious site can issue `fetch('https://target.com/api/auth/guest', { method: 'POST', credentials: 'include' })` to create guest sessions on the victim's browser, potentially overwriting or disrupting existing session state. Combined with P8-FNC-005 (no rate limiting on auth routes), this endpoint is fully unprotected against automated cross-origin abuse.

---

### [P8-BUG-003] Missing Open Redirect Protection in Guest GET Handler

| Field | Value |
|-------|-------|
| **Issue ID** | P8-BUG-003 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/api/auth/guest/route.ts:113-162` |
| **NEW Path** | `app/api/auth/guest/route.ts:42-55` |

**Description:**
The OLD app had comprehensive open redirect protection:
```typescript
// OLD: L113-162
const getSafeRedirectUrl = (): string => {
    // Block dangerous schemes (javascript:, data:, vbscript:, file:)
    // Allow only relative paths starting with /
    // Block protocol-relative URLs (//example.com)
    // Validate absolute URLs match origin
    // Path traversal detection with regex
};
```

The NEW app has no redirect validation:
```typescript
// NEW: L42-55
export async function GET(request: Request) {
    const url = new URL(request.url);
    const redirectUrl = url.searchParams.get("redirectUrl") || "/";
    // No validation of redirectUrl
    return NextResponse.redirect(new URL(redirectUrl, url.origin));
}
```

**Impact:**
- Open redirect vulnerability (CWE-601)
- Users can be redirected to malicious sites
- Phishing attack vector

**Suggested Fix:**
Implement the same redirect validation logic from the OLD app:
1. Block dangerous URL schemes
2. Only allow relative paths or same-origin URLs
3. Validate and sanitize redirect URLs

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed — CWE-601 open redirect vulnerability. OLD route (L113-162) has `getSafeRedirectUrl()` which blocks `javascript:`, `data:`, `vbscript:`, `file:` schemes, protocol-relative URLs (`//evil.com`), path traversal (`/\\example.com`), and validates absolute URL origins. NEW route (L42-55) does `new URL(redirectUrl, url.origin)` with NO validation. Attack vectors confirmed: `?redirectUrl=https://evil.com` resolves to `https://evil.com` (ignoring base), `?redirectUrl=//evil.com` resolves to `https://evil.com`. The `new URL()` constructor provides no inherent redirect safety.

## Broken Code

*No broken code identified in this phase.*

## Functional Discrepancies

### [P8-FNC-001] Missing Auth Client Module

| Field | Value |
|-------|-------|
| **Issue ID** | P8-FNC-001 |
| **Severity** | High |
| **Status** | False Positive |
| **OLD Path** | `archive/oldapp/lib/auth/client.ts:1-23` |
| **NEW Path** | N/A |

**Description:**
The OLD app had a dedicated auth client module (`lib/auth/client.ts`) that provided a singleton Supabase browser client for client-side authentication operations. The NEW app has no equivalent client-side auth utility module.

**Impact:**
None — NextAuth provides all required client-side auth utilities natively.

**Suggested Fix:**
No fix needed. Use `useSession()`, `signIn()`, `signOut()` from `next-auth/react` directly.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | False Positive |
| **Verified At** | 2026-02-16T16:00:00Z |

**Findings:** The OLD module (`archive/oldapp/lib/auth/client.ts`) was Supabase-specific infrastructure: it created a singleton `createBrowserClient` from `@supabase/ssr` using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The NEW app uses NextAuth v5, which provides equivalent client-side utilities out of the box: `useSession()` for session state, `signIn()` and `signOut()` from `next-auth/react`, and `SessionProvider` for context. Grep confirms no Supabase dependencies exist in the NEW codebase. The `issues/05-utilities/issues.md` also documents this explicitly: "NextAuth provides `SessionProvider` and `useSession` from `next-auth/react` for client-side access." No custom client-side module is required because NextAuth replaces all Supabase browser client functionality natively. **False Positive — architectural replacement, not a gap.**

**Re-Verification (2026-02-16T16:00:00Z):** Re-checked for custom error handling, retry logic, session refresh, and token management in OLD `client.ts`. The module is 24 lines: a singleton factory for `createBrowserClient()` with a single `throw new Error()` on missing env vars. Zero retry logic, zero session refresh, zero token management. The `onAuthStateChange` listener and session state management existed in `auth-provider.tsx` (a separate component, not `client.ts`). The OLD consumers (`login/page.tsx`, `register/page.tsx`, `sidebar-user-nav.tsx`) used the browser client only for `signInWithPassword()`, `signUp()`, and `signOut()` — all replaced by NextAuth's `signIn()`/`signOut()`. **FP CONFIRMED — no lost capabilities in `client.ts` replacement.**

---

### [P8-FNC-002] Missing Supabase Session Token Verification

| Field | Value |
|-------|-------|
| **Issue ID** | P8-FNC-002 |
| **Severity** | Medium |
| **Status** | False Positive |
| **OLD Path** | `archive/oldapp/lib/auth/session.ts:100-179` |
| **NEW Path** | `lib/auth/session.ts` |

**Description:**
The OLD app had dedicated functions for verifying Supabase JWT tokens:
- `getSupabaseSessionFromToken()` - Verify token from string
- `getSupabaseSessionFromCookies()` - Verify token from cookie
- JWT verification with audience and issuer validation
- Email extraction from JWT claims

The NEW app uses NextAuth's `auth()` function which handles session verification internally but doesn't provide the same level of JWT claim access.

**Impact:**
This is an architectural decision (Supabase → NextAuth migration). Document that:
1. Existing users will need to re-authenticate after migration
2. Session migration strategy should be documented
3. Consider adding migration endpoint for existing sessions

**Suggested Fix:**
No fix needed — intentional architectural migration.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | False Positive |
| **Verified At** | 2026-02-16T16:00:00Z |

**Findings:** False Positive — intentional architectural migration. The OLD functions (`getSupabaseSessionFromToken`, `getSupabaseSessionFromCookies`) verified Supabase-issued JWTs using `SUPABASE_JWT_SECRET` with audience=`"authenticated"` and issuer=`supabaseUrl/auth/v1`. The NEW app uses NextAuth v5 with `session: { strategy: "jwt" }` (`lib/auth/config.ts:131`). NextAuth performs equivalent JWT verification internally: tokens are signed with `NEXTAUTH_SECRET`/`AUTH_SECRET` (`lib/auth/config.ts:175`), verified on every `auth()` call, and the `jwt` callback (L158-163) and `session` callback (L170-174) populate `session.user.id` and `session.user.email`. NextAuth handles audience/issuer verification implicitly through its own token format. The `auth()` function (`lib/auth/index.ts:31`) returning `session?.user?.id` in `lib/auth/session.ts:88-97` is the equivalent verification path. No security gap exists — the verification mechanism changed but verification still occurs.

**Re-Verification (2026-02-16T16:00:00Z):** Re-checked whether NextAuth's `auth()` provides equivalent security guarantees. Traced the full chain: (1) **Signature verification**: NextAuth signs JWTs with `NEXTAUTH_SECRET` (config.ts:175) using HS256, verifies automatically on every `auth()` call. (2) **Expiration**: `session.maxAge = 30 * 24 * 60 * 60` (config.ts:132) enforced by NextAuth. `updateAge = 24 * 60 * 60` (config.ts:133) provides automatic token refresh — OLD had no equivalent auto-refresh for Supabase tokens. (3) **Audience/Issuer**: OLD validated `audience: "authenticated"` and `issuer: supabaseUrl/auth/v1` because tokens came from an EXTERNAL auth service (Supabase). NextAuth is a FIRST-PARTY system — it issues AND verifies its own tokens, making audience/issuer validation unnecessary (no cross-service token acceptance). (4) **Email extraction**: NextAuth's session callback (config.ts:170-174) populates `session.user.email` from the authenticated user record. (5) **Edge cases**: The OLD `getSupabaseSessionFromToken()` was used after setting cookies in the same request. NextAuth handles this internally with its own session management. No edge case where manual verification is needed. **FP CONFIRMED — NextAuth provides equivalent or stronger security guarantees. Audience/issuer validation loss is irrelevant for self-issued tokens.**

---

### [P8-FNC-003] Missing Rate Limiting in Auth Guards

| Field | Value |
|-------|-------|
| **Issue ID** | P8-FNC-003 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/api/guards.ts:118-187` |
| **NEW Path** | `lib/auth/guards.ts`, `middleware.ts:69-78` |

**Description:**
The OLD app's guards included integrated rate limiting:
- `requireRateLimit()` - Throws on rate limit exceeded
- `requireRateLimitForRoute()` - Returns Response on rate limit exceeded
- `requireCustomRateLimit()` - Custom rate limit config support
- `requireCustomRateLimitForRoute()` - Custom rate limit for routes

The NEW app's guards have no rate limiting integration. Rate limiting is only in middleware (`middleware.ts`).

**Impact:**
- API routes cannot easily apply granular rate limiting
- No programmatic rate limit control in server actions
- Rate limiting is only at the middleware level (coarse-grained)

**Suggested Fix:**
Add rate limiting guard functions to `lib/auth/guards.ts` or create a separate `lib/rate-limit/guards.ts` module that integrates with the existing rate limit infrastructure.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T14:23:00Z |

**Findings:** Confirmed — and the defect is MORE severe than originally described. (1) **Guards gap**: OLD `archive/oldapp/lib/api/guards.ts` exports `requireRateLimit()` (L118), `requireRateLimitForRoute()` (L150), `requireCustomRateLimit()` (L173), `requireCustomRateLimitForRoute()` (L192) — enabling per-action granular rate limiting. NEW `lib/auth/guards.ts` has ZERO rate limiting functions — grep for `rateLimit|checkRateLimit` across `lib/auth/guards.ts` returns zero matches. (2) **Middleware bypass — CRITICAL**: The middleware (`middleware.ts:69-72`) skips ALL `/api/auth/` routes via `isAuthCallbackRoute()` which returns `NextResponse.next()` BEFORE reaching rate limiting at L80-88. The `getLimiterForRoute()` function (L187-210) selects `authLimiter` for `/api/auth/guest` and `/api/auth/logout`, but this code is UNREACHABLE because the early return at L72 short-circuits all `/api/auth/` routes. This means `/api/auth/guest` and `/api/auth/logout` have NO rate limiting at ANY layer — neither middleware nor guard-level. An attacker can spam guest session creation at unlimited frequency.

---

### [P8-FNC-004] Missing requireResource Guard Function

| Field | Value |
|-------|-------|
| **Issue ID** | P8-FNC-004 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/api/guards.ts:277-304` |
| **NEW Path** | `lib/auth/guards.ts` |

**Description:**
The OLD app had `requireResource()` and `requireResourceForRoute()` functions that:
- Throw `ChatSDKError` with `not_found` code if resource is null/undefined
- Provide consistent 404 handling across API routes
- Return typed non-null resource

The NEW app has no equivalent function.

**Impact:**
- Inconsistent null/undefined resource handling across routes
- More boilerplate for "resource not found" scenarios
- No standardized error response for missing resources

**Suggested Fix:**
Add `requireResource()` function to guards or a utility module:
```typescript
export function requireResource<T>(
    resource: T | null | undefined,
    resourceType: string
): T {
    if (!resource) {
        throw new NotFoundError(`${resourceType} not found`);
    }
    return resource;
}
```

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T14:23:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/lib/api/guards.ts` exports `requireResource<T>(resource, surface): T` (L277-285) and `requireResourceForRoute<T>(resource, surface): T | Response` (L292-304). Grep for `requireResource` across all non-archive files returns zero matches — the function does not exist anywhere in the NEW codebase. API routes and server actions must implement their own null-check-and-throw pattern for missing resources. The NEW guards (`lib/auth/guards.ts`) provide `requireAuth`, `requireOwnership`, `requireNonGuest`, `requireChatAccess`, `requireChatModification` — all authorization guards — but no resource-existence guard. The OLD function was used pervasively (e.g., in `archive/oldapp/app/(chat)/actions.ts` for chat/document operations). Its absence in the NEW code creates inconsistent 404/null handling across routes.

---

### [P8-FNC-005] Missing Rate Limiting in Guest Route

| Field | Value |
|-------|-------|
| **Issue ID** | P8-FNC-005 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/api/auth/guest/route.ts:30-45` |
| **NEW Path** | `app/api/auth/guest/route.ts` |

**Description:**
The OLD app's guest route had IP-based rate limiting:
```typescript
// OLD: L30-45
const ip = getClientIP(request);
const rateLimitResult = await requireCustomRateLimitForRoute({
    strategy: "sliding_window",
    limit: RATE_LIMITS.AUTH_GUEST.limit,
    window: RATE_LIMITS.AUTH_GUEST.window,
    identifier: ip,
    namespace: RATE_LIMITS.AUTH_GUEST.namespace,
}, "auth");
```

The NEW app has no rate limiting in the guest route handler.

**Impact:**
- Attackers can spam guest session creation
- Potential for resource exhaustion
- No protection against automated abuse

**Suggested Fix:**
Add rate limiting to the guest route:
1. Use the existing rate limit infrastructure from `lib/rate-limit`
2. Apply IP-based rate limiting before creating sessions
3. Return 429 response when limit exceeded

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed. OLD route (L30-45) uses `requireCustomRateLimitForRoute()` with IP-based sliding-window rate limiting via `RATE_LIMITS.AUTH_GUEST` config and `getClientIP()`. NEW route has zero rate limiting — neither in the POST nor GET handler. The middleware-level rate limiting in `middleware.ts` is too coarse-grained to substitute for endpoint-specific guest creation throttling. Attackers can spam guest session creation without restriction.

---

### [P8-FNC-006] Missing Logging in Guest Route

| Field | Value |
|-------|-------|
| **Issue ID** | P8-FNC-006 |
| **Severity** | Low |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/api/auth/guest/route.ts:50-52,66-68,84-88,169-175,187-190` |
| **NEW Path** | `app/api/auth/guest/route.ts` |

**Description:**
The OLD app had comprehensive logging:
- Log when returning existing Supabase session
- Log when reusing existing guest session (with truncated ID for privacy)
- Log when creating new guest session
- Log redirect actions

The NEW app has no logging in the guest route.

**Impact:**
- Difficult to debug authentication issues
- No audit trail for guest session creation
- Cannot monitor for suspicious patterns

**Suggested Fix:**
Add logging statements throughout the guest route:
```typescript
import { logger } from "@/lib/logger";
logger.info("Guest session created", { guestIdPrefix: guestId.slice(0, 13) });
```

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed. OLD route imports `logInfo`/`logWarn` from `@/lib/log` and has 5 log points: existing Supabase session reuse (L50-52), guest session reuse with truncated ID (L66-68), new guest creation (L84-88), GET redirect with session (L169-175), and GET redirect after creation (L187-190). NEW route has zero logging — no imports from any log module, no log calls anywhere. This eliminates audit trail for guest session lifecycle.

---

### [P8-FNC-007] Missing maxDuration Configuration

| Field | Value |
|-------|-------|
| **Issue ID** | P8-FNC-007 |
| **Severity** | Low |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/api/auth/guest/route.ts:15` |
| **NEW Path** | `app/api/auth/guest/route.ts` |

**Description:**
The OLD app configured `maxDuration = 10` for Vercel Fluid Compute optimization. The NEW app has no such configuration.

**Impact:**
- Suboptimal serverless function configuration
- May affect performance on Vercel deployments

**Suggested Fix:**
Add `export const maxDuration = 10;` to the guest route.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed. OLD route has `export const maxDuration = 10;` at L15 for Vercel Fluid Compute optimization. NEW route has no `maxDuration` export — verified by full file scan (57 lines total, only exports are `POST` and `GET` functions). Missing export means Vercel uses default function timeout.

---

### [P8-FNC-008] Different Error Types Used

| Field | Value |
|-------|-------|
| **Issue ID** | P8-FNC-008 |
| **Severity** | Low |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/api/guards.ts` |
| **NEW Path** | `lib/auth/guards.ts` |

**Description:**
The OLD app used `ChatSDKError` with structured error codes:
- `unauthorized:{surface}:session_error`
- `unauthorized:{surface}:missing_session`
- `rate_limit:{surface}`
- `forbidden:{surface}:owner_mismatch`
- `not_found:{surface}`
- `forbidden:{surface}:guest_cannot_{action}`

The NEW app uses generic `UnauthorizedError` and `ForbiddenError` without surface-specific codes.

**Impact:**
- Less granular error information
- Harder to track specific error sources
- Different error response format

**Suggested Fix:**
Consider adopting the structured error code pattern from the OLD app, or document this as an intentional simplification.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Verified (Arch. Decision) |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed — intentional architectural change. OLD guards (`archive/oldapp/lib/api/guards.ts`) use `ChatSDKError` with composite error codes encoding surface context (e.g., `unauthorized:chat:session_error`, `forbidden:vote:owner_mismatch`, `rate_limit:api:too_many_requests`). NEW guards (`lib/auth/guards.ts`) use `UnauthorizedError` (extends `AppError`, HTTP 401, code `UNAUTHORIZED`) and `ForbiddenError` (extends `AppError`, HTTP 403, code `FORBIDDEN`) from `lib/errors.ts:212-240`. These use flat `ErrorCodes` enum values without surface-specific context. The simplified hierarchy is cleaner but provides less diagnostic granularity. The OLD `ChatSDKError` still exists in `archive/oldapp/` and is independently used by old guards — confirmed no cross-usage between old and new error systems.

---

### [P8-FNC-009] Missing DataContext in AuthResult

| Field | Value |
|-------|-------|
| **Issue ID** | P8-FNC-009 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/lib/api/guards.ts:31-71` |
| **NEW Path** | `lib/auth/guards.ts:65-78` |

**Description:**
The OLD app's `requireAuth()` returned both session and DataContext:
```typescript
// OLD: L31-35
export type AuthResult = {
    session: AppSession;
    ctx: DataContext;
};
```

The NEW app only returns `userId`:
```typescript
// NEW: L65-78
export async function requireAuth(): Promise<{ userId: string }>
```

**Impact:**
- Cannot directly access session object after auth check
- Need separate call to get full session
- DataContext pattern not integrated with guards

**Suggested Fix:**
Update `requireAuth()` to return full session object:
```typescript
export async function requireAuth(): Promise<{ session: AppSession; userId: string }>
```

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Verified |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed. OLD `requireAuth(surface)` (L48-71) returns `{ session: AppSession; ctx: DataContext }` — combines session retrieval, validation, and `createContext(session)` in one call. NEW `requireAuth(options?)` returns only `{ userId: string }` — the session object is fetched internally via `getSession()` but NOT returned to the caller. Callers needing the full session must make a separate `getSession()` call, duplicating work. The `DataContext` pattern from OLD code (via `createContext()` in `lib/data/base`) is not integrated with the NEW guards at all. The NEW `lib/auth/session.ts` does have `createSessionContext()` (per P8-IMP-004) but it is not wired into the guard return type.

## Improvement Only

### [P8-IMP-001] Missing ForRoute Guard Variants

| Field | Value |
|-------|-------|
| **Issue ID** | P8-IMP-001 |
| **Location** | `lib/auth/guards.ts` |

**Description:** The OLD app provided dual variants for all guard functions (e.g., `requireAuth()` throws for server actions, `requireAuthForRoute()` returns Response for API routes). The NEW app only has throwing variants. This is an intentional architectural simplification — the v6 architecture shifted from API routes to server actions for mutations.
**Status:** Enhancement - No action required.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T14:23:00Z |

**Findings:** Confirmed as an intentional architectural trade-off. OLD `archive/oldapp/lib/api/guards.ts` exports 6 `ForRoute` variants: `requireAuthForRoute` (L87), `requireRateLimitForRoute` (L150), `requireCustomRateLimitForRoute` (L192), `verifyOwnershipForRoute` (L246), `requireResourceForRoute` (L292), `requireNonGuestForRoute` (L338). NEW `lib/auth/guards.ts` has zero `ForRoute` variants — grep confirms no matches outside archive. However, the NEW v6 architecture deliberately shifted from API routes to server actions for mutations. The NEW guards provide `requireAuth()` (throws for server components), `requireAuthAction()` (throws for server actions), `withAuth()` / `withOwnership()` (higher-order wrappers) — all designed for the server-action-first pattern. The few remaining API routes (`app/api/`) call server actions internally rather than using guards directly. While adding `ForRoute` variants would reduce boilerplate in the remaining API routes, the architectural direction is clear: server actions throw, middleware handles route-level concerns. Not a defect — an intentional simplification.

---

### [P8-IMP-002] NEW: Higher-Order Guard Functions

| Field | Value |
|-------|-------|
| **Issue ID** | P8-IMP-002 |
| **Location** | `lib/auth/guards.ts:373-411` |

**Description:** The NEW app adds higher-order guard functions not present in the OLD app: `withAuth()` wraps server actions with authentication, `withOwnership()` wraps server actions with ownership check. Enables declarative server action protection.
**Status:** Enhancement - No action required.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed — genuine new feature. `withAuth<TArgs, TResult>()` wraps server actions by prepending `userId` (via `requireAuthAction()`) as the first argument. `withOwnership<TArgs, TResult>()` wraps actions by resolving owner ID from args, calling `requireOwnership()`, then appending `userId` to the action call. Both use proper generic typing. No equivalent exists in OLD guards (`archive/oldapp/lib/api/guards.ts`). OLD guards only provide direct `requireAuth(surface)` calls without higher-order composition. This is a positive architectural improvement enabling declarative server action protection.

---

### [P8-IMP-003] NEW: Chat-Specific Authorization Functions

| Field | Value |
|-------|-------|
| **Issue ID** | P8-IMP-003 |
| **Location** | `lib/auth/guards.ts:199-313` |

**Description:** The NEW app adds chat-specific authorization functions: `canAccessChat()` (check read permission), `canModifyChat()` (check write permission), `requireChatAccess()` (require read permission), `requireChatModification()` (require write permission). Provides domain-specific authorization logic.
**Status:** Enhancement - No action required.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** All four functions confirmed present in `lib/auth/guards.ts` with correct implementations: `canAccessChat(chat, userId?)` — checks ownership OR public visibility, returns `Promise<boolean>`; `canModifyChat(chat, userId?)` — owner-only write check, returns `Promise<boolean>`; `requireChatAccess(chat)` — throws `ForbiddenError` on denied access; `requireChatModification(chat)` — throws `ForbiddenError` on denied modification. Supporting `ChatResource` type defined with `userId` and `visibility` fields extending `OwnedResource`. Well-documented with JSDoc and usage examples. No equivalent exists in OLD app — confirmed genuine new feature.

---

### [P8-IMP-004] NEW: Session Context Helper

| Field | Value |
|-------|-------|
| **Issue ID** | P8-IMP-004 |
| **Location** | `lib/auth/session.ts:342-356` |

**Description:** The NEW app adds `createSessionContext()` helper for repository pattern integration. Returns `Promise<{ userId: string | null; isGuest: boolean }>`. Provides clean bridge between session layer and repository pattern.
**Status:** Enhancement - No action required.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Function confirmed present in `lib/auth/session.ts`. Returns `Promise<{ userId: string | null; isGuest: boolean }>`. Calls `getSession()` internally + `isGuest(session)` for guest check. Provides clean bridge between session layer and repository pattern. No equivalent in OLD app — confirmed genuine new feature.

## Files Compared

| Component | OLD File | NEW File |
|-----------|----------|----------|
| Auth Client | `archive/oldapp/lib/auth/client.ts` | `lib/auth/client.ts` (MISSING) |
| Auth Session | `archive/oldapp/lib/auth/session.ts` | `lib/auth/session.ts` |
| Auth Guards | `archive/oldapp/lib/api/guards.ts` | `lib/auth/guards.ts` |
| Guest Route | `archive/oldapp/app/api/auth/guest/route.ts` | `app/api/auth/guest/route.ts` |
| Auth Handler | N/A | `app/api/auth/[...nextauth]/route.ts` |
| Auth Config | N/A | `lib/auth/config.ts`, `lib/auth/index.ts` |
| Middleware | N/A | `middleware.ts` |

## Files Without Issues

### `lib/auth/config.ts`
No issues found - NextAuth configuration is complete and follows best practices.

### `lib/auth/index.ts`
No issues found - Clean barrel export with proper type augmentation.

### `middleware.ts`
No issues found - Comprehensive middleware with rate limiting and auth integration.

## Recommendations

### Priority 1 (Security-Critical)
1. Implement JWT-signed guest sessions (P8-BUG-001)
2. Add CSRF protection to guest route (P8-BUG-002)
3. Fix open redirect vulnerability (P8-BUG-003)
4. Add rate limiting to guest route (P8-FNC-005)

### Priority 2 (Functionality)
1. Add rate limiting guard functions (P8-FNC-003)
2. Add `requireResource` function (P8-FNC-004)
3. Update `requireAuth` return type (P8-FNC-009)

### Priority 3 (Polish)
1. Add logging to guest route (P8-FNC-006)
2. Add maxDuration configuration (P8-FNC-007)
3. Consider structured error codes (P8-FNC-008)
