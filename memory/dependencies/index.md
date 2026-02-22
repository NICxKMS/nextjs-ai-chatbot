# Dependencies Index

Purpose: canonical dependency planning set for inter-phase sequencing, intra-phase ordering, cycle detection, and critical-path control.

## Files
- [Graph Summary](./graph_summary.md)
- [Inter-Phase Dependencies](./inter_phase.md)
- [Critical Path](./critical_path.md)
- [Phase 00 Internal](./phase_00_internal.md)
- [Phase 01 Internal](./phase_01_internal.md)
- [Phase 02 Internal](./phase_02_internal.md)
- [Phase 03 Internal](./phase_03_internal.md)
- [Phase 04 Internal](./phase_04_internal.md)
- [Phase 05 Internal](./phase_05_internal.md)
- [Phase 06 Internal](./phase_06_internal.md)

## Coverage
- Phases covered: `phase_00` through `phase_06`
- Task universe analyzed: 58 tasks
- Dependency classes:
  - Inter-phase hard gates
  - Intra-phase task edges
  - Gate-readiness sequencing constraints
  - Fan-in and fan-out risk nodes

## Core Conclusions
- Graph is **cycle-free** under declared dependencies.
- Primary execution topology is a strict phase-gate chain with controlled fan-out at each phase exit node.
- Critical path bottleneck centers on Phase 03 stream/artifact/recovery lane, then converges through Phase 04-06 exit gates.
- Highest schedule risk remains concentrated at multi-input exit verifications and phase gate tasks.
