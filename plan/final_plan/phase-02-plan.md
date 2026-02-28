# Phase 02 — Authentication

> Supabase Auth integration: session management, guest rotation, login/register/logout, auth UI, middleware.

---

## Objective

Implement the full authentication flow: Supabase session resolution, Zod schemas, token exchange, server actions (login, register, logout), auth form component, auth provider, API routes, auth pages, middleware guest rotation, and wire into root layout. After this phase, users can authenticate and sessions are managed.

**Entry state:** P01 complete — data layer operational, auth config exists
**Exit state:** Login/register/logout functional; sessions persist; guest users auto-created; middleware handles auth redirects
**Est. duration:** ~1.5 days
**Tasks:** 12

---

## Task Table

| ID | Title | Type | Complexity | Dependencies |
|----|-------|------|------------|-------------|
| P02-T01 | Session resolution helper | IMPLEMENTATION | M | P01-T11 |
| P02-T02 | Auth Zod schemas | IMPLEMENTATION | S | P00-T08 |
| P02-T03 | Token exchange utility | IMPLEMENTATION | M | P01-T11 |
| P02-T04 | Login + register server actions | IMPLEMENTATION | M | T01, T02, T03 |
| P02-T05 | Logout server action | IMPLEMENTATION | S | T01, T03 |
| P02-T06 | Auth form component | IMPLEMENTATION | M | T04, P00-T11 |
| P02-T07 | Auth provider (client context) | IMPLEMENTATION | M | T01 |
| P02-T08 | Auth API routes (guest, callback, logout) | IMPLEMENTATION | M | T03, T04, T05 |
| P02-T09 | Auth pages (login, register) | IMPLEMENTATION | M | T06 |
| P02-T10 | Middleware guest rotation | IMPLEMENTATION | M | T03, P00-T14 |
| P02-T11 | Wire auth into root layout | INTEGRATION | M | T07, P00-T05 |
| P02-T12 | Verification gate G02 | VERIFICATION | S | ALL |

---

## Entry/Exit States

| State | Condition |
|-------|-----------|
| Entry | P01 gate passed; DB client, auth config, middleware base exist |
| Exit | Login/register works against Supabase; sessions persist across requests; guest users created on first visit; middleware redirects unauthenticated users from chat routes |

---

## Integration Verification

- Register creates user in Supabase + DB
- Login returns valid session token
- Logout clears session
- Guest rotation creates anonymous user on first visit
- Middleware redirects `/chat/*` for unauthenticated users
- Auth provider exposes user state to client components

---

## Seams Addressed

| Seam | Description | Task |
|------|-------------|------|
| SEAM-001 | Supabase session ↔ app session | P02-T01 |
| SEAM-002 | Auth token exchange flow | P02-T03 |
| SEAM-003 | Guest ↔ authenticated user transition | P02-T10 |
| SEAM-004 | Auth provider ↔ server session sync | P02-T07, P02-T11 |
| SEAM-005 | Middleware auth redirect logic | P02-T10 |
