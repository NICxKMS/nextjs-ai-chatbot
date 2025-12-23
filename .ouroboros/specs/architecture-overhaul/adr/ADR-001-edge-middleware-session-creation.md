# ADR-001: Edge Middleware Session Creation

## Status

Accepted

## Date

2024-12-23

## Reference

ARCH-001, PERF-001

## Context

The original implementation created guest sessions via a client-side API call to `/api/auth/guest`. This caused a request waterfall pattern:

1. Page loads → React hydrates
2. Client detects no session → fetches `/api/auth/guest`
3. API creates session → returns token
4. Client stores token → re-renders with session

This added **100-200ms latency** to the first meaningful interaction for every new guest user. The waterfall was especially problematic on slower networks and mobile devices.

Additionally, the client-side approach exposed the guest creation endpoint to abuse, requiring additional rate limiting and CAPTCHA considerations.

## Decision

Move guest session creation to **Next.js Edge Middleware** (`middleware.ts`). The middleware now:

1. Checks for existing session cookies (auth or guest)
2. If neither exists, creates a guest JWT at the edge
3. Sets the guest token cookie in the response
4. Proceeds with the request

### Key Implementation Details

```typescript
// middleware.ts - createGuestSessionAtEdge()
async function createGuestSessionAtEdge(request: NextRequest): Promise<string> {
  const guestId = nanoid();

  // Extract device context for fingerprinting
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  // Create fingerprint using Web Crypto API (edge-compatible)
  const [ipHash, uaHash] = await Promise.all([
    sha256Truncated(ip),
    sha256Truncated(userAgent),
  ]);

  // Sign JWT with audience claim (SEC-004)
  return new SignJWT({
    sub: `guest:${guestId}`,
    type: "guest",
    fp: { ipHash, uaHash },
  })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(`${JWT_EXPIRATION_SECONDS}s`)
    .sign(secret);
}
```

### Edge Compatibility Requirements

- Uses `jose` library instead of Node.js `crypto` module
- Uses Web Crypto API (`crypto.subtle.digest`) for SHA-256
- Uses `TextEncoder` for string-to-bytes conversion
- All operations are non-blocking and async

## Consequences

### Positive

- **Eliminates 100-200ms waterfall** on first page load
- **Improved Core Web Vitals** - faster Time to Interactive (TTI)
- **Reduced API surface** - no exposed `/api/auth/guest` endpoint
- **Better security** - session creation happens server-side
- **Single request** - user has session before React hydrates
- **Global edge execution** - Vercel Edge runs close to users

### Negative

- **Increased middleware complexity** - JWT signing logic in middleware
- **Cold start considerations** - edge function initialization
- **Debugging complexity** - harder to trace session creation issues
- **Library dependency** - requires `jose` for edge-compatible JWT

### Neutral

- Rate limiting moved to IP-based (was session-based)
- Cookie management now in middleware

## Alternatives Considered

### 1. Keep Client-Side Creation with Preload

- Use `<link rel="preload">` to hint the API call
- **Rejected**: Still creates waterfall, just starts earlier

### 2. Service Worker Session Creation

- Create session in service worker on install
- **Rejected**: Unreliable timing, not all browsers support

### 3. Server Component Session Creation

- Create in root layout server component
- **Rejected**: Would require full page re-render to set cookie

### 4. Static Generation with Dynamic Cookie

- Pre-generate pages, set cookie via middleware
- **Selected approach** - middleware is the cleanest solution

## Related Files

- [middleware.ts](../../middleware.ts) - Edge middleware implementation
- [lib/auth/constants.ts](../../lib/auth/constants.ts) - JWT configuration
- [lib/middleware/rate-limit-config.ts](../../lib/middleware/rate-limit-config.ts) - Guest rate limiting
