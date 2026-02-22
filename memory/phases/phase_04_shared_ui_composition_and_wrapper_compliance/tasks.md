# Phase 04 Tasks

## Reasoning
After core feature behavior stabilizes, this phase enforces wrapper boundaries and parity-critical interaction details that often regress during refactors.

## Tasks

### P04-T01 - Audit Shared UI Surface Against Wrapper Boundary Rules
- Task ID: `P04-T01`
- Assigned Phase: `phase_04_shared_ui_composition_and_wrapper_compliance`
- Behavioral Spec References: `@behavioral_spec/features_1.md#3-message-rendering-and-interaction`
- Architecture/Deviation References: `@spec/architecture.md#8-ai-ui-two-layer-architecture`, `@spec/patterns_1.md#pattern-p7-two-layer-ai-component-model`
- UI Parity References: `@ui/component_inventory_2.md`
- Success Criteria:
  - Shared wrapper responsibilities and forbidden business-logic boundaries are explicit.
  - Violations are categorized by severity and mapped to remediation tasks.
- Dependencies: `P03-T11 (phase_03_feature_verticals_chat_artifacts_attachments_ux_recovery)`
- Complexity: `M`

### P04-T02 - Refactor Wrapper Interfaces to Consume Policy Authorities Only
- Task ID: `P04-T02`
- Assigned Phase: `phase_04_shared_ui_composition_and_wrapper_compliance`
- Behavioral Spec References: `@behavioral_spec/ai_behaviors.md#2-model-identity-reasoning-and-provider-options`
- Architecture/Deviation References: `@deviations/ai_integration_deviation.md#d-006`, `@spec/spec_issues.md#si-008-medium-wrapper-layer-responsibility-creep`
- UI Parity References: `@ui/parity_checklist_2.md#b2-model-and-visibility-selection`, `@ui/parity_checklist_2.md#e1-settings-sheet`
- Success Criteria:
  - Wrappers consume centralized capability policy contracts rather than embedding custom policy logic.
  - Wrapper APIs remain presentation/state adapters without feature orchestration bleed.
  - Settings sheet sections and toggle semantics (`aria-pressed`, reset, close) are explicitly preserved.
- Dependencies: `P04-T01 (phase_04_shared_ui_composition_and_wrapper_compliance)`
- Complexity: `M`

### P04-T03 - Enforce AI Elements Read-Only Consumption Path
- Task ID: `P04-T03`
- Assigned Phase: `phase_04_shared_ui_composition_and_wrapper_compliance`
- Behavioral Spec References: `@behavioral_spec/features_1.md#9-document-artifact-workspace`
- Architecture/Deviation References: `@spec/architecture.md#8-ai-ui-two-layer-architecture`, `@spec/conventions.md#6-ai-component-conventions`
- UI Parity References: `@ui/parity_checklist_2.md#d2-inline-document-cards-and-editors`
- Success Criteria:
  - Feature/app imports resolve through `components/ai` wrappers only.
  - Direct `ai-elements` consumption outside wrappers is prohibited and testable.
  - Inline document/editor parity checks include per-kind skeletons and text/code/sheet/diff behavior matrix coverage.
- Dependencies: `P04-T01 (phase_04_shared_ui_composition_and_wrapper_compliance)`
- Complexity: `S`

### P04-T04 - Validate Keyboard and Accessibility Interaction Contracts
- Task ID: `P04-T04`
- Assigned Phase: `phase_04_shared_ui_composition_and_wrapper_compliance`
- Behavioral Spec References: `@behavioral_spec/features_1.md#14-loading-error-and-recovery-ux`
- Architecture/Deviation References: `@spec/patterns_2.md#pattern-p17-checklist-based-quality-gates`
- UI Parity References: `@ui/parity_checklist_1.md#d-cross-screen-responsive-and-accessibility-baseline`, `@ui/interaction_states.md#7-accessibility-and-assistive-signals`
- Success Criteria:
  - Required keyboard flows (sidebar shortcut, enter/shift-enter behavior) are covered by acceptance checks.
  - Screen-reader labels and live-region semantics are verified for key controls.
- Dependencies: `P04-T02 (phase_04_shared_ui_composition_and_wrapper_compliance)`, `P04-T03 (phase_04_shared_ui_composition_and_wrapper_compliance)`
- Complexity: `M`

### P04-T05 - Validate Responsive Shell and Sidebar Parity Contracts
- Task ID: `P04-T05`
- Assigned Phase: `phase_04_shared_ui_composition_and_wrapper_compliance`
- Behavioral Spec References: `@behavioral_spec/features_1.md#7-sidebar-history-and-navigation`
- Architecture/Deviation References: `@spec/patterns_2.md#pattern-p11-jotai-state-with-persistence`, `@spec/patterns_2.md#pattern-p12-hook-tiering`
- UI Parity References: `@ui/parity_checklist_1.md#a1-root-layout-and-providers`, `@ui/parity_checklist_1.md#b1-chat-layout-container`, `@ui/parity_checklist_1.md#b2-new-chat-screen-`, `@ui/parity_checklist_2.md#c1-sidebar-shell-and-controls`, `@ui/parity_checklist_2.md#c3-user-navigation-menu`
- Success Criteria:
  - Desktop collapse/mobile sheet transitions and persistence behavior are stable.
  - Header/shell behavior across breakpoints matches parity expectations.
  - User navigation menu preserves hydration placeholder, avatar seed behavior, and auth/dropdown actions.
  - Root shell parity includes `h-dvh`, tooltip delay behavior, and runtime theme-color updates.
  - Root shell parity preserves viewport `maximumScale: 1`, loading-copy behavior, and route-notice toast + URL-cleanup sequencing.
  - Chat layout parity preserves lazy sidebar skeleton/children suspense behavior and reconciles initial sidebar/mobile hint contract deterministically.
  - Root shell parity preserves head-network-hint policy (`preconnect`/`dns-prefetch`) for critical external domains.
  - Head network hints explicitly include: `cdn.jsdelivr.net`, `va.vercel-scripts.com`, `vitals.vercel-insights.com`, `fonts.gstatic.com`, `api.openai.com`, `generativelanguage.googleapis.com`, and `api.open-meteo.com`.
  - New-chat header control composition and staged greeting/suggestion entrance behavior are preserved.
- Dependencies: `P04-T02 (phase_04_shared_ui_composition_and_wrapper_compliance)`, `P04-T03 (phase_04_shared_ui_composition_and_wrapper_compliance)`
- Complexity: `M`

### P04-T06 - Validate Stream-Driven Render Performance on Shared Surfaces
- Task ID: `P04-T06`
- Assigned Phase: `phase_04_shared_ui_composition_and_wrapper_compliance`
- Behavioral Spec References: `@behavioral_spec/features_2.md#8-frontend-performance-architecture`
- Architecture/Deviation References: `@performance/requirements.md#requirements-register`, `@performance/architecture_opportunities.md#pa-003-explicit-stream-event-budget-handler-batching`
- UI Parity References: `@ui/interaction_states.md#8-responsive-and-motion-expectations`
- Success Criteria:
  - Stream-related long-task and frame-drop budgets are measurable and within targets.
  - Shared wrapper changes do not broaden rerender surfaces unexpectedly.
- Dependencies: `P04-T04 (phase_04_shared_ui_composition_and_wrapper_compliance)`
- Complexity: `M`

### P04-T07 - Execute Shared UI Compliance Exit Verification
- Task ID: `P04-T07`
- Assigned Phase: `phase_04_shared_ui_composition_and_wrapper_compliance`
- Behavioral Spec References: `@behavioral_spec/features_1.md#behavioral-conclusions`
- Architecture/Deviation References: `@strategy/phase_order.md#phase-04-shared-ui-composition-and-wrapper-compliance`, `@spec/patterns_2.md#pattern-p17-checklist-based-quality-gates`
- UI Parity References: `@ui/index.md#conclusions`, `@ui/parity_checklist_2.md#e2-toast-system`
- Success Criteria:
  - Wrapper boundary, accessibility, responsive, and interaction-state checks all pass.
  - Remaining UI risks are explicitly handed off to Phase 06 hardening tests.
  - Toast shell parity (type icon, multiline alignment, compact responsive width) is included in the compliance sign-off checklist.
- Dependencies: `P04-T05 (phase_04_shared_ui_composition_and_wrapper_compliance)`, `P04-T06 (phase_04_shared_ui_composition_and_wrapper_compliance)`
- Complexity: `S`

## Conclusions
Phase 04 converts UI parity from best effort into enforceable boundary and interaction contracts.
