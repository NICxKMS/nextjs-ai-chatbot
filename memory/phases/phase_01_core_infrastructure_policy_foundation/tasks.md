# Phase 01 Tasks

## Reasoning
This phase converts scaffold decisions into executable infrastructure interfaces, minimizing policy drift before data/feature implementation starts.

## Tasks

### P01-T01 - Create Shared Request Context and Guard Pipeline Contract
- Task ID: `P01-T01`
- Assigned Phase: `phase_01_core_infrastructure_policy_foundation`
- Behavioral Spec References: `@behavioral_spec/features_2.md#1-route-guard-framework`, `@behavioral_spec/data_flows_1.md#flow-3-new-chat-submission-primary-loop`
- Architecture/Deviation References: `@spec/patterns_1.md#pattern-p2-guard-validation-composition`, `@spec/architecture.md#6-api-route-architecture`
- UI Parity References: N/A
- Success Criteria:
  - Request context contract documents auth, ownership, and quota lookup surfaces.
  - Guard chain ordering is explicit and reusable by route handlers.
- Dependencies: `P00-T09 (phase_00_scaffold)`
- Complexity: `M`

### P01-T02 - Implement AI Capability Policy Authority Interface
- Task ID: `P01-T02`
- Assigned Phase: `phase_01_core_infrastructure_policy_foundation`
- Behavioral Spec References: `@behavioral_spec/ai_behaviors.md#5-tooling-behavior-in-chat-generation`, `@behavioral_spec/edge_cases_1.md#a3-model-capability-policy-drift`
- Architecture/Deviation References: `@deviations/ai_integration_deviation.md#d-006`, `@spec/patterns_1.md#pattern-p6-providerhandler-streaming-split`
- UI Parity References: `@ui/parity_checklist_2.md#b2-model-and-visibility-selection`
- Success Criteria:
  - Single capability policy interface covers model/tool/attachment/reasoning checks.
  - Consumer contract is shared across route, middleware, and UI wrapper adapters.
- Dependencies: `P00-T09 (phase_00_scaffold)`, `P01-T01 (phase_01_core_infrastructure_policy_foundation)`
- Complexity: `M`

### P01-T03 - Define Canonical Error and Health Registry Contract
- Task ID: `P01-T03`
- Assigned Phase: `phase_01_core_infrastructure_policy_foundation`
- Behavioral Spec References: `@behavioral_spec/api_contracts.md#13-get-apihealth`, `@behavioral_spec/ai_behaviors.md#10-error-and-fallback-semantics-in-ai-path`
- Architecture/Deviation References: `@deviations/ai_integration_deviation.md#d-011`, `@spec/patterns_1.md#pattern-p5-apperror-boundary`
- UI Parity References: `@ui/parity_checklist_1.md#a2-global-error-surface`
- Success Criteria:
  - Error-code-to-status registry includes AI and route boundaries.
  - Health registry defines healthy/degraded/unhealthy criteria with measurable thresholds.
  - Global error fallback contract enforces generic messaging and no sensitive-detail leakage.
  - Global error contract includes full-page replacement semantics for uncaught route-level failures.
- Dependencies: `P00-T09 (phase_00_scaffold)`, `P01-T01 (phase_01_core_infrastructure_policy_foundation)`
- Complexity: `M`

### P01-T04 - Normalize Middleware and Auth/Guest Lifecycle Policy
- Task ID: `P01-T04`
- Assigned Phase: `phase_01_core_infrastructure_policy_foundation`
- Behavioral Spec References: `@behavioral_spec/data_flows_1.md#flow-1-session-bootstrap-and-identity-resolution`, `@behavioral_spec/edge_cases_1.md#e-guest-specific-boundaries`
- Architecture/Deviation References: `@deviations/state_deviation.md#d-010`, `@spec/patterns_1.md#pattern-p4-route-specific-edge-rate-limits`
- UI Parity References: `@ui/parity_checklist_1.md#a1-root-layout-and-providers`
- Success Criteria:
  - Guest bootstrap and durability messaging contract is codified.
  - Edge and node limiter branches for auth/guest routes are documented without conflict.
  - Provider bootstrap behavior prevents auth-state flash and preserves shell fallback sequencing.
- Dependencies: `P00-T09 (phase_00_scaffold)`, `P01-T03 (phase_01_core_infrastructure_policy_foundation)`
- Complexity: `M`

### P01-T05 - Define Route Slimness Enforcement Contract
- Task ID: `P01-T05`
- Assigned Phase: `phase_01_core_infrastructure_policy_foundation`
- Behavioral Spec References: `@behavioral_spec/api_contracts.md#conventions`
- Architecture/Deviation References: `@deviations/routing_deviation.md#d-007`, `@spec/patterns_1.md#pattern-p1-slim-route-delegate`
- UI Parity References: N/A
- Success Criteria:
  - Route responsibility budget is explicit (guard, validate, delegate, respond only).
  - Non-compliant route responsibilities are enumerated for later remediation.
- Dependencies: `P00-T09 (phase_00_scaffold)`, `P01-T02 (phase_01_core_infrastructure_policy_foundation)`
- Complexity: `S`

### P01-T06 - Define Cross-Feature Import Enforcement Rule Set
- Task ID: `P01-T06`
- Assigned Phase: `phase_01_core_infrastructure_policy_foundation`
- Behavioral Spec References: `@behavioral_spec/features_2.md#1-route-guard-framework`
- Architecture/Deviation References: `@deviations/architecture_deviation.md#d-008`, `@spec/patterns_2.md#pattern-p14-boundary-enforcement-by-lint-policy`
- UI Parity References: N/A
- Success Criteria:
  - Allowed and forbidden feature import paths are machine-enforceable.
  - Public entrypoint requirement is documented for feature-to-feature access.
- Dependencies: `P00-T09 (phase_00_scaffold)`, `P01-T02 (phase_01_core_infrastructure_policy_foundation)`
- Complexity: `S`

### P01-T07 - Register Stream and Guard Performance SLO Instrumentation
- Task ID: `P01-T07`
- Assigned Phase: `phase_01_core_infrastructure_policy_foundation`
- Behavioral Spec References: `@behavioral_spec/ai_behaviors.md#4-streaming-completion-pipeline`
- Architecture/Deviation References: `@performance/requirements.md#requirements-register`, `@performance/architecture_opportunities.md#pa-009-stream-aware-observability-baseline`
- UI Parity References: `@ui/interaction_states.md#4-message-and-timeline-states`
- Success Criteria:
  - Metrics catalog includes stream start, inter-chunk gap, resume hit ratio, and guard overhead.
  - Instrumentation ownership boundaries are defined for route vs client processing.
- Dependencies: `P00-T09 (phase_00_scaffold)`, `P01-T03 (phase_01_core_infrastructure_policy_foundation)`
- Complexity: `M`

### P01-T08 - Execute Infrastructure Policy Foundation Exit Verification
- Task ID: `P01-T08`
- Assigned Phase: `phase_01_core_infrastructure_policy_foundation`
- Behavioral Spec References: `@behavioral_spec/features_2.md#9-error-contract-standardization`
- Architecture/Deviation References: `@strategy/phase_order.md#phase-01-core-infrastructure-policy-foundation`, `@spec/patterns_2.md#pattern-p17-checklist-based-quality-gates`
- UI Parity References: N/A
- Success Criteria:
  - All Phase 01 interfaces are declared stable for Phase 02 consumers.
  - Any remaining blocker is explicitly listed with decision owner and closure phase.
- Dependencies: `P01-T04 (phase_01_core_infrastructure_policy_foundation)`, `P01-T05 (phase_01_core_infrastructure_policy_foundation)`, `P01-T06 (phase_01_core_infrastructure_policy_foundation)`, `P01-T07 (phase_01_core_infrastructure_policy_foundation)`
- Complexity: `S`

## Conclusions
Phase 01 produces shared contracts, not feature behavior. Completion quality is measured by consumer-readiness and policy consistency.
