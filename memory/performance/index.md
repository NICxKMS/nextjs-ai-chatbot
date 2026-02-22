# Performance Index

## Purpose
Define migration-time performance requirements and architecture opportunities based on behavioral evidence and interpreted spec constraints.

## Inputs Read
- `/.apm/guides/Context_Synthesis_Guide.md`
- `memory/behavioral_spec/index.md`
- `memory/spec/index.md`
- `memory/gaps/index.md`
- `memory/behavioral_spec/ai_behaviors.md`
- `memory/behavioral_spec/data_flows_1.md`
- `memory/behavioral_spec/data_flows_2.md`
- `memory/behavioral_spec/features_1.md`
- `memory/behavioral_spec/features_2.md`
- `memory/behavioral_spec/api_contracts.md`
- `memory/behavioral_spec/edge_cases_1.md`
- `memory/spec/architecture.md`
- `memory/spec/patterns_1.md`
- `memory/spec/patterns_2.md`
- `memory/spec/spec_issues.md`
- `memory/gaps/spec_gaps.md`
- `memory/gaps/improvement_opportunities.md`

## Outputs
1. `memory/performance/requirements.md`
   - Quantified performance SLO/SLA targets with evidence links and impacted phases.
2. `memory/performance/architecture_opportunities.md`
   - Concrete architecture opportunities and regression-prone spec patterns.

## Coverage Focus
- Streaming chat first token/start behavior and stream continuity.
- API latency envelopes for chat/history/document/upload/auth flows.
- UI interaction responsiveness under virtualized and streaming workloads.
- Cache/DB and guest-mode dependency behavior under degraded conditions.
- Migration risks from spec ambiguities that can create performance regressions.

## Status
- Requirements extracted and quantified where feasible.
- Opportunities mapped to architecture decisions and phase owners.
- Performance deviations logged under `memory/deviations/` with severity and decision flags.
