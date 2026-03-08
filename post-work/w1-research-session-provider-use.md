# Research: React 19 `use()` Migration for SessionProvider

**Researcher:** Thoth  
**Date:** 2026-03-07  
**Related Findings:** F03, F04, F05 from `w1-audit-auth-feature.md`  
**Confidence:** HIGH — verified against React 19 docs (react.dev), Next.js 16 local docs, and existing `VoteResolver` implementation in the codebase.

---

## Context

### Current Implementation

`SessionProvider` (features/auth/components/session-provider.tsx:63-140) uses `useState` + `useEffect` to manually resolve a server-started promise:

```tsx
// Current pattern — manual promise resolution
const [session, setSession] = useState<AppSession | null>(() =>
  isPromiseLike(sessionSource) ? null : sessionSource,
)
const [isLoading, setIsLoading] = useState(() => isPromiseLike(sessionSource))

useEffect(() => {
  let isActive = true
  if (isPromiseLike(sessionSource)) {
    setIsLoading(true)    // ← BUG: resets isLoading on EVERY refresh
    void sessionSource.then(
      (resolvedSession) => {
        if (!isActive) return
        setSession(resolvedSession)
        setIsLoading(false)
      },
      () => {
        if (!isActive) return
        setSession(null)
        setIsLoading(false)
      },
    )
    return () => { isActive = false }
  }
  setSession(sessionSource)
  setIsLoading(false)
  return () => { isActive = false }
}, [sessionSource])
```

### The Root Bug (F04)

Line 78: `setIsLoading(true)` fires on **every** new promise — including those from `router.refresh()`. Since `isGuest` includes `|| isLoading` (line 135), authenticated users briefly appear as guests on every Supabase token refresh (~every 1 hour). This causes VoteButtons to hide and SidebarUserNav to flash guest UI.

### Existing `use()` Pattern in Codebase

`VoteResolver` (features/voting/components/vote-resolver.tsx:145-155) already uses React 19 `use()`:

```tsx
export function VoteResolver({ votesPromise }: VoteResolverProps) {
  const setServerVotes = useContext(VotesSetterContext)
  const resolvedVotes = use(votesPromise)
  useEffect(() => { setServerVotes?.(resolvedVotes) }, [resolvedVotes, setServerVotes])
  return null
}
```

Called inside `<Suspense fallback={null}>` — suspends silently, resolves, updates context.

---

## React 19 `use()` API — Key Facts

**Source:** https://react.dev/reference/react/use (React v19.2, accessed 2026-03-07)

| Property | Detail |
|----------|--------|
| Import | `import { use } from 'react'` |
| Can call conditionally | ✅ Yes — unlike hooks, `use()` works inside `if`, `for`, loops |
| Suspense integration | Component suspends while promise is pending; Suspense fallback shown |
| Error handling | Rejected promises caught by nearest Error Boundary (NOT try/catch) |
| Re-render behavior | Promises created in Client Components recreate on every render; server-started promises are stable |
| Promise stability | "Prefer creating Promises in Server Components and passing them to Client Components" — exactly our pattern |

**Next.js 16 docs** (.next-docs/01-app/01-getting-started/07-fetching-data.mdx:120-170) explicitly show this pattern:

```tsx
// Server Component — start promise
export default function Page() {
  const posts = getPosts()  // Don't await
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Posts posts={posts} />  // Pass promise
    </Suspense>
  )
}

// Client Component — resolve with use()
'use client'
import { use } from 'react'
export default function Posts({ posts }: { posts: Promise<Post[]> }) {
  const allPosts = use(posts)  // Suspends until resolved
  return <ul>{allPosts.map(...)}</ul>
}
```

---

## The SessionProvider Challenge

SessionProvider is **fundamentally different** from VoteResolver:

| Aspect | VoteResolver | SessionProvider |
|--------|-------------|-----------------|
| Renders children? | No (returns `null`) | Yes (wraps entire app) |
| Promise changes? | Once per page load | On every `router.refresh()` |
| Suspension impact | Invisible (fallback={null}) | Entire UI disappears |
| State updates post-init? | No | Yes (Supabase auth events) |

**The critical constraint:** When `router.refresh()` fires (Supabase token refresh, cross-tab login), a **new** session promise is passed as props. If SessionProvider uses `use()` directly, it suspends **again**, blanking the entire UI. This is worse than the current `isGuest` flash.

---

## Three Migration Options Analyzed

### Option 1: Minimal Bug Fix (RECOMMENDED)

**Change:** Remove `setIsLoading(true)` from the useEffect (line 78). Keep everything else.

```tsx
// BEFORE (line 73-93)
useEffect(() => {
  let isActive = true
  if (isPromiseLike(sessionSource)) {
    setIsLoading(true)  // ← REMOVE THIS LINE
    void sessionSource.then(...)
    return () => { isActive = false }
  }
  // ...
}, [sessionSource])

// AFTER
useEffect(() => {
  let isActive = true
  if (isPromiseLike(sessionSource)) {
    // Don't reset isLoading — preserve previous session during refresh
    void sessionSource.then(...)
    return () => { isActive = false }
  }
  // ...
}, [sessionSource])
```

| Metric | Assessment |
|--------|------------|
| Lines changed | ~1 (remove `setIsLoading(true)`) |
| Fixes F04 (flash bug) | ✅ Yes — isLoading stays false on refreshes |
| Fixes F03 (code complexity) | ❌ No — manual promise resolution remains |
| Risk | Very low — isLoading is only true during initial page load |
| Behavior on initial load | Same as current (isLoading=true from useState initializer) |
| Behavior on refresh | **Improved** — previous session preserved, no flash |

**How it works:** `isLoading` is initialized to `true` in `useState` (line 69) only when `sessionSource` is a promise. This covers the initial page load. On subsequent renders (router.refresh), `isLoading` remains `false` because the effect no longer resets it. The previous session value is preserved until the new promise resolves and updates the state.

**Trade-off:** During a refresh, if the session actually changed (e.g., user logged out in another tab), there's a brief delay where the old session is shown. The Supabase `onAuthStateChange` listener handles the actual UI update by calling `router.refresh()`, and the resolved promise will update the state. The delay is the time from promise creation to resolution (~50-200ms), which is imperceptible.

---

### Option 2: `use()` + Resolver Pattern (VoteResolver Pattern)

**Change:** Split SessionProvider into Provider (holds state) + Resolver (uses `use()` inside Suspense).

```tsx
// Internal setter context
const SessionSetterContext = createContext<((s: AppSession | null) => void) | null>(null)

// Main provider — holds state, manages subscription
function SessionProviderCore({ initialSession, children }: {
  initialSession: AppSession | null
  children: ReactNode
}) {
  const router = useRouter()
  const [session, setSession] = useState<AppSession | null>(initialSession)

  // Supabase subscription (unchanged from current)
  useEffect(() => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (SESSION_REFRESH_EVENTS.has(event)) {
          router.refresh()
        }
      })
      return () => subscription.unsubscribe()
    } catch (error) {
      console.error("[SessionProvider] Failed to subscribe:", error)
    }
  }, [router])

  const isGuest = session?.user.type === "guest"
  const value = useMemo(() => ({ session, isGuest }), [session, isGuest])

  return (
    <SessionSetterContext.Provider value={setSession}>
      <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
    </SessionSetterContext.Provider>
  )
}

// Resolver — suspends via use(), writes resolved session to context
function SessionResolver({ sessionPromise }: { sessionPromise: Promise<AppSession | null> }) {
  const setSession = useContext(SessionSetterContext)
  const resolved = use(sessionPromise)
  useEffect(() => { setSession?.(resolved) }, [resolved, setSession])
  return null
}

// Public API
export function SessionProvider({ session: sessionSource, children }: SessionProviderProps) {
  const initialSession = isPromiseLike(sessionSource) ? null : sessionSource

  return (
    <SessionProviderCore initialSession={initialSession}>
      {isPromiseLike(sessionSource) && (
        <Suspense fallback={null}>
          <SessionResolver sessionPromise={sessionSource} />
        </Suspense>
      )}
      {children}
    </SessionProviderCore>
  )
}
```

| Metric | Assessment |
|--------|------------|
| Lines changed | ~30 net reduction (removes isLoading, isPromiseLike effect, stale-promise logic) |
| Fixes F04 (flash bug) | ✅ Yes — no `isLoading` state at all |
| Fixes F03 (code complexity) | ✅ Yes — simpler architecture, matches codebase patterns |
| Risk | Medium — structural refactor, needs testing |
| Behavior on initial load | `session=null` briefly, then SessionResolver resolves and updates context |
| Behavior on refresh | **Same as Option 1** — previous session preserved, resolver updates silently |

**What gets removed:**
- `isLoading` state variable (~eliminates `isGuest || isLoading` hack)
- `isPromiseLike` type guard function
- Promise-resolving useEffect (the entire 20-line effect)
- `isActive` stale-promise cancellation logic

**What gets added:**
- `SessionSetterContext` (internal, not exported)
- `SessionProviderCore` (internal)
- `SessionResolver` (internal, ~10 lines — mirrors VoteResolver)

**What changes in the context type:**
```tsx
// BEFORE
interface SessionContextValue {
  session: AppSession | null
  isLoading: boolean  // ← REMOVED
  isGuest: boolean
}

// AFTER
interface SessionContextValue {
  session: AppSession | null
  isGuest: boolean
}
```

**Consumer impact:** All consumers that read `isLoading` need updating:
- `features/sidebar/components/sidebar-user-nav.tsx:38` — reads `isLoading`
- Any other consumer using `isLoading` from `useSession()`

**Trade-off:** Initial render still has `session=null` briefly (same as current). The SessionResolver inside `<Suspense fallback={null}>` suspends silently — no visual loading state. When it resolves, `setSession` fires, and consumers re-render with the correct session. On `router.refresh()`, a new promise causes the Resolver to suspend again *inside its own Suspense boundary*, not the parent — so the rest of the UI continues showing the previous session.

---

### Option 3: Direct `use()` in SessionProvider (NOT RECOMMENDED)

**Change:** SessionProvider uses `use()` directly when given a promise.

```tsx
export function SessionProvider({ session: sessionSource, children }: SessionProviderProps) {
  // use() can be called conditionally in React 19
  const session = isPromiseLike(sessionSource) ? use(sessionSource) : sessionSource
  // ... rest of provider
}
```

Layout change required:
```tsx
// Must add Suspense around SessionProvider
<Suspense fallback={<ChatLayoutFallback>{children}</ChatLayoutFallback>}>
  <SessionProvider session={sessionPromise}>
    <PendingChatsProvider>
      <ChatLayoutShell>{children}</ChatLayoutShell>
    </PendingChatsProvider>
  </SessionProvider>
</Suspense>
```

| Metric | Assessment |
|--------|------------|
| Lines changed | ~25 net reduction |
| Fixes F04 (flash bug) | ✅ On initial load — ❌ CREATES WORSE BUG on refresh |
| Fixes F03 (code complexity) | ✅ Simplest code |
| Risk | **HIGH — UX regression** |
| Behavior on initial load | Suspense fallback shown until session resolves — correct, clean |
| Behavior on refresh | **ENTIRE UI BLANKS** — SessionProvider suspends, Suspense fallback replaces all children |

**Why this fails:** When `router.refresh()` fires (token refresh, cross-tab login), React re-renders server components and passes a **new** promise to SessionProvider. `use(newPromise)` suspends the entire component, causing the Suspense boundary to show the fallback. The entire chat UI disappears and reappears. This happens every ~1 hour on token refresh. **Unacceptable UX.**

**DO NOT USE THIS APPROACH.** The VoteResolver pattern works because votes are non-blocking leaves. SessionProvider wraps the entire app — suspension here is catastrophic.

---

## Recommendation

### Primary: **Option 2 — `use()` + Resolver Pattern**

This is the recommended approach. It:
- **Fixes F04** (isGuest flash) — no `isLoading` state means no flash
- **Fixes F03** (code complexity) — removes ~35 lines of manual promise handling
- **Aligns with codebase patterns** — mirrors VoteResolver, proven working pattern
- **Minimal consumer impact** — only SidebarUserNav needs updating (1 line: `isLoading` → `session === null`)
- **No layout changes needed** — SessionResolver suspends inside its own `<Suspense fallback={null}>`, invisible to the rest of the tree

### Implementation checklist:

1. **session-provider.tsx** — Split into SessionProviderCore + SessionResolver
   - Remove: `isLoading` state, `isPromiseLike` helper, promise-resolving `useEffect`, `isActive` flag
   - Add: `SessionSetterContext`, `SessionProviderCore`, `SessionResolver`
   - Update: `SessionContextValue` to remove `isLoading`
   - Update: `isGuest` derivation to `session?.user.type === "guest" ?? false` (no `|| isLoading`)
2. **sidebar-user-nav.tsx** — Replace `isLoading` with `session === null`
   - `const { session, isGuest } = useSession()` (remove `isLoading`)
   - `const showSkeleton = !mounted || session === null`
3. **Also apply F05** — Remove `TOKEN_REFRESHED` from `SESSION_REFRESH_EVENTS`
4. **Also apply F10** — Add `console.error` to the Supabase subscription catch block

### Migration sequence:
1. All four changes in one commit (session-provider.tsx + sidebar-user-nav.tsx + F05 + F10)
2. Verify: `pnpm typecheck` passes (SessionContextValue type change propagates)
3. Manual test: Login → verify no flash, open two tabs → cross-tab login detection, wait for token refresh → no UI flicker

---

## Consumer Impact Analysis

### Full `isLoading` consumer inventory (exhaustive search)

**Only ONE consumer** reads `isLoading` from `useSession()`:

| Consumer | File:Line | Destructures isLoading? | Migration Required? |
|----------|-----------|------------------------|---------------------|
| **SidebarUserNav** | features/sidebar/components/sidebar-user-nav.tsx:38 | ✅ Yes | ✅ Yes |
| VoteButtons | features/voting/components/vote-buttons.tsx:37 | ❌ No (reads `isGuest` only) | ❌ No |
| useSidebarHistory | features/sidebar/hooks/use-sidebar-history.ts:95 | ❌ No (reads `session` only) | ❌ No |

### SidebarUserNav Deep-Dive

**Current code (sidebar-user-nav.tsx:38-55):**

```tsx
const { session, isLoading, isGuest } = useSession()
// ...
const showSkeleton = !mounted || isLoading
```

`showSkeleton` controls whether a pulse-animated loading skeleton or the real avatar/email is shown. It combines two guards:
1. `!mounted` — hydration guard (server doesn't know auth/theme state)
2. `isLoading` — session promise hasn't resolved yet

**Rendering context:** SidebarUserNav is rendered inside `SidebarShell` (a Server Component that awaits `getAppSession()`, resolves `user.email`, and passes it as a prop). SidebarShell itself is inside `<Suspense fallback={<SidebarSkeleton />}>` in the chat layout.

**Render sequence with Option 2:**

| Time | mounted | session (from context) | showSkeleton | Visual |
|------|---------|----------------------|--------------|--------|
| T=0ms (SSR) | false | null | `!false=true` → skeleton | Placeholder via SidebarSkeleton (Suspense) |
| T=~100ms (hydration) | false | null | `true \|\| true` → skeleton | Skeleton pulse |
| T=~100ms (mount effect) | true | null | `false \|\| true` → skeleton | Skeleton pulse |
| T=~150-300ms (resolver) | true | resolved | `false \|\| false` → **real UI** | Avatar + email |

**Proposed migration:**

```tsx
// BEFORE
const { session, isLoading, isGuest } = useSession()
const showSkeleton = !mounted || isLoading

// AFTER (Option 2)
const { session, isGuest } = useSession()
const showSkeleton = !mounted || session === null
```

**Why `session === null` is a safe proxy for `isLoading` in the chat layout:**

1. **Guest users** always have a session (type=guest) → `session !== null`
2. **Authenticated users** always have a session (type=authenticated) → `session !== null`
3. **`session === null`** only occurs during initial promise resolution (before SessionResolver fires) OR if all session resolution fails (Supabase + guest both fail) — showing skeleton for both cases is correct and safe
4. SidebarUserNav is **only rendered in the chat layout** (inside SidebarShell) — it's never on auth pages where session is genuinely null for unauthenticated visitors
5. After initial resolution, `session` is never reset to null during `router.refresh()` — the resolver updates it atomically when the new promise resolves

**No behavioral regression:** The skeleton shows for the same duration as before (from hydration until session resolves). The `mounted` guard alone already covers the hydration window. The `session === null` check covers the remaining gap until the resolver fires.

---

## Sources

1. React 19 `use()` API — https://react.dev/reference/react/use (React v19.2)
2. Next.js 16 Fetching Data — `.next-docs/01-app/01-getting-started/07-fetching-data.mdx` (lines 120-170)
3. Next.js 16 Server & Client Components — `.next-docs/01-app/01-getting-started/05-server-and-client-components.mdx` (lines 230-240)
4. VoteResolver implementation — `features/voting/components/vote-resolver.tsx:145-155`
5. SessionProvider implementation — `features/auth/components/session-provider.tsx:63-160`
6. Chat layout — `app/(chat)/layout.tsx:80-96`
7. Flow maps — `post-work/flows/state-session.md`, `state-server-hydration.md`
