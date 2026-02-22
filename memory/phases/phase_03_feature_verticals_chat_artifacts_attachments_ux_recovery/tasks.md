# Phase 03 Tasks

## Reasoning
This phase targets highest-risk user-visible behavior: streaming timelines, artifact side-workspace synchronization, and optimistic/recovery transitions where regressions are most noticeable.

## Tasks

### P03-T01 - Implement Chat Submission Request and Session Kickoff
- Task ID: `P03-T01`
- Assigned Phase: `phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery`
- Behavioral Spec References: `@behavioral_spec/data_flows_1.md#flow-3-new-chat-submission-primary-loop`, `@behavioral_spec/ai_behaviors.md#4-streaming-completion-pipeline`
- Architecture/Deviation References: `@spec/patterns_1.md#pattern-p6-providerhandler-streaming-split`, `@performance/requirements.md#requirements-register`
- UI Parity References: `@ui/parity_checklist_2.md#b1-multimodal-composer`
- Success Criteria:
  - Composer submit path resolves request payload and identity context deterministically.
  - New/existing chat kickoff behavior matches expected routing and pending-state UX.
  - Query-prefill startup auto-submit and provider billing activation dialog recovery are parity-locked for first-send flow.
  - Model selection UX preserves grouped provider metadata/capability labeling and deterministic fallback when preferred model is unavailable.
- Dependencies: `P02-T07 (phase_02_data_and_domain_contract_canonicalization_layer)`
- Complexity: `L`

### P03-T02 - Implement Stream Event Processing and Terminal-State Handling
- Task ID: `P03-T02`
- Assigned Phase: `phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery`
- Behavioral Spec References: `@behavioral_spec/data_flows_1.md#flow-3-new-chat-submission-primary-loop`, `@behavioral_spec/ai_behaviors.md#4-streaming-completion-pipeline`
- Architecture/Deviation References: `@spec/patterns_1.md#pattern-p6-providerhandler-streaming-split`, `@performance/requirements.md#requirements-register`
- UI Parity References: `@ui/parity_checklist_2.md#a1-message-list-virtualization-and-scroll-ux`, `@ui/interaction_states.md#4-message-and-timeline-states`
- Success Criteria:
  - Stream parts are applied in-order with deterministic terminal-state resolution.
  - Stream start and continuity metrics are observable against defined SLOs.
- Dependencies: `P02-T07 (phase_02_data_and_domain_contract_canonicalization_layer)`, `P03-T01 (phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery)`
- Complexity: `L`

### P03-T03 - Implement Optimistic Timeline Reconciliation
- Task ID: `P03-T03`
- Assigned Phase: `phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery`
- Behavioral Spec References: `@behavioral_spec/features_1.md#2-chat-workspace-primary-product-loop`, `@behavioral_spec/data_flows_1.md#flow-6-chat-history-read-path`
- Architecture/Deviation References: `@gaps/spec_gaps.md#g009`, `@spec/patterns_2.md#pattern-p11-jotai-state-with-persistence`
- UI Parity References: `@ui/parity_checklist_2.md#a-chat-timeline-and-message-rendering`, `@ui/interaction_states.md#4-message-and-timeline-states`
- Success Criteria:
  - Optimistic chat/message insertion reconciles cleanly with canonical server results.
  - Rollback behavior is deterministic on error without duplicate or orphaned rows.
  - Auto-scroll and scroll-to-bottom affordance behavior remain deterministic for long timelines.
- Dependencies: `P02-T07 (phase_02_data_and_domain_contract_canonicalization_layer)`, `P03-T02 (phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery)`
- Complexity: `M`

### P03-T04 - Implement Visibility Toggle Flow With Contracted Authorization
- Task ID: `P03-T04`
- Assigned Phase: `phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery`
- Behavioral Spec References: `@behavioral_spec/data_flows_1.md#flow-8-visibility-update`, `@behavioral_spec/features_1.md#6-visibility-control-and-sharing-posture`
- Architecture/Deviation References: `@deviations/routing_deviation.md#d-004`, `@spec/patterns_1.md#pattern-p2-guard-validation-composition`
- UI Parity References: `@ui/parity_checklist_2.md#b2-model-and-visibility-selection`
- Success Criteria:
  - Visibility UI updates optimistically then persists or reverts based on server outcome.
  - Access checks align with approved visibility matrix.
- Dependencies: `P02-T07 (phase_02_data_and_domain_contract_canonicalization_layer)`, `P03-T02 (phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery)`
- Complexity: `L`

### P03-T05 - Implement Artifact Stream State Machine and Panel Lifecycle
- Task ID: `P03-T05`
- Assigned Phase: `phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery`
- Behavioral Spec References: `@behavioral_spec/data_flows_2.md#flow-13-data-stream-to-artifact-state-synchronization`, `@behavioral_spec/features_1.md#9-document-artifact-workspace`
- Architecture/Deviation References: `@spec/patterns_1.md#pattern-p6-providerhandler-streaming-split`, `@spec/patterns_1.md#pattern-p9-artifact-domain-unification`
- UI Parity References: `@ui/parity_checklist_2.md#d1-artifact-panel-lifecycle`, `@ui/parity_checklist_2.md#d3-artifact-toolbar-and-actions`, `@ui/interaction_states.md#6-artifact-and-document-states`
- Success Criteria:
  - Artifact open/close and streamed field updates match expected state transitions.
  - Version and status metadata update coherently across stream lifecycle.
  - Toolbar expansion timing, stream-mode stop swap, and action disable semantics match parity rules.
  - Artifact open transition from source-hitbox bounds and dirty-save indicator/timestamp behavior are parity-complete.
- Dependencies: `P03-T03 (phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery)`
- Complexity: `M`

### P03-T06 - Implement Attachment Queue, Upload, and Message-Part Assembly
- Task ID: `P03-T06`
- Assigned Phase: `phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery`
- Behavioral Spec References: `@behavioral_spec/data_flows_2.md#flow-6-file-attachment-lifecycle`, `@behavioral_spec/features_1.md#10-file-attachments`
- Architecture/Deviation References: `@gaps/spec_gaps.md#g006`, `@performance/architecture_opportunities.md#pa-007-upload-queue-backpressure-contract`
- UI Parity References: `@ui/parity_checklist_2.md#b1-multimodal-composer`
- Success Criteria:
  - Upload queue enforces concurrency and exposes cancel/retry outcomes.
  - Composer submit gating honors upload-in-progress and IME-safe keyboard behavior.
  - Composer preserves stop/send toggle behavior, empty-input submit disable, and backspace-remove-last-attachment semantics.
- Dependencies: `P03-T03 (phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery)`
- Complexity: `M`

### P03-T07 - Implement Code Artifact Execution Safety Envelope
- Task ID: `P03-T07`
- Assigned Phase: `phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery`
- Behavioral Spec References: `@behavioral_spec/features_1.md#9-document-artifact-workspace`, `@behavioral_spec/edge_cases_1.md#h-artifact-specific-boundaries`
- Architecture/Deviation References: `@deviations/state_deviation.md#d-012`, `@gaps/spec_gaps.md#g005`
- UI Parity References: `@ui/parity_checklist_2.md#d2-inline-document-cards-and-editors`
- Success Criteria:
  - Local execution mode and fallback behavior are explicit and testable.
  - Unsafe or unavailable runtime path produces deterministic user-visible failure state.
- Dependencies: `P03-T04 (phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery)`
- Complexity: `M`

### P03-T08 - Implement Message Edit/Regenerate and Trailing Delete Recovery
- Task ID: `P03-T08`
- Assigned Phase: `phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery`
- Behavioral Spec References: `@behavioral_spec/data_flows_2.md#flow-12-message-editregenerate-path`
- Architecture/Deviation References: `@spec/patterns_1.md#pattern-p3-repository-cache-through-base`, `@spec/patterns_2.md#pattern-p13-colocated-unit-centralized-integratione2e`
- UI Parity References: `@ui/parity_checklist_2.md#a2-message-bubble-parts-and-actions`
- Success Criteria:
  - Editing a prior user message truncates later conversation state correctly.
  - Regeneration path produces coherent new assistant continuation without stale remnants.
  - Message action affordances preserve hover behavior and voting `aria-pressed` semantics.
  - Message-part render matrix (reasoning, tool/result states, suggestions) remains parity-complete.
  - Terminal error filtering for empty assistant messages and reasoning/tool status-state semantics remain explicit and testable.
- Dependencies: `P03-T05 (phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery)`
- Complexity: `M`

### P03-T09 - Implement Upload Error and Backpressure UX Recovery
- Task ID: `P03-T09`
- Assigned Phase: `phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery`
- Behavioral Spec References: `@behavioral_spec/edge_cases_1.md#d-input-validation-boundaries`
- Architecture/Deviation References: `@gaps/spec_gaps.md#g006`, `@performance/requirements.md#requirements-register`
- UI Parity References: `@ui/parity_checklist_2.md#b1-multimodal-composer`, `@ui/interaction_states.md#3-composer-states`
- Success Criteria:
  - Upload failure classes map to stable UI states and copy.
  - Queue pressure does not freeze composer interaction or create hidden stuck states.
- Dependencies: `P03-T06 (phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery)`
- Complexity: `M`

### P03-T10 - Implement Sidebar Reconciliation and Async Title/Suggestion Channels
- Task ID: `P03-T10`
- Assigned Phase: `phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery`
- Behavioral Spec References: `@behavioral_spec/ai_behaviors.md#8-title-generation-behavior`, `@behavioral_spec/data_flows_2.md#flow-9-suggestion-generation-lifecycle`, `@behavioral_spec/data_flows_1.md#flow-6-chat-history-read-path`
- Architecture/Deviation References: `@spec/patterns_1.md#pattern-p6-providerhandler-streaming-split`, `@spec/patterns_1.md#pattern-p5-apperror-boundary`
- UI Parity References: `@ui/parity_checklist_2.md#c2-chat-history-list`, `@ui/interaction_states.md#4-message-and-timeline-states`
- Success Criteria:
  - Sidebar grouping/list state reconciles with optimistic and async title updates without stale labels.
  - Suggestion stream persistence branch correctly honors guest vs regular behavior.
  - History buckets, infinite paging footer states, per-chat menu actions, and delete-all dialog behavior remain parity-complete.
- Dependencies: `P03-T03 (phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery)`, `P03-T08 (phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery)`, `P03-T09 (phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery)`
- Complexity: `S`

### P03-T11 - Execute Feature Verticals Exit Verification
- Task ID: `P03-T11`
- Assigned Phase: `phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery`
- Behavioral Spec References: `@behavioral_spec/features_1.md#behavioral-conclusions`
- Architecture/Deviation References: `@strategy/phase_order.md#phase-03-feature-verticals-chat-artifacts-attachments-ux-recovery`, `@spec/patterns_2.md#pattern-p17-checklist-based-quality-gates`
- UI Parity References: `@ui/interaction_states.md#high-risk-parity-areas`
- Success Criteria:
  - All critical vertical flows pass behavior and interaction-state acceptance checks.
  - Known residual risks are enumerated for Phase 04/06 hardening follow-up.
- Dependencies: `P03-T07 (phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery)`, `P03-T10 (phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery)`
- Complexity: `S`

## Conclusions
Phase 03 re-establishes core product behavior. It should be treated as the primary parity milestone before wrapper and API finalization phases.
