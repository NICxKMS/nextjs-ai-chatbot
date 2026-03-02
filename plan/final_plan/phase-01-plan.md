> **Updated per redesign audit (2026-03-01)**

# Phase 1 — Data Foundation

> Database migration infrastructure, cache layer, all data access functions, AI provider foundation, and test fixtures.

---

## Objective

Create the database migration infrastructure, cache layer with revalidation utilities, all data access functions, and AI provider foundation. The data layer uses `artifact` naming throughout — `lib/data/artifact.ts` (NOT `document.ts`). Cache revalidation utilities (`lib/cache/revalidate.ts`) export both `invalidate*` (Server Action / `updateTag`) and `refresh*` (Route Handler / `revalidateTag`) functions. AI registry has NO `vercel-gateway` provider.

**Entry state:** P0 complete — project scaffolded, types/errors/utils defined, schema exists
**Exit state:** All data-access functions type-check with Drizzle schema; cache layer operational; AI providers configured; `pnpm typecheck` passes
**Tasks:** 14

---

## Task Table

| ID | Title | Type | Files Created | Dependencies | Complexity |
|---|---|---|---|---|---|
| P1-T01 | Create DB migration infra | IMPL | `lib/db/migrate.ts`, `drizzle.config.ts` | P0-T04, P0-T18 | M |
| P1-T02 | Create cache client + keys | IMPL | `lib/cache/client.ts` (Upstash Redis), `lib/cache/keys.ts` | P0-T01 | M |
| P1-T03 | Create revalidation utilities | IMPL | `lib/cache/revalidate.ts` (`invalidateChat`/`updateTag`, `refreshChat`/`revalidateTag`, etc.) | P1-T02 | M |
| P1-T04 | Create cache-through helper | IMPL | `lib/cache/with-cache.ts` | P1-T02 | S |
| P1-T05 | Create user data access | IMPL | `lib/data/user.ts` (`getUserByEmail`, `createUser`) | P0-T04 | S |
| P1-T06 | Create chat data access | IMPL | `lib/data/chat.ts` (CRUD + `getChatWithMessages`) | P0-T04, P1-T02 | L |
| P1-T07 | Create message data access | IMPL | `lib/data/message.ts` (`saveMessages`, `deleteTrailingMessages`) | P0-T04 | M |
| P1-T08 | Create artifact data access | IMPL | `lib/data/artifact.ts` (NOT `document.ts` — `getArtifactById`, `saveArtifactVersion`) | P0-T04 | L |
| P1-T09 | Create vote data access | IMPL | `lib/data/vote.ts` (`getVotesByChatId`, `upsertVote`) | P0-T04 | S |
| P1-T10 | Create suggestion data access | IMPL | `lib/data/suggestion.ts` (`getSuggestionsByArtifactId`, `saveSuggestions`) | P0-T04 | S |
| P1-T11 | Create AI provider registry | IMPL | `lib/ai/registry.ts` (conditional: google, openai, openrouter — NO `vercel-gateway`) | P0-T01 | M |
| P1-T12 | Create AI provider wrapper | IMPL | `lib/ai/provider.ts` (`myProvider` with reasoning middleware) | P1-T11 | M |
| P1-T13 | Create test fixtures | IMPL | `tests/fixtures/chat.ts`, `tests/fixtures/artifact.ts`, `tests/fixtures/user.ts`, `tests/fixtures/vote.ts` | P0-T16 | M |
| P1-T14 | Verification gate G01 | VERIFY | — | P1-T01..T13 | S |

---

## Key Changes from Pre-Redesign Plan

| Aspect | Before | After |
|--------|--------|-------|
| Phase naming | P01 | P1 |
| Task count | 16 | 14 (streamlined) |
| Document data functions | `P01-T09: Create document data functions` | `P1-T08: Create artifact data access` (`lib/data/artifact.ts`) |
| Cache revalidation | Not explicit | `P1-T03: lib/cache/revalidate.ts` with `invalidate*` / `refresh*` split |
| AI provider registry | `P01-T11: Auth config` | AI registry explicit: NO `vercel-gateway` provider |
| Test fixtures | `P01-T15: Create test mocks` | `P1-T13: tests/fixtures/artifact.ts` (not document) |
| Rate limiting | Standalone task (P01-T13) | Moved to proxy.ts scope (P0-T14) |
| Data context | Standalone task (P01-T05) | Folded into shared types (P0-T05) |
| Shared hooks | In P01 (P01-T14) | Moved to P0-T10 |
| API utilities | Standalone task (P01-T12) | Removed — route handlers handle auth/response directly |

---

## Entry/Exit States

| State | Condition |
|-------|-----------|
| Entry | P0 gate passed; schema defined; types exported; project compiles |
| Exit | All `lib/data/*.ts` functions type-check with Drizzle schema; `lib/cache/revalidate.ts` exports both `invalidate*` and `refresh*` functions; AI registry has NO `vercel-gateway`; `lib/data/artifact.ts` exists with zero "document" identifiers |

---

## Exit Criteria

- [ ] All `lib/data/*.ts` functions type-check with Drizzle schema
- [ ] `lib/cache/revalidate.ts` exports both `invalidate*` (SA) and `refresh*` (RH) functions
- [ ] `lib/ai/registry.ts` has NO `vercel-gateway` provider
- [ ] `lib/data/artifact.ts` (NOT `document.ts`) — zero "document" identifiers
- [ ] `pnpm typecheck` passes

**Verification:** `pnpm typecheck && pnpm lint`

---

## Seams Addressed

| Seam | Description | Task |
|------|-------------|------|
| SEAM-023 | DB client initialization | P1-T01 |
| SEAM-024 | Cache key collisions (standardized key builders) | P1-T02, P1-T04 |
| SEAM-025 | Data access → schema alignment | P1-T05 through P1-T10 |
| SEAM-REV | Revalidation utility → mutation completeness | P1-T03 |
