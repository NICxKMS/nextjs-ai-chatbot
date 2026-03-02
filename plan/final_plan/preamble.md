> **Updated per redesign audit (2026-03-01)**

# Plan Preamble

> Executive summary of the ai-assistant rebuild plan.
> Server layouts + client islands. ChatShell + ChatSessionContext. `useSyncExternalStore` for artifact state.
> `proxy.ts` (not middleware.ts). "artifact" naming throughout. No credit/gateway logic.

---

## Project Summary

Rebuild the Next.js AI chatbot from scratch using Next.js 16, React 19, TypeScript, Drizzle ORM, Supabase, Tailwind v4, Vercel AI SDK, and Biome. The rebuild achieves 100% feature parity while applying significant architectural improvements identified in the redesign audit. The architecture follows server-first principles: server layouts with client islands, thin orchestrator components (ChatShell ~60 lines), `useSyncExternalStore` for artifact state, and `revalidateTag`/`updateTag` after every mutation.

**Stack:** Next.js 16 · React 19 · TypeScript strict · Drizzle ORM · Supabase · Tailwind v4 · Vercel AI SDK 5.x · Biome · pnpm

**Target:** 8 phases, 125 tasks, ~210 files.

**Decision hierarchy:** Correctness → Architecture → Consistency → Performance → Speed
**Reuse hierarchy:** Reuse → Extend → Refactor → Create

---

## Key Architectural Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| ADR-001 | Three-layer architecture (`app/` → `features/` → `components/` + `lib/`) | Clean import boundaries, enforced at CI. Features self-contained by domain |
| ADR-002 | Server layouts + client islands (NO monolithic `'use client'`) | Layouts are server components; `'use client'` boundary pushed as low as possible (CRITICAL-1 fix) |
| ADR-003 | ChatShell + ChatSessionContext replaces God Component | Thin ~60-line orchestrator provides context; logic in hooks/pure functions (CRITICAL-2 fix) |
| ADR-004 | `useSyncExternalStore` for artifact state | Replaces SWR-as-state-store; `useArtifactSelector(s => s.isVisible)` re-renders only on change |
| ADR-005 | `revalidateTag`/`updateTag` after every mutation | Server Actions use `updateTag` (immediate); Route Handlers use `revalidateTag(tag, 'max')` (background) (CRITICAL-3 fix) |
| ADR-006 | ChatStreamProvider with split contexts (state/dispatch) + RAF batching | High-frequency streaming updates don't cascade re-renders |
| ADR-007 | Handler registry in `lib/ai/artifact-handlers.ts` (dependency inversion) | Chat ↔ Artifacts communicate via shared interface, not direct imports |
| ADR-008 | PendingChatsProvider wraps sidebar + content | Single channel for optimistic chat title delivery (no polling, no window events) |
| ADR-009 | `proxy.ts` replaces `middleware.ts` | Next.js 16 convention; auth guard, guest token rotation, rate-limit check |
| ADR-010 | No credit/gateway/quota logic | `vercel-gateway` provider, `activate_gateway` error, credit AlertDialog all removed |
| ADR-011 | "artifact" naming everywhere | DB table, data layer, cache keys, AI tools, handlers, components, API routes — zero "document" identifiers |
| ADR-012 | No `src/` directory | Next.js App Router convention; `app/` at root with `features/`, `lib/`, `components/` alongside |
| ADR-013 | Feature collocation (`features/<domain>/`) | Components, hooks, actions, schemas, types colocated by domain |
| ADR-014 | No Repository pattern — plain exported functions | Drizzle already provides query builder; extra abstraction adds indirection without benefit |
| ADR-015 | SettingsProvider removed — `useSyncExternalStore` + localStorage | Direct store subscription via `useSettings()` hook, no provider wrapper needed |

---

## Naming Conventions (Redesign)

| Old Name | New Name | Reason |
|----------|----------|--------|
| OptimisticChatsProvider | PendingChatsProvider | Clearer intent — manages pending/optimistic chat entries |
| DataStreamProvider | ChatStreamProvider | Scoped to chat streaming, split state/dispatch contexts |
| DataStreamHandler | StreamBridge | Thin ~20-line bridge, not a handler with complex logic |
| AuthProvider | SessionProvider | Provides session context, not auth state machine |
| VoteHydrator | VoteResolver | Resolves deferred vote promise via `use()` |
| ChatContext / useChatContext | ChatSessionContext / useChatSessionContext | Explicit scope — session-level chat state |
| ChatContextValue | ChatSessionValue | Matches context naming |
| documentId | artifactId | Artifact naming throughout |
| SettingsProvider | *(removed)* | `useSyncExternalStore` + localStorage replaces provider |
| document (artifact context) | artifact | Consistent "artifact" naming |
| createDocument / updateDocument | createArtifact / updateArtifact | Artifact naming in AI tools |
| middleware.ts | proxy.ts | Next.js 16 convention |
| DocumentHandler | ArtifactHandler | Artifact naming for handler interface |
| DocumentKind | ArtifactKind | Artifact naming for kind enum |

---

## Deviations from Original Spec

| ID | Spec Prescribed | Actual | Why Better |
|----|----------------|--------|------------|
| DEV-001 | `src/` directory | Root-level `app/`, `features/`, `lib/` | Matches Next.js convention; avoids unnecessary nesting |
| DEV-002 | AI wrappers in `lib/ai/` | Wrappers colocated in `features/*/lib/` | Keeps domain logic with its consumers |
| DEV-003 | Blanket `lib/hooks/` | Hooks colocated in `features/*/hooks/` | Only truly shared hooks in `lib/hooks/`; domain hooks stay with their feature |
| DEV-004 | Auth form in `components/` | Auth form in `features/auth/components/` | Feature collocation consistency |
| DEV-005 | Repository classes | Plain exported functions (`getChat()`, `saveMessage()`) | Drizzle is already the abstraction; no class wrapper needed |
| DEV-006 | Singleton service classes | Plain module exports | ES modules are singletons; class wrappers add nothing |
| DEV-007 | SWR-as-state-store for artifacts | `useSyncExternalStore` + selector pattern | Fine-grained re-renders; no synthetic SWR keys |
| DEV-008 | `Result<T, E>` type | `ActionResult<T>` for Server Actions; native throws + error boundaries elsewhere | Structured SA errors; standard JS flow elsewhere |
| DEV-009 | Mandatory barrel files | Optional barrels, direct imports preferred | Barrels create circular dependency risk; direct imports are clearer |
| DEV-010 | `ApiResponse<T>` envelope for streaming | Direct stream return | Streaming responses don't benefit from JSON envelopes |
| DEV-011 | Monolithic `'use client'` layout | Server layout + client islands | Server-first architecture (Principle 1); no ChatLayoutClient anti-pattern |
| DEV-012 | SettingsProvider context | `useSyncExternalStore` + localStorage hook | Simpler; no provider wrapper needed; reactive without context |

Full details: `deviations/deviations-01.md`

---

## Improvements Over Original

| Area | Improvement |
|------|-------------|
| Server-first rendering | Layouts are server components; client islands for interactivity only |
| ChatShell decomposition | ~60-line thin orchestrator; business logic in hooks + pure functions |
| Artifact state | `useSyncExternalStore` with selector for surgical re-renders |
| Cache revalidation | `updateTag` (SAs) / `revalidateTag` (RHs) after every mutation — immediate or cooperative cache freshness |
| Streaming architecture | ChatStreamProvider with split contexts + RAF batching; StreamBridge ~20 lines |
| Feature isolation | Three-layer architecture with CI-enforced import boundaries |
| Naming consistency | "artifact" everywhere — zero "document" in code identifiers |
| Provider scoping | Providers scoped tightly: ThemeProvider/SessionProvider (root), PendingChatsProvider (layout), ChatStreamProvider (page), ChatSessionContext (component) |
| Error handling | `ActionResult<T>` for SAs; `AppError.toResponse()` for RHs; error boundaries at route group level |
| Type safety | Strict TypeScript, Zod schemas at all boundaries, no implicit `any` |
| Import boundaries | Enforced via CI script: `features/` cannot import from other features' implementations |
| Title delivery | Server-side awaited before stream close; single channel via PendingChats.updateTitle() — no polling |

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Next.js 16 API changes (`use cache`, `proxy.ts`) | Medium | `.next-docs/` local docs; verify API signatures before use |
| Vercel AI SDK breaking changes | Medium | Pin exact versions in package.json; test streaming E2E |
| Drizzle schema migration | Medium | P1-T01 migration task with rollback plan |
| Feature interdependency | Low | Vertical slice strategy isolates phases; gate tasks verify each phase |
| SSE reconnection edge cases | Low | Resilient streaming principle — partial saves on abort, exponential backoff |
| `useSyncExternalStore` server hydration | Low | Store uses client-only snapshot; server returns `null` initial state |

---

## Success Criteria

1. All 20 features functional and tested
2. All integration seams verified
3. `pnpm build` exits 0 with zero errors
4. `pnpm typecheck` passes strict mode
5. `pnpm lint` and `pnpm format` clean
6. E2E tests pass for all core flows
7. Mobile usable at 320px width
8. No console errors in production build
9. Import boundaries enforced — no unauthorized cross-feature implementation imports (allowlist exceptions only)
10. Zero "document" in code identifiers (artifact naming verified by grep)
11. Zero credit/gateway/quota terminology in codebase
12. `proxy.ts` exists (not `middleware.ts`)
13. ChatShell is ~60 lines (not a God Component)
14. All Server Actions return `ActionResult<T>` (never throw)
