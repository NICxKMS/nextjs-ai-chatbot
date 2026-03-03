> **Updated per redesign audit (2026-03-01)**

# Traceability Index

> All traceability artifacts for the rebuild plan.
> Reflects redesign: 126 tasks (P0-T01 through P7-T13). "artifact" naming. No credit/gateway logic. <!-- C2-W4: IC-05/06 fix -->

---

## Files

| File | Description | Coverage |
|------|-------------|----------|
| [feature-to-task.md](feature-to-task.md) | Maps all 20 features to implementing tasks | 20/20 full |
| [uncovered-features.md](uncovered-features.md) | Features/interactions without full task coverage | 3 gaps resolved, 1 removed |
| [seam-to-task.md](seam-to-task.md) | Maps all 40 seams to implementing tasks | 40/40 (100%) |

## Summary Statistics

- **Features tracked:** 20 (credit/usage alert removed per redesign)
- **Seams tracked:** 40
- **Total tasks:** 126 across 8 phases (P0–P7)
- **Feature coverage:** 100% full
- **Seam coverage:** 100%

## Key Naming (Redesign)

| Old Name | New Name |
|----------|----------|
| DataStreamProvider/Handler | ChatStreamProvider / StreamBridge |
| OptimisticChatsProvider | PendingChatsProvider |
| AuthProvider | SessionProvider |
| DocumentHandler | ArtifactHandler |
| createDocument / updateDocument | createArtifact / updateArtifact |
| VoteHydrator | VoteResolver |

## Related Documents

- Features source: `plan/behavioral_extraction/features.md`
- Interactions source: `plan/ui_parity/interactions.md`
- Phase definitions: `../../plan-archives/redesign/phase-plan.md`
- Cleanup inventory: `../../plan-archives/redesign/cleanup-inventory.md`
- Dependency graph: `plan/dependencies/graph.md`
