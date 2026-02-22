# Phase 06 Tasks

## Reasoning
Final phase ensures execution-safe release criteria: cross-domain integration correctness, performance SLO adherence, and explicit residual-risk handling.

## Tasks

### P06-T01 - Build Integration Verification Matrix From Phase Contracts
- Task ID: `P06-T01`
- Assigned Phase: `phase_06_integration_verification_and_hardening`
- Behavioral Spec References: `@behavioral_spec/index.md#coverage-checklist`
- Architecture/Deviation References: `@spec/patterns_2.md#pattern-p13-colocated-unit-centralized-integratione2e`, `@strategy/phase_order.md#phase-06-integration-verification-and-hardening`
- UI Parity References: `@ui/index.md#conclusions`
- Success Criteria:
  - Matrix maps behavior units and route contracts to integration and e2e scenarios.
  - Each high-risk parity area has at least one dedicated regression scenario.
- Dependencies: `P05-T08 (phase_05_app_router_api_contract_finalization)`
- Complexity: `M`

### P06-T02 - Verify Auth, Guest, and Visibility End-to-End Semantics
- Task ID: `P06-T02`
- Assigned Phase: `phase_06_integration_verification_and_hardening`
- Behavioral Spec References: `@behavioral_spec/data_flows_1.md#flow-1-session-bootstrap-and-identity-resolution`, `@behavioral_spec/edge_cases_1.md#a1-public-chat-access-semantics-uncertain`
- Architecture/Deviation References: `@deviations/routing_deviation.md#d-004`, `@deviations/state_deviation.md#d-010`
- UI Parity References: `@ui/parity_checklist_1.md#b3-existing-chat-screen-chatid`
- Success Criteria:
  - Owner/non-owner/guest behavior across private/public chats matches approved matrix.
  - Guest durability messaging and failure handling match lifecycle policy.
  - Existing-chat readonly-mode and vote-preload semantics are validated across ownership branches.
- Dependencies: `P06-T01 (phase_06_integration_verification_and_hardening)`
- Complexity: `M`

### P06-T03 - Verify Streaming, Artifact, and Resume Integration Reliability
- Task ID: `P06-T03`
- Assigned Phase: `phase_06_integration_verification_and_hardening`
- Behavioral Spec References: `@behavioral_spec/data_flows_1.md#flow-5-stream-resume-retrieval`, `@behavioral_spec/data_flows_2.md#flow-13-data-stream-to-artifact-state-synchronization`
- Architecture/Deviation References: `@spec/patterns_1.md#pattern-p6-providerhandler-streaming-split`, `@performance/requirements.md#requirements-register`
- UI Parity References: `@ui/interaction_states.md#6-artifact-and-document-states`
- Success Criteria:
  - Stream interruptions, resume behavior, and artifact delta application pass reliability scenarios.
  - No duplicate terminal states or missing artifact finish transitions under retry/reconnect.
- Dependencies: `P06-T01 (phase_06_integration_verification_and_hardening)`
- Complexity: `L`

### P06-T04 - Verify Canonical API Contract Fixture Stability
- Task ID: `P06-T04`
- Assigned Phase: `phase_06_integration_verification_and_hardening`
- Behavioral Spec References: `@behavioral_spec/api_contracts.md#api-contract-catalog`, `@behavioral_spec/edge_cases_1.md#a2-test-vs-runtime-schema-drift-risk`
- Architecture/Deviation References: `@deviations/routing_deviation.md#d-005`, `@deviations/performance_deviation.md#d-perf-002`
- UI Parity References: N/A
- Success Criteria:
  - Canonical payload fixtures pass expected scenarios across all supported endpoints.
  - Schema and runtime behavior remain aligned across tested endpoints.
  - Vote/upload/proxy-liveness (`/ping`) fixtures are included in canonical API contract coverage.
- Dependencies: `P06-T01 (phase_06_integration_verification_and_hardening)`
- Complexity: `M`

### P06-T05 - Validate UI Interaction-State Regression Suite
- Task ID: `P06-T05`
- Assigned Phase: `phase_06_integration_verification_and_hardening`
- Behavioral Spec References: `@behavioral_spec/features_1.md#14-loading-error-and-recovery-ux`
- Architecture/Deviation References: `@spec/patterns_2.md#pattern-p17-checklist-based-quality-gates`
- UI Parity References: `@ui/interaction_states.md#high-risk-parity-areas`, `@ui/parity_checklist_1.md#b4-chat-loading-and-error-routes`, `@ui/parity_checklist_2.md#a1-message-list-virtualization-and-scroll-ux`, `@ui/parity_checklist_2.md#a2-message-bubble-parts-and-actions`
- Success Criteria:
  - Loading, empty, error, submitted, streaming, and recovery states are verified across primary surfaces.
  - Keyboard and screen-reader critical interactions are covered by regression checks.
  - Route-level loading copy variants and error-panel action composition are asserted explicitly.
  - Timeline virtualization/scroll controls and message-part action semantics are covered by regression scenarios.
  - Reasoning-panel focus/auto-close behavior, message/toolbar motion expectations, and route-notice URL cleanup semantics are asserted explicitly.
- Dependencies: `P06-T02 (phase_06_integration_verification_and_hardening)`
- Complexity: `M`

### P06-T06 - Validate Performance SLO Compliance for Critical Paths
- Task ID: `P06-T06`
- Assigned Phase: `phase_06_integration_verification_and_hardening`
- Behavioral Spec References: `@behavioral_spec/features_2.md#8-frontend-performance-architecture`
- Architecture/Deviation References: `@performance/requirements.md#requirements-register`, `@performance/architecture_opportunities.md#conclusions`
- UI Parity References: `@ui/interaction_states.md#4-message-and-timeline-states`
- Success Criteria:
  - Critical p95/p99 targets for stream start, inter-chunk gap, history/messages latency, and UI responsiveness are measured.
  - Any SLO miss includes remediation owner and rollback criteria.
- Dependencies: `P06-T03 (phase_06_integration_verification_and_hardening)`
- Complexity: `L`

### P06-T07 - Validate Security and Operational Hardening Scenarios
- Task ID: `P06-T07`
- Assigned Phase: `phase_06_integration_verification_and_hardening`
- Behavioral Spec References: `@behavioral_spec/features_2.md#6-security-controls`, `@behavioral_spec/features_2.md#7-observability-and-diagnostics`
- Architecture/Deviation References: `@spec/patterns_1.md#pattern-p4-route-specific-edge-rate-limits`, `@spec/patterns_1.md#pattern-p5-apperror-boundary`
- UI Parity References: N/A
- Success Criteria:
  - CSRF/rate-limit/ownership controls pass adversarial and degraded-dependency scenarios.
  - Health status reporting behavior remains deterministic under partial outages.
  - Proxy edge-rate-limit behaviors and `/ping` liveness checks remain deterministic under load.
- Dependencies: `P06-T04 (phase_06_integration_verification_and_hardening)`
- Complexity: `M`

### P06-T08 - Execute Final Release Readiness and Deviation Closure Review
- Task ID: `P06-T08`
- Assigned Phase: `phase_06_integration_verification_and_hardening`
- Behavioral Spec References: `@behavioral_spec/index.md#uncertainty-tracking-pointers`
- Architecture/Deviation References: `@deviations/index.md#current-state`, `@spec/patterns_2.md#pattern-p15-adr-backed-decision-logging`
- UI Parity References: `@ui/index.md#conclusions`
- Success Criteria:
  - Blocking deviations are closed or explicitly accepted by user decision.
  - Final readiness report includes residual risks, accepted trade-offs, and post-release watch list.
- Dependencies: `P06-T05 (phase_06_integration_verification_and_hardening)`, `P06-T06 (phase_06_integration_verification_and_hardening)`, `P06-T07 (phase_06_integration_verification_and_hardening)`
- Complexity: `S`

## Conclusions
Phase 06 is pass/fail oriented. Any unresolved blocking deviation at this point should prevent release.
