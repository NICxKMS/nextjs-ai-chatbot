# Dependencies Index

> All dependency analysis artifacts for the rebuild plan.

---

## Files

| File | Description |
|------|-------------|
| [graph.md](graph.md) | Full 135-task dependency graph by phase with parallelization |
| [critical-path.md](critical-path.md) | Critical path analysis: 32 tasks, ~27 working days |
| [inter-phase-deps.md](inter-phase-deps.md) | Phase-to-phase dependencies, bridge files, entry/exit states |

## Key Metrics

| Metric | Value |
|--------|-------|
| Total tasks | 135 |
| Phases | 8 (P00–P07) |
| Critical path tasks | 32 (24%) |
| Estimated duration | ~27 working days |
| Longest phase | P03 Chat Core (5.75d on critical path) |
| Max parallelism | P03 (8+ concurrent tracks) |
| Bottleneck tasks | 8 identified |
| Gate tasks | 8 (one per phase) |

## Related Documents

- Phase definitions: `plan/phases/p00-scaffold.md` through `p07-polish.md`
- Traceability: `plan/traceability/index.md`
- Seam inventory: `plan/integration_map/seam-inventory.md`
