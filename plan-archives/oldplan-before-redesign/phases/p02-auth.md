# Phase P02 — Auth Vertical

> First vertical slice. Implements complete authentication: session resolution, login, register,
> guest auth, token exchange, auth provider, middleware integration, and auth pages.
>
> **Entry state**: P01 complete — data layer, cache, auth config, API utils ready.
> **Exit state**: Users can log in, register, and use the app as guests. Session persists across requests.
> **Est. duration**: ~1.5 days
> **Tasks**: 12
> **Files created**: ~18

---

## Task Summary

| ID | Title | Type | Complexity | Files |
|----|-------|------|------------|-------|
| P02-T01 | Create session resolution | IMPLEMENTATION | M | 1 |
| P02-T02 | Create auth schemas | IMPLEMENTATION | S | 1 |
| P02-T03 | Create token exchange action | IMPLEMENTATION | M | 1 |
| P02-T04 | Create login + register actions | IMPLEMENTATION | M | 2 |
| P02-T05 | Create logout action | IMPLEMENTATION | S | 1 |
| P02-T06 | Create auth form component | IMPLEMENTATION | L | 1 |
| P02-T07 | Create auth provider | IMPLEMENTATION | L | 1 |
| P02-T08 | Create auth API routes | IMPLEMENTATION | M | 3 |
| P02-T09 | Create auth pages | IMPLEMENTATION | M | 3 |
| P02-T10 | Wire middleware guest rotation | INTEGRATION | M | 1 |
| P02-T11 | Wire root layout with auth | INTEGRATION | M | 2 |
| P02-T12 | Verification gate G02 | VERIFICATION | S | 0 |

---

## Seam Coverage

| Seam | Description | Task |
|------|-------------|------|
| SEAM-001 | Auth provider state sync | P02-T07 |
| SEAM-002 | Token exchange flow | P02-T03 |
| SEAM-003 | Guest auth API route | P02-T08 |
| SEAM-004 | Middleware guest rotation | P02-T10 |
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

Action: Create features/auth/lib/session.ts — Export getAppSession(cookieStore): Promise<AppSession> function. Resolution pipeline: (1) Read Supabase session token from cookies, verify with supabase.auth.getUser(). (2) If no Supabase session, read guest token from cookies, verify with verifyGuestToken(). (3) Return AppSession with {userId, email?, isGuest, supabaseToken?}. (4) If neither token exists, return null session (not logged in). This is the single source of truth for "who is the current user" used by all server actions and API routes.

Output files:
- features/auth/lib/session.ts

Inputs: lib/auth/config.ts (P01-T11 — supabase client, verifyGuestToken, cookie names), lib/types/ (AppSession from P00-T08)
Outputs: getAppSession consumed by all server actions, API routes, and layouts that need auth

AI layer handling: NEW

Dependencies: P01-T11, P01-T16
Dependents: P02-T03, P02-T04, P02-T05, P02-T07, P02-T08, P02-T10, P02-T11, P03-T09, P03-T20

Success criteria:
- getAppSession returns AppSession with userId for valid Supabase session
- getAppSession returns AppSession with userId and isGuest:true for valid guest JWT
- getAppSession returns null when no valid tokens found
- Never throws — returns null on invalid tokens
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

Dependencies: P00-T17
Dependents: P02-T04, P02-T06

Success criteria:
- loginSchema validates email format and password length
- registerSchema extends login with optional name
- Type exports match Zod inferences
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P02-T03]
Title: Create token exchange action
Phase: 2 — Auth Vertical
Type: IMPLEMENTATION

Behavior ref: auth-system.md (guest-to-authenticated migration: preserve chat history when guest logs in)
Architecture ref: SEAM-002 (token exchange flow); architecture/patterns.md (server actions)

Action: Create features/auth/actions/exchange.ts — "use server" action exchangeGuestToAuth(guestUserId: string, authUserId: string): Promise<void>. When a guest user logs in or registers, this action migrates their data: (1) Update all chats where userId=guestUserId to userId=authUserId. (2) Update all messages via chat ownership (already handled by chat FK). (3) Update all documents where userId=guestUserId. (4) Delete the guest user record. (5) Invalidate cache for both guest and auth userIds. This preserves the guest's work when they create an account.

Output files:
- features/auth/actions/exchange.ts

Inputs: lib/db/ (P01-T01), lib/cache/ (P01-T04), lib/data/chat.ts (P01-T07), features/auth/lib/session.ts (P02-T01)
Outputs: Exchange action consumed by login/register actions (P02-T04) when guest has existing data

AI layer handling: NEW

Dependencies: P02-T01, P01-T07
Dependents: P02-T04

Success criteria:
- Guest chats migrated to authenticated userId
- Guest documents migrated to authenticated userId
- Cache invalidated for both user IDs
- Guest user record deleted after migration
- Handles case where guest has no data (no-op)
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P02-T04]
Title: Create login and register actions
Phase: 2 — Auth Vertical
Type: IMPLEMENTATION

Behavior ref: auth-system.md (login via Supabase signInWithPassword, register via Supabase signUp, password hashing)
Architecture ref: conventions.md (server actions — verb-first camelCase); DEV-015 (no .action.ts suffix)

Action: Create features/auth/actions/login.ts — "use server" action login(formData: FormData): ActionResult. Validates with loginSchema, calls supabase.auth.signInWithPassword(). On success: check for guest session, if exists call exchangeGuestToAuth(), set session cookie, redirect to "/". On failure: return {error: message}. Create features/auth/actions/register.ts — "use server" action register(formData: FormData): ActionResult. Validates with registerSchema, calls supabase.auth.signUp(), creates user record in DB via createUser(), handles guest exchange, sets session cookie, redirects to "/". Both use redirect() from next/navigation on success.

Output files:
- features/auth/actions/login.ts
- features/auth/actions/register.ts

Inputs: features/auth/schemas/auth.schema.ts (P02-T02), features/auth/lib/session.ts (P02-T01), features/auth/actions/exchange.ts (P02-T03), lib/data/user.ts (P01-T06), lib/auth/ (P01-T11)
Outputs: Login/register actions consumed by auth form component (P02-T06)

AI layer handling: NEW

Dependencies: P02-T01, P02-T02, P02-T03, P01-T06
Dependents: P02-T06

Success criteria:
- login validates input with loginSchema before Supabase call
- register creates both Supabase user and DB user record
- Both handle guest-to-auth exchange when guest session exists
- Both redirect to "/" on success
- Both return {error: string} on failure (not throw)
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P02-T05]
Title: Create logout action
Phase: 2 — Auth Vertical
Type: IMPLEMENTATION

Behavior ref: auth-system.md (logout: clear session, optionally preserve guest token)
Architecture ref: conventions.md (server actions)

Action: Create features/auth/actions/logout.ts — "use server" action logout(): void. Calls supabase.auth.signOut(), clears session cookie. Optionally mints a new guest JWT so user returns to guest state (not fully unauthenticated). Redirect to "/".

Output files:
- features/auth/actions/logout.ts

Inputs: lib/auth/ (P01-T11), features/auth/lib/session.ts (P02-T01)
Outputs: Logout action consumed by sidebar user nav (P05) and auth provider (P02-T07)

AI layer handling: NEW

Dependencies: P02-T01
Dependents: P02-T06, P02-T08

Success criteria:
- Supabase session cleared
- Session cookie deleted
- New guest token minted (user gets guest state after logout)
- Redirects to "/"
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P02-T06]
Title: Create auth form component
Phase: 2 — Auth Vertical
Type: IMPLEMENTATION

Behavior ref: auth-system.md (login/register UI); features.md (AuthForm component behavior)
Architecture ref: ADR-001 (feature collocation — component in features/auth/); DEV-004 (auth form in feature dir, not components/)

Action: Create features/auth/components/auth-form.tsx — "use client" component. Props: mode ("login" | "register"), action (server action reference). Renders email input, password input, submit button using shadcn/ui (Input, Button, Label). Uses useActionState for form submission with server action. Shows validation errors from loginSchema/registerSchema on client side (Zod). Shows server errors from action response. Loading state during submission. Links to alternate mode ("/login" <-> "/register"). Responsive layout, matches oldapp/components/auth-form.tsx visual structure.

Output files:
- features/auth/components/auth-form.tsx

Inputs: features/auth/schemas/auth.schema.ts (P02-T02), features/auth/actions/login.ts + register.ts (P02-T04), components/ui/ (P00-T11)
Outputs: AuthForm consumed by login page and register page (P02-T09)

AI layer handling: NEW

Dependencies: P02-T02, P02-T04
Dependents: P02-T09

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

### TASK: [ID: P02-T07]
Title: Create auth provider component
Phase: 2 — Auth Vertical
Type: IMPLEMENTATION

Behavior ref: auth-system.md (auth state broadcasting); state-management.md (AuthProvider context)
Architecture ref: SEAM-001 (auth provider state sync with children); architecture/patterns.md (React context for auth)

Action: Create features/auth/components/auth-provider.tsx — "use client" component. Creates React context AuthContext with value {session: AppSession | null, isLoading: boolean, isGuest: boolean}. Provider receives initial session from server (passed as prop from layout). Listens for Supabase auth state changes (onAuthStateChange) and updates context. Exports useAuthContext() hook for consuming auth state. On auth change: refreshes server session, updates context. Handles guest-to-auth transition seamlessly.

Output files:
- features/auth/components/auth-provider.tsx

Inputs: lib/auth/ (P01-T11), lib/types/ (AppSession from P00-T08), features/auth/lib/session.ts (P02-T01)
Outputs: AuthProvider and useAuthContext consumed by AppShell (P02-T11), chat layout (P03-T21)

AI layer handling: NEW

Dependencies: P02-T01, P01-T11
Dependents: P02-T11, P03-T21

Success criteria:
- AuthContext provides session, isLoading, isGuest
- useAuthContext hook exported and typed
- Listens to Supabase onAuthStateChange
- Initial session passed as prop from server component
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P02-T08]
Title: Create auth API routes
Phase: 2 — Auth Vertical
Type: IMPLEMENTATION

Behavior ref: auth-system.md (guest token minting API, auth callback, logout); api-contracts.md (auth endpoints)
Architecture ref: SEAM-003 (guest auth API route); conventions.md (route handlers: GET, POST exports)

Action: Create 3 route handlers. (1) app/api/auth/guest/route.ts — POST handler: mints a new guest JWT (createGuestToken), sets guest cookie, returns {userId, token}. Used when new visitor arrives without any auth. (2) app/api/auth/callback/route.ts — GET handler: handles Supabase OAuth callback, exchanges code for session, sets session cookie, redirects to "/". Handles error cases (invalid code, expired). (3) app/api/auth/logout/route.ts — POST handler: calls supabase.auth.signOut(), clears cookies, returns 200. Alternative to server action for API consumers.

Output files:
- app/api/auth/guest/route.ts
- app/api/auth/callback/route.ts
- app/api/auth/logout/route.ts

Inputs: lib/auth/ (P01-T11), lib/api/ (P01-T12), features/auth/lib/session.ts (P02-T01)
Outputs: Auth API routes consumed by middleware (P02-T10), client-side auth flows

AI layer handling: NEW

Dependencies: P02-T01, P01-T11, P01-T12
Dependents: P02-T10

Success criteria:
- POST /api/auth/guest returns valid guest JWT and sets cookie
- GET /api/auth/callback exchanges Supabase code and redirects
- POST /api/auth/logout clears all auth cookies
- All routes use requireAuth or are public as appropriate
- Error responses use AppError.toResponse()
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P02-T09]
Title: Create auth pages
Phase: 2 — Auth Vertical
Type: IMPLEMENTATION

Behavior ref: auth-system.md (login/register pages); features.md (auth page behavior)
Architecture ref: conventions.md (page.tsx exports default async function); scaffold/directory-structure.md (app/(auth)/)

Action: Create 3 files. (1) app/(auth)/layout.tsx — Auth layout: centered card container, no sidebar, simple branding header. Redirect authenticated users to "/" (check session server-side). (2) app/(auth)/login/page.tsx — Renders AuthForm with mode="login" and action={login}. Page metadata: title "Sign In". (3) app/(auth)/register/page.tsx — Renders AuthForm with mode="register" and action={register}. Page metadata: title "Sign Up". All pages are server components that pass the server action reference to the client AuthForm component.

Output files:
- app/(auth)/layout.tsx
- app/(auth)/login/page.tsx
- app/(auth)/register/page.tsx

Inputs: features/auth/components/auth-form.tsx (P02-T06), features/auth/actions/ (P02-T04, P02-T05), features/auth/lib/session.ts (P02-T01)
Outputs: Auth pages accessible at /login and /register

AI layer handling: NEW

Dependencies: P02-T06
Dependents: P02-T12

Success criteria:
- /login renders AuthForm in login mode
- /register renders AuthForm in register mode
- Auth layout redirects authenticated users to "/"
- Pages are server components
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P02-T10]
Title: Wire middleware guest token rotation
Phase: 2 — Auth Vertical
Type: INTEGRATION

Behavior ref: auth-system.md (middleware guest rotation: mint guest token for new visitors, refresh expiring tokens)
Architecture ref: SEAM-004 (middleware guest rotation); scaffold/base-config.md (middleware chain)

Action: Update middleware.ts to add guest token rotation logic. After rate limiting check: (1) If request has no session cookie AND no guest cookie, call internal /api/auth/guest to mint a guest token and set cookie on response. (2) If guest cookie exists but is expiring soon (< 1 hour), refresh it. (3) Pass session info to downstream via headers (x-user-id, x-is-guest). Also add path guards: redirect unauthenticated users from protected routes to /login (but allow guest access to chat).

Output files:
- middleware.ts (update)

Inputs: lib/auth/ (P01-T11), features/auth/lib/session.ts (P02-T01), lib/rate-limit/ (P01-T13)
Outputs: Middleware now handles complete auth flow for every request

AI layer handling: NEW

Dependencies: P02-T01, P02-T08, P01-T13
Dependents: P02-T12

Success criteria:
- New visitors get guest token automatically
- Expiring guest tokens are refreshed
- Protected routes redirect to /login
- Guest users can access chat routes
- x-user-id and x-is-guest headers set on responses
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P02-T11]
Title: Wire root layout with auth provider
Phase: 2 — Auth Vertical
Type: INTEGRATION

Behavior ref: state-management.md (provider tree with auth)
Architecture ref: SEAM-029 (provider tree assembly); architecture/patterns.md (provider composition)

Action: Update components/app-shell.tsx to: (1) Call getAppSession() to resolve current user session. (2) Wrap children with AuthProvider passing the resolved session as initial prop. (3) Provider tree becomes: ThemeProvider > AuthProvider > TooltipProvider > Toaster > children. Update app/layout.tsx if needed to pass cookies() context. This completes the auth integration into the root of the app.

Output files:
- components/app-shell.tsx (update)
- app/layout.tsx (update if needed)

Inputs: features/auth/components/auth-provider.tsx (P02-T07), features/auth/lib/session.ts (P02-T01)
Outputs: Auth state available to all client components via useAuthContext

AI layer handling: NEW

Dependencies: P02-T07, P02-T01
Dependents: P02-T12, P03-T21

Success criteria:
- AppShell calls getAppSession() and passes to AuthProvider
- AuthProvider is in the provider tree above all feature content
- useAuthContext returns session in any client component
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P02-T12]
Title: Verification gate G02
Phase: 2 — Auth Vertical
Type: VERIFICATION

Behavior ref: auth-system.md (complete auth flow verification)
Architecture ref: AGENTS.md (post-implementation validation); strategy/phase-order.md (gate G02)

Action: Run complete validation: (1) pnpm typecheck passes, (2) pnpm lint passes, (3) pnpm format passes. Functional verification: (4) pnpm dev starts, (5) navigate to /login — form renders, (6) navigate to /register — form renders, (7) new visitor gets guest token cookie automatically, (8) import { useAuthContext } from "@/features/auth/components/auth-provider" resolves, (9) import { getAppSession } from "@/features/auth/lib/session" resolves. Integration check: session resolution returns AppSession for both Supabase and guest auth paths.

Output files: none (validation only)

Inputs: all P02-T01 through P02-T11 outputs
Outputs: Gate G02 passed — P03 can begin

AI layer handling: N/A

Dependencies: P02-T01 through P02-T11
Dependents: P03-T01 (start of next phase)

Success criteria:
- pnpm typecheck exits 0
- pnpm lint exits 0
- pnpm format --check exits 0
- /login page renders auth form
- /register page renders auth form
- Guest token cookie set on new visitor
- Auth provider accessible in client components

Complexity: S