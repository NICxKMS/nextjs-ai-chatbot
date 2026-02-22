# Improvement Opportunities

## Objective
Turn behavior-to-spec gaps into actionable planning opportunities with clear ownership targets for future phases.

## Opportunity Backlog
| Opportunity ID | Opportunity | Why it matters | Recommended owner (future phase) | Depends on |
|---|---|---|---|---|
| O001 | Publish a single "visibility contract" RFC for private/public chat read + stream rules. | Removes ambiguity that can cause auth regressions and inconsistent endpoint behavior. | Phase 5 owner (App Router/API) with Phase 3 review (chat UX). | G001 |
| O002 | Introduce `lib/ai/capability-policy` as the sole policy authority consumed by UI and route layers. | Prevents UI/backend mismatch in attachments, tools, and reasoning toggles. | Phase 1 owner (infra AI) with Phase 3 integration owner. | G002 |
| O003 | Enforce immediate artifact/document canonical naming cutover across data, routes, and UI surfaces. | Eliminates naming drift and prevents transition/deprecation debt from entering the rebuild. | Phase 2 owner (data layer) + Phase 5 owner (API contracts). | G003 |
| O004 | Lock a pagination-only canonical API contract with canonical payload fixtures. | Prevents test/runtime drift and stabilizes client integrations on one durable contract shape. | Phase 5 owner (routes/contracts) + Phase 6 owner (contract tests). | G004 |
| O005 | Standardize optimistic UI policy (`apply`, `reconcile`, `rollback`) across chat/history/visibility/title updates. | Reduces race-condition regressions and UX inconsistency under latency/failures. | Phase 3 owner (features) + Phase 6 owner (UI regression). | G009 |
| O006 | Add guest lifecycle spec addendum (`bootstrap`, `rotation`, `isNewSession`, durability copy). | Clarifies user expectation and cuts support noise from cache-ephemeral behavior. | Phase 1 owner (auth/middleware) + Phase 3 owner (auth/history UX). | G007 |
| O007 | Formalize health/error registry (`status`, thresholds, code->status map, production redaction rules). | Improves observability consistency and operational triage confidence. | Phase 1 owner (errors/observability) with Phase 5 route owners. | G008 |
| O008 | Define local execution (Pyodide) security/perf envelope and fallback behavior. | Prevents unsafe runtime assumptions and client performance regressions. | Phase 3 owner (artifact code feature) + Phase 6 owner (security/perf tests). | G005 |
| O009 | Specify upload queue constraints (batch size, retry budget, cancellation semantics). | Improves reliability for large/multi-file prompts and predictable UX under failures. | Phase 3 owner (chat input feature) + Phase 6 owner (frontend reliability tests). | G006 |

## Quick Wins
- O002 can be scaffolded early with pure type-level policy exports and no behavior change.
- O004 can start with explicit OpenAPI-like examples in route docs and integration fixtures.
- O005 can be implemented as reusable optimistic mutation helpers to reduce repeated edge logic.

## High-Risk If Deferred
- O001: visibility ambiguity can create security/privacy regressions.
- O003: naming inconsistency will multiply migration churn and test fragility.
- O004: schema drift will break clients/tests during phased rollout.

## Owner Guidance
- **Phase 1 (Infrastructure)**: own policy registries and cross-cutting error/health contracts.
- **Phase 2 (Data Layer)**: own artifact/document persistence canonical naming enforcement.
- **Phase 3 (Features)**: own optimistic UX contracts and artifact/chat interaction behavior.
- **Phase 5 (App Router/API)**: own endpoint contract finalization and canonical contract enforcement.
- **Phase 6 (Integration/Testing)**: enforce with contract/e2e/security/perf coverage.

## Opportunity Decisions (Resolved)
| Opportunity ID | Decision | Enforcement level | Delivery phase owner |
|---|---|---|---|
| O001 | Approved | Required for release | Phase 5 owner (+ Phase 3 review) |
| O002 | Approved | Required for release | Phase 1 owner (+ Phase 3 integration) |
| O003 | Approved | Required for release | Phase 2 owner (+ Phase 5 contracts) |
| O004 | Approved | Required for release | Phase 5 owner (+ Phase 6 contract tests) |
| O005 | Approved | Required for release | Phase 3 owner (+ Phase 6 UI regression) |
| O006 | Approved | Required for release | Phase 1 owner (+ Phase 3 UX) |
| O007 | Approved | Required for release | Phase 1 owner (+ Phase 5 routes) |
| O008 | Approved | Required for release | Phase 3 owner (+ Phase 6 security/perf tests) |
| O009 | Approved | Required for release | Phase 3 owner (+ Phase 6 reliability tests) |

### Decision Notes
- No opportunity remains optional or deferred in this planning baseline.
- All approved opportunities must be represented by phase tasks and verification evidence.
- Any implementation compromise requires a new deviation entry with explicit user-visible approval.

## Conclusions
- The most leveraged sequence is: policy authority first (O002), contract finalization (O001/O004), then canonical naming enforcement (O003), followed by UX/ops hardening.
