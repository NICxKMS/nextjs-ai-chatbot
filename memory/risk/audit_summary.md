# Risk Audit Summary

Date: 2026-02-22  
Scope: rebuild planning risk analysis across Phase 00-06 using behavioral/spec/gap/deviation/dependency evidence.

## Reasoning Approach
- Risk scoring prioritized:
  1) severity of behavioral/security/schedule impact,
  2) likelihood under current plan constraints,
  3) dependency-centrality (gate/fan-in/critical-path location).
- Oldapp-specific hard behaviors were treated as first-class risk drivers, not incidental test cases.
- High-risk gate predecessors and unresolved deviations were weighted as multiplier factors for gate risk.

## Top 10 Risks (Ranked)

| Rank | Risk ID | Risk | Severity | Likelihood | Primary phases |
|---|---|---|---|---|---|
| 1 | TR-01 | Stream + artifact terminal-state non-determinism | critical | high | 03, 06 |
| 2 | TR-02 | Visibility authorization policy misconfiguration risk (G001/D-004) | critical | medium | 00, 05, 06 |
| 3 | TR-03 | AI capability policy drift across UI/backend (G002/D-006) | critical | medium | 01, 04, 05 |
| 4 | TR-04 | Gate saturation at `P03-T11` / `P05-T08` / `P06-T08` | high | high | 03, 05, 06 |
| 5 | TR-05 | Hard cutover drift risk during canonical payload adoption (G004/D-005/D-PERF-002) | high | medium | 00, 02, 05, 06 |
| 6 | TR-06 | Canonical artifact/document naming rollout risk (G003/D-003) | high | medium | 00, 02, 05 |
| 7 | TR-07 | Upload queue backpressure and composer stuck states (G006) | high | high | 02, 03, 06 |
| 8 | TR-08 | Guest durability and cache-only failure semantics mismatch (G007/D-010) | high | high | 01, 03, 06 |
| 9 | TR-09 | Security non-disclosure/ownership edge regressions | high | medium | 01, 05, 06 |
| 10 | TR-10 | Critical-path SLO misses discovered late | high | high | 04, 06 |

## Risk Details (Top 10)

### TR-01 - Stream + artifact terminal-state non-determinism
- Why likely:
  - Multi-channel stream (`content + metadata + artifact deltas`) with reconnect and async persistence.
- Key triggers:
  - Reconnect near completion, out-of-order events, missing finish markers.
- Early detection:
  - Deterministic event-order tests + reliability soak tests.
- Mitigation priorities:
  - Phase 03 `P03-T02`, `P03-T05`, `P03-T08`.
  - Phase 06 `P06-T03` as release blocker.

### TR-02 - Visibility authorization policy misconfiguration risk
- Why severe:
  - Direct security/privacy exposure risk.
- Key triggers:
  - Ambiguous actor matrix (owner/non-owner/authenticated/anonymous).
- Early detection:
  - Endpoint x actor contract fixture set.
- Mitigation priorities:
  - Resolve in `P00-T04`; finalize in `P05-T02`; verify in `P06-T02`.

### TR-03 - AI capability policy drift across layers
- Why severe:
  - Contradictory behavior for model tools/attachments/reasoning.
- Key triggers:
  - Policy logic split between UI and route middleware.
- Early detection:
  - Policy parity tests using identical model ids and contexts.
- Mitigation priorities:
  - Centralize in `P01-T02`; enforce wrappers in `P04-T02`; lock route usage in Phase 05.

### TR-04 - Gate saturation at high fan-in exits
- Why likely:
  - Critical-path hubs with multiple high-risk predecessors.
- Key triggers:
  - One unresolved predecessor close to gate date.
- Early detection:
  - Pre-gate dry run and dependency disposition board.
- Mitigation priorities:
  - Mandatory readiness checkpoints before `P03-T11`, `P05-T08`, `P06-T08`.

### TR-05 - Hard cutover drift during canonical payload adoption
- Why likely:
  - Existing uncertainty between tests and runtime schemas.
- Key triggers:
  - Fixture updates lagging contract changes.
- Early detection:
  - Canonical fixture CI suite and schema diff alarms.
- Mitigation priorities:
  - Define in `P00-T06` and `P02-T04`; finalize in `P05-T03`; verify in `P06-T04`.

### TR-06 - Artifact/document naming divergence
- Why severe:
  - Cross-layer contract breakage and migration churn.
- Key triggers:
  - Incomplete one-pass rename leaves mixed naming in one or more layers.
- Early detection:
  - Naming consistency scans across route, repo, and UI DTOs.
- Mitigation priorities:
  - `P00-T05`, `P02-T01`, `P05-T05`.

### TR-07 - Upload queue backpressure and stuck composer states
- Why likely:
  - High-concurrency edge in heavily interactive UI path.
- Key triggers:
  - Multi-file uploads with retries/cancels and rapid submit.
- Early detection:
  - Queue stress scenarios with IME keyboard cases.
- Mitigation priorities:
  - Contract in `P02-T06`; implement in `P03-T06/P03-T09`; regress in `P06-T05`.

### TR-08 - Guest durability mismatch
- Why likely:
  - Cache-only persistence and outage sensitivity are core branch behavior.
- Key triggers:
  - Redis eviction/outage during active guest usage.
- Early detection:
  - Guest outage E2E with expected UX messaging.
- Mitigation priorities:
  - Lifecycle policy in `P01-T04`; verification in `P06-T02`.

### TR-09 - Security non-disclosure regressions
- Why severe:
  - Resource existence can leak through response-shape differences.
- Key triggers:
  - Endpoint-specific error mapping divergence.
- Early detection:
  - Adversarial response-shape tests across ownership states.
- Mitigation priorities:
  - Guard contracts in Phase 01; route lock in Phase 05; hardening in `P06-T07`.

### TR-10 - Late SLO failures on critical path
- Why likely:
  - Performance checks often happen after contract completion.
- Key triggers:
  - Increased render scope and stream handling overhead under load.
- Early detection:
  - Early perf baselines from Phase 01/04 and continuous SLO regression alerts.
- Mitigation priorities:
  - Instrumentation in `P01-T07`, wrapper perf checks in `P04-T06`, release gate in `P06-T06`.

## Highest Residual-Risk Phases
1. Phase 03 - most complex async behavior convergence and gate dependencies.
2. Phase 06 - where cross-phase defects, reliability issues, and SLO misses become release blockers.
3. Phase 05 - contract lock-point with high fan-in and local execution safety risk.

## Cross-Phase Mitigation Priorities
- Treat `G001-G004` closure as non-negotiable before high-cost implementation breadth.
- Require explicit high-risk predecessor readiness evidence before each fan-in exit gate.
- Keep one canonical policy authority per domain (AI capability, visibility, health/error).
- Use hard-behavior coverage as matrix input for Phase 06 integration plans.
- Gate release on blocking deviation closure or explicit user acceptance.

## Conclusions
- The plan is structurally sound (cycle-free dependency graph with coherent phase gates), but risk concentration is high around async behavior fidelity and gate convergence.
- Residual risk can be reduced significantly by front-loading contract decisions, enforcing policy centralization, and treating reliability/performance checks as continuous controls rather than end-only validation.
