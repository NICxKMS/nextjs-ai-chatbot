# Phase 01 Dependencies

## External Gate
- Every Phase 01 task depends on `P00-T09 (phase_00_scaffold)`.

## Intra-Phase Ordering
- `P01-T01` -> (`P01-T02`, `P01-T03`)
- `P01-T02` -> (`P01-T05`, `P01-T06`)
- `P01-T03` -> (`P01-T04`, `P01-T07`)
- (`P01-T04`, `P01-T05`, `P01-T06`, `P01-T07`) -> `P01-T08`

## Dependency Notes
- Policy modules are producers; route/feature adapter tasks are consumers.
