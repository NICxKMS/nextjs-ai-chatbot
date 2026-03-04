# Auth System

> **Updated per redesign audit (2026-03-01)**

## Architecture Overview

Dual authentication: **Supabase** (registered users) and **Guest JWT** (anonymous users). Both produce an `AppSession` with consistent shape, allowing the rest of the app to be auth-agnostic.

> *SessionProvider wraps the app. `proxy.ts` handles guest JWT bootstrap/rotation, rate limiting, and request guards in a single edge layer. Auth mutations are Server Actions (`login`, `register`, `logout`).*

```
                   ┌─────────────────┐
                   │   proxy.ts      │ (Edge: request interception)
                   │   - Guest JWT   │
                   │   - Token rotation│
                   │   - Rate limiting │
                   │   - Path guards  │
                   │   - Mobile detect│
                   └────────┬────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐
    │ Supabase Auth   │         │ Guest Auth      │
    │ - Email/Password│         │ - Auto-created  │
    │ - JWT in cookie │         │ - JWT in cookie │
    │ - sb-access-token │       │ - guest_token   │
    └────────┬────────┘         └────────┬────────┘
             │                           │
             └───────────┬───────────────┘
                         ▼
               ┌─────────────────┐
               │  getAppSession()│
               │  → AppSession   │
               └─────────────────┘
```

---

## Session Types

### `AppSession`
```typescript
type AppSession = {
  user: {
    id: string;       // UUID (Supabase sub) or "guest:{uuid}"
    type: "authenticated" | "guest";
    email?: string;   // Only for authenticated
  };
};
```

### Session Resolution Order
1. Check `sb-access-token` cookie → validate as Supabase JWT → return authenticated session
2. Check `guest_token` cookie → validate as Guest JWT → return guest session
3. No valid token → return `null` (triggers redirect to login)

---

## Supabase Authentication

> Canonical Supabase session cookie name: `sb-access-token` (legacy `sb_token` references are deprecated). <!-- C2-W4: D3 fix -->

### Login Action Flow
1. Client submits AuthForm (`useActionState`) to `login` Server Action
2. Server Action validates input and calls `supabase.auth.signInWithPassword({ email, password })`
3. Server Action sets `sb-access-token` httpOnly cookie (7-day maxAge)
4. Server Action deletes `guest_token` to clear stale guest identity (`cookieStore.delete('guest_token')`) <!-- C2-W4: D1 fix -->
5. Redirect to `/` (router cache invalidated)

### Cookie Configuration
```
Name: sb-access-token
Value: <Supabase JWT>
HttpOnly: true
Secure: true (production)
SameSite: lax
MaxAge: 604800 (7 days)
Path: /
```

### Registration
1. Client submits AuthForm (`useActionState`) to `register` Server Action
2. Server Action calls `supabase.auth.signUp({ email, password })`
3. If email confirmation required → redirect to login with message
4. If session returned immediately → set `sb-access-token`, delete `guest_token`, and redirect <!-- C2-W4: D1 fix -->

### Logout
1. Client invokes `logout` Server Action
2. Server Action calls `supabase.auth.signOut()`
3. Delete `sb-access-token` and `guest_token` cookies <!-- C2-W4: D1 fix -->
4. Redirect to `/login`

---

## Guest Authentication

### Auto-Creation (`proxy.ts`)
```typescript
// Triggered when: no sb-access-token AND no guest_token
const guestId = `guest:${crypto.randomUUID()}`;
const payload = { sub: guestId, iat: now, exp: now + 3600 }; // 1h TTL
const token = signJWT(payload, GUEST_JWT_SECRET, "HS256");
setCookie("guest_token", token, { maxAge: 604800 }); // 7d cookie
```

> **Dual-write pattern (CONF-012):** proxy.ts uses `request.cookies.set('guest_token', token)` for same-request server-component readability (forwarded via `NextResponse.next({ request: { headers: request.headers } })`) + `response.cookies.set('guest_token', token, { httpOnly, secure, ... })` for browser persistence. This eliminates any need for client-side guest JWT minting — `getAppSession()` resolves the guest session on the **same request** that proxy.ts creates it. <!-- audit: W4-CONF-012 -->

### Token Rotation
In `proxy.ts`, on every request:
1. Check `guest_token` expiry
2. If < 30 minutes remaining → issue new JWT with fresh 1-hour expiry
3. Same `guest:uuid` subject preserved (identity maintained)
4. Cookie refreshed with new 7-day maxAge

### Guest Limitations
| Feature | Guest | Authenticated |
|---------|-------|---------------|
| Chat | Yes (DB + cache) | Yes (DB + cache) |
| Chat history | Yes (DB-backed, scoped to session) | Yes (full, DB-backed) |
| View others' public chats | No | Yes |
| Vote on messages | No | Yes |
| Artifact suggestions persistence | No | Yes |
| Delete chats | Yes (DB + cache) | Yes (DB + cache) |
| Daily message limit | 20 | 100 |
| File upload | Yes | Yes |
| Settings | Yes (localStorage) | Yes (localStorage) |

### Guest Data Lifecycle
- Guest identity is cookie-backed (`guest:{uuid}`) and participates in normal DB persistence
- Guest ID format: `guest:{uuid}` (embedded in JWT `sub` claim)
- Redis outages may reduce performance but do not fully block guest usage
- Guest data may be migrated during authenticated transitions by auth/data layer flows

---

## Request Interception Layer (`proxy.ts`)

> *`proxy.ts` is the single request interception layer. Handles guest JWT creation, token rotation, rate limiting, and path guards.*
>
> **Note (Next.js 16):** `proxy.ts` runs on the Node.js runtime, not the Edge runtime. Earlier references to "edge" in this document are historical — the functionality is identical but the runtime is Node.js.

### Route Classification Matrix (canonical)
<!-- C2-W4: C2X-005 fix -->

This matrix is the sole route-policy authority for proxy behavior and is a required input to P2-T08.

| Category | Route examples | Proxy behavior |
|---|---|---|
| public (skip auth) | `/login`, `/register`, `/api/health` | Skip auth redirects and skip guest bootstrap. |
| guest-eligible (auto-bootstrap) | `/`, `/chat`, `/chat/:id` | Auto-mint/forward `guest_token` when both `sb-access-token` and `guest_token` are absent; allow request. |
| auth-required (redirect) | Protected pages requiring authenticated identity | Redirect to `/login` when no valid session exists; non-guest enforcement remains in route/action guards. |
| rate-limit-exempt | `/_next/*`, static assets, `/favicon.ico`, `/api/health` | Skip edge-level throttling checks. |

### Edge Rate Limiting (`proxy.ts`)
Uses `@upstash/ratelimit` with Redis backend. This is a **global edge-level** throttle for lightweight abuse prevention — separate from per-route/action limits below.

```typescript
// Edge-level rate limit config (global throttle, all requests)
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(50, "1 m"),  // 50 req/min (edge-level)
  prefix: "edge-rl",
});
```

**Identifier:** User ID from session (guest or auth), falls back to IP.

### Route/Action Rate Limiting (inline checks)
Server-side limits are enforced inline in Route Handlers and Server Actions for sensitive surfaces. These are **per-route/action** limits, a separate layer from the edge-level throttle above.

<!-- C2-W4: D2 fix -->

| Surface | Limit | Notes |
|---|---|---|
| `chat` | `50/min` | Chat generation/stream surfaces |
| `standard` | `100/min` | Baseline limiter for general actions |
| `upload` | `10/hour` | Attachment/image upload surfaces |
| `login` action | `5/min` | Matches P2-T04 auth action requirement |
| `register` action | `3/min` | Matches P2-T04 auth action requirement |
| `logout` action | `standard` (`100/min`) | Included with auth action limits in P2-T04 |

All backed by Redis. Key format: `rl:{type}:{userId}`.

---

## Auth in API Routes / Server Actions

> *Server Actions return `ActionResult<T>` instead of throwing HTTP errors. Same auth guard pattern applies.*

### Common Pattern
```typescript
// Server Action pattern
async function deleteChat({ chatId }: { chatId: string }): Promise<ActionResult<void>> {
  const session = await getAppSession();
  if (!session) {
    return {
      success: false,
      error: { code: 'unauthorized:chat:auth_required', message: 'Unauthorized' },
    };
  }
  // ... proceed with session.user
}

// Route Handler pattern (retained for POST /api/chat)
export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session) {
    return new AppError('unauthorized:chat:auth_required', 'Unauthorized', 401).toResponse();
  }
  // ... proceed with session.user
}
```

### Auth Guards (inline helpers)
```typescript
requireAuth(session)         // Throws if no session
requireNonGuest(session)     // Throws if guest user
requireChatOwner(chat, userId) // Throws if not chat owner
requireMessageInChat(messageId, chatId) // Throws if message not in chat
```

> These checks are applied directly inside Route Handlers/Server Actions (no dedicated `lib/api/guards.ts` module in redesign).

---

## Security Considerations

### IDOR Protection
- Chat operations verify `userId` matches session
- Vote operations verify message belongs to chat AND chat belongs to user
- Artifact operations verify ownership through chatId chain

### JWT Security
- Supabase: RS256 (asymmetric), validated with public key via `SUPABASE_JWT_SECRET`
- Guest: HS256 (symmetric), validated with `GUEST_JWT_SECRET`
- Both use `jose` library for JWT operations

### Cookie Security
- Both cookies: `httpOnly`, `secure` (production), `sameSite: lax`
- No client-side JavaScript access to auth tokens
- Cookie path: `/` (available to all routes)

### Token Expiry Strategy
| Token | JWT Expiry | Cookie Expiry | Rotation |
|-------|------------|---------------|----------|
| Supabase | Provider-controlled | 7 days | On exchange |
| Guest | 1 hour | 7 days | When < 30min remaining |

Guest token has short JWT life (1h) but long cookie life (7d) to enable frequent rotation while maintaining identity.

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous API key |
| `SUPABASE_JWT_SECRET` | Yes | JWT validation for Supabase tokens |
| `GUEST_JWT_SECRET` | Yes | JWT signing/validation for guest tokens |
