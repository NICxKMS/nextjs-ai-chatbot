> **Updated per redesign audit (2026-03-01)**

# Phase 0 — Scaffold & Infrastructure

> Bootstrap the project from zero: config, shared types, error handling, utilities, UI primitives, root layout, proxy, and test infrastructure.

---

## Objective

Create the project skeleton — config, shared types, error handling, utilities, UI primitives, root layout, proxy, and test infrastructure. The DB schema uses `Artifact` table (NOT `Document`). Error codes have zero credit/gateway codes. `proxy.ts` replaces `middleware.ts` per Next.js 16 convention.

**Entry state:** Empty project directory. `oldapp/` preserved as read-only reference.
**Exit state:** Compilable scaffold with all shared dependencies, types, UI components in place; `pnpm install && pnpm format && pnpm typecheck && pnpm lint` pass.
**Tasks:** 18

---

## Task Table

| ID | Title | Type | Files Created | Dependencies | Complexity |
|---|---|---|---|---|---|
| P0-T01 | Initialize project config | SCAFFOLD | `package.json`, `tsconfig.json`, `next.config.ts`, `biome.json` | none | M |
| P0-T02 | Create tooling config | SCAFFOLD | `postcss.config.mjs`, `vercel.json`, `.env.example`, `.gitignore` | P0-T01 | S |
| P0-T03 | Create Tailwind CSS | SCAFFOLD | `app/globals.css` | P0-T02 | S |
| P0-T04 | Create Drizzle schema + client | IMPL | `lib/db/schema.ts` (`Artifact` table, NOT `Document`), `lib/db/client.ts` | P0-T01 | L |
| P0-T05 | Define core shared types | IMPL | `lib/types/result.types.ts`, `lib/types/model.types.ts`, `lib/types/models.types.ts`, `lib/types/api.types.ts` | P0-T01, P0-T04 | M | <!-- audit: W4-CONF-022 — models.types.ts was missing from this table (present in p00-scaffold.md task detail). 4 files total. --> <!-- audit: W4-CONF-007 — P0-T04 added: models.types.ts uses InferSelectModel from Drizzle schema -->
| P0-T06 | Define artifact shared types | IMPL | `lib/types/artifact.types.ts`, `lib/types/artifact-handler.types.ts` | P0-T05 | M |
| P0-T07 | Define state shared types | IMPL | `lib/types/pending-chats.types.ts`, `lib/types/settings.types.ts` | P0-T05 | S |
| P0-T08 | Create error handling | IMPL | `lib/errors/app-error.ts`, `lib/errors/codes.ts` (NO `activate_gateway`) | P0-T05 | M |
| P0-T09 | Create utility functions | IMPL | `lib/utils/cn.ts`, `lib/utils/format.ts`, `lib/utils/generate-uuid.ts` | P0-T01 | S |
| P0-T10 | Create shared hooks | IMPL | `lib/hooks/use-mobile.ts`, `lib/hooks/use-debounce.ts` | P0-T01 | S |
| P0-T11 | Copy shadcn/ui components | SCAFFOLD | `components/ui/*.tsx` (~32 files incl. sidebar.tsx) | P0-T09 | M |
| P0-T12 | Create shared components | IMPL | `components/theme-provider.tsx`, `components/icons.tsx`, `components/sidebar-toggle.tsx`, `components/toaster.tsx` | P0-T11 | M |
| P0-T13 | Create root layout + global error | IMPL | `app/layout.tsx` (SERVER: html/body, ThemeProvider stub), `app/global-error.tsx` | P0-T12 | M |
| P0-T14 | Create proxy.ts (Next.js 16) | IMPL | `proxy.ts` (auth guard, guest token rotation, rate-limit check) | P0-T01 | M |
| P0-T15 | Create instrumentation stubs | SCAFFOLD | `instrumentation.ts`, `instrumentation-client.ts` | P0-T01 | S |
| P0-T16 | Create test infrastructure | SCAFFOLD | `tests/setup.ts`, `tests/mocks/auth.ts`, `tests/mocks/db.ts`, `tests/mocks/cache.ts` | P0-T04 | M |
| P0-T17 | Create import boundary script | IMPL | `scripts/check-imports.mjs` | P0-T01 | S |
| P0-T18 | Verification gate G00 | VERIFY | — | P0-T01..T17 | S |

---

## Key Changes from Pre-Redesign Plan

| Aspect | Before | After |
|--------|--------|-------|
| Phase naming | P00 | P0 |
| DB schema | Document table implied | `Artifact` table explicitly required; zero "document" identifiers |
| Error codes | Unspecified | NO `activate_gateway`, NO credit/gateway codes |
| Middleware | `middleware.ts` (P00-T14) | `proxy.ts` — Next.js 16 convention |
| Provider composition | Provider composition component (P00-T05) | Removed — server layout composes directly |
| AI elements copy | 31 files copied verbatim (P00-T12) | Removed as standalone task — AI wrappers colocated in features |
| Shared types | Generic `.types.ts` files | Explicit: `artifact.types.ts`, `artifact-handler.types.ts`, `pending-chats.types.ts`, `settings.types.ts` |
| Import enforcement | Not present | `scripts/check-imports.mjs` (P0-T17) |

---

## Entry/Exit States

| State | Condition |
|-------|-----------|
| Entry | Empty project directory; `oldapp/` preserved as read-only reference |
| Exit | `pnpm install` completes; `pnpm typecheck` passes; `pnpm format` passes; `pnpm lint` passes; `proxy.ts` exports `proxy()` + `config.matcher`; DB schema uses `Artifact` table; error codes have zero credit/gateway; root layout renders |

---

## Exit Criteria

- [ ] `pnpm install` completes
- [ ] `pnpm typecheck` passes (all shared types resolve)
- [ ] `pnpm format` passes
- [ ] `pnpm lint` passes (import boundary script runs)
- [ ] `proxy.ts` exports `proxy()` function + `config.matcher`
- [ ] DB schema uses `Artifact` table (NOT `Document`)
- [ ] `lib/errors/codes.ts` has zero credit/gateway codes
- [ ] Root layout renders without errors

**Verification:** `pnpm install && pnpm format && pnpm typecheck && pnpm lint`

---

## Seams Addressed

No integration seams directly — this phase creates the foundation for all subsequent seams.
