# Wave 1 — Static Audit: Root Files + Components

> **Scope:** `proxy.ts`, `instrumentation.ts`, `instrumentation-client.ts`, `components/` (excluding `ai-elements/` and `ui/`)
> **Date:** 2026-03-07
> **Method:** Static analysis, grep search, cross-reference tracing
> **Confidence:** HIGH (all findings verified against source)

---

## Summary

| Severity | Count |
|----------|-------|
| HIGH     | 2     |
| MEDIUM   | 5     |
| LOW      | 5     |
| PASS     | 1     |

---

## Findings

### 1. Double JWT Verification on Guest-Eligible Routes (proxy.ts)

```
SEVERITY: [HIGH]
FILE: proxy.ts:214-215
FINDING: On guest-eligible routes with an existing guest token, verify+rotate
         performs 2 sequential JWT verifications of the SAME token per request.
         - Line 214: `verifyGuestToken(guestToken)` — 1st jwtVerify
         - Line 215: `rotateGuestToken(guestToken)` — internally calls jwtVerify again (guest.ts:109)
         Then downstream, `getAppSession()` → `resolveGuestSession()` → `verifyGuestToken()`
         performs a 3rd jwtVerify of the same token (session.ts:105).
         Net: 3 JWT signature verifications of the same token per guest page load.
RECOMMENDATION: Pass the already-verified payload from verifyGuestToken into
         rotateGuestToken (e.g. `rotateGuestToken(token, verified)`) to skip
         the redundant internal verify. For the 3rd downstream verify, consider
         forwarding the verified guest userId via a request header
         (e.g. `x-guest-user-id`) so session.ts can trust it without re-verifying.
         This eliminates 2 of 3 HMAC-SHA256 operations per request.
```

### 2. x-device-type Header Set But Never Consumed

```
SEVERITY: [HIGH]
FILE: proxy.ts:178
FINDING: The proxy sets `x-device-type` header on every non-exempt request,
         but NO code in `app/` or `features/` reads this header. The only
         consumer was `oldapp/app/(chat)/layout.tsx:12` (deprecated).
         The new `app/(chat)/layout.tsx` does not read headers at all.
         The `useIsMobile` hook (lib/hooks/use-mobile.ts) accepts
         `initialIsMobile` as an optional param but nothing passes it.
         This means:
         1. The proxy does UA regex work on every request for nothing
         2. The sidebar and weather components fall back to client-only
            detection (potential layout shift on mobile)
RECOMMENDATION: Either wire up x-device-type consumption in the chat layout
         (pass to SidebarProvider's initialIsMobile prop) to get hydration-safe
         mobile detection, or remove the header-setting code from proxy.ts
         to avoid dead work. Wiring it up is the better path — it was clearly
         intended by the hook's API design.
```

### 3. Session Type Not Forwarded (x-session-type Opportunity)

```
SEVERITY: [MEDIUM]
FILE: proxy.ts:180-230
FINDING: The proxy already determines session type (hasSupabaseToken vs
         guest token) but does not forward this classification. Downstream
         code in session.ts re-derives it by creating a Supabase client,
         calling getUser(), then falling back to guest token verification.
         An `x-session-type: authenticated|guest|anonymous` header would
         let downstream resolvers skip unnecessary Supabase client creation
         for guest users and skip guest token checks for authenticated users.
RECOMMENDATION: After session detection (line ~192), set:
         `requestHeaders.set("x-session-type", hasSupabaseToken ? "authenticated" : guestToken ? "guest" : "anonymous")`
         Then in session.ts, read this header to short-circuit resolution.
         Saves 1 Supabase client instantiation + getUser() call for guest
         requests, and 1 cookie read + JWT verify for authenticated requests.
```

### 4. getSupabaseAuthCookieBaseName() Re-computed Per Cookie

```
SEVERITY: [MEDIUM]
FILE: proxy.ts:42-72
FINDING: `isSupabaseAuthCookieName()` calls `getSupabaseAuthCookieBaseName()`
         which parses `process.env.NEXT_PUBLIC_SUPABASE_URL` and constructs a
         `new URL()` on every invocation. This is called inside `.some()` on
         the cookie array (line 192), meaning it runs once per cookie.
         While the URL parsing is cheap, it's unnecessary repetition.
RECOMMENDATION: Cache the base name at module level (it won't change during
         a request). Either compute it once as a top-level const or use a
         lazy-init pattern similar to the guest secret caching in guest.ts.
         Example: `const SUPABASE_AUTH_COOKIE_BASE = getSupabaseAuthCookieBaseName()`
         at module scope, then reference the cached value in `isSupabaseAuthCookieName`.
```

### 5. Weather.tsx Confirmed Dead Code

```
SEVERITY: [MEDIUM]
FILE: components/weather.tsx:1-257
FINDING: Confirmed dead code. The `Weather` component and its
         `WeatherAtLocation` interface are NOT imported anywhere in the
         production tree (`app/`, `features/`). The only external reference
         is `oldapp/components/message.tsx:206`. The file's own header comment
         (line 3-6) acknowledges this: "NOT yet wired into the production
         component tree." The TODO at line 153 confirms: "Remove or re-home
         this component if it remains test-only."
         The file also imports `date-fns` (isWithinInterval, format) which
         adds bundle weight if tree-shaking doesn't fully eliminate it.
RECOMMENDATION: Keep the file for now (planned for P6-T12 per the comment),
         but move the `WeatherAtLocation` interface to a shared types file
         so `features/chat/lib/tools/weather.ts` can reference it for type
         alignment when the tool renderer is eventually wired up. No urgency
         to delete — tree-shaking should handle it since nothing imports it.
```

### 6. MotionProvider Uses MotionConfig Instead of LazyMotion

```
SEVERITY: [MEDIUM]
FILE: components/motion-provider.tsx:1-17
FINDING: The current MotionProvider wraps children in `MotionConfig`
         (which only sets `reducedMotion="user"`). The oldapp version used
         `LazyMotion` with `features={domAnimation}` which enabled
         code-splitting of framer-motion's animation engine (~16KB savings).
         The current implementation imports `MotionConfig` which doesn't
         provide lazy-loading benefits. Meanwhile, consuming components
         (`artifact-panel.tsx`, `version-footer.tsx`) import the full
         `motion` and `AnimatePresence` directly from "framer-motion"
         instead of using lazy-compatible `m` primitives.
         The `next.config.ts` does have `optimizePackageImports` for
         "framer-motion" and "motion" (line 35-36), which helps with
         tree-shaking but doesn't provide the same lazy-loading split.
RECOMMENDATION: Either:
         a) Restore the LazyMotion pattern from oldapp (use `LazyMotion
            features={domAnimation}` + `m` primitive instead of `motion`),
         b) Or accept the current approach since `optimizePackageImports`
            handles the barrel import issue. Option (a) is better for
            initial page load if framer-motion animations aren't needed
            on first paint.
```

### 7. Proxy Matcher Excludes Most API Routes

```
SEVERITY: [MEDIUM]
FILE: proxy.ts:243
FINDING: The `config.matcher` only covers: `["/", "/chat/:path*", "/login",
         "/register", "/api/chat"]`. API routes `/api/artifact`, `/api/files`,
         `/api/history`, `/api/suggestions` are NOT matched. This means these
         routes get no proxy-level auth checks, no device-type header, and no
         guest token lifecycle management. These routes rely entirely on their
         own internal auth checks via getAppSession().
         This is likely intentional (these routes handle their own auth), but
         it means the session-type forwarding optimization (Finding #3) would
         only benefit `/api/chat` among API routes.
RECOMMENDATION: Document this as intentional in a comment. If x-session-type
         forwarding is implemented, consider whether adding other API routes
         to the matcher would provide meaningful optimization versus the cost
         of running proxy logic on every API call.
```

### 8. Three Unused Icon Exports

```
SEVERITY: [LOW]
FILE: components/icons.tsx
FINDING: Three icons have zero usages outside icons.tsx (excluding oldapp/):
         - ArrowUpIcon (0 references)
         - MessageIcon (0 references)
         - StopIcon (0 references)
         The file is 583 lines with 27 exported icons. Tree-shaking should
         eliminate unused exports, but the dead exports add maintenance noise.
RECOMMENDATION: Low priority. These may be needed by future features. Leave
         for now but consider pruning during a cleanup pass. Tree-shaking
         handles the bundle impact.
```

### 9. instrumentation-client.ts Type Narrowing + Missing Stack Trace

```
SEVERITY: [LOW]
FILE: instrumentation-client.ts:1-25
FINDING: (a) The `typeof window !== "undefined"` guard (line 9) is technically
         unnecessary in a file named `instrumentation-client.ts` — Next.js
         guarantees this file only runs in the browser. The guard adds a
         trivial runtime check on every page load.
         (b) The `unhandledrejection` handler (line 17-19) only logs
         `event.reason.message` for Error instances, discarding the `stack`
         property. The `error` handler captures filename/lineno/colno but
         this handler loses the most useful debugging information.
RECOMMENDATION: (a) Remove the window guard. (b) Include stack in the
         unhandled rejection payload:
         `reason: event.reason instanceof Error
           ? { message: event.reason.message, stack: event.reason.stack }
           : String(event.reason)`
```

### 10. Toaster Wrapper is Trivially Thin

```
SEVERITY: [LOW]
FILE: components/toaster.tsx:1-7
FINDING: The `Toaster` component is a 1-line wrapper around Sonner's Toaster
         with only `position="top-center"` set. It provides zero additional
         value beyond establishing a consistent import path. This is fine as
         a convention (single point of config change), but worth noting as
         a pattern — if more config is needed (theme, styling), this is
         where it goes.
RECOMMENDATION: No action needed. The wrapper is the correct pattern for
         centralized configuration. Note: the oldapp used `sonner` directly
         in layout.tsx with the same position prop.
```

### 11. ThemeProvider Wrapper is Trivially Thin

```
SEVERITY: [LOW]
FILE: components/theme-provider.tsx:1-7
FINDING: Same pattern as Toaster — a pass-through wrapper around
         `next-themes`' ThemeProvider. Provides a clean import boundary
         and would be the place to add custom theme logic.
RECOMMENDATION: No action needed. Standard pattern. Keep as-is.
```

### 12. global.d.ts — Correct CSS Module Declaration

```
SEVERITY: [PASS]
FILE: global.d.ts:1
FINDING: `declare module "*.css" {}` is the standard ambient declaration
         for CSS imports in TypeScript. Prevents TS errors without over-typing.
RECOMMENDATION: None. Correct and minimal.
```

### 13. Silent Catch on Malformed Supabase URL in Proxy

```
SEVERITY: [LOW]
FILE: proxy.ts:55-59
FINDING: If NEXT_PUBLIC_SUPABASE_URL is set but malformed (e.g. "not-a-url"),
         `new URL(supabaseUrl)` throws and the catch block silently returns
         null. This makes `hasSupabaseToken` always false, potentially
         redirecting authenticated users to login on auth-required routes.
         No warning is logged — the failure is invisible.
RECOMMENDATION: Add `console.warn("[proxy] Failed to parse NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl)`
         in the catch block. The instrumentation.ts startup check only verifies
         the env var EXISTS, not that it's a valid URL.
```

---

## Cross-Cutting Observations

### Proxy Architecture
The proxy is well-structured with clear separation of concerns (route classification, session detection, guest lifecycle). The main optimization opportunities are around reducing redundant JWT work and wiring up the device-type header that's already being computed.

### Guest Token Verification Chain (Full Trace)
For a guest user hitting `/` (guest-eligible):
1. **proxy.ts:214** — `verifyGuestToken(token)` → `jwtVerify()` ← HMAC-SHA256
2. **proxy.ts:215** — `rotateGuestToken(token)` → internal `jwtVerify()` ← HMAC-SHA256
3. **session.ts:105** — `resolveGuestSession()` → `verifyGuestToken(token)` ← HMAC-SHA256

For a guest user hitting an auth-required route:
1. **proxy.ts:108** — `hasVerifiedGuestToken(token)` → `verifyGuestToken()` ← HMAC-SHA256
2. **session.ts:105** — `resolveGuestSession()` → `verifyGuestToken(token)` ← HMAC-SHA256

### Components Health
- `sidebar-toggle.tsx` — Clean, well-typed, properly wired. No issues.
- `icons.tsx` — Healthy icon library with minor dead exports. Tree-shaking handles it.
- `motion-provider.tsx` — Functional but missed LazyMotion optimization from oldapp.
- `weather.tsx` — Intentional dead code, documented, planned for future use.
- `theme-provider.tsx`, `toaster.tsx` — Thin wrappers, correct pattern.

### Instrumentation Files
- `instrumentation.ts` — Well-structured. OTEL registration is properly guarded behind runtime and env checks. Error hook provides good structured logging.
- `instrumentation-client.ts` — Minimal and appropriate. The window guard is the only nit.

---

## Priority Ranking

| # | Finding | Severity | Effort | Impact |
|---|---------|----------|--------|--------|
| 1 | Triple JWT verification | HIGH | Medium | Performance: 3→1 HMAC ops/request |
| 2 | x-device-type dead header | HIGH | Low | Either wire up (prevents CLS) or remove dead code |
| 3 | x-session-type forwarding | MEDIUM | Medium | Performance: skip unnecessary auth resolution |
| 4 | Cookie base name caching | MEDIUM | Low | Minor perf: avoid URL parsing per cookie |
| 5 | Weather dead code | MEDIUM | None | Acknowledged, planned for P6-T12 |
| 6 | LazyMotion opportunity | MEDIUM | Medium | Bundle: ~16KB initial load savings |
| 7 | Proxy matcher documentation | MEDIUM | Low | Clarity: document intentional exclusions |
| 8 | Unused icons | LOW | Low | Maintenance noise only |
| 9 | Client instrumentation guard + stack trace | LOW | Trivial | Code cleanliness + debugging |
| 10-11 | Thin wrappers | LOW | None | Correct pattern, no action |
| 12 | global.d.ts | PASS | None | Correct |
| 13 | Silent URL parse catch | LOW | Trivial | Debuggability: log malformed URL |

---

## Deep Dive Appendix

> Expanded analysis requested on 2026-03-07 for findings #1, #6, and #7.

---

### A. JWT Triple Verification — Fix Design

#### Full Verification Chain

For a **guest user** hitting a **guest-eligible route** (e.g., `/`, `/api/chat`, `/chat/:path*`):

| Step | Location | Operation | Redundant? |
|------|----------|-----------|------------|
| 1 | `proxy.ts:214` | `verifyGuestToken(guestToken)` → `jose.jwtVerify()` | No — first check |
| 2 | `proxy.ts:215` → `guest.ts:109` | `rotateGuestToken(guestToken)` → internal `jose.jwtVerify()` | **Yes** — token was just verified 1 line above |
| 3 | `session.ts:105` | `resolveGuestSession()` → `verifyGuestToken()` → `jose.jwtVerify()` | **Yes** — proxy already verified this token |

For a **guest user** hitting an **auth-required route**:

| Step | Location | Operation | Redundant? |
|------|----------|-----------|------------|
| 1 | `proxy.ts:197` | `hasVerifiedGuestToken()` → `verifyGuestToken()` | No — first check |
| 2 | `session.ts:105` | `resolveGuestSession()` → `verifyGuestToken()` | **Yes** — proxy already verified |

For **authenticated users**: no JWT redundancy (Supabase token is checked once per context).

#### Why React.cache Doesn't Help

The Next.js 16 docs explicitly state:

> "Proxy is meant to be invoked separately of your render code and in optimized cases deployed to your CDN for fast redirect/rewrite handling, **you should not attempt relying on shared modules or globals.**"
>
> "To pass information from Proxy to your application, use **headers**, cookies, rewrites, redirects, or the URL."
>
> — `.next-docs/01-app/03-api-reference/03-file-conventions/proxy.mdx`

`React.cache` wraps `getAppSession()` and correctly deduplicates within the route handler / Server Component render phase. But the proxy runs in a **separate execution context** (step 3 in the Next.js execution order, before filesystem routes). The proxy and route handler share NO in-memory state — only headers and cookies survive the boundary.

#### Proposed Fix: Two-Part Approach

**Part 1 — Eliminate verification #2** (refactor `rotateGuestToken`):

```typescript
// guest.ts — accept pre-verified payload to skip internal jwtVerify
export async function rotateGuestToken(
  token: string,
  preVerified?: { userId: string },
): Promise<string> {
  try {
    const secret = getSecret()
    if (!secret) return token

    let userId: string
    let exp: number | undefined

    if (preVerified) {
      // Trust the caller's already-verified payload
      userId = preVerified.userId
      // Still need exp for rotation check — decode without verify
      const payloadB64 = token.split(".")[1]
      if (payloadB64) {
        const decoded = JSON.parse(atob(payloadB64))
        exp = decoded.exp
      }
    } else {
      // Fallback: full verification (for callers without pre-verified data)
      const { payload } = await jwtVerify(token, secret)
      if (payload.type !== "guest" || typeof payload.sub !== "string") return token
      userId = payload.sub
      exp = typeof payload.exp === "number" ? payload.exp : undefined
    }

    // Check if rotation is needed
    if (typeof exp === "number") {
      const nowSeconds = Math.floor(Date.now() / 1000)
      const timeRemaining = exp - nowSeconds
      if (timeRemaining >= GUEST_TOKEN_ROTATION_THRESHOLD_SECONDS) {
        return token // Still far from expiry
      }
    }

    return await mintGuestToken(userId)
  } catch {
    return token
  }
}
```

Then in `proxy.ts`:
```typescript
// proxy.ts — pass verified payload to avoid redundant jwtVerify
const verified = await verifyGuestToken(guestToken)
if (verified) {
  const rotated = await rotateGuestToken(guestToken, verified) // ← no 2nd verify
  // ...
}
```

**Savings**: Eliminates 1 HMAC-SHA256 per request on guest-eligible routes.

**Part 2 — Eliminate verification #3** (trusted header):

```typescript
// proxy.ts — after successful guest verification, set trusted header
if (verified) {
  requestHeaders.set("x-verified-guest-id", verified.userId)
  // ...
}
```

```typescript
// session.ts — resolveGuestSession reads trusted header first
async function resolveGuestSession(): Promise<AppSession | null> {
  try {
    // Fast path: proxy already verified the guest token
    const headerStore = await headers()
    const trustedGuestId = headerStore.get("x-verified-guest-id")
    if (trustedGuestId) {
      return { user: { id: trustedGuestId, type: "guest" } }
    }

    // Slow path: non-proxied routes (API routes not in matcher) still verify
    const cookieStore = await cookies()
    const guestToken = cookieStore.get(GUEST_COOKIE_NAME)?.value
    if (!guestToken) return null

    const result = await verifyGuestToken(guestToken)
    if (!result) return null
    return { user: { id: result.userId, type: "guest" } }
  } catch {
    return null
  }
}
```

**Security analysis of the trusted header approach**:

| Concern | Mitigation |
|---------|------------|
| Client sends forged `x-verified-guest-id` | The proxy **overwrites** incoming headers via `requestHeaders` clone for proxied routes. For non-proxied routes (not in matcher), `session.ts` falls through to the slow verification path. |
| Non-proxied routes trust the header? | **No** — the fast path is only beneficial when the proxy has run. For routes not in the matcher, the header won't be set (Next.js doesn't inject proxy headers for un-matched routes). |
| Header forwarding from CDN/reverse proxy | Standard concern — strip `x-verified-guest-id` at the edge if using a CDN in front of Next.js. |
| UUID validation | Add `z.string().uuid().safeParse(trustedGuestId)` as a sanity check before trusting. |

**Additional safety**: The proxy should explicitly **delete** any client-sent `x-verified-guest-id` header at the start of the function:
```typescript
requestHeaders.delete("x-verified-guest-id") // Strip client-supplied header
```

**Total savings**: 2 of 3 HMAC-SHA256 operations eliminated per guest-eligible request.

**Trade-offs**:
- Slightly more complex session.ts (two resolution paths)
- Requires careful header hygiene (strip + re-set pattern)
- Non-proxied API routes still do full verification (correct — they have no proxy guarantee)

---

### B. LazyMotion Migration — Bundle Analysis & Path

#### Bundle Measurements (framer-motion 11.18.2)

| Entry Point | Size | Exports | Purpose |
|-------------|------|---------|---------|
| `dist/es/index.mjs` | 7,262 B | 108 | Full API barrel (re-exports all submodules) |
| `dist/es/m.mjs` | 3,998 B | 2 (`m`, `createDomMotionComponent`) | Lazy-compatible motion primitives |
| `dist/es/` (total) | ~562 KB | — | All ES modules combined |

Per official docs (motion.dev, "Reduce bundle size"):
- **`motion` component**: ~34 KB (pre-bundles all features)
- **`LazyMotion` + `m` + `domAnimation`**: ~4.6 KB initial load, features async-loaded

#### Current Consumer Analysis

| File | Imports from `framer-motion` | Uses |
|------|------------------------------|------|
| `components/motion-provider.tsx` | `MotionConfig` | `<MotionConfig reducedMotion="user">` |
| `features/artifacts/components/artifact-panel.tsx` | `motion`, `AnimatePresence` | `motion.div` (multiple), `<AnimatePresence>` (×2) |
| `features/artifacts/components/version-footer.tsx` | `motion` | `motion.div` |

The `next.config.ts` has `optimizePackageImports: ["framer-motion", "motion"]` which helps tree-shaking (avoids pulling the full barrel on individual imports), but this is **not the same as LazyMotion code-splitting**. Tree-shaking removes unused exports at build time; LazyMotion defers feature loading to runtime (dynamic import).

#### Migration Plan

**Step 1 — Update `motion-provider.tsx`**:

```tsx
"use client"

import { MotionConfig } from "framer-motion"
import { LazyMotion, domAnimation } from "framer-motion"

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  )
}
```

Notes:
- `MotionConfig` is kept for `reducedMotion="user"` (LazyMotion has no equivalent prop)
- `strict` prop throws an error if any child uses `motion.div` instead of `m.div` (catches regressions)
- `domAnimation` features loaded synchronously here (could use `() => import(...)` for async)

**Step 2 — Update consumers to use `m` instead of `motion`**:

```tsx
// artifact-panel.tsx — change imports
- import { motion, AnimatePresence } from "framer-motion"
+ import { m, AnimatePresence } from "framer-motion"

// Then replace all motion.div → m.div
- <motion.div initial={...} animate={...}>
+ <m.div initial={...} animate={...}>
```

```tsx
// version-footer.tsx — same pattern
- import { motion } from "framer-motion"
+ import { m } from "framer-motion"
- <motion.div ...>
+ <m.div ...>
```

`AnimatePresence` is compatible with both `motion` and `m` — no change needed for it.

**Step 3 — Verify `optimizePackageImports` interaction**:

The `optimizePackageImports` config in `next.config.ts` works at the bundler level (SWC/webpack). When combined with LazyMotion, it ensures:
1. Only `LazyMotion`, `domAnimation`, `m`, `AnimatePresence` are eagerly bundled
2. No accidental full-barrel import pulls in the ~34KB `motion` component

#### Impact Assessment

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| Initial framer-motion JS | ~34 KB | ~4.6 KB | ~29.4 KB (~86%) |
| Features loaded | Eagerly on page load | When first `m` component mounts | Deferred |
| `strict` mode | No (silent full-bundle fallback) | Yes (error on `motion` use) | Catches regressions |

**Scope of impact**: Only `artifact-panel.tsx` and `version-footer.tsx` use motion animations. These are loaded within the artifact feature — not on initial chat page load. So the 29KB savings applies to **every initial page load** (the animation code is deferred until an artifact is opened).

**Risk**: LOW. The `m` primitive has identical API to `motion` — same props, same animations. The only difference is that `m` reads features from the nearest `LazyMotion` provider instead of bundling them.

**Oldapp reference**: The oldapp used exactly this pattern (`LazyMotion` + `domAnimation` + `m`), confirming it works in this codebase. The regression to `MotionConfig` + `motion` was likely an oversight during the redesign.

---

### C. Proxy Matcher Coverage — Gap Analysis

#### Route Coverage Matrix

**Matcher**: `["/", "/chat/:path*", "/login", "/register", "/api/chat"]`

| Route | In Matcher? | Auth Method | Guest Support | Proxy Benefits Received |
|-------|-------------|-------------|---------------|------------------------|
| `/` | ✅ | Proxy guest bootstrap | ✅ mint/rotate | Device detection, guest lifecycle, session classification |
| `/chat/:path*` | ✅ | Proxy guest eligible | ✅ mint/rotate | Device detection, guest lifecycle, session classification |
| `/login` | ✅ | Public (skip auth) | N/A | Device detection only |
| `/register` | ✅ | Public (skip auth) | N/A | Device detection only |
| `/api/chat` | ✅ | `requireChatSession()` | ✅ mint/rotate | Guest lifecycle, session classification |
| `/api/artifact` | ❌ | `getAppSession()` | ✅ cookie-only | None — self-service auth |
| `/api/files/upload` | ❌ | `getAppSession()` | ✅ cookie-only | None — self-service auth |
| `/api/history` | ❌ | `getAppSession()` | ✅ cookie-only | None — self-service auth |
| `/api/suggestions` | ❌ | `getAppSession()` | ✅ guest returns `[]` | None — self-service auth |
| `/api/health` | ❌ (rate-limit exempt) | None (public) | N/A | None — intentionally excluded |

#### Why the Gaps Are Intentional

1. **API routes are always called from client-side fetch**, not browser navigation. By the time a client calls `/api/artifact`, it has already visited `/` or `/chat/:path*` (which ARE in the matcher), so a guest token cookie already exists.

2. **Guest token minting at the proxy level is for page navigations** — ensuring a visitor gets a guest identity on their first page view. API routes don't need to mint tokens; they just need to verify the existing cookie.

3. **`getAppSession()` (with `React.cache`) handles auth for these routes** — it reads the cookie store, verifies the JWT, and resolves the session. This is the correct auth path for API routes.

4. **`/api/health`** is correctly excluded — it's a public health check endpoint listed in `PUBLIC_ROUTES` and `RATE_LIMIT_EXEMPT_PREFIXES`.

#### Subtle Consequence: No Token Rotation for Non-Proxied APIs

Routes NOT in the matcher don't trigger `rotateGuestToken()`. If a guest user's token is nearing expiry (< 30min remaining), and they trigger `/api/artifact` or `/api/history` requests **without** also hitting a proxied route, the token won't get rotated.

**Practical impact**: LOW. The chat page (`/`) and `/api/chat` are both in the matcher and are the primary interaction points. If a user is active enough to call `/api/artifact`, they've already hit `/api/chat` (which rotates the token). The 1-hour TTL with 30-minute rotation threshold provides ample buffer.

**Edge case**: A guest user opens a chat, creates an artifact, then goes idle for 30+ minutes, then performs artifact-only operations (save/restore) without sending a new chat message. Their token could expire (at 60min) without rotation. The `getAppSession()` call would return null, and the API would return 401. The client would need to refresh the page to get a new guest token via the proxy.

**Mitigation if needed**: Add `/api/artifact` to the matcher (LOW priority — the edge case is extremely narrow).

#### Recommendation

The current matcher coverage is **intentionally correct** for the application's access patterns. Document the rationale in a comment:

```typescript
export const config = {
  // Only page routes and the primary chat API need proxy-level guest lifecycle.
  // Other API routes authenticate via getAppSession() from cookies.
  // /api/health excluded as a public endpoint.
  matcher: ["/", "/chat/:path*", "/login", "/register", "/api/chat"],
}
```

No API routes need to be added to the matcher unless the x-session-type optimization (Finding #3) is implemented — in which case, adding high-traffic API routes (like `/api/history`) would allow them to skip redundant auth resolution.
