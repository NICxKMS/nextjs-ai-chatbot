# Auth — Guest Token Lifecycle

```
FLOW: Guest Token Lifecycle
ENTRY: Any request to a guest-eligible or auth-required route via proxy.ts
STEPS:

  ── Token Configuration ──

  Constants (lib/auth/constants.ts):
  - GUEST_COOKIE_NAME = "guest_token"
  - GUEST_TOKEN_TTL_SECONDS = 3600 (1 hour JWT expiry)
  - GUEST_TOKEN_ROTATION_THRESHOLD_SECONDS = 1800 (30 minutes — rotate when <30min left)

  Cookie options (proxy.ts):
  - httpOnly: true (not accessible from JS)
  - secure: true in production
  - sameSite: "lax"
  - maxAge: 604800 (7 days — LONGER than the JWT TTL)
  - path: "/"

  ── Minting (new guest identity) ──

  Triggered when:
  a. Guest-eligible route, no Supabase cookie, no guest_token cookie
  b. Guest-eligible route, no Supabase cookie, INVALID guest_token (expired/tampered)

  1. `crypto.randomUUID()` → generates a new guest user ID (v4 UUID)

  2. `mintGuestToken(guestId)` (lib/auth/guest.ts)
     a. `getSecret()` → resolve `GUEST_JWT_SECRET` env var → TextEncoder.encode()
        - Cached: raw string + encoded Uint8Array are module-level cached
        - If env var missing → throw "GUEST_JWT_SECRET is not configured"
     b. `new SignJWT({ sub: userId, type: "guest" })`
        - Header: `{ alg: "HS256" }`
        - Claims: `sub` = guestId, `type` = "guest", `iat` = now, `exp` = now + 3600
     c. `.sign(secret)` → returns signed JWT string

  3. Dual-write pattern:
     a. `updateForwardedGuestCookie(request, requestHeaders, token)`
        - Sets `guest_token` on the request object's cookies
        - Rebuilds the `cookie` header string on forwarded request headers
        → Ensures downstream Server Components/Actions see the new cookie
          within the same request lifecycle
     b. `response.cookies.set(GUEST_COOKIE_NAME, token, GUEST_COOKIE_OPTIONS)`
        - Sets `Set-Cookie` header on the response
        → Ensures the browser stores the cookie for subsequent requests

  ── Verification ──

  Triggered on every request where guest_token exists and matters:
  - Auth-required routes: verify to check if user has valid session
  - Guest-eligible routes: verify to decide if rotation is needed

  4. `verifyGuestToken(token)` (lib/auth/guest.ts)
     a. `getSecret()` → resolve cached secret
     b. `jwtVerify(token, secret)` (jose library)
        - Validates signature (HS256)
        - Validates expiry (exp claim)
        - On expired token: jose throws JWTExpired → caught → return null
     c. Check `payload.type === "guest"` and `typeof payload.sub === "string"`
     d. Return `{ userId: payload.sub }` on success, `null` on any failure
     → NEVER throws from public API

  ── Rotation ──

  Triggered when:
  - Guest-eligible route, no Supabase cookie, valid guest_token exists

  5. `rotateGuestToken(token)` (lib/auth/guest.ts)
     a. `jwtVerify(token, secret)` → full verification again (redundant with step 4)
     b. Check `payload.type` and `payload.sub`
     c. Check time remaining: `payload.exp - now`
        - If >= 1800s (30+ minutes remaining) → return original token (no rotation)
        - If < 1800s → mint fresh token with same `payload.sub` (same identity)
     d. `mintGuestToken(payload.sub)` → new JWT, same userId, fresh 1hr expiry
     → NEVER throws: returns original token on any error

  6. If rotated (new token !== original):
     - Same dual-write pattern as minting (step 3)
     - Browser gets new cookie, downstream sees new token

  ── Deletion ──

  7. Guest token is deleted in these scenarios:
     a. Login success → `migrateGuestChatsAndClearToken()` → `cookieStore.delete(GUEST_COOKIE_NAME)`
     b. Register success (with immediate session) → same as login
     c. Logout → `cookieStore.delete(GUEST_COOKIE_NAME)`
     → After deletion, next visit to guest-eligible route triggers fresh mint

  ── Session Resolution ──

  8. `resolveGuestSession()` (lib/auth/session.ts)
     - Called by `getAppSession()` only if `resolveSupabaseSession()` returns null
     - Reads `guest_token` from `cookies()` store
     - Calls `verifyGuestToken(token)` (another verification — see waste)
     - Returns `AppSession` with `type: "guest"` or null

BOTTLENECKS:
  - JWT verification runs up to 3 times per guest request:
    1. proxy.ts `verifyGuestToken()` for route-level session detection
    2. proxy.ts `rotateGuestToken()` calls `jwtVerify()` again internally
    3. `resolveGuestSession()` in downstream handler calls `verifyGuestToken()` again
  - Each `jwtVerify()` involves HMAC-SHA256 computation (CPU-bound but fast)

WASTE:
  - Triple JWT verification per request (as noted above): proxy verifies,
    rotateGuestToken re-verifies, then getAppSession verifies again. The
    proxy result is not forwarded to downstream handlers.
  - Cookie maxAge (7 days) vs JWT TTL (1 hour) mismatch:
    - A guest who returns after 2 hours has an expired JWT in a valid cookie
    - proxy.ts verifies → fails → mints new identity → old guest data is orphaned
    - This means returning guests get a NEW identity, losing chat history
    - If the intent is guest continuity, the maxAge should match TTL (or use refresh)
    - If the intent is fresh identity on return, the maxAge is unnecessarily long
  - Dual-write pattern requires manual cookie header reconstruction:
    `request.cookies.set()` + `requestHeaders.set("cookie", request.cookies.toString())`
    — this is fragile and duplicates cookie state

SIMPLIFICATION OPPORTUNITIES:
  - Forward verification result from proxy to downstream via a custom header
    (e.g., `x-guest-user-id`) to eliminate re-verification in `getAppSession()`
  - Refactor `rotateGuestToken()` to accept a pre-verified payload instead of
    re-verifying the token internally
  - Align cookie maxAge with JWT TTL (1 hour) or implement a refresh token
    pattern for multi-day guest continuity
  - Consider storing guest userId in the cookie payload AND as a separate
    plain-text cookie that `resolveGuestSession()` can read without JWT
    verification (the JWT is still validated in proxy for security)

EXIT: Guest token is either:
  - Freshly minted (new identity) → set on request + response
  - Rotated (same identity, fresh expiry) → set on request + response
  - Valid and unchanged → no cookie mutation
  - Deleted → during auth transitions (login/register/logout)
```

## Token Lifecycle State Machine

```
                    ┌─────────────┐
                    │  No Cookie  │
                    └──────┬──────┘
                           │ guest-eligible route
                           ▼
                    ┌─────────────┐
                    │   MINTED    │ (new UUID, 1hr JWT, 7d cookie)
                    └──────┬──────┘
                           │ subsequent requests
                           ▼
              ┌────────────┴────────────┐
              │                         │
         <30min left              ≥30min left
              │                         │
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │   ROTATED   │          │   VALID     │ (no cookie write)
       │ (same UUID) │          │             │
       └──────┬──────┘          └──────┬──────┘
              │                         │
              └────────────┬────────────┘
                           │ after 1hr (JWT expires)
                           ▼
                    ┌─────────────┐
                    │   EXPIRED   │ (cookie still valid for 7d)
                    └──────┬──────┘
                           │ next guest-eligible request
                           ▼
                    ┌─────────────┐
                    │ RE-MINTED   │ (NEW UUID — old guest data orphaned)
                    └─────────────┘
```

## Key Files
| File | Purpose |
|------|---------|
| `lib/auth/guest.ts` | `mintGuestToken`, `verifyGuestToken`, `rotateGuestToken` |
| `lib/auth/constants.ts` | Cookie name, TTL, rotation threshold |
| `proxy.ts` | Guest token lifecycle orchestration |
| `lib/auth/session.ts` | `resolveGuestSession()` — downstream verification |
| `features/auth/lib/action-utils.ts` | `migrateGuestChatsAndClearToken()` — deletion |
