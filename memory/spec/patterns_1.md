# Patterns 1: Core Architecture Patterns

Reusable implementation guidance extracted from migration spec.

## Pattern P1: Slim Route Delegate

Intent:
- Keep route handlers focused on protocol edges.

Shape:
1. Parse request body/query.
2. Execute guard(s).
3. Validate with schema helper.
4. Delegate to action/service.
5. Return standardized response.

References:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#7-slim-routes`
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#17-api-utilities-libapi`

## Pattern P2: Guard + Validation Composition

Intent:
- Make auth/authz and input checks composable and explicit.

Building blocks:
- `ensureAuth(...)`
- `ensureOwner(...)`
- `validateBody(schema, body)`

References:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-decisions.md#adr-018-request-guards-pattern`
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#17-api-utilities-libapi`

## Pattern P3: Repository Cache-Through Base

Intent:
- Centralize CRUD + cache policy with shared base behavior.

Core mechanics:
- Reads: cache lookup -> DB fallback -> cache write.
- Writes: DB mutate -> entity cache refresh -> list cache invalidation.
- Separate TTLs for entity/list entries.

References:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#5-repository-pattern-libdata`
- `../../.ouroboros/specs/refactor-migration/architecture-v6-decisions.md#adr-001-repository-pattern-for-data-access`

## Pattern P4: Route-Specific Edge Rate Limits

Intent:
- Treat API endpoints by cost/risk profile.

Mechanics:
- Route map in config (exact + wildcard paths).
- Shared middleware limiter factory.
- Health bypass and optional fail-closed behavior for sensitive auth routes.

References:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#6-route-specific-rate-limiting-edge`
- `../../.ouroboros/specs/refactor-migration/architecture-v6-decisions.md#adr-002-route-specific-rate-limiting-at-edge`

## Pattern P5: AppError Boundary

Intent:
- Normalize error semantics through shared code/status/details model.

Mechanics:
- Throw typed `AppError` variants in actions/guards/services.
- Convert to route response at boundary.
- Keep error metadata machine-readable.

References:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#10-standardized-error-handling`

## Pattern P6: Provider/Handler Streaming Split

Intent:
- Decouple stream connection lifecycle from event side effects.

Mechanics:
- Provider stores stream state and exposes hooks.
- Handler consumes event stream and updates app state.
- Event typing includes text/tool/artifact/reasoning/error.

References:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#8-data-streaming-pattern`
- `../../.ouroboros/specs/refactor-migration/architecture-v6-decisions.md#adr-017-data-streaming-pattern-providerhandler`

## Pattern P7: Two-Layer AI Component Model

Intent:
- Preserve upstream primitives while enabling project-specific behavior.

Mechanics:
- `ai-elements`: immutable copied primitives.
- `ai`: wrappers that integrate app state/actions/guards.
- imports in app/features target wrapper layer.

References:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#111-two-layer-architecture`
- `../../.ouroboros/specs/refactor-migration/architecture-v6-decisions.md#adr-020-two-layer-ai-element-architecture`

## Pattern P8: Feature Module Colocation

Intent:
- Reduce cross-cutting sprawl by packaging each feature as a vertical slice.

Typical layout:
- actions/components/hooks/schemas/(optional lib).

Reference:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#3-complete-directory-structure`

## Pattern P9: Artifact-Domain Unification

Intent:
- Avoid dual naming paths for the same domain concept.

Mechanics:
- Prefer artifact-centric naming across route/repository/feature/types.
- preserve document terminology only for explicit legacy references.

Reference:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-decisions.md#adr-019-artifact-document-unification`
