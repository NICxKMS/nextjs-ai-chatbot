# W2 Scope 1 — Rate Limiting & Redis Atomicity

## Summary

Replaced hand-rolled non-atomic INCR+EXPIRE rate limiting with the `@upstash/ratelimit` SDK (sliding window algorithm). Added rate limiting to 3 previously unprotected API routes. Fixed the artifact restore timestamp bug. Added `maxDuration` exports where missing.

---

## Changes

### 1. `lib/cache/rate-limit.ts` — Atomic SDK-based rate limiting

**Before:** Hand-rolled `INCR` + `EXPIRE` as two separate Redis commands. A crash between them leaves a key with no TTL → permanent block.

**After:** Uses `@upstash/ratelimit` SDK with `Ratelimit.slidingWindow()`. All Redis operations are atomic (single Lua script internally). Sliding window eliminates burst-at-boundary issues of fixed windows.

- `checkRateLimit(key, limit, windowSec)` → `Promise<boolean>` — **preserved** for backward compatibility with existing callers (vote, chat, auth).
- `checkRateLimitWithInfo(key, limit, windowSec)` → `Promise<RateLimitResult>` — **new** for callers needing `retryAfter` (artifact, history, suggestions routes).
- `RateLimitResult` type exported: `{ allowed: boolean; retryAfter?: number }`.
- Graceful degradation preserved: returns `{ allowed: true }` / `true` when Redis is unavailable.
- Limiter instances cached by `"limit:window"` key to avoid re-creation.
- Dedicated Redis singleton (same env vars: `CACHE_KV_REST_API_URL`, `CACHE_KV_REST_API_TOKEN`).

**Decision:** Kept `checkRateLimit` returning `boolean` to avoid modifying callers outside the file scope (vote.ts, chat-route.ts, action-utils.ts). New routes use `checkRateLimitWithInfo` for Retry-After header support.

### 2. `lib/cache/keys.ts` — Key builders

**Removed (dead code, `@unused` annotated):**
- `rateLimitKeys.rateLimit(userId)` — unused reserved key
- `rateLimitKeys.rateLimitDaily(userId)` — unused reserved key

**Added:**
- `rateLimitKeys.rateLimitArtifact(userId)` → `"rate-limit-artifact:<userId>"`
- `rateLimitKeys.rateLimitHistory(userId)` → `"rate-limit-history:<userId>"`
- `rateLimitKeys.rateLimitSuggestions(userId)` → `"rate-limit-suggestions:<userId>"`

### 3. `lib/errors/codes.ts` — New error codes

Added:
- `rate_limit:artifact:too_many_requests` → 429
- `rate_limit:history:too_many_requests` → 429
- `rate_limit:suggestions:too_many_requests` → 429

### 4. `lib/errors/app-error.ts` — Retry-After header support

**`rateLimited()` factory:** Third parameter changed from `details?: unknown` to `retryAfter?: number`. Stores as `{ retryAfter }` in details. No existing callers pass a third arg, so backward compatible.

**`toResponse()` method:** Now checks if `statusCode === 429` and `details` contains `retryAfter`. If so, adds `Retry-After` header (seconds) to the response.

### 5. `app/api/artifact/route.ts` — Rate limiting + restore fix + maxDuration

- **GET:** Rate limited at 60 req/min per user via `checkRateLimitWithInfo`.
- **POST:** Rate limited at 30 req/min per user via `checkRateLimitWithInfo`.
- **Restore fix:** Removed fragile `+1ms` timestamp offset (`new Date(restorePoint.getTime() + 1)`). Now passes `restorePoint` directly to `deleteArtifactVersionsAfter`, which uses `gt()` (strictly greater than).
- **Added:** `export const maxDuration = 10`.

### 6. `lib/data/artifact.ts` — gt() instead of gte()

Changed `deleteArtifactVersionsAfter` query from `gte(artifacts.createdAt, createdAt)` to `gt(artifacts.createdAt, createdAt)`. This means "delete versions created strictly after the restore point" — correct semantics without needing the +1ms caller hack.

### 7. `app/api/history/route.ts` — Rate limiting added

Rate limited GET at 30 req/min per user. Uses `checkRateLimitWithInfo` with `Retry-After` header on 429.

### 8. `app/api/suggestions/route.ts` — Rate limiting added

Rate limited GET at 60 req/min per user. Uses `checkRateLimitWithInfo` with `Retry-After` header on 429.

### 9. `app/api/files/upload/route.ts` — maxDuration added

Added `export const maxDuration = 30`. Existing rate limiting unchanged (still uses `checkRateLimit` boolean API).

---

## Rate Limit Summary

| Endpoint | Method | Limit | Window | Key |
|----------|--------|-------|--------|-----|
| `/api/artifact` | GET | 60 | 1 min | `rate-limit-artifact:<userId>` |
| `/api/artifact` | POST | 30 | 1 min | `rate-limit-artifact:<userId>` |
| `/api/history` | GET | 30 | 1 min | `rate-limit-history:<userId>` |
| `/api/suggestions` | GET | 60 | 1 min | `rate-limit-suggestions:<userId>` |
| `/api/files/upload` | POST | 10 | 1 hour | `rate-limit-upload:<userId>` |
| `/api/chat` | POST | 20 | 1 min | `rate-limit-chat:<userId>` |
| vote action | — | 20 | 1 min | `rate-limit-vote:<userId>` |
| login action | — | 5 | 5 min | `rate-limit-login:<ip>` |
| register action | — | 3 | 5 min | `rate-limit-register:<ip>` |

---

## Validation

- [x] `pnpm format` — ✅ (228 files, no fixes)
- [x] `pnpm lint` — ✅ (228 files, no fixes)
- [x] `pnpm typecheck` — ✅ (only pre-existing `playwright.config.ts` error)
- [x] No files modified outside scope
- [x] No TODO comments removed
