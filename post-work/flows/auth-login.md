# Auth — Login Flow

```
FLOW: Login Flow
ENTRY: User submits email + password on /login page via AuthForm component
STEPS:

  ── Client Side (AuthForm) ──

  1. AuthForm component renders with `mode="login"` and `action={login}`
     → File: app/(auth)/login/page.tsx → features/auth/components/auth-form.tsx

  2. User submits form → `handleAction()` fires (via React 19 `useActionState`)

  3. Client-side Zod validation → `loginSchema.safeParse({ email, password })`
     - email: must be valid email format
     - password: 6–100 characters
     → If invalid: return `{ fieldErrors }` immediately (no server call)

  4. Call server action → `login({ success: true, data: undefined }, formData)`
     → Server Actions have built-in CSRF protection (no manual Origin check needed)

  ── Server Side (login action) ──

  5. Server-side Zod validation → `loginSchema.safeParse({ email, password })`
     → If invalid: return `{ success: false, error: { code: "bad_request:validation:invalid_input" } }`

  6. Rate limiting → `enforceAuthRateLimit()` (features/auth/lib/action-utils.ts)
     a. `getClientIp()` → reads `x-forwarded-for` header (from `headers()`)
     b. `checkRateLimit(rateLimitKeys.rateLimitLogin(ip), 5, 60)`
        - Redis INCR on `rate-limit-login:<ip>`
        - If count=1, EXPIRE 60s
        - Limit: 5 attempts per IP per minute
     c. If Redis unavailable → skip (graceful degradation)
     → If over limit: return `{ success: false, error: { code: "rate_limit:auth:login_too_many" } }`

  7. Create Supabase action client → `createSupabaseActionClient()`
     - Reads `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - Creates `@supabase/ssr` server client with cookie read/write via `cookies()`
     - setAll writes are NOT wrapped in try/catch (must succeed in action context)
     → If env vars missing: return `{ success: false, error: { code: "offline:api:service_unavailable" } }`

  8. Supabase sign in → `supabase.auth.signInWithPassword({ email, password })`
     - Supabase validates credentials
     - On success: auth cookies are set via the `setAll` callback
     → If error: return `{ success: false, error: { code: "unauthorized:auth:no_session" } }`

  9. D012 reconciliation (partial registration failure recovery)
     a. `getUserById(data.user.id)` → check if local DB record exists
     b. If not found: `createUser({ id, email })` → create missing DB record
     → Best-effort: failure here does NOT block login (console.error only)

  10. Guest data migration → `migrateGuestChatsAndClearToken(data.user.id, "login")`
      a. Read `guest_token` cookie from `cookies()`
      b. If no guest token: return early (nothing to migrate)
      c. `verifyGuestToken(guestToken)` → extract guest userId
      d. If valid: `transferGuestChats(guest.userId, data.user.id)` → move chat ownership in DB
      e. Log migration count if > 0
      f. `cookieStore.delete(GUEST_COOKIE_NAME)` (always, in finally block)
      → Error in migration: `console.error`, continue (best-effort)

  11. Redirect → `redirect("/")` (throws NEXT_REDIRECT — must be outside try/catch)

  ── Client Side (post-redirect) ──

  12. Browser receives redirect to "/" → Next.js App Router navigates

  13. ChatLayout renders → `getAppSession()` now returns authenticated session
      (because Supabase auth cookies were set in step 8)

  14. SessionProvider receives the resolved session → context updates
      → `useSession()` consumers re-render with `isGuest: false`

  15. Supabase browser client → `onAuthStateChange` fires SIGNED_IN event
      → `router.refresh()` → server components revalidate

BOTTLENECKS:
  - Sequential: Zod → rate limit (Redis) → Supabase client creation →
    Supabase signIn (HTTP) → DB getUserById (DB) → potentially createUser (DB) →
    guest migration (DB) → redirect
    That's up to 5 sequential async I/O operations before redirect.
  - D012 reconciliation adds a DB read on EVERY successful login, even though
    the race condition it fixes is extremely rare (only if registration's
    createUser failed while signUp succeeded)

WASTE:
  - D012 reconciliation (`getUserById` + potentially `createUser`) runs on
    every single login, but the race condition only occurs during registration
    failures. This adds ~1 DB query per login unnecessarily.
  - Double Zod validation: client validates with `loginSchema`, then server
    validates with `loginSchema` again. The server validation is necessary for
    security, but the client validation could be skipped if the UX penalty
    (waiting for server round-trip for field errors) is acceptable.
  - `getClientIp()` reads `headers()` which is an async call in Next.js 16,
    meaning rate limit key generation requires an await.

SIMPLIFICATION OPPORTUNITIES:
  - Make D012 reconciliation conditional: only run if this is the user's first
    login (e.g., check a flag or skip if the user was creating during this session)
  - Consider running `getUserById` and `transferGuestChats` in parallel if
    both need to happen
  - The IP extraction from `x-forwarded-for` could be done once in proxy.ts
    and forwarded as a custom header to avoid re-parsing in every action

EXIT: Browser redirected to "/" with authenticated session cookies set,
      or ActionResult error returned to AuthForm for display
```

## Key Files
| File | Purpose |
|------|---------|
| `app/(auth)/login/page.tsx` | Login page — renders `AuthForm` with `login` action |
| `features/auth/components/auth-form.tsx` | Shared auth form with `useActionState` |
| `features/auth/actions/login.ts` | `login()` server action |
| `features/auth/lib/action-utils.ts` | `enforceAuthRateLimit`, `migrateGuestChatsAndClearToken`, `getClientIp` |
| `features/auth/lib/supabase-action.ts` | `createSupabaseActionClient()` — write-capable Supabase client |
| `features/auth/schemas/auth.schema.ts` | `loginSchema` — Zod validation |
| `lib/data/user.ts` | `getUserById`, `createUser` |
| `lib/data/chat.ts` | `transferGuestChats` |
| `lib/cache/rate-limit.ts` | `checkRateLimit` |
| `lib/cache/keys.ts` | `rateLimitKeys.rateLimitLogin` |
