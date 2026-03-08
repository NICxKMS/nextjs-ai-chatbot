FLOW: Form State (useActionState → Pending → Result → Error/Success Handling)
ENTRY: User visits `/login` or `/register` → `AuthForm` renders with `mode` prop and server action
STEPS:
  1. `app/(auth)/login/page.tsx` or `register/page.tsx` → renders `<AuthForm mode="login" action={login}>` or `<AuthForm mode="register" action={register}>`
  2. `AuthForm` component → `useActionState<AuthFormState | null, FormData>(handleAction, null)` → returns `[state, formAction, isPending]` → initial state is `null` (no errors)
  3. `<form action={formAction}>` — React 19 form action integration, form submission is managed by React's transition system
  4. User fills email + password → clicks submit → React intercepts form submission → calls `handleAction(_prevState, formData)`
  5. `handleAction` Step 1: Client-side Zod validation → `loginSchema.safeParse({ email, password })` or `registerSchema.safeParse(...)` → if fails: returns `{ fieldErrors: parsed.error.flatten().fieldErrors }` → NO server round-trip
  6. `handleAction` Step 2 (Zod passes): Calls server action → `await action({ success: true, data: undefined }, formData)` — passes neutral prevState + raw FormData
  7. Server action (`login` or `register`) executes:
     a. Server-side Zod validation (defense in depth — same schema)
     b. Rate limiting: `enforceAuthRateLimit()` → 5/min for login, 3/min for register per IP → returns structured error if exceeded
     c. `createSupabaseActionClient()` → server Supabase client with cookie read/write capability
     d. Supabase auth call: `signInWithPassword()` or `signUp()` → sets auth cookies via setAll callback
     e. On success: `migrateGuestChatsAndClearToken()` (login) → `redirect("/")` — Next.js redirect throws, skipping return
     f. On failure: returns `{ success: false, error: { code, message } }` — structured error, never throws
  8. If server action redirects → React navigates to "/" → `handleAction` never returns → `useActionState` transition settles → form unmounts
  9. If server action returns error → `handleAction` Step 3: `return { serverError: result.error.message }` → `useActionState` updates `state`
  10. If register returns `{ success: true, data: { confirmationRequired: true } }` → `handleAction` Step 4: `return { successMessage: "Account created! Please check your email..." }` → form stays mounted with success banner
  11. `isPending` state: `true` from form submission until `handleAction` returns → used to: (a) disable form inputs `disabled={isPending}`, (b) show loading text on button "Signing in…"/"Signing up…"
  12. `state.fieldErrors` → rendered as inline `<p role="alert">` under each field (email, password) → Zod error messages
  13. `state.serverError` → rendered as `<div role="alert">` banner above form → server-side error message (e.g., "Invalid email or password")
  14. `state.successMessage` → rendered as `<output aria-live="polite">` banner → email confirmation message
  15. Form is re-submittable: user fixes errors → resubmits → `handleAction` called again with previous state → state resets based on new result
BOTTLENECKS:
  - Server action execution is the critical path — includes rate limit check (Redis), Supabase auth call (external service), and optional DB operations (createUser, guest migration). Total latency: 200-1000ms typical.
  - `redirect("/")` inside a server action throws a special error that Next.js catches — this is the expected pattern but means the action never returns a value to `useActionState`. React handles this internally by settling the transition.
  - Rate limiting uses Redis (if available) — if Redis is down, `enforceAuthRateLimit` returns gracefully (skips limiting). This is a design choice for availability over strict security.
WASTE:
  - Double Zod validation: client-side in `handleAction` and server-side in the action. The client-side validation prevents unnecessary network round-trips, so it's not waste per se — it's defense in depth. But for the happy path, the same schema runs twice.
  - `handleAction` passes `{ success: true, data: undefined }` as prevState to the server action — the server action ignores prevState (`_prevState`). This neutral value allocation is unnecessary but harmless.
  - Register action: `reconciliation` in login action (getUserById + conditional createUser) runs on every login to handle partial registration failures. For 99%+ of logins, this is a wasted DB read. However, it's a correctness measure.
SIMPLIFICATION OPPORTUNITIES:
  - The `AuthFormState` interface has 3 optional fields (`serverError`, `successMessage`, `fieldErrors`) — this could be a discriminated union for type safety: `{ type: 'field_errors', errors } | { type: 'server_error', message } | { type: 'success', message }`.
  - The `handleAction` wrapper function in the component bridges between `useActionState`'s `(prevState, formData)` signature and the server action's `ActionResult` return type. This could be extracted as a utility function shared across forms if more forms are added.
  - `loginSchema` and `registerSchema` could share a base schema to avoid field duplication — currently both define `email: z.string().email()` and `password: z.string().min(...)` separately.
EXIT: User is either: (a) redirected to "/" on successful auth (form unmounts), (b) shown server error banner + re-enabled fields on auth failure, (c) shown field-level Zod errors without server round-trip on validation failure, or (d) shown success message for email confirmation required. All states managed via `useActionState` — no external state store, no manual transition handling.
