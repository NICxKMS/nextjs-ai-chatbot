# Spec Interpretation Index

This index tracks extracted migration-spec knowledge from:

- `/.ouroboros/specs/refactor-migration/architecture-v6-final.md`
- `/.ouroboros/specs/refactor-migration/architecture-v6-decisions.md`
- `/.ouroboros/specs/refactor-migration/directory-structure-v6.md`
- `/.ouroboros/specs/refactor-migration/directory-tree-v6.md`
- `/.ouroboros/specs/refactor-migration/functional-structure-v6.md`
- `/.ouroboros/specs/refactor-migration/implementation-plan-v6.md`

## Files

1. `memory/spec/architecture.md`
   - Architecture rules, layer boundaries, module ownership, infra patterns.
2. `memory/spec/conventions.md`
   - Naming, file placement, export/import, operational conventions.
3. `memory/spec/patterns_1.md`
   - Core implementation patterns (repository, routes, errors, streaming, wrappers).
4. `memory/spec/patterns_2.md`
   - Supporting patterns (settings/UI state, hooks, tests, migration mapping).
5. `memory/spec/spec_issues.md`
   - Critical spec critique: ambiguities, contradictions, incompleteness, Next.js 16/AI SDK fit.

## Reading Order

1. `architecture.md` for hard constraints.
2. `conventions.md` for code style and project hygiene.
3. `patterns_1.md`, `patterns_2.md` for reusable implementation templates.
4. `spec_issues.md` before planning execution, to avoid inheriting bad guidance.

## Source Anchor Map

- Architecture foundation: `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#part-i-foundation`
- Architecture patterns: `../../.ouroboros/specs/refactor-migration/architecture-v6-final.md#part-ii-architecture-patterns`
- ADRs: `../../.ouroboros/specs/refactor-migration/architecture-v6-decisions.md`
- Detailed functional contracts: `../../.ouroboros/specs/refactor-migration/functional-structure-v6.md`
- Task decomposition: `../../.ouroboros/specs/refactor-migration/implementation-plan-v6.md`

## Maintenance Notes

- Keep fact extraction separate from critique.
- Add new `patterns_N.md` files if pattern count grows.
- Keep each file under ~400 lines.
