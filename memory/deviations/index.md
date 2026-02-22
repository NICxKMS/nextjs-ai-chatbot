# Deviations Index

## Purpose
Track approved/proposed deviations from interpreted migration spec when a better implementation approach is identified.

## Files
1. `memory/deviations/deviation_log.md`
   - Master summary log (all tracked deviations).
2. `memory/deviations/architecture_deviation.md`
   - Architecture/foundation deviations (`D-001`, `D-002`, `D-008`).
3. `memory/deviations/routing_deviation.md`
   - Route/security/contract deviations (`D-004`, `D-005`, `D-007`).
4. `memory/deviations/state_deviation.md`
   - State/data domain deviations (`D-003`, `D-010`, `D-012`).
5. `memory/deviations/ai_integration_deviation.md`
   - AI policy/integration deviations (`D-006`, `D-009`, `D-011`).
6. `memory/deviations/performance_deviation.md`
   - Performance-focused deviations (`D-PERF-001`, `D-PERF-002`).

## Protocol
Every deviation entry includes:
- Deviation ID
- Title
- Date
- Category
- Related Spec Issue/Gap
- Spec says
- We do instead
- Reason
- Trade-offs
- Severity
- Blocking
- User Decision Required
- User Decision
- Status

Master-log policy:
- Spec baseline and proposed deviation
- Reasoning and expected impact
- Every tracked deviation appears in `deviation_log.md`.

## Current State
- Tracked deviations: 14
- Blocking deviations: 7 (`D-001`, `D-002`, `D-003`, `D-004`, `D-005`, `D-006`, `D-PERF-002`)
- User decisions pending: 0
