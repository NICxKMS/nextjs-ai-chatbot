> **Updated per redesign audit (2026-03-01)**

# Phase 2 — Auth Vertical

> Complete authentication: session resolution, login/register/logout, guest bootstrap, SessionProvider, auth pages, proxy wiring.

---

## Objective

Implement complete authentication — session resolution, login/register/logout, guest bootstrap, SessionProvider (was AuthProvider), auth pages, and proxy wiring. Auth actions return `ActionResult<T>` (never throw). Auth form uses `useActionState`. Root layout passes server-fetched session to `SessionProvider`. `proxy.ts` enforces protected-route auth while bootstrapping/rotating guest sessions for guest-capable routes.

**Entry state:** P1 complete — data layer ready, cache wired, user CRUD available
**Exit state:** Login/register/logout functional; sessions persist; guest users bootstrapped; `proxy.ts` handles auth redirects; `pnpm typecheck && pnpm lint && pnpm format` pass
**Tasks:** 9

---

## Task Table

| ID | Title | Type | Files Created | Dependencies | Complexity |
|---|---|---|---|---|---|
| P2-T01 | Create session resolution | IMPL | `lib/auth/session.ts` (`getAppSession()`: cookies → session) | P1-T05 | M |
| P2-T02 | Create auth types + schemas | IMPL | `features/auth/types/auth.types.ts`, `features/auth/schemas/auth.schema.ts` | P0-T05 | S |
| P2-T03 | Create guest bootstrap | IMPL | `features/auth/lib/guest.ts` (JWT creation, token rotation) | P2-T01 | M |
| P2-T04 | Create auth actions | IMPL | `features/auth/actions/login.ts`, `features/auth/actions/register.ts`, `features/auth/actions/logout.ts` | P2-T01, P2-T02 | M |
| P2-T05 | Create auth form | IMPL | `features/auth/components/auth-form.tsx` (`mode` prop, `useActionState`) | P2-T04 | L |
| P2-T06 | Create SessionProvider | IMPL | `features/auth/components/session-provider.tsx` (session context + auth state sync; guest bootstrap in `proxy.ts`) | P2-T03 | M |
| P2-T07 | Create auth layout + pages | IMPL | `app/(auth)/layout.tsx` (SERVER), `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/(auth)/error.tsx` | P2-T05 | M |
| P2-T08 | Wire root layout with auth | INTEG | Update `app/layout.tsx` to use `SessionProvider(session)` | P2-T06 | M |
| P2-T09 | Verification gate G02 | VERIFY | — | P2-T01..T08 | S |

---

## Key Changes from Pre-Redesign Plan

| Aspect | Before | After |
|--------|--------|-------|
| Phase naming | P02 | P2 |
| Task count | 12 | 9 (streamlined) |
| Auth provider | `AuthProvider` (P02-T07) | `SessionProvider` (`features/auth/components/session-provider.tsx`) |
| Middleware | "Middleware guest rotation" (P02-T10) | `proxy.ts` does guest token rotation (wired in P0-T14) |
| Auth API routes | Standalone task (P02-T08) | Removed — auth actions are Server Actions, not API routes |
| Token exchange | Standalone task (P02-T03) | Folded into guest bootstrap (P2-T03) |
| Feature location | Scattered across `lib/`, `components/` | Colocated in `features/auth/` |
| Action return type | Unspecified | `ActionResult<T>` (never throw) |
| Form pattern | Unspecified | `useActionState` in auth form |

---

## Entry/Exit States

| State | Condition |
|-------|-----------|
| Entry | P1 gate passed; DB client, data access, cache layer exist |
| Exit | `getAppSession()` resolves from cookies; login/register forms render and submit via `useActionState`; auth actions return `ActionResult<T>`; root layout passes session to `SessionProvider`; `proxy.ts` enforces protected routes and guest bootstrap policy |

---

## Exit Criteria

- [ ] `getAppSession()` resolves from cookies (Supabase + guest fallback)
- [ ] Login/register forms render and submit via `useActionState`
- [ ] Auth actions return `ActionResult<T>` (never throw)
- [ ] Root layout passes server-fetched session to `SessionProvider`
- [ ] `proxy.ts` protects auth-only routes and bootstraps guest sessions on guest-capable routes

**Verification:** `pnpm typecheck && pnpm lint && pnpm format`

---

## Seams Addressed

| Seam | Description | Task |
|------|-------------|------|
| SEAM-001 | Supabase session ↔ app session | P2-T01 |
| SEAM-002 | Guest bootstrap + token rotation | P2-T03 |
| SEAM-003 | Guest ↔ authenticated user transition | P2-T03, P2-T04 |
| SEAM-004 | SessionProvider ↔ server session sync | P2-T06, P2-T08 |
| SEAM-005 | proxy.ts auth redirect logic | P0-T14 (wired), P2-T01 (session) |
