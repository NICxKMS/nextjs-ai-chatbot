# Strategy Domain Index

Purpose: define scaffold-first build sequencing, gates, and ownership strategy grounded in memory outputs.

## Files
- `memory/strategy/plan.md`
  - Strategic rationale, architecture choices, and deviation-aware planning rules.
- `memory/strategy/phase_order.md`
  - Ordered phases with entry/exit criteria and gate logic.
- `memory/strategy/agent_assignments.md`
  - Recommended ownership by phase and decision handoff points.

## Core Decisions
- Phase 00 scaffold is a hard sequential gate.
- Contract-defining gaps (G001-G004) are prioritized before feature parity breadth.
- Next.js 16 and Vercel AI SDK alignment supersede contradictory legacy spec statements.

## Input Domains
- Behavioral requirements: `memory/behavioral_spec/index.md`
- Spec interpretation and critique: `memory/spec/index.md`
- UI parity risks: `memory/ui/index.md`
- Gap and improvement map: `memory/gaps/index.md`
- Scaffold controls: `memory/scaffold/index.md`
- Deviation register: `memory/deviations/index.md`

## Maintenance Notes
- Keep each strategy file under 400 lines.
- Update this index if strategy files are added/split/renamed.
