# ai-assistant – APM Implementation Plan
**Memory Strategy:** Dynamic-MD + Repository Memory Baseline (`memory/`)
**Last Modification:** 2026-02-22 – Migration orchestration bootstrap aligned to manager/subagent execution
**Project Overview:** Full codebase migration from `oldapp/` into the current repository using the verified planning memory as source-of-truth and strict phase-gated execution.

## Canonical Migration Inputs (Read Before Execution)
1. `memory/final_plan_preamble.md`
2. `memory/final_plan_phase_00.md` ... `memory/final_plan_phase_06.md`
3. `memory/final_plan_appendix.md`
4. `memory/deviations/deviation_log.md`
5. `memory/verification/phase_1.md` ... `memory/verification/phase_8.md`

## Manager Orchestrator Contract
- Manager is orchestration-only: no direct implementation edits.
- Every assigned task must reference:
	- phase (`P00` ... `P06`)
	- task id (`PXX-TYY`)
	- acceptance criteria source (`memory/phases/**/tasks.md`)
- Cross-phase ordering is mandatory and follows hard gates from `memory/dependencies/inter_phase.md`.
- Any blocking deviation must be resolved or explicitly accepted before advancing to downstream gated phases.

## Autonomous Execution Mode
- Execution proceeds autonomously by default across eligible tasks and phases.
- No manual confirmation is required between routine tasks, provided gate rules remain satisfied.
- On validation failure, manager issues targeted remediation tasks and continues.
- Manager escalates to user only for hard blockers:
	- unresolved blocking deviations,
	- missing credentials/access,
	- destructive decisions outside approved policy.

## UI/UX Parity Lock
- Final UI and UX must be exactly same as `oldapp/` or improved.
- Any improvement must preserve behavior parity and must not regress:
	- interaction states,
	- accessibility,
	- responsiveness,
	- loading/error/recovery flows.
- UI-touching tasks must reference and verify against:
	- `memory/ui/parity_checklist_1.md`
	- `memory/ui/parity_checklist_2.md`
	- `memory/ui/interaction_states.md`
	- `memory/ui/parity_validation.md`

## Subagent Compatibility Profile
- Execution subagents are declared in `.github/agents/` and must be used for implementation workstreams.
- Planning/audit subagents remain valid for verification, risk, and coverage checks.
- Preferred implementation routing:
	- backend/data/API: `backend-specialist`, `data-specialist`
	- UI/component work: `frontend-specialist`
	- docs/contracts: `docs-specialist`
	- reliability/integration: `integration-specialist`, `qa-specialist`
	- infra/pipeline: `devops-specialist`

## Validation Gates (Required)
- `pnpm format`
- `pnpm typecheck`
- `pnpm lint`

## Execution Prompt Source
- Primary manager prompt: `.apm/prompts/full-codebase-migration-manager.prompt.md`

## Reporting Requirements
- Subagents report changed files, gate/test outcomes, unresolved risks, and explicit next actions.
- Manager appends phase outcomes into `.apm/Memory/Memory_Root.md` and keeps task-level logs in `.apm/Memory/Phase_XX_*/Task_*.md`.

