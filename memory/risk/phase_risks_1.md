# Phase Risks 1 (Phase 00-03)

Risk ordering uses severity first, then likelihood.

## Phase 00 - Scaffold

### R00-01 - Blocking decisions unresolved at hard gate
- Severity: critical
- Likelihood: medium
- Affected tasks/dependencies:
  - `P00-T02..P00-T06` -> `P00-T08` -> `P00-T09`
- Risk:
  - Any unresolved contract decision (visibility, naming, canonical payload policy, export policy) blocks all downstream phases.
- Trigger conditions:
  - Required contract artifact still incomplete at `P00-T09`.
- Early detection checks:
  - Daily blocker ledger with owner + due date.
  - Pre-gate checklist requiring explicit resolution or approved waiver.
- Mitigation:
  - Enforce “no unresolved blocker” entry condition at `P00-T09`.
  - Escalate unresolved blockers before any Phase 01 task starts.

### R00-02 - Incomplete visibility matrix definition (G001)
- Severity: high
- Likelihood: high
- Affected tasks:
  - `P00-T04`, later `P03-T04`, `P05-T02`, `P06-T02`
- Risk:
  - Public/private owner/non-owner semantics remain ambiguous; privacy regression risk.
- Trigger conditions:
  - Matrix omits anonymous vs authenticated non-owner branch outcomes.
- Early detection checks:
  - Contract table review against all relevant endpoints.
- Mitigation:
  - Require endpoint x actor matrix with acceptance tests before phase exit.

### R00-03 - Canonical contract policy underdefined (G003/G004)
- Severity: high
- Likelihood: high
- Affected tasks:
  - `P00-T05`, `P00-T06`, downstream Phase 02/05.
- Risk:
  - Build introduces schema/payload drift and duplicate naming surfaces.
- Trigger conditions:
  - Canonical naming/payload policy missing concrete fixtures and enforcement criteria.
- Early detection checks:
  - Presence of canonical fixture examples across route, repository, and UI layers.
- Mitigation:
  - Lock canonical contract samples and enforcement checks in scaffold artifacts.

## Phase 01 - Core Infrastructure Policy Foundation

### R01-01 - AI capability authority not actually centralized (G002)
- Severity: critical
- Likelihood: medium
- Affected tasks/dependencies:
  - `P01-T02` -> (`P01-T05`, `P01-T06`) -> `P01-T08`
- Risk:
  - UI and route enforce different model/tool/reasoning rules.
- Trigger conditions:
  - Multiple policy evaluators remain active after `P01-T02`.
- Early detection checks:
  - Policy parity test using identical model IDs in UI adapter and route guard.
- Mitigation:
  - Define single authority interface and ban secondary evaluators by lint/review.

### R01-02 - Guard pipeline ordering drift
- Severity: high
- Likelihood: medium
- Affected tasks:
  - `P01-T01`, `P01-T05`, `P05-*`
- Risk:
  - Ownership/rate-limit/auth checks run in inconsistent order across routes.
- Trigger conditions:
  - Route handlers add local guard ordering exceptions.
- Early detection checks:
  - Route conformance checks against canonical guard chain.
- Mitigation:
  - Shared guard composition helper and route-level conformance fixture set.

### R01-03 - Guest lifecycle and durability messaging mismatch (G007)
- Severity: high
- Likelihood: high
- Affected tasks:
  - `P01-T04`, `P03-*`, `P06-T02`
- Risk:
  - Guest users see behavior implying durability that cache-only paths cannot guarantee.
- Trigger conditions:
  - Cache eviction/outage without explicit UX copy.
- Early detection checks:
  - Guest outage scenario tests including user-facing messaging assertions.
- Mitigation:
  - Encode durability contract and mandatory copy in lifecycle policy outputs.

### R01-04 - Error/health registry lacks deterministic degraded rules (G008)
- Severity: high
- Likelihood: medium
- Affected tasks:
  - `P01-T03`, `P05-T07`, `P06-T07`
- Risk:
  - Operational status and incident response become inconsistent.
- Trigger conditions:
  - Degraded reported with undefined component thresholds.
- Early detection checks:
  - Health-state matrix test against threshold definitions.
- Mitigation:
  - Canonical registry with measurable thresholds and status mapping.

### R01-05 - Stream observability baseline misses critical signals
- Severity: medium
- Likelihood: medium
- Affected tasks:
  - `P01-T07`, `P03-T02`, `P06-T06`
- Risk:
  - Performance regressions in stream start/inter-chunk latency remain invisible.
- Trigger conditions:
  - Instrumentation omits stream continuity and resume-hit metrics.
- Early detection checks:
  - Metric completeness review against performance requirements.
- Mitigation:
  - Lock required stream telemetry schema at Phase 01 exit.

## Phase 02 - Data and Domain Contract Canonicalization Layer

### R02-01 - Canonical naming map incompleteness across routes/repos/UI (G003)
- Severity: high
- Likelihood: high
- Affected tasks:
  - `P02-T01`, `P02-T02`, `P02-T07`
- Risk:
  - Mixed artifact/document keys cause silent data path divergence.
- Trigger conditions:
  - Canonical names are selected but one layer still uses old naming.
- Early detection checks:
  - Cross-layer naming diff check (route schema vs repository vs UI DTO).
- Mitigation:
  - Publish one canonical naming matrix and require references from all consumers.

### R02-02 - Message retrieval envelope ambiguity persists (G004)
- Severity: high
- Likelihood: high
- Affected tasks:
  - `P02-T04`, `P05-T03`, `P06-T04`
- Risk:
  - Payload consumers diverge from canonical pagination contract; tests become brittle.
- Trigger conditions:
  - Cursor semantics not fixture-locked.
- Early detection checks:
  - Canonical pagination examples validated in contract tests.
- Mitigation:
  - Pagination-only canonical contract with fixture-locked cursor semantics.

### R02-03 - Cache invalidation matrix misses identity branches
- Severity: high
- Likelihood: medium
- Affected tasks:
  - `P02-T03`, `P02-T05`, `P03-T10`
- Risk:
  - Stale sidebar/history/suggestion state appears after mutations.
- Trigger conditions:
  - Guest and regular invalidation behavior treated as identical.
- Early detection checks:
  - Mutation-after-read freshness tests per identity mode.
- Mitigation:
  - Identity-aware invalidation triggers as mandatory acceptance criteria.

### R02-04 - Suggestion/vote branch contract drift
- Severity: medium
- Likelihood: medium
- Affected tasks:
  - `P02-T05`, `P03-T10`, `P05-T05`
- Risk:
  - Guest/non-guest persistence behavior leaks inconsistent UI outcomes.
- Trigger conditions:
  - Suggestion stream appears but retrieval contract not aligned.
- Early detection checks:
  - Same-input guest vs regular comparison scenarios.
- Mitigation:
  - Route + repository branch contract table and fixture coverage.

### R02-05 - Upload metadata contract not aligned with validation boundaries
- Severity: medium
- Likelihood: medium
- Affected tasks:
  - `P02-T06`, `P03-T06`, `P03-T09`
- Risk:
  - Composer/file-part assembly fails on edge MIME/size/filename cases.
- Trigger conditions:
  - Sanitization and response metadata schema mismatch.
- Early detection checks:
  - Upload contract tests for accepted/rejected file sets.
- Mitigation:
  - Deterministic metadata and error-code mapping fixtures.

## Phase 03 - Feature Verticals

### R03-01 - Stream processing non-determinism in terminal states
- Severity: critical
- Likelihood: high
- Affected tasks/dependencies:
  - `P03-T01` -> `P03-T02` -> `P03-T03`
- Risk:
  - Duplicate assistant finals, stuck streaming states, or missing finish transitions.
- Trigger conditions:
  - Out-of-order stream parts, retries, or client reconnects.
- Early detection checks:
  - Stream order/terminal invariants in integration tests.
  - Duplicate final-message detector in QA runs.
- Mitigation:
  - Deterministic event application contract and terminal-state reducer tests.

### R03-02 - Optimistic reconciliation duplicates/orphans history rows
- Severity: high
- Likelihood: high
- Affected tasks:
  - `P03-T03`, `P03-T10`, `P03-T11`
- Risk:
  - Timeline/sidebar diverge after retries or quick successive submissions.
- Trigger conditions:
  - Optimistic row id differs from canonical row id without merge rule.
- Early detection checks:
  - De-duplication invariant checks in sidebar and timeline.
- Mitigation:
  - Canonical merge key contract and rollback strategy.

### R03-03 - Artifact state machine inconsistency under interruption
- Severity: critical
- Likelihood: medium
- Affected tasks:
  - `P03-T05`, `P03-T08`, `P06-T03`
- Risk:
  - Artifact panel stuck open/closed or version metadata corrupt.
- Trigger conditions:
  - Missing `data-finish`, late `data-clear`, or interrupted delta sequence.
- Early detection checks:
  - Artifact transition matrix tests including interruption paths.
- Mitigation:
  - Explicit state machine plus interruption recovery paths.

### R03-04 - Visibility toggle contract mismatch with authorization matrix
- Severity: high
- Likelihood: medium
- Affected tasks:
  - `P03-T04`, `P05-T02`, `P06-T02`
- Risk:
  - UI indicates visibility change that server rejects or reverts silently.
- Trigger conditions:
  - Non-owner toggle or stale ownership context.
- Early detection checks:
  - Toggle-reload parity checks by actor type.
- Mitigation:
  - Optimistic policy tied to server-authoritative rollback semantics.

### R03-05 - Upload backpressure induces stuck composer states (G006)
- Severity: high
- Likelihood: high
- Affected tasks:
  - `P03-T06`, `P03-T09`, `P03-T10`
- Risk:
  - User cannot submit/cancel cleanly during high queue pressure.
- Trigger conditions:
  - Concurrent large files + intermittent failures.
- Early detection checks:
  - Queue pressure stress tests with submit/cancel/retry loops.
- Mitigation:
  - Strict queue state machine and explicit UX recovery mapping.

### R03-06 - Local execution safety envelope implementation risk (G005)
- Severity: high
- Likelihood: medium
- Affected tasks/dependencies:
  - `P03-T04` -> `P03-T07` -> `P03-T11`
- Risk:
  - Phase exit gate blocked or unsafe runtime behavior shipped.
- Trigger conditions:
  - Security/fallback policy implementation incomplete when `P03-T11` begins.
- Early detection checks:
  - Local execution safety acceptance evidence required before exit.
- Mitigation:
  - Enforce completion in `P03-T07` with carryover hardening in `P05-T06`.

### R03-07 - Sidebar async channel reconciliation drift
- Severity: medium
- Likelihood: medium
- Affected tasks:
  - `P03-T10`, upstream `P03-T08/P03-T09`
- Risk:
  - Titles/suggestions/history groups show stale or conflicting state.
- Trigger conditions:
  - Late async title event after deletion/regenerate.
- Early detection checks:
  - Sidebar consistency snapshots before/after async events.
- Mitigation:
  - Event precedence rules and reconciliation idempotency checks.

### R03-08 - Phase 03 gate saturation at `P03-T11`
- Severity: high
- Likelihood: high
- Affected dependencies:
  - (`P03-T07`, `P03-T10`) -> `P03-T11` -> all Phase 04 tasks
- Risk:
  - Single unresolved high-risk predecessor stalls all downstream work.
- Trigger conditions:
  - `P03-T07` unresolved or `P03-T10` flaky late in phase.
- Early detection checks:
  - Pre-exit gate dry run with full dependency disposition.
- Mitigation:
  - Execute readiness checks before final validation sprint; pre-approve waiver protocol.

## Conclusions
- Phase 00-03 risk is dominated by policy closure and asynchronous product behavior.
- Highest immediate execution risk sits in Phase 03 due to streaming/artifact/optimistic convergence and gate-coupling.
