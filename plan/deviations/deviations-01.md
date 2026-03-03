> **Updated per redesign audit (2026-03-01)**

# Deviations from Architecture v6 Spec

> Source: `.ouroboros/specs/refactor-migration/architecture-v6-final.md`
> **Redesign additions:** DEV-016 through DEV-022 added at end of file.
> **Wave 4 additions:** DEV-023 through DEV-027.
> **Ambiguity resolutions:** DEV-028, DEV-029.
> **Wave 4 cross-feature additions:** DEV-030.
> **CONF-001 resolution:** DEV-031.
> **SOFT-001/DUPL-001 resolution:** DEV-032. <!-- W4-CYCLE1 -->

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

**We do instead**: Hybrid two-layer approach:
- **Primitives**: copied **on-demand** from `oldapp/components/elements/` → `components/ai-elements/` when a feature wrapper needs them. Copied as-is, never modified, excluded from Biome.
- **Wrappers**: colocated in the consuming feature:
  - Message, reasoning, tool wrappers → `features/chat/components/`
  - Artifact wrappers → `features/artifacts/components/`
  - Model selector → `features/models/components/`
  - Generic utilities (loader, shimmer) → `components/ui/`
- **Import rule**: Wrappers import from `@/components/ai-elements/`. Features never import ai-elements directly.
- **No bulk copy**: Only primitives needed by implemented features are copied (YAGNI).

**Reason**: Most wrappers are consumed by exactly one feature — global placement violates feature collocation. The on-demand copy maintains the read-only primitive boundary from the spec while avoiding dead code for features that don't exist yet.

**Trade-offs**: 
- If a wrapper is needed by 2+ features, requires extraction (cheaper than premature globalization)
- On-demand copy requires tracking which primitives are already copied per phase

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

**We do instead**: Plain function modules in `lib/data/`. One file per entity, exporting specific functions matching actual usage. A `withCache()` utility wraps the `'use cache'` directive for tagged server-side caching.

```
lib/data/
├── chat.ts       # getChatById, createChat, deleteChatById, getChatsByUserId, ...
├── message.ts    # getMessagesByChatId, createMessage, ...
├── artifact.ts   # getArtifactById, saveArtifactVersion, ...
├── user.ts       # getUserById, createUser, ...
├── vote.ts       # upsertVote, getVotesByChatId, ...
    # Note: DataContext removed per DEV-024 — functions use bare-ID parameters, no DataContext type needed
```

**Reason**:
1. The app has ~15 specific data operations, not generic CRUD. A `findMany(options)` never matches actual usage.
2. Guest/auth branching for authorization/capability checks still does not fit cleanly into generic `findById()` abstractions — auth checks happen at the action/page level with bare-ID function signatures.
<!-- audit: W4-CONF-017/CONF-027 — DataContext removed per DEV-024; bare-ID signatures -->
3. Abstract class with generics adds ~350 lines of abstraction for no runtime benefit.
4. Function-based modules are trivially testable (mock the function) vs class instances (instantiate with mocked dependencies).
5. The existing app already uses this pattern successfully (`chatData.get()`, `documentData.save()`).

**Trade-offs**: No enforced interface contract. Caching is handled by `withCache()` wrapping `'use cache'` directives (framework-level, no manual cache management). No IDE autocomplete from a shared interface.
<!-- audit: W4-CONF-027 — withCache updated from Redis cache-through to 'use cache' wrapper -->

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
- Optimistic chats: `PendingChatsProvider` (React context + Set-based dedup)
- Data stream: `ChatStreamProvider` (split state/dispatch context)
- Theme: `next-themes` (already a dependency)

<!-- SYNC: Wave 4 — updated stale names per W2-F2 (DEV-007 body text). -->

> **Post-redesign correction:** The SWR-as-state patterns described here (artifact state via SWR synthetic key, visibility via SWR optimistic mutate) were superseded by the redesign. Current plan uses: artifact state → `useSyncExternalStore` via `artifactStore` (see `state-management.md`); visibility → `useOptimistic` + Server Action `updateChatVisibility` with `updateTag`. SWR is restricted to genuine data-fetching (sidebar history, suggestions, artifact versions).

**Reason**: The existing app manages all state without any external state management library. Every identified state need is already solved. Jotai's `atomWithStorage` saves ~5 lines over `useSyncExternalStore`, which doesn't justify adding a dependency. The split context pattern already prevents re-render cascades. AGENTS.md Reuse Hierarchy says: "Always prefer existing solutions over writing new code."

**Trade-offs**: No centralized state debugging tools (Jotai DevTools). The trade is acceptable because state is distributed by design (each feature owns its state).

---

## DEV-008: No Result<T, E> Type

**ID**: DEV-008
**Area**: types
**Severity**: MAJOR

**Spec says**: Rust-style `Result<T, E>` with `ok()`, `err()`, `isOk()`, `unwrap()` helpers. (§14 Pattern 2)

**We do instead**: `ActionResult<T>` for Server Actions, plus native thrown `AppError` for Route Handlers.

**Reason**:
1. Not idiomatic in the TypeScript/Next.js ecosystem
2. Adds wrapper overhead where `ActionResult<T>` already provides explicit mutation failure modeling
3. The spec's own code examples use `throw AppError.notFound()` — contradicting Result usage
4. Route Handlers already compose naturally with React/Next.js error boundaries via thrown `AppError`
5. Every consumer would pattern-match on `result.ok`, adding boilerplate everywhere

**Trade-offs**: Mixed model requires discipline (ActionResult for Server Actions, thrown errors for Route Handlers), but this mirrors actual runtime constraints and keeps client mutation flows explicit.

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

**Reason**: The primary API endpoint (POST /api/chat) is a streaming SSE response — wrapping it in ApiResponse makes no sense. For REST endpoints like GET /api/history, the response shape is `{ chats, hasMore, nextCursor? }` — adding a `data` wrapper level and `meta.timestamp` creates unnecessary nesting. This matches Next.js conventions where `Response.json()` is the standard pattern.

**Trade-offs**: No standardized envelope if a third-party ever consumes the API. Acceptable because this is a web app, not a public API.

---

## DEV-011: String Literal Error Codes (Not Enum)

**ID**: DEV-011
**Area**: errors
**Severity**: MINOR

**Spec says**: `ErrorCode` enum with `UNAUTHORIZED`, `FORBIDDEN`, etc. (§10)

**We do instead**: Structured string literal union type (e.g., `type ErrorCode = 'unauthorized:chat:auth_required' | 'bad_request:api:invalid_request_body' | ...`).

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
- Redis for operational concerns (rate limits, hot-path operational cache, token pricing snapshots)
- `use cache` + `cacheTag` for primary server read paths (chat/history/artifact reads, model catalog, static config)

**Reason**: Next.js 16 Cache Components is a framework feature designed for exactly this use case. The existing app already uses `"use cache"` for `getTokenLensCatalog()`. Extending this to model catalog and similar data leverages the framework instead of implementing custom logic.

**Trade-offs**: Two caching systems to understand. The boundary is operational cache/rate limit concerns (Redis) vs framework-tagged read caching (`use cache`).

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

**Spec says**: Server action files use `.action.ts` suffix: `delete-chat.action.ts`, `save-message.action.ts`. (§22) <!-- C2-W4: SOFT-010 fix -->

**We do instead**: Plain `.ts` suffix: `delete-chat.ts`, `save-message.ts`. The `actions/` directory already communicates intent.

**Reason**: The `.action.ts` suffix is redundant when files are already in an `actions/` directory. It adds noise to file names and import paths. The AGENTS.md naming convention specifies `kebab-case` files without mandating domain suffixes. The `schemas/` directory uses `.schema.ts` because schemas share directories with other code; actions do not.

**Trade-offs**: Cannot tell from import path alone that a function is a server action. Mitigated by `'use server'` directive in the file and the `actions/` directory in the path.

---

## DEV-016: Document → Artifact Complete Rename

**ID**: DEV-016
**Area**: naming
**Severity**: MAJOR

**Spec says**: Uses `Document` table, `DocumentHandler`, `DocumentKind`, `createDocument`, `updateDocument`, `documentId`, `data-id`/`data-title`/`data-kind`/`data-clear` stream parts throughout. (Multiple sections)

**We do instead**: Complete rename to artifact terminology:
- `Document` table → `Artifact` table
- `document_kind` enum → `artifact_kind`
- `DocumentHandler` → `ArtifactHandler` interface
- `DocumentKind` → `ArtifactKind`
- `createDocument` tool → `createArtifact`
- `updateDocument` tool → `updateArtifact`
- `documentId` → `artifactId`
- `data-id` → `artifact-id`, `data-title` → `artifact-title`, `data-kind` → `artifact-kind`, `data-clear` → `artifact-clear`
- `lib/data/document.ts` → `lib/data/artifact.ts`
- All function names: `getDocumentById` → `getArtifactById`, etc.
- System prompt: "artifact" not "document"

**Reason**: The existing application uses "document" to refer to rich content artifacts (code, text, sheet, image), which conflicts with both the DOM `document` object and browser `Document` concept. "Artifact" is clearer, avoids naming conflicts, and better describes the concept of AI-generated content. The rename was identified in the redesign audit as universally beneficial.

**Trade-offs**: Existing legacy references (archives/snapshots) require historical context, but active implementation docs are artifact-native. All 36+ identifiers changed. See `../../plan-archives/redesign/cleanup-inventory.md` §2 for the exhaustive rename inventory.

---

## DEV-017: SettingsProvider Removed

**ID**: DEV-017
**Area**: state
**Severity**: MAJOR

**Spec says**: `SettingsProvider` wraps the app and manages user settings via a React context provider, possibly backed by Jotai atoms. (§12, §19)

**We do instead**: No `SettingsProvider` exists. Settings (sampling parameters and system prompt) use `useSyncExternalStore` + `localStorage` directly via a `useSettings()` hook, while auto-scroll behavior is handled by the `useScrollToBottom` hook (not as part of SettingsState):
```typescript
// features/settings/hooks/use-settings.ts
export function useSettings() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

**Reason**: A provider wrapping the entire app for settings is overengineering when `useSyncExternalStore` achieves the same reactivity with zero tree overhead. Settings are simple key-value pairs stored in localStorage. No server-side state needed. The pub/sub pattern means any component calling `useSettings()` re-renders atomically when settings change, without a context provider re-rendering the entire tree.

**Trade-offs**: No settings context available in server components (but settings are client-only by nature). The pub/sub subscription is manual (~30 lines) vs `SettingsProvider` React context which is ~20 lines — comparable complexity.

---

## DEV-018: Handler Registry (Dependency Inversion)

**ID**: DEV-018
**Area**: architecture
**Severity**: STRUCTURAL

**Spec says**: `createDocumentHandler` factory function creates handlers, stored in a static map. Handler factory lives in `features/artifacts/handlers/base.ts`. (Implied by spec code structure)

**We do instead**: `ArtifactHandler` is a TypeScript interface defined in `lib/types/artifact-handler.types.ts`. The handler registry lives in `lib/ai/artifact-handlers.ts` with `registerArtifactHandler()` and `getArtifactHandler()`. Individual handlers (text, code, sheet, image) register via **side-effect imports** in `features/artifacts/handlers/index.ts`:
```typescript
// features/artifacts/handlers/index.ts
import './text-handler';   // side-effect: registerArtifactHandler('text', textHandler)
import './code-handler';
import './sheet-handler';
import './image-handler';
```

**Reason**: This is dependency inversion — the registry depends on the `ArtifactHandler` interface (in `lib/types/`), not on concrete handler implementations. New artifact kinds can be added by creating a handler file and importing it, without modifying registry code. This also separates the "what handlers exist" concern from the "how do handlers work" concern.

**Trade-offs**: Side-effect imports are a pattern some developers find surprising. The `handlers/index.ts` file must be imported somewhere to register handlers (e.g., in the chat API route). This is a well-known pattern in plugin architectures.

---

## DEV-019: ChatShell Decomposition (~60 Lines)

**ID**: DEV-019
**Area**: components
**Severity**: MAJOR

**Spec says**: `chat.tsx` is the central chat orchestrator, wiring `useChat`, `DataStreamProvider`, `DataStreamHandler`, messages, input, header, settings, and artifacts into a single component. (P03-T19 in original plan)

**We do instead**: The chat orchestrator is decomposed into:
1. **ChatShell** (`chat-shell.tsx`, ~60 lines) — creates `ChatSessionContext.Provider`, renders `Header`, `Messages`, `Input`, and conditionally `ArtifactPanel`
2. **ChatSessionContext** (`chat-session-context.tsx`) — intent-based context providing `sendMessage`, `stop`, `editMessage` callbacks (NOT prop drilling; `reload` removed — `editMessage(msgId, sameContent)` subsumes retry per redesign `state-management.md` §5)
3. **useChatSession** (`use-chat-session.ts`, ~120 lines) — encapsulates `useChat` config, `onSubmit`/`onReload` callbacks via pure `chat-callbacks.ts`
4. **StreamBridge** (`stream-bridge.tsx`, ~20 lines) — thin bridge that reads `ChatStreamProvider` dispatch and calls `processStreamDelta()` pure function
5. **ChatStreamProvider** (`chat-stream-provider.tsx`) — split state/dispatch contexts with RAF batching, replaces `DataStreamProvider`

**Reason**: The original `chat.tsx` was a ~300-line "God Component" mixing state management, side effects, UI layout, and streaming logic. Decomposing into focused pieces:
- ChatShell is trivially readable and testable
- `useChatSession` can be unit-tested with mock `useChat`
- `processStreamDelta()` is a pure function: input delta → state update, no side effects
- ChatSessionContext eliminates 8+ props being drilled through 4 levels

**Trade-offs**: More files (5 instead of 1). But each file is single-purpose and under 120 lines, making them individually comprehensible and testable.

---

## DEV-020: proxy.ts Replaces middleware.ts

**ID**: DEV-020
**Area**: infrastructure
**Severity**: STRUCTURAL

**Spec says**: `middleware.ts` handles auth token refresh, guest rotation, and rate limiting at the Next.js middleware edge layer. (P02-T10 in original plan)

**We do instead**: `proxy.ts` at project root replaces `middleware.ts`. Same functionality (auth guard, guest token rotation, rate-limit check) but uses the Next.js 16 middleware proxy pattern.

**Reason**: The existing `oldapp/proxy.ts` already demonstrates this pattern. Next.js 16 uses `proxy.ts` as the standard middleware file for edge-level request interception. Using the framework convention improves discoverability and aligns with `.next-docs/` documentation.

**Trade-offs**: Must ensure Next.js 16 proxy.ts API is used correctly (verify against `.next-docs/`). Any references to `middleware.ts` in documentation must be updated.

---

## DEV-021: DataStreamProvider/Handler → ChatStreamProvider/StreamBridge

**ID**: DEV-021
**Area**: naming
**Severity**: MINOR

**Spec says**: `DataStreamProvider` and `DataStreamHandler` manage the SSE data stream from the Vercel AI SDK. (P03-T12 in original plan)

**We do instead**: Renamed for clarity:
- `DataStreamProvider` → `ChatStreamProvider` (describes what it provides: chat stream state)
- `DataStreamHandler` → `StreamBridge` (describes what it does: bridges stream events to stores)

**Reason**: The Vercel AI SDK already exports a `DataStreamHandler` type. Our component does something different — it's a React bridge that reads stream events and writes to stores. "StreamBridge" is accurate and avoids naming collision. "ChatStreamProvider" clarifies it's specific to chat (not a generic data stream), and uses split state/dispatch contexts with RAF batching.

**Trade-offs**: Deviates from Vercel AI SDK naming conventions. Anyone familiar with the SDK must learn the new names. Clear documentation and consistent usage mitigate this.

---

## DEV-022: OptimisticChatsProvider → PendingChatsProvider

**ID**: DEV-022
**Area**: naming
**Severity**: MINOR

**Spec says**: `OptimisticChatsProvider` provides optimistic UI for chat creation in the sidebar. (P05-T01 in original plan)

**We do instead**: Renamed to `PendingChatsProvider`.

**Reason**: "Optimistic" implies React's `useOptimistic` pattern, which is not what this provider does. It manages chats that have been created but not yet confirmed by the server (pending state). The provider API is `add`, `remove`, `updateTitle`, `markConfirmed` — all operations on a pending set. "Pending" accurately describes the lifecycle state, while "optimistic" is misleading.

**Trade-offs**: None. A naming improvement with no functional change.

---

## DEV-023: Cross-Feature UI Composition Allowlist

**ID**: DEV-023
**Area**: architecture
**Severity**: MINOR

**Spec says**: Cross-feature imports should be types/schemas-only (with a minimal exception profile).

**We do instead**: Keep a narrow, explicit allowlist for UI composition imports that are integration seams in practice (documented in `architecture/conventions.md` and enforced by `scripts/check-imports.mjs`).

**Reason**: Certain UI composition points are naturally cross-feature (e.g., chat surface embedding visibility/model selectors and voting controls). Keeping them explicit/allowlisted is clearer and safer than ad-hoc exceptions in implementation.

**Trade-offs**: Slightly broader exception surface than baseline redesign guidance; mitigated by a centralized allowlist + CI enforcement and explicit documentation.

---

## DEV-024: DataContext Removal (Reconciliation)

<!-- audit: HC-3 — DataContext removal documented as reconciliation deviation -->

**ID**: DEV-024
**Area**: data
**Severity**: MAJOR

**Plan originally said**: `DataContext` type (`{userId, isGuest}`) parameter on all read functions per ADR-002, `patterns.md` §1, and `improvements.md` §2. Guest-vs-auth branching embedded in the data layer via `DataContext.isGuest`.

**We do instead**: DataContext removed from all read function signatures. Functions use bare-ID parameters: `getChatById(id: string)`. Auth/ownership checks happen at the action/page level, not the data level.

**Reason**: The redesign's unified DB persistence for guests eliminates the guest-vs-auth branching that ADR-002 originally argued for. Redesign `data-flow.md` §2/§7 consistently uses bare-ID signatures (e.g., `getCachedChat(chatId: string)`). Threading DataContext through every data function adds parameter noise with no architectural benefit under the redesign's model. ADR-002 is now marked as superseded.

**Trade-offs**: None. This is a simplification — fewer parameters, less indirection, same functionality. <!-- audit: AMB-2 — data-context.types.ts fully removed from scaffold (file, type definition, and all plan references). No retention. -->

**Reconciliation**: HC-3 (Wave 3 cross-unit reconciliation). ADR-002 marked as superseded.

---

## DEV-025: `features/auth/lib/session.ts` Removed

<!-- audit: AU-V2 — session.ts removal documented as deviation -->

**ID**: DEV-025
**Area**: auth
**Severity**: MEDIUM

**Redesign says**: `features/auth/lib/session.ts` appears in `directory-structure.md` as part of the auth feature module.

**We do instead**: `getAppSession()` lives exclusively in `lib/auth/session.ts` (infrastructure layer). No `features/auth/lib/session.ts` file exists.

**Reason**: Session resolution is cross-cutting infrastructure consumed by every feature and every page/layout. Placing it in `features/auth/lib/` would violate the import hierarchy (features should not be imported by `lib/` or by other features' core paths). The redesign contains the file in both `lib/auth/` and `features/auth/lib/` locations — this is a self-contradiction. `lib/auth/session.ts` is the canonical location per `conventions.md` §1 and actual usage patterns throughout the plan.

**Trade-offs**: None. The redesign's inclusion of `session.ts` in both locations was contradictory; resolving to `lib/auth/` aligns with the cross-cutting nature of session resolution.

**Reconciliation**: AU-V2 (Wave 2 auth audit). Dropped without documented deviation; now documented.

---

## DEV-026: Cross-Feature UI Component Imports (Page-Level Composition → Direct Imports)

<!-- audit: W4-CFI — cross-feature UI composition deviation documented per W2 CFI-02, W3 import-boundary-conflicts §2/§9 -->

**ID**: DEV-026
**Area**: architecture
**Severity**: MEDIUM

**Redesign says**: `domain-boundaries.md` §1 states `features/chat/` has "Imports from other features: **NONE** (types only via `lib/types/`)". §2 Cross-Feature Communication Channels prescribes page-level composition for UI integration — e.g., "Props from page → VoteButtons" with typed contract `initialVotes: Vote[]`, meaning `app/` pages import cross-feature components and pass them down via props/slots. §2 "What Is NOT Allowed" table explicitly lists: "Direct cross-feature component imports — Only type imports via `lib/types/`".

**We do instead**: Three cross-feature UI component imports use direct feature-to-feature imports instead of page-level composition:

| # | Import | From | To | Redesign Mechanism |
|---|--------|------|----|-------------------|
| 3 | `VoteButtons` | `features/voting/components/vote-buttons.tsx` | `features/chat/components/message.tsx` | "Props from page → VoteButtons" (page-level) |
| 4 | `VisibilitySelector` | `features/visibility/components/visibility-selector.tsx` | `features/chat/components/chat-header.tsx` | Not in redesign communication channels table |
| 5 | `ModelSelector` | `features/models/components/model-selector.tsx` | `features/chat/components/chat-header.tsx` | Not in redesign communication channels table |

These are exceptions #3–#5 in `conventions.md` §3 cross-feature allowlist table.

**Reason**: Page-level composition for these components requires multi-level prop drilling that adds complexity without proportionate architectural benefit:

- **VoteButtons**: Page-level composition requires 4 levels of prop threading (page → ChatShell → Messages → Message). `message.tsx` knows *where* VoteButtons should appear (after assistant message content, in the actions area) — the page has no knowledge of this placement.
- **VisibilitySelector**: 2 levels (page → ChatShell → ChatHeader). Functionally required — users must toggle visibility while chatting.
- **ModelSelector**: 2 levels (page → ChatShell → ChatHeader). Model selection is deferred to P6-T05 in the redesign's own phase plan; the import pattern is the plan's decision.

Direct imports are simpler code, co-locate rendering logic with its placement context, and avoid render-prop or slot patterns for single-use component integrations.

**Context**: The redesign's "NONE" claim for chat feature imports was already self-contradicted by the redesign itself — §5 documents `artifactStore` as "the one intentional exception" and §2 Communication Channels table shows `useSettings()` from settings → chat. The plan inherits these two exceptions (#1, #2) and adds three more (#3–#5) using the same pragmatic rationale.

**Trade-offs**: `features/chat/` now depends on `features/voting/`, `features/visibility/`, and `features/models/` at the component level. This widens the cross-feature dependency surface from 1 declared exception (redesign) to 5 component/hook imports. Features cannot be removed without touching chat internals. Bundle-level code splitting is slightly less clean. These trade-offs are mitigated by the `conventions.md` §3 centralized allowlist and CI enforcement via `scripts/check-imports.mjs`.

**Reconciliation**: W4-CFI (Wave 4 cross-feature infrastructure). Per W2 CFI-02 (MEDIUM-HIGH), W3 import-boundary-conflicts §2/§9 action A1.

---

## DEV-027: StreamBridge Callback Pattern (Not Direct artifactStore Import)

<!-- audit: SC-4, W2-CHAT-01 — StreamBridge callback deviation formalized (Wave 4 chat reconciliation) -->

**ID**: DEV-027
**Area**: streaming / cross-feature coupling
**Severity**: MEDIUM

**Redesign says**: `streaming-architecture.md` §3 StreamBridge code directly imports `artifactStore` from `@/features/artifacts/lib/artifact-store` and calls `artifactStore.setState(artifact)`. `domain-boundaries.md` §5 declares this the ONE intentional exception to the cross-feature import rule.

**We do instead**: StreamBridge accepts an `onArtifactDelta?: (artifact: UIArtifact) => void` callback prop. StreamBridge does NOT import `artifactStore` directly. The real wiring happens in P4-T17 when the callback is connected: `<StreamBridge id={id} onArtifactDelta={artifactStore.setState} />`.

**Reason**: The callback pattern improves phase separation and testability:
1. **Phase isolation**: P3 (chat core) does not depend on P4 (artifacts) infrastructure. StreamBridge can be implemented and tested in P3 without the artifact store existing.
2. **Testability**: StreamBridge can be unit-tested by passing a mock callback, without mocking `artifactStore`.
3. **Coupling location**: The cross-feature import of `artifactStore` moves from the bridge implementation to the wiring point (the page or ChatShell component that composes them — `app/` is allowed to import from any feature).
4. **Final runtime behavior is identical**: At runtime, `onArtifactDelta` IS `artifactStore.setState`, producing the same state updates.

**Trade-offs**: One level of indirection (callback prop instead of direct import). Trivial — the wiring is a single prop assignment in P4-T17.

**Reconciliation**: W2-CHAT-01 (MEDIUM), W3 chat-artifacts Conflict 1. Both chat and artifacts W2 reports agree on the facts; this formalizes the deviation.

---

## DEV-028: TooltipProvider at Root Layout

<!-- audit: W4-SC-04 — TooltipProvider placement resolved as root-level provider -->

**ID**: DEV-028
**Area**: provider tree / UI
**Severity**: LOW

**Redesign says**: `cleanup-inventory.md` §3 #27 moved TooltipProvider from root layout to point of consumption (sidebar, chat header), eliminating a global wrapper.

**We do instead**: TooltipProvider retained at root layout level, wrapped inside the provider tree by P2-T08. Provider order: `ThemeProvider > SessionProvider > TooltipProvider > children`.

**Reason**: Only two consumption points exist — sidebar (P5-T08) and chat header (P3-T19). Per-point wrapping would duplicate `<TooltipProvider>` wrappers in both locations with zero architectural benefit. A single root-level provider is simpler, avoids scattered wrapper duplication, and reduces implementation surface across two separate phases.

**Trade-offs**: Tooltip styles loaded globally even when no tooltips are visible. Negligible performance impact — TooltipProvider is a lightweight context wrapper with no DOM output until a tooltip is triggered.

**Reconciliation**: SC-04, CONFLICT-02, Wave 3 auth-proxy-conflicts.md. Resolved during AMB-1 ambiguity resolution (Wave 4).

---

## DEV-029: Flat smoothStream Delay

<!-- audit: AMB-5, Wave 2 ai-integration report -->

**ID**: DEV-029
**Area**: streaming / AI SDK configuration
**Severity**: MINOR

**Redesign says**: `plan-archives/redesign/ai-integration.md` §5 prescribed `delayInMs: modelId.startsWith('google:') ? 2 : 5` (conditional per provider).

**We do instead**: Flat `delayInMs: 2` used for all providers.

**Reason**: Redesign was internally contradictory — `streaming-architecture.md` §4 prescribed flat 2ms. The 3ms difference is imperceptible to users. Flat value avoids provider-specific branching in `streamText` call.

**Trade-offs**: Marginally faster token display for non-Google providers (2ms vs 5ms). No user-perceptible difference.

**Reconciliation**: AI-W2-02, Wave 2 ai-integration report.

---

## DEV-030: PendingChatsProvider Relocated to `lib/providers/`

<!-- audit: W4-CONF-014, Wave 2 cross-feature report A4 -->

**ID**: DEV-030
**Area**: state / component location
**Severity**: MINOR

**Redesign says**: `domain-boundaries.md` line 451 places PendingChatsProvider at `features/sidebar/hooks/use-pending-chats.tsx` — colocated within the sidebar feature.

**We do instead**: `lib/providers/pending-chats-provider.tsx` — shared provider in `lib/providers/`.

**Reason**: PendingChatsProvider is consumed by both the sidebar (to display pending chats) and the chat feature (to register new chats via `chat-title` stream parts). Placing it inside `features/sidebar/` would require a cross-feature import violation (chat → sidebar). Moving to `lib/providers/` respects the import boundary: features can only import from `lib/`, not from each other. This is architecturally necessary, not just a preference.

**Trade-offs**: Provider is no longer colocated with its primary visual consumer (sidebar). Offset by correctly enforced import boundaries. <!-- W4-CYCLE1: removed false ThemeProvider claim — ThemeProvider is in components/theme-provider.tsx, not lib/providers/ -->

**Reconciliation**: Cross-feature W2 report A4, scaffold W1 U-5/IC-2, sidebar W2 D1. `conventions.md` line 227 is authoritative. `directory-structure.md` updated to remove stale sidebar location.

---

## DEV-031: Visibility Inclusion on ChatSessionValue

<!-- wave4-cleanup: DEV-031 added per CONF-001 resolution -->

**ID**: DEV-031
**Area**: state / cross-feature coupling
**Severity**: MINOR

**Redesign says**: Visibility state managed exclusively within `features/visibility/` module — `useVisibility` hook and `VisibilityType` type owned by that feature. ChatSessionValue has no visibility fields.

**We do instead**: ChatSessionValue includes `visibility` and `setVisibility` as first-class members (CV-01 Option A). The `useChatSession()` hook exposes these alongside all other chat state.

**Reason**: Multiple consumers need visibility state at composition time:
1. **VisibilitySelector** — reads and writes visibility to render the selector UI.
2. **ChatHeader** — reads visibility to display the current sharing status.
3. **prepareSendMessagesRequest** — reads visibility to include it in the request payload.

Placing visibility on the already-shared ChatSessionContext avoids prop drilling and eliminates the need for a separate VisibilityContext provider. The mutation logic (`saveChatVisibility` server action, optimistic update) remains in `features/visibility/` — only the state holder moves to the shared session value.

**Trade-offs**: Slightly wider ChatSessionContext surface (2 additional fields: `visibility: VisibilityType`, `setVisibility: (v: VisibilityType) => void`). Bounded by the TypeScript `ChatSessionValue` interface — consumers cannot access fields not in the type.

**Reconciliation**: CONF-001, Wave 3 reconciliation (chat-session-value.md). Flagged by Wave 4 reports: state-management, visibility, chat, cross-feature.

---

## DEV-032: VotesProvider as Structural Plan Addition

<!-- W4-CYCLE1: added per SOFT-001/DUPL-001 reconciliation -->

**ID**: DEV-032
**Area**: state / component tree
**Severity**: STRUCTURAL

**Redesign says**: No VotesProvider exists in the component tree. VoteResolver uses `use()` to hydrate votes directly with no Context wrapper.

**We do instead**: Adds VotesProvider as a data bridge between VoteResolver and VoteButtons. VotesProvider wraps ChatShell + StreamBridge + VoteResolver at the chat page level. VoteResolver resolves the deferred votes promise via `use()`, then hydrates VotesProvider context. VoteButtons reads per-message vote state from VotesProvider via `useVoteForMessage()`, with `useOptimistic` layered on top for optimistic updates.

**Reason**: The two-layer pattern (`use()` + `useOptimistic`) requires a shared Context to bridge the gap between VoteResolver (which resolves the server promise) and VoteButtons (which render per-message inside the message list). Without VotesProvider, VoteResolver would need to prop-drill the resolved votes map through ChatShell and the entire message tree. VotesProvider eliminates this prop drilling and enables the `useVoteForMessage(messageId)` selector pattern that keeps individual VoteButtons re-renders bounded.

**Trade-offs**: One additional React Context provider in the chat page tree. Re-render scope: when VoteResolver hydrates VotesProvider, all `useVoteForMessage()` consumers (VoteButtons) within the page re-render. This is expected, bounded, and only occurs once per page load.

**Reconciliation**: CONF-020, SOFT-001/DUPL-001. Wave 3 reconciliation (provider-tree-conflicts.md). Flagged independently by state-management D1, chat AMB-CHAT-002, voting A4.
