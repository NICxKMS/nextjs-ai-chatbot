# Auth — Session Resolution

```
FLOW: Session Resolution (getAppSession)
ENTRY: Any server-side code calls `getAppSession()` — Server Components,
       Server Actions, Route Handlers, or layout components
STEPS:

  ── Memoization Layer ──

  1. `getAppSession` is wrapped in `React.cache()` (lib/auth/session.ts)
     - React.cache provides request-scoped memoization
     - Multiple calls to `getAppSession()` within the SAME request share one result
     - Different requests (different HTTP requests) get fresh resolution
     - The cache key is the function identity (no arguments to key by)

  ── Supabase Session Resolution (priority 1) ──

  2. `resolveSupabaseSession()` (lib/auth/session.ts)
     a. `createSupabaseServerClient()`:
        - Read `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
        - If either missing → return null (Supabase not configured)
        - `await cookies()` → get Next.js cookie store
        - Create `@supabase/ssr` server client with:
          - `getAll()`: reads all cookies from store
          - `setAll()`: wrapped in try/catch (read-only context — Server Components
            can't mutate cookies, so failures are silently ignored)
     b. `supabase.auth.getUser()`:
        - Reads Supabase auth cookies from the store
        - Makes HTTP call to Supabase to validate the session token
        - Returns `{ data: { user }, error }`
     c. If error or no user → return null
     d. If success → return `AppSession`:
        ```ts
        {
          user: {
            id: user.id,        // Supabase UUID
            type: "authenticated",
            email: user.email ?? undefined,
          }
        }
        ```
     → Entire function is wrapped in try/catch → returns null on ANY error

  3. If Supabase session found → return it immediately (skip guest check)

  ── Guest Session Resolution (priority 2) ──

  4. `resolveGuestSession()` (lib/auth/session.ts)
     a. `await cookies()` → get Next.js cookie store
     b. Read `guest_token` cookie: `cookieStore.get(GUEST_COOKIE_NAME)?.value`
     c. If no cookie → return null
     d. `verifyGuestToken(guestToken)` (lib/auth/guest.ts):
        - `jwtVerify(token, secret)` using jose
        - Validates: HS256 signature, expiry, `type === "guest"`, `sub` is string
        - Returns `{ userId: payload.sub }` or null
     e. If verified → return `AppSession`:
        ```ts
        {
          user: {
            id: result.userId,  // Guest UUID from JWT sub claim
            type: "guest",
            // no email field
          }
        }
        ```
     → Entire function is wrapped in try/catch → returns null on ANY error

  5. If guest session found → return it

  ── No Session ──

  6. Return null — neither Supabase nor guest session exists or is valid

  ── Consumers / Usage Patterns ──

  7. Usage in Route Handlers:
     ```ts
     const session = await getAppSession()
     if (!session?.user) {
       return AppError.unauthorized(...).toResponse()
     }
     ```

  8. Usage in ChatLayout (Server Component):
     ```ts
     const sessionPromise = getAppSession()  // NOT awaited
     // Passed as promise to SessionProvider for Suspense support
     <SessionProvider session={sessionPromise}>
     ```

  9. Usage in AuthGuard (Server Component):
     ```ts
     const session = await getAppSession()
     if (session?.user.type === "authenticated") {
       redirect("/")  // Already logged in, skip auth pages
     }
     ```

  10. Usage in chat-route.ts (Route Handler helper):
      ```ts
      export async function requireChatSession(): Promise<AppSession | Response> {
        const session = await getAppSession()
        if (!session?.user) {
          return AppError.unauthorized("unauthorized:chat:auth_required").toResponse()
        }
        return session
      }
      ```

BOTTLENECKS:
  - `supabase.auth.getUser()` makes an HTTP call to Supabase's servers on
    EVERY request (even when the auth cookie hasn't changed). This is the
    single biggest latency contributor in session resolution.
  - Sequential resolution: Supabase is tried first, and only after it returns
    null does guest resolution begin. If the user is a guest, the Supabase
    check is wasted time (~50-200ms to Supabase).
  - `cookies()` is called twice:
    1. Inside `createSupabaseServerClient()` → `await cookies()`
    2. Inside `resolveGuestSession()` → `await cookies()`
    Though Next.js likely deduplicates this, it's two explicit await calls.

WASTE:
  - For guest users: full Supabase client construction + `getUser()` HTTP call
    happens before the quick local JWT verification runs. The proxy already
    knows (from cookie inspection) that the user has no Supabase cookie —
    this information is not forwarded to the downstream session resolution.
  - `createSupabaseServerClient()` is recreated per request (no connection pooling
    or client reuse). The client itself is stateless (just config + cookie adapter),
    but the setup is redundant work each time.
  - The read-only `setAll` try/catch in the server client is called but always
    treated as a no-op or silently failing in Server Component contexts.

SIMPLIFICATION OPPORTUNITIES:
  - Forward session type hint from proxy.ts via a header (e.g., `x-session-type`:
    "supabase" | "guest" | "none") to skip unnecessary resolution branches
  - If proxy.ts already verified the guest token, forward `x-guest-user-id` header
    and skip JWT verification entirely in `resolveGuestSession()`
  - Consider using Supabase's `getSession()` (reads from cookie, no HTTP call)
    instead of `getUser()` (verifies with Supabase server) for read-only contexts
    where full server verification isn't needed. NOTE: `getUser()` is more secure
    but slower — the trade-off is security vs. latency.
  - Run Supabase and guest resolution in parallel with `Promise.any()` or
    `Promise.allSettled()` if both cookie types could theoretically be present

EXIT: `AppSession | null` — returned to the caller. Memoized for the request scope.
```

## AppSession Type Shape
```ts
type UserType = "authenticated" | "guest"

type AppSession = {
  user: {
    id: string       // UUID — Supabase user ID or guest JWT sub
    type: UserType   // "authenticated" or "guest"
    email?: string   // Only present for authenticated users
  }
}
```

## Key Files
| File | Purpose |
|------|---------|
| `lib/auth/session.ts` | `getAppSession()`, `resolveSupabaseSession()`, `resolveGuestSession()`, `AppSession` type |
| `lib/auth/guest.ts` | `verifyGuestToken()` — guest JWT verification |
| `lib/auth/constants.ts` | `GUEST_COOKIE_NAME` |
| `features/auth/lib/supabase-action.ts` | Write-capable Supabase client (for actions, contrast with read-only) |
| `features/auth/components/session-provider.tsx` | Client-side consumer of `getAppSession()` output |
| `features/chat/lib/chat-route.ts` | `requireChatSession()` — Route Handler wrapper |
| `app/(chat)/layout.tsx` | Passes `getAppSession()` promise to `SessionProvider` |
| `app/(auth)/layout.tsx` | `AuthGuard` — uses `getAppSession()` for redirect logic |
