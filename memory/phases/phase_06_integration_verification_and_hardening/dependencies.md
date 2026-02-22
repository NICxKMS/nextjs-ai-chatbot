# Phase 06 Dependencies

## External Gate
- Every Phase 06 task depends on `P05-T08 (phase_05_app_router_api_contract_finalization)`.

## Intra-Phase Ordering
- `P06-T01` -> (`P06-T02`, `P06-T03`, `P06-T04`)
- `P06-T02` -> `P06-T05`
- `P06-T03` -> `P06-T06`
- `P06-T04` -> `P06-T07`
- (`P06-T05`, `P06-T06`, `P06-T07`) -> `P06-T08`

## Dependency Notes
- Integration verification starts with contract fixtures before stress/performance and risk closure activities.
