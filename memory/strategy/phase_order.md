# Phase Order And Gates

## Phase 00 - Scaffold And Contract Baseline (Hard Gate)
Scope:
- Resolve critical spec contradictions (SI-001, SI-002).
- Define canonical path/alias policy.
- Define Next.js file-convention export policy.
- Define contract lanes for G001-G004.
- Establish deviation register and blocking/non-blocking classification.

Entry Criteria:
- Domain indexes read and current.
- Gap register and spec issues reviewed.

Exit Criteria:
- Blocking deviations for scaffold baseline are resolved or explicitly queued for immediate user decision.
- Strategy and scaffold documents finalized and indexed.
- Contract resolution lanes for G001-G004 are documented.

Gate Rule:
- No downstream phase starts before this phase verifies complete.

---

## Phase 01 - Core Infrastructure Policy Foundation
Scope:
- AI capability policy authority baseline.
- Error/health contract registry baseline.
- Auth/guest lifecycle policy normalization.
- Route boundary enforcement baseline.

Entry Criteria:
- Phase 00 verified complete.

Exit Criteria:
- Shared policy authorities and registries exist with stable interfaces.
- No unresolved blocking infra deviations for auth/health/capability policy.

---

## Phase 02 - Data And Domain Contract Canonicalization Layer
Scope:
- Artifact/document canonical naming implementation strategy.
- Repository and schema mapping decisions.
- Cache key and persistence canonicalization guardrails.

Entry Criteria:
- Phase 01 policy interfaces stable.

Exit Criteria:
- Data naming canonical path is executable.
- Repository contracts enforce canonical naming with no alias/deprecation plan.

---

## Phase 03 - Feature Verticals (Chat, Artifacts, Attachments, UX Recovery)
Scope:
- Chat streaming loop, optimistic interactions, visibility UX, history behaviors.
- Artifact panel state machine and tool-driven flows.
- File upload queue and backpressure behavior.

Entry Criteria:
- Phase 02 canonicalization layer stable.
- Visibility and capability policies consumable from shared authorities.

Exit Criteria:
- Feature flows match behavioral spec minimum contract.
- Optimistic/recovery policy baseline implemented and validated.

---

## Phase 04 - Shared UI Composition And Wrapper Compliance
Scope:
- Shared components and `components/ai` wrappers aligned to layer boundaries.
- Enforce `components/ai-elements` read-only usage pattern.
- Responsive, state, and a11y parity baseline for critical paths.

Entry Criteria:
- Phase 03 core feature behavior stable.

Exit Criteria:
- Wrapper-vs-feature boundary violations eliminated.
- Critical UI parity and interaction-state baseline met.

---

## Phase 05 - App Router/API Contract Finalization
Scope:
- Route handlers, validation contracts, response normalization, and canonical fixture examples.
- Visibility authorization matrix and pagination-only policy finalization.
- Rate-limit and health endpoint policy normalization.

Entry Criteria:
- Phases 01-04 policies and feature contracts stable.

Exit Criteria:
- API canonical contract policy is explicit and tested.
- No unresolved blocking route contract deviations.

---

## Phase 06 - Integration, Verification, And Hardening
Scope:
- Contract tests, integration/e2e, reliability and security regressions.
- Streaming resume edge behavior validation.
- Operational health/error semantics verification.

Entry Criteria:
- Phase 05 complete with contract fixtures.

Exit Criteria:
- End-to-end acceptance criteria passed.
- Blocking deviations closed or accepted by user decision.

## Phase Conclusions
- Sequence is dependency-driven: contracts first, vertical behavior second, route finalization third, verification last.
- This ordering minimizes churn from unresolved naming/policy ambiguities and reduces security/regression risk.
