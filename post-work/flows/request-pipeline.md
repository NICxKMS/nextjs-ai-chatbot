# HTTP Request Pipeline

```
FLOW: HTTP Request Pipeline
ENTRY: Browser sends HTTP request to Next.js server
STEPS:
  1. Next.js receives request → checks `proxy.ts` config.matcher:
     ["/", "/chat/:path*", "/login", "/register", "/api/chat"]
     → Only matching routes enter the proxy; all others go straight to Next.js routing

  2. proxy(request) → extracts `pathname` from `request.nextUrl`

  3. Rate-limit exemption check → `isRateLimitExempt(pathname)` checks against:
     - `/_next/`
     - `/favicon.ico`
     - `/images/`
     - `/api/health`
     → If exempt: `NextResponse.next()` immediately (no header cloning, no device detection)

  4. Clone request headers → `new Headers(request.headers)` into `requestHeaders`

  5. Device detection → reads `user-agent` header → tests against MOBILE_UA_PATTERN regex
     → sets `x-device-type: "mobile" | "desktop"` on `requestHeaders`

  6. Route classification → `classifyRoute(pathname)` → returns one of:
     - "public" — routes in PUBLIC_ROUTES: /login, /register, /api/health
     - "guest-eligible" — routes in GUEST_ELIGIBLE_ROUTES (/, /api/chat) or GUEST_ELIGIBLE_PREFIXES (/chat/)
     - "auth-required" — everything else (future admin routes, etc.)

  7a. PUBLIC route → `forwardRequest(requestHeaders)` → NextResponse.next() with mutated headers → EXIT

  7b. AUTH-REQUIRED route:
     - Read all cookies, check for Supabase auth cookie (via `isSupabaseAuthCookieName()`)
     - Read `guest_token` cookie
     - If no Supabase cookie: verify guest token via `hasVerifiedGuestToken(guestToken)`
       - calls `verifyGuestToken(token)` (jose jwtVerify)
     - If neither Supabase nor valid guest token: redirect to `/login`
     - If either exists: fall through to step 8

  7c. GUEST-ELIGIBLE route (and no Supabase token):
     - No guest token at all → `mintGuestTokenResponse()`:
       - Generate `crypto.randomUUID()` for guestId
       - `mintGuestToken(guestId)` → jose SignJWT, HS256, 1hr expiry
       - Dual-write: set cookie on forwarded request headers AND on response
       - Cookie options: httpOnly, secure (prod), sameSite=lax, maxAge=7d, path=/
       → EXIT with response containing new guest cookie

     - Guest token exists → `verifyGuestToken(guestToken)`:
       - Valid: try `rotateGuestToken(guestToken)`
         - Token still fresh (>30min remaining) → same token returned, no cookie write
         - Token near expiry (<30min) → mint fresh token → dual-write
       - Invalid/expired: `mintGuestTokenResponse()` → new identity, dual-write
       - Error in any JWT op → `console.error`, continue without guest token (degraded)

  8. Forward request → `forwardRequest(requestHeaders)` → NextResponse.next() with
     mutated headers (x-device-type set, possibly updated cookie header)

  9. Next.js App Router receives the forwarded request → route matching → page/API handler

BOTTLENECKS:
  - JWT verification (`jwtVerify`) on every non-public request for auth-required routes
  - JWT verification + potential rotation on every guest-eligible request when
    a guest token exists (two async jose operations per request)
  - `getSupabaseAuthCookieBaseName()` does URL parsing on every invocation
    (no module-level caching of the base name — recomputed per request)

WASTE:
  - `isSupabaseAuthCookieName()` re-derives the base name on every call via
    `getSupabaseAuthCookieBaseName()` which parses `NEXT_PUBLIC_SUPABASE_URL`
    each time. The URL never changes at runtime — this could be computed once.
  - Guest cookie max-age (7 days) vs JWT TTL (1 hour) mismatch: the cookie
    persists long after the JWT expires, meaning most returning guests trigger
    a verify-fail + re-mint cycle instead of a clean mint.
  - Rate-limit exempt check uses `.some()` prefix matching but the matcher config
    doesn't include `/_next/`, `/favicon.ico`, or `/images/` — so these paths
    never reach the proxy anyway. The exempt check is dead code for those paths.
    Only `/api/health` in the exempt list overlaps with the matcher (and it's
    also in PUBLIC_ROUTES, so it exits at step 7a before the exempt check matters).

SIMPLIFICATION OPPORTUNITIES:
  - Cache `getSupabaseAuthCookieBaseName()` result at module level (env vars
    don't change after process start)
  - Remove RATE_LIMIT_EXEMPT_PREFIXES that can never match (/_next/, /favicon.ico,
    /images/) — they're not in the matcher config
  - Consider aligning cookie maxAge with JWT TTL to avoid verify-fail churn,
    or use a shorter cookie maxAge
  - The dual-write pattern (cookie on request headers + cookie on response)
    could be simplified if Next.js 16 proxy supports a single cookie mutation API

EXIT: NextResponse (next/redirect) sent back to the client
```

## Key Files
| File | Purpose |
|------|---------|
| `proxy.ts` | Main proxy interceptor — all logic lives here |
| `lib/auth/constants.ts` | `GUEST_COOKIE_NAME`, TTL constants |
| `lib/auth/guest.ts` | `mintGuestToken`, `verifyGuestToken`, `rotateGuestToken` |
| `next.config.ts` | Next.js config (no proxy-related config beyond matcher) |
