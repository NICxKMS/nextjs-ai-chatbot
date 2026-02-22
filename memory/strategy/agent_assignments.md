# Agent Assignment Strategy

## Assignment Logic
- Assign by domain ownership and dependency critical path.
- Keep cross-cutting policy work ahead of vertical feature implementation.
- Reserve verification and deviation closure checkpoints at each phase exit.

## Phase Ownership

### Phase 00 - Scaffold And Contracts
- Primary: Agent_Strategist
- Supporting: planner-spec-interpreter, planner-gap-analyzer, planner-plan-verifier
- Output focus: gate definitions, phase boundaries, deviation governance.

### Phase 01 - Infrastructure Policy
- Primary: planner-backend-coverage-auditor
- Supporting: planner-dependency-planner, planner-risk-auditor
- Output focus: policy authorities, auth/health/error baselines, enforcement hooks.

### Phase 02 - Data Contract Canonicalization
- Primary: planner-manifest-coverage-auditor
- Supporting: planner-dependency-auditor
- Output focus: repository/schema canonicalization strategy and migration ordering.

### Phase 03 - Feature Verticals
- Primary: planner-task-planner
- Supporting: planner-ui-cataloger, planner-ui-parity-validator
- Output focus: chat/artifact/attachment flows with optimistic and recovery contracts.

### Phase 04 - Shared UI and Wrappers
- Primary: planner-ui-coverage-auditor
- Supporting: planner-ui-parity-validator
- Output focus: wrapper compliance, interaction-state parity, a11y/responsive risk closure.

### Phase 05 - API Finalization
- Primary: planner-backend-coverage-auditor
- Supporting: planner-plan-verifier
- Output focus: endpoint contracts, authorization matrices, and route policy normalization.

### Phase 06 - Integration and Hardening
- Primary: planner-plan-verifier
- Supporting: planner-risk-auditor, planner-performance-auditor
- Output focus: cross-domain validation, risk signoff, residual deviation closure.

## Handoff Rules
- Every phase start requires prior phase exit evidence.
- Blocking deviations must be resolved or explicitly user-approved before handoff.
- Non-blocking deviations must carry mitigation owner and review phase.

## User Decision Touchpoints
- Contract-defining deviations requiring product/security posture choices are escalated at Phase 00/05 boundaries.
- If unresolved, they block phase progression where marked blocking.
