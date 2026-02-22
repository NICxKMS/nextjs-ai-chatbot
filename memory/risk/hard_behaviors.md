# Hard-To-Reproduce Behaviors (Oldapp)

Purpose: identify oldapp behaviors with high replay difficulty and high regression probability during rebuild.

## Method
- Derived from `memory/behavioral_spec/*` (flows, edge cases, AI behaviors).
- Cross-mapped to `memory/phases/*/tasks.md` and `memory/dependencies/*` gate structure.
- Prioritized by: user impact x hidden state complexity x dependency timing sensitivity.

## Hard Behavior Register

### HB-01 - Stream Resume Recency Window
- Severity: high
- Likelihood: high
- Why hard:
  - Depends on message role ordering plus short recency threshold and reconnect timing.
- Trigger conditions:
  - Network interruption near assistant completion; resume called after threshold.
- Early detection checks:
  - Contract test for assistant-vs-user-last-message branches.
  - Timed integration scenario around threshold boundary.
- Mitigation:
  - Lock deterministic recency contract in `P05-T02/P05-T03`.
  - Add retry-window fixtures in `P06-T03`.
- Phase/task/dependency mapping:
  - Phase 03 `P03-T02`, `P03-T03`; Phase 05 `P05-T02`; Phase 06 `P06-T03`.

### HB-02 - Optimistic Insert Then Canonical Reconcile
- Severity: high
- Likelihood: high
- Why hard:
  - UI inserts optimistic chat/message rows before persistence and later merges async server truth.
- Trigger conditions:
  - Fast consecutive submits, route transitions, or partial stream failures.
- Early detection checks:
  - Duplicate-row invariant checks in timeline and sidebar.
  - E2E for multi-submit race and rollback.
- Mitigation:
  - Canonical reconciliation policy in `P03-T03`.
  - Mandatory duplicate/orphan assertions in `P03-T11` and `P06-T05`.
- Mapping:
  - Phase 03 `P03-T01..P03-T03`, `P03-T10`; Phase 06 `P06-T05`.

### HB-03 - Async Title Generation Race
- Severity: medium
- Likelihood: high
- Why hard:
  - Placeholder, streamed title event, and DB persistence complete on different clocks.
- Trigger conditions:
  - Chat deletion/rename while async title update still in flight.
- Early detection checks:
  - Sidebar stale-title detection scenario.
  - Idempotent title update assertions by chat id.
- Mitigation:
  - Source-of-truth precedence in `P03-T10`.
  - Contract fixture in `P05-T03`.
- Mapping:
  - Phase 03 `P03-T10`; Phase 05 `P05-T03`; Phase 06 `P06-T04`.

### HB-04 - Artifact Event-Sourced State Machine
- Severity: critical
- Likelihood: high
- Why hard:
  - Mixed stream parts (`kind/id/title/clear/delta/finish`) drive secondary UI state machine.
- Trigger conditions:
  - Out-of-order or dropped parts, reconnect, or partial artifact-tool failure.
- Early detection checks:
  - Delta ordering tests and finish-state invariants.
  - Artifact panel open/close consistency checks.
- Mitigation:
  - Explicit state transition table in `P03-T05`.
  - Reliability matrix in `P06-T03`.
- Mapping:
  - Phase 03 `P03-T05`, `P03-T08`; Phase 06 `P06-T03`.

### HB-05 - Suggestion Stream Transient + Persistence Split
- Severity: high
- Likelihood: medium
- Why hard:
  - Suggestions stream for all, persist only for non-guest users.
- Trigger conditions:
  - Identity switch mid-session, persistence failure after stream success.
- Early detection checks:
  - Guest/non-guest branch fixture for same prompt.
  - Non-disclosure assertion on retrieval when persistence absent.
- Mitigation:
  - Branch contract in `P02-T05` and `P03-T10`.
  - API fixture locking in `P05-T05`.
- Mapping:
  - Phase 02 `P02-T05`; Phase 03 `P03-T10`; Phase 05 `P05-T05`; Phase 06 `P06-T04`.

### HB-06 - Guest Cache-Only Durability Semantics
- Severity: high
- Likelihood: high
- Why hard:
  - Guest behavior depends on Redis health and differs sharply from regular DB-backed users.
- Trigger conditions:
  - Cache outage/eviction while guest actively using chat/artifacts.
- Early detection checks:
  - Degraded cache simulation for guest flows.
  - UX durability messaging assertion.
- Mitigation:
  - Lifecycle policy in `P01-T04`.
  - End-to-end guest durability tests in `P06-T02`.
- Mapping:
  - Phase 01 `P01-T04`; Phase 03 feature tasks; Phase 06 `P06-T02`.

### HB-07 - Visibility Toggle Optimistic Persistence
- Severity: high
- Likelihood: medium
- Why hard:
  - UI optimism plus server ownership checks can diverge briefly.
- Trigger conditions:
  - Ownership mismatch or late route revalidation.
- Early detection checks:
  - Toggle-then-refresh consistency tests.
  - Owner/non-owner branch tests for private/public states.
- Mitigation:
  - Visibility matrix resolved in `P00-T04`, enforced in `P03-T04` and `P05-T02`.
- Mapping:
  - Phase 00 `P00-T04`; Phase 03 `P03-T04`; Phase 05 `P05-T02`; Phase 06 `P06-T02`.

### HB-08 - Edit/Regenerate Trailing Delete Integrity
- Severity: high
- Likelihood: medium
- Why hard:
  - Timestamp-based truncation must remove dependent vote/message state consistently.
- Trigger conditions:
  - Concurrent stream completion while edit/regenerate starts.
- Early detection checks:
  - Transaction integrity checks for trailing delete.
  - Regenerate-with-old-tail regression scenario.
- Mitigation:
  - Transactional contract in `P02-T02`.
  - Recovery implementation in `P03-T08`.
- Mapping:
  - Phase 02 `P02-T02`; Phase 03 `P03-T08`; Phase 06 `P06-T03`.

### HB-09 - Upload Queue Backpressure + IME-Safe Submit
- Severity: high
- Likelihood: high
- Why hard:
  - Concurrency caps, cancel/retry, and keyboard handling combine in one hot path.
- Trigger conditions:
  - Large multi-file batch + rapid submit + intermittent upload failures.
- Early detection checks:
  - Queue pressure E2E with IME composition.
  - Stuck-upload and duplicate-submit guard assertions.
- Mitigation:
  - Concurrency contract in `P02-T06`.
  - UX recovery in `P03-T06/P03-T09`.
- Mapping:
  - Phase 02 `P02-T06`; Phase 03 `P03-T06`, `P03-T09`; Phase 06 `P06-T05`.

### HB-10 - Runtime Model Catalog Variability
- Severity: medium
- Likelihood: high
- Why hard:
  - Available models depend on env/provider discovery at runtime.
- Trigger conditions:
  - Environment key changes or provider outages.
- Early detection checks:
  - Startup catalog snapshot and validation checks.
  - UI/backend selected-model contract test.
- Mitigation:
  - Canonical capability authority in `P01-T02`.
  - Contract tests in `P06-T04`.
- Mapping:
  - Phase 01 `P01-T02`; Phase 03 model flows; Phase 06 `P06-T04`.

### HB-11 - Reasoning Tool-Gating Split Across Layers
- Severity: high
- Likelihood: medium
- Why hard:
  - Separate UI/backend policy branches can drift on attachments/tools/reasoning.
- Trigger conditions:
  - Policy update shipped in one layer only.
- Early detection checks:
  - Policy parity fixture: same model ID evaluated by route and UI.
- Mitigation:
  - Central policy module (`P01-T02`) and wrapper compliance (`P04-T02`).
- Mapping:
  - Phase 01 `P01-T02`; Phase 04 `P04-T02`; Phase 05 route finalization.

### HB-12 - Health Degraded (HTTP 200) Interpretation
- Severity: medium
- Likelihood: medium
- Why hard:
  - Status body can be degraded while transport status remains 200.
- Trigger conditions:
  - Partial dependency outage or missing critical env vars.
- Early detection checks:
  - Health contract tests for healthy/degraded/unhealthy matrix.
- Mitigation:
  - Canonical registry in `P01-T03` and route lock in `P05-T07`.
- Mapping:
  - Phase 01 `P01-T03`; Phase 05 `P05-T07`; Phase 06 `P06-T07`.

### HB-13 - Edge Fail-Open vs Fail-Closed Limiter Mix
- Severity: high
- Likelihood: medium
- Why hard:
  - Different limiter behavior by route class (auth stricter than general paths).
- Trigger conditions:
  - Redis unavailability during auth-heavy periods.
- Early detection checks:
  - Chaos tests by route group under Redis outage.
- Mitigation:
  - Explicit policy in `P01-T04` and auth route finalization in `P05-T04`.
- Mapping:
  - Phase 01 `P01-T04`; Phase 05 `P05-T04`; Phase 06 `P06-T07`.

### HB-14 - Ownership Privacy Non-Disclosure Patterns
- Severity: critical
- Likelihood: medium
- Why hard:
  - Some endpoints intentionally return empty data instead of not-found to avoid disclosure.
- Trigger conditions:
  - Unauthorized access probing on document/suggestion/chat resources.
- Early detection checks:
  - Security tests for response-shape non-disclosure.
  - Message-to-chat membership validation tests.
- Mitigation:
  - Guard contract in `P01-T01/P01-T05`.
  - Endpoint lock in `P05-T02/P05-T05`.
- Mapping:
  - Phase 01 + Phase 05 + Phase 06 `P06-T07`.

### HB-15 - Artifact Code Execution Runtime Availability
- Severity: high
- Likelihood: medium
- Why hard:
  - Local execution depends on optional runtime loading and safety constraints.
- Trigger conditions:
  - Pyodide unavailable, timeout, or unsafe execution path.
- Early detection checks:
  - Capability detection + fallback UX tests.
  - Explicit unsafe-operation assertions.
- Mitigation:
  - Safety policy implementation in `P03-T07`, API contract in `P05-T06`.
- Mapping:
  - Phase 03 `P03-T07`; Phase 05 `P05-T06`; Phase 06 `P06-T07`.

### HB-16 - Multi-Hub Exit Gate Saturation
- Severity: high
- Likelihood: high
- Why hard:
  - Exit tasks (`P03-T11`, `P05-T08`, `P06-T08`) have high fan-in and block whole phases.
- Trigger conditions:
  - One high-risk predecessor unresolved close to gate date.
- Early detection checks:
  - Gate-readiness checklists with explicit predecessor acceptance evidence.
- Mitigation:
  - Pre-gate dry runs and waiver protocol.
- Mapping:
  - Dependencies critical path and inter-phase gate chain.

### HB-17 - Canonical Payload Adoption Drift
- Severity: high
- Likelihood: high
- Why hard:
  - Tests and clients may rely on stale payload assumptions during cutover to canonical contracts.
- Trigger conditions:
  - Contract update without synchronized fixtures.
- Early detection checks:
  - Canonical contract fixture suite in CI with schema diff alarms.
- Mitigation:
  - Canonical payload policy locked in `P00-T06`, finalized in `P05-T03`.
- Mapping:
  - Phase 00 `P00-T06`; Phase 05 `P05-T03`; Phase 06 `P06-T04`.

### HB-18 - Wrapper Boundary Leakage
- Severity: medium
- Likelihood: medium
- Why hard:
  - UI wrappers can accidentally absorb business logic and drift from policy authority.
- Trigger conditions:
  - Fast UI fixes bypassing `components/ai` boundary contracts.
- Early detection checks:
  - Import boundary lint checks and wrapper API review checklist.
- Mitigation:
  - Boundary audit/refactor in `P04-T01/P04-T02/P04-T03`.
- Mapping:
  - Phase 04 tasks, then validated in Phase 06 UI regressions.

## Conclusions
- Hard behaviors cluster around asynchronous state convergence (streaming, optimistic updates, artifact deltas), identity branching (guest vs regular), and policy drift (visibility, model capability, canonical contract adherence).
- The highest replay difficulty appears before and at phase-gate convergence points, especially where high-risk predecessor tasks feed hard gates.
