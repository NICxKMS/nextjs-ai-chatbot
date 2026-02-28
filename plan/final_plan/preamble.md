# Plan Preamble

> Executive summary of the ai-assistant rebuild plan.

---

## Project Summary

Rebuild the Next.js AI chatbot from scratch using Next.js 16, React 19, TypeScript, Drizzle ORM, Supabase, Tailwind v4, Vercel AI SDK, and Biome. The rebuild preserves 100% feature parity with the existing `oldapp/` codebase while applying architectural improvements. The AI layer (31 files, 4881 LOC) is copied verbatim with zero modifications.

**Stack:** Next.js 16 · React 19 · TypeScript strict · Drizzle ORM · Supabase · Tailwind v4 · Vercel AI SDK 4.x · Biome · pnpm

**Target:** 8 phases, 136 tasks, ~19.5 working days estimated.

---

## Key Architectural Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| ADR-001 | Feature collocation (`features/<domain>/`) | Components, hooks, actions, schemas colocated by domain — reduces cross-directory navigation |
| ADR-002 | No Repository pattern — plain exported functions | Drizzle already provides query builder; extra abstraction adds indirection without benefit |
| ADR-003 | No Jotai — SWR + React context + localStorage | Jotai adds a dependency for state that SWR (server cache) + context (UI state) + localStorage (settings) already cover |
| ADR-004 | No `src/` directory | Next.js App Router convention; `app/` at root with `features/`, `lib/`, `components/` alongside |
| ADR-005 | AI primitives global, wrappers colocated | `lib/ai/` holds raw SDK primitives; `features/chat/ai/` and `features/artifacts/ai/` hold domain wrappers |

---

## Deviations from Original Spec

| ID | Spec Prescribed | Actual | Why Better |
|----|----------------|--------|------------|
| DEV-001 | `src/` directory | Root-level `app/`, `features/`, `lib/` | Matches Next.js convention; avoids unnecessary nesting |
| DEV-002 | AI wrappers in `lib/ai/` | Wrappers colocated in `features/*/ai/` | Keeps domain logic with its consumers |
| DEV-003 | Blanket `lib/hooks/` | Hooks colocated in `features/*/hooks/` | Only truly shared hooks in `lib/hooks/`; domain hooks stay with their feature |
| DEV-004 | Auth form in `components/` | Auth form in `features/auth/components/` | Feature collocation consistency |
| DEV-005 | Repository classes | Plain exported functions (`getChat()`, `saveMessage()`) | Drizzle is already the abstraction; no class wrapper needed |
| DEV-006 | Singleton service classes | Plain module exports | ES modules are singletons; class wrappers add nothing |
| DEV-007 | Jotai atoms | SWR + context + localStorage | Fewer dependencies; SWR handles server cache, context handles UI state |
| DEV-008 | `Result<T, E>` type | Native throws + error boundaries | Standard JS error flow; Result type is over-engineering for this app |
| DEV-009 | Mandatory barrel files | Optional barrels, direct imports preferred | Barrels create circular dependency risk; direct imports are clearer |
| DEV-010 | `ApiResponse<T>` envelope for streaming | Direct stream return | Streaming responses don't benefit from JSON envelopes |

Full details: `deviations/deviations-01.md`

---

## Improvements Over Original

| Area | Improvement |
|------|-------------|
| Feature isolation | Each domain is self-contained; no cross-feature imports except through `lib/` |
| AI layer safety | 31 files copied verbatim with content hash verification; zero modification risk |
| Type safety | Strict TypeScript, Zod schemas at all boundaries, no implicit `any` |
| Build verification | Gate task at end of every phase; `pnpm format && pnpm typecheck && pnpm lint` |
| Error handling | 3-level error boundary hierarchy (global → chat → artifact) |
| State management | SWR for server cache (auto-revalidation), context for UI state, localStorage for persistence |
| Import boundaries | Enforced via script: features cannot import from other features; only from `lib/` and `components/` |

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| AI layer drift | High | Content hash verification in P00-T12; copy manifest with checksums |
| Vercel AI SDK breaking changes | Medium | Pin exact versions in package.json; test streaming E2E |
| Next.js 16 API changes | Medium | `.next-docs/` local docs; verify API signatures before use |
| Drizzle schema migration | Medium | P01-T02 migration task with rollback plan |
| Feature interdependency | Low | Vertical slice strategy isolates phases; gate tasks verify each phase |
| SSE reconnection edge cases | Low | P07-T15 with exponential backoff (max 3 retries) |

---

## Success Criteria

1. All 20 features from `features.md` functional and tested
2. All 40 integration seams verified
3. `pnpm build` exits 0 with zero errors
4. `pnpm typecheck` passes strict mode
5. `pnpm lint` and `pnpm format` clean
6. E2E tests pass for all core flows
7. Mobile usable at 320px width
8. AI layer bit-identical to source (hash verification)
9. No console errors in production build
10. Import boundaries enforced — no cross-feature imports
