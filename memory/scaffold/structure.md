# Phase 00 Scaffold Structure

## Required Structural Outputs

### 1) Governance Outputs
- `memory/strategy/phase_order.md`
- `memory/strategy/agent_assignments.md`
- `memory/deviations/deviation_log.md`

### 2) Policy Baseline Outputs
- Canonical root/alias policy section in `memory/strategy/plan.md`.
- Next.js default-export exception policy section in `memory/strategy/plan.md`.
- Route slimness and allowed in-route responsibility budget in `memory/strategy/plan.md`.
- Cross-feature import and boundary enforcement policy in `memory/strategy/plan.md`.

### 3) Contract Baseline Outputs
- Visibility contract decision lane (public/private read/stream matrix) in strategy docs.
- Artifact/document canonical naming lane in strategy docs.
- API payload canonical contract lane (pagination-only policy) in strategy docs.
- AI capability policy ownership lane in strategy docs.

### 4) Verification Baseline Outputs
- Phase-level entry and exit criteria in `memory/strategy/phase_order.md`.
- Hard gate statement that Phase 00 must verify before Phase 01 starts.
- Decision-required deviations clearly called out for user action.

## Boundary and Placement Rules (Scaffold-Level)
- Keep route handlers thin and delegated.
- Keep business workflows in `features/*`.
- Keep shared infra and policy in `lib/*`.
- Keep `components/ai-elements` immutable and consumed via `components/ai` wrappers only.
- Use selective barrels only at public module boundaries.

## Phase 00 Verification Checklist
- [ ] Critical spec contradictions have documented strategy decisions.
- [ ] Contract-defining gaps G001-G004 have explicit resolution lanes.
- [ ] Blocking deviations have decision owner and due phase.
- [ ] Non-blocking deviations are logged with mitigation and review phase.
- [ ] Strategy and scaffold indexes are current.

## Failure Conditions
- Missing canonical path policy.
- Missing Next.js file-convention exception policy.
- Unresolved blocking deviation without user decision path.
- Feature phase proposed without Phase 00 verification evidence.
