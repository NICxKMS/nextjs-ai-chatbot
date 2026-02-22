# Phases Index

Purpose: phase-organized, dependency-aware rebuild plan for scratch implementation with scaffold-first hard gating.

## Hard Gate Rule
- `phase_00_scaffold` must be fully complete before any task in Phase 01+ starts.
- If any blocking decision task in Phase 00 remains unresolved, all downstream phases remain blocked.

## Phase List
1. [Phase 00 - Scaffold](./phase_00_scaffold/index.md)
2. [Phase 01 - Core Infrastructure Policy Foundation](./phase_01_core_infrastructure_policy_foundation/index.md)
3. [Phase 02 - Data And Domain Contract Canonicalization Layer](./phase_02_data_and_domain_contract_canonicalization_layer/index.md)
4. [Phase 03 - Feature Verticals Chat Artifacts Attachments UX Recovery](./phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery/index.md)
5. [Phase 04 - Shared UI Composition And Wrapper Compliance](./phase_04_shared_ui_composition_and_wrapper_compliance/index.md)
6. [Phase 05 - App Router API Contract Finalization](./phase_05_app_router_api_contract_finalization/index.md)
7. [Phase 06 - Integration Verification And Hardening](./phase_06_integration_verification_and_hardening/index.md)

## Task Totals
- Phase 00: 9
- Phase 01: 8
- Phase 02: 7
- Phase 03: 11
- Phase 04: 7
- Phase 05: 8
- Phase 06: 8
- Total: 58

## Dependency Spine
- Scaffold policy and decision closure -> infra authorities -> contract canonicalization layer -> feature verticals -> shared UI compliance -> API finalization -> integration hardening.
