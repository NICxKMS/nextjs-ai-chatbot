# Final Plan — Preamble

## 1. PREAMBLE — Architecture Decisions (Deviations)

### Blocking Deviations (Resolved Before Phase 01)

| ID | Title | Spec Says | We Do Instead | User Decision Required |
|----|-------|-----------|---------------|-------------------------|
| D-001 | Next.js App Router Default Export Exception | Named exports only; no default exports | Allow default exports only for App Router convention files (`page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx`, `not-found.tsx`); named elsewhere | **YES (RESOLVED)** |
| D-002 | Canonical Root Layout And Alias Policy | Mixed `components/*` vs `src/components/*` | Lock `src/` as canonical root and enforce `@/* -> src/*` | **YES (RESOLVED)** |
| D-003 | Immediate Artifact/Document Canonical Rename | Artifact/document unification intent but mixed contracts | Apply canonical naming immediately with no compatibility aliases | **YES (RESOLVED)** |
| D-004 | Visibility Authorization Matrix Before Route Finalization | Public/private read/stream semantics ambiguous | Define endpoint-level authorization matrix before route finalization | **YES (RESOLVED)** |
| D-005 | Canonical API Contract Without Compatibility Window | Legacy/paginated contract stance under-defined | Adopt canonical paginated payload contract immediately; no legacy/full compatibility mode | **YES (RESOLVED)** |
| D-006 | Single AI Capability Policy Authority | Capability constraints split across layers | Centralize in shared `lib/ai` authority | **YES (RESOLVED)** |
| D-PERF-002 | Pagination-Only Canonical Contract Policy | Legacy/full and paginated co-equal | Keep paginated contract as the only supported mode | **YES (RESOLVED)** |

### Non-Blocking Deviations (No User Decision Required)

| ID | Title | We Do Instead |
|----|-------|---------------|
| D-007 | Explicit Slim-Route Responsibility Budget | Route handlers: guard, validate, delegate, standardized response only |
| D-008 | Enforced Cross-Feature Boundary Rules | Restricted imports to approved feature public/action entrypoints |
| D-009 | Selective Barrel Policy For AI Integration | Barrels at public boundaries only; avoid deep/internal barrels |
| D-010 | Guest Lifecycle And Durability Contract | Define explicit lifecycle contract and user-facing durability messaging |
| D-011 | Canonical AI Error And Health Registry | Define canonical status/error registry for AI and route boundaries |

### Resolved Non-Blocking User Decisions

| ID | Title | User Decision Required |
|----|-------|-------------------------|
| D-012 | Opt-In Local Code Execution With Safety Fallbacks | **RESOLVED** — local execution opt-in with strict fallback |
| D-PERF-001 | Selective Barrel Exports For Runtime Efficiency | **RESOLVED** — selective barrels at public boundaries only |

---

## 2. PREAMBLE — Spec Issues

| ID | Severity | Issue | Correction |
|----|----------|-------|------------|
| SI-001 | Critical | Export rule forbids default exports; App Router requires them | D-001: allow required convention defaults |
| SI-002 | Critical | Path roots conflict (`components/*` vs `src/components/*`) | D-002: lock canonical root and alias |
| SI-003 | High | Artifact/document unification incomplete | D-003: immediate canonical rename with no alias window |
| SI-004 | High | Plan/spec file targets diverge | Regenerate from canonical architecture |
| SI-005 | High | Slim-route policy ambiguous | D-007: explicit responsibility budget |
| SI-006 | High | Cross-feature boundary weakly enforced | D-008: restricted-import rules |
| SI-007 | Medium | Rate-limit specs diverge across files | Single source-of-truth route policy table |
| SI-008 | Medium | Wrapper layer responsibility creep | Clarify: presentation+UI state only |
| SI-009 | Medium | Service placement ambiguous | Define service taxonomy and fixed locations |
| SI-010 | Medium | Barrel mandate too absolute | D-009/D-PERF-001: selective barrels |
| SI-011 | Medium | Stale App Router idioms in examples | Add Next.js 16 verified examples only |
| SI-012 | Low | File counts/LOC estimates vary | Treat as non-normative; auto-generate from tree |

---

## 3. PREAMBLE — Risk Summary

### Top 10 Risks

| Rank | ID | Risk | Severity | Likelihood | Primary Phases |
|------|-----|------|----------|------------|----------------|
| 1 | TR-01 | Stream + artifact terminal-state non-determinism | critical | high | 03, 06 |
| 2 | TR-02 | Visibility authorization policy misconfiguration risk (G001/D-004) | critical | medium | 00, 05, 06 |
| 3 | TR-03 | AI capability policy drift (G002/D-006) | critical | medium | 01, 04, 05 |
| 4 | TR-04 | Gate saturation at P03-T11, P05-T08, P06-T08 | high | high | 03, 05, 06 |
| 5 | TR-05 | Hard cutover drift risk during canonical API contract adoption (G004/D-005/D-PERF-002) | high | medium | 00, 02, 05, 06 |
| 6 | TR-06 | Canonical artifact/document rename rollout risk (G003/D-003) | high | medium | 00, 02, 05 |
| 7 | TR-07 | Upload queue backpressure and composer stuck (G006) | high | high | 02, 03, 06 |
| 8 | TR-08 | Guest durability mismatch (G007/D-010) | high | high | 01, 03, 06 |
| 9 | TR-09 | Security non-disclosure/ownership edge regressions | high | medium | 01, 05, 06 |
| 10 | TR-10 | Critical-path SLO misses discovered late | high | high | 04, 06 |

### Highest Residual-Risk Phases

1. **Phase 03** — most complex async behavior convergence
2. **Phase 06** — cross-phase defects become release blockers
3. **Phase 05** — contract lock-point with high fan-in

### Mitigation Priorities

- Treat G001–G004 closure as non-negotiable before high-cost implementation
- Require explicit high-risk predecessor readiness evidence before each fan-in exit gate
- Keep one canonical policy authority per domain (AI capability, visibility, health/error)
- Gate release on blocking deviation closure or explicit user acceptance

---

## 4. PREAMBLE — UI/UX Release Standard

- Final UI and UX must be exactly same as `oldapp/` or improved.
- Improvements are valid only when no regression exists in:
	- interaction states,
	- accessibility behavior,
	- responsive behavior,
	- route/shell loading and error/recovery behavior.
- Any UI/UX regression is release-blocking until resolved.
