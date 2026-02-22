# Phase 05 Tasks

## Reasoning
This phase finalizes external behavior contracts and eliminates ambiguity between runtime, client expectations, and test fixtures.

## Tasks

### P05-T01 - Standardize Route Error Envelope and Status Mapping
- Task ID: `P05-T01`
- Assigned Phase: `phase_05_app_router_api_contract_finalization`
- Behavioral Spec References: `@behavioral_spec/api_contracts.md#conventions`
- Architecture/Deviation References: `@spec/patterns_1.md#pattern-p1-slim-route-delegate`, `@spec/patterns_1.md#pattern-p5-apperror-boundary`
- UI Parity References: N/A
- Success Criteria:
  - Error envelope shape and status mapping are uniform across core endpoints.
  - Shared route error helper contract is fixture-backed for downstream route tasks.
- Dependencies: `P04-T07 (phase_04_shared_ui_composition_and_wrapper_compliance)`
- Complexity: `M`

### P05-T02 - Finalize Chat and Stream Route Authorization Semantics
- Task ID: `P05-T02`
- Assigned Phase: `phase_05_app_router_api_contract_finalization`
- Behavioral Spec References: `@behavioral_spec/api_contracts.md#4-get-apichatidstream`, `@behavioral_spec/edge_cases_1.md#a1-public-chat-access-semantics-uncertain`
- Architecture/Deviation References: `@deviations/routing_deviation.md#d-004`, `@spec/patterns_1.md#pattern-p2-guard-validation-composition`
- UI Parity References: `@ui/parity_checklist_1.md#b3-existing-chat-screen-chatid`
- Success Criteria:
  - Public/private chat read/stream semantics are codified in route behavior.
  - Ownership and non-owner access outcomes are deterministic and testable.
  - Existing-chat readonly-mode and vote-preload authorization semantics are contract-locked and fixture-backed.
- Dependencies: `P05-T01 (phase_05_app_router_api_contract_finalization)`
- Complexity: `M`

### P05-T03 - Finalize Canonical Message and History Contracts
- Task ID: `P05-T03`
- Assigned Phase: `phase_05_app_router_api_contract_finalization`
- Behavioral Spec References: `@behavioral_spec/api_contracts.md#3-get-apichatidmessages`, `@behavioral_spec/api_contracts.md#5-get-apihistory`, `@behavioral_spec/api_contracts.md#11-patch-apivote`, `@behavioral_spec/api_contracts.md#12-post-apifilesupload`
- Architecture/Deviation References: `@deviations/routing_deviation.md#d-005`, `@deviations/performance_deviation.md#d-perf-002`
- UI Parity References: `@ui/parity_checklist_2.md#c2-chat-history-list`
- Success Criteria:
  - Canonical pagination contract is active and documented as the only supported mode.
  - Response examples are stable for integration and e2e fixture usage.
  - Vote and upload contract fixtures cover canonical request/response envelopes, auth posture, and error-code behavior.
- Dependencies: `P05-T01 (phase_05_app_router_api_contract_finalization)`
- Complexity: `M`

### P05-T04 - Finalize Auth and Guest Mutation Route Policy
- Task ID: `P05-T04`
- Assigned Phase: `phase_05_app_router_api_contract_finalization`
- Behavioral Spec References: `@behavioral_spec/api_contracts.md#14-post-apiauthguest`, `@behavioral_spec/api_contracts.md#16-post-apiauthexchange`
- Architecture/Deviation References: `@spec/patterns_1.md#pattern-p4-route-specific-edge-rate-limits`, `@spec/patterns_1.md#pattern-p2-guard-validation-composition`
- UI Parity References: `@ui/parity_checklist_1.md#c1-login-screen-login`, `@ui/parity_checklist_1.md#c2-register-screen-register`
- Success Criteria:
  - CSRF, rate-limit, and token exchange behavior is contractually explicit for auth routes.
  - Guest bootstrap and logout semantics are aligned with lifecycle policy.
  - Login and register async branch outcomes are contract-locked to expected redirect and toast sequencing.
  - Login/register screen UX contracts include responsive layout behavior and submit live-region semantics.
- Dependencies: `P05-T01 (phase_05_app_router_api_contract_finalization)`
- Complexity: `M`

### P05-T05 - Finalize Document/Artifact and Suggestion Route Contract Surface
- Task ID: `P05-T05`
- Assigned Phase: `phase_05_app_router_api_contract_finalization`
- Behavioral Spec References: `@behavioral_spec/api_contracts.md#7-get-apidocumentiddocumentid`, `@behavioral_spec/api_contracts.md#10-get-apisuggestionsdocumentidid`
- Architecture/Deviation References: `@deviations/state_deviation.md#d-003`, `@spec/architecture.md#10-artifact-unification-architecture`
- UI Parity References: `@ui/parity_checklist_2.md#d-artifact-and-document-experience`
- Success Criteria:
  - Route naming and response fields follow approved canonical contract strategy.
  - Suggestion persistence branch behavior remains identity-aware and non-disclosing.
- Dependencies: `P05-T02 (phase_05_app_router_api_contract_finalization)`
- Complexity: `M`

### P05-T06 - Finalize Local Execution API Safety and Fallback Exposure
- Task ID: `P05-T06`
- Assigned Phase: `phase_05_app_router_api_contract_finalization`
- Behavioral Spec References: `@behavioral_spec/features_1.md#9-document-artifact-workspace`
- Architecture/Deviation References: `@deviations/state_deviation.md#d-012`, `@gaps/spec_gaps.md#g005`
- UI Parity References: `@ui/parity_checklist_2.md#d2-inline-document-cards-and-editors`
- Success Criteria:
  - API-visible runtime capability/fallback behavior is explicit for code artifacts.
  - Security and failure exposure contract is testable and bounded.
- Dependencies: `P05-T03 (phase_05_app_router_api_contract_finalization)`
- Complexity: `M`

### P05-T07 - Finalize Health and Operational Error Contract
- Task ID: `P05-T07`
- Assigned Phase: `phase_05_app_router_api_contract_finalization`
- Behavioral Spec References: `@behavioral_spec/api_contracts.md#13-get-apihealth`, `@behavioral_spec/api_contracts.md#17-get-ping`, `@behavioral_spec/features_2.md#7-observability-and-diagnostics`
- Architecture/Deviation References: `@deviations/ai_integration_deviation.md#d-011`, `@spec/patterns_1.md#pattern-p5-apperror-boundary`
- UI Parity References: N/A
- Success Criteria:
  - Health route status semantics and component checks are complete and unambiguous.
  - Operational error mappings are aligned with canonical registry.
  - Proxy liveness (`/ping`) and edge rate-limit response-header semantics are contract-defined and fixture-backed.
- Dependencies: `P05-T04 (phase_05_app_router_api_contract_finalization)`
- Complexity: `S`

### P05-T08 - Execute API Finalization Exit Verification
- Task ID: `P05-T08`
- Assigned Phase: `phase_05_app_router_api_contract_finalization`
- Behavioral Spec References: `@behavioral_spec/api_contracts.md#api-contract-catalog`
- Architecture/Deviation References: `@strategy/phase_order.md`, `@spec/patterns_2.md#pattern-p17-checklist-based-quality-gates`
- UI Parity References: N/A
- Success Criteria:
  - Route contract fixtures are complete for integration test consumption.
  - No blocking route/API deviation remains unresolved.
- Dependencies: `P05-T05 (phase_05_app_router_api_contract_finalization)`, `P05-T06 (phase_05_app_router_api_contract_finalization)`, `P05-T07 (phase_05_app_router_api_contract_finalization)`
- Complexity: `S`

## Conclusions
Phase 05 is the contract lock point; after this, behavior should be validated rather than redesigned.
