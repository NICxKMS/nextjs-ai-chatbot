# Phase 05 — App Router API Contract Finalization

**Scope:** Finalize external behavior contracts; eliminate ambiguity between runtime, client, and test fixtures.

**Entry Gate:** P04-T07 complete

**Task Count:** 8 (all required; local execution policy resolved)

---

## Tasks

### P05-T01 — Standardize Route Error Envelope and Status Mapping
- **Task ID:** P05-T01
- **Dependencies:** P04-T07
- **Complexity:** M
- **Success Criteria:**
  - Error envelope shape and status mapping are uniform across core endpoints
  - Shared route error helper contract is fixture-backed for downstream route tasks

### P05-T02 — Finalize Chat and Stream Route Authorization Semantics
- **Task ID:** P05-T02
- **Dependencies:** P05-T01
- **Complexity:** M
- **Success Criteria:**
  - Public/private chat read/stream semantics are codified in route behavior
  - Ownership and non-owner access outcomes are deterministic and testable
  - Existing-chat readonly-mode and vote-preload authorization semantics are contract-locked and fixture-backed
- **References:** D-004

### P05-T03 — Finalize Canonical Message and History Contracts
- **Task ID:** P05-T03
- **Dependencies:** P05-T01
- **Complexity:** M
- **Success Criteria:**
  - Canonical pagination contract is active and documented as the only supported mode
  - Response examples are stable for integration and e2e fixture usage
  - Vote and upload contract fixtures cover canonical request/response envelopes, auth posture, and error-code behavior
- **References:** D-005, D-PERF-002

### P05-T04 — Finalize Auth and Guest Mutation Route Policy
- **Task ID:** P05-T04
- **Dependencies:** P05-T01
- **Complexity:** M
- **Success Criteria:**
  - CSRF, rate-limit, and token exchange behavior is contractually explicit for auth routes
  - Guest bootstrap and logout semantics are aligned with lifecycle policy
  - Login and register async branch outcomes are contract-locked to expected redirect and toast sequencing
  - Login/register screen UX contracts include responsive layout behavior and submit live-region semantics

### P05-T05 — Finalize Document/Artifact and Suggestion Route Contract Surface
- **Task ID:** P05-T05
- **Dependencies:** P05-T02
- **Complexity:** M
- **Success Criteria:**
  - Route naming and response fields follow approved canonical contract strategy
  - Suggestion persistence branch behavior remains identity-aware and non-disclosing
- **References:** D-003

### P05-T06 — Finalize Local Execution API Safety and Fallback Exposure
- **Task ID:** P05-T06
- **Dependencies:** P05-T03
- **Complexity:** M
- **Success Criteria:**
  - API-visible runtime capability/fallback behavior is explicit for code artifacts
  - Security and failure exposure contract is testable and bounded
- **References:** D-012, G005

### P05-T07 — Finalize Health and Operational Error Contract
- **Task ID:** P05-T07
- **Dependencies:** P05-T04
- **Complexity:** S
- **Success Criteria:**
  - Health route status semantics and component checks are complete and unambiguous
  - Operational error mappings are aligned with canonical registry
  - Proxy liveness (`/ping`) and edge rate-limit response-header semantics are contract-defined and fixture-backed
- **References:** D-011

### P05-T08 — Execute API Finalization Exit Verification
- **Task ID:** P05-T08
- **Dependencies:** P05-T05, P05-T06, P05-T07
- **Complexity:** S
- **Success Criteria:**
  - Route contract fixtures are complete for integration test consumption
  - No blocking route/API deviation remains unresolved
