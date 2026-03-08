# Rate Limiting

```
FLOW: Rate Limiting
ENTRY: Code calls `checkRateLimit(key, limit, windowSeconds)` or
       `enforceAuthRateLimit(config)` from a Route Handler or Server Action
STEPS:

  ── Core Mechanism (lib/cache/rate-limit.ts) ──

  1. `checkRateLimit(key, limit, windowSeconds)` is called with:
     - key: Redis key string (e.g., "rate-limit-chat:user-uuid-123")
     - limit: max allowed requests in the window
     - windowSeconds: sliding window duration in seconds

  2. `incr(key)` (lib/cache/client.ts)
     a. `withRedisClient(operation)`:
        - `getClient()` → check module-level singleton cache
        - Read `CACHE_KV_REST_API_URL` + `CACHE_KV_REST_API_TOKEN` env vars
        - If either missing → return null (Redis not configured)
        - If singleton exists → reuse it
        - If init previously failed (`__upstashRedisInitFailed` flag) → return null
        - Otherwise → `new Redis({ url, token })` → cache on globalThis
     b. Call `client.incr(key)` → Upstash Redis HTTP API → returns new count
     c. On any error in withRedisClient → return null

  3. If `incr` returns null (Redis unavailable):
     → return true (ALLOW request — graceful degradation)
     → No rate limiting enforced when Redis is down

  4. If count === 1 (first request in this window):
     a. `expire(key, windowSeconds)` → sets TTL on the Redis key
     b. This creates a fixed window: the key auto-deletes after windowSeconds
     → If `expire` fails: the key has no TTL → persists forever in Redis
        (potential leak, but Upstash likely has eviction policies)

  5. Compare: `count <= limit`
     - true → ALLOW request
     - false → DENY request (rate limit exceeded)

  ── Auth Rate Limiting (features/auth/lib/action-utils.ts) ──

  6. `enforceAuthRateLimit(config)` — wrapper for Server Actions:
     a. `getClientIp()`:
        - `await headers()` → read `x-forwarded-for` header
        - Extract first IP: `header.split(",")[0]?.trim() ?? "unknown"`
     b. `config.createKey(ip)` → e.g., `rateLimitKeys.rateLimitLogin(ip)` → `"rate-limit-login:1.2.3.4"`
     c. `checkRateLimit(key, config.limit, config.windowSeconds)`
     d. If allowed → return null (proceed)
     e. If denied → return `ActionResult` error with config's errorCode/errorMessage

  ── Chat Rate Limiting (features/chat/lib/chat-route.ts) ──

  7. `enforceChatRateLimit(userId)`:
     a. `rateLimitKeys.rateLimitChat(userId)` → `"rate-limit-chat:<userId>"`
     b. `checkRateLimit(key, 20, 60)` → 20 requests per 60 seconds
     c. If allowed → return null
     d. If denied → return `AppError.rateLimited(...).toResponse()`

  ── Upload Rate Limiting (app/api/files/upload/route.ts) ──

  8. `checkUploadRateLimit(userId)`:
     a. `rateLimitKeys.rateLimitUpload(userId)` → `"rate-limit-upload:<userId>"`
     b. `checkRateLimit(key, 10, 3600)` → 10 uploads per 3600 seconds (1 hour)
     c. Returns boolean directly

  ── Redis Client Lifecycle (lib/cache/client.ts) ──

  9. Singleton pattern:
     - Uses `globalThis` for HMR/warm container reuse
     - `__upstashRedis` holds the client instance
     - `__upstashRedisInitFailed` flag prevents repeated failed init attempts
     - Only ONE Redis client exists per process lifetime
     - No connection pooling needed (Upstash uses HTTP, not persistent connections)

BOTTLENECKS:
  - Every rate limit check requires an HTTP call to Upstash Redis (INCR command)
  - When count=1, a second HTTP call is needed (EXPIRE command) — two serial
    round-trips to Redis for the first request in each window
  - Auth rate limiting calls `await headers()` which is an async operation in
    Next.js 16 to extract the client IP

WASTE:
  - The INCR+EXPIRE pattern for count=1 is two separate Redis commands. Upstash
    supports Lua scripts or `SET key value EX windowSeconds NX` patterns that
    could do this atomically in one round-trip.
  - `rateLimitKeys` defines `rateLimit(userId)` and `rateLimitDaily(userId)` keys
    that are reserved but unused ("Currently test-only" per comments). These add
    noise to the keys file.
  - Rate limiting uses a fixed window strategy (INCR + EXPIRE). A user could
    potentially send `limit` requests at the end of one window and `limit` more
    at the start of the next, effectively doubling throughput at window boundaries.
    Sliding window would be more accurate but more complex.
  - The `expire` call can fail silently (returns null if Redis is unavailable after
    INCR succeeded). This would leave a key without TTL — though the INCR already
    succeeded, meaning the key exists and will increment forever without reset.

SIMPLIFICATION OPPORTUNITIES:
  - Use Redis EVAL or SET with EX+NX for atomic INCR+EXPIRE in one round-trip
  - Consider a shared `withRateLimit()` wrapper that handles the
    "check → return error response" pattern for Route Handlers, eliminating
    per-route boilerplate
  - Remove unused `rateLimit` and `rateLimitDaily` keys from `rateLimitKeys`
  - Add rate limiting to currently unprotected routes:
    - Artifact GET/POST
    - History GET
    - Suggestions GET
  - Consider rate limiting at the proxy level (edge) for DDoS protection,
    not just at the route handler level

EXIT: boolean (checkRateLimit) or ActionResult/Response (enforced wrappers)
```

## Rate Limit Configuration Matrix

| Route/Action | Key Pattern | Limit | Window | Keyed By |
|-------------|-------------|-------|--------|----------|
| Login action | `rate-limit-login:<ip>` | 5/window | 60s | Client IP |
| Register action | `rate-limit-register:<ip>` | 3/window | 60s | Client IP |
| POST /api/chat | `rate-limit-chat:<userId>` | 20/window | 60s | User ID |
| POST /api/files/upload | `rate-limit-upload:<userId>` | 10/window | 3600s | User ID |
| POST /api/artifact | None | ∞ | — | — |
| GET /api/history | None | ∞ | — | — |
| GET /api/suggestions | None | ∞ | — | — |
| GET /api/artifact | None | ∞ | — | — |

## Key Files
| File | Purpose |
|------|---------|
| `lib/cache/rate-limit.ts` | `checkRateLimit()` — core INCR+EXPIRE logic |
| `lib/cache/client.ts` | `incr()`, `expire()`, `ping()` — Redis operations |
| `lib/cache/keys.ts` | `rateLimitKeys` — key pattern definitions |
| `features/auth/lib/action-utils.ts` | `enforceAuthRateLimit()` — action wrapper |
| `features/chat/lib/chat-route.ts` | `enforceChatRateLimit()` — chat route wrapper |
| `app/api/files/upload/route.ts` | `checkUploadRateLimit()` — upload wrapper |
