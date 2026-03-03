> **Updated per redesign audit (2026-03-01)**

# Strategy

> Execution approach for the rebuild: why vertical slices, how phases are ordered,
> and what each phase delivers. 126 tasks, 8 phases (P0–P7), ~210 files.
> ChatShell + ChatSessionContext, proxy.ts, useSyncExternalStore, handler registry.

## Contents

| Document | Description |
|----------|-------------|
| [approach.md](approach.md) | Vertical slices, feature collocation, risk mitigation (ChatShell, proxy.ts, handler registry) |
| [vertical-slices.md](vertical-slices.md) | All 8 phases: scope, exit criteria, task counts (126 total) |
| [phase-order.md](phase-order.md) | Dependency graph, critical path, 126 tasks / ~210 files, parallelization |

<!-- C2-W4: IC-05/06 fix -->
