# Architecture Rules (Spec Facts)

This file captures **spec-stated facts** and interpreted architecture constraints, without critique.

## 1) Layer Model and Responsibilities

Primary stack (top to bottom), from `architecture-v6-final.md`:

1. Edge: `middleware.ts` for auth/rate-limit/routing gates.
2. Routes: `app/api/*/route.ts`, intentionally slim.
3. Actions: feature action modules for orchestration/business logic.
4. Data access: `lib/data/` repository abstraction.
5. Infrastructure: `lib/db`, `lib/cache`, `lib/ai`, `lib/auth`.

Source:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#1-layer-overview`

## 2) Import Hierarchy and Boundary Rules

Spec import matrix (intended):

- `app/` can import: `features`, `components`, `lib`, `src`.
- `features/` can import: `components`, `lib`, `src` (and action-level cross-feature use).
- `components/` can import: `lib`, `src`.
- `lib/` can import: `src`.
- `src/` imports nothing above.

Source:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#2-srp-responsibility-matrix`
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#23-eslint-boundary-rules`

## 3) Module Ownership

### `app/`
- Owns route definitions, layouts, pages, route handlers.
- Routes should parse/guard/delegate/respond, not own business workflows.

### `features/`
- Owns feature-bounded business workflows and local composition:
  - `actions/`
  - `components/`
  - `hooks/`
  - `schemas/`
  - optional `lib/`

### `components/`
- Owns shared UI components not tightly coupled to one feature.
- Includes read-only AI primitives and editable AI wrappers.

### `lib/`
- Owns infra concerns and cross-feature framework code:
  - DB/cache/auth/ai clients and config.
  - API guards/validation/response helpers.
  - error system.
  - shared hooks.

### `src/`
- Owns pure/shared low-level utilities and type surfaces.

Source:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#2-srp-responsibility-matrix`
- `../../.ouroboros/specs/refactor-migration/directory-structure-v6.md`

## 4) Data Access Architecture

Repository pattern is the canonical DAL:

- Base abstractions:
  - `IReadRepository<T>`
  - `IWriteRepository<T, TCreate, TUpdate>`
  - `BaseRepository<T, TCreate, TUpdate>`
- Repositories encapsulate:
  - DB IO,
  - cache-through reads,
  - invalidation on writes.

Rules:
- Data access must flow through repositories.
- Routes/actions should avoid direct DB calls.

Source:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#5-repository-pattern-libdata`
- `../../.ouroboros/specs/refactor-migration/architecture-v6-decisions.md#adr-001-repository-pattern-for-data-access`

## 5) Edge/Middleware Architecture

Rate limiting is centralized in middleware with route-specific configuration:

- Config in `lib/rate-limit/config.ts`.
- Enforcement in `middleware.ts`.
- Supports wildcard route policies, bypass list, IP whitelist.

Source:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#6-route-specific-rate-limiting-edge`
- `../../.ouroboros/specs/refactor-migration/architecture-v6-decisions.md#adr-002-route-specific-rate-limiting-at-edge`

## 6) API Route Architecture

Routes should be slim and compose helpers:

- Guard (`ensureAuth`/etc).
- Validate (`validateBody` + Zod).
- Delegate to action/service.
- Return standardized response shape.

Source:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#7-slim-routes`
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#17-api-utilities-libapi`

## 7) Error Architecture

Single app-level error model:

- `AppError` + typed error codes.
- Route/action handling converts failures into consistent JSON responses.
- Raw/opaque errors discouraged.

Source:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#10-standardized-error-handling`

## 8) AI UI Two-Layer Architecture

Two-layer rule:

1. `components/ai-elements/` (or `src/components/ai-elements/` in some docs): read-only primitives.
2. `components/ai/` wrappers: project behavior/state/actions on top.

Application code should use wrappers instead of primitive layer directly.

Source:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#111-two-layer-architecture`
- `../../.ouroboros/specs/refactor-migration/architecture-v6-decisions.md#adr-020-two-layer-ai-element-architecture`

## 9) Streaming Architecture

SSE orchestration uses Provider/Handler split:

- Provider: stream lifecycle/context state.
- Handler: event parsing and state updates.
- Supports typed event handling (text/tool/artifact/reasoning/error).

Source:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#8-data-streaming-pattern`
- `../../.ouroboros/specs/refactor-migration/architecture-v6-decisions.md#adr-017-data-streaming-pattern-providerhandler`

## 10) Artifact Unification Architecture

Domain terminology direction is unified to "artifact":

- document/artifact duality should converge to artifact-centric naming.
- impacts DB table naming, repository naming, feature folder naming, API naming.

Source:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-decisions.md#adr-019-artifact-document-unification`

## 11) Enforcement Architecture

Primary enforcement mechanism is static lint boundaries:

- `no-restricted-imports` patterns for layer dependencies.
- CI expected to reject boundary violations.

Source:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-decisions.md#adr-009-eslint-only-boundary-enforcement`
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#23-eslint-boundary-rules`

## Conclusions (Architecture Intent)

The spec intends a strongly layered, feature-modular App Router system where:

- Route logic is thin.
- Business workflows are feature-owned.
- IO and cache strategy are centralized in repositories.
- Shared primitives are protected behind wrapper layers.
- Policy and nonfunctional controls (rate limit, boundaries, error model) are globally standardized.
