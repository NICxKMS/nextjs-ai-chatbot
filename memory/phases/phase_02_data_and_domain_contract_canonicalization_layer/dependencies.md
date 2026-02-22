# Phase 02 Dependencies

## External Gate
- Every Phase 02 task depends on `P01-T08 (phase_01_core_infrastructure_policy_foundation)`.

## Intra-Phase Ordering
- `P02-T01` -> (`P02-T02`, `P02-T03`)
- `P02-T02` -> (`P02-T04`, `P02-T05`)
- `P02-T03` -> (`P02-T05`, `P02-T06`)
- (`P02-T04`, `P02-T05`, `P02-T06`) -> `P02-T07`

## Dependency Notes
- Canonical domain contracts and repository contracts are upstream producers for feature and route phases.
