# Auth — Logout Flow

```
FLOW: Logout Flow
ENTRY: User triggers logout (calls the `logout` server action)
STEPS:

  1. Server action invoked → `logout()` (features/auth/actions/logout.ts)
     - "use server" directive → built-in CSRF protection
     - No rate limiting on logout
     - No input validation needed (no parameters)

  2. Create Supabase action client → `createSupabaseActionClient()`
     - If env vars missing → supabase is null → skip signOut (best-effort)

  3. Supabase sign out → `supabase.auth.signOut()`
     - Clears Supabase auth cookies via the `setAll` callback
     - The `setAll` in the action client writes cookie deletions to `cookies()`
     → Best-effort: if this fails, the user may have stale cookies,
       but the redirect to /login still happens

  4. Clear guest token → `cookieStore.delete(GUEST_COOKIE_NAME)`
     - Reads `cookies()` store
     - Deletes `guest_token` cookie
     → Does NOT re-mint a guest token here (deferred to proxy.ts)

  5. Redirect → `redirect("/login")` (throws NEXT_REDIRECT)

  ── Client Side (post-redirect) ──

  6. Browser navigates to /login

  7. Auth layout → `AuthGuard` component calls `getAppSession()`
     - No Supabase cookies → resolveSupabaseSession returns null
     - No guest cookie → resolveGuestSession returns null
     - Session is null → no redirect (user stays on /login)

  8. Supabase browser client → `onAuthStateChange` fires SIGNED_OUT event
     - SessionProvider effect calls `router.refresh()`
     - But user is already on /login, so this is a no-op refresh

  9. On next visit to "/" or "/chat/*":
     - proxy.ts classifies as "guest-eligible"
     - No Supabase cookie, no guest_token cookie
     - Mints a new guest token (new identity, new UUID)
     → Guest experience resumes with a fresh identity

BOTTLENECKS:
  - `supabase.auth.signOut()` makes an HTTP call to Supabase to invalidate
    the server-side session. This adds latency before the redirect.
  - Two async cookie operations: `cookies()` for Supabase signOut,
    then `cookies()` again for guest token deletion. Though `cookies()`
    is likely the same store reference, the `await` at the top is one call.

WASTE:
  - `createSupabaseActionClient()` is constructed even if the user is a
    guest-only user who has no Supabase session. The `signOut()` call would
    still be made (it's a no-op if no session exists, but still an HTTP call).
  - The guest token is deleted but not checked. If the user was authenticated-only
    (no guest cookie), the delete call is a no-op but still awaits `cookies()`.

SIMPLIFICATION OPPORTUNITIES:
  - Check session type before constructing Supabase client: if user is guest-only,
    skip the Supabase signOut entirely
  - Combine the two cookie operations into one: `cookies()` is awaited once,
    then both Supabase signOut and guest cookie deletion use the same store
  - Consider: should logout also clear any client-side state? Currently the
    redirect handles this implicitly (new page load = fresh state), but if
    the app ever uses client-side routing for logout, state could leak

EXIT: Browser redirected to "/login" with all session cookies cleared.
      Next visit to a guest-eligible route re-bootstraps a fresh guest token.
```

## Key Files
| File | Purpose |
|------|---------|
| `features/auth/actions/logout.ts` | `logout()` server action |
| `features/auth/lib/supabase-action.ts` | `createSupabaseActionClient()` |
| `lib/auth/constants.ts` | `GUEST_COOKIE_NAME` |
| `app/(auth)/layout.tsx` | `AuthGuard` — redirects authenticated users away from /login |
| `features/auth/components/session-provider.tsx` | `onAuthStateChange` SIGNED_OUT handler |
