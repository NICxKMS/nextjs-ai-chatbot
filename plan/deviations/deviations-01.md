# Deviations from Architecture v6 Spec

> Source: `.ouroboros/specs/refactor-migration/architecture-v6-final.md`

---

## DEV-001: Eliminate `src/` Directory

**ID**: DEV-001
**Area**: directory-structure
**Severity**: STRUCTURAL

**Spec says**: `src/` is the base layer containing `types/`, `utils/`, `services/`, `test/`, and `components/ai-elements/`, `components/ai/`. Import hierarchy places `src/` below `lib/`. (§2, §3)

**We do instead**: No `src/` directory exists. Contents redistributed:
- `src/types/` → `lib/types/`
- `src/utils/` → `lib/utils/`
- `src/services/` → `lib/` (as plain modules)
- `src/test/` → `tests/`
- `src/components/ai-elements/` → `components/ai-elements/`
- `src/components/ai/` → colocated in features

**Reason**: `lib/` already serves as the infrastructure base layer. Having both `lib/` and `src/` creates ambiguity ("where does this file go?") with no architectural benefit. Three layers (app → features → lib) is simpler than five (app → features → components → lib → src).

**Trade-offs**: `lib/` directory becomes slightly larger. Offset by clearer mental model.

---

## DEV-002: Colocate AI Wrappers in Features

**ID**: DEV-002
**Area**: components
**Severity**: STRUCTURAL

**Spec says**: All 31 AI wrapper modules live in global `components/ai/` organized by category (chat/, reasoning/, tools/, content/, canvas/, citations/, workflow/, artifacts/, integration/, utilities/). (§11.1, §16)

**We do instead**: AI wrappers colocated in the feature that consumes them:
- Message, reasoning, tool wrappers → `features/chat/components/`
- Artifact wrappers → `features/artifacts/components/`
- Model selector → `features/models/components/`
- Generic utilities (loader, shimmer) → `components/ui/`
- `components/ai-elements/` remains global and untouched

**Reason**: Most wrappers are consumed by exactly one feature. Placing them globally violates feature collocation and creates a "junk drawer" that nobody owns. If a wrapper is later needed by multiple features, it can be extracted to shared at that point (Reuse Hierarchy: Reuse → Extend → Refactor → Create).

**Trade-offs**: If a wrapper is needed by 2+ features in the future, requires extraction. This is the expected cost of collocation — it's cheaper than premature globalization.

---

## DEV-003: Eliminate Blanket `lib/hooks/`

**ID**: DEV-003
**Area**: hooks
**Severity**: STRUCTURAL

**Spec says**: `lib/hooks/` contains shared hooks: `useDebounce`, `useLocalStorage`, `useMediaQuery`, `useMobile`, `useScrollToBottom`, `useWindowSize`. (§20)

**We do instead**: Only 2-3 truly generic hooks in `lib/hooks/` (`useMobile`, `useDebounce`, `useMediaQuery`). Feature-specific hooks colocate:
- `useScrollToBottom` → `features/chat/hooks/`
- `useWindowSize` → `features/artifacts/hooks/` (if only used by artifact panel)
- `useLocalStorage` → `lib/hooks/` only if used by 3+ features; otherwise inline

**Reason**: `useScrollToBottom` is only used by the chat message area. `useWindowSize` is only used by the artifact panel. Putting them in `lib/hooks/` makes them appear shared when they're not, and violates collocation.

**Trade-offs**: If a feature hook is later needed elsewhere, requires moving to `lib/hooks/`. Minor refactoring cost.

---

## DEV-004: Move Auth Form to Feature

**ID**: DEV-004
**Area**: components
**Severity**: STRUCTURAL

**Spec says**: `components/auth-form.tsx` — consolidated auth form in global components. (§9)

**We do instead**: `features/auth/components/auth-form.tsx`

**Reason**: The auth form is owned by the auth feature. It's not a shared UI component — it's feature-specific UI that encodes business logic (login vs register mode, server action calls, redirect behavior). Feature collocation requires it lives in the auth feature.

**Trade-offs**: None. The `app/(auth)/login/page.tsx` imports from `@/features/auth/components/auth-form` instead of `@/components/auth-form`. Cleaner ownership.

---

## DEV-005: Function-Based Data Access (No Repository Pattern)

**ID**: DEV-005
**Area**: data
**Severity**: MAJOR

**Spec says**: Full Repository pattern with `IReadRepository<T>`, `IWriteRepository<T, TCreate, TUpdate>`, `BaseRepository<T, TCreate, TUpdate>` abstract class, and per-entity repository classes. (§5)

**We do instead**: Plain function modules in `lib/data/`. One file per entity, exporting specific functions matching actual usage. A `withCache()` utility handles the common cache-through pattern.

```
lib/data/
├── chat.ts       # getChatById, createChat, deleteChatById, getChatsByUserId, ...
├── message.ts    # getMessagesByChatId, createMessage, ...
├── document.ts   # getDocumentById, saveDocumentVersion, ...
├── user.ts       # getUserById, createUser, ...
├── vote.ts       # upsertVote, getVotesByChatId, ...
└── context.ts    # DataContext type, createDataContext()
```

**Reason**:
1. The app has ~15 specific data operations, not generic CRUD. A `findMany(options)` never matches actual usage.
2. The guest/auth branching (cache-only vs cache+DB) doesn't fit into a generic `findById()` — every read needs `DataContext`.
3. Abstract class with generics adds ~350 lines of abstraction for no runtime benefit.
4. Function-based modules are trivially testable (mock the function) vs class instances (instantiate with mocked dependencies).
5. The existing app already uses this pattern successfully (`chatData.get()`, `documentData.save()`).

**Trade-offs**: No enforced interface contract. The cache-through pattern is repeated per function (mitigated by `withCache()` helper). No IDE autocomplete from a shared interface.

---

## DEV-006: Plain Module Exports (No Singleton Services)

**ID**: DEV-006
**Area**: services
**Severity**: STRUCTURAL

**Spec says**: `src/services/` contains `AnalyticsService`, `TelemetryService`, `StorageService` as singleton classes with `getInstance()` pattern. (§21)

**We do instead**: Plain module exports in `lib/`:
```typescript
// lib/analytics.ts
export function track(event: string, properties?: Record<string, unknown>) { ... }
```

**Reason**: Node.js modules are already singletons (cached after first import). The `getInstance()` pattern adds OOP ceremony with zero benefit. `export const analytics = { track() {...} }` or even bare function exports achieve identical behavior.

**Trade-offs**: None. The Singleton pattern in JavaScript modules is a code smell, not a pattern.

---

## DEV-007: No Jotai

**ID**: DEV-007
**Area**: state
**Severity**: MAJOR

**Spec says**: Use Jotai with `atom`, `atomWithStorage` for settings, sidebar state, theme. `SettingsProvider` backed by Jotai atoms. (§12 Decision 1, §19)

**We do instead**: Keep existing state management patterns:
- Settings: `useSyncExternalStore` + localStorage (pub/sub)
- Artifact state: SWR with optimistic mutate
- Chat visibility: SWR with optimistic mutate
- Optimistic chats: React context + Set-based dedup
- Data stream: Split state/dispatch context
- Theme: `next-themes` (already a dependency)

**Reason**: The existing app manages all state without any external state management library. Every identified state need is already solved. Jotai's `atomWithStorage` saves ~5 lines over `useSyncExternalStore`, which doesn't justify adding a dependency. The split context pattern already prevents re-render cascades. AGENTS.md Reuse Hierarchy says: "Always prefer existing solutions over writing new code."

**Trade-offs**: No centralized state debugging tools (Jotai DevTools). The trade is acceptable because state is distributed by design (each feature owns its state).

---

## DEV-008: No Result<T, E> Type

**ID**: DEV-008
**Area**: types
**Severity**: MAJOR

**Spec says**: Rust-style `Result<T, E>` with `ok()`, `err()`, `isOk()`, `unwrap()` helpers. (§14 Pattern 2)

**We do instead**: Standard TypeScript error handling with thrown `AppError` instances.

**Reason**:
1. Not idiomatic in the TypeScript/Next.js ecosystem
2. Fights against try/catch which is how JavaScript handles errors
3. The spec's own code examples use `throw AppError.notFound()` — contradicting Result usage
4. Doesn't compose with React error boundaries or Next.js `error.tsx`
5. Every consumer must pattern-match on `result.ok`, adding boilerplate everywhere

**Trade-offs**: Thrown errors are less explicit in function signatures (no return type showing possible failure). This is mitigated by consistent `AppError` usage documented in conventions.

---

## DEV-009: Optional Barrel Files (Not Mandatory)

**ID**: DEV-009
**Area**: exports
**Severity**: STRUCTURAL

**Spec says**: "Every folder MUST have `index.ts`" with barrel re-exports. (§22)

**We do instead**: Barrel files are optional. Only create when:
1. Directory has 3+ public exports
2. External consumers benefit from single import point
3. No circular dependency risk

**Reason**: Mandatory barrels cause: circular dependency risk (A → B → A through barrels), tree-shaking interference (importing one thing pulls the barrel), and meaningless index files that just re-export 1 thing. Next.js also has file conventions (page.tsx, layout.tsx) that conflict with index.ts in the same directory.

**Trade-offs**: Import paths are longer (`@/features/chat/actions/stream-chat` vs `@/features/chat`). This is a minor cost that IDEs handle via auto-import.

---

## DEV-010: No ApiResponse<T> Envelope for Streaming

**ID**: DEV-010
**Area**: API
**Severity**: MAJOR

**Spec says**: All API responses wrapped in `ApiResponse<T>` with `data` and `meta.timestamp` fields. `createApiResponse()` utility. (§7, §14 Pattern 3)

**We do instead**: The chat endpoint returns an SSE stream (not JSON). No envelope. For REST endpoints, return `Response.json(data)` directly. The `meta.timestamp` and `meta.requestId` add overhead that no consumer reads.

**Reason**: The primary API endpoint (POST /api/chat) is a streaming SSE response — wrapping it in ApiResponse makes no sense. For REST endpoints like GET /api/history, the response shape is `{ chats, hasMore }` — adding a `data` wrapper level and `meta.timestamp` creates unnecessary nesting. This matches Next.js conventions where `Response.json()` is the standard pattern.

**Trade-offs**: No standardized envelope if a third-party ever consumes the API. Acceptable because this is a web app, not a public API.

---

## DEV-011: String Literal Error Codes (Not Enum)

**ID**: DEV-011
**Area**: errors
**Severity**: MINOR

**Spec says**: `ErrorCode` enum with `UNAUTHORIZED`, `FORBIDDEN`, etc. (§10)

**We do instead**: String literal union type: `type ErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | ...`

**Reason**: TypeScript enums are not tree-shakeable (they emit runtime JavaScript objects). String literal unions provide identical type safety with zero runtime cost. This is the modern TypeScript best practice.

**Trade-offs**: Cannot iterate over error codes at runtime (rarely needed). Enum reverse mapping unavailable (never needed in this app).

---

## DEV-012: Biome Enforcement (Not ESLint Boundary Rules)

**ID**: DEV-012
**Area**: tooling
**Severity**: MINOR

**Spec says**: ESLint `no-restricted-imports` rules for layer boundary enforcement. (§23)

**We do instead**: The project uses Biome, not ESLint. Biome doesn't have `no-restricted-imports`. Import boundaries enforced via:
1. Convention + code review (primary)
2. A simple CI lint script checking import paths (secondary)

**Reason**: The spec references ESLint but AGENTS.md specifies Biome as the project formatter/linter. Adding ESLint alongside Biome is unnecessary complexity. A ~50-line boundary check script is simpler and tool-agnostic.

**Trade-offs**: No IDE-inline warning for boundary violations. The CI script catches violations at commit time instead of edit time.

---

## DEV-013: Add `use cache` Strategy (Missing from Spec)

**ID**: DEV-013
**Area**: caching
**Severity**: MINOR

**Spec says**: Nothing about Next.js 16 `use cache` directive. All caching is Redis-based. (§5, §14 Pattern 6)

**We do instead**: Dual caching strategy:
- Redis for user-specific, real-time data (chats, messages, documents, quotas)
- `use cache` + `cacheTag` for shared, slowly-changing data (model catalog, token pricing, static config)

**Reason**: Next.js 16 Cache Components is a framework feature designed for exactly this use case. The existing app already uses `"use cache"` for `getTokenLensCatalog()`. Extending this to model catalog and similar data leverages the framework instead of implementing custom logic.

**Trade-offs**: Two caching systems to understand. The boundary is clear: user-specific → Redis, shared → `use cache`.

---

## DEV-014: Don't Build Aspirational AI Wrappers

**ID**: DEV-014
**Area**: components
**Severity**: MINOR

**Spec says**: 31 AI wrapper modules across 10 categories including canvas/, citations/, workflow/ (plan, task, queue, checkpoint). (§16)

**We do instead**: Only build wrappers for functionality that exists in the current app:
- Message rendering (with markdown, reasoning, tool calls)
- Model selector
- Artifact container
- Code/image rendering
- Loading/shimmer states

Do NOT build: canvas, citations, workflow, queue, checkpoint wrappers.

**Reason**: The behavioral extraction confirms the app has no canvas, citation, workflow, or queue features. Building wrappers for non-existent features creates dead code. YAGNI applies. If these features are added later, their wrappers can be built at that time.

**Trade-offs**: If these features are added soon, wrapper code must be written then. This is expected and preferred over speculative abstraction.

---

## DEV-015: Drop `.action.ts` File Suffix

**ID**: DEV-015
**Area**: naming
**Severity**: STRUCTURAL

**Spec says**: Server action files use `.action.ts` suffix: `stream-chat.action.ts`, `save-message.action.ts`. (§22)

**We do instead**: Plain `.ts` suffix: `stream-chat.ts`, `save-message.ts`. The `actions/` directory already communicates intent.

**Reason**: The `.action.ts` suffix is redundant when files are already in an `actions/` directory. It adds noise to file names and import paths. The AGENTS.md naming convention specifies `kebab-case` files without mandating domain suffixes. The `schemas/` directory uses `.schema.ts` because schemas share directories with other code; actions do not.

**Trade-offs**: Cannot tell from import path alone that a function is a server action. Mitigated by `'use server'` directive in the file and the `actions/` directory in the path.
