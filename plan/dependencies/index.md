> **Updated per redesign audit (2026-03-01)**

# Dependencies Index

> All dependency analysis artifacts for the rebuild plan.
> Reflects redesign: 126 tasks across 8 phases. "artifact" naming throughout. No credit/gateway logic. <!-- C2-W4: IC-05/06 fix -->

---

## Files

| File | Description |
|------|-------------|
| [graph.md](graph.md) | Full 126-task dependency graph by phase with parallelization |
| [critical-path.md](critical-path.md) | Critical path analysis with redesign task IDs (P0-T01 through P7-T13) |
| [inter-phase-deps.md](inter-phase-deps.md) | Phase-to-phase dependencies, bridge files, entry/exit states |

## Key Metrics

| Metric | Value |
|--------|-------|
| Total tasks | 126 |
| Phases | 8 (P0–P7) |
| Critical path tasks | ~30 (24%) |
| Estimated duration | ~22–23 working days (with P4/P5 overlap) |
| Longest phase | P3 Chat Core (27 tasks, ~6d on critical path) |
| Max parallelism | P3 (8+ concurrent tracks) |
| Bottleneck tasks | 8 identified |
| Gate tasks | 8 (one per phase: G00–G07) |

## Key Naming (Redesign)

| Old Name | New Name |
|----------|----------|
| OptimisticChatsProvider | PendingChatsProvider |
| DataStreamProvider | ChatStreamProvider |
| DataStreamHandler | StreamBridge |
| AuthProvider | SessionProvider |
| DocumentHandler | ArtifactHandler |
| document (everywhere) | artifact |
| middleware.ts | proxy.ts |
| SettingsProvider | REMOVED (useSyncExternalStore + localStorage) |
| ChatContext | ChatSessionContext |
| VoteHydrator | VoteResolver |

## Related Documents

- Phase definitions: `../../plan-archives/redesign/phase-plan.md`
- Traceability: `plan/traceability/index.md`
- Cleanup inventory: `../../plan-archives/redesign/cleanup-inventory.md`
