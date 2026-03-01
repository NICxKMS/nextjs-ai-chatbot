# Phase P02 — Auth Vertical

> **Updated per redesign audit (2026-03-01)**

> First vertical slice. Implements complete authentication: session resolution, login, register,
> guest auth, SessionProvider, proxy integration, and auth pages.
> Server Actions for login/register/logout (NOT API routes). SessionProvider (NOT AuthProvider).
>
> **Entry state**: P01 complete — data layer, cache, revalidation, AI providers ready.
> **Exit state**: Users can log in, register, and use the app as guests. Session persists across requests.
> **Est. duration**: ~1.5 days
> **Tasks**: 9
> **Files created**: ~14

---

## Task Summary

| ID | Title | Type | Complexity | Files |
|----|-------|------|------------|-------|
| P02-T01 | Create session resolution | IMPLEMENTATION | M | 1 |
| P02-T02 | Create auth types + schemas | IMPLEMENTATION | S | 1 |
| P02-T03 | Create guest bootstrap | IMPLEMENTATION | M | 2 |
| P02-T04 | Create auth actions (login/register/logout) | IMPLEMENTATION | M | 3 |
| P02-T05 | Create auth form component | IMPLEMENTATION | L | 1 |
| P02-T06 | Create SessionProvider | IMPLEMENTATION | L | 1 |
| P02-T07 | Create auth layout + pages | IMPLEMENTATION | M | 3 |
| P02-T08 | Wire root layout + proxy | INTEGRATION | M | 2 |
| P02-T09 | Verification gate G02 | VERIFICATION | S | 0 |

---

## Seam Coverage

| Seam | Description | Task |
|------|-------------|------|
| SEAM-001 | SessionProvider state sync | P02-T06 |
| SEAM-002 | Token exchange flow | P02-T03 |
| SEAM-003 | Guest auth bootstrap | P02-T03 |
| SEAM-004 | Proxy guest rotation | P02-T08 |
| SEAM-005 | Session resolution pipeline | P02-T01 |

---

## Tasks

---

### TASK: [ID: P02-T01]
Title: Create session resolution function
Phase: 2 — Auth Vertical
Type: IMPLEMENTATION

Behavior ref: auth-system.md (session resolution pipeline: check Supabase session, fall back to guest JWT, resolve userId)
Architecture ref: architecture/patterns.md (session resolution); SEAM-005 (session resolution pipeline)

Action: Create **lib/auth/session.ts** (NOT features/auth/lib/session.ts, NOT lib/auth/config.ts) — Export getAppSession(cookieStore): Promise<AppSession> function. Resolution pipeline: (1) Read Supabase session token from cookies, verify with supabase.auth.getUser(). (2) If no Supabase session, read guest token from cookies, verify with verifyGuestToken(). (3) Return AppSession with {userId, email?, isGuest, supabaseToken?}. (4) If neither token exists, return null session (not logged in). This is the single source of truth for "who is the current user" used by all server actions and API routes.

Output files:
- lib/auth/session.ts

Inputs: @supabase/ssr (Supabase client), lib/data/user.ts (P01-T05), lib/types/ (AppSession from P00-T05)
Outputs: getAppSession consumed by all server actions, API routes, and layouts that need auth

AI layer handling: NEW

Dependencies: P01-T05, P01-T14
Dependents: P02-T03, P02-T04, P02-T06, P02-T08, P03-T09, P03-T20

Success criteria:
- getAppSession returns AppSession with userId for valid Supabase session
- getAppSession returns AppSession with userId and isGuest:true for valid guest JWT
- getAppSession returns null when no valid tokens found
- Never throws — returns null on invalid tokens
- **File is lib/auth/session.ts** (NOT features/auth/lib/session.ts)
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P02-T02]
Title: Create auth validation schemas
Phase: 2 — Auth Vertical
Type: IMPLEMENTATION

Behavior ref: auth-system.md (login/register form validation)
Architecture ref: conventions.md (Zod schemas with Schema suffix); AGENTS.md (input validation via Zod)

Action: Create features/auth/schemas/auth.schema.ts — Export loginSchema (Zod object: email string().email(), password string().min(6).max(100)), registerSchema (extends login with name string().min(1).max(100) optional), guestTokenSchema (Zod object: token string()), and type inferences LoginInput, RegisterInput using z.infer. These schemas are used for both client-side form validation and server-side action validation.

Output files:
- features/auth/schemas/auth.schema.ts

Inputs: zod package
Outputs: Auth schemas consumed by auth form (P02-T06) and auth actions (P02-T04)

AI layer handling: NEW

Dependencies: P00-T18
Dependents: P02-T04, P02-T05

Success criteria:
- loginSchema validates email format and password length
- registerSchema extends login with optional name
- Type exports match Zod inferences
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P02-T03]
Title: Create guest bootstrap
Phase: 2 — Auth Vertical
Type: IMPLEMENTATION

Behavior ref: auth-system.md (guest user creation, JWT minting, guest-to-auth migration)
Architecture ref: SEAM-002 (guest token lifecycle); architecture/patterns.md (server actions); redesign/architecture.md (guest identity)

Action: Create 2 files. (1) features/auth/lib/guest.ts — Export functions: mintGuestToken(userId): string (creates JWT with guest userId, 24h expiry), verifyGuestToken(token): {userId: string} | null (validates and decodes JWT), rotateGuestToken(token): string (refreshes expiring token with same userId). Uses jose library for JWT operations. (2) features/auth/actions/exchange.ts — "use server" action exchangeGuestToAuth(guestUserId: string, authUserId: string): Promise<void>. Migrates guest data: update chats where userId=guestUserId, update **artifacts** (NOT documents) where userId=guestUserId, invalidate caches for both user IDs, delete guest user record.

Output files:
- features/auth/lib/guest.ts
- features/auth/actions/exchange.ts

Inputs: lib/auth/session.ts (P02-T01), lib/data/chat.ts (P01-T06), lib/data/artifact.ts (P01-T08)
Outputs: Guest bootstrap consumed by proxy (P02-T08) for token rotation, exchange consumed by login/register (P02-T04)

AI layer handling: NEW

Dependencies: P02-T01, P01-T06, P01-T08
Dependents: P02-T04, P02-T08

Success criteria:
- mintGuestToken creates valid JWT with 24h expiry
- verifyGuestToken returns null for expired/invalid tokens (no throw)
- rotateGuestToken preserves userId with new expiry
- exchangeGuestToAuth migrates **artifacts** (NOT documents)
- Cache invalidated for both user IDs
- Guest user record deleted after migration
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P02-T04]
Title: Create auth actions (login/register/logout)
Phase: 2 — Auth Vertical
Type: IMPLEMENTATION

Behavior ref: auth-system.md (login, register, logout flows)
Architecture ref: conventions.md (server actions — verb-first camelCase); DEV-015 (no .action.ts suffix)

Action: Create 3 server action files. (1) features/auth/actions/login.ts — "use server" action login(formData: FormData): ActionResult. Validates with loginSchema, calls supabase.auth.signInWithPassword(). On success: check for guest session, if exists call exchangeGuestToAuth(), set session cookie, redirect to "/". On failure: return {error: message}. (2) features/auth/actions/register.ts — "use server" action register(formData: FormData): ActionResult. Validates with registerSchema, calls supabase.auth.signUp(), creates user record via createUser(), handles guest exchange, sets session cookie, redirects to "/". (3) features/auth/actions/logout.ts — "use server" action logout(): void. Calls supabase.auth.signOut(), clears session cookie, mints new guest JWT so user returns to guest state, redirects to "/". All use redirect() from next/navigation on success.

Output files:
- features/auth/actions/login.ts
- features/auth/actions/register.ts
- features/auth/actions/logout.ts

Inputs: features/auth/schemas/auth.schema.ts (P02-T02), lib/auth/session.ts (P02-T01), features/auth/actions/exchange.ts (P02-T03), features/auth/lib/guest.ts (P02-T03), lib/data/user.ts (P01-T05)
Outputs: Auth actions consumed by auth form (P02-T05), sidebar user nav (P05), SessionProvider (P02-T06)

AI layer handling: NEW

Dependencies: P02-T01, P02-T02, P02-T03, P01-T05
Dependents: P02-T05, P02-T06

Success criteria:
- login validates input with loginSchema before Supabase call
- register creates both Supabase user and DB user record
- logout mints new guest token (user returns to guest state)
- All handle guest-to-auth exchange when guest session exists
- All redirect on success, return {error} on failure (not throw)
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P02-T05]
Title: Create auth form component
Phase: 2 — Auth Vertical
Type: IMPLEMENTATION

Behavior ref: auth-system.md (login/register UI); features.md (AuthForm component behavior)
Architecture ref: ADR-001 (feature collocation — component in features/auth/); DEV-004 (auth form in feature dir, not components/)

Action: Create features/auth/components/auth-form.tsx — "use client" component. Props: mode ("login" | "register"), action (server action reference). Renders email input, password input, submit button using shadcn/ui (Input, Button, Label). Uses useActionState for form submission with server action. Shows validation errors from loginSchema/registerSchema on client side (Zod). Shows server errors from action response. Loading state during submission. Links to alternate mode ("/login" <-> "/register"). Responsive layout, matches oldapp/components/auth-form.tsx visual structure.

Output files:
- features/auth/components/auth-form.tsx

Inputs: features/auth/schemas/auth.schema.ts (P02-T02), features/auth/actions/login.ts + register.ts (P02-T04), components/ui/ (P00-T11)
Outputs: AuthForm consumed by login page and register page (P02-T07)

AI layer handling: NEW

Dependencies: P02-T02, P02-T04
Dependents: P02-T07

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

### TASK: [ID: P02-T06]
Title: Create SessionProvider
Phase: 2 — Auth Vertical
Type: IMPLEMENTATION

Behavior ref: auth-system.md (auth state broadcasting); state-management.md (SessionProvider context)
Architecture ref: redesign/state-management.md (SessionProvider replaces AuthProvider); SEAM-001

Action: Create features/auth/components/**session-provider.tsx** (NOT auth-provider.tsx) — "use client" component. Creates React context SessionContext with value {session: AppSession | null, isLoading: boolean, isGuest: boolean}. **Exported as SessionProvider (NOT AuthProvider)**. Provider receives initial session from server (passed as prop from layout). Listens for Supabase auth state changes (onAuthStateChange) and updates context. Exports **useSession()** hook for consuming auth state (NOT useAuthContext). On auth change: refreshes server session, updates context. Handles guest-to-auth transition seamlessly.

Output files:
- features/auth/components/session-provider.tsx

Inputs: lib/auth/session.ts (P02-T01), lib/types/ (AppSession from P00-T05)
Outputs: **SessionProvider** and **useSession** consumed by root layout (P02-T08), chat layout (P03-T21)

AI layer handling: NEW

Dependencies: P02-T01
Dependents: P02-T08, P03-T21

Success criteria:
- SessionContext provides session, isLoading, isGuest
- **useSession()** hook exported and typed (NOT useAuthContext)
- Component file is **session-provider.tsx** (NOT auth-provider.tsx)
- Provider name is **SessionProvider** (NOT AuthProvider)
- Listens to Supabase onAuthStateChange
- Initial session passed as prop from server component
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P02-T07]
Title: Create auth layout + pages
Phase: 2 — Auth Vertical
Type: IMPLEMENTATION

Behavior ref: auth-system.md (login page, register page); features.md (auth routes)
Architecture ref: redesign/directory-structure.md (app/(auth)/ route group); conventions.md (page components)

Action: Create 4 files. (1) app/(auth)/layout.tsx — Server component layout for auth pages. Centered card layout. Redirects authenticated users to "/" (check session via getAppSession()). (2) app/(auth)/login/page.tsx — Renders AuthForm with mode="login" and login server action. Sets metadata title. (3) app/(auth)/register/page.tsx — Renders AuthForm with mode="register" and register server action. Sets metadata title. (4) app/(auth)/error.tsx — Error boundary for auth routes. Displays user-friendly error message with retry/home links.

Output files:
- app/(auth)/layout.tsx
- app/(auth)/login/page.tsx
- app/(auth)/register/page.tsx
- app/(auth)/error.tsx

Inputs: features/auth/components/auth-form.tsx (P02-T05), features/auth/actions/ (P02-T04), lib/auth/session.ts (P02-T01)
Outputs: Auth pages consumed by proxy route guards (P02-T08)

AI layer handling: NEW

Dependencies: P02-T04, P02-T05
Dependents: P02-T08

Success criteria:
- Auth layout redirects authenticated users to "/"
- Login page renders AuthForm with mode="login"
- Register page renders AuthForm with mode="register"
- Error boundary catches and displays auth errors gracefully
- All pages are server components (except AuthForm which is "use client")
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P02-T08]
Title: Wire root layout + proxy
Phase: 2 — Auth Vertical
Type: INTEGRATION

Behavior ref: auth-system.md (proxy guest rotation, path guards); state-management.md (provider tree)
Architecture ref: redesign/architecture.md (server layout, no app-shell.tsx); SEAM-004, SEAM-029

Action: Two integration steps. (1) Update **proxy.ts** (NOT middleware.ts) to add guest token rotation: if request has no session cookie AND no guest cookie, mint guest token inline and set cookie. If guest cookie is expiring (< 1 hour), refresh. Add path guards: redirect unauthenticated users from protected routes to /login (guest access to chat allowed). (2) Update **app/layout.tsx** (server component) to: call getAppSession(), wrap children with **SessionProvider** (NOT AuthProvider) passing the resolved session. Provider tree becomes: ThemeProvider > SessionProvider > Toaster > children. **No app-shell.tsx** — layout composes providers directly.

Output files:
- proxy.ts (update)
- app/layout.tsx (update)

Inputs: lib/auth/session.ts (P02-T01), features/auth/components/session-provider.tsx (P02-T06)
Outputs: Session available to all client components via useSession(); proxy handles guest rotation

AI layer handling: NEW

Dependencies: P02-T01, P02-T06
Dependents: P02-T09, P03-T21

Success criteria:
- **proxy.ts** handles guest token rotation (NOT middleware.ts)
- Root layout calls getAppSession() server-side
- Root layout wraps children in **SessionProvider** (NOT AuthProvider)
- **No app-shell.tsx import** — providers composed directly in layout
- useSession() returns session in any client component
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P02-T09]
Title: Verification gate G02
Phase: 2 — Auth Vertical
Type: VERIFICATION

Behavior ref: auth-system.md (complete auth flow verification)
Architecture ref: AGENTS.md (post-implementation validation); strategy/phase-order.md (gate G02)

Action: Run complete validation: (1) pnpm typecheck passes, (2) pnpm lint passes, (3) pnpm format passes. Functional verification: (4) pnpm dev starts, (5) navigate to /login — form renders, (6) navigate to /register — form renders, (7) new visitor gets guest token cookie automatically, (8) import { useSession } from "@/features/auth/components/session-provider" resolves (NOT useAuthContext), (9) import { getAppSession } from "@/lib/auth/session" resolves (NOT features/auth/lib/session). Verify **lib/auth/session.ts** exists (NOT lib/auth/config.ts). Verify **session-provider.tsx** exports SessionProvider (NOT auth-provider.tsx / AuthProvider). Verify **proxy.ts** handles auth (NOT middleware.ts).

Output files: none (validation only)

Inputs: all P02-T01 through P02-T08 outputs
Outputs: Gate G02 passed — P03 can begin

AI layer handling: N/A

Dependencies: P02-T01 through P02-T08
Dependents: P03-T01 (start of next phase)

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