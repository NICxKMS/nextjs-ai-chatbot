FLOW: User Data
ENTRY: Auth flows (login, register, guest bootstrap), direct user lookups
STEPS:

  ## CREATE — Registered User
  1. Auth feature (login/register flows) → `createUser(data: NewUser)` in `lib/data/user.ts`
  2. `db.insert(users).values(data).returning()` → single INSERT, returns full `User` row
  3. `requireDatabaseRow(user, "Failed to create user")` → ensures INSERT returned a row
  4. No cache involvement — user data is never cached with `'use cache'`

  ## CREATE — Guest User (bootstrap)
  1. `resolveChatRouteContext()` in `chat-route.ts` → when `isNewChat && session.user.type === 'guest'`
  2. `ensureGuestUser(userId)` in `lib/data/user.ts`:
     - `db.insert(users).values({ id: userId }).onConflictDoNothing({ target: users.id })`
     - Uses `ON CONFLICT DO NOTHING` — idempotent, safe for concurrent requests
     - No `.returning()` — void return, fire-and-forget style
  3. Guest user has: `id` (from JWT), no `email`, no `passwordHash`
  4. Called on EVERY new chat creation by a guest — the `ON CONFLICT DO NOTHING` ensures this is cheap

  ## READ — By ID
  1. `getUserById(id)` in `lib/data/user.ts`
  2. `db.select().from(users).where(eq(users.id, id)).limit(1)` → `User | null`
  3. No cache wrapper — fresh DB lookup each time
  4. Not directly called in the traced flows — session resolution uses Supabase SDK, not this function

  ## READ — By Email
  1. `getUserByEmail(email)` in `lib/data/user.ts`
  2. `db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)` → `User | null`
  3. Email is lowercased before lookup — consistent with storage
  4. **@unused** — Auth uses Supabase SDK for email lookup. Retained for direct DB email scenarios.

  ## UPDATE — Last Login
  1. `updateUserLastLogin(id)` in `lib/data/user.ts`
  2. `db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, id))`
  3. **@unused** — Login flow does not yet track last login. Retained for future session tracking.

  ## TRANSFER — Guest to Authenticated
  1. `transferGuestChats(fromUserId, toUserId)` in `lib/data/chat.ts`
  2. `db.update(chats).set({ userId: toUserId, updatedAt: new Date() }).where(eq(chats.userId, fromUserId)).returning({ id: chats.id })`
  3. Returns count of transferred chats
  4. **Best-effort** — callers should catch errors and not fail auth flows
  5. This transfers CHATS, not the user record itself. The guest user row remains orphaned.

  ## SESSION RESOLUTION (not in lib/data, but critical context)
  1. `getAppSession()` in `lib/auth/session.ts` — wrapped in `React.cache` (request-scoped)
  2. Pipeline: `resolveSupabaseSession()` → if null → `resolveGuestSession()` → if null → return null
  3. Supabase session: `supabase.auth.getUser()` → extracts `id`, `email`, sets `type: 'authenticated'`
  4. Guest session: reads `guest_token` cookie → `verifyGuestToken(jwt)` → extracts `userId`, sets `type: 'guest'`
  5. Never throws — returns null on any error
  6. `React.cache` ensures: within one server request, `getAppSession()` is called at most once

BOTTLENECKS:
  - `getAppSession()` is called on EVERY authenticated operation (page load, API route, Server Action).
    `React.cache` memoizes within a request, but the Supabase `getUser()` call still happens once per
    request (involves JWT verification + possible Supabase API call).
  - `ensureGuestUser` is called on every new guest chat — `ON CONFLICT DO NOTHING` makes it fast but
    it's still a DB round-trip that could be skipped if we tracked "guest row exists" in the session.

WASTE:
  - `getUserByEmail` and `updateUserLastLogin` are unused but remain in the codebase. They're small
    utility functions with no cost when unused.
  - `getUserById` is defined but not called in any traced flow. The session system uses Supabase SDK
    for user lookup, bypassing the Drizzle-based user query entirely.
  - Guest user rows created via `ensureGuestUser` are never cleaned up. Over time, the `User` table
    accumulates orphaned guest records with no email or password.

SIMPLIFICATION OPPORTUNITIES:
  - `ensureGuestUser` could be called once during guest token creation (in the auth flow) rather than
    on every new chat. This would eliminate the per-chat DB round-trip for guest users.
  - Consider a cleanup job for orphaned guest user rows (no email, no chats, old `createdAt`).
  - `transferGuestChats` only transfers chats but leaves the guest user row. Consider deleting the
    guest user row after transfer to prevent orphan accumulation.

EXIT: User objects are used as session context (AppSession) throughout all authenticated operations. User rows exist in the DB but are rarely queried directly — Supabase handles auth.
