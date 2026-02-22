# Phase 00 Tasks

## Reasoning
This phase retires critical ambiguity first (`SI-001`, `SI-002`) and closes contract-defining gaps (`G001`-`G004`) before feature buildout. It enforces the scaffold hard gate from `@scaffold/scope.md` and `@strategy/phase_order.md`.

## Tasks

### P00-T01 - Publish Scaffold Gate Manifest
- Task ID: `P00-T01`
- Assigned Phase: `phase_00_scaffold`
- Behavioral Spec References: `@behavioral_spec/index.md#behavioral-spec-index-oldapp-reference`
- Architecture/Deviation References: `@spec/architecture.md#11-enforcement-architecture`, `@spec/patterns_2.md#pattern-p17-checklist-based-quality-gates`
- UI Parity References: N/A
- Success Criteria:
  - Scaffold gate checklist explicitly enumerates required decisions and evidence artifacts.
  - Gate checklist references all downstream phase entry dependencies.
- Dependencies: None
- Complexity: `S`

### P00-T02 - Confirm App Router Default Export Exception Policy
- Task ID: `P00-T02`
- Assigned Phase: `phase_00_scaffold`
- Behavioral Spec References: `@behavioral_spec/features_1.md#14-loading-error-and-recovery-ux`
- Architecture/Deviation References: `@spec/spec_issues.md#si-001-critical-default-export-contradiction`, `@deviations/architecture_deviation.md#d-001`
- UI Parity References: `@ui/parity_checklist_1.md#a-global-app-shell`
- Success Criteria:
  - Accepted decision records exact files where default export is allowed.
  - Lint-policy intent documented for default-export exceptions and named-export default elsewhere.
- Dependencies: `P00-T01 (phase_00_scaffold)`
- Complexity: `S`

### P00-T03 - Confirm Canonical Root and Alias Policy
- Task ID: `P00-T03`
- Assigned Phase: `phase_00_scaffold`
- Behavioral Spec References: `@behavioral_spec/features_2.md#10-environment-and-dependency-features`
- Architecture/Deviation References: `@spec/spec_issues.md#si-002-critical-root-path-inconsistency`, `@deviations/architecture_deviation.md#d-002`
- UI Parity References: N/A
- Success Criteria:
  - Single canonical root layout is selected and documented.
  - Alias mapping policy (`@/*`) includes migration mapping expectations.
- Dependencies: `P00-T01 (phase_00_scaffold)`
- Complexity: `S`

### P00-T04 - Confirm Visibility Authorization Matrix
- Task ID: `P00-T04`
- Assigned Phase: `phase_00_scaffold`
- Behavioral Spec References: `@behavioral_spec/edge_cases_1.md#a1-public-chat-access-semantics-uncertain`, `@behavioral_spec/api_contracts.md#4-get-apichatidstream`
- Architecture/Deviation References: `@deviations/routing_deviation.md#d-004`, `@spec/patterns_1.md#pattern-p2-guard-validation-composition`
- UI Parity References: `@ui/parity_checklist_1.md#b3-existing-chat-screen-chatid`
- Success Criteria:
  - Endpoint-level read/stream authorization matrix for private/public chats is defined.
  - Matrix distinguishes owner, authenticated non-owner, and anonymous access posture.
- Dependencies: `P00-T01 (phase_00_scaffold)`
- Complexity: `M`

### P00-T05 - Confirm Artifact/Document Canonical Naming Strategy
- Task ID: `P00-T05`
- Assigned Phase: `phase_00_scaffold`
- Behavioral Spec References: `@behavioral_spec/data_flows_2.md#flow-10-document-crudversion-flows`
- Architecture/Deviation References: `@deviations/state_deviation.md#d-003`, `@spec/architecture.md#10-artifact-unification-architecture`
- UI Parity References: `@ui/parity_checklist_2.md#d-artifact-and-document-experience`
- Success Criteria:
  - Canonical naming is locked for route, repository, and UI surfaces with no alias/deprecation path.
  - Naming contract states canonical identifiers for route, repository, and UI surfaces.
- Dependencies: `P00-T01 (phase_00_scaffold)`
- Complexity: `M`

### P00-T06 - Confirm Canonical API Contract and Pagination Policy
- Task ID: `P00-T06`
- Assigned Phase: `phase_00_scaffold`
- Behavioral Spec References: `@behavioral_spec/api_contracts.md#3-get-apichatidmessages`, `@behavioral_spec/edge_cases_1.md#a2-test-vs-runtime-schema-drift-risk`
- Architecture/Deviation References: `@deviations/routing_deviation.md#d-005`, `@deviations/performance_deviation.md#d-perf-002`
- UI Parity References: `@ui/parity_checklist_2.md#a1-message-list-virtualization-and-scroll-ux`
- Success Criteria:
  - Canonical paginated response shape is documented as the only supported contract.
  - Fixture requirements align to canonical payloads only (no legacy/full mode fixtures).
- Dependencies: `P00-T01 (phase_00_scaffold)`
- Complexity: `M`

### P00-T07 - Define Boundary Enforcement Baseline
- Task ID: `P00-T07`
- Assigned Phase: `phase_00_scaffold`
- Behavioral Spec References: `@behavioral_spec/features_2.md#1-route-guard-framework`
- Architecture/Deviation References: `@spec/patterns_2.md#pattern-p14-boundary-enforcement-by-lint-policy`, `@deviations/architecture_deviation.md#d-008`
- UI Parity References: N/A
- Success Criteria:
  - Layer import boundary policy includes explicit cross-feature constraints.
  - Enforcement scope distinguishes allowed public entrypoints vs forbidden internals.
- Dependencies: `P00-T02 (phase_00_scaffold)`, `P00-T03 (phase_00_scaffold)`
- Complexity: `M`

### P00-T08 - Publish Cross-Cutting Policy Authority Lanes
- Task ID: `P00-T08`
- Assigned Phase: `phase_00_scaffold`
- Behavioral Spec References: `@behavioral_spec/ai_behaviors.md#2-model-identity-reasoning-and-provider-options`, `@behavioral_spec/edge_cases_1.md#a3-model-capability-policy-drift`
- Architecture/Deviation References: `@spec/patterns_1.md#pattern-p5-apperror-boundary`, `@deviations/ai_integration_deviation.md#d-006`
- UI Parity References: `@ui/interaction_states.md#5-reasoningtool-states`
- Success Criteria:
  - Ownership lanes exist for AI capability policy, error/health registry, and visibility checks.
  - Policy lanes include named producer/consumer boundaries for later phases.
- Dependencies: `P00-T04 (phase_00_scaffold)`, `P00-T05 (phase_00_scaffold)`, `P00-T06 (phase_00_scaffold)`
- Complexity: `M`

### P00-T09 - Execute Scaffold Hard-Gate Verification
- Task ID: `P00-T09`
- Assigned Phase: `phase_00_scaffold`
- Behavioral Spec References: `@behavioral_spec/index.md#coverage-checklist`
- Architecture/Deviation References: `@scaffold/scope.md#exit-criteria-must-pass-all`, `@strategy/phase_order.md#phase-00-scaffold-and-contract-baseline-hard-gate`
- UI Parity References: N/A
- Success Criteria:
  - All blocking decisions are resolved or explicitly approved.
  - Gate output marks pass/fail with unresolved blockers list (if any).
- Dependencies: `P00-T07 (phase_00_scaffold)`, `P00-T08 (phase_00_scaffold)`
- Complexity: `S`

## Conclusions
Phase 00 is intentionally decision-heavy. Decisions are now resolved and must be recorded as hard constraints for downstream execution.
