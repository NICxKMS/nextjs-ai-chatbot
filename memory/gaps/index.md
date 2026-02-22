# Gaps Index

## Purpose
Behavior-to-spec mapping outputs for migration planning. This index tracks coverage status, file partitioning, and resolved decision baselines.

## Inputs Read
- Behavioral domain index: @behavioral_spec/index.md#behavioral-spec-index-oldapp-reference
- Spec domain index: @spec/index.md#spec-interpretation-index
- Synthesis rules: `/.apm/guides/Context_Synthesis_Guide.md`

## Output Files
1. `memory/gaps/build_map_1.md`
   - Behavior mappings B001-B032 (identity/chat/artifacts/model policy/primary flows).
2. `memory/gaps/build_map_2.md`
   - Behavior mappings B033-B060 (API contracts, boundary states, operational controls).
3. `memory/gaps/spec_gaps.md`
   - Uncovered and partially covered behaviors, resolved decisions, and phase impacts.
4. `memory/gaps/improvement_opportunities.md`
   - Prioritized improvement opportunities and recommended owners.

## Coverage Snapshot
- Total behavior units mapped: 60
- Explicitly uncovered units: 1
- Mapped (covered or partial): 59
- Coverage ratio (mapped/total): 98.3%

## Top Gap Themes
- Public visibility/read semantics unresolved vs auth-guard posture.
- Artifact/document naming unification is incomplete across APIs/tools/schema.
- Capability policy source-of-truth split (UI vs backend model/tool constraints).
- Route policy drift (rate-limit tables, endpoint naming, payload contract assumptions).

## Decision Baseline Pointer
Use `memory/gaps/spec_gaps.md` as the authoritative resolved decision baseline for manager-phase sequencing.

## Notes
- All behavior units are explicitly mapped or explicitly flagged uncovered.
- Mapping references use source anchors like `@behavioral_spec/file.md#section` and `@spec/file.md#section`.
