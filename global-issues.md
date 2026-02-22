# Global Issues Log

> **Format**: Follow the structured entry format defined in `AGENTS.md` (Issue Tracking section).
> **Rules**: Append new entries at the bottom. Do not modify or remove existing entries.

---

### [2026-02-22 10:30]
- **Category:** structural
- **Agent:** GitHub Copilot
- **Task:** Enable autonomous full-refactor orchestration
- **Context:** Orchestration and assignment docs contained manual confirmation flow (`AWAIT USER CONFIRMATION`, user handoff loop) that blocked end-to-end autonomous phase execution.
- **Root Cause:** Legacy manager-to-user-to-agent relay workflow remained in active migration guidance despite autonomous manager/subagent architecture.
- **Action:** Updated manager prompt, manager agent, assignment guide, implementation plan, and specialist agent specs to default to autonomous continuation and escalate only hard blockers.
- **Status:** resolved
- **Files:** .apm/guides/Task_Assignment_Guide.md, .apm/prompts/full-codebase-migration-manager.prompt.md, .apm/Implementation_Plan.md, .github/agents/manager-orchestrator.agent.md, .github/agents/backend-specialist.agent.md, .github/agents/data-specialist.agent.md, .github/agents/frontend-specialist.agent.md, .github/agents/integration-specialist.agent.md, .github/agents/qa-specialist.agent.md, .github/agents/devops-specialist.agent.md, .github/agents/docs-specialist.agent.md

### [2026-02-22 10:42]
- **Category:** structural
- **Agent:** GitHub Copilot
- **Task:** Remove residual manager confirmation-style delegation output
- **Context:** Manager output still ended with a permission prompt ("Want me to dispatch...") even after autonomy updates, preventing true autonomous orchestration behavior.
- **Root Cause:** Active default manager prompt in `opencode.json` did not include explicit immediate-dispatch/no-permission rules, and manager output contract still allowed recommendation-style wording.
- **Action:** Updated active manager prompt in `opencode.json`, strengthened manager migration prompt and manager orchestrator agent rules/output contract to require immediate dispatch and prohibit routine permission questions.
- **Status:** resolved
- **Files:** opencode.json, .apm/prompts/full-codebase-migration-manager.prompt.md, .github/agents/manager-orchestrator.agent.md

### [2026-02-22 11:03]
- **Category:** structural
- **Agent:** GitHub Copilot
- **Task:** Remove produce-and-stop behavior from active `.github` manager prompt path
- **Context:** Runtime manager output still stopped after status/report text despite prior autonomy updates, indicating active prompt path still contained `Start now by producing` and confirmation-driven execution semantics.
- **Root Cause:** `.github/prompts/full-codebase-migration-manager.prompt.md` and manager/initiation prompt stack (`apm-2`, `apm-3`) retained status-first/manual progression language that conflicted with autonomous subagent dispatch.
- **Action:** Updated `.github` migration manager prompt for immediate autonomous dispatch, added baseline validation non-blocking policy for non-code tasks, removed confirmation pauses in manager/implementation initiation prompts, and aligned manager rule artifacts.
- **Status:** resolved
- **Files:** .github/prompts/full-codebase-migration-manager.prompt.md, .github/prompts/apm-2-initiate-manager.prompt.md, .github/prompts/apm-3-initiate-implementation.prompt.md, .apm/prompts/full-codebase-migration-manager.prompt.md, .github/agents/manager-orchestrator.agent.md, .apm/guides/Task_Assignment_Guide.md
