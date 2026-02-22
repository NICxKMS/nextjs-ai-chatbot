# Verification Index

## Purpose
Track phase-gate verification reports for the planning pipeline with PASS/FAIL outcomes, confidence values, and remediation notes.

## Files
1. `memory/verification/phase_1.md`
   - Discovery gate for behavioral, spec, and UI extraction quality.
2. `memory/verification/phase_2.md`
   - Gap-analysis gate for behavior-to-build mapping completeness and traceability.
3. `memory/verification/phase_3.md`
   - Strategy/performance/deviation gate for scaffold-first sequencing and decision logging quality.
4. `memory/verification/phase_4.md`
   - Task-planning gate for atomicity, references, dependencies, and phase constraints.
5. `memory/verification/phase_5.md`
   - Dependency gate for inter-phase, intra-phase, cycle detection, and critical path.
6. `memory/verification/phase_6.md`
   - Risk gate for hard behaviors, per-phase risk, and mitigation traceability.
7. `memory/verification/phase_7.md`
   - UI parity gate for checklist coverage and task evidence traceability.
8. `memory/verification/phase_8.md`
   - Full plan validation gate for complete planning memory system.

## Maintenance Rule
Add one new `phase_X.md` file per planning stage and keep this index current whenever a new verification report is created or re-run.
