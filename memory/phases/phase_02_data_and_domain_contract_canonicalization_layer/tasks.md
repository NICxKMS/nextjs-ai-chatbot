# Phase 02 Tasks

## Reasoning
This phase locks canonical domain naming and payload contracts so vertical feature tasks execute against one stable target.

## Tasks

### P02-T01 - Define Canonical Domain Entity Map
- Task ID: `P02-T01`
- Assigned Phase: `phase_02_data_and_domain_contract_canonicalization_layer`
- Behavioral Spec References: `@behavioral_spec/data_flows_2.md#flow-7-artifact-creation-through-ai-tooling`
- Architecture/Deviation References: `@deviations/state_deviation.md#d-003`, `@spec/patterns_1.md#pattern-p9-artifact-domain-unification`
- UI Parity References: `@ui/parity_checklist_2.md#d-artifact-and-document-experience`
- Success Criteria:
  - Canonical entity names are listed for data, route, and UI boundaries.
  - No alias or deprecated naming path remains in domain contracts.
- Dependencies: `P01-T08 (phase_01_core_infrastructure_policy_foundation)`
- Complexity: `M`

### P02-T02 - Specify Repository Contract Set for Chat and Artifact Version Flows
- Task ID: `P02-T02`
- Assigned Phase: `phase_02_data_and_domain_contract_canonicalization_layer`
- Behavioral Spec References: `@behavioral_spec/data_flows_1.md#flow-6-chat-history-read-path`, `@behavioral_spec/data_flows_2.md#flow-10-document-crudversion-flows`
- Architecture/Deviation References: `@spec/patterns_1.md#pattern-p3-repository-cache-through-base`, `@spec/architecture.md#4-data-access-architecture`
- UI Parity References: `@ui/parity_checklist_2.md#c2-chat-history-list`
- Success Criteria:
  - Repository interfaces define cache-first, DB-fallback behavior by identity mode.
  - CRUD/version operations include explicit ownership and invalidation expectations.
- Dependencies: `P01-T08 (phase_01_core_infrastructure_policy_foundation)`, `P02-T01 (phase_02_data_and_domain_contract_canonicalization_layer)`
- Complexity: `M`

### P02-T03 - Define Canonical Cache Namespace and Key Invalidation Matrix
- Task ID: `P02-T03`
- Assigned Phase: `phase_02_data_and_domain_contract_canonicalization_layer`
- Behavioral Spec References: `@behavioral_spec/features_2.md#3-cache-first-data-platform`
- Architecture/Deviation References: `@performance/architecture_opportunities.md#pa-005-cache-key-and-namespace-unification-for-artifactdocument-transition`, `@spec/conventions.md#7-datacache-conventions`
- UI Parity References: N/A
- Success Criteria:
  - Cache key naming and scope are canonicalized for chats, messages, versions, suggestions, and quota.
  - Invalidation triggers are documented per write path and identity branch.
- Dependencies: `P01-T08 (phase_01_core_infrastructure_policy_foundation)`, `P02-T01 (phase_02_data_and_domain_contract_canonicalization_layer)`
- Complexity: `M`

### P02-T04 - Define Canonical Message Retrieval Envelope
- Task ID: `P02-T04`
- Assigned Phase: `phase_02_data_and_domain_contract_canonicalization_layer`
- Behavioral Spec References: `@behavioral_spec/api_contracts.md#3-get-apichatidmessages`
- Architecture/Deviation References: `@deviations/routing_deviation.md#d-005`, `@deviations/performance_deviation.md#d-perf-002`
- UI Parity References: `@ui/parity_checklist_2.md#a1-message-list-virtualization-and-scroll-ux`
- Success Criteria:
  - Paginated response is designated canonical as the only supported retrieval contract.
  - Cursor and limit behavior includes deterministic examples for test fixtures.
- Dependencies: `P01-T08 (phase_01_core_infrastructure_policy_foundation)`, `P02-T02 (phase_02_data_and_domain_contract_canonicalization_layer)`
- Complexity: `M`

### P02-T05 - Define Suggestion and Vote Persistence Branch Contracts
- Task ID: `P02-T05`
- Assigned Phase: `phase_02_data_and_domain_contract_canonicalization_layer`
- Behavioral Spec References: `@behavioral_spec/data_flows_2.md#flow-9-suggestion-generation-lifecycle`, `@behavioral_spec/data_flows_2.md#flow-11-voting-flow`
- Architecture/Deviation References: `@spec/patterns_1.md#pattern-p3-repository-cache-through-base`, `@spec/patterns_1.md#pattern-p2-guard-validation-composition`
- UI Parity References: `@ui/interaction_states.md#4-message-and-timeline-states`
- Success Criteria:
  - Guest vs regular persistence behavior is codified for suggestions and votes.
  - Ownership and non-guest guards are explicitly tied to repository outcomes.
- Dependencies: `P02-T02 (phase_02_data_and_domain_contract_canonicalization_layer)`, `P02-T03 (phase_02_data_and_domain_contract_canonicalization_layer)`
- Complexity: `S`

### P02-T06 - Define Upload Metadata and Attachment Assembly Contract
- Task ID: `P02-T06`
- Assigned Phase: `phase_02_data_and_domain_contract_canonicalization_layer`
- Behavioral Spec References: `@behavioral_spec/data_flows_2.md#flow-6-file-attachment-lifecycle`, `@behavioral_spec/api_contracts.md#12-post-apifilesupload`
- Architecture/Deviation References: `@spec/conventions.md#3-route-conventions`, `@performance/requirements.md#requirements-register`
- UI Parity References: `@ui/parity_checklist_2.md#b1-multimodal-composer`
- Success Criteria:
  - Uploaded metadata shape and message-part conversion contract are explicit.
  - Constraint boundaries (size/type/name) are mapped to deterministic error classes.
- Dependencies: `P02-T03 (phase_02_data_and_domain_contract_canonicalization_layer)`
- Complexity: `S`

### P02-T07 - Execute Data Contract Exit Verification
- Task ID: `P02-T07`
- Assigned Phase: `phase_02_data_and_domain_contract_canonicalization_layer`
- Behavioral Spec References: `@behavioral_spec/index.md#coverage-checklist`
- Architecture/Deviation References: `@strategy/phase_order.md#phase-02-data-and-domain-contract-canonicalization-layer`, `@spec/patterns_2.md#pattern-p17-checklist-based-quality-gates`
- UI Parity References: N/A
- Success Criteria:
  - Canonical data contract artifacts are complete and referenced by Phase 03 task prerequisites.
  - No unresolved blocker remains in naming, payload contract, or cache namespace definitions.
- Dependencies: `P02-T04 (phase_02_data_and_domain_contract_canonicalization_layer)`, `P02-T05 (phase_02_data_and_domain_contract_canonicalization_layer)`, `P02-T06 (phase_02_data_and_domain_contract_canonicalization_layer)`
- Complexity: `S`

## Conclusions
Phase 02 removes contract ambiguity from persistence and payload layers by enforcing canonical semantics end-to-end.
