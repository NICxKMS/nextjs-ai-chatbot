# Auth — Registration Flow

```
FLOW: Registration Flow
ENTRY: User submits email + password on /register page via AuthForm component
STEPS:

  ── Client Side (AuthForm) ──

  1. AuthForm component renders with `mode="register"` and `action={register}`
     → File: app/(auth)/register/page.tsx → features/auth/components/auth-form.tsx

  2. User submits form → `handleAction()` fires (via React 19 `useActionState`)

  3. Client-side Zod validation → `registerSchema.safeParse({ email, password })`
     - registerSchema is IDENTICAL to loginSchema (same z.object)
     - email: valid email, password: 6–100 chars
     → If invalid: return `{ fieldErrors }` immediately

  4. Call server action → `register({ success: true, data: undefined }, formData)`

  ── Server Side (register action) ──

  5. Server-side Zod validation → `registerSchema.safeParse({ email, password })`
     → If invalid: return `{ success: false, error: { code: "bad_request:validation:invalid_input" } }`

  6. Rate limiting → `enforceAuthRateLimit()`
     - Key: `rateLimitKeys.rateLimitRegister(ip)` → `rate-limit-register:<ip>`
     - Limit: 3 attempts per IP per minute (stricter than login's 5)
     - Window: 60 seconds
     → If over limit: return `{ success: false, error: { code: "rate_limit:auth:register_too_many" } }`

  7. Create Supabase action client → `createSupabaseActionClient()`
     → If env vars missing: return service unavailable error

  8. Create Supabase auth user → `supabase.auth.signUp({ email, password })`
     - Supabase creates the auth user in its system
     - If email confirmation is required: returns user but NO session
     - If email confirmation is NOT required: returns user AND session
     → If error or no user: return `{ success: false, error }`

  9. Create local DB user record → `createUser({ id: data.user.id, email })`
     - Links Supabase auth user ID to the app's local database
     - Email is lowercased before storage
     → If DB insert fails:
       - Supabase user exists but local record doesn't (D012 scenario)
       - Return `{ success: false, error: { code: "internal_error:database:query_failed",
         message: "Account created but profile setup failed. Please try logging in." } }`
       - NOTE: The user CAN log in later — login has D012 reconciliation

  10. Email confirmation check → `if (!data.session)`
      - If Supabase requires email confirmation (no session returned):
        → return `{ success: true, data: { confirmationRequired: true } }`
        → Guest token is NOT cleared (guest continuity preserved until confirmed login)
        → AuthForm shows success message: "Check your email for a confirmation link"
      - If session exists (immediate login): continue to step 11

  11. Guest data migration → `migrateGuestChatsAndClearToken(data.user.id, "register")`
      - Same flow as login: verify guest token → transfer chats → delete cookie
      → Only runs when registration gives immediate session (no email confirmation)

  12. Redirect → `redirect("/")` (throws NEXT_REDIRECT)

  ── Client Side (post-action) ──

  13a. If redirected: same flow as login post-redirect (session set, SessionProvider updates)

  13b. If confirmationRequired: AuthForm receives result, shows success message banner
       - User stays on /register page
       - Guest session continues working (guest_token cookie preserved)
       - User must click email confirmation link, then log in via /login

BOTTLENECKS:
  - Same sequential I/O chain as login: Zod → rate limit (Redis) →
    Supabase signUp (HTTP) → createUser (DB) → optionally guest migration (DB)
  - `supabase.auth.signUp()` may involve email sending (Supabase-side),
    adding latency before the response

WASTE:
  - `registerSchema` is literally `loginSchema` — no additional fields.
    If registration later needs different rules (e.g., password confirmation,
    username), this will need to diverge. Currently it's just an alias.
  - When DB createUser fails, the error message tells the user to "try logging in"
    — this works because login has D012 reconciliation, but it's a confusing UX
    (user just registered and is told to log in after a failure)

SIMPLIFICATION OPPORTUNITIES:
  - Consider running `supabase.auth.signUp()` and guest token verification
    in parallel if both are needed
  - The "try logging in" error recovery path could be made automatic:
    if createUser fails, attempt login immediately with the same credentials
  - If email confirmation is always enabled in production, the immediate-session
    path (steps 11-12) may be dead code in prod

EXIT: Either redirect to "/" (immediate session), or ActionResult with
      `{ confirmationRequired: true }` displayed by AuthForm
```

## Key Files
| File | Purpose |
|------|---------|
| `app/(auth)/register/page.tsx` | Register page — renders `AuthForm` with `register` action |
| `features/auth/components/auth-form.tsx` | Shared auth form with `useActionState` |
| `features/auth/actions/register.ts` | `register()` server action |
| `features/auth/lib/action-utils.ts` | `enforceAuthRateLimit`, `migrateGuestChatsAndClearToken` |
| `features/auth/lib/supabase-action.ts` | `createSupabaseActionClient()` |
| `features/auth/schemas/auth.schema.ts` | `registerSchema` (alias of `loginSchema`) |
| `lib/data/user.ts` | `createUser` |
| `lib/data/chat.ts` | `transferGuestChats` |
