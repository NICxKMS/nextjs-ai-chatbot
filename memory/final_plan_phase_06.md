# Phase 06 — Integration Verification And Hardening

**Scope:** Execution-safe release criteria: cross-domain integration correctness, performance SLO adherence, residual-risk handling.

**Entry Gate:** P05-T08 complete

**Task Count:** 8

---

## Tasks

### P06-T01 — Build Integration Verification Matrix From Phase Contracts
- **Task ID:** P06-T01
- **Dependencies:** P05-T08
- **Complexity:** M
- **Success Criteria:**
  - Matrix maps behavior units and route contracts to integration and e2e scenarios
  - Each high-risk parity area has at least one dedicated regression scenario

### P06-T02 — Verify Auth, Guest, and Visibility End-to-End Semantics
- **Task ID:** P06-T02
- **Dependencies:** P06-T01
- **Complexity:** M
- **Success Criteria:**
  - Owner/non-owner/guest behavior across private/public chats matches approved matrix
  - Guest durability messaging and failure handling match lifecycle policy
  - Existing-chat readonly-mode and vote-preload semantics are validated across ownership branches
- **References:** D-004, D-010

### P06-T03 — Verify Streaming, Artifact, and Resume Integration Reliability
- **Task ID:** P06-T03
- **Dependencies:** P06-T01
- **Complexity:** L
- **Success Criteria:**
  - Stream interruptions, resume behavior, and artifact delta application pass reliability scenarios
  - No duplicate terminal states or missing artifact finish transitions under retry/reconnect

### P06-T04 — Verify Canonical API Contract Fixture Stability
- **Task ID:** P06-T04
- **Dependencies:** P06-T01
- **Complexity:** M
- **Success Criteria:**
  - Canonical payload fixtures pass expected scenarios across all supported endpoints
  - Schema and runtime behavior remain aligned across tested endpoints
  - Vote/upload/proxy-liveness (`/ping`) fixtures are included in canonical API contract coverage
- **References:** D-005, D-PERF-002

### P06-T05 — Validate UI Interaction-State Regression Suite
- **Task ID:** P06-T05
- **Dependencies:** P06-T02
- **Complexity:** M
- **Success Criteria:**
  - Loading, empty, error, submitted, streaming, and recovery states are verified across primary surfaces
  - Final UI/UX status is `same` or `improved` versus oldapp across touched surfaces
  - Keyboard and screen-reader critical interactions are covered by regression checks
  - Route-level loading copy variants and error-panel action composition are asserted explicitly
  - Timeline virtualization/scroll controls and message-part action semantics are covered by regression scenarios
  - Any UI/UX regression is treated as release-blocking until corrected
  - Reasoning-panel focus/auto-close behavior, message/toolbar motion expectations, and route-notice URL cleanup semantics are asserted explicitly

### P06-T06 — Validate Performance SLO Compliance for Critical Paths
- **Task ID:** P06-T06
- **Dependencies:** P06-T03
- **Complexity:** L
- **Success Criteria:**
  - Critical p95/p99 targets for stream start, inter-chunk gap, history/messages latency, and UI responsiveness are measured
  - Any SLO miss includes remediation owner and rollback criteria

### P06-T07 — Validate Security and Operational Hardening Scenarios
- **Task ID:** P06-T07
- **Dependencies:** P06-T04
- **Complexity:** M
- **Success Criteria:**
  - CSRF/rate-limit/ownership controls pass adversarial and degraded-dependency scenarios
  - Health status reporting behavior remains deterministic under partial outages
  - Proxy edge-rate-limit behaviors and `/ping` liveness checks remain deterministic under load

### P06-T08 — Execute Final Release Readiness and Deviation Closure Review
- **Task ID:** P06-T08
- **Dependencies:** P06-T05, P06-T06, P06-T07
- **Complexity:** S
- **Success Criteria:**
  - Blocking deviations are closed or explicitly accepted by user decision
  - Final readiness report includes residual risks, accepted trade-offs, and post-release watch list
