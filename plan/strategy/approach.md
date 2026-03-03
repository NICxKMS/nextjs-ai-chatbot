> **Updated per redesign audit (2026-03-01)**

# Execution Approach

> Why vertical slices, how feature collocation affects ordering, and risk mitigation.
> Updated to reflect redesign decisions: 126 tasks, 8 phases, ~210 files. <!-- C2-W4: IC-05/06 fix -->
> ChatShell + ChatSessionContext, proxy.ts, useSyncExternalStore, handler registry.

---

## 1. Why Vertical Slices

### The Problem with Horizontal Layers

A layer-by-layer approach (build all DB, then all cache, then all API, then all UI) creates:

1. **Long feedback loops** — You build 15 data access functions before knowing if any of them work end-to-end. Errors in assumptions compound silently.
2. **Integration risk at the end** — All the hard wiring (streaming, data parts, artifact state, provider trees) happens last, when time pressure is highest.
3. **No working software until late** — The app is non-functional until ALL layers are connected. Stakeholders see nothing for weeks.
4. **Scope creep** — Without a working feature to constrain scope, each layer tends to over-build ("we might need this").

### The Vertical Slice Alternative

Each phase delivers a **working feature from database to UI**. After Phase 2, you can log in. After Phase 3, you can chat with an AI. After Phase 4, the AI can create artifacts. Each phase produces a testable, demonstrable increment.

**Benefits:**

| Benefit | Mechanism |
|---------|-----------|
| Early integration validation | Every phase connects DB → cache → action → route → component |
| YAGNI enforcement | Only build data functions needed by the current feature |
| Incremental verification | `pnpm typecheck && pnpm lint` after each phase |
| Rollback granularity | Each phase is a stable checkpoint |
| Parallel work potential | Independent features can be developed simultaneously |

### How Feature Collocation Amplifies Vertical Slices

With feature collocation, each vertical slice is **physically self-contained**:

```
Phase 3 touches:
  features/chat/          ← All chat code lives here
  app/(chat)/             ← Routes for chat
  app/api/chat/           ← API route for streaming
  lib/data/chat.ts        ← Shared data access
  lib/data/message.ts     ← Shared data access
  lib/ai/                 ← Provider, prompts, handler registry
```

No file from Phase 3 is in a random location. Each phase's scope maps directly to directories. This makes:
- Code review per phase tractable (review one feature directory)
- Rollback clean (revert feature directory + its routes)
- Progress visible (feature directory exists = feature implemented)

---

## 2. Phase Ordering Rationale

### Dependency Chain

```
P0 Scaffold
 └─→ P1 Data Foundation
      └─→ P2 Auth
           └─→ P3 Chat Core
                ├─→ P4 Artifacts (depends on chat tools + handler registry)
                └─→ P5 Sidebar (depends on chat history + PendingChatsProvider)
                     └─→ P6 Enhancements (cross-feature)
                          └─→ P7 Polish
```

### Why This Order

| Phase | Rationale |
|-------|-----------|
| **P0 Scaffold** | Everything else depends on config, types, and tooling |
| **P1 Data Foundation** | Every feature reads/writes data. The data layer is the lowest common denominator. Without it, no feature can be built. |
| **P2 Auth** | Every route and action checks authentication. Auth is the gate. Building features without auth means retrofitting auth checks later (error-prone). |
| **P3 Chat Core** | The primary feature. Core value proposition. Chat is the backbone that artifacts, sidebar, and settings plug into. Creates the handler registry that artifacts will register into. |
| **P4 Artifacts** | Depends on chat (AI tool calls create artifacts via handler registry). Artifacts validate the streaming pipeline and useSyncExternalStore pattern. |
| **P5 Sidebar** | Depends on chat (displays chat history). Uses PendingChatsProvider for optimistic updates. SidebarShell is a SERVER component with `'use cache'`. |
| **P6 Enhancements** | Secondary features that augment the core. Voting (Server Actions + useOptimistic), model selection, visibility, file upload — all build on the chat + auth foundation. |
| **P7 Polish** | Error boundaries, loading states, accessibility, responsive design, import boundary verification, final build. Requires all features working. |

### Critical Decisions

**Auth before Chat, not after.** The dual auth system (Supabase + guest JWT) affects authorization, capability gating, and rate limiting across every data path. Building chat without auth primitives produces code that must be rewritten.

**Artifacts after Chat, not in parallel.** Artifacts depend on the handler registry (`lib/ai/artifact-handlers.ts`) and chat-owned tools (`createArtifact`, `updateArtifact`). The StreamBridge processes stream deltas into the artifact store. Building them simultaneously creates circular dependencies during development.

**Sidebar separate from Chat.** Though related, sidebar uses different state management (SWR infinite scroll, PendingChatsProvider context) and has its own UI complexity. SidebarShell is a SERVER component with `'use cache'`, while chat components are client islands. Separating them reduces per-phase complexity.

---

## 3. Shared Infrastructure Strategy

### Build Just Enough, Just In Time

Each phase builds only the `lib/` infrastructure it needs:

| Phase | `lib/` additions |
|-------|-----------------|
| P0 | `lib/types/`, `lib/utils/`, `lib/errors/` (types + AppError shell), `lib/db/schema.ts` |
| P1 | `lib/db/`, `lib/cache/`, `lib/data/` (stubs + core implementations) |
| P2 | `lib/auth/session.ts` |
| P3 | `lib/ai/` (provider, registry, prompts, handler registry, tools, title), `lib/data/chat.ts` + `message.ts` (full) |
| P4 | `lib/data/artifact.ts` (full), artifact handler registration |
| P5 | (no new lib code — uses existing) |
| P6 | `lib/data/vote.ts` (full) |
| P7 | `scripts/check-imports.mjs` (import boundary enforcement) |

This avoids building infrastructure speculatively. Every `lib/` file is written when its first consumer exists.

### The `lib/data/` Staging Problem

Data access functions in `lib/data/` are shared across features. The approach:

1. **Phase 1**: Define `cacheKeys`, cache/revalidation utilities, `withCache()` helper. Create data access files with type stubs.
<!-- audit: W4-CONF-017 — DataContext removed per DEV-024; bare-ID function signatures -->
2. **Phase 3**: Implement `chat.ts` and `message.ts` fully (first real consumers).
3. **Phase 4**: Implement `artifact.ts` fully (NOT document.ts — artifact naming throughout).
4. **Phase 6**: Implement `vote.ts` fully.

This ensures data functions are built and tested alongside their consumers.

---

## 4. Risk Mitigation

### Risk 1: AI SDK Integration Complexity

The chat streaming pipeline (useChat → SSE → StreamBridge → artifactStore) is the most complex integration.

**Mitigation**: Phase 3 focuses exclusively on getting this pipeline working end-to-end. No other features complicate the scope. The phase has explicit verification: "Send a message, receive a streaming response, see it render." ChatShell is kept to ~60 lines with all logic extracted into `useChatSession` hook and pure callback functions.

### Risk 2: Provider Scope Correctness

Providers must be scoped correctly: ThemeProvider + SessionProvider at root layout (app-wide), PendingChatsProvider at chat layout (survives navigation), ChatStreamProvider at chat page (resets on navigation), ChatSessionContext at ChatShell (component-level).

**Mitigation**: The redesign specifies exact provider scoping:
- Root layout (SERVER): `ThemeProvider` → `SessionProvider`
- Chat layout (SERVER): `PendingChatsProvider` → `SidebarProvider`
- Chat page (SERVER): `ChatStreamProvider`
- ChatShell (client): `ChatSessionContext.Provider` (inline, not a separate wrapper)

No monolithic `ChatLayoutClient` with a deep provider stack. Providers are siblings where possible.

### Risk 3: Legacy Reference Drift (Optional ai-elements)

The optional `components/ai-elements/` reference set may diverge from current shared UI/util import paths over time.

**Mitigation**: Keep ai-elements out of critical path; ensure canonical imports for active implementation paths use `@/components/ui/*` and direct `@/lib/utils/*` modules. Validate only if ai-elements are explicitly adopted.

### Risk 4: Database Schema Mismatch

The new schema must exactly match the existing production database.

**Mitigation**: Phase 1 defines the schema AND generates a migration. The migration is validated against the existing database before proceeding. Schema uses `Artifact` table (NOT `Document`). Drizzle's `db:check` command verifies alignment.

### Risk 5: Guest/Auth Data Fork

Data operations must consistently apply auth-aware checks (ownership/visibility rules at the action/page level) without diverging persistence semantics between guest/auth users.
<!-- audit: W4-CONF-017 — DataContext removed per DEV-024; auth checks at action/page level, not data level -->

**Mitigation**: Phase 1 establishes shared auth-aware data patterns (bare-ID function signatures, cache-tagged reads, revalidation). Phase 3 implements the first full chat example; subsequent data modules follow the same guard + persistence model.
<!-- audit: W4-CONF-017 — DataContext removed per DEV-024; bare-ID signatures throughout -->

### Risk 6: Feature Boundary Violations

Developers may accidentally import feature components across boundaries.

**Mitigation**: A CI boundary-check script (`scripts/check-imports.mjs`, ~50 lines) validates import paths. Added in Phase 0 scaffold. One declared exception: `features/chat/components/stream-bridge.tsx` → `features/artifacts/lib/artifact-store.ts`.

### Risk 7: Artifact State Store Complexity

The `useSyncExternalStore` pattern for artifact state must support selective re-renders via `useArtifactSelector`.

**Mitigation**: Phase 4 implements the artifact store as a standalone module (`features/artifacts/lib/artifact-store.ts`) with getSnapshot, subscribe, and setState. The selector hook (`useArtifactSelector(s => s.isVisible)`) only re-renders when the selected slice changes. This is simpler and more performant than the previous SWR synthetic key approach.

---

## 5. Verification Strategy

### Per-Phase Verification

Every phase completes with:

1. **`pnpm format`** — Biome formatting passes
2. **`pnpm typecheck`** — No TypeScript errors
3. **`pnpm lint`** — No Biome violations
4. **Feature-specific verification** — Defined per phase in vertical-slices.md
5. **No regressions** — Previous phase features still work

### Dual-Path Testing Mandate

Integration tests must include both guest and authenticated user paths. Every feature that has different behavior for guest vs. authenticated users must be tested in both modes. This applies to authorization checks, `proxy.ts` routing, session resolution in `getAppSession()`, and UI-level feature gating (e.g., guest cannot vote). Failure to test both paths is a phase gate blocker.

### Integration Checkpoints

| After Phase | Integration Checkpoint |
|-------------|----------------------|
| P2 | Can log in, register, and browse as guest |
| P3 | Can send a message, receive streaming AI response |
| P4 | AI can create an artifact, user can edit it |
| P5 | Full navigation: sidebar, chat switching, new chat |
| P6 | All secondary features work together |
| P7 | `pnpm build` succeeds, E2E tests pass |

### Final Validation

After Phase 7:
- `pnpm build` succeeds (production build)
- All E2E tests pass (Playwright)
- Manual smoke test of every feature
- `scripts/check-imports.mjs` reports zero violations
- Zero occurrences of "document" in code identifiers
- Zero occurrences of credit/gateway/quota terminology
- Performance audit (Core Web Vitals)
- No `oldapp/` imports remain in the new codebase
