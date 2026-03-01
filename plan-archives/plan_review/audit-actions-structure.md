# Audit: Server Actions & Structural Integrity

> **Auditor**: Backend Engineer (Architecture Audit)  
> **Date**: 2026-02-28  
> **Scope**: Sections VII–VIII of the rebuild plan  
> **Methodology**: Cross-referenced Next.js 16 docs (`.next-docs/`), plan files (`plan/architecture/`, `plan/integration_map/`, `plan/behavioral_extraction/`, `plan/scaffold/`), old app source (`oldapp/`), and prior audits (`plan_review/audit-rsc-fetching-state.md`, `plan_review/audit-coupling-props-perf.md`)

---

## VII. Server Actions & Mutation Flow

### Finding VII-1: No Revalidation After Mutations — RSC Data Becomes Stale

**What the plan proposes** (from `patterns.md` §2, `data-flow-chains-01.md` Flow 13, `seam-inventory.md` SEAM-022):

All mutations follow the pattern: Server Action (or Route Handler) → DB write → Redis cache update → return result. The client then uses SWR optimistic updates to reflect the change immediately.

Examples from the plan:
- **Visibility toggle** (`updateChatVisibility`): DB UPDATE + cache update → client does `mutate(\`${chatId}-visibility\`, type, false)`. No `revalidatePath` or `revalidateTag`.
- **Delete chat**: DB DELETE + cache delete → client removes from SWR paginated cache. No revalidation.
- **Save message** (`onFinish`): `saveChat()` → DB INSERT + cache update. No revalidation.
- **Vote**: DB upsert → client SWR optimistic mutate. No revalidation.
- **Title update**: DB UPDATE + cache update → client window event + polling. No revalidation.

**What the problem is**:

Next.js 16 has **four** cache layers: Request Memoization, Data Cache, Full Route Cache, and Client-side Router Cache. The plan addresses only Redis (custom Data Cache) and SWR (custom client cache). It **completely ignores** the Router Cache and Full Route Cache.

Per the Next.js 16 docs on caching:
> In a **Server Action**: Revalidating data on-demand by path with `revalidatePath` or by cache tag with `revalidateTag` [...] Using `cookies.set` or `cookies.delete` invalidates the Router Cache.

When a Server Action does NOT call `revalidatePath`/`revalidateTag`/`updateTag`:
1. The **Router Cache** retains stale RSC payloads for previously visited routes
2. If the user navigates back to a page fetched via server component (`/chat/[id]`), they get **stale server data** from the Router Cache until it expires (5 minutes for static, per-request for dynamic)
3. If any future refactoring moves sidebar data to server-side fetching (as recommended by prior audit Finding II-1), the sidebar will show **stale chat lists** after mutations

Currently the plan is protected by coincidence: everything is fetched client-side via SWR, so the Router Cache staleness doesn't manifest. But this is **fragile by design** — the moment any data moves to server components (as the prior audit recommends), mutations silently become stale.

Furthermore, Next.js 16 introduces `updateTag` specifically for Server Actions with read-your-own-writes semantics:
> `updateTag` immediately expires the cached data for the specified tag. The next request will wait to fetch fresh data rather than serving stale content from the cache, ensuring users see their changes immediately.

The plan makes no mention of `updateTag` anywhere.

**Severity**: **CRITICAL**

**Concrete fix**: Every server action and route handler mutation must call the appropriate revalidation primitive:

```typescript
// features/chat/actions/update-visibility.ts
'use server'

import { updateTag } from 'next/cache'

export async function updateChatVisibility({ chatId, visibility }) {
  const session = await getAppSession()
  // ... auth, validate, DB update, cache update ...
  
  // Revalidate: ensures Router Cache + any RSC data is fresh
  updateTag(`chat:${chatId}`)       // Invalidate individual chat data
  updateTag(`chats:${session.user.id}`)  // Invalidate chat list
}
```

Create a revalidation utility:
```typescript
// lib/cache/revalidate.ts
import { updateTag } from 'next/cache'

export function revalidateChat(chatId: string, userId: string) {
  updateTag(`chat:${chatId}`)
  updateTag(`chats:${userId}`)
}

export function revalidateArtifact(documentId: string) {
  updateTag(`document:${documentId}`)
}
```

Apply to ALL mutations:
| Mutation | Revalidation Needed |
|----------|-------------------|
| `updateChatVisibility` | `updateTag('chat:{id}')` + `updateTag('chats:{userId}')` |
| `deleteChat` | `updateTag('chats:{userId}')` |
| `deleteAllChats` | `updateTag('chats:{userId}')` |
| `saveChat` (onFinish) | `revalidateTag('chats:{userId}', 'max')` (in route handler) |
| `updateChatTitle` | `updateTag('chat:{id}')` + `updateTag('chats:{userId}')` |
| Vote (route handler) | `revalidateTag('votes:{chatId}', 'max')` |
| Save document version | `updateTag('document:{id}')` |

Note: Use `updateTag` in Server Actions (read-your-own-writes). Use `revalidateTag(tag, 'max')` in Route Handlers (stale-while-revalidate).

---

### Finding VII-2: Mutation → UI Update Flow Has No Unified Pattern

**What the plan proposes** (from `api-integration.md` §2, `data-flow-chains` Flows 10, 13):

Three different mutation-to-UI patterns exist:

1. **SWR Optimistic Mutate** (visibility, votes): `mutate(key, optimisticValue, false)` → server action → rollback on failure
2. **SWR Cache Manipulation** (delete chat): Filter out from paginated cache → redirect
3. **Context + Polling** (title): Stream part → context update → 3x polling → window event → SWR revalidate

**What the problem is**: No standard pattern exists. Each mutation uses a different update mechanism. A developer adding a new mutation must decide between three approaches with no decision framework.

Worse, the title update flow uses **four** mechanisms simultaneously: data stream part, context update, 3x polling, and window event dispatch. This was identified in prior audit Finding III-2 as architecturally fragile, but the plan has not consolidated the approach.

**Severity**: **HIGH**

**Concrete fix**: Standardize on a two-tier pattern:

**Tier 1 — Server Action mutations (visibility, delete, save):**
```
1. Client: optimistic update (useOptimistic or SWR mutate)
2. Server Action: validate → execute → updateTag/revalidateTag
3. Success: optimistic update confirmed by revalidation
4. Failure: rollback optimistic + show toast
```

**Tier 2 — Streaming mutations (title, messages, artifacts):**
```
1. Server: write data part to stream (guaranteed before stream close)
2. Client: useChat.onData processes part → updates state
3. No polling, no window events, no fallbacks
```

Eliminate the title polling pattern entirely by ensuring the server awaits title generation before closing the stream (as recommended in prior audit Finding III-2).

---

### Finding VII-3: Redundant Re-fetches After Mutations

**What the plan proposes** (from `data-flow-chains-01.md` Flow 10, `api-integration.md` §7):

- **Vote**: Optimistic SWR update + PATCH → server confirms. The optimistic update mutates the local vote within the cached array. ✓ Efficient.
- **Delete chat**: Optimistic removal from SWR paginated cache + DELETE → redirect. ✓ Efficient.
- **Title update**: Stream part → context update → **poll `/api/chat?id=` 5 times at 500ms intervals** → window event → SWR sidebar revalidation (full page refetch). ✗ Wildly inefficient.

**What the problem is**: The title polling pattern makes 5 GET requests to confirm a title that was already delivered via the stream. Then it triggers a full SWR sidebar revalidation, which refetches the **entire first page** of chat history.

From `api-integration.md` §7:
```typescript
async function pollForTitle(chatId: string, maxAttempts = 5) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 500));
    const res = await fetch(`/api/chat?id=${chatId}`);
    // ...
  }
}
```

This generates 5 unnecessary HTTP requests, each requiring auth resolution, DB/cache lookup, and response serialization.

**Severity**: **MEDIUM**

**Concrete fix**:
1. Ensure server awaits title generation before emitting `data-finish`:
   ```typescript
   // stream-chat.ts
   const titlePromise = generateTitle(message)
   // ... stream main content ...
   const title = await titlePromise // wait before closing
   dataStream.writeData({ type: 'data-chatTitle', content: title })
   // then close stream
   ```
2. Remove `pollForTitle()` entirely
3. Remove `window.dispatchEvent('chat-title-updated')` entirely
4. Title arrives via stream → `updateOptimisticChat()` → sidebar shows title. No polling needed.

---

### Finding VII-4: Stream Interruption Causes Silent Data Loss

**What the plan proposes** (from `data-flow-chains-01.md` Flow 1, `api-contracts.md` POST `/api/chat`):

Messages are persisted in `onFinish`:
```
onFinish:
  ├── saveChat() → DB + cache
  ├── incrementQuota() → Redis
  └── updateChatTitle() → DB + cache (async)
```

The server uses `AbortSignal.timeout(55_000)` for AI completion, and the route has `maxDuration: 60`.

**What the problem is**: 

1. **User navigates away**: `useChat`'s AbortController fires `abort()`, the SSE connection drops, the server stream is aborted. `onFinish` **does not fire for aborted streams** (Vercel AI SDK behavior). Result: user message was saved before streaming, but the **assistant response is lost entirely**. The chat now has a dangling user message with no response.

2. **Server timeout (55s)**: `AbortSignal.timeout` aborts the AI completion. Same result: partial/no assistant message persisted.

3. **Network interruption**: Connection drops mid-stream. Server may continue generating but can't deliver. `onFinish` fires on server but user never receives the content. The message is saved to DB but the client has an incomplete view.

4. **No recovery mechanism**: The plan mentions SSE reconnect (`/api/chat/[id]/reconnect/route.ts`) but this is for resuming display of an in-progress stream, not for recovering lost messages from interrupted streams.

**Severity**: **HIGH**

**Concrete fix**:

1. **Save user message immediately** (already done — good).

2. **Implement `onAbort` handler** alongside `onFinish`:
   ```typescript
   // stream-chat.ts
   const abortController = new AbortController()
   const combinedSignal = AbortSignal.any([
     AbortSignal.timeout(55_000),
     request.signal  // client disconnect
   ])
   
   combinedSignal.addEventListener('abort', async () => {
     // Save partial response if we have accumulated tokens
     if (accumulatedTokens.length > 0) {
       await savePartialMessage(chatId, accumulatedTokens, userId)
     }
   })
   ```

3. **Track accumulated tokens in the stream** via a TransformStream that tees content:
   ```typescript
   let accumulatedContent = ''
   const trackingTransform = new TransformStream({
     transform(chunk, controller) {
       if (chunk.type === 'text-delta') {
         accumulatedContent += chunk.textDelta
       }
       controller.enqueue(chunk)
     }
   })
   ```

4. **On chat page load, detect orphaned user messages** — if the last message is from the user with no assistant response, prompt for re-send or show a "response interrupted" indicator.

---

### Finding VII-5: Vote as Route Handler vs Server Action — Suboptimal Choice

**What the plan proposes** (from `conventions.md` §1, `api-contracts.md`, `data-flow-chains-02.md` Flow 10):

Vote is implemented as `PATCH /api/vote` route handler, called via `fetch()` from `MessageActions` with SWR optimistic mutation.

**What the problem is**: Per the plan's own decision tree (`improvements.md` §6.2):

```
Is it a data mutation triggered by user interaction?
├── YES → Server Action
```

Voting is a data mutation triggered by a user clicking a button. It should be a Server Action:
- It would benefit from `updateTag` (read-your-own-writes) — currently impossible in Route Handlers
- It works with `useOptimistic` (React 19) for optimistic updates
- It's simpler: no manual `fetch()`, no JSON parsing, no error response formatting
- Progressive enhancement: votes could work without JS via form submission

The decision tree says Route Handlers are for: SSE streams, paginated GETs, file upload, health checks, external access. Voting is none of these.

**Severity**: **MEDIUM**

**Concrete fix**: Convert to Server Action:

```typescript
// features/voting/actions/vote.ts
'use server'

import { z } from 'zod'
import { getAppSession } from '@/features/auth/lib/session'
import { updateTag } from 'next/cache'
import { AppError } from '@/lib/errors'

const voteSchema = z.object({
  chatId: z.string().uuid(),
  messageId: z.string().uuid(),
  type: z.enum(['up', 'down']),
})

export async function voteOnMessage(input: z.infer<typeof voteSchema>) {
  const session = await getAppSession()
  if (!session) throw AppError.unauthorized()
  if (session.user.type === 'guest') throw AppError.forbidden('Guests cannot vote')

  const validated = voteSchema.parse(input)
  
  // Ownership + membership checks...
  await upsertVote(validated)
  
  updateTag(`votes:${validated.chatId}`)
  return { success: true }
}
```

Remove `app/api/vote/route.ts`. Use `useOptimistic` or `useActionState` in `MessageActions` for optimistic UI.

---

### Finding VII-6: Visibility Toggle — Correct Pattern But Missing Revalidation

**What the plan proposes** (from `data-flow-chains-02.md` Flow 13, `seam-inventory.md` SEAM-022):

Visibility toggle is a Server Action (`updateChatVisibility`) called via `useChatVisibility` hook with SWR optimistic mutation.

**What the problem is**: The pattern is correct for a Server Action mutation. However:
1. No `updateTag` call after the DB update — if the chat page is ever served from a server component cache, it will show stale visibility
2. The SWR optimistic pattern (`mutate(key, value, false)`) disables revalidation (`false` = don't revalidate). This means the SWR cache is only updated client-side; any other tab or session will show stale data until they independently fetch.

**Severity**: **MEDIUM**

**Concrete fix**: Add `updateTag` to the server action (see Finding VII-1 fix). The SWR optimistic pattern is fine for same-tab UX, but revalidation ensures cross-tab consistency and future server-component compatibility.

---

### Finding VII-7: Server Action Error Propagation is Under-Specified

**What the plan proposes** (from `patterns.md` §2, `errors/app-error.ts`, `api-contracts.md`):

Server Actions throw `AppError`. Route Handlers catch `AppError` and call `.toResponse()`. The plan states:
```
❌ No `try/catch` wrapping — let errors propagate to error boundaries
```

**What the problem is**: When a Server Action throws, React's behavior depends on the context:

1. **Called via `useActionState` (form action)**: The thrown error propagates to the nearest error boundary (`error.tsx`). The error boundary renders a fallback UI. The user sees a generic error page — they **lose the form state** and must start over.

2. **Called directly (non-form, e.g., `await voteOnMessage(...)`)**: The thrown error propagates to the client component that called it. If uncaught, it propagates to the error boundary. If caught (`try/catch`), the client can handle it.

3. **Security concern**: In production, thrown server errors are **sanitized** by React. The client receives `"An error occurred in the Server Components render"` — NOT the original `AppError` message. The detailed error code and message are stripped for security.

This means:
- `AppError.unauthorized("Not chat owner")` thrown in a Server Action → client receives a **generic error**, not the structured `{ code, message, status }` format
- The `onError` handler in `useChat` parses `ChatSDKError` from the response body — this only works for **Route Handlers** that return JSON responses, not for Server Actions that throw

**Severity**: **HIGH**

**Concrete fix**: Use two different error strategies:

**For Server Actions** — Return error result objects instead of throwing:
```typescript
// features/voting/actions/vote.ts
'use server'

type ActionResult<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } }

export async function voteOnMessage(input: unknown): Promise<ActionResult<{ messageId: string }>> {
  try {
    const session = await getAppSession()
    if (!session) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Login required' } }
    // ...
    return { success: true, data: { messageId: validated.messageId } }
  } catch (e) {
    if (e instanceof AppError) {
      return { success: false, error: { code: e.code, message: e.message } }
    }
    throw e // Re-throw unexpected errors to error boundary
  }
}
```

**For Route Handlers** — Keep the current `.toResponse()` pattern, which returns JSON that clients can parse.

**For `useActionState` (forms)** — Use the `initialState` + return value pattern per Next.js 16 docs:
```typescript
export async function loginAction(prevState: any, formData: FormData) {
  const result = loginSchema.safeParse(Object.fromEntries(formData))
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors }
  }
  // ... login logic
  return { success: true }
}
```

---

### Finding VII-8: Auth Form Progressive Enhancement — Correct Pattern, But Supabase Client-Side Auth Undermines It

**What the plan proposes** (from `data-flow-chains-01.md` Flow 6):

```
AuthForm.action() — form action handler
├── Client: supabase.auth.signInWithPassword({ email, password })
├── Supabase returns session with access_token
├── POST /api/auth/exchange { accessToken }
```

**What the problem is**: The plan uses `next/form` with a Server Action for progressive enhancement, but the actual auth flow calls `supabase.auth.signInWithPassword()` **client-side**. This means:

1. **Without JavaScript**: The form submits to a Server Action. But the Supabase JS client call (`supabase.auth.signInWithPassword()`) cannot execute without JS. The server action receives form data but has no auth flow that works without the client-side Supabase call.

2. **Progressive enhancement is broken**: The `<form action>` pattern enables no-JS form submission only if the server action can process the entire flow. Currently, the server action depends on the client having already obtained a Supabase access token.

**Severity**: **MEDIUM** (auth without JS is an edge case, but the plan claims progressive enhancement)

**Concrete fix**: Either:

**Option A (honest)**: Drop the progressive enhancement claim. The auth flow requires JS for the Supabase client. Use a simple `onSubmit` handler instead of `<form action>`.

**Option B (progressive enhancement)**: Implement server-side auth directly:
```typescript
// features/auth/actions/login.ts
'use server'

import { createClient } from '@supabase/supabase-js'

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  
  if (error) return { error: error.message }
  
  // Set cookie server-side
  cookies().set('sb_token', data.session.access_token, { httpOnly: true, secure: true, maxAge: 604800 })
  redirect('/')
}
```

This makes the form work with or without JavaScript. Option B is recommended if progressive enhancement is a genuine requirement.

---

## VIII. Structural & Codebase Integrity

### Finding VIII-1: "document" vs "artifact" Naming Inconsistency is Pervasive

**What the plan proposes**: The plan's preamble, feature directory, component names, and user-facing terminology all use "artifact":
- Feature directory: `features/artifacts/`
- Components: `artifact-panel.tsx`, `artifact-actions.tsx`, `artifact-close.tsx`, `artifact-error-boundary.tsx`
- Types: `UIArtifact`, `ArtifactKind`, `ArtifactDefinition`
- Hooks: `useArtifact`, `useArtifactSelector`

But the data layer, AI tools, database schema, and API routes all use "document":
- Data file: `lib/data/document.ts`
- Database table: `Document` (composite PK: id, createdAt)
- Database enum: `document_kind`
- AI tools: `createDocument`, `updateDocument`
- API route: `/api/document` (GET/POST/DELETE)
- Handler factory: `documentHandlersByArtifactKind` (mixed naming!)
- Data functions: `documentData.get()`, `documentData.save()`
- Document handler directory: `features/artifacts/handlers/` (artifact feature, document handler)
- Component: `document-preview.tsx` (inside `features/artifacts/components/`)
- Suggestions API: `documentId`, `documentCreatedAt` fields

**What the problem is**: The codebase uses two terms for the same concept, creating cognitive overhead:

1. **Developers must mentally map** "document" ↔ "artifact" depending on which layer they're in
2. **Search is unreliable** — searching for "artifact" misses data layer code; searching for "document" misses UI code
3. **The handler has both names**: `documentHandlersByArtifactKind` — literally both terms in one identifier
4. **AI tool names visible to users/LLMs**: The tools are named `createDocument`/`updateDocument` — the AI model sees "document", users see "artifact"
5. **New developers** will be confused about whether these are different concepts or the same thing

**Severity**: **HIGH**

**Concrete fix**: See "document" → "artifact" Rename Inventory below.

---

### Finding VIII-2: Credit Card / AI Gateway Logic Persists in the Plan

**What the plan proposes** (from `data-flow-chains-01.md` Flow 1, `data-flow-chains-02.md` Flow 2, `traceability/uncovered-features.md`, `api-contracts.md`, `seam-inventory.md` SEAM-028):

Multiple references to credit/usage/gateway logic:

1. **`data-usage` stream part** (`data-flow-chains-02.md` Flow 2):
   ```
   onData: data-usage → setUsage(mergedUsage)
   ```

2. **Credit depletion AlertDialog** (`traceability/uncovered-features.md` §3):
   > When `data-usage` stream part indicates credit depletion, the chat orchestrator renders a non-dismissable `AlertDialog` overlay warning the user.

3. **Entitlements check** (`data-flow-chains-01.md` Flow 1):
   ```
   entitlements check (20/day guest, 100/day auth)
   ```

4. **`incrementQuota()`** in onFinish (`data-flow-chains-01.md` Flow 1):
   ```
   onFinish:
     ├── incrementQuota() → Redis
   ```

5. **Error code** (`api-contracts.md`):
   ```
   rate_limit:chat:daily_limit_exceeded → 429
   ```

6. **`activate_gateway`** error handling (`seam-inventory.md` SEAM-028):
   > Error classification (ChatSDKError parsing, gateway credit card detection)

7. **`lastContext` field** on Chat table (`data-flows.md`):
   ```
   Chat.lastContext (jsonb) — usage data
   ```

8. **Usage state** in DataStreamHandler:
   ```
   data-usage → setUsage(usage)
   ```

9. **Vercel Gateway** as provider (`p03-chat-core.md` P03-T01):
   ```
   vercel-gateway (gateway with all keys)
   ```

**What the problem is**: The user explicitly requested removal of credit card / AI Gateway logic. However:
- The daily quota system (20 guest / 100 auth) may be a **rate limiting** feature, not a credit card feature. Need clarification.
- The `data-usage` stream part tracks token usage for display — this may be useful for user awareness
- The `activate_gateway` error code is specifically gateway/credit card logic — should be removed
- The non-dismissable AlertDialog for credit depletion is credit card UX — should be removed
- `vercel-gateway` provider is gateway-specific — should be removed unless it's independent of credit cards

**Severity**: **HIGH**

**Concrete fix**: See Credit/Gateway Logic Removal Inventory below.

---

### Finding VIII-3: Circular Import Risk in Chat → Artifacts → DataStream

**What the plan proposes** (from `seam-inventory.md` SEAM-009/010, `conventions.md` §3):

The dependency chain:
```
features/chat/lib/tools/create-document.ts
  → imports documentHandlersByArtifactKind from features/artifacts/handlers/
  → artifact handlers write to dataStream (features/chat/components/data-stream-provider)
  → DataStreamHandler reads dataStream → updates useArtifact (features/artifacts/hooks/)
```

More specifically:
```
chat → (imports) → artifacts/handlers
artifacts/handlers → (writes to) → dataStream (chat's concept)
chat/DataStreamHandler → (reads) → dataStream → (mutates) → artifacts/hooks/useArtifact
```

**What the problem is**: While not a TypeScript import cycle (the runtime dataStream is passed as a parameter, not imported), there's a **conceptual circular dependency**:

- Chat depends on artifacts for handler execution
- Artifacts depend on chat for the dataStream write mechanism
- Chat depends on artifacts for useArtifact state that DataStreamHandler mutates

The `dataStream` parameter injection avoids a compile-time cycle, but the tight bidirectional dependency means:
1. You cannot understand chat tools without understanding artifact handlers
2. You cannot understand artifact handlers without understanding the dataStream protocol (owned by chat)
3. Testing either feature in isolation requires mocking the other's internals

Prior audit Finding IV-1 identified this and proposed a handler registry in `lib/`. That addresses the import direction but not the conceptual coupling.

**Severity**: **HIGH**

**Concrete fix** (extends prior audit IV-1 recommendation):

1. **Handler registry in `lib/ai/document-handlers.ts`** — Chat imports the interface, artifacts register implementations (already recommended)

2. **DataStream write protocol as a shared interface**:
   ```typescript
   // lib/types/data-stream.types.ts
   export interface ArtifactStreamWriter {
     writeId(id: string): void
     writeTitle(title: string): void
     writeKind(kind: ArtifactKind): void
     writeClear(): void
     writeContentDelta(type: string, data: string): void
     writeFinish(): void
   }
   ```
   Artifact handlers receive this interface, not the raw dataStream. Chat creates an adapter that implements `ArtifactStreamWriter` using the actual dataStream.

3. **Result**: Chat depends on `lib/types/` and `lib/ai/`. Artifacts depend on `lib/types/` and `lib/ai/`. Neither depends on the other directly. The integration happens at the route handler level where both are composed.

---

### Finding VIII-4: Module Boundaries Are Clean in Theory, Violated in Practice

**What the plan proposes** (from `conventions.md` §3):

```
app/ → features/, components/, lib/
features/ → components/, lib/, other features (data/types only)
components/ → lib/
lib/ → nothing above
```

**What the plan actually does**:

| Violation | Source | Target | Type |
|-----------|--------|--------|------|
| `components/app-shell.tsx` | `components/` | `features/auth/lib/session.ts` | Direct import across boundary |
| `features/chat/lib/tools/create-document.ts` | `features/chat/` | `features/artifacts/handlers/` | Implementation import, not types/schemas |
| `features/chat/lib/tools/update-document.ts` | `features/chat/` | `features/artifacts/handlers/` | Implementation import, not types/schemas |
| `features/chat/lib/tools/suggestions.ts` | `features/chat/` | `features/artifacts/` (document data) | Data access import |
| `features/chat/components/data-stream-handler.tsx` | `features/chat/` | `features/artifacts/hooks/use-artifact.ts` | Hook import across boundary |

5 violations of the declared import rules. The convention says "data types and schemas ONLY" for cross-feature imports, but the tool files import implementation handlers and the DataStreamHandler imports a feature-specific hook.

**Severity**: **MEDIUM** (the rules exist but are not consistently enforced by the plan itself)

**Concrete fix**:

1. **`app-shell.tsx`**: Move `getAppSession()` to `lib/auth/` (it's infrastructure, not feature logic). Or move `app-shell.tsx` to `app/` as layout plumbing (recommended by prior audit IV-4).

2. **Tool files**: Use handler registry pattern (Finding VIII-3 fix).

3. **DataStreamHandler → useArtifact**: Instead of DataStreamHandler importing from artifacts, have it publish to a shared event bus or call a callback provided by the parent:
   ```typescript
   // DataStreamHandler receives setArtifact as a prop or from a shared interface
   // rather than importing useArtifact directly
   ```

4. **Enforce via lint script**: The plan mentions a ~50-line script (`improvements.md` §8). This script should block the above violations. But it must run in CI, not just optionally. Add to `pnpm lint`:
   ```json
   "lint": "biome lint && node scripts/check-imports.mjs"
   ```

---

### Finding VIII-5: Test Coverage Plan is Inadequate for Server-Side Code

**What the plan proposes** (from `plan/scaffold/directory-structure.md`, phase files):

```
tests/
├── setup.ts
├── mocks/
├── fixtures/
├── integration/
└── e2e/
```

Conventions say colocated unit tests (`.test.ts` alongside source). Phase files mention "pnpm typecheck passes" and "pnpm test:unit" but specific test files are never listed.

**What the problem is**:

1. **Server Action testing**: No plan for how to test Server Actions. Server Actions run in a server context with access to headers, cookies, DB. Testing them requires mocking:
   - `getAppSession()` (auth)
   - Database client (Drizzle)
   - Cache client (Redis)
   - `updateTag`/`revalidatePath` (Next.js cache)
   - `cookies()` (Next.js headers)
   
   None of these mocking patterns are specified.

2. **Stream testing**: The SSE streaming pipeline (`createUIMessageStream` → `executeChatCompletion` → `JsonToSseTransformStream`) is the most complex code in the system. No streaming test utilities are planned.

3. **Cross-feature integration testing**: `tests/integration/` exists as a directory but no test files are specified. The highest-risk integration point (chat → artifact handler → data persistence) has no test plan.

4. **Data layer testing**: Each `lib/data/` function has guest/auth branching, cache-through logic, and error handling. ~15 functions × 2 paths × 3 scenarios (cache hit, cache miss, cache error) = ~90 test cases. No test plan.

**Severity**: **HIGH**

**Concrete fix**:

1. **Add test utilities to the scaffold phase**:
   ```typescript
   // tests/mocks/auth.ts
   export function mockSession(overrides?: Partial<AppSession>): AppSession { ... }
   export function mockGuestSession(): AppSession { ... }
   export function mockNoSession(): null { return null }
   
   // tests/mocks/db.ts
   export function createTestDb(): MockDrizzle { ... }
   
   // tests/mocks/cache.ts
   export function createTestCache(): MockRedis { ... }
   ```

2. **Specify minimum test requirements per phase**:
   - P01 (Data Foundation): Unit tests for all `lib/data/` functions (guest + auth paths)
   - P02 (Auth): Integration tests for auth exchange, guest bootstrap, session resolution
   - P03 (Chat Core): Stream tests — verify SSE output for tool calls, text deltas, error cases
   - P04 (Artifacts): Handler tests — verify each handler produces correct data parts
   
3. **Add a stream test utility**:
   ```typescript
   // tests/utils/stream.ts
   export async function collectStreamEvents(response: Response): Promise<SSEEvent[]> {
     const reader = response.body!.getReader()
     const events: SSEEvent[] = []
     // ... read and parse SSE events
     return events
   }
   ```

---

### Finding VIII-6: `withCache<T>()` and Cache Key Factory — Evaluated as Appropriate

**What the plan proposes** (from `patterns.md` §1, `architecture/improvements.md` §2):

```typescript
// lib/cache/with-cache.ts
export async function withCache<T>(key: string, ttl: number, fetcher: () => Promise<T | null>): Promise<T | null> {
  const cached = await cache.get<T>(key)
  if (cached) return cached
  const result = await fetcher()
  if (result) await cache.set(key, result, { ex: ttl })
  return result
}

// lib/cache/keys.ts
export const cacheKeys = {
  chat: (id: string) => `chat:${id}`,
  userChats: (userId: string) => `user:${userId}:chats`,
  // ... ~10 keys
}
```

**What the problem is**: The question is whether these are unnecessary abstractions.

- **`withCache<T>()`**: Used by ~10 data access functions that all follow the identical pattern: cache check → miss → fetch → warm cache. Without it, each function repeats 8 lines of try/catch/cache logic. The helper is justified — it reduces ~80 lines of duplicated error-handled cache logic to ~10 one-line calls.

- **Cache key factory**: With ~10 keys containing template literals (`chat:${id}:${userId}:meta`, `user:${userId}:chats`, etc.), centralizing them prevents typos and enables key discovery. Justified for maintainability.

- **`DataContext`**: Carries `userId` and `isGuest` to every data function. Without it, each function would take `(userId: string, isGuest: boolean)` as two params — `DataContext` is marginally cleaner but not strictly necessary. It becomes more justified if more context fields are added later (e.g., `permissions`).

**Severity**: **LOW**

**Recommendation**: Keep `withCache` and `cacheKeys`. For `DataContext`, keep it but document that it's a transport type, not a domain entity. Don't add fields unless genuinely needed.

---

### Finding VIII-7: DataStreamHandler and window.dispatchEvent Are Untestable in Isolation

**What the plan proposes** (from `component-wiring.md` §7, prior audit IV-7):

1. **DataStreamHandler**: A null-rendering component with a `useEffect` that reads from `DataStreamProvider` context, processes deltas, and writes to `useArtifact` SWR state. Testing requires setting up: DataStreamProvider, SWR config, artifact SWR state, and rendering the component — a full integration test for what is essentially business logic.

2. **`window.dispatchEvent('chat-title-updated')`**: Cross-component communication via global events. Testing requires mocking the window event system, setting up event listeners, and verifying event dispatches across component boundaries.

3. **Title polling (`pollForTitle`)**: 5 sequential setTimeout calls with fetch mocks. Testing requires controlling timers and network mocks simultaneously.

**What the problem is**: These patterns invert the testability pyramid — the most critical business logic (stream delta processing, cross-feature communication) is the hardest to test.

**Severity**: **MEDIUM** (already identified in prior audit IV-7, but the plan has not addressed it)

**Concrete fix**:

1. **Extract `processStreamDelta()` as a pure function** (per prior audit IV-7 recommendation):
   ```typescript
   // features/chat/lib/process-stream-deltas.ts — PURE, no React
   export function processStreamDelta(delta, currentArtifact, definition): ArtifactUpdate { ... }
   ```
   Unit test with zero React overhead.

2. **Remove window.dispatchEvent** entirely (per Finding VII-3 fix).

3. **Remove pollForTitle** entirely (per Finding VII-3 fix).

4. **DataStreamHandler becomes a 15-line bridge** that calls the pure function — integration test only, no business logic to unit test.

---

### Finding VIII-8: Import Boundary Enforcement — Script is Insufficient

**What the plan proposes** (from `improvements.md` §8):

> A ~50-line script checking import patterns in CI is simple, effective, and tool-agnostic.

**What the problem is**:

1. **CI-only enforcement**: Developers don't see violations until CI runs. By then, they've built features on top of the violation. The feedback loop is too slow.

2. **50 lines is optimistic**: Handling dynamic imports, re-exports, barrel files, type-only imports, and path alias resolution in 50 lines is unrealistic. Real import checkers are 200-500 lines.

3. **No editor integration**: Biome provides inline errors in VS Code. A custom script doesn't. Developers working in their editor have no visibility into import violations.

4. **Biome does support `noRestrictedImports`** (added as `nursery` rule): Check Biome's current docs; if available, use it directly instead of a custom script.

**Severity**: **MEDIUM**

**Concrete fix**:

1. **Check if Biome supports `noRestrictedImports`** — if so, configure it in `biome.json` with layer-specific rules. This gives inline editor feedback.

2. **If not available in Biome**: Use `eslint-plugin-boundaries` alongside Biome. Biome handles formatting/linting, ESLint handles import boundaries. Add to pre-commit hooks, not just CI:
   ```json
   // package.json
   "lint": "biome lint && node scripts/check-imports.mjs",
   "pre-commit": "pnpm lint"
   ```

3. **TypeScript project references** as a passive enforcement: Configure `tsconfig.json` composite projects per feature. This makes cross-boundary type imports fail at `pnpm typecheck` time:
   ```json
   // features/chat/tsconfig.json
   { "references": [{ "path": "../../lib" }, { "path": "../../components" }] }
   // Does NOT reference features/artifacts — imports fail
   ```
   This is the strongest enforcement but highest setup cost.

---

### Finding VIII-9: Legacy Patterns Needlessly Preserved

**What the plan proposes** (from `scaffold/directory-structure.md`, `plan/phases/p00-scaffold.md`):

1. **`proxy.ts`**: The old app uses a proxy pattern for guest token rotation. The plan mentions it in `data-flow-chains-01.md` Flow 7:
   > proxy.ts checks guest_token on every request

2. **`instrumentation.ts` / `instrumentation-client.ts`**: P00-T15 creates "instrumentation stubs". The old app has OpenTelemetry instrumentation.

3. **`chat-model` cookie**: Model selection is stored in a cookie for server-side reading. This is a pattern from the old app where the chat page server component reads the cookie to determine the initial model.

4. **SWR with no fetcher** (`useSWR("artifact", null)`): Using SWR as a client-side state store — a pattern from the old app that should be replaced (per prior audit Finding III-1).

**What the problem is**:

1. **`proxy.ts`**: Next.js 16 middleware can handle guest token rotation. The proxy pattern is a legacy workaround. However, the plan does list `middleware.ts` for rate limiting + auth guard. If middleware handles token rotation, `proxy.ts` is redundant.

2. **Instrumentation stubs**: Creating stub files is fine for future use. No issue — but they should not be copy-pasted from the old app without evaluating whether the OpenTelemetry setup is still relevant.

3. **`chat-model` cookie**: This is a reasonable pattern — cookies are the standard way to pass client preferences to server components. Keep it.

4. **SWR-as-store**: Should migrate to `useSyncExternalStore` (per prior audit III-1). The plan preserves it.

**Severity**: **LOW** (mostly minor, already partially addressed)

**Concrete fix**:
1. Clarify whether `proxy.ts` is needed alongside `middleware.ts`. If middleware handles token rotation, remove `proxy.ts` from the plan.
2. Instrumentation stubs: Keep, but mark as "evaluate post-rebuild" to avoid copying dead patterns.
3. SWR-as-store: Implement prior audit III-1 recommendation during the artifacts phase (P04).

---

## Recommendations Summary

### VII. Server Actions & Mutation Flow

| ID | Finding | Severity | Fix |
|----|---------|----------|-----|
| VII-1 | No revalidation after mutations | CRITICAL | Add `updateTag`/`revalidateTag` to all mutations |
| VII-2 | No unified mutation→UI pattern | HIGH | Standardize two-tier pattern (optimistic + revalidation) |
| VII-3 | Title polling creates 5 redundant requests | MEDIUM | Fix server-side title guarantee, remove polling |
| VII-4 | Stream interruption causes silent data loss | HIGH | Add `onAbort` handler, save partial responses |
| VII-5 | Vote as Route Handler instead of Server Action | MEDIUM | Convert to Server Action with `updateTag` |
| VII-6 | Visibility toggle missing revalidation | MEDIUM | Add `updateTag` to server action |
| VII-7 | Server Action error propagation under-specified | HIGH | Return result objects, not thrown errors |
| VII-8 | Auth form progressive enhancement broken | MEDIUM | Either implement server-side auth or drop PE claim |

### VIII. Structural & Codebase Integrity

| ID | Finding | Severity | Fix |
|----|---------|----------|-----|
| VIII-1 | "document" vs "artifact" naming inconsistency | HIGH | Rename inventory below |
| VIII-2 | Credit/Gateway logic persists in plan | HIGH | Removal inventory below |
| VIII-3 | Circular import risk: chat ↔ artifacts | HIGH | Handler registry + shared stream writer interface |
| VIII-4 | Module boundary violations in plan's own design | MEDIUM | Fix 5 identified violations |
| VIII-5 | Test coverage plan inadequate for server code | HIGH | Add test utilities + per-phase test requirements |
| VIII-6 | withCache, cacheKeys — appropriate abstractions | LOW | Keep as-is |
| VIII-7 | DataStreamHandler + window events untestable | MEDIUM | Extract pure functions, remove window events |
| VIII-8 | Import enforcement via script is insufficient | MEDIUM | Add editor integration (Biome rules or TS project refs) |
| VIII-9 | Legacy patterns (proxy.ts, SWR-as-store) preserved | LOW | Evaluate and remove where middleware covers |

---

## "document" → "artifact" Rename Inventory

### Database Layer
| Current | Proposed | Location |
|---------|----------|----------|
| `Document` table | `Artifact` table | `lib/db/schema.ts` |
| `document_kind` enum | `artifact_kind` enum | `lib/db/schema.ts` |
| `documentId` column (Suggestion table) | `artifactId` | `lib/db/schema.ts` |
| `documentCreatedAt` column | `artifactCreatedAt` | `lib/db/schema.ts` |

### Data Access Layer
| Current | Proposed | Location |
|---------|----------|----------|
| `lib/data/document.ts` | `lib/data/artifact.ts` | File rename |
| `documentData.get()` | `artifactData.get()` | Function rename |
| `documentData.save()` | `artifactData.save()` | Function rename |
| `getDocumentById()` | `getArtifactById()` | Function rename |
| `saveDocumentVersion()` | `saveArtifactVersion()` | Function rename |
| `getDocumentVersions()` | `getArtifactVersions()` | Function rename |
| `appendDocumentVersionToCache()` | `appendArtifactVersionToCache()` | Function rename |

### Cache Keys
| Current | Proposed | Location |
|---------|----------|----------|
| `doc:{docId}:{userId}` | `artifact:{artifactId}:{userId}` | `lib/cache/keys.ts` |

### AI Tools
| Current | Proposed | Location |
|---------|----------|----------|
| `createDocument` (tool name) | `createArtifact` | `features/chat/lib/tools/create-document.ts` → `create-artifact.ts` |
| `updateDocument` (tool name) | `updateArtifact` | `features/chat/lib/tools/update-document.ts` → `update-artifact.ts` |
| `create-document.ts` filename | `create-artifact.ts` | File rename |
| `update-document.ts` filename | `update-artifact.ts` | File rename |

### Handlers
| Current | Proposed | Location |
|---------|----------|----------|
| `documentHandlersByArtifactKind` | `artifactHandlers` (or `artifactHandlersByKind`) | `features/artifacts/handlers/` |
| `DocumentHandler` interface | `ArtifactHandler` | `features/artifacts/handlers/base.ts` |
| `onCreateDocument()` method | `onCreate()` | Handler interface |
| `onUpdateDocument()` method | `onUpdate()` | Handler interface |

### API Routes
| Current | Proposed | Location |
|---------|----------|----------|
| `/api/document` | `/api/artifact` | `app/api/artifact/route.ts` (already named this, but the route.ts implementation references "document" internally) |

### Components
| Current | Proposed | Location |
|---------|----------|----------|
| `document-preview.tsx` | `artifact-preview.tsx` | `features/artifacts/components/` |
| `DocumentPreview` component | `ArtifactPreview` | Component rename |

### Schemas
| Current | Proposed | Notes |
|---------|----------|-------|
| `documentId` field in Suggestion schema | `artifactId` | Zod schema + API contract |

### Stream Data Parts
| Current | Proposed | Notes |
|---------|----------|-------|
| Keep `data-id`, `data-title`, `data-kind` etc. | No change needed | These are artifact-specific but don't use "document" in name |

### Estimted Scope
~25-30 renames across ~15 files. Should be done in the scaffold phase (P00) to avoid propagating the inconsistency.

---

## Credit/Gateway Logic Removal Inventory

### Items to REMOVE

| Item | Location | Action |
|------|----------|--------|
| `vercel-gateway` provider registration | `lib/ai/registry.ts` (P03-T01) | Remove gateway provider from registry |
| `activate_gateway` error code | `lib/errors/codes.ts`, `seam-inventory.md` SEAM-028 | Remove error code and handler |
| Credit depletion `AlertDialog` | `features/chat/components/chat.tsx` (P03-T19) | Remove component and related state |
| `data-usage` stream part for credit display | `features/chat/components/data-stream-handler.tsx` | Remove credit-specific usage handling |
| `setUsage()` state + usage display | Chat component | Remove usage state management |
| Gateway credit card detection in `onError` | `features/chat/lib/chat-callbacks.ts` (proposed) | Remove gateway-specific error handling |

### Items to EVALUATE (may serve non-credit purposes)

| Item | Location | Decision Needed |
|------|----------|-----------------|
| **Daily quota check** (20 guest / 100 auth) | `data-flow-chains-01.md` Flow 1 | **KEEP** if this is abuse-prevention rate limiting, not credit-based. Rename from "entitlements" to "rate limits". |
| **`incrementQuota()`** | `stream-chat.ts` onFinish | **KEEP** if daily rate limiting is retained. Rename to `incrementDailyMessageCount()`. |
| **Redis quota counter** (`quota:{userId}:messages`) | `lib/cache/keys.ts` | **KEEP** if daily limits are retained. |
| **`getUserMessageCount()`** | Pre-stream validation | **KEEP** as rate limiting. |
| **`lastContext` field** on Chat table | `lib/db/schema.ts` | **EVALUATE** — if it only stores usage/credits, remove. If it stores model ID or other context, keep. |
| **`data-usage` stream part** | SSE protocol | **EVALUATE** — token usage display can be useful for power users even without credits. If kept, rename context from "credits" to "token usage". |

### Items to KEEP (unrelated to credits)

| Item | Notes |
|------|-------|
| Rate limiting (50 req/min) | Standard abuse prevention, not credit-related |
| `RateLimiters.chat()` | Redis-based rate limiter — keep |
| Error code `rate_limit:chat:*` | Rate limiting, not credit depletion |

### Terminology Cleanup

| Current Term | Proposed Term | Reason |
|-------------|---------------|--------|
| "entitlements check" | "daily limit check" | "Entitlements" implies a billing concept |
| "credit depletion" | Remove entirely | Credit system is removed |
| "AI Gateway" | Remove from all docs | Gateway is the credit system |
| "activate_gateway" | Remove | Gateway error code |
| "usage alert" | "rate limit notification" (if kept) | Reframe as operational limit, not billing |

---

## Cross-Cutting Observations

### Observation A: The Plan Lacks a Revalidation Strategy Document

None of the architecture documents (`patterns.md`, `conventions.md`, `improvements.md`, `decisions.md`) define when to use `revalidatePath` vs `revalidateTag` vs `updateTag` vs SWR mutate. This is a **critical architectural gap** for a Next.js 16 application. The caching guide should include:

- Decision tree: mutation type → revalidation primitive
- When to use `updateTag` (Server Actions, read-your-own-writes) vs `revalidateTag` (Route Handlers, stale-while-revalidate)
- When SWR optimistic update is sufficient vs when server revalidation is also needed
- How Router Cache invalidation interacts with SWR state

Add a new section to `patterns.md`: **"§9: Revalidation Pattern"**.

### Observation B: Server Action Error Handling is a Systemic Design Gap

The plan assumes "let errors propagate to error boundaries" works uniformly. In reality:
- Route Handler errors → JSON response → client parses → toast
- Server Action errors → React sanitizes → generic error → error boundary (context lost)
- Form Action errors → `useActionState` return value → form re-renders with error

Three fundamentally different error flows exist, but the plan treats them as one. This will cause debugging nightmares when developers expect `AppError.code` to reach the client from a Server Action.

Add to `patterns.md`: **"§10: Error Handling by Context"** with explicit guidance per invocation pattern.

### Observation C: The Plan Over-Invests in Client-Side State, Under-Invests in Server-Side Freshness

The plan uses SWR for 6+ data types, optimistic mutations for 4 operations, and polling for title confirmation. Meanwhile, it uses zero `revalidatePath`, zero `revalidateTag`, zero `updateTag`, and does not leverage `use cache` with cache tags for any user-facing data.

This creates a system where client-side state diverges from server-side truth over time:
- Tab A deletes a chat → SWR updates Tab A
- Tab B still shows the chat (Router Cache, no revalidation)
- User on mobile sees stale data (no mechanism to push freshness)

Next.js 16's revalidation primitives exist specifically to solve this. The plan should adopt them as the primary freshness mechanism, with SWR as the secondary client-side optimization layer.

### Observation D: Plan Phase Integration Points Need Cross-Phase Test Checkpoints

The phase structure (P00→P07) defines verification gates per phase, but these are limited to `pnpm typecheck` and `pnpm lint`. No verification gate tests cross-phase integration:
- P01 (data layer) + P02 (auth) → no test that auth-gated data access works
- P03 (chat) + P04 (artifacts) → no test that streaming tool calls produce correct artifact updates
- P05 (sidebar) + P03 (chat) → no test that optimistic chat creation appears in sidebar

Add integration test checkpoints at each phase boundary.

### Observation E: The Proxy Pattern Should Be Explicitly Deprecated

The plan references both `proxy.ts` (old app legacy) and `middleware.ts` (new). Both handle guest token rotation. The plan should explicitly state that `proxy.ts` is NOT carried forward and all its responsibilities move to `middleware.ts`. Currently, `data-flow-chains-01.md` Flow 7 still references "proxy.ts checks guest_token on every request" — this should reference `middleware.ts`.
