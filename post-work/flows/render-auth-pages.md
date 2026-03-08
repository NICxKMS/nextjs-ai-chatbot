FLOW: Auth Pages Render (Login / Register)
ENTRY: Browser navigates to `/login` or `/register` → Next.js resolves `app/(auth)/login/page.tsx` or `app/(auth)/register/page.tsx`

STEPS:
  1. `app/layout.tsx` (RootLayout, Server Component)
     → Renders `<html>` shell with fonts, ThemeProvider, TooltipProvider, Toaster
     → Static — no async work at root level

  2. `app/(auth)/layout.tsx` (AuthLayout, Server Component)
     → Exports `metadata: { title: "Authentication", description: "Sign in or create an account." }`
     → Renders centered container: `<div class="flex min-h-svh items-center justify-center bg-background p-4">`
       → Inner: `<div class="w-full max-w-md">`
         → `<Suspense fallback={<AuthLoadingState />}>`
           → `<AuthGuard>{children}</AuthGuard>`

  3. `AuthLoadingState` (Sync component — immediate fallback)
     → Renders skeleton matching AuthForm layout:
       - Title placeholder (h-7 w-32 animate-pulse)
       - Subtitle placeholder (h-4 w-48 animate-pulse)
       - Email label + input skeleton
       - Password label + input skeleton
       - Submit button skeleton
     → Uses `<output>` element with `aria-label="Loading authentication"`

  4. `AuthGuard` (async Server Component — inside Suspense)
     → `const session = await getAppSession()`
     → Session resolution: Supabase cookies → guest JWT cookie → null
     → If `session?.user.type === "authenticated"` → `redirect("/")` (server-side 307)
     → If not authenticated → renders `<>{children}</>` (passes through)
     → NOTE: Guest users are NOT redirected — only fully authenticated users

  5a. `app/(auth)/login/page.tsx` (LoginPage, Server Component)
      → Exports `metadata: { title: "Sign In" }`
      → Renders: `<AuthForm mode="login" action={login} />`
      → `login` is a Server Action from `@/features/auth/actions/login`

  5b. `app/(auth)/register/page.tsx` (RegisterPage, Server Component)
      → Exports `metadata: { title: "Sign Up" }`
      → Renders: `<AuthForm mode="register" action={register} />`
      → `register` is a Server Action from `@/features/auth/actions/register`

  6. `AuthForm` (Client Component — "use client")
     → Props: `mode: AuthMode`, `action: (prevState, formData) => Promise<ActionResult<AuthActionData>>`
     → Uses React 19 `useActionState` for server action integration
     → `handleAction` flow:
       a. Client-side Zod validation: `loginSchema` or `registerSchema`
       b. If validation fails → return `{ fieldErrors }` → inline error display
       c. If validation passes → call server action: `action({ success: true, data: undefined }, formData)`
       d. If server error → return `{ serverError }` → error banner
       e. If success with `confirmationRequired` → return `{ successMessage }` → success banner
       f. Otherwise → server action redirects (login success → redirect to `/`)
     → Renders:
       ```
       <form action={formAction}>
         {successMessage banner?}
         {serverError banner?}
         <h3>Sign In / Create Account</h3>
         <p>descriptor text</p>
         <Label>Email</Label>
         <Input name="email" type="email" />
         {fieldErrors.email?}
         <Label>Password</Label>
         <Input name="password" type="password" />
         {fieldErrors.password?}
         <Button type="submit" disabled={isPending}>Sign In / Sign Up</Button>
         <p>link to register/login</p>
       </form>
       ```

COMPONENT TREE:
  ```
  RootLayout
  └── ThemeProvider
      └── TooltipProvider
          └── AuthLayout
              ├── <div centered container>
              │   └── Suspense(AuthLoadingState)
              │       └── AuthGuard
              │           └── LoginPage / RegisterPage
              │               └── AuthForm(mode, action)
              │                   ├── Success Banner?
              │                   ├── Error Banner?
              │                   ├── Email Input + Errors
              │                   ├── Password Input + Errors
              │                   ├── Submit Button
              │                   └── Link to alt page
              └── Toaster
  ```

SUSPENSE BOUNDARIES:
  - `AuthLayout → Suspense(AuthLoadingState)` wraps AuthGuard + children
    → AuthGuard is async (reads cookies via getAppSession)
    → fallback shows AuthLoadingState skeleton
    → Once session resolves: either redirect to `/` or render auth form

ERROR BOUNDARIES:
  - `app/(auth)/error.tsx` — catches runtime errors in auth pages
    → Shows "Something went wrong" with error digest
    → "Try Again" (reset) + "Go Home" (link to /)
    → Renders within the auth layout's centered container

BOTTLENECKS:
  - `getAppSession()` in AuthGuard is the sole blocking async operation
    → Reads Supabase cookies, makes network call to verify session
    → If Supabase is slow, the auth page is delayed behind the skeleton
  - The redirect check must complete before ANY page content renders
    → Authenticated users see a flash of AuthLoadingState before redirect

WASTE:
  - AuthGuard runs on EVERY auth page load even when the user is clearly not logged in
    (no cookies present). The `getAppSession()` function still reads cookieStore to check.
    This is correct behavior but incurs a cookie read even when the answer is obviously null.
  - Toaster from root layout is rendered but rarely needed on auth pages
    (only for registration confirmation or error scenarios).

SIMPLIFICATION OPPORTUNITIES:
  - AuthGuard could short-circuit before creating the Supabase client if no Supabase
    auth cookies exist in the cookie store — avoiding the `createServerClient` overhead
    for anonymous visitors.
  - The `metadata` export in both login/register pages overrides the auth layout's
    metadata title via the `%s` template pattern. But there's no template in the auth
    layout metadata — it uses a plain `title: "Authentication"`. The page-level metadata
    completely replaces the layout title (correct behavior, but the auth layout metadata
    effectively serves no purpose when child pages always override it).

EXIT: Browser displays a centered authentication form:
  - Clean card-like container, max-width 448px
  - Email and password inputs
  - Submit button "Sign In" or "Sign Up"
  - Link to alternate auth page
  - No sidebar, no chat UI, no session providers
  - Minimal JS footprint (only AuthForm + Toaster client components)
