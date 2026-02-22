# Phase 00 — Scaffold

**Scope:** Establish non-negotiable scaffold baseline and resolve contract-defining decisions before implementation.

**Gate Rule:** No downstream phase starts before Phase 00 verifies complete.

**Task Count:** 9 (0 conditional; decisions resolved as hard constraints)

---

## Tasks

### P00-T01 — Publish Scaffold Gate Manifest
- **Task ID:** P00-T01
- **Dependencies:** None
- **Complexity:** S
- **Success Criteria:**
  - Scaffold gate checklist explicitly enumerates required decisions and evidence artifacts
  - Gate checklist references all downstream phase entry dependencies

### P00-T02 — Confirm App Router Default Export Exception Policy
- **Task ID:** P00-T02
- **Dependencies:** P00-T01
- **Complexity:** S
- **Success Criteria:**
  - Accepted decision records exact files where default export is allowed
  - Lint-policy intent documented for default-export exceptions and named-export default elsewhere
- **References:** SI-001, D-001

### P00-T03 — Confirm Canonical Root and Alias Policy
- **Task ID:** P00-T03
- **Dependencies:** P00-T01
- **Complexity:** S
- **Success Criteria:**
  - Single canonical root layout is selected and documented
  - Alias mapping policy (`@/*`) includes migration mapping expectations
- **References:** SI-002, D-002

### P00-T04 — Confirm Visibility Authorization Matrix
- **Task ID:** P00-T04
- **Dependencies:** P00-T01
- **Complexity:** M
- **Success Criteria:**
  - Endpoint-level read/stream authorization matrix for private/public chats is defined
  - Matrix distinguishes owner, authenticated non-owner, and anonymous access posture
- **References:** G001, D-004

### P00-T05 — Confirm Artifact/Document Canonical Naming Strategy
- **Task ID:** P00-T05
- **Dependencies:** P00-T01
- **Complexity:** M
- **Success Criteria:**
  - Canonical naming is locked for route, repository, and UI surfaces with no alias/deprecation path
  - Naming contract states canonical identifiers for route, repository, and UI surfaces
- **References:** G003, D-003

### P00-T06 — Confirm Canonical API Contract and Pagination Policy
- **Task ID:** P00-T06
- **Dependencies:** P00-T01
- **Complexity:** M
- **Success Criteria:**
  - Canonical paginated response shape is documented as the only supported contract
  - Fixture requirements align to canonical payloads only (no legacy/full mode fixtures)
- **References:** G004, D-005, D-PERF-002

### P00-T07 — Define Boundary Enforcement Baseline
- **Task ID:** P00-T07
- **Dependencies:** P00-T02, P00-T03
- **Complexity:** M
- **Success Criteria:**
  - Layer import boundary policy includes explicit cross-feature constraints
  - Enforcement scope distinguishes allowed public entrypoints vs forbidden internals
- **References:** D-008

### P00-T08 — Publish Cross-Cutting Policy Authority Lanes
- **Task ID:** P00-T08
- **Dependencies:** P00-T04, P00-T05, P00-T06
- **Complexity:** M
- **Success Criteria:**
  - Ownership lanes exist for AI capability policy, error/health registry, and visibility checks
  - Policy lanes include named producer/consumer boundaries for later phases
- **References:** D-006

### P00-T09 — Execute Scaffold Hard-Gate Verification
- **Task ID:** P00-T09
- **Dependencies:** P00-T07, P00-T08
- **Complexity:** S
- **Success Criteria:**
  - All blocking decisions are resolved or explicitly approved
  - Gate output marks pass/fail with unresolved blockers list (if any)

---

## Exit Criteria (Must Pass All)

1. Canonical path root/alias policy documented and accepted
2. Next.js file-convention exception policy documented and accepted
3. Boundary-enforcement rule set documented, including cross-feature policy
4. Capability policy ownership and contract skeleton documented
5. Visibility, canonical artifact naming, and canonical API contract stance documented
6. Deviation register created and populated with blocking/non-blocking classification
7. Phase 01 plan references all Phase 00 decisions and no unresolved blocker remains
