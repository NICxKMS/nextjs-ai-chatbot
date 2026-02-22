# Phase 04 Internal Dependencies

## Intra-Phase Graph
- `P04-T01` -> `P04-T02`
- `P04-T01` -> `P04-T03`
- `P04-T02` -> `P04-T04`
- `P04-T02` -> `P04-T05`
- `P04-T03` -> `P04-T04`
- `P04-T03` -> `P04-T05`
- `P04-T04` -> `P04-T06`
- `P04-T05` -> `P04-T07`
- `P04-T06` -> `P04-T07`

## Structure
- Boundary audit (`T01`) is root.
- Wrapper-consumer refactor and read-only path enforcement (`T02`,`T03`) run in parallel.
- Accessibility/keyboard (`T04`) drives performance validation (`T06`), while responsive parity (`T05`) joins final exit (`T07`).

## Cycle Check
- Result: cycle-free.

## Internal Risk Nodes
- Paired dependency nodes: `T04` and `T05` each rely on both `T02` and `T03`.
- High fan-in: `T07` (2 upstream validation lanes)

## Sequencing Risks
- If boundary remediation from `T01` is incomplete, both `T02` and `T03` become unstable.
- Performance validation (`T06`) can surface regressions that require revisiting wrapper contracts late in phase.

## Remediation
- Gate `T02`/`T03` start on explicit severity-sorted findings from `T01`.
- Run focused render-surface smoke checks before full `T06`.
