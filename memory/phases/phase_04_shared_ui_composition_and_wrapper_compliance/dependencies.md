# Phase 04 Dependencies

## External Gate
- Every Phase 04 task depends on `P03-T11 (phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery)`.

## Intra-Phase Ordering
- `P04-T01` -> (`P04-T02`, `P04-T03`)
- (`P04-T02`, `P04-T03`) -> (`P04-T04`, `P04-T05`)
- `P04-T04` -> `P04-T06`
- (`P04-T05`, `P04-T06`) -> `P04-T07`

## Dependency Notes
- Wrapper compliance is validated before broad a11y/responsive hardening to prevent rework.
