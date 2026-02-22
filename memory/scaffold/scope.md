# Phase 00 Scaffold Scope

## Objective
Create an execution-safe baseline aligned to Next.js 16 and Vercel AI SDK before feature work.

## In Scope (Required)
1. Canonical project root and import alias policy decision.
2. Next.js App Router file-convention policy (required default export exceptions).
3. Layer boundary enforcement setup (lint rules and allowed cross-layer imports).
4. Cross-cutting policy scaffolds:
   - AI capability policy authority location and interface.
   - Visibility/access contract placeholders for API surfaces.
   - Error/health contract registry stubs.
5. Artifact/domain canonical naming strategy scaffold (no alias/deprecation path).
6. Test and verification harness baseline for contract checks and phase gating.
7. Deviation logging domain and active deviation register.

## Out Of Scope (Phase 00)
- Full feature parity implementation.
- Full UI parity implementation.
- Complete data migrations and schema rewrites.
- Performance tuning beyond required safety baselines.

## Why This Scope Is Mandatory
- G001-G004 are contract-defining gaps and block safe implementation sequencing.
- SI-001 and SI-002 are critical contradictions that can invalidate generated structure.
- Early policy authority prevents duplicated logic and future churn.

## Entry Criteria
- Domain indexes exist and are current:
  - `memory/behavioral_spec/index.md`
  - `memory/spec/index.md`
  - `memory/ui/index.md`
  - `memory/gaps/index.md`
- Gap register and spec issue critique have been read and incorporated.

## Exit Criteria (Must Pass All)
1. Canonical path root/alias policy documented and accepted.
2. Next.js file-convention exception policy documented and accepted.
3. Boundary-enforcement rule set documented, including cross-feature policy.
4. Capability policy ownership and contract skeleton documented.
5. Visibility, canonical artifact naming, and canonical API contract stance documented.
6. Deviation register created and populated with blocking/non-blocking classification.
7. Phase 01 plan references all Phase 00 decisions and no unresolved blocker remains.

## Gate Rule
- If any blocking deviation remains unresolved after Phase 00, execution does not proceed to feature phases.
