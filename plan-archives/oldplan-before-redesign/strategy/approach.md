# Execution Approach

> Why vertical slices, how feature collocation affects ordering, and risk mitigation.

---

## 1. Why Vertical Slices

### The Problem with Horizontal Layers

A layer-by-layer approach (build all DB, then all cache, then all API, then all UI) creates:

1. **Long feedback loops** — You build 15 data access functions before knowing if any of them work end-to-end. Errors in assumptions compound silently.
2. **Integration risk at the end** — All the hard wiring (streaming, data parts, SWR state, provider trees) happens last, when time pressure is highest.
3. **No working software until late** — The app is non-functional until ALL layers are connected. Stakeholders see nothing for weeks.
4. **Scope creep** — Without a working feature to constrain scope, each layer tends to over-build ("we might need this").

### The Vertical Slice Alternative

Each phase delivers a **working feature from database to UI**. After Phase 02, you can log in. After Phase 03, you can chat with an AI. After Phase 04, the AI can create documents. Each phase produces a testable, demonstrable increment.

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
Phase 03 touches:
  features/chat/          ← All chat code lives here
  app/(chat)/             ← Routes for chat
  app/api/chat/           ← API route for streaming
  lib/data/chat.ts        ← Shared data access
  lib/data/message.ts     ← Shared data access
```

No file from Phase 03 is in a random location. Each phase's scope maps directly to directories. This makes:
- Code review per phase tractable (review one feature directory)
- Rollback clean (revert feature directory + its routes)
- Progress visible (feature directory exists = feature implemented)

---

## 2. Phase Ordering Rationale

### Dependency Chain

```
P00 Scaffold
 └─→ P01 Data Foundation
      └─→ P02 Auth
           └─→ P03 Chat Core
                ├─→ P04 Artifacts (depends on chat tools)
                └─→ P05 Sidebar (depends on chat history)
                     └─→ P06 Enhancements (cross-feature)
                          └─→ P07 Polish
```

### Why This Order

| Phase | Rationale |
|-------|-----------|
| **P00 Scaffold** | Everything else depends on config, types, and tooling |
| **P01 Data Foundation** | Every feature reads/writes data. The data layer is the lowest common denominator. Without it, no feature can be built. |
| **P02 Auth** | Every route and action checks authentication. Auth is the gate. Building features without auth means retrofitting auth checks later (error-prone). |
| **P03 Chat Core** | The primary feature. Core value proposition. Chat is the backbone that artifacts, sidebar, and settings plug into. |
| **P04 Artifacts** | Depends on chat (AI tool calls create artifacts). Artifacts are the second most complex feature and validate the data stream pipeline. |
| **P05 Sidebar** | Depends on chat (displays chat history). Simpler than artifacts but needs optimistic updates wired through the provider tree. |
| **P06 Enhancements** | Secondary features that augment the core. Voting, model selection, settings, file upload, visibility — all build on the chat + auth foundation. |
| **P07 Polish** | Error boundaries, loading states, accessibility, responsive design. Requires all features working to add proper polish. |

### Critical Decisions

**Auth before Chat, not after.** The existing app's dual auth system (Supabase + guest JWT) affects every data access path. The `DataContext.isGuest` flag determines cache-only vs cache+DB reads. Building chat without this produces code that must be rewritten.

**Artifacts after Chat, not in parallel.** Artifacts depend on three chat-owned tools (`createDocument`, `updateDocument`, `requestSuggestions`) and the DataStreamHandler pipeline. Building them simultaneously creates circular dependencies during development.

**Sidebar separate from Chat.** Though related, sidebar uses different state management (SWR infinite scroll, optimistic context) and has its own UI complexity (GroupedVirtuoso, date grouping). Separating it reduces per-phase complexity.

---

## 3. Shared Infrastructure Strategy

### Build Just Enough, Just In Time

Each phase builds only the `lib/` infrastructure it needs:

| Phase | `lib/` additions |
|-------|-----------------|
| P00 | `lib/types/`, `lib/utils/`, `lib/errors/` (types + AppError shell) |
| P01 | `lib/db/`, `lib/cache/`, `lib/data/`, `lib/errors/` (full implementation) |
| P02 | `lib/auth/`, `lib/api/guards.ts`, `lib/rate-limit/` |
| P03 | `lib/ai/` (providers, registry), `lib/data/chat.ts` + `message.ts` (full) |
| P04 | `lib/data/document.ts` (full) |
| P05 | (no new lib code — uses existing) |
| P06 | `lib/data/vote.ts` (full), `lib/hooks/` |

This avoids building infrastructure speculatively. Every `lib/` file is written when its first consumer exists.

### The `lib/data/` Staging Problem

Data access functions in `lib/data/` are shared across features. The approach:

1. **Phase 01**: Define `DataContext`, `createDataContext()`, `withCache<T>()`, and `cacheKeys`. Create empty module files with type stubs.
2. **Phase 03**: Implement `chat.ts` and `message.ts` fully (first real consumers).
3. **Phase 04**: Implement `document.ts` fully.
4. **Phase 06**: Implement `vote.ts` fully.

This ensures data functions are built and tested alongside their consumers.

---

## 4. Risk Mitigation

### Risk 1: AI SDK Integration Complexity

The chat streaming pipeline (useChat → SSE → DataStreamHandler → SWR) is the most complex integration. 40 seams were identified, and 10 of them involve chat streaming.

**Mitigation**: Phase 03 focuses exclusively on getting this pipeline working end-to-end. No other features complicate the scope. The phase has explicit verification: "Send a message, receive a streaming response, see it render."

### Risk 2: Provider Tree Order Sensitivity

The root and chat layouts have specific provider nesting requirements (Auth inside SWR, Settings wrapping DataStream, DataStream wrapping OptimisticChats). Wrong order causes silent context failures.

**Mitigation**: Phase 00 stubs the AppShell and ChatLayoutClient with the exact provider order documented in component-wiring.md. Phases fill in provider implementations incrementally.

### Risk 3: ai-elements Import Path Breakage

The 31 ai-elements files import from `@/components/ui/` and `@/lib/utils/`. If these paths change, all 31 files break.

**Mitigation**: Phase 00 copies ai-elements AND ensures `@/components/ui/` and `@/lib/utils/` exist at the expected paths. The paths MUST match the import expectations in ai-elements files.

### Risk 4: Database Schema Mismatch

The new schema must exactly match the existing production database.

**Mitigation**: Phase 01 defines the schema AND generates a migration. The migration is validated against the existing database before proceeding. Drizzle's `db:check` command verifies alignment.

### Risk 5: Guest/Auth Data Fork

Every data operation forks on `DataContext.isGuest`. Missing this in any path causes either guest failures or auth performance degradation.

**Mitigation**: Phase 01 establishes the pattern with `DataContext` and `withCache`. Phase 03 implements the first full example (chat data). Every subsequent data function copies this pattern. Integration tests include both guest and auth paths.

### Risk 6: Feature Boundary Violations

Developers may accidentally import feature components across boundaries.

**Mitigation**: A CI boundary-check script (50 lines) validates import paths. Added in Phase 00 scaffold. Documents which imports are legal and which are forbidden per the conventions.

---

## 5. Verification Strategy

### Per-Phase Verification

Every phase completes with:

1. **`pnpm typecheck`** — No TypeScript errors
2. **`pnpm lint`** — No Biome violations
3. **`pnpm format`** — Code formatted
4. **Feature-specific verification** — Defined per phase in vertical-slices.md
5. **No regressions** — Previous phase features still work

### Integration Checkpoints

| After Phase | Integration Checkpoint |
|-------------|----------------------|
| P02 | Can log in, register, and browse as guest |
| P03 | Can send a message, receive streaming AI response |
| P04 | AI can create a document, user can edit it |
| P05 | Full navigation: sidebar, chat switching, new chat |
| P06 | All secondary features work together |
| P07 | `pnpm build` succeeds, E2E tests pass |

### Final Validation

After Phase 07:
- `pnpm build` succeeds (production build)
- All E2E tests pass (Playwright)
- Manual smoke test of every feature
- Performance audit (Core Web Vitals)
- No `oldapp/` imports remain in the new codebase
