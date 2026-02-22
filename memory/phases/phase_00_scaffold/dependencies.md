# Phase 00 Dependencies

## Intra-Phase Ordering
- `P00-T01` -> (`P00-T02`, `P00-T03`, `P00-T04`, `P00-T05`, `P00-T06`)
- (`P00-T02`, `P00-T03`) -> `P00-T07`
- `P00-T04` -> `P00-T08`
- `P00-T05` -> `P00-T08`
- `P00-T06` -> `P00-T08`
- (`P00-T07`, `P00-T08`) -> `P00-T09`

## Dependency Notes
- Decision tasks are intentionally early because unresolved blockers invalidate all downstream phase planning.
- `P00-T09` is the single gate-check task that must produce explicit pass/fail evidence.
