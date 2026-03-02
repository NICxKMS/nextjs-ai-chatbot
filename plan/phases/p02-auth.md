# Phase P2 — Auth Vertical

> **Updated per redesign audit (2026-03-01)**

> First vertical slice. Implements complete authentication: session resolution, login, register,
> guest auth, SessionProvider, proxy integration, and auth pages.
> Server Actions for login/register/logout (NOT API routes). SessionProvider (NOT AuthProvider).
>
> **Entry state**: P1 complete — data layer, cache, revalidation, AI providers ready.
> **Exit state**: Users can log in, register, and use the app as guests. Session persists across requests.
> **Est. duration**: ~2.75 days
> **Tasks**: 9
> **Files created**: ~14

> **Deferred (AU-V8):** Guest-to-auth data migration (migrating guest chats/artifacts to authenticated user on login/register) is **not implemented in P2**. Redesign `auth-system.md` says "Guest data may be migrated during authenticated transitions" (non-committal). This plan explicitly defers migration to post-MVP scope. Guest data remains under the guest user ID after authentication. If migration is later committed, it will be assigned to a future phase task.

---

## Task Summary

| ID | Title | Type | Complexity | Files |
|----|-------|------|------------|-------|
| P2-T01 | Create session resolution | IMPL | M | 1 |
| P2-T02 | Create auth types + schemas | IMPL | S | 2 |
| P2-T03 | Create guest bootstrap | IMPL | M | 1 |
| P2-T04 | Create auth actions (login/register/logout) | IMPL | M | 3 |
| P2-T05 | Create auth form component | IMPL | L | 1 |
| P2-T06 | Create SessionProvider | IMPL | M | 1 |
| P2-T07 | Create auth layout + pages | IMPL | M | 3 |
| P2-T08 | Wire root layout + proxy | INTEG | M | 2 |
| P2-T09 | Verification gate G02 | VERIFY | S | 0 |

---

## Seam Coverage

| Seam | Description | Task |
|------|-------------|------|
| SEAM-001 | SessionProvider state sync | P2-T06 |
| SEAM-002 | Auth action flow | P2-T04 |
| SEAM-003 | Guest auth bootstrap | P2-T03 |
| SEAM-004 | Proxy guest rotation | P2-T08 |
| SEAM-005 | Session resolution pipeline | P2-T01 |

---

## Tasks

---

### TASK: [ID: P2-T01]
Title: Create session resolution function
Phase: 2 — Auth Vertical
Type: IMPL

Behavior ref: auth-system.md (session resolution pipeline: check Supabase session, fall back to guest JWT, resolve AppSession.user)
Architecture ref: architecture/patterns.md (session resolution); SEAM-005 (session resolution pipeline)

Action: Create **lib/auth/session.ts** (NOT features/auth/lib/session.ts, NOT lib/auth/config.ts) — Export getAppSession(): Promise<AppSession> function. Calls `cookies()` internally; wrapped in `React.cache` for request-scoped memoization (no cookieStore parameter — parameterless design enables React.cache deduplication across concurrent callers within a single request). Resolution pipeline: (1) Read Supabase session token from cookies, verify with supabase.auth.getUser(). (2) If no Supabase session, read guest token from cookies, verify with verifyGuestToken(). (3) Return `AppSession` with normalized shape `{ user: { id, type, email? } }`. (4) If neither token exists, return null session (not logged in). This is the single source of truth for "who is the current user" used by all server actions and API routes.

Output files:
- lib/auth/session.ts

Inputs: @supabase/ssr (Supabase client), lib/data/user.ts (P1-T05), lib/types/ (AppSession from P0-T05)
Outputs: getAppSession consumed by all server actions, API routes, and layouts that need auth

AI layer handling: NEW

Dependencies: P1-T05, P1-T14
Dependents: P2-T03, P2-T04, P2-T06, P2-T08, P3-T09, P3-T20

Success criteria:
- getAppSession returns AppSession with `user.id` + `user.type='authenticated'` for valid Supabase session
- getAppSession returns AppSession with `user.id` + `user.type='guest'` for valid guest JWT
- getAppSession returns null when no valid tokens found
- Never throws — returns null on invalid tokens
- **File is lib/auth/session.ts** (NOT features/auth/lib/session.ts)
- pnpm typecheck passes

> **Deviation (AU-V2):** Redesign `directory-structure.md` and `phase-plan.md` P2-T03 list `features/auth/lib/session.ts` as an output file containing `getAppSession()`. However, redesign `domain-boundaries.md` shows features/auth *importing* `getAppSession()` from `lib/auth/session`, not owning it. The redesign is internally inconsistent on this point. This plan resolves the ambiguity by placing `getAppSession()` exclusively in `lib/auth/session.ts` (infrastructure layer), which is the correct location per the import direction rule. `features/auth/lib/session.ts` is intentionally omitted.

Complexity: M

---

### TASK: [ID: P2-T02]
Title: Create auth types + schemas
Phase: 2 — Auth Vertical
Type: IMPL

Behavior ref: auth-system.md (login/register form validation)
Architecture ref: conventions.md (Zod schemas with Schema suffix); AGENTS.md (input validation via Zod)

Action: Create 2 files. (1) `features/auth/types/auth.types.ts` — shared auth payload/session helper types used by auth forms/actions. (2) `features/auth/schemas/auth.schema.ts` — export loginSchema (email string().email(), password string().min(6).max(100)), registerSchema (extends login with optional name), guestTokenSchema (token string), and inferred LoginInput/RegisterInput types via z.infer. These schemas are used for both client-side form validation and server-side action validation.

Output files:
- features/auth/types/auth.types.ts
- features/auth/schemas/auth.schema.ts

Inputs: zod package
Outputs: Auth schemas consumed by auth form (P2-T06) and auth actions (P2-T04)

AI layer handling: NEW

Dependencies: P0-T05
Dependents: P2-T04, P2-T05

Success criteria:
- loginSchema validates email format and password length
- registerSchema extends login with optional name
- Type exports match Zod inferences
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P2-T03]
Title: Create guest bootstrap
Phase: 2 — Auth Vertical
Type: IMPL

Behavior ref: auth-system.md (guest user creation, JWT minting, rotation)
Architecture ref: SEAM-003 (guest token lifecycle); ../../plan-archives/redesign/architecture.md (guest identity)

Action: Create `features/auth/lib/guest.ts` — Export functions: mintGuestToken(userId): string (creates JWT with guest userId, 1h expiry), verifyGuestToken(token): {userId: string} | null (validates and decodes JWT), rotateGuestToken(token): string (refreshes expiring token with same userId when near expiry). Uses jose library for JWT operations.

Output files:
- features/auth/lib/guest.ts

Inputs: lib/auth/session.ts (P2-T01), features/auth/schemas/auth.schema.ts (P2-T02)
Outputs: Guest bootstrap consumed by proxy (`proxy.ts`) and session resolution flow (`lib/auth/session.ts`)

AI layer handling: NEW

Dependencies: P2-T01
Dependents: P2-T04, P2-T08

Success criteria:
- mintGuestToken creates valid JWT with 1h expiry
- verifyGuestToken returns null for expired/invalid tokens (no throw)
- rotateGuestToken preserves userId with new expiry
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P2-T04]
Title: Create auth actions (login/register/logout)
Phase: 2 — Auth Vertical
Type: IMPL

Behavior ref: auth-system.md (login, register, logout flows)
Architecture ref: conventions.md (server actions — verb-first camelCase); DEV-015 (no .action.ts suffix)

Action: Create 3 server action files. (1) features/auth/actions/login.ts — "use server" action `login(prevState, formData): ActionResult<void>`. Validates with loginSchema, calls `supabase.auth.signInWithPassword()` server-side, sets session cookie, redirects to "/". On failure: return ActionResult error. (2) features/auth/actions/register.ts — "use server" action `register(prevState, formData): ActionResult<void>`. Validates with registerSchema, calls `supabase.auth.signUp()` server-side, creates user record via createUser(), sets session cookie when applicable, redirects appropriately. (3) features/auth/actions/logout.ts — "use server" action `logout(): ActionResult<void>`. Calls `supabase.auth.signOut()`, clears session cookie, redirects to "/login". **Post-logout flow:** user arrives at /login with no tokens (no sb_token, no guest_token). On next navigation to a protected route, proxy.ts auto-creates a guest token (per auth-system.md §Auto-Creation). Logout does NOT re-mint a guest token inline — guest re-bootstrap is deferred to the proxy on next request.

Output files:
- features/auth/actions/login.ts
- features/auth/actions/register.ts
- features/auth/actions/logout.ts

Inputs: features/auth/schemas/auth.schema.ts (P2-T02), lib/auth/session.ts (P2-T01), lib/data/user.ts (P1-T05)
Outputs: Auth actions consumed by auth form (P2-T05), sidebar user nav (P5), SessionProvider (P2-T06)

AI layer handling: NEW

Dependencies: P2-T01, P2-T02
Dependents: P2-T05, P2-T06

Success criteria:
- login validates input with loginSchema before Supabase call
- register creates both Supabase user and DB user record
- logout clears cookie + Supabase session and redirects
- All redirect on success, return {error} on failure (not throw)
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P2-T05]
Title: Create auth form component
Phase: 2 — Auth Vertical
Type: IMPL

Behavior ref: auth-system.md (login/register UI); features.md (AuthForm component behavior)
Architecture ref: ADR-001 (feature collocation — component in features/auth/); DEV-004 (auth form in feature dir, not components/)

Action: Create features/auth/components/auth-form.tsx — "use client" component. Props: mode ("login" | "register"), action (server action reference). Renders email input, password input, submit button using shadcn/ui (Input, Button, Label). Uses useActionState for form submission with server action. Shows validation errors from loginSchema/registerSchema on client side (Zod). Shows server errors from action response. Loading state during submission. Links to alternate mode ("/login" <-> "/register"). Responsive layout, matches oldapp/components/auth-form.tsx visual structure.

Output files:
- features/auth/components/auth-form.tsx

Inputs: features/auth/schemas/auth.schema.ts (P2-T02), features/auth/actions/login.ts + register.ts (P2-T04), components/ui/ (P0-T11)
Outputs: AuthForm consumed by login page and register page (P2-T07)

AI layer handling: NEW

Dependencies: P2-T04
Dependents: P2-T07

Success criteria:
- "use client" directive present
- Form uses useActionState (React 19) for server action integration
- Client-side Zod validation before submission
- Server errors displayed from action response
- Loading state shown during submission
- Links between login and register pages
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P2-T06]
Title: Create SessionProvider
Phase: 2 — Auth Vertical
Type: IMPL

Behavior ref: auth-system.md (auth state broadcasting); state-management.md (SessionProvider context)
Architecture ref: ../../plan-archives/redesign/state-management.md (SessionProvider replaces AuthProvider); SEAM-001

Action: Create features/auth/components/**session-provider.tsx** (NOT auth-provider.tsx) — "use client" component. Creates React context SessionContext with value {session: AppSession | null, isLoading: boolean, isGuest: boolean}. **Exported as SessionProvider (NOT AuthProvider)**. Provider receives initial session from server (passed as prop from layout). Listens for Supabase auth state changes (onAuthStateChange) — on state change, calls `router.refresh()` to revalidate server components (handles cross-tab login, token refresh) and updates context. Exports **useSession()** hook for consuming auth state (NOT useAuthContext). On auth change: refreshes server session, updates context. **Guest bootstrap effect:** accepts initial session prop (which may be a guest session resolved by proxy), derives `isGuest` state from `session.user.type`, and detects guest→authenticated transitions via `onAuthStateChange` (when a guest user completes login/register, Supabase fires a SIGNED_IN event — the provider updates session and `isGuest` accordingly). If no Supabase session and no guest_token cookie exist, the proxy layer (not this component) handles guest creation — SessionProvider simply reflects whatever session the server resolved.

Output files:
- features/auth/components/session-provider.tsx

Inputs: lib/auth/session.ts (P2-T01), lib/types/ (AppSession from P0-T05)
Outputs: **SessionProvider** and **useSession** consumed by root layout (P2-T08), chat layout (P3-T21)

AI layer handling: NEW

Dependencies: P2-T03
Dependents: P2-T08, P3-T21

Success criteria:
- SessionContext provides session, isLoading, isGuest
- **useSession()** hook exported and typed (NOT useAuthContext)
- Component file is **session-provider.tsx** (NOT auth-provider.tsx)
- Provider name is **SessionProvider** (NOT AuthProvider)
- Listens to Supabase onAuthStateChange
- Calls `router.refresh()` in `onAuthStateChange` handler to revalidate server components on cross-tab login / token refresh
- Guest bootstrap effect: accepts initial session prop (may be guest), derives `isGuest`, detects guest→auth transitions via `onAuthStateChange`
- Initial session passed as prop from server component
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P2-T07]
Title: Create auth layout + pages
Phase: 2 — Auth Vertical
Type: IMPL

Behavior ref: auth-system.md (login page, register page); features.md (auth routes)
Architecture ref: ../../plan-archives/redesign/directory-structure.md (app/(auth)/ route group); conventions.md (page components)

Action: Create 4 files. (1) app/(auth)/layout.tsx — Server component layout for auth pages. Centered card layout. Redirects authenticated users to "/" (check session via getAppSession()). (2) app/(auth)/login/page.tsx — Renders AuthForm with mode="login" and login server action. Sets metadata title. (3) app/(auth)/register/page.tsx — Renders AuthForm with mode="register" and register server action. Sets metadata title. (4) app/(auth)/error.tsx — Error boundary for auth routes. Displays user-friendly error message with retry/home links.

Output files:
- app/(auth)/layout.tsx
- app/(auth)/login/page.tsx
- app/(auth)/register/page.tsx
- app/(auth)/error.tsx

Inputs: features/auth/components/auth-form.tsx (P2-T05), features/auth/actions/ (P2-T04), lib/auth/session.ts (P2-T01), features/auth/components/session-provider.tsx (P2-T06)
Outputs: Auth pages consumed by proxy route guards (P2-T08)

AI layer handling: NEW

Dependencies: P2-T05, P2-T06
Dependents: P2-T08

Success criteria:
- Auth layout redirects authenticated users to "/"
- Login page renders AuthForm with mode="login"
- Register page renders AuthForm with mode="register"
- Error boundary catches and displays auth errors gracefully
- All pages are server components (except AuthForm which is "use client")
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P2-T08]
Title: Wire root layout + proxy
Phase: 2 — Auth Vertical
Type: INTEG

Behavior ref: auth-system.md (proxy guest rotation, path guards); state-management.md (provider tree)
Architecture ref: ../../plan-archives/redesign/architecture.md (server layout, no app-shell.tsx); SEAM-004, SEAM-029

Action: Update **app/layout.tsx** (server component) to: call getAppSession(), wrap children with **SessionProvider** (NOT AuthProvider) passing the resolved session. Provider tree becomes: ThemeProvider > SessionProvider > children, with Toaster as a body-level sibling (NOT nested inside providers). **No app-shell.tsx** — layout composes providers directly. Proxy auth/guest behavior is already established in P0-T14.

Output files:
- app/layout.tsx (update)

Inputs: lib/auth/session.ts (P2-T01), features/auth/components/session-provider.tsx (P2-T06), app/(auth)/ pages (P2-T07)
Outputs: Session available to all client components via useSession()

AI layer handling: NEW

Dependencies: P2-T06
Dependents: P2-T09, P3-T21

Success criteria:
- Root layout calls getAppSession() server-side
- Root layout wraps children in **SessionProvider** (NOT AuthProvider)
- **No app-shell.tsx import** — providers composed directly in layout
- useSession() returns session in any client component
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P2-T09]
Title: Verification gate G02
Phase: 2 — Auth Vertical
Type: VERIFY

Behavior ref: auth-system.md (complete auth flow verification)
Architecture ref: AGENTS.md (post-implementation validation); strategy/phase-order.md (gate G02)

Action: Run complete validation: (1) pnpm typecheck passes, (2) pnpm lint passes, (3) pnpm format passes. Functional verification: (4) pnpm dev starts, (5) navigate to /login — form renders, (6) navigate to /register — form renders, (7) new visitor gets guest token cookie automatically, (8) import { useSession } from "@/features/auth/components/session-provider" resolves (NOT useAuthContext), (9) import { getAppSession } from "@/lib/auth/session" resolves (NOT features/auth/lib/session). Verify **lib/auth/session.ts** exists (NOT lib/auth/config.ts). Verify **session-provider.tsx** exports SessionProvider (NOT auth-provider.tsx / AuthProvider). Verify **proxy.ts** handles auth (NOT middleware.ts).

Output files: none (validation only)

Inputs: all P2-T01 through P2-T08 outputs
Outputs: Gate G02 passed — P3 can begin

AI layer handling: N/A

Dependencies: P2-T01 through P2-T08
Dependents: P3-T01 (start of next phase)

Success criteria:
- pnpm typecheck exits 0
- pnpm lint exits 0
- pnpm format --check exits 0
- /login page renders auth form
- /register page renders auth form
- Guest token cookie set on new visitor
- **SessionProvider** (NOT AuthProvider) accessible in client components
- **lib/auth/session.ts** exists (NOT lib/auth/config.ts)
- **proxy.ts** handles guest rotation (NOT middleware.ts)

Complexity: S

---

## Audit Trail

> Applied Wave 4 corrections per `audit-reports/wave2/auth.md` and `audit-reports/wave3/reconciliation-report.md` (2026-03-02).

| Finding | Severity | Change | Location |
|---------|----------|--------|----------|
| AU-V1 / SC-2 | HIGH | Fixed `getAppSession()` to parameterless signature; added `cookies()` + `React.cache` notes | P2-T01 Action |
| AU-V2 | MEDIUM | Added deviation note documenting intentional omission of `features/auth/lib/session.ts` | P2-T01 (after success criteria) |
| AU-V3 | MEDIUM | Added `router.refresh()` requirement for `onAuthStateChange` handler | P2-T06 Action + Success criteria |
| AU-V4 | MEDIUM | Defined "guest bootstrap effect" concretely (accept session prop, derive isGuest, detect transitions) | P2-T06 Action + Success criteria |
| AU-V5 | LOW | Fixed P2-T06 complexity from L to M (matches summary table and redesign) | P2-T06 Complexity |
| AU-V6 | LOW | Fixed Toaster placement to "body-level sibling" (not nested inside providers) | P2-T08 Action |
| AU-V7 | MEDIUM | Documented post-logout flow: proxy auto-creates guest on next protected-route access | P2-T04 Action |
| AU-V8 | MEDIUM | Added explicit deferral note for guest-to-auth data migration (post-MVP) | Document header |