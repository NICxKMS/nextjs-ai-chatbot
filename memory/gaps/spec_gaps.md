# Spec Gaps

## Method
Derived from explicit `Uncovered` and high-risk `Partial` items in:
- `memory/gaps/build_map_1.md`
- `memory/gaps/build_map_2.md`

## Gap Register
| Gap ID | Related behaviors | Gap statement | Decision (resolved baseline) | Impacted phase areas | Source refs |
|---|---|---|---|---|---|
| G001 | B058 | Public visibility semantics are not contractually defined (owner-only vs authenticated non-owner vs anonymous read/stream). | Approved: enforce a canonical public-read/public-stream authorization matrix per endpoint. | Phase 3 (features/chat), Phase 5 (app/api chat routes), Phase 6 (integration/e2e). | @behavioral_spec/edge_cases_1.md#a1-public-chat-access-semantics-uncertain, @spec/spec_issues.md#issues |
| G002 | B014, B046, B049 | Model capability policy is split across UI and backend with no canonical source-of-truth. | Approved: `lib/ai/capability-policy` is the sole authority with a shared provider-option/reasoning matrix. | Phase 1 (infra policy module), Phase 3 (chat/artifact features), Phase 5 (chat route + provider middleware). | @behavioral_spec/ai_behaviors.md#2-model-identity-reasoning-and-provider-options, @behavioral_spec/edge_cases_1.md#a3-model-capability-policy-drift, @spec/spec_issues.md#issues |
| G003 | B019, B038, B039, B040, B041, B050 | Artifact/document naming remains mixed across tools/routes/data keys despite unification intent. | Approved: immediate canonical naming cutover with no alias/deprecation path. | Phase 2 (data/repositories), Phase 3 (artifact feature), Phase 5 (API contracts). | @behavioral_spec/data_flows_2.md#flow-10-document-crudversion-flows, @spec/architecture.md#10-artifact-unification-architecture, @spec/spec_issues.md#issues |
| G004 | B055, B059 | Legacy-vs-paginated API shape compatibility is unspecified; tests may encode stale payload assumptions. | Approved: pagination-only canonical contract plus canonical payload fixtures. | Phase 5 (route contracts), Phase 6 (integration/e2e + contract tests). | @behavioral_spec/api_contracts.md#3-get-apichatidmessages, @behavioral_spec/edge_cases_1.md#a2-test-vs-runtime-schema-drift-risk |
| G005 | B022 | Local code execution sandbox/runtime contract (Pyodide availability, security boundaries, failure UX) is not represented in interpreted spec. | Approved: local execution remains opt-in only with strict safety bounds and deterministic fallback UX. | Phase 3 (artifact code editor), Phase 4 (shared components), Phase 6 (security/perf tests). | @behavioral_spec/features_1.md#9-document-artifact-workspace, @behavioral_spec/edge_cases_1.md#h-artifact-specific-boundaries |
| G006 | B025 | Upload concurrency and client backpressure behavior lacks normative constraints in spec. | Approved: enforce bounded queue concurrency with explicit retry/cancel contract. | Phase 3 (chat feature hooks/components), Phase 6 (frontend reliability tests). | @behavioral_spec/features_1.md#10-file-attachments |
| G007 | B002, B030, B060 | Guest lifecycle details are incomplete (bootstrap ownership, `isNewSession` semantics, durability messaging). | Approved: define canonical guest lifecycle and user-facing durability disclosure contract. | Phase 1 (middleware/auth infra), Phase 3 (auth/history UX), Phase 5 (guest auth routes). | @behavioral_spec/data_flows_1.md#flow-1-session-bootstrap-and-identity-resolution, @behavioral_spec/edge_cases_1.md#a4-guest-durability-expectations |
| G008 | B053, B056 | Operational error and health semantics are only partially specified (code maps, degraded criteria). | Approved: enforce canonical health thresholds and complete error-code-to-status registry. | Phase 1 (infra observability/errors), Phase 5 (health/auth/chat routes), Phase 6 (ops tests). | @behavioral_spec/api_contracts.md#13-get-apihealth, @behavioral_spec/ai_behaviors.md#10-error-and-fallback-semantics-in-ai-path |
| G009 | B006, B009, B012, B015, B018, B029, B034, B036, B051 | Optimistic UI/recovery and race behavior are present in oldapp but under-specified in migration spec. | Approved: enforce explicit optimistic apply/reconcile/rollback and race-conflict handling contract. | Phase 3 (chat/history/artifact features), Phase 4 (shared wrappers), Phase 6 (UI regression testing). | @behavioral_spec/features_1.md#14-loading-error-and-recovery-ux, @behavioral_spec/data_flows_1.md#flow-8-visibility-update |

## Coverage Math
- Total behavior units: 60
- Uncovered: 1 (directly blocked by gaps above)
- Partial requiring execution hardening to prevent drift: 34
- Fully covered: 25

## Execution Priority
1. G001/G002/G003/G004 (contract-defining, high regression risk).
2. G007/G008 (cross-cutting infra + reliability).
3. G005/G006/G009 (experience and operational hardening).

## Conclusions
- Contract-defining gaps (G001-G004) are decision-closed in the current baseline and now act as implementation gates.
- Remaining gaps are implementation-hardening items with explicit owners and phase enforcement paths.
