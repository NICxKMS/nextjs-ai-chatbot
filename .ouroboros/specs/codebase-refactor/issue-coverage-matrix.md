# Issue Coverage Matrix

> **Purpose**: Maps ALL issues from implementation-plan.md to spec requirements  
> **Created**: 2025-12-26  
> **Status**: Complete

---

## Issue Count Summary

| Category | Count | Covered in Spec |
|----------|-------|-----------------|
| P1-xxx (Wave 1 issues) | 4 | ✅ REQ-W1-001 to REQ-W1-004 |
| P2-xxx (Wave 2 issues) | 4 | ✅ REQ-W2-001 to REQ-W2-004 |
| P3-xxx (Wave 3 issues) | 3 | ✅ REQ-W3-001 to REQ-W3-003 |
| P4-xxx (Wave 4 issues) | 5 | ✅ REQ-W4-001, REQ-W4-002 |
| P5-xxx (Wave 5 issues) | 5 | ✅ REQ-W5-001, REQ-W5-002 |
| P6-xxx (Wave 6 issues) | 3 | ✅ REQ-W6-001 |
| P7-xxx (Wave 7 issues) | 4 | ✅ REQ-W7-001, REQ-W7-002 |
| P8-xxx (Wave 8 issues) | 2 | ✅ REQ-W8-001, REQ-W8-002 |
| P9-xxx (Informational) | 6 | ℹ️ No action required |
| V2-xxx (V2 additions) | 23 | ✅ Integrated into waves |
| **Total Actionable** | **53** | **All covered** |

---

## Detailed Issue-to-Requirement Mapping

### Wave 1: Foundation

| Issue ID | Issue Title | Requirement | Task(s) |
|----------|-------------|-------------|---------|
| P1-001 | UUID Validation Duplication | REQ-W1-001 | T001-T003 |
| V2-001 | Auth Service UUID Bug | REQ-W1-001 | T003 |
| P1-002 | Parameter Validation | REQ-W1-002 | T004-T006 |
| P1-003 | JSON Body Parsing | REQ-W1-003 | T007-T008 |
| P1-004 | Service Error Handling | REQ-W1-004 | T009-T012 |
| V2-009 | Service Error Logging | REQ-W1-004 | T010 |

### Wave 2: Route Refactoring

| Issue ID | Issue Title | Requirement | Task(s) |
|----------|-------------|-------------|---------|
| P2-001 | Vote Route SRP | REQ-W2-001 | T013-T016 |
| V2-005 | Complexity Metrics | REQ-W2-001 | T015 |
| P2-002 | Document Route SRP | REQ-W2-002 | T017-T020 |
| P2-003 | File Upload Route | REQ-W2-003 | T021-T025 |
| P2-004 | API Error Handler | REQ-W2-004 | T026-T028 |

### Wave 3: Validation Layer

| Issue ID | Issue Title | Requirement | Task(s) |
|----------|-------------|-------------|---------|
| P3-001 | Validation Fragmentation | REQ-W3-001 | T029-T035 |
| V2-006 | 4 Validation Patterns | REQ-W3-001 | T032 |
| P3-002 | Business Rules | REQ-W3-002 | T036-T038 |
| P3-003 | Request Parsing | REQ-W3-001 | T035 |
| V2-007 | Auth Entry Points | REQ-W3-003 | T039-T042 |

### Wave 4: Dead Code Cleanup

| Issue ID | Issue Title | Requirement | Task(s) |
|----------|-------------|-------------|---------|
| P4-001 | DataStreamHandler | REQ-W4-001 | T043-T044 |
| V2-004 | Additional DSH Usage | REQ-W4-001 | T043 |
| P4-002 | SessionManager | REQ-W4-001 | T045-T046 |
| P4-003 | useInvalidationHandler | REQ-W4-001 | T047 |
| P4-004 | toUnixTimestamp | REQ-W4-001 | T050 |
| P4-005 | messages.ts | REQ-W4-002 | T048-T049 |

### Wave 5: Pattern Standardization

| Issue ID | Issue Title | Requirement | Task(s) |
|----------|-------------|-------------|---------|
| P5-001 | Result Type Variations | REQ-W5-001 | T051-T055 |
| V2-010 | 5 Result Types | REQ-W5-001 | T051 |
| V2-002 | API Response Types | REQ-W5-001 | T056-T058 |
| V2-003 | Cache Transform | REQ-W5-001 | T054 |
| P5-002 | Auth Pattern Variations | REQ-W3-003 | T042 |
| P5-003 | Zod Error Formatting | REQ-W1-003 | T006 |
| P5-004 | Env Variable Access | REQ-W5-002 | T059-T066 |
| V2-008 | 265 process.env | REQ-W5-002 | T061-T064 |
| P5-005 | Env Check Inconsistency | REQ-W5-002 | T065 |

### Wave 6: Guards & Authorization

| Issue ID | Issue Title | Requirement | Task(s) |
|----------|-------------|-------------|---------|
| P6-001 | Guest User Check | REQ-W6-001 | T068 |
| P6-002 | Ownership Verification | REQ-W6-001 | T069 |
| P6-003 | Guard Ordering | REQ-W6-001 | T070-T071 |
| V2-012 | Race Condition | REQ-W6-001 | T072 |

### Wave 7: Code Quality

| Issue ID | Issue Title | Requirement | Task(s) |
|----------|-------------|-------------|---------|
| P7-001 | Redundant Comments | REQ-W7-001 | T075 |
| V2-019 | Additional Comments | REQ-W7-001 | T075 |
| P7-002 | Low-Value Comments | REQ-W7-001 | T076 |
| P7-003 | errorLogger Naming | REQ-W7-002 | T077 |
| V2-021 | errorLogger vs Services | REQ-W7-002 | T077 |
| P7-004 | Magic Numbers | REQ-W7-002 | T078 |
| V2-020 | Title Truncation | REQ-W7-002 | T078 |
| V2-013 | Zustand Field Copy | REQ-W7-002 | T079 |
| V2-017 | Import Ordering | REQ-W7-002 | T080 |
| V2-018 | Export Headers | REQ-W7-002 | T081 |

### Wave 8: Testing & Config

| Issue ID | Issue Title | Requirement | Task(s) |
|----------|-------------|-------------|---------|
| P8-001 | Test Helper Duplication | REQ-W8-001 | T085 |
| V2-015 | 4 Duplicated Functions | REQ-W8-001 | T085 |
| V2-022 | Redis Mock Setup | REQ-W8-001 | T086 |
| V2-023 | Session Mock Setup | REQ-W8-001 | T087 |
| P8-002 | Validation Config | REQ-W8-002 | T088 |
| V2-016 | Feature Flags | REQ-W8-002 | T088 |

### Wave 9: Performance

| Issue ID | Issue Title | Requirement | Task(s) |
|----------|-------------|-------------|---------|
| V2-011 | Cache Hit Not Used | REQ-W9-001 | T097 |
| V2-014 | Inefficient Queries | REQ-W9-002 | T098-T099 |

### Wave 10: Systemic (Informational items)

| Issue ID | Issue Title | Status | Notes |
|----------|-------------|--------|-------|
| P9-001 | State Management | ✅ GOOD | No action |
| P9-002 | Performance Caching | ✅ GOOD | No action |
| P9-003 | Code Ordering | ✅ GOOD | No action |
| P9-004 | Function vs Class | ✅ GOOD | No action |
| P9-005 | Global State | ✅ GOOD | No action |
| P9-006 | Circular Dependency | ✅ MITIGATED | No action |

---

## Coverage Verification

### All P-Issues Covered

| P-Issue | Covered | Requirement |
|---------|---------|-------------|
| P1-001 to P1-004 | ✅ | Wave 1 |
| P2-001 to P2-004 | ✅ | Wave 2 |
| P3-001 to P3-003 | ✅ | Wave 3 |
| P4-001 to P4-005 | ✅ | Wave 4 |
| P5-001 to P5-005 | ✅ | Wave 5 |
| P6-001 to P6-003 | ✅ | Wave 6 |
| P7-001 to P7-004 | ✅ | Wave 7 |
| P8-001 to P8-002 | ✅ | Wave 8 |
| P9-001 to P9-006 | ℹ️ | Informational |

### All V2-Issues Covered

| V2-Issue | Covered | Requirement |
|----------|---------|-------------|
| V2-001 | ✅ | REQ-W1-001 (UUID bug fix) |
| V2-002 | ✅ | REQ-W5-001 (API Response) |
| V2-003 | ✅ | REQ-W5-001 (Cache Transform) |
| V2-004 | ✅ | REQ-W4-001 (DSH usage) |
| V2-005 | ✅ | REQ-W2-001 (Complexity) |
| V2-006 | ✅ | REQ-W3-001 (4 patterns) |
| V2-007 | ✅ | REQ-W3-003 (Auth entry) |
| V2-008 | ✅ | REQ-W5-002 (process.env) |
| V2-009 | ✅ | REQ-W1-004 (Error logging) |
| V2-010 | ✅ | REQ-W5-001 (5 Result types) |
| V2-011 | ✅ | REQ-W9-001 (Cache hit) |
| V2-012 | ✅ | REQ-W6-001 (Race condition) |
| V2-013 | ✅ | REQ-W7-002 (Zustand) |
| V2-014 | ✅ | REQ-W9-002 (Query optimization) |
| V2-015 | ✅ | REQ-W8-001 (Test helpers) |
| V2-016 | ✅ | REQ-W8-002 (Feature flags) |
| V2-017 | ✅ | REQ-W7-002 (Import ordering) |
| V2-018 | ✅ | REQ-W7-002 (Export headers) |
| V2-019 | ✅ | REQ-W7-001 (Comments) |
| V2-020 | ✅ | REQ-W7-002 (Magic numbers) |
| V2-021 | ✅ | REQ-W7-002 (Naming) |
| V2-022 | ✅ | REQ-W8-001 (Redis mock) |
| V2-023 | ✅ | REQ-W8-001 (Session mock) |

---

## Summary

**Total Issues in implementation-plan.md:** 53 actionable + 6 informational = 59 total
**Issues Covered in Spec:** 53 actionable (100%)
**Issues Not Requiring Action:** 6 (P9-xxx marked as GOOD)

**✅ ALL ACTIONABLE ISSUES ARE COVERED IN THE SPEC**

---

## Cross-Reference

The following spec files contain the complete coverage:
- [requirements.md](./requirements.md) - 25 EARS requirements covering all issues
- [design.md](./design.md) - Design components for all requirements
- [tasks.md](./tasks.md) - 114 tasks implementing all requirements
- [validation-report.md](./validation-report.md) - Traceability matrix

