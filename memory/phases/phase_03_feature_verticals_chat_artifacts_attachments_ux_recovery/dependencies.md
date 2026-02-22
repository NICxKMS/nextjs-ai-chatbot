# Phase 03 Dependencies

## External Gate
- Every Phase 03 task depends on `P02-T07 (phase_02_data_and_domain_contract_canonicalization_layer)`.

## Intra-Phase Ordering
- `P03-T01` -> `P03-T02`
- `P03-T02` -> (`P03-T03`, `P03-T04`)
- `P03-T03` -> (`P03-T05`, `P03-T06`, `P03-T10`)
- `P03-T04` -> `P03-T07`
- `P03-T05` -> `P03-T08`
- `P03-T06` -> `P03-T09`
- (`P03-T08`, `P03-T09`) -> `P03-T10`
- (`P03-T07`, `P03-T10`) -> `P03-T11`

## Dependency Notes
- Local execution and upload/backpressure contracts are decision-closed and enforced via Phase 03/06 acceptance criteria.
