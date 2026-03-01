# Auth System

## Architecture Overview

Dual authentication: **Supabase** (registered users) and **Guest JWT** (anonymous users). Both produce an `AppSession` with consistent shape, allowing the rest of the app to be auth-agnostic.

```
                   ┌─────────────────┐
                   │   proxy.ts      │ (Edge: request interception)
                   │   - Guest JWT   │
                   │   - Token rotation│
                   │   - Mobile detect│
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │  Edge Middleware │ (Next.js middleware.ts)
                   │  - Rate limiting │
                   │  - Path guards  │
                   └────────┬────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐
    │ Supabase Auth   │         │ Guest Auth      │
    │ - Email/Password│         │ - Auto-created  │
    │ - JWT in cookie │         │ - JWT in cookie │
    │ - sb_token      │         │ - guest_token   │
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
1. Check `sb_token` cookie → validate as Supabase JWT → return authenticated session
2. Check `guest_token` cookie → validate as Guest JWT → return guest session
3. No valid token → return `null` (triggers redirect to login)

---

## Supabase Authentication

### Token Exchange Flow
1. Client calls `supabase.auth.signInWithPassword({ email, password })`
2. Supabase returns `session.access_token`
3. Client POSTs to `/api/auth/exchange` with `{ accessToken }`
4. Server validates JWT:
   ```typescript
   const { payload } = await jwtVerify(accessToken, secret, {
     audience: "authenticated",
     issuer: `${SUPABASE_URL}/auth/v1`,
   });
   ```
5. Server sets `sb_token` httpOnly cookie (7-day maxAge)
6. Returns `{ user: { id: payload.sub, email: payload.email } }`

### Cookie Configuration
```
Name: sb_token
Value: <Supabase JWT>
HttpOnly: true
Secure: true (production)
SameSite: lax
MaxAge: 604800 (7 days)
Path: /
```

### Registration
1. Client calls `supabase.auth.signUp({ email, password })`
2. If email confirmation required → redirect to login with message
3. If session returned immediately → exchange token (same as login flow)

### Logout
1. Client calls `supabase.auth.signOut()`
2. Delete `sb_token` cookie
3. Redirect to `/login`

---

## Guest Authentication

### Auto-Creation (`proxy.ts`)
```typescript
// Triggered when: no sb_token AND no guest_token
const guestId = `guest:${crypto.randomUUID()}`;
const payload = { sub: guestId, iat: now, exp: now + 3600 }; // 1h TTL
const token = signJWT(payload, GUEST_JWT_SECRET, "HS256");
setCookie("guest_token", token, { maxAge: 604800 }); // 7d cookie
```

### Token Rotation
In `proxy.ts`, on every request:
1. Check `guest_token` expiry
2. If < 30 minutes remaining → issue new JWT with fresh 1-hour expiry
3. Same `guest:uuid` subject preserved (identity maintained)
4. Cookie refreshed with new 7-day maxAge

### Guest Limitations
| Feature | Guest | Authenticated |
|---------|-------|---------------|
| Chat | Yes (cache-only) | Yes (DB + cache) |
| Chat history | Yes (limited, cache-only) | Yes (full, DB-backed) |
| View others' public chats | No | Yes |
| Vote on messages | No | Yes |
| Document suggestions persistence | No | Yes |
| Delete chats | Yes (cache delete) | Yes (DB + cache) |
| Daily message limit | 20 | 100 |
| File upload | Yes | Yes |
| Settings | Yes (localStorage) | Yes (localStorage) |

### Guest Data Lifecycle
- All guest data lives in Redis with 7-day TTL
- Guest ID format: `guest:{uuid}` (embedded in JWT `sub` claim)
- If Redis is unavailable, guest cannot use the app (`guest_requires_cache` error)
- Guest data is ephemeral — no migration path to authenticated account

---

## Middleware (`lib/middleware/`)

### Edge Rate Limiting (`edge-rate-limit.ts`)
Uses `@upstash/ratelimit` with Redis backend.

```typescript
// Rate limit config
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"),  // 100 req/min
  prefix: "edge-rl",
});
```

**Skip paths:** `/api/health`

**Identifier:** User ID from session (guest or auth), falls back to IP.

### Application Rate Limiting (`rate-limit.ts`)
Server-side rate limiting with multiple algorithms.

```typescript
// Available algorithms
TokenBucket(maxTokens, refillRate, refillIntervalMs)
SlidingWindow(maxRequests, windowMs)
FixedWindow(maxRequests, windowMs)

// Pre-configured limiters
RateLimiters = {
  standard: SlidingWindow(100, 60_000),   // 100/min
  strict: SlidingWindow(10, 60_000),      // 10/min
  chat: SlidingWindow(50, 60_000),        // 50/min
  upload: FixedWindow(10, 3_600_000),     // 10/hour
};
```

All backed by Redis. Key format: `rl:{type}:{userId}`.

---

## Auth in API Routes

### Common Pattern
```typescript
export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session) {
    return new ChatSDKError("unauthorized:chat:auth_required").toResponse();
  }
  // ... proceed with session.user
}
```

### Auth Guards (`lib/api/guards.ts`)
```typescript
requireAuth(session)         // Throws if no session
requireNonGuest(session)     // Throws if guest user
requireChatOwner(chat, userId) // Throws if not chat owner
requireMessageInChat(messageId, chatId) // Throws if message not in chat
```

---

## Security Considerations

### IDOR Protection
- Chat operations verify `userId` matches session
- Vote operations verify message belongs to chat AND chat belongs to user
- Document operations verify ownership through chatId chain

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
