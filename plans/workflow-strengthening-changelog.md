# Workflow Strengthening & Alignment — Changelog

**Date**: 2025-02-13
**Scope**: Strengthen and align APM autonomous workflows, create centralized `AGENTS.md`

---

## Files Modified

1. `AGENTS.md` (root) — **Created & Merged**
2. `.kilocode/workflows/apm-2-initiate-manager-autonomous.md` — **Updated**
3. `.kilocode/workflows/apm-3-initiate-implementation-autonomous.md` — **Updated**

## Files Deleted

- `.github/AGENTS.md` — Content merged into root `AGENTS.md`

---

## 1. AGENTS.md (Root) — Created & Merged

Previously two separate files existed: `.github/AGENTS.md` (project-specific) and a root `AGENTS.md` (agent coordination). These were merged into a single root `AGENTS.md` following industry best practices (OpenAI Codex, Next.js, Anthropic Claude.md patterns).

### Content from `.github/AGENTS.md` (Project Context)

- **Project overview**: v6.0 tech stack summary (Next.js 16, React 19, TypeScript, Drizzle, Supabase, Biome)
- **Commands tables**: Setup/dev, validation (`pnpm typecheck`, `pnpm lint`, `pnpm lint:fix`, `pnpm format`), testing (`pnpm test:unit`, `pnpm test:e2e`), database (`pnpm db:generate`, `pnpm db:migrate`, `pnpm db:studio`)
- **Project structure**: Feature-based directory tree with descriptions
- **Code style & conventions**: TypeScript strict, Biome, feature-based arch, repository/service patterns, Zod, Server Actions
- **Architecture specs**: Reference table pointing to `.ouroboros/specs/refactor-migration/`
- **Migration reference**: Source in `archive/oldapp/`, common missing files table, common packages checklist
- **APM file paths**: Quick-reference table for all APM-related files

### Content from Root `AGENTS.md` (Agent Coordination)

- **APM Agent Roles**: Manager, Implementation, Ad-Hoc with role descriptions and workflow file references
- **Responsibility Matrix**: Table showing who owns what (task delegation, code implementation, `global-issues.md`, `AGENTS.md` contributions, code quality, memory logs, error resolution)
- **Shared Protocols**:
  - Workflow Re-Read (mandatory for all agents after context summarization)
  - Error Resolution 3-Strike Rule
  - Context Drift Recovery protocol
- **Issue Tracking**: `global-issues.md` structured format with 6 categories (Bug, Migration, Dependency, Refactor, Architecture, Drift) and required entry fields
- **Knowledge Sharing**: Relaxed contribution format (1-3 sentences) with category tags

### New Content (Merged)

- **Drizzle ORM contribution entry**: First agent contribution documenting that manual migration SQL files must not be created — Drizzle auto-generates them
- **Drizzle warning**: Prominent note in Database Commands section about not creating manual migration files

---

## 2. Manager Workflow (`apm-2-initiate-manager-autonomous.md`) — Additions

### A. Workflow Integrity Protocol (New Section — After CRITICAL CONSTRAINTS)

- **Trigger conditions**: Context summarized, context drift suspected, session resumed, phase boundary
- **Delegated re-read subtask**: `new_task(mode: "ask")` template for confirming all operating rules, delegation patterns, and `global-issues.md`/`AGENTS.md` responsibilities
- **Compliance enforcement**: Explicit statement that failure to re-read and confirm is a protocol violation
- **AGENTS.md reference**: Points to root `AGENTS.md` as single source of truth for shared protocols

### B. Core Responsibilities Summary (New Section — After Workflow Integrity Protocol)

Three responsibility tables with duty/frequency/how columns:

**`global-issues.md` — Issue Oversight:**
| Duty | Frequency |
|---|---|
| Review open issues | Before every new phase + when subtasks report issues |
| Consider issues in planning | Every Task Assignment Prompt |
| Delegate issue resolution | When issues block progress |
| Include in phase summaries | Every phase-end summary |
| Enforce structured format | Ongoing |

**`AGENTS.md` — Knowledge & Protocol Oversight:**
| Duty | Frequency |
|---|---|
| Review contributions | At every phase boundary |
| Enforce contribution quality | Ongoing |
| Ensure agents contribute | Phase review |
| Reference in task assignments | Every Task Assignment Prompt |
| Update shared protocols | When needed |

**Workflow Integrity — Self-Compliance:**
| Duty | Trigger |
|---|---|
| Re-read workflow | Context summarized, drift, session resumed, phase boundary |
| Confirm compliance | After every re-read |
| Monitor subtask compliance | Ongoing |

### C. §4.4 Global Issues Review (New Subsection)

- Delegated periodic review of `global-issues.md` via `new_task(mode: "ask")` template
- 5 specific responsibilities: review before phases, consider in task assignments, delegate resolution, include in phase summaries, enforce structured format

### D. §4.5 AGENTS.md Oversight (New Subsection)

- Delegated periodic review of `AGENTS.md` contributions via `new_task(mode: "ask")` template
- 4 specific responsibilities: review at phase boundaries, ensure agents contribute, delegate corrections, reference in task assignments

### E. Operating Rules — Extended (Rules 9-12 Added)

| Rule | Description |
|---|---|
| 9. Workflow re-read | Re-read after ANY context summarization; delegate compliance confirmation |
| 10. Global issues oversight | Delegate periodic review; consider open issues in planning |
| 11. AGENTS.md oversight | Delegate review at phase boundaries; ensure compliance |
| 12. Shared protocols authority | Reference `AGENTS.md` as single source of truth |

---

## 3. Implementation Workflow (`apm-3-initiate-implementation-autonomous.md`) — Additions

### A. Core Responsibilities Summary (New Section — Before §1)

Five responsibility tables:

**`global-issues.md` — Issue Logging:**
- 7 categories of what must be logged (deviations, migration inconsistencies, missing dependencies, architectural deviations, refactor issues, drift events, irregularities)

**`AGENTS.md` — Knowledge Sharing:**
- 4 triggers for contributing (reusable pattern, common pitfall, non-obvious solution, integration point)

**Code Quality Gates:**
- `pnpm typecheck` — fix ALL errors
- `pnpm lint` — fix ALL errors
- Exception rule for future-task dependencies (documented + deferred)

**Deep Context Understanding:**
- 4 mandatory steps before implementation (read referenced files, search related code, review specs, understand imports/types/dependencies)

**Dependency Resolution:**
- Package not installed → `pnpm add` immediately
- Code missing, needed now, not in plan → migrate from `archive/oldapp/`
- Code missing, planned as future task → placeholder + TODO comment

### B. §1.1 Context Ingestion Protocol — Enhanced (Steps 7-9 Added)

| Step | What Was Added |
|---|---|
| 5. Read Architecture Specs | Changed from "if referenced" to **always mandatory** |
| 7. Deep Code Discovery (NEW) | Search and read ALL related code files beyond referenced list — imports, shared components, utilities, type definitions |
| 8. Review Specifications (NEW) | Thoroughly review implementation plan AND `.ouroboros/specs/refactor-migration/` for architectural constraints |
| 9. Broader Context (NEW, Optional) | Review other APM workflow files for contextual awareness |

Added enforcement: "Implementation MUST NOT begin without completing steps 1-8."

### C. §1.3 Knowledge Acquisition Output — Enhanced

Added field: `Deep context files reviewed: [count of additional files read beyond references]`

### D. §1.4 Workflow Re-Read Protocol (New Subsection)

- **Trigger conditions**: Context summarized, context drift detected, session resumed, between major task phases
- **Post-Re-Read Confirmation template**: Workflow file, all rules confirmed, compliance verified, proceeding with
- **Enforcement**: Failure to re-read and confirm is a protocol violation
- **AGENTS.md reference**: Points to root `AGENTS.md` for shared protocols

### E. §4.3 Issue Logging Protocol — Restructured

**Old format** (6 fields): Agent, Task, Error Type, Description, Attempts Made, Status, Context → written to `issues.md`

**New format** (8 fields): Category, Agent, Task, Context, Root Cause, Action Taken, Status, Related Files → written to `global-issues.md`

**New categories**: Bug | Migration | Dependency | Refactor | Architecture | Drift (was: Syntax/Dependency/Configuration/Logic/External)

**New "What MUST be logged" list** (7 items — mandatory, not discretionary):
1. Findings deviating from expectations
2. Migration inconsistencies between `archive/oldapp/` and new code
3. Missing dependencies or packages
4. Architectural deviations from specs
5. Refactor-related issues or technical debt
6. Any irregularities during implementation
7. Context drift events or protocol deviations

### F. §4.5 Dependency & Missing Code Handling (New Subsection)

- **Package dependencies**: `pnpm add <package>` / `pnpm add -D <package>` immediately on discovery
- **Missing code decision tree**: Is it needed now? Is it in the plan? → Migrate from `archive/oldapp/` or create placeholder
- **Migration protocol**: 6 steps (identify source → read → adapt → place → log to `global-issues.md` → note in Memory Log)
- **Future-task protocol**: Placeholder type + `// TODO: Depends on Task X.Y` + Memory Log note

### G. §4.6 Code Quality Enforcement (New Subsection)

- **Mandatory gates**: `pnpm typecheck` (zero errors) + `pnpm lint` (zero errors) + re-run to confirm
- **Exception rule**: Errors depending on future planned tasks may remain IF documented in Memory Log AND logged in `global-issues.md` with Category: Dependency, Status: Deferred
- **Enforcement**: Quality gate failure doesn't block completion if exception applies, but all remaining errors must be explicitly documented and justified

### H. §5.2 Context Recovery Protocol — Updated

| Change | Details |
|---|---|
| Recovery file order | Changed from reading manager workflow first to reading **own workflow first** (primary authority) |
| Added `AGENTS.md` | Now includes `AGENTS.md` as second file in recovery read order |
| Added compliance step | New step 4: "Confirm compliance — Output Workflow Re-Read Confirmation (Section 1.4)" |
| Fixed reference | Corrected `apm-2-initiate-manager.md` → `apm-3-initiate-implementation-autonomous.md` as primary |

### I. §6.1 AGENTS.md Contributions — Updated

- Updated to reference `AGENTS.md` Agent Contributions Log (was "Section 7")
- Updated contribution format to relaxed version (1-3 sentences)
- Removed verbose multi-heading template

### J. Operating Rules — Extended (Rules 13-18 Added)

| Rule | Description |
|---|---|
| 13. Workflow re-read | Re-read after ANY context summarization; reconfirm compliance |
| 14. Deep context understanding | Read ALL related code files (not just referenced) before implementation |
| 15. Dependency resolution | Install missing packages immediately; migrate from `archive/oldapp/` when not planned |
| 16. Code quality gates | Run `pnpm typecheck` + `pnpm lint` before completion; fix all except future-task dependencies |
| 17. Mandatory issue logging | Log ALL findings, irregularities, migration inconsistencies to `global-issues.md` |
| 18. Shared protocols authority | Reference `AGENTS.md` as single source of truth for cross-agent standards |

---

## Cross-Workflow Alignment Summary

| Shared Element | How Aligned |
|---|---|
| Workflow Re-Read Protocol | Both workflows have agent-specific re-read sections; AGENTS.md holds shared standard |
| `global-issues.md` | Unified name across both workflows (was `issues.md` in implementation); structured format defined in AGENTS.md |
| `AGENTS.md` reference | Both workflows point to root `AGENTS.md` as single source of truth |
| Context Drift Recovery | Both workflows include recovery protocols; AGENTS.md holds shared summary |
| Code Quality Standards | Defined in AGENTS.md as shared; enforced in implementation workflow with specific commands |
| Contribution Format | Relaxed format in AGENTS.md; referenced (not duplicated) by implementation workflow |
