# Conventions (Spec Facts + Interpreted Guidance)

This file extracts coding, naming, folder, and operational conventions from the migration specs.

## 1) Naming Conventions

From `architecture-v6-final.md` + plan docs:

- Component files: `kebab-case.tsx`
- Action files: `kebab-case.action.ts`
- Hook files: `use-kebab-case.ts`
- Schema files: `kebab-case.schema.ts`
- Service files: `kebab-case.service.ts`
- Repository files: `kebab-case.repository.ts`

Sources:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#22-standardization-rules`
- `../../.ouroboros/specs/refactor-migration/implementation-plan-v6.md#file-naming-conventions`

## 2) Folder Composition Conventions

Feature module baseline:

`features/[feature]/` should typically include:
- `actions/`
- `components/`
- `hooks/`
- `schemas/`
- optional `lib/`

Sources:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#14-dry-pattern-catalog`
- `../../.ouroboros/specs/refactor-migration/directory-structure-v6.md`

## 3) Route Conventions

- App Router route handlers are under `app/api/**/route.ts`.
- Handler shape should remain thin: parse -> guard/validate -> delegate -> respond.
- API validation should be Zod-based.
- API response envelopes should be standardized.

Sources:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#7-slim-routes`
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#17-api-utilities-libapi`

## 4) Error Conventions

- Prefer typed app errors (`AppError`) with explicit code + status.
- Convert to consistent response format in route boundary.
- Avoid throwing raw errors from route handlers.

Source:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#10-standardized-error-handling`

## 5) Export/Barrel Conventions

- Strong preference for named exports.
- `index.ts` barrel files are expected in many folders.
- Barrel strategy used to stabilize import surfaces.

Sources:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#22-standardization-rules`
- `../../.ouroboros/specs/refactor-migration/architecture-v6-decisions.md#adr-008-barrel-exports`

## 6) AI Component Conventions

- AI primitive layer is copy/read-only.
- Wrapper layer adds project state/actions/integration.
- App imports wrappers, not primitives.

Sources:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#111-two-layer-architecture`
- `../../.ouroboros/specs/refactor-migration/architecture-v6-decisions.md#adr-020-two-layer-ai-element-architecture`

## 7) Data/Cache Conventions

- Cache keys should be centralized via helper functions/constants.
- Repository methods own cache behavior and invalidation semantics.
- Entity TTL and list TTL are separately configurable.

Source:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#5-repository-pattern-libdata`

## 8) Testing Conventions

- Unit tests colocated with source (`*.test.ts`).
- Integration tests under `tests/integration/`.
- E2E tests under `tests/e2e/`.

Source:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#24-testing-patterns`

## 9) Operational/Migration Conventions

- Migration is phased (infra -> data -> features -> components -> app routes -> integration/testing).
- Global constraints emphasize no placeholders, strict type/lint checks, and layer rule adherence.
- AI primitives should be copied first, then wrappers built.

Source:
- `../../.ouroboros/specs/refactor-migration/implementation-plan-v6.md#global-constraints`
- `../../.ouroboros/specs/refactor-migration/implementation-plan-v6.md#phase-1-infrastructure-setup`

## 10) Interpreted Convention Priorities

When conventions conflict, preserve this order for planning decisions:

1. Runtime correctness and Next.js-required conventions.
2. Layer boundaries and security posture.
3. Type and schema validation integrity.
4. Naming/file consistency.
5. Barrel/import surface cleanliness.
