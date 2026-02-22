# Phase Risks 2 (Phase 04-06)

Risk ordering uses severity first, then likelihood.

## Phase 04 - Shared UI Composition and Wrapper Compliance

### R04-01 - Wrapper boundary leakage reintroduces policy drift
- Severity: high
- Likelihood: medium
- Affected tasks/dependencies:
  - `P04-T01` -> `P04-T02` -> (`P04-T04`, `P04-T05`)
- Risk:
  - Wrappers start embedding business logic or local policy checks, diverging from centralized authorities.
- Trigger conditions:
  - Feature-specific quick fixes land inside wrapper layer.
- Early detection checks:
  - Wrapper API review checklist and forbidden dependency scan.
- Mitigation:
  - Strict wrapper responsibility contract and boundary lint rules.

### R04-02 - `ai-elements` direct imports bypass wrapper controls
- Severity: high
- Likelihood: medium
- Affected tasks:
  - `P04-T03`, validated at `P04-T07`
- Risk:
  - Feature code can bypass policy/telemetry/a11y controls defined in wrappers.
- Trigger conditions:
  - New component imports `components/ai-elements/*` directly.
- Early detection checks:
  - Import rule CI check scoped to allowed wrapper paths only.
- Mitigation:
  - Enforce read-only consumption path and CI gate failures.

### R04-03 - A11y/keyboard parity regressions hidden by visual pass
- Severity: medium
- Likelihood: high
- Affected tasks:
  - `P04-T04`, `P06-T05`
- Risk:
  - Critical flows pass visually but fail keyboard/screen-reader interactions.
- Trigger conditions:
  - Sidebar shortcuts, enter/shift-enter behavior, or live regions not preserved.
- Early detection checks:
  - Keyboard-focused test set and screen-reader semantic assertions.
- Mitigation:
  - Add a11y acceptance gate as mandatory prerequisite for `P04-T07`.

### R04-04 - Responsive shell divergence by device class
- Severity: medium
- Likelihood: medium
- Affected tasks:
  - `P04-T05`, `P06-T05`
- Risk:
  - Desktop collapse, mobile sheet, and persisted sidebar state diverge subtly.
- Trigger conditions:
  - Breakpoint transitions with existing persisted sidebar preference.
- Early detection checks:
  - Cross-breakpoint state continuity tests.
- Mitigation:
  - Explicit responsive state transition contract and persistence reset rules.

### R04-05 - Stream-driven render regressions from wrapper changes
- Severity: high
- Likelihood: medium
- Affected tasks/dependencies:
  - `P04-T04` -> `P04-T06` -> `P04-T07`
- Risk:
  - Wrapper refactors broaden rerender surfaces and miss performance budgets.
- Trigger conditions:
  - Long-task spikes under active streaming.
- Early detection checks:
  - Long-task and frame-drop profiling under stream load.
- Mitigation:
  - Performance budget checks as blocking criteria for `P04-T07`.

## Phase 05 - App Router API Contract Finalization

### R05-01 - Authorization semantics still ambiguous at contract lock point (G001)
- Severity: critical
- Likelihood: medium
- Affected tasks/dependencies:
  - `P05-T01` -> `P05-T02` -> `P05-T08`
- Risk:
  - Public/private owner/non-owner outcomes remain inconsistent across routes.
- Trigger conditions:
  - Endpoint-specific exceptions not represented in matrix.
- Early detection checks:
  - Endpoint-by-actor contract fixture coverage review.
- Mitigation:
  - Route matrix must be complete before any `P05-T08` exit signoff.

### R05-02 - Message/history canonical fixture drift (G004)
- Severity: high
- Likelihood: high
- Affected tasks:
  - `P05-T03`, `P06-T04`
- Risk:
  - Canonical payload contract and consumers drift, producing inconsistent behavior.
- Trigger conditions:
  - Fixture updates not synchronized with schema/routing changes.
- Early detection checks:
  - Canonical contract suite in CI with schema diff checks.
- Mitigation:
  - Freeze canonical payload examples with explicit version gates.

### R05-03 - Auth/guest route policy regression under limiter failure
- Severity: high
- Likelihood: medium
- Affected tasks:
  - `P05-T04`, `P06-T07`
- Risk:
  - CSRF/rate-limit behavior differs from intended fail-open/fail-closed design.
- Trigger conditions:
  - Redis degradation and burst auth traffic.
- Early detection checks:
  - Auth route chaos scenarios with dependency fault injection.
- Mitigation:
  - Explicit fallback rules and route-specific hardening fixtures.

### R05-04 - Artifact/document route naming and semantics diverge (G003)
- Severity: high
- Likelihood: medium
- Affected tasks:
  - `P05-T05`, plus Phase 02 contracts.
- Risk:
  - Mixed naming surfaces survive into public API, causing client confusion.
- Trigger conditions:
  - Incomplete canonical rename leaves mixed public API naming.
- Early detection checks:
  - API schema diff checks against canonical naming contract.
- Mitigation:
  - Canonical-only contract with strict schema conformance checks.

### R05-05 - Local execution API safety contract delivery risk (G005)
- Severity: high
- Likelihood: medium
- Affected tasks/dependencies:
  - `P05-T03` -> `P05-T06` -> `P05-T08`
- Risk:
  - Phase gate blocked or insecure fallback semantics released.
- Trigger conditions:
  - Safety envelope implementation or fixtures incomplete near phase exit.
- Early detection checks:
  - Mandatory local execution safety evidence in pre-exit checklist.
- Mitigation:
  - Complete `P05-T06` contract and fixtures before `P05-T08`.

### R05-06 - Health/error contract incomplete for degraded states (G008)
- Severity: medium
- Likelihood: medium
- Affected tasks:
  - `P05-T07`, `P06-T07`
- Risk:
  - Operational dashboards misread system health, delaying incident response.
- Trigger conditions:
  - Missing component-level criteria for degraded reporting.
- Early detection checks:
  - Health semantic conformance tests.
- Mitigation:
  - Component threshold map integrated with canonical error registry.

### R05-07 - Fan-in gate congestion at `P05-T08`
- Severity: high
- Likelihood: high
- Affected dependencies:
  - (`P05-T05`, `P05-T06`, `P05-T07`) -> `P05-T08` -> all Phase 06
- Risk:
  - Any unresolved high-risk predecessor or unstable fixture blocks integration phase.
- Trigger conditions:
  - Late failures in one branch while other branches complete.
- Early detection checks:
  - Gate readiness dry run with all branch owners.
- Mitigation:
  - Mid-phase convergence checkpoint and blocker burn-down before final week.

## Phase 06 - Integration Verification and Hardening

### R06-01 - Integration matrix misses high-risk behavior coverage
- Severity: critical
- Likelihood: medium
- Affected tasks/dependencies:
  - `P06-T01` -> (`P06-T02`, `P06-T03`, `P06-T04`) -> `P06-T08`
- Risk:
  - Release passes with untested hard behaviors (stream/artifact/guest branches).
- Trigger conditions:
  - Matrix built from routes only, not behavior units and edge scenarios.
- Early detection checks:
  - Coverage audit: each hard behavior maps to at least one scenario.
- Mitigation:
  - Use `hard_behaviors.md` as required source for matrix completeness.

### R06-02 - Streaming/artifact reliability under reconnection remains unstable
- Severity: critical
- Likelihood: high
- Affected tasks:
  - `P06-T03`, informs `P06-T06` and `P06-T08`
- Risk:
  - Intermittent production issues despite nominal contract compliance.
- Trigger conditions:
  - Retry/reconnect + partial stream loss + artifact side state.
- Early detection checks:
  - Long-run reliability suite with forced reconnect/drop patterns.
- Mitigation:
  - Reliability soak tests and deterministic replay fixtures before release signoff.

### R06-03 - Performance SLOs unmet on critical path workloads
- Severity: high
- Likelihood: high
- Affected tasks:
  - `P06-T06`
- Risk:
  - User-visible latency/jank in stream start, inter-chunk render, and history load.
- Trigger conditions:
  - p95/p99 metrics exceed thresholds under realistic concurrency.
- Early detection checks:
  - SLO dashboard + regression thresholds in CI.
- Mitigation:
  - Predefined remediation owner and rollback criteria required by task success.

### R06-04 - Security hardening misses non-disclosure edge cases
- Severity: high
- Likelihood: medium
- Affected tasks:
  - `P06-T07`
- Risk:
  - Unauthorized actors can infer resource existence from response differences.
- Trigger conditions:
  - Endpoint response shape varies between forbidden and missing states.
- Early detection checks:
  - Adversarial contract tests for non-disclosure response invariants.
- Mitigation:
  - Explicit privacy-response contract and regression guard suite.

### R06-05 - Final deviation closure incomplete at release gate
- Severity: high
- Likelihood: high
- Affected tasks/dependencies:
  - (`P06-T05`, `P06-T06`, `P06-T07`) -> `P06-T08`
- Risk:
  - Release readiness accepted with unresolved blocking deviations.
- Trigger conditions:
  - Blocking deviation evidence remains unresolved at gate review.
- Early detection checks:
  - Deviation board reconciliation before `P06-T08` approval.
- Mitigation:
  - Block release unless each blocking deviation is closed or explicitly accepted by user.

## Conclusions
- Phase 04 risk is mostly architectural hygiene and parity enforcement.
- Phase 05 risk is contract lock and gate-convergence heavy.
- Phase 06 retains highest residual risk because it is where latent cross-phase defects become visible, especially streaming reliability and SLO compliance.
