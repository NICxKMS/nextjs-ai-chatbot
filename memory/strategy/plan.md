# Scaffold-First Build Strategy Plan

## Strategic Rationale
The current memory outputs show strong behavioral coverage but unresolved contract and architecture contradictions. The safest build strategy is to sequence risk retirement first (policy, naming, route contracts, framework conventions) and only then execute feature breadth.

Key evidence:
- G001-G004 are contract-defining and block implementation safety.
- SI-001 and SI-002 are critical and can invalidate structure if unresolved.
- UI parity risk concentrates in streaming chat/artifact choreography and optimistic/race behavior.

## Strategy Principles
1. Scaffold before features.
2. Resolve cross-cutting contracts before component-level parity.
3. Keep framework-constrained rules authoritative (Next.js 16 App Router conventions).
4. Prefer single policy authority for AI capabilities and route contract semantics.
5. Treat deviations as explicit decisions, never silent drift.

## Architecture Choices (With Rationale)

### A) Canonical Root Strategy
- Choose one canonical root layout and one alias policy (`@/*`) for all new build paths.
- Rationale: resolves SI-002 and prevents duplicate path trees.

### B) Next.js File-Convention Exception Policy
- Allow required default exports in App Router convention files (`page.tsx`, `layout.tsx`, `error.tsx`, etc.).
- Keep named-export preference everywhere else.
- Rationale: resolves SI-001 while preserving consistency elsewhere.

### C) Contract-First API Policy
- Lock visibility/read-stream semantics and canonical payload policy before route implementation spread.
- Rationale: resolves G001 and G004 early to avoid client/test churn.

### D) Single Capability Authority
- Establish a single `lib/ai` policy authority consumed by route, provider middleware, and UI wrappers.
- Rationale: resolves G002 and prevents policy drift.

### E) Canonical Artifact Naming
- Use immediate canonical naming across all surfaces with no compatibility aliases.
- Rationale: resolves G003 while eliminating transitional technical debt.

## Deviation Governance
- Every deviation must be recorded with:
  - DEVIATION
  - Area
  - Spec says
  - We do instead
  - Reason
  - Trade-offs
  - User decision required (YES/NO)
- Blocking deviations must be resolved before phase exit if marked blocking in phase rules.

## Gate Policy

### Hard Sequential Gate
- Phase 00 must complete and verify all blocking scaffold decisions before any feature phase starts.

### Blocking Conditions
- Missing canonical root/alias decision.
- Missing Next.js export exception policy.
- Missing visibility contract decision lane.
- Missing canonical artifact naming and canonical API contract stance.
- Missing AI capability policy authority decision.

### Non-Blocking Conditions
- Improvements that can safely run parallel after contracts are fixed (e.g., extra reliability hardening not needed for baseline parity).

## Conclusions
This plan intentionally front-loads contract correctness and architecture coherence. It reduces rework and security/regression risk while keeping delivery incremental through bounded phases and explicit gate checks.
