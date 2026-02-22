# Patterns 2: Supporting and Operational Patterns

Additional reusable patterns from spec corpus.

## Pattern P10: Settings Type + Defaults Pair

Intent:
- Keep settings statically typed and bootstrappable.

Mechanics:
- `types.ts` defines user/model/system prompt/sampling shapes.
- `defaults.ts` provides serializable baseline values.

Reference:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#18-settings-types-libsettings`

## Pattern P11: Jotai State with Persistence

Intent:
- Handle lightweight global UI state with atomic updates and local persistence.

Mechanics:
- `atomWithStorage` for persisted settings/theme.
- plain `atom` for transient UI state.
- context wrapper for higher-level state APIs.

Reference:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#19-ui-state-libui`

## Pattern P12: Hook Tiering

Intent:
- Keep shared hooks separate from feature-specific hooks.

Mechanics:
- `lib/hooks` for cross-feature generic hooks.
- `features/*/hooks` for domain-coupled hooks.

Reference:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#20-hooks-reference`

## Pattern P13: Colocated Unit + Centralized Integration/E2E

Intent:
- Balance discoverability and system-flow coverage.

Mechanics:
- Unit tests adjacent to implementation files.
- integration and e2e live in dedicated root test folders.

Reference:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#24-testing-patterns`

## Pattern P14: Boundary Enforcement by Lint Policy

Intent:
- Prevent invalid cross-layer imports at authoring time.

Mechanics:
- `no-restricted-imports` patterns reflecting layer graph.
- CI lint as architectural gate.

Reference:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#23-eslint-boundary-rules`

## Pattern P15: ADR-Backed Decision Logging

Intent:
- Preserve rationale/tradeoffs, not only folder outcomes.

Mechanics:
- one ADR per major decision/change.
- include alternatives, trade-offs, mitigations, consequences.

Reference:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-decisions.md`

## Pattern P16: Migration by Ordered Phases

Intent:
- Lower migration risk via dependency-aware sequencing.

Phase flow in plan:
1. Infrastructure
2. Data layer
3. Features
4. Components
5. App Router
6. Integration/testing

Reference:
- `../../.ouroboros/specs/refactor-migration/implementation-plan-v6.md#table-of-contents`

## Pattern P17: Checklist-Based Quality Gates

Intent:
- Keep migration completion criteria explicit and auditable.

Mechanics:
- quality checklist items for naming, routes, errors, responses, cache keys, Zod use.
- success criteria include correctness + architecture adherence.

References:
- `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#27-quality-checklist`
- `../../.ouroboros/specs/refactor-migration/implementation-plan-v6.md#success-criteria`
