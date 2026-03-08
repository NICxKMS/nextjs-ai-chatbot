# Wave 1 — Static Audit: `features/auth/`

**Auditor:** Thoth  
**Date:** 2026-03-07  
**Scope:** All 11 files in `features/auth/` (actions, components, lib, schemas, types)  
**Reference Flows:** `auth-login.md`, `auth-register.md`, `auth-logout.md`, `state-session.md`, `auth-session-resolution.md`, `auth-guest-lifecycle.md`  
**Confidence:** HIGH — every finding verified against source code and flow maps  

---

## Summary

The auth feature is well-structured with clean separation of concerns, consistent error handling, and proper React 19 `useActionState` integration. 14 findings identified across 5 severity levels. The highest-impact opportunities are:

1. **Login waterfall parallelization** — D012 reconciliation runs a DB query on every login for an extremely rare edge case (MEDIUM)
2. **React 19 `use()` upgrade** — SessionProvider uses manual promise-resolving pattern that React 19 `use()` eliminates (MEDIUM)
3. **`isGuest` flash bug** — Authenticated users briefly appear as guests during loading (HIGH)
4. **Rate limit IP fallback** — All requests without `x-forwarded-for` share one rate limit bucket (MEDIUM)

---

## Findings

---

### F01 — D012 Reconciliation Runs on Every Login

```
FLOW: auth-login | STEP: 9
SEVERITY: [MEDIUM]
FILE: features/auth/actions/login.ts:88-101
FINDING: D012 reconciliation calls `getUserById(data.user.id)` on EVERY successful
login to check if the user exists in the local DB. This handles a rare edge case
where registration's `createUser` failed after Supabase `signUp` succeeded. The
DB read adds ~5-20ms latency to every login, but the condition it guards (partial
registration failure) is extremely rare — it only occurs if the DB write fails
during registration while Supabase signUp succeeds.
RECOMMENDATION: Make D012 conditional. Options:
  (a) Record a flag (e.g., "needs-reconcile") in the Supabase user metadata during
      registration failure, and only check in login when the flag is present.
  (b) Move reconciliation to a background job triggered on first chat creation
      (when the FK constraint would actually fail).
  (c) Accept the ~5-20ms cost as insurance — the code is correct and the latency
      is minor. Document the trade-off explicitly.
```

---

### F02 — Sequential D012 + Guest Migration (Cannot Safely Parallelize)

```
FLOW: auth-login | STEP: 9-10
SEVERITY: [LOW]
FILE: features/auth/actions/login.ts:88-106
FINDING: The flow doc suggests parallelizing D012 reconciliation (step 9) with
guest migration (step 10). However, `transferGuestChats` updates `chats.userId`
which has a FOREIGN KEY constraint referencing `users.id` (lib/db/schema.ts:42).
In the D012 case where the user doesn't exist locally, `transferGuestChats` would
fail with a FK violation if run before `createUser`. These steps MUST remain
sequential for correctness in the D012 edge case.
RECOMMENDATION: Keep sequential. The correct optimization is F01 (make D012
conditional), not parallelization. If D012 is eliminated, guest migration
becomes the only post-auth step and parallelization is moot.
```

---

### F03 — SessionProvider Promise Resolution Pattern vs React 19 `use()`

```
FLOW: state-session | STEP: 3-5
SEVERITY: [MEDIUM]
FILE: features/auth/components/session-provider.tsx:70-104
FINDING: SessionProvider uses `useState` + `useEffect` to manually resolve a
server-started promise:
  - `isPromiseLike(sessionSource)` check → set `isLoading=true`
  - `useEffect` with `.then()` → `setSession(resolved)` + `setIsLoading(false)`
  - `isActive` flag for stale-promise cancellation
React 19 provides `use()` which handles promise suspension natively, eliminating:
  - The `isLoading` state variable
  - The stale-promise cancellation logic (`isActive` flag)
  - The manual `.then()` chaining
  - The `isPromiseLike` type guard function
This is ~35 lines of code that React 19 replaces with 1 line.
RECOMMENDATION: Replace promise-resolving useEffect with `use(sessionSource)` inside
a Suspense boundary. The parent layout already wraps with Suspense (app/(chat)/layout.tsx).
The `isLoading` state becomes unnecessary — React suspends naturally. This also fixes F04.
```

---

### F04 — `isGuest` Flash Bug During Loading

```
FLOW: state-session | STEP: 9
SEVERITY: [HIGH]
FILE: features/auth/components/session-provider.tsx:135
FINDING: The `isGuest` derivation is:
  `const isGuest = session?.user.type === "guest" || isLoading`
During the loading phase (promise resolving), `isLoading=true` makes `isGuest=true`
even for authenticated users. This causes:
  - VoteButtons hide temporarily (features/voting/components/vote-buttons.tsx:37)
  - SidebarUserNav shows guest UI (features/sidebar/components/sidebar-user-nav.tsx:38)
  - Any `isGuest` consumer gets incorrect state
This flash occurs on every `router.refresh()` triggered by Supabase auth state
changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED). TOKEN_REFRESHED fires periodically,
meaning authenticated users experience recurring flashes.
RECOMMENDATION: Two options:
  (a) Fix with `use()` (F03) — eliminates `isLoading` entirely, so the `|| isLoading`
      fallback is removed. Component suspends instead of showing stale state.
  (b) Quick fix: Change derivation to only fall back to guest during INITIAL load,
      not on refreshes: `const isGuest = session ? session.user.type === "guest" : isLoading`
      But this still shows null session as non-guest briefly. Option (a) is cleaner.
```

---

### F05 — TOKEN_REFRESHED Triggers Full Server Re-render

```
FLOW: state-session | STEP: 6-8
SEVERITY: [MEDIUM]
FILE: features/auth/components/session-provider.tsx:110-121
FINDING: The `SESSION_REFRESH_EVENTS` Set includes `TOKEN_REFRESHED` alongside
`SIGNED_IN` and `SIGNED_OUT`. When Supabase silently refreshes an auth token,
`router.refresh()` fires, causing ALL server components to re-execute. Token
refresh is a routine maintenance operation (new JWT, same user) — the session
identity hasn't changed, only the token expiry. The Supabase SSR library
automatically updates cookies on token refresh via the `setAll` callback.
A full `router.refresh()` is unnecessary for token refreshes.
RECOMMENDATION: Remove `TOKEN_REFRESHED` from `SESSION_REFRESH_EVENTS`. The
Supabase SSR client handles cookie updates automatically. Only `SIGNED_IN` and
`SIGNED_OUT` represent actual session identity changes that require server
component revalidation. This reduces unnecessary re-renders during long sessions.
```

---

### F06 — Rate Limit IP Fallback to "unknown" Bucket

```
FLOW: auth-login | STEP: 6a
SEVERITY: [MEDIUM]
FILE: features/auth/lib/action-utils.ts:31
FINDING: `getClientIp()` returns "unknown" when `x-forwarded-for` header is absent:
  `return headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"`
All requests without this header (local development, certain proxy configs, direct
server access) share the single key `rate-limit-login:unknown`. In local dev,
5 login attempts across ANY client exhaust the bucket. In production behind Vercel's
CDN this is fine (Vercel always sets x-forwarded-for), but other deployment targets
may not.
RECOMMENDATION: Two improvements:
  (a) Fall back through multiple headers: `x-forwarded-for` → `x-real-ip` →
      `cf-connecting-ip` (Cloudflare) → "unknown"
  (b) In development, skip rate limiting entirely or use a very high limit.
      The current "graceful degradation" (skip if Redis unavailable) already
      handles the dev case if Redis isn't running, but if Redis IS running
      locally, the shared "unknown" bucket creates friction.
```

---

### F07 — Logout Creates Supabase Client for Guest-Only Users

```
FLOW: auth-logout | STEP: 1-3
SEVERITY: [LOW]
FILE: features/auth/actions/logout.ts:23-26
FINDING: `logout()` always creates a Supabase action client and calls `signOut()`,
even for guest-only users who have no Supabase session. `signOut()` makes an HTTP
call to Supabase to invalidate a server-side session that doesn't exist. The call
succeeds as a no-op but adds unnecessary latency (~50-200ms) for guest logouts.
RECOMMENDATION: Since logout has no session context to check (it doesn't call
`getAppSession()`), the simplest fix is to check for Supabase auth cookies before
constructing the client. If no Supabase cookies exist, skip the client creation
and signOut entirely. Alternatively, accept the latency — guest logouts are rare
(guests typically don't actively "log out").
```

---

### F08 — Double Zod Validation (Client + Server)

```
FLOW: auth-login | STEP: 3, 5
SEVERITY: [LOW]
FILE: features/auth/components/auth-form.tsx:56-63, features/auth/actions/login.ts:36-46
FINDING: Login/register forms validate with Zod on the client (auth-form.tsx:56-63)
and again on the server (login.ts:36-46). The server validation is REQUIRED for
security (never trust client input). The client validation provides instant field
error feedback. Both are correct and necessary.
This is NOT a bug — it's the correct pattern. Documenting for completeness.
RECOMMENDATION: No change. Keep both validations. The client validation prevents
unnecessary server round-trips for obviously invalid input. The server validation
ensures security regardless of client behavior.
```

---

### F09 — `registerSchema` is a Direct Alias of `loginSchema`

```
FLOW: auth-register | STEP: 5
SEVERITY: [LOW]
FILE: features/auth/schemas/auth.schema.ts:20
FINDING: `export const registerSchema = loginSchema` — no additional schema definition.
Both schemas validate the same shape (email + password, 6-100 chars). The alias exists
as a semantic placeholder for future divergence (e.g., adding password confirmation,
username, or terms acceptance). The `RegisterInput` type is also identical to `LoginInput`.
RECOMMENDATION: No change needed now. The alias is intentional forward-planning.
If registration requirements never diverge, consider removing the alias in a cleanup
pass and using `loginSchema` directly as `authCredentialsSchema`. For now, the
semantic separation is helpful for code intent.
```

---

### F10 — Supabase Browser Client Silent Error Swallowing

```
FLOW: state-session | STEP: 6
SEVERITY: [MEDIUM]
FILE: features/auth/components/session-provider.tsx:108-127
FINDING: The Supabase `onAuthStateChange` subscription setup is wrapped in a
bare `try/catch` that silently returns on any error:
  ```ts
  try {
    const supabase = getSupabaseBrowserClient()
    // ...subscription setup
  } catch {
    return  // ← silent failure
  }
  ```
If `getSupabaseBrowserClient()` throws (missing env vars — it explicitly throws
per supabase-browser.ts:18-20), no subscription is created, no error is logged,
and auth state changes (cross-tab login/logout, token refresh) are never detected.
The user sees a stale session until they manually refresh the page.
RECOMMENDATION: Log the error at minimum:
  ```ts
  catch (error) {
    console.error("[SessionProvider] Failed to subscribe to auth changes:", error)
    return
  }
  ```
In production, missing Supabase env vars should be caught at build/startup time,
not silently at runtime. Consider adding env validation at app initialization.
```

---

### F11 — No `aria-describedby` Linking Inputs to Errors

```
FLOW: auth-login | STEP: client-side
SEVERITY: [MEDIUM]
FILE: features/auth/components/auth-form.tsx:121-130, 145-155
FINDING: Field error messages are rendered as `<p role="alert">` below their
respective inputs, but the inputs have no `aria-describedby` attribute linking
them to the error message. Screen readers announce the `role="alert"` when it
appears (live region behavior), but when a user tabs to an input, they won't
hear the associated error unless they navigate to it. The connection between
input and error is only visual (proximity), not semantic.
RECOMMENDATION: Add `aria-describedby` to each input referencing its error element:
  ```tsx
  <Input id="email" aria-describedby={state?.fieldErrors?.email ? "email-error" : undefined} />
  <p id="email-error" role="alert">{state.fieldErrors.email[0]}</p>
  ```
  Similarly for the password field. This ensures screen readers announce errors
  when the input is focused, not just when the error first appears.
```

---

### F12 — `autoFocus` on Email Input

```
FLOW: auth-login | STEP: client-side
SEVERITY: [LOW]
FILE: features/auth/components/auth-form.tsx:119
FINDING: The email input has `autoFocus` set. While convenient for sighted keyboard
users, this can disorient screen reader users who expect to hear the page title or
heading first before focus lands on an input. WCAG 3.2.1 (On Focus) recommends not
causing unexpected context changes. The auth form is inside a Suspense boundary
(auth layout), so the autoFocus fires after the auth guard resolves, potentially
after the user has already started interacting with the page.
RECOMMENDATION: Consider removing `autoFocus` or making it conditional based on
whether the page was directly navigated to (vs. tabbed into). This is a minor a11y
concern — most auth forms use autoFocus, and it's an accepted practice. LOW severity.
```

---

### F13 — No Rate Limiting on Logout

```
FLOW: auth-logout | STEP: 1
SEVERITY: [LOW]
FILE: features/auth/actions/logout.ts:22
FINDING: The `logout` action has no rate limiting. While logout is idempotent and
low-risk, an attacker could call it repeatedly to:
  (a) Generate load on Supabase's signOut endpoint
  (b) Repeatedly create/invalidate sessions in a session fixation pattern
  (c) Fill up server logs with signOut operations
Given that logout requires an active session (CSRF protection via Server Actions)
and is typically a single-fire action, this risk is minimal.
RECOMMENDATION: No change needed. The built-in CSRF protection from Server Actions
prevents external invocation. If abuse is observed in production, add a simple
rate limit (10/min per IP) as a defensive measure.
```

---

### F14 — `createActionErrorResult` Utility is Over-Scoped to `AuthActionData`

```
FLOW: N/A (internal utility)
SEVERITY: [LOW]
FILE: features/auth/lib/action-utils.ts:23-28
FINDING: The `createActionErrorResult` helper is typed to return
`ActionResult<AuthActionData>` specifically:
  ```ts
  function createActionErrorResult(code: ErrorCode, message: string): ActionResult<AuthActionData>
  ```
This makes it non-reusable outside the auth feature. The function is private
(not exported) and only used by `authServiceUnavailableResult` and
`enforceAuthRateLimit`, both of which are auth-specific. The scoping is correct
for current usage.
RECOMMENDATION: No change. The function is private and correctly scoped. If other
features need similar helpers, a generic version should be created in `lib/utils/`
or `lib/types/result.types.ts`. Don't pre-generalize.
```

---

## Files Audited — Summary Table

| File | Lines | Issues | Status |
|------|-------|--------|--------|
| `features/auth/actions/login.ts` | 108 | F01, F02, F08 | CLEAN (optimization opportunities) |
| `features/auth/actions/register.ts` | 122 | F09 | CLEAN |
| `features/auth/actions/logout.ts` | 36 | F07, F13 | CLEAN |
| `features/auth/components/auth-form.tsx` | 203 | F08, F11, F12 | CLEAN (a11y improvements) |
| `features/auth/components/auth-loading-state.tsx` | 22 | — | CLEAN (excellent a11y) |
| `features/auth/components/session-provider.tsx` | 160 | F03, F04, F05, F10 | NEEDS ATTENTION |
| `features/auth/lib/action-utils.ts` | 78 | F06, F14 | CLEAN |
| `features/auth/lib/supabase-action.ts` | 34 | — | CLEAN |
| `features/auth/lib/supabase-browser.ts` | 26 | — | CLEAN |
| `features/auth/schemas/auth.schema.ts` | 26 | F09 | CLEAN |
| `features/auth/types/auth.types.ts` | 18 | — | CLEAN |

---

## Severity Distribution

| Severity | Count | Finding IDs |
|----------|-------|-------------|
| CRITICAL | 0 | — |
| HIGH | 1 | F04 |
| MEDIUM | 5 | F01, F03, F05, F06, F10, F11 |
| LOW | 6 | F02, F07, F08, F09, F12, F13, F14 |

---

## Top Recommendations (Priority Order)

1. **Fix `isGuest` flash bug (F04)** — HIGH. Authenticated users see guest UI flashes on every token refresh. Fix by adopting `use()` (F03) or changing the derivation logic.

2. **Adopt React 19 `use()` in SessionProvider (F03)** — MEDIUM. Eliminates ~35 lines of manual promise resolution, fixes F04, and aligns with React 19 idioms. The parent layout already has Suspense boundaries.

3. **Remove TOKEN_REFRESHED from refresh events (F05)** — MEDIUM. Reduces unnecessary full server re-renders during long sessions. Token cookie updates are handled by Supabase SSR automatically.

4. **Add `aria-describedby` to form inputs (F11)** — MEDIUM. Improves screen reader experience for field errors. Small change with measurable a11y impact.

5. **Log Supabase client initialization failures (F10)** — MEDIUM. Silent failure in production could cause undetectable session staleness. Add `console.error` at minimum.

6. **Make D012 reconciliation conditional or background (F01)** — MEDIUM. Removes a DB query from every login for a condition that almost never occurs. Lower priority because the latency cost is small (~5-20ms).

---

## Positive Observations

- **Error handling is exemplary.** All action paths return structured `ActionResult` — no throws, no unhandled paths. Best-effort patterns for non-critical operations (D012, migration) are correct.
- **Rate limiting with graceful degradation.** Redis unavailability doesn't block auth. Well-implemented.
- **Clean separation of concerns.** Action utils, Supabase clients, schemas, and types are properly isolated. No leaky abstractions.
- **`auth-loading-state.tsx` is excellent a11y.** Uses `<output>` with `aria-label`, includes `sr-only` text, and provides visual skeleton states.
- **`useActionState` integration is correct.** Proper `(prevState, formData)` signature, client validation before server call, separate client form state type from server result type.
- **Type safety is strong.** All error codes from the `ErrorCode` union, all return types explicit, no `any` usage, Zod schemas for validation.
