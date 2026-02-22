# Risk Domain Index

Purpose: central risk register for rebuild planning with explicit hard-to-reproduce oldapp behaviors, phase-level risk analysis, and mitigation guidance.

## Inputs Read Before Scoring
- `/.apm/guides/Context_Synthesis_Guide.md`
- `memory/behavioral_spec/index.md`
- `memory/spec/index.md`
- `memory/ui/index.md`
- `memory/gaps/index.md`
- `memory/strategy/index.md`
- `memory/phases/index.md`
- `memory/dependencies/index.md`
- `memory/deviations/index.md`

## Files
1. `memory/risk/audit_summary.md`
   - Global risk method, ranking framework, top-10 risk set, and residual-risk conclusions.
2. `memory/risk/hard_behaviors.md`
   - Oldapp hard-to-reproduce behavior inventory with triggers, detection checks, and mitigation controls.
3. `memory/risk/phase_risks_1.md`
   - Detailed risks for Phase 00 through Phase 03.
4. `memory/risk/phase_risks_2.md`
   - Detailed risks for Phase 04 through Phase 06.

## Severity / Likelihood Scale
- Severity: `critical`, `high`, `medium`, `low`
- Likelihood: `high`, `medium`, `low`
- Priority score (for ordering): `5x3` qualitative matrix
  - `critical/high` is highest response priority.

## Coverage Snapshot
- Hard behaviors tracked: 18
- Per-phase risk entries tracked: 28
- Top risks in summary: 10
- Highest residual-risk phases: 03, 05, 06

## Maintenance Notes
- Keep each file under 400 lines.
- Update this index whenever risk files are split, merged, or renamed.
- Treat phase risk files as planning artifacts; implementation teams should translate accepted controls into task-level acceptance criteria and test fixtures.
