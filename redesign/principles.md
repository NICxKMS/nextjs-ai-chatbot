# Core Design Principles

> The 14 architectural principles that govern every decision in this redesign.  
> Each principle cites the audit findings it addresses.

---

## 1. Server-First Architecture

**Principle:** Every component is a Server Component unless it requires browser APIs, state, or event handlers. Client components are small, focused islands embedded within server-rendered structure.

**What this means in practice:**
- Layouts are always server components — no `'use client'` layouts
- Pages are server components that fetch data and render structure
- Interactive elements are extracted into minimal client component islands
- The `'use client'` boundary is placed as low in the tree as possible
- PPR (Partial Prerendering) static shells contain real HTML content, not loading skeletons

**What it forbids:**
- Monolithic `'use client'` layout wrappers (the ChatLayoutClient anti-pattern)
- `dynamic(import, { ssr: false })` as a default strategy
- Forcing an entire subtree to client-render because of one hook (`useSearchParams`)

**Audit findings addressed:** CRITICAL-1 (I-1), I-2, I-4, VI-3, VI-4

---

## 2. Streaming-First Data Flow

**Principle:** Data flows from server to client via streaming. Initial page content is server-rendered in HTML. Dynamic content streams via `<Suspense>` boundaries. Real-time updates flow via SSE data parts. Non-critical data loads asynchronously via promise-passing.

**What this means in practice:**
```
Server fetch (parallel) → HTML static shell → Suspense streams dynamic content
                                            → SSE streams real-time updates
                                            → Promise-passing defers non-critical data
```

- Chat messages: server-fetched, passed as props, enhanced with real-time streaming
- Sidebar history: server-fetched first page, client-side pagination for subsequent pages
- Votes: streamed via React `use()` and promise-passing, not blocking initial render
- Artifact content: streamed via SSE data parts during AI generation

**What it forbids:**
- Client-side waterfall fetching for data that should be server-rendered
- Sequential server awaits when parallel fetching is possible
- Polling as a primary data delivery mechanism

**Audit findings addressed:** II-1, II-2, V-2, VII-3

---

## 3. Feature Collocation

**Principle:** All code for a feature lives in `features/[name]/`. A feature owns its actions, components, hooks, schemas, types, and library code. Features are the primary organizational unit.

**Directory pattern:**
```
features/[name]/
├── actions/          # Server Actions
├── components/       # UI components (server + client)
├── hooks/            # Client hooks
├── schemas/          # Zod validation schemas
├── types/            # TypeScript types
└── lib/              # Feature-specific utilities
```

**What it forbids:**
- Scattering feature logic across unrelated directories
- Shared components that embed feature-specific business logic
- Feature code in `lib/` (lib is infrastructure only)

**Audit findings addressed:** VIII-4 (module boundary violations)

---

## 4. Clean Feature Boundaries

**Principle:** Features may import from other features' **exported types and schemas only**. Implementation details (components, hooks, handlers) are internal. Cross-feature integration uses shared interfaces in `lib/types/` and registries in `lib/`.

**Dependency Inversion pattern:**
```
features/chat/ → lib/ai/artifact-handlers.ts (getArtifactHandler)
features/artifacts/ → lib/ai/artifact-handlers.ts (registerArtifactHandler)
                  ↑ shared interface in lib/types/artifact-handler.types.ts
```

**Cross-feature communication:**
- Chat ↔ Sidebar: `PendingChatsProvider` (typed context, single channel)
- Chat ↔ Artifacts: handler registry in `lib/ai/` (dependency inversion)
- ChatStream → Artifact state: pure function `processStreamDelta()` in shared lib

**What it forbids:**
- Direct imports between features' implementation code
- `window.dispatchEvent` for cross-feature communication
- Magic string event names
- Multiple communication channels for the same data (stream + polling + events)

**Audit findings addressed:** IV-1, IV-2, III-2, VIII-3, VIII-4

---

## 5. Provider Scope Minimization

**Principle:** Context providers wrap only the components that consume them. Unrelated providers are siblings, not nested. High-frequency providers (ChatStream) are scoped to the page, not the layout.

**Correct scoping:**
```
Root layout:     ThemeProvider → SessionProvider            # App-wide concerns
Chat layout:     SidebarProvider → PendingChatsProvider  # Layout-level, survive nav
Chat page:       SettingsProvider → ChatStreamProvider   # Page-level, reset on nav
Chat component:  ChatSessionContext.Provider (inline)           # Component-level
```

**Key insight:** Provider nesting depth matters less than provider scope. A deeply nested but tightly scoped provider is better than a shallow but overly broad one.

**What it forbids:**
- Layout-level providers for page-specific state (ChatStream in layout)
- Providers wrapping components that never consume their context
- 9+ provider levels when 7 suffice with better scoping

**Audit findings addressed:** I-4, III-3, III-6, V-3, V-5

---

## 6. Revalidation Completeness

**Principle:** Every mutation calls the appropriate Next.js cache invalidation primitive. Server Actions use `updateTag()` for read-your-own-writes. Route Handlers use `revalidateTag(tag, 'max')` for stale-while-revalidate. No mutation silently leaves stale data in the Router Cache.

**Decision tree:**
```
Is this a Server Action (user-initiated mutation)?
  YES → updateTag(relevantTags)        # immediate expire, user sees own writes
  NO → Is this a Route Handler mutation (e.g., onFinish)?
    YES → revalidateTag(tags, 'max')   # stale-while-revalidate, background refresh
```

**Revalidation utility:**
```typescript
// lib/cache/revalidate.ts
export function revalidateChat(chatId: string, userId: string) {
  updateTag(`chat:${chatId}`)
  updateTag(`chats:${userId}`)
}
```

**What it forbids:**
- Mutations that write to DB/Redis without calling `updateTag`/`revalidateTag`
- Relying solely on SWR client-side cache for data freshness
- Router Cache serving stale data after a mutation

**Audit findings addressed:** CRITICAL-3 (VII-1), VII-2, VII-6

---

## 7. Single Responsibility Components

**Principle:** Each component has ONE job. Orchestrators are thin (~60 lines). Business logic lives in hooks or pure functions, not in render bodies. Side effects are isolated in dedicated hooks or null-rendering bridge components.

**ChatShell decomposition (replaces 524-line God Component):**
```
ChatShell (~60 lines)           # Thin orchestrator, provides context
├── useChatSession() (~120 lines)  # useChat config + callbacks (hook)
├── useChatSideEffects() (~40 lines)  # Navigation effects (hook)
├── chat-callbacks.ts            # Pure functions for onData/onError/onFinish
├── ChatHeader                   # Reads ChatSessionContext
├── Messages                     # Reads ChatSessionContext (3 own props max)
├── MultimodalInput              # Reads ChatSessionContext (2 own props max)
└── ArtifactPanel                # Reads ChatSessionContext (2 own props max)
```

**What it forbids:**
- Components with 14+ responsibilities
- Components distributing 15-16 props to children
- Business logic in layout components
- Side effects mixed with state provision (SessionProvider + guest bootstrap together)

**Audit findings addressed:** CRITICAL-2 (IV-6), V-1, V-4, IV-3, III-5

---

## 8. Naming Consistency

**Principle:** One concept = one name, everywhere. The user-facing concept is "artifact" — every file, type, function, variable, table, cache key, and API route uses "artifact." The word "document" does not appear in any code identifier.

**Scope of rename (from `document` to `artifact`):**
- DB: `Artifact` table, `artifact_kind` enum, `artifactId` FK
- Data layer: `lib/data/artifact.ts`, `getArtifactById()`, `saveArtifactVersion()`
- Cache keys: `artifact:{id}:{userId}`
- AI tools: `createArtifact`, `updateArtifact`
- Handlers: `ArtifactHandler` interface, `artifactHandlersByKind`
- Components: `artifact-preview.tsx`, `ArtifactPreview`
- API routes: `/api/artifact`

**What it forbids:**
- Mixed naming (`documentHandlersByArtifactKind`)
- Layer-dependent naming (UI says "artifact", data says "document")
- Any identifier containing "document" that refers to an artifact

**Audit findings addressed:** VIII-1

---

## 9. No Dead Code

**Principle:** Only build what the application needs. Remove credit/gateway logic entirely. Do not scaffold unused infrastructure. Do not preserve patterns "for future use."

**Removed:**
- `vercel-gateway` provider registration
- `activate_gateway` error code and handler
- Credit depletion `AlertDialog`
- `data-usage` credit display (token usage display may be kept, renamed)
- Gateway-specific error handling
- `pollForTitle()` and `window.dispatchEvent('chat-title-updated')`

**Kept (renamed):**
- Daily rate limiting (20 guest/100 auth) — renamed from "entitlements" to "daily limits"
- Rate limiter (50 req/min) — standard abuse prevention
- `incrementDailyMessageCount()` (was `incrementQuota()`)

**Audit findings addressed:** VIII-2, III-2 (window event removal)

---

## 10. Import Boundary Enforcement

**Principle:** The import hierarchy is enforced at build time, not by convention alone. Violations fail the CI pipeline.

**Hierarchy:**
```
app/   → features/, components/, lib/
features/  → components/, lib/, other features (TYPES ONLY)
components/  → lib/
lib/   → nothing above
```

**Enforcement mechanisms (choose one or combine):**
1. Biome `noRestrictedImports` nursery rule (if available) — inline editor feedback
2. TypeScript project references per feature — strongest compile-time enforcement
3. CI script (`scripts/check-imports.mjs`) — fallback, runs in `pnpm lint`

**What it forbids:**
- `components/` importing from `features/`
- `features/chat/` importing implementation from `features/artifacts/`
- `lib/` importing from any higher layer

**Audit findings addressed:** VIII-4, VIII-8

---

## 11. Composition Over Inheritance

**Principle:** UI structure is built through component composition and React's children pattern, not through class inheritance or deep prop drilling. Context provides shared state; composition provides structure.

**Pattern:**
```tsx
// Server layout composes client islands
<ServerLayout>
  <Suspense fallback={<Skeleton />}>
    <ServerDataFetcher />
  </Suspense>
  <ClientIsland1 />
  <ClientIsland2 />
  {children}  {/* Server-rendered page content passed through */}
</ServerLayout>
```

**What it forbids:**
- Prop drilling deeper than 2 levels for shared data (use context instead)
- Setter functions as props for cross-component communication (use intent-based callbacks)
- God Components that compose by aggregating all concerns internally

**Audit findings addressed:** V-1, V-4

---

## 12. Error Boundary Hierarchy

**Principle:** Errors are caught at the appropriate level. Each route group has an `error.tsx`. Critical operations return result objects rather than throwing. Error presentation matches error severity.

**Error handling by context:**
| Context | Pattern | Why |
|---------|---------|-----|
| Server Actions | Return `{ success, data?, error? }` | React sanitizes thrown errors — client loses structured info |
| Route Handlers | `throw AppError` → `.toResponse()` → JSON | Client can parse structured error |
| Form Actions | `useActionState` return value | Form re-renders with error, preserves state |
| Unexpected errors | `throw` → error boundary (`error.tsx`) | Last resort, shows fallback UI |

**Error boundaries:**
```
app/global-error.tsx          # Root — catches unrecoverable errors
app/(chat)/error.tsx          # Chat route group — chat-specific failures
app/(auth)/error.tsx          # Auth route group — auth failures
features/artifacts/components/artifact-error-boundary.tsx  # Artifact panel
```

**What it forbids:**
- Letting Server Action throws reach the client as generic "An error occurred" messages
- Missing error boundaries at route group level
- Error handling logic embedded in layout components

**Audit findings addressed:** VII-7, VII-8

---

## 13. Testable by Design

**Principle:** Business logic is extracted into pure functions. Side effects are isolated in thin bridge components. Every architectural seam is independently testable.

**Testability pattern:**
```
Pure function (processStreamDelta)    → unit test, zero React overhead
Custom hook (useChatSession)          → hook test with renderHook
Bridge component (StreamBridge)  → integration test, minimal setup
Server Action (deleteChat)            → mock DB/cache, test directly
Full flow (send message → stream)     → E2E test
```

**What it forbids:**
- Business logic embedded in components that require full provider tree to test
- Hidden controllers (null-rendering components with complex logic)
- Untestable side effects (window events, polling timers without extraction)

**Audit findings addressed:** IV-7, VIII-5, VIII-7

---

## 14. Resilient Streaming

**Principle:** Streams complete reliably. The server awaits critical data (title) before closing. Partial responses are saved on abort. The client aborts cleanly on navigation.

**Stream completion guarantee:**
```typescript
// Server: await title BEFORE closing stream
const titlePromise = generateTitle(userMessage)
// ... stream main AI content ...
const title = await titlePromise
ChatStream.writeData({ type: 'data-chatTitle', content: title ?? fallbackTitle })
// THEN close stream
```

**Abort handling:**
```typescript
// Client: stop() on unmount or chat change
useEffect(() => () => {
  if (status === 'streaming') stop()
}, [chatId])

// Server: save partial response on abort
request.signal.addEventListener('abort', async () => {
  if (accumulatedContent.length > 0) await savePartialMessage(...)
})
```

**What it forbids:**
- Client-side polling as a workaround for unreliable streaming
- Losing assistant responses when streams are interrupted
- Server continuing to generate after client disconnects (55s waste)

**Audit findings addressed:** VII-3, VII-4, VI-5
