# Phase 01 — Core Infrastructure Policy Foundation

**Scope:** Convert scaffold decisions into executable infrastructure interfaces.

**Entry Gate:** P00-T09 complete

**Task Count:** 8

---

## Tasks

### P01-T01 — Create Shared Request Context and Guard Pipeline Contract
- **Task ID:** P01-T01
- **Dependencies:** P00-T09
- **Complexity:** M
- **Success Criteria:**
  - Request context contract documents auth, ownership, and quota lookup surfaces
  - Guard chain ordering is explicit and reusable by route handlers

### P01-T02 — Implement AI Capability Policy Authority Interface
- **Task ID:** P01-T02
- **Dependencies:** P00-T09, P01-T01
- **Complexity:** M
- **Success Criteria:**
  - Single capability policy interface covers model/tool/attachment/reasoning checks
  - Consumer contract is shared across route, middleware, and UI wrapper adapters
- **References:** D-006, G002

### P01-T03 — Define Canonical Error and Health Registry Contract
- **Task ID:** P01-T03
- **Dependencies:** P00-T09, P01-T01
- **Complexity:** M
- **Success Criteria:**
  - Error-code-to-status registry includes AI and route boundaries
  - Health registry defines healthy/degraded/unhealthy criteria with measurable thresholds
  - Global error fallback contract enforces generic messaging and no sensitive-detail leakage
  - Global error contract includes full-page replacement semantics for uncaught route-level failures
- **References:** D-011

### P01-T04 — Normalize Middleware and Auth/Guest Lifecycle Policy
- **Task ID:** P01-T04
- **Dependencies:** P00-T09, P01-T03
- **Complexity:** M
- **Success Criteria:**
  - Guest bootstrap and durability messaging contract is codified
  - Edge and node limiter branches for auth/guest routes are documented without conflict
  - Provider bootstrap behavior prevents auth-state flash and preserves shell fallback sequencing
- **References:** D-010, G007

### P01-T05 — Define Route Slimness Enforcement Contract
- **Task ID:** P01-T05
- **Dependencies:** P00-T09, P01-T02
- **Complexity:** S
- **Success Criteria:**
  - Route responsibility budget is explicit (guard, validate, delegate, respond only)
  - Non-compliant route responsibilities are enumerated for later remediation
- **References:** D-007

### P01-T06 — Define Cross-Feature Import Enforcement Rule Set
- **Task ID:** P01-T06
- **Dependencies:** P00-T09, P01-T02
- **Complexity:** S
- **Success Criteria:**
  - Allowed and forbidden feature import paths are machine-enforceable
  - Public entrypoint requirement is documented for feature-to-feature access
- **References:** D-008

### P01-T07 — Register Stream and Guard Performance SLO Instrumentation
- **Task ID:** P01-T07
- **Dependencies:** P00-T09, P01-T03
- **Complexity:** M
- **Success Criteria:**
  - Metrics catalog includes stream start, inter-chunk gap, resume hit ratio, and guard overhead
  - Instrumentation ownership boundaries are defined for route vs client processing

### P01-T08 — Execute Infrastructure Policy Foundation Exit Verification
- **Task ID:** P01-T08
- **Dependencies:** P01-T04, P01-T05, P01-T06, P01-T07
- **Complexity:** S
- **Success Criteria:**
  - All Phase 01 interfaces are declared stable for Phase 02 consumers
  - Any remaining blocker is explicitly listed with decision owner and closure phase
