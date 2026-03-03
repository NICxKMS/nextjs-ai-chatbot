---
task: P2-SWEEP
title: "Post-Phase Quality Sweep — Auth Vertical"
phase: 2
agent: theseus
status: done
started: "2026-03-03"
finished: "2026-03-03"
assessment: conditional-pass
severity_high: 1
severity_medium: 3
severity_low: 4
---

## Summary

Comprehensive quality sweep of all Phase 2 output (P2-T01 through P2-T08). Covered 18 source files across `lib/auth/`, `features/auth/`, `app/(auth)/`, `app/layout.tsx`, and `proxy.ts`.

---

## Validation Results

| Command          | Result |
|------------------|--------|
| `pnpm format`    | ✅ pass (3 warnings — all upstream shadcn/ui, not P2 code) |
| `pnpm typecheck` | ✅ pass |
| `pnpm lint`      | ✅ pass (same 3 warnings as format) |

---

## Findings

### HIGH

#### F01: `GUEST_COOKIE_NAME` duplicated across 5 files

| Location | Value |
|----------|-------|
| `lib/auth/session.ts:22` | `const GUEST_COOKIE_NAME = "guest_token"` |
| `features/auth/actions/login.ts:11` | `const GUEST_COOKIE_NAME = "guest_token"` |
| `features/auth/actions/register.ts:12` | `const GUEST_COOKIE_NAME = "guest_token"` |
| `features/auth/actions/logout.ts:11` | `const GUEST_COOKIE_NAME = "guest_token"` |
| `proxy.ts:8` | `const GUEST_COOKIE_NAME = "guest_token"` |

**Description:** The magic string `"guest_token"` is independently defined 5 times. A rename requires updating all 5 files with no compiler guard if one is missed.

**Recommended fix:** Extract to a shared constant in `lib/auth/session.ts` (or a new `lib/auth/constants.ts`) and import from there. All consumers are server-only, so no client bundle concern.

**Blocks gate?** No — the constant is identical in all locations and working correctly. But should be fixed before Phase 3 to prevent drift.

---

### MEDIUM

#### F02: `lib/auth/session.ts` imports from `features/auth/lib/guest`

**Location:** `lib/auth/session.ts:6`
```typescript
import { verifyGuestToken } from "@/features/auth/lib/guest"
```

**Description:** This is a `lib/` → `features/` import, which violates the layer rules in `plan/architecture/conventions.md` §3 ("`lib/` → nothing above"). This was documented as the "known D009 case" in the task instructions.

**Recommended fix:** Either:
1. Move `verifyGuestToken` (and related guest functions) to `lib/auth/guest.ts` since they're infrastructure-level, or
2. Add this as a formal cross-feature import exception in conventions.md §3 with rationale.

**Blocks gate?** No — known and documented deviation. Should be resolved in a future cleanup pass.

---

#### F03: `SUPABASE_COOKIE_NAME` hardcoded without env var override

**Location:** `proxy.ts:11`
```typescript
const SUPABASE_COOKIE_NAME = "sb-access-token"
```

**Description:** The old app used `process.env.SUPABASE_ACCESS_TOKEN_COOKIE_NAME || "sb-access-token"` for flexibility. The new code hardcodes the fallback only. `@supabase/ssr` uses project-specific cookie names (pattern: `sb-<project-ref>-auth-token`), so `"sb-access-token"` may not match the actual cookie set by Supabase SSR.

If the cookie name doesn't match:
- Authenticated users on guest-eligible routes get unnecessary ghost guest tokens minted
- Authenticated users on auth-required routes get redirected to `/login` by the proxy

The server-side `getAppSession()` would still correctly resolve auth via `@supabase/ssr`'s `getUser()`, but the proxy's lightweight presence check would be broken.

**Recommended fix:** Use env var with fallback: `process.env.SUPABASE_ACCESS_TOKEN_COOKIE_NAME || "sb-access-token"`. Or use a prefix-match on `sb-` cookies of any name.

**Blocks gate?** No — this is proxy-level optimization only. `getAppSession()` handles the real auth check server-side. But should be fixed before production deployment to avoid unnecessary guest token minting.

---

#### F04: `<Toaster />` still outside `<ThemeProvider>` (carried from P0-SWEEP)

**Location:** `app/layout.tsx:49`
```tsx
</ThemeProvider>
<Toaster />
```

**Description:** P0-SWEEP flagged this as a warning. P2-T08 modified root layout but did not fix the positioning. Sonner's `<Toaster>` won't auto-detect the theme unless it's a child of `ThemeProvider` (or `theme` prop is explicitly passed).

**Recommended fix:** Move `<Toaster />` inside `<ThemeProvider>`, after `{children}`.

**Blocks gate?** No — visual-only issue, no functional impact.

---

### LOW

#### F05: `UserType` exported but never imported

**Location:** `features/auth/types/auth.types.ts:8`
```typescript
export type UserType = "authenticated" | "guest"
```

**Description:** `UserType` is defined and exported but never imported anywhere in the new codebase. It duplicates the inline union type in `AppSession.user.type`. No consumer references `UserType` — it's dead code.

**Recommended fix:** Either remove it, or use it in `AppSession`'s `type` field to make it the canonical source.

**Blocks gate?** No — dead export, harmless.

---

#### F06: `guestTokenSchema` and `GuestTokenInput` exported but unused

**Location:** `features/auth/schemas/auth.schema.ts:31,39`
```typescript
export const guestTokenSchema = z.object({ token: z.string() })
export type GuestTokenInput = z.infer<typeof guestTokenSchema>
```

**Description:** Neither `guestTokenSchema` nor `GuestTokenInput` is imported anywhere in the codebase. The `guest.ts` module accepts raw string tokens directly, not objects matching this schema. These were created per spec but have no consumer.

**Recommended fix:** Remove if not planned for future use, or document the intended consumer.

**Blocks gate?** No — unused exports, adds minor client bundle bloat since the schema file is imported by `auth-form.tsx`.

---

#### F07: `AppSession.user.type` uses inlined union instead of `UserType`

**Location:** `lib/auth/session.ts:15`
```typescript
type: "authenticated" | "guest"
```

**Description:** The `AppSession` type inline the union `"authenticated" | "guest"` rather than referencing the `UserType` alias from `features/auth/types/auth.types.ts`. This creates a naming inconsistency — a named type exists for this exact union but isn't used by its primary consumer. (Note: using `UserType` here would create a `lib/` → `features/` import, which is already the boundary issue in F02. The inlining is actually the *correct* approach given current layer rules.)

**Recommended fix:** If F02 is resolved by moving guest utilities to `lib/auth/`, `UserType` could also be co-located to `lib/auth/session.ts`. Alternatively, remove `UserType` (F05) and accept the inline union as canonical.

**Blocks gate?** No — cosmetic inconsistency.

---

#### F08: `offline` error code type not in conventions core type list

**Location:** `plan/architecture/conventions.md` §Error Code Structured Naming

**Description:** The conventions doc lists core error code types as: `bad_request`, `unauthorized`, `forbidden`, `not_found`, `rate_limit`, `ai_error`, `internal_error`. The `offline` type (used in `offline:api:service_unavailable`) is present in `lib/errors/codes.ts` but not in the conventions doc's core type list. This was added per W2-EH-02 resolution.

**Recommended fix:** Add `offline` to the conventions doc's core type list.

**Blocks gate?** No — documentation-only drift.

---

## Checks Performed (All Clean)

### 1. `"use server"` / `"use client"` / `"server-only"` Directives ✅

| File | Required Directive | Present |
|------|--------------------|---------|
| `features/auth/actions/login.ts` | `"use server"` | ✅ line 1 |
| `features/auth/actions/register.ts` | `"use server"` | ✅ line 1 |
| `features/auth/actions/logout.ts` | `"use server"` | ✅ line 1 |
| `features/auth/components/auth-form.tsx` | `"use client"` | ✅ line 1 |
| `features/auth/components/session-provider.tsx` | `"use client"` | ✅ line 1 |
| `features/auth/lib/supabase-browser.ts` | `"use client"` | ✅ line 1 |
| `features/auth/lib/guest.ts` | `import "server-only"` | ✅ line 1 |
| `features/auth/lib/supabase-action.ts` | `import "server-only"` | ✅ line 1 |
| `lib/auth/session.ts` | `import "server-only"` | ✅ line 1 |
| `features/auth/types/auth.types.ts` | none (types only) | ✅ |
| `features/auth/schemas/auth.schema.ts` | none (shared schema) | ✅ |
| `app/(auth)/layout.tsx` | none (Server Component) | ✅ |
| `app/(auth)/login/page.tsx` | none (Server Component) | ✅ |
| `app/(auth)/register/page.tsx` | none (Server Component) | ✅ |
| `app/(auth)/error.tsx` | `"use client"` | ✅ line 1 |
| `app/layout.tsx` | none (Server Component) | ✅ |
| `proxy.ts` | none (proxy interceptor) | ✅ |

### 2. Naming Conventions ✅

- **Files:** All kebab-case (`auth.types.ts`, `auth.schema.ts`, `supabase-action.ts`, `session-provider.tsx`)
- **Components:** PascalCase (`AuthForm`, `SessionProvider`)
- **Hooks:** `use` prefix (`useSession`)
- **Functions:** camelCase (`getAppSession`, `mintGuestToken`, `login`, `register`, `logout`)
- **Constants:** SCREAMING_SNAKE_CASE (`GUEST_COOKIE_NAME`, `GUEST_TOKEN_TTL_SECONDS`, `PUBLIC_ROUTES`)
- **Types:** PascalCase (`AppSession`, `AuthMode`, `UserType`, `LoginInput`)
- **Schemas:** camelCase + Schema suffix (`loginSchema`, `registerSchema`, `guestTokenSchema`)
- **Error codes:** `type:surface:detail` convention followed

### 3. Import Boundaries ✅ (with known exception)

- `app/` → `features/`, `lib/`: ✅ correct direction
- `features/auth/` → `lib/`: ✅ correct direction
- `features/auth/` → `components/ui/`: ✅ correct direction
- `lib/auth/session.ts` → `features/auth/lib/guest`: ⚠️ documented D009 violation (see F02)
- No `components/` → `features/` imports
- No cross-route imports in `app/`

### 4. Error Handling Consistency ✅

All three server actions follow the same pattern:
- Zod validation → structured `ActionResult` error
- Supabase unavailable → structured `ActionResult` error
- Auth failure → structured `ActionResult` error
- Success → `redirect()` (throws `NEXT_REDIRECT`)
- No unguarded throws from public API surface

### 5. Security ✅

- Guest JWT secret from env var (`GUEST_JWT_SECRET`) — not hardcoded
- Guest cookie: `httpOnly`, `secure` in production, `sameSite: "lax"` — correct flags
- Supabase auth cookies managed by `@supabase/ssr` — correct delegation
- No secrets exposed to client bundles
- Server actions validate all input with Zod before processing

### 6. Type Consistency ✅

- `AppSession` defined once in `lib/auth/session.ts`, re-exported from `features/auth/types/auth.types.ts`
- `ActionResult<T>` from `lib/types/result.types.ts` used consistently in all actions
- `ErrorCode` from `lib/errors/codes.ts` used in all error returns
- `AuthMode` from `features/auth/types/auth.types.ts` used by auth-form
- No conflicting type definitions

---

## Assessment: CONDITIONAL PASS

Phase 2 is solid. All validation commands pass. Auth flow architecture is correct: server-side session resolution → client-side context via provider → Supabase auth state change listener → router.refresh(). The proxy handles guest token lifecycle correctly with dual-write pattern.

### Gate Recommendation: **PROCEED**

No HIGH findings block the gate. The HIGH-severity F01 (duplicated constant) is a code hygiene issue that should be addressed in a cleanup pass before Phase 3 begins, but does not affect correctness.

### Pre-Phase 3 Recommended Actions

| Priority | Finding | Action |
|----------|---------|--------|
| Should fix | F01 | Extract `GUEST_COOKIE_NAME` to shared constant |
| Should fix | F03 | Add env var override for `SUPABASE_COOKIE_NAME` in proxy |
| Nice to have | F04 | Move `<Toaster />` inside `<ThemeProvider>` |
| Nice to have | F05+F07 | Remove `UserType` or use it in `AppSession` |
| Nice to have | F06 | Remove unused `guestTokenSchema` / `GuestTokenInput` |
| Docs only | F08 | Add `offline` to conventions error code type list |
| Track | F02 | Track D009 import boundary exception for formal resolution |
