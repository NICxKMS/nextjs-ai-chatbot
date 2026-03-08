# API Route Pipeline

```
FLOW: API Route Pipeline (POST and GET handlers)
ENTRY: HTTP request arrives at an `app/api/*/route.ts` handler after proxy.ts forwarding
STEPS:

  ── POST Route Pipeline (chat, artifact, file-upload) ──

  1. CSRF validation → `validateOrigin(request)` (lib/utils/validate-origin.ts)
     - Extract origin from `Origin` header, or fall back to `Referer` header
     - Build allowed origins set: request's own origin + VERCEL_URL + NEXT_PUBLIC_APP_URL
       + localhost:3000 & 127.0.0.1:3000 in dev
     - If origin not in allowed set → 403 `forbidden:api:csrf_failed`
     → If no Origin or Referer header at all → return false → 403

  2. Auth check → `getAppSession()` or `requireChatSession()` (lib/auth/session.ts)
     - `getAppSession()` resolves Supabase session first, then guest session
     - Both return `AppSession | null`; null → 401 `unauthorized:*`
     → `requireChatSession()` is a wrapper that returns `Response` on null

  3. Rate limiting → `checkRateLimit(key, limit, windowSeconds)` (lib/cache/rate-limit.ts)
     - Different limits per route:
       - `/api/chat`: 20 requests/min per userId (`rateLimitKeys.rateLimitChat`)
       - `/api/files/upload`: 10 uploads/hour per userId (`rateLimitKeys.rateLimitUpload`)
       - `/api/artifact`: NO rate limiting
     - Redis INCR on key → if count=1, EXPIRE(windowSeconds)
     - If Redis unavailable → graceful degradation → allow request
     - If over limit → 429 `rate_limit:*`

  4. Input validation → Zod schema parse on request body
     - `/api/chat`: `chatRequestSchema.safeParse(await request.json())`
     - `/api/artifact`: `artifactPostBodySchema.safeParse(await request.json())`
     - `/api/files/upload`: `request.formData()` → validate file size, type, existence
     → Invalid → 400 `bad_request:*`

  5. Authorization / ownership check
     - Chat: verify `existingChat.userId === session.user.id`
     - Artifact: verify `existing.userId === session.user.id`
     → Mismatch → 403 `forbidden:chat:owner_mismatch`

  6. Execute business logic (route-specific)

  7. Return response with appropriate Cache-Control headers

  ── GET Route Pipeline (history, suggestions, artifact, health) ──

  1. NO CSRF check (GET requests are idempotent, no Origin validation)

  2. Auth check → `getAppSession()` → null → 401
     Exception: `/api/health` has NO auth check

  3. NO rate limiting on any GET route currently

  4. Query parameter validation → Zod schemas on `request.url` search params
     - `/api/history`: `historyQuerySchema` (limit, cursor)
     - `/api/suggestions`: `querySchema` (artifactId, artifactCreatedAt)
     - `/api/artifact`: `getArtifactSchema` (id, view)
     → Invalid → 400

  5. Authorization / ownership check (IDOR prevention)
     - Artifact GET: verify `latest.userId === session.user.id`
     - Suggestions GET: verify `artifact.userId === session.user.id`
     - History GET: uses `session.user.id` as query filter (no IDOR possible)

  6. Execute query

  7. Return JSON with Cache-Control:
     - History: `private, no-cache`
     - Suggestions: `private, max-age=30`
     - Artifact: `private, max-age=10`
     - Health: `public, max-age=60, s-maxage=60`

BOTTLENECKS:
  - `getAppSession()` is called in EVERY route handler (even after proxy already
    verified session existence). This performs a full Supabase `auth.getUser()` call
    (HTTP round-trip to Supabase) + cookie reads every time. The React.cache
    memoization only helps within a single request if called multiple times.
  - Sequential pipeline: CSRF → Auth → Rate Limit → Validate → Execute
    is fully serial. Auth (Supabase HTTP call) and rate limit (Redis HTTP call)
    could theoretically run in parallel since they're independent.

WASTE:
  - Artifact POST has no rate limiting — potential for abuse
  - GET routes have no rate limiting at all — history/suggestions could be scraped
  - `getAppSession()` creates a new Supabase client per request (via
    `createSupabaseServerClient()`), even though the client config never changes.
    The client itself is lightweight, but `supabase.auth.getUser()` does a network call.
  - Suggestions GET returns empty `[]` for guest users after doing the full auth
    check — could short-circuit earlier if guest detection was cheaper.

SIMPLIFICATION OPPORTUNITIES:
  - Create a shared `withApiPipeline()` or route-level middleware wrapper that
    handles CSRF + auth + rate limiting in a standard sequence, reducing ~15 lines
    of boilerplate per route to a 1-line call
  - Consider running auth + rate limit in parallel with `Promise.all()` when both
    are needed
  - Add rate limiting to artifact POST and GET routes
  - The `requireChatSession()` pattern (returning `AppSession | Response`) is used
    only in chat — could be generalized for all routes

EXIT: HTTP Response (JSON body + status code + Cache-Control headers)
```

## Route-Specific Pipelines

| Route | Method | CSRF | Auth | Rate Limit | Validation |
|-------|--------|------|------|-----------|------------|
| `/api/chat` | POST | ✅ validateOrigin | ✅ requireChatSession | ✅ 20/min/user | ✅ chatRequestSchema |
| `/api/artifact` | GET | ❌ | ✅ getAppSession | ❌ | ✅ getArtifactSchema |
| `/api/artifact` | POST | ✅ validateOrigin | ✅ getAppSession | ❌ | ✅ artifactPostBodySchema |
| `/api/files/upload` | POST | ✅ validateOrigin | ✅ getAppSession | ✅ 10/hr/user | ✅ FormData + file checks |
| `/api/history` | GET | ❌ | ✅ getAppSession | ❌ | ✅ historyQuerySchema |
| `/api/suggestions` | GET | ❌ | ✅ getAppSession | ❌ | ✅ querySchema |
| `/api/health` | GET | ❌ | ❌ | ❌ | ❌ |

## Key Files
| File | Purpose |
|------|---------|
| `lib/utils/validate-origin.ts` | CSRF origin validation |
| `lib/auth/session.ts` | `getAppSession()` — unified session resolution |
| `lib/cache/rate-limit.ts` | `checkRateLimit()` — Redis INCR+EXPIRE |
| `lib/errors/app-error.ts` | `AppError` class with typed codes and `toResponse()` |
| `features/chat/lib/chat-route.ts` | Chat-specific pipeline helpers |
| `app/api/chat/route.ts` | Chat streaming endpoint |
| `app/api/artifact/route.ts` | Artifact CRUD endpoint |
| `app/api/files/upload/route.ts` | File upload endpoint |
| `app/api/history/route.ts` | Chat history endpoint |
| `app/api/suggestions/route.ts` | Suggestions endpoint |
| `app/api/health/route.ts` | Health check endpoint |
