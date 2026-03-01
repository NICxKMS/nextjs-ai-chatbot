# Improvements Over Architecture v6 Spec

> Confirmed improvements organized by impact. Feature collocation is the primary driver.
> Every change justified against behavioral extraction and Next.js 16 best practices.
>
> **Updated per redesign audit (2026-03-01)**: All improvements confirmed and incorporated
> into the redesign. Provider names finalized (ChatStreamProvider, PendingChatsProvider,
> SessionProvider, StreamBridge). Artifact state uses useSyncExternalStore. SettingsProvider
> removed. Handler registry adopted. Revalidation strategy added.

---

## 1. Feature Collocation Enforcement (STRUCTURAL — CONFIRMED)

### What the Spec Does

The spec uses a hybrid approach: `features/` for business logic, `components/` for shared
UI, `lib/` for infrastructure, `src/` for base utilities. AI wrappers live in global
`components/ai/`. Hooks spread across `lib/hooks/` and `features/*/hooks/`.

### What We Do Instead

**Everything feature-related lives inside `features/[name]/`.** The only code outside features
is genuinely cross-cutting infrastructure:

```
features/
├── chat/            # Chat streaming, messages, input, tools, prompts
├── artifacts/       # Artifact panel, editors, handlers, versioning
├── auth/            # Login, register, session, SessionProvider
├── sidebar/         # Chat history, pending chats, navigation
├── settings/        # User preferences (useSyncExternalStore, no provider)
├── voting/          # Message upvote/downvote
├── visibility/      # Chat visibility toggle
└── models/          # Model selection, catalog
```

Each feature owns: `actions/`, `components/`, `hooks/`, `schemas/`, `lib/`, `types/`

### What Stays Shared

> **Updated per redesign audit (2026-03-01)**: ai-elements removed from shared (no longer
> needed in new architecture). lib/api/ and lib/rate-limit/ consolidated. lib/ai/ now
> includes handler registry.

| Location | Content | Reason |
|----------|---------|--------|
| `components/ui/` | shadcn/ui base | Generic design system, no feature logic |
| `lib/db/` | Drizzle client, schema, migrations | Database infrastructure |
| `lib/cache/` | Redis client, key constants, `withCache()`, revalidation | Cache infrastructure |
| `lib/ai/` | Provider registry, model resolution, handler registry | AI infrastructure |
| `lib/auth/` | `getAppSession()` infrastructure | Auth infrastructure |
| `lib/errors/` | AppError class, error codes | Cross-cutting error handling |
| `lib/data/` | Shared data access functions | Used across multiple features |
| `lib/types/` | Artifact handler types, pending chats types, data context, ActionResult | Shared type definitions |
| `lib/utils/` | Generic utilities (cn, formatDate, etc.) | Cross-cutting helpers |
| `lib/hooks/` | `useMobile()`, `useDebounce()`, `useMediaQuery()` | 2-3 truly generic hooks only |

### Import Rules (Simplified)

| Layer | Can Import From |
|-------|----------------|
| `app/` | features, components, lib |
| `features/` | components, lib, other features (data/types only) |
| `components/` | lib |
| `lib/` | nothing above |

No `src/` layer. Three layers instead of five.

---

## 2. Simplified Data Access (STRUCTURAL — CONFIRMED)

### What the Spec Does

Full Repository pattern: abstract `BaseRepository<T, TCreate, TUpdate>` class with
`IReadRepository`/`IWriteRepository` interfaces, per-entity repository classes, generic
cache-through logic.

### What We Do Instead

Plain function modules in `lib/data/`. Each entity gets a module exporting specific
functions matching actual usage patterns:

```typescript
// lib/data/chat.ts
import { db } from '@/lib/db'
import { cache } from '@/lib/cache'
import { cacheKeys } from '@/lib/cache/keys'
import type { Chat, NewChat } from '@/lib/types'

export async function getChatById(id: string, userId: string): Promise<Chat | null> {
  const cached = await cache.get<Chat>(cacheKeys.chat(id))
  if (cached) return cached

  const chat = await db.query.chats.findFirst({ where: eq(chats.id, id) })
  if (chat) await cache.set(cacheKeys.chat(id), chat, { ex: 3600 })
  return chat ?? null
}

export async function getChatsByUserId(userId: string, opts: { limit: number; cursor?: string }): Promise<Chat[]> {
  // ... DB query with pagination
}

export async function createChat(data: NewChat): Promise<Chat> {
  const [chat] = await db.insert(chats).values(data).returning()
  await cache.set(cacheKeys.chat(chat.id), chat, { ex: 3600 })
  await cache.del(cacheKeys.userChats(data.userId))
  return chat
}
```

### Cache-Through Utility

For the common "check cache, fallback to fetcher, warm cache" pattern:

```typescript
// lib/cache/with-cache.ts
export async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T | null>
): Promise<T | null> {
  const cached = await cache.get<T>(key)
  if (cached) return cached

  const result = await fetcher()
  if (result) await cache.set(key, result, { ex: ttl })
  return result
}
```

### Guest/Auth Branching

The data layer must handle the dual guest/auth pattern. Each function receives a context:

```typescript
// lib/data/context.ts
type DataContext = {
  userId: string
  isGuest: boolean
}

// In data functions:
export async function getChatById(id: string, ctx: DataContext): Promise<Chat | null> {
  const cached = await cache.get<Chat>(cacheKeys.chat(id))
  if (cached) return cached
  if (ctx.isGuest) return null  // Guest: cache-only, no DB fallback
  // Auth: DB fallback + cache warming
}
```

### Why This Is Better

1. **No generics** — each function has explicit types
2. **No inheritance** — flat, composable functions
3. **Testable** — mock the function directly, no class instantiation
4. **Matches actual usage** — the behavioral extraction shows specific operations, not CRUD
5. **Guest branching** — naturally embedded in each function
6. **~60% less code** — no interfaces, abstract classes, or generic type parameters

---

## 3. State Management: No Jotai (MAJOR — CONFIRMED)

### What the Spec Does

Introduces Jotai with `atom`, `atomWithStorage` for settings, sidebar state, theme.
Creates `SettingsProvider` backed by Jotai atoms.

### What We Do Instead

Keep the existing patterns that already work:

> **Updated per redesign audit (2026-03-01)**: Artifact state updated to useSyncExternalStore
> (not SWR). Provider names finalized. SettingsProvider removed (direct import). SessionProvider
> added. PendingChatsProvider replaces optimistic chats context.

| State | Current Pattern | Keep? |
|-------|----------------|-------|
| Settings | `useSyncExternalStore` + localStorage pub/sub | ✅ Yes (no provider needed) |
| Artifact state | `useSyncExternalStore` + module-level store | ✅ Yes (was SWR, now simpler) |
| Chat visibility | SWR with server action | ✅ Yes |
| Pending chats | `PendingChatsProvider` (React context + `Set<string>`) | ✅ Yes (renamed from Optimistic) |
| Chat stream | `ChatStreamProvider` (split state/dispatch context) | ✅ Yes (renamed from DataStream) |
| Auth session | `SessionProvider` (React context) | ✅ Yes (renamed from AuthProvider) |
| Messages | `ChatSessionContext` wrapping `useChat` | ✅ Yes (renamed from ChatContext) |
| Theme | `next-themes` ThemeProvider | ✅ Yes |
| Sidebar open | URL state or simple React state | ✅ Yes |

### Why No Jotai

- Zero features in the app require atomic state management
- `atomWithStorage` saves ~5 lines vs `useSyncExternalStore`
- Adding a dependency for marginal convenience violates AGENTS.md Reuse Hierarchy
- The split context pattern already prevents re-render cascades
- SWR already handles cache-based state with optimistic updates

---

## 4. AI Wrapper Collocation (STRUCTURAL — CONFIRMED)

### What the Spec Does

31 wrapper modules in `components/ai/` organized by category.

### What We Do Instead

Colocate wrappers in the feature that consumes them:

| Wrapper | Spec Location | New Location | Reason |
|---------|--------------|-------------|--------|
| message, conversation | components/ai/chat/ | features/chat/components/ | Only used by chat |
| prompt-input wrappers | components/ai/chat/ | features/chat/components/ | Only used by chat |
| reasoning, chain-of-thought | components/ai/reasoning/ | features/chat/components/ | Only used in messages |
| tool, confirmation | components/ai/tools/ | features/chat/components/ | Only used in messages |
| artifact | components/ai/artifacts/ | features/artifacts/components/ | Only used by artifacts |
| model-selector | components/ai/integration/ | features/models/components/ | Only used by models |
| code-block | components/ai/content/ | features/artifacts/components/ | Only used by artifact editors |
| loader, shimmer | components/ai/utilities/ | components/ui/ | Generic loading states |

**Only build wrappers for features that exist.** The spec's canvas/, citations/, workflow/
categories don't correspond to any current functionality. Don't create dead code.

### `ai-elements/` Stays Global

> **Updated per redesign audit (2026-03-01)**: The ai-elements external dependency may be
> removed entirely if the new architecture doesn't require it. If kept, it stays global.

`components/ai-elements/` remains unchanged — it's an external read-only dependency. The
`import from '@/components/ai-elements'` pattern is fine because it's infrastructure, not
feature logic.

---

## 5. Eliminate `src/` Directory (STRUCTURAL — CONFIRMED)

### What the Spec Does

```
src/
├── types/    → shared types, API types
├── utils/    → shared utilities
├── services/ → analytics, telemetry, storage (singleton classes)
└── test/     → test setup, mocks, fixtures
```

### What We Do Instead

| Spec Location | New Location | Rationale |
|--------------|-------------|-----------|
| `src/types/` | `lib/types/` | Types are infrastructure |
| `src/utils/` | `lib/utils/` | Utils are infrastructure |
| `src/services/analytics/` | `lib/analytics.ts` | Simple module, no class |
| `src/services/telemetry/` | `lib/telemetry.ts` | Simple module, no class |
| `src/services/storage/` | `lib/storage.ts` | Simple module, no class |
| `src/test/` | `tests/` | Test infra stays in test dir |
| `src/components/ai-elements/` | `components/ai-elements/` | Global shared |
| `src/components/ai/` | Colocated in features | Per §4 above |

Result: `src/` does not exist. Three layers: `app/ → features/ → lib/` + `components/`.

---

## 6. Next.js 16 Alignment (MAJOR — CONFIRMED)

### 6.1 `use cache` for Read-Heavy Operations

The spec relies entirely on Redis for caching. Next.js 16's `use cache` directive enables
framework-managed caching with tag-based invalidation. Use it for server-rendered reads:

| Operation | Cache Strategy |
|-----------|---------------|
| Model catalog | `use cache` + `cacheTag('models')` — rarely changes |
| System prompts | `use cache` + `cacheTag('prompts')` — config-level |
| Token pricing catalog | `use cache` + `cacheTag('tokenlens')` — already uses it |
| Chat page data | Redis — guest/auth branching, real-time |
| Chat history list | Redis — frequently updated, optimistic |
| Artifact versions | Redis — streaming updates, version append |
| Settings defaults | Compile-time constants — no cache needed |

Rule: Use `use cache` for data that is **request-independent** and **changes infrequently**.
Use Redis for data that is **user-specific** or **real-time**.

### 6.2 Server Action vs Route Handler Decision Tree

```
Does the endpoint return an SSE stream?
├── YES → Route Handler (POST in route.ts)
│         Examples: /api/chat (streaming), /api/chat/[id]/reconnect
└── NO: ↓

Is it called from a <form> or client component?
├── YES → Server Action ('use server' function)
│         Examples: saveChat, updateVisibility, login, register, vote
└── NO: ↓

Is it a REST endpoint for external/programmatic access?
├── YES → Route Handler
│         Examples: /api/health, /api/history (paginated GET)
└── NO: ↓

Is it a data mutation triggered by user interaction?
├── YES → Server Action
└── NO → Route Handler (probably a GET)
```

### 6.3 PPR (Partial Prerendering)

With Cache Components enabled, structure pages for PPR:

```tsx
// app/(chat)/layout.tsx — static shell
export default function ChatLayout({ children }) {
  return (
    <div className="flex">
      <Suspense fallback={<SidebarSkeleton />}>
        <AppSidebar />  {/* dynamic: needs auth */}
      </Suspense>
      {children}
    </div>
  )
}
```

The layout chrome is static. User-specific content (sidebar, chat) streams in via Suspense.

---

## 7. Simplified Error Handling (MINOR — CONFIRMED)

### What the Spec Does

`ErrorCode` enum + `AppError` class with many static factory methods.

### What We Do Instead

Keep AppError but use string literal codes (not enum):

> **Updated per redesign audit (2026-03-01)**: ActionResult<T> adopted for Server Actions.
> AppError + throw preserved for Route Handlers. No Result<T, E>.

```typescript
// lib/errors/app-error.ts
type ErrorCode =
  | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND'
  | 'VALIDATION' | 'RATE_LIMITED' | 'AI_ERROR'
  | 'DATABASE_ERROR' | 'CACHE_ERROR'

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }
  // ... static factories + toResponse()
}
```

String literal union type is tree-shakeable (enums are not in TypeScript) and provides
the same type safety. Drop `Result<T, E>` entirely.

For Server Actions, use `ActionResult<T>` return type instead of thrown errors:
```typescript
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }
```

---

## 8. Import Boundary Enforcement (MINOR — CONFIRMED)

Biome doesn't support `no-restricted-imports`. Options:

1. **Convention + code review** — document rules, enforce in PR review
2. **Custom lint script** — a simple Node.js script that checks import paths in CI
3. **TypeScript path aliases** — configure `tsconfig.json` paths to make violations harder

Recommendation: Option 2. A ~50-line script checking import patterns in CI is simple,
effective, and tool-agnostic.

---

## 9. Summary of Changes

> **Updated per redesign audit (2026-03-01)**: All improvements CONFIRMED. New improvements
> added for revalidation strategy, ChatShell decomposition, provider naming, StreamBridge,
> and handler registry.

| Change | Impact | Status | Priority |
|--------|--------|--------|----------|
| Feature collocation enforcement | STRUCTURAL | ✅ CONFIRMED | P0 |
| Simplified data access (no Repository) | STRUCTURAL | ✅ CONFIRMED | P0 |
| Eliminate `src/` directory | STRUCTURAL | ✅ CONFIRMED | P0 |
| AI wrapper collocation | STRUCTURAL | ✅ CONFIRMED | P1 |
| No Jotai (keep existing patterns) | MAJOR | ✅ CONFIRMED | P0 |
| Next.js 16 `use cache` integration | MAJOR | ✅ CONFIRMED | P1 |
| Server Action vs Route Handler clarity | MAJOR | ✅ CONFIRMED | P0 |
| Simplified error handling + ActionResult | MINOR | ✅ CONFIRMED | P2 |
| Build-only wrappers for existing features | MINOR | ✅ CONFIRMED | P1 |
| Import boundary enforcement | MINOR | ✅ CONFIRMED | P2 |
| **Revalidation completeness** | MAJOR | ✅ NEW | P0 |
| **ChatShell decomposition** | MAJOR | ✅ NEW | P1 |
| **Provider naming alignment** | MINOR | ✅ NEW | P1 |
| **StreamBridge pattern** | MINOR | ✅ NEW | P1 |
| **Handler registry (artifacts)** | STRUCTURAL | ✅ NEW | P1 |
| **SettingsProvider removal** | MINOR | ✅ NEW | P1 |
| **proxy.ts (Next.js 16)** | STRUCTURAL | ✅ NEW | P0 |
| **useSyncExternalStore for artifacts** | MAJOR | ✅ NEW | P1 |
| **VoteResolver pattern** | MINOR | ✅ NEW | P2 |

---

## 10. New Improvements from Redesign Audit

> **Added per redesign audit (2026-03-01)**

### 10.1 Revalidation Completeness

Every `use cache` + `cacheTag` data fetch must be paired with `revalidateTag` (in Server
Actions) or `updateTag` (in Route Handlers) after the corresponding mutation. This is a
non-negotiable convention — `lib/cache/revalidate.ts` provides the utilities.

### 10.2 ChatShell Decomposition

The existing `Chat` god component (~200 lines) is split into:
- `ChatShell` (~60 lines) — calls `useChat`, provides `ChatSessionContext`, renders children
- `StreamBridge` (~20 lines) — thin component calling `processStreamDelta()` pure function
- `VoteResolver` — uses `use()` to resolve deferred vote promise, hydrates SWR

### 10.3 Provider Naming Alignment

All providers renamed to match their actual purpose:
- `DataStreamProvider` → `ChatStreamProvider`
- `DataStreamHandler` → `StreamBridge`
- `AuthProvider` → `SessionProvider`
- `OptimisticChatsProvider` → `PendingChatsProvider`
- `ChatContext` → `ChatSessionContext`
- `SettingsProvider` → **removed** (direct import)

### 10.4 Handler Registry

Artifact handlers are registered via `lib/ai/artifact-handlers.ts` instead of being
directly imported by the chat feature. This breaks the coupling between chat and artifacts.

### 10.5 useSyncExternalStore for Artifact State

Artifact state uses `useSyncExternalStore` with a module-level store in
`features/artifacts/lib/artifact-store.ts`. This replaces the previous SWR-based approach,
providing better selector support and no Context provider overhead.

### 10.6 proxy.ts for Next.js 16

`middleware.ts` is replaced by `proxy.ts` per Next.js 16 conventions. Same responsibilities:
auth guard, guest token rotation, per-route rate limiting.
