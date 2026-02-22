# Critical Path

## Method
- Critical path selected as the longest dependency-constrained chain from scaffold start to final release readiness.
- Tie-breaker when multiple equal-depth branches exist:
  - prefer branches with higher complexity (`L` > `M` > `S`)
  - prefer branches feeding known high fan-in convergence nodes

## Critical Path Task Chain
`P00-T01` -> `P00-T02` -> `P00-T07` -> `P00-T09` -> `P01-T01` -> `P01-T03` -> `P01-T04` -> `P01-T08` -> `P02-T01` -> `P02-T02` -> `P02-T04` -> `P02-T07` -> `P03-T01` -> `P03-T02` -> `P03-T03` -> `P03-T05` -> `P03-T08` -> `P03-T10` -> `P03-T11` -> `P04-T01` -> `P04-T02` -> `P04-T04` -> `P04-T06` -> `P04-T07` -> `P05-T01` -> `P05-T03` -> `P05-T06` -> `P05-T08` -> `P06-T01` -> `P06-T03` -> `P06-T06` -> `P06-T08`

## Why This Is Critical
- Includes every inter-phase gate handoff from Phase 00 through Phase 06.
- Traverses longest Phase 03 lane (`submission -> stream -> optimistic reconcile -> artifact lifecycle -> edit/regenerate -> sidebar/suggestion convergence -> exit`).
- Traverses final hardening lane with direct performance SLO closure before release readiness.

## Alternate Near-Critical Branches
- Phase 03 attachment recovery branch:
  - `P03-T03` -> `P03-T06` -> `P03-T09` -> `P03-T10` -> `P03-T11`
- Phase 05 security/ops branch:
  - `P05-T01` -> `P05-T04` -> `P05-T07` -> `P05-T08`
- Phase 06 auth/UX branch:
  - `P06-T01` -> `P06-T02` -> `P06-T05` -> `P06-T08`

## Critical Path Risks
- Multi-merge nodes: `P03-T10`, `P05-T08`, `P06-T08`
- High-risk predecessor sensitivity: `P05-T06` participation in `P05-T08`
- Verification saturation: repeated exit tasks as both quality gates and schedule gates

## Remediation
- Run upstream evidence collection in parallel with late critical-path implementation tasks.
- Enforce early dry-run checks for convergence prerequisites before each exit task begins.
- Maintain explicit fallback behavior contracts so exit nodes are not blocked by unresolved implementation details.
