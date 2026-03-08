FLOW: Session State (Provider Mount → Supabase Listener → Auth Change → Refresh)
ENTRY: `app/(chat)/layout.tsx` renders `<SessionProvider session={sessionPromise}>` — session promise started server-side via `getAppSession()`
STEPS:
  1. `app/(chat)/layout.tsx` → `const sessionPromise = getAppSession()` — NOT awaited, kept as a promise to avoid blocking layout render
  2. `getAppSession()` (lib/auth/session.ts) → `React.cache`-wrapped → tries `resolveSupabaseSession()` first (reads cookies → `supabase.auth.getUser()`) → falls back to `resolveGuestSession()` (reads `guest_token` cookie → `verifyGuestToken(jwt)`) → returns `AppSession | null`
  3. `SessionProvider` receives `session` prop → `isPromiseLike(sessionSource)` check → if promise: initializes `session=null, isLoading=true` → if direct value: initializes `session=value, isLoading=false`
  4. `useEffect([sessionSource])` fires → detects promise → `sessionSource.then(resolved => { setSession(resolved); setIsLoading(false) })` → cancellation guard via `isActive` flag
  5. On subsequent server re-renders (e.g., after `router.refresh()`), `sessionSource` prop changes → `useEffect` cleanup sets `isActive=false` → new effect runs with new promise/value → prevents stale promise resolution from overwriting current state
  6. `useEffect` for Supabase subscription → `getSupabaseBrowserClient()` → `supabase.auth.onAuthStateChange((event) => ...)` → filters events by `SESSION_REFRESH_EVENTS` Set: `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`
  7. When Supabase detects auth change (login in another tab, token refresh, logout) → event fires → `if (SESSION_REFRESH_EVENTS.has(event)) { router.refresh() }` → triggers full server component tree re-render
  8. `router.refresh()` → Next.js re-executes all server components → `getAppSession()` re-runs (fresh cookies) → new session prop flows back to `SessionProvider` → `useEffect` resolves new value → context consumers re-render with updated session
  9. `isGuest` derived state: `session?.user.type === "guest" || isLoading` — during loading phase, defaults to guest behavior (conservative — hides authenticated-only features)
  10. Context value: `useMemo(() => ({ session, isLoading, isGuest }), [session, isLoading, isGuest])` → stable reference when values don't change → prevents unnecessary consumer re-renders
  11. Consumer hook: `useSession()` → `useContext(SessionContext)` → throws if outside provider → returns `{ session, isLoading, isGuest }`
  12. Consumers: `useSidebarHistory` (null SWR key when no user → skips fetch), `VoteButtons` (hides for guests), any component needing auth gating
BOTTLENECKS:
  - `getAppSession()` is the first async operation in the layout — all downstream rendering depends on it. Despite React.cache deduplication, the initial Supabase `auth.getUser()` call involves a round-trip to Supabase servers to validate the JWT.
  - `router.refresh()` on auth change triggers a full server component tree re-render — all server components re-execute, all `'use cache'` data re-fetches (unless cache is still warm). This is a heavy operation for a token refresh.
  - The Supabase `onAuthStateChange` subscription fires on EVERY Supabase auth event — including `INITIAL_SESSION`, `USER_UPDATED`, and `MFA_CHALLENGE_VERIFIED` — but only 3 events are in the filter set. The subscription itself still processes all events.
WASTE:
  - `isGuest` is `true` during the loading phase (`session?.user.type === "guest" || isLoading`). This means authenticated users briefly appear as guests after every `router.refresh()` — vote buttons hide and re-show, sidebar may flash.
  - The `try/catch` around `getSupabaseBrowserClient()` silently swallows errors — if the Supabase client fails to initialize (missing env vars), no subscription is created and no error is shown. Auth state changes will never be detected.
  - `resolveSupabaseSession()` and `resolveGuestSession()` are called sequentially in `getAppSession()` — if Supabase is slow but the user is actually a guest, there's an unnecessary wait for the Supabase check to fail before trying guest resolution.
SIMPLIFICATION OPPORTUNITIES:
  - Replace the promise-resolving `useEffect` with React 19 `use(sessionPromise)` inside a Suspense boundary. This would: (a) eliminate the `isLoading` state, (b) remove the stale-promise cancellation logic, (c) let React handle the suspension naturally. The `isGuest` derivation would no longer need the `|| isLoading` fallback.
  - `TOKEN_REFRESHED` could be handled via silent cookie update without `router.refresh()` — only `SIGNED_IN` and `SIGNED_OUT` need a full re-render. Token refresh just needs the new cookie to be set (which Supabase SSR handles automatically).
  - Consider parallel resolution: `Promise.any([resolveSupabaseSession(), resolveGuestSession()])` — first valid session wins. Currently sequential, adding latency for guest-first scenarios.
EXIT: All client components have access to `{ session, isLoading, isGuest }` via `useSession()`. Auth state changes detected cross-tab via Supabase listener trigger `router.refresh()` → server re-renders → fresh session propagated. SessionProvider is layout-level (persists across page navigations).
