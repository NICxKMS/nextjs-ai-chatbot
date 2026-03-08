# CSRF Protection

```
FLOW: CSRF Protection
ENTRY: POST request arrives at an API Route Handler (NOT Server Actions)
STEPS:

  ── Scope ──

  Server Actions: Have built-in CSRF protection from Next.js (not covered here).
  Route Handlers (app/api/*): Do NOT have built-in CSRF protection — must use
  `validateOrigin()` manually on every POST handler.

  ── Origin Extraction ──

  1. `getRequestOrigin(request)` (lib/utils/validate-origin.ts)
     a. Read `Origin` header from request
        - If present → use it directly as the origin string
     b. If no Origin header → read `Referer` header
        - If present → parse with `new URL(referer)` → extract `.origin`
        - If URL parsing fails → return null
     c. If neither header present → return null
     → null = no origin could be determined = request FAILS validation

  ── Allowed Origins Construction ──

  2. `getAllowedOrigins(requestUrl)` (lib/utils/validate-origin.ts)
     a. Start with `requestUrl.origin` (the URL the request was sent TO)
        - This is the server's own origin from the request URL
     b. If `VERCEL_URL` env var set → add `https://${VERCEL_URL}`
        - Covers Vercel preview/production deployments
     c. If `NEXT_PUBLIC_APP_URL` env var set → add it
        - Covers custom domain configurations
     d. If `NODE_ENV === "development"` → add:
        - `http://localhost:3000`
        - `http://127.0.0.1:3000`
     → Returns a `Set<string>` of all allowed origins

  ── Validation ──

  3. `validateOrigin(request)` (lib/utils/validate-origin.ts)
     a. Get request origin (step 1)
     b. If no origin → return false (CSRF check fails)
     c. Get allowed origins (step 2)
     d. Check if request origin is in allowed origins set → return boolean

  ── Application Points ──

  4. Route handlers that call `validateOrigin()`:
     - `POST /api/chat` (app/api/chat/route.ts, line ~41)
     - `POST /api/artifact` (app/api/artifact/route.ts, line ~92)
     - `POST /api/files/upload` (app/api/files/upload/route.ts, line ~65)

  5. Route handlers that do NOT call `validateOrigin()`:
     - `GET /api/history` — GET routes don't need CSRF protection
     - `GET /api/suggestions` — GET route
     - `GET /api/artifact` — GET route
     - `GET /api/health` — GET route, no auth either

  6. On validation failure:
     → `AppError.forbidden("forbidden:api:csrf_failed", "Invalid request origin").toResponse()`
     → HTTP 403 with JSON `{ code: "forbidden:api:csrf_failed", message: "Invalid request origin" }`

BOTTLENECKS:
  - `new URL(request.url)` is called inside `validateOrigin()` to construct
    `getAllowedOrigins()`. Request URL parsing is lightweight but happens on
    every POST request.
  - The allowed origins set is reconstructed on every call (reads env vars,
    creates a new Set). These values never change at runtime.

WASTE:
  - Allowed origins set is rebuilt from env vars on every single POST request.
    The env vars (`VERCEL_URL`, `NEXT_PUBLIC_APP_URL`, `NODE_ENV`) never change
    during the process lifetime. This could be computed once at module load.
  - `getAllowedOrigins` always adds `requestUrl.origin` (the server's own origin).
    In practice, this means the Origin header from a same-origin request will
    always pass. But the function also adds VERCEL_URL and NEXT_PUBLIC_APP_URL
    which may be the same origin — resulting in duplicate entries in the Set.
    (Set handles duplicates, so no bug, just unnecessary adds.)

SIMPLIFICATION OPPORTUNITIES:
  - Pre-compute allowed origins at module level:
    ```ts
    const ALLOWED_ORIGINS = new Set([
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      ...(process.env.NODE_ENV === "development" ? DEVELOPMENT_ORIGINS : []),
    ].filter(Boolean))
    ```
    Then at runtime, only check if `requestOrigin` matches.
    The `requestUrl.origin` addition is needed for dynamic deployment URLs
    though, so it can't be fully static — but VERCEL_URL/NEXT_PUBLIC_APP_URL can.
  - Consider using a shared middleware/wrapper to enforce CSRF on all POST
    routes automatically, rather than requiring each handler to call
    `validateOrigin()` manually (risk of forgetting)
  - Convert to a `withCsrfProtection(handler)` HOF that wraps POST handlers

EXIT: boolean — true (request allowed) or false (CSRF check failed → 403 response)
```

## Coverage Matrix

| Route | Method | CSRF Protected | Mechanism |
|-------|--------|----------------|-----------|
| `/api/chat` | POST | ✅ | `validateOrigin(request)` |
| `/api/artifact` | POST | ✅ | `validateOrigin(request)` |
| `/api/files/upload` | POST | ✅ | `validateOrigin(request)` |
| `/api/artifact` | GET | N/A | GET — no mutation |
| `/api/history` | GET | N/A | GET — no mutation |
| `/api/suggestions` | GET | N/A | GET — no mutation |
| `/api/health` | GET | N/A | GET — no mutation |
| Server Actions (login, register, logout, etc.) | POST | ✅ | Next.js built-in |

## Key Files
| File | Purpose |
|------|---------|
| `lib/utils/validate-origin.ts` | `validateOrigin()`, `getAllowedOrigins()`, `getRequestOrigin()` |
| `app/api/chat/route.ts` | Consumer — POST handler |
| `app/api/artifact/route.ts` | Consumer — POST handler |
| `app/api/files/upload/route.ts` | Consumer — POST handler |
