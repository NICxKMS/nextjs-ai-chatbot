# Task Log Guide — ai-assistant Migration

> Defines how agents log task-level work during plan execution.
> Adapted from APM Dynamic-MD format, tailored to this project's 125-task / 8-phase plan.

---

## 1. Overview

Every task in the plan (`P0-T01` through `P7-T13`) gets a dedicated log file. Logs are stored in `plan/memory/phases/Phase_XX_<slug>/` and capture what was done, what was produced, and what to watch for.

**Who writes:** The agent executing the task.
**Who reads:** The orchestrating agent (reviews before assigning next task), and future sessions (context recovery).

---

## 2. File Naming

> **Task ID format note:** Phase specs use two-digit phase prefix (`P00-T01`, `P03-T08`).
> Guides and memory files use single-digit (`P0-T01`, `P3-T08`). These are equivalent.
> Task log files use the **single-digit** format.

```
plan/memory/phases/Phase_00_Scaffold/P0-T01_Initialize_Project_Config.md
plan/memory/phases/Phase_03_Chat_Core/P3-T08_Create_ChatShell.md
```

Pattern: `P{N}-T{NN}_{Title_Words}.md` (Title words joined by underscores, preserving initial caps)

---

## 3. Log Format

Every task log uses YAML frontmatter + Markdown sections:

```yaml
---
task: P0-T01
title: Initialize project config
agent: [agent name or "manual"]
status: completed | partial | blocked | error
phase: 0
started: 2026-MM-DD HH:MM
finished: 2026-MM-DD HH:MM
validation_passed: true | false
has_deviations: false
has_issues: false
has_findings: false
---
```

```markdown
# P0-T01: Initialize project config

## Summary
[1-2 sentences: what was accomplished]

## Work Performed
[Steps taken, in logical order. Focus on decisions and outcomes, not every keystroke.]

## Files Created/Modified
- `package.json` — created with all dependencies
- `tsconfig.json` — strict mode, path aliases
- `next.config.ts` — experimental: reactCompiler, ppr, cacheComponents
- `biome.json` — formatting + lint rules

## Validation
```bash
pnpm format   # ✅ pass
pnpm typecheck # ✅ pass
pnpm lint      # ✅ pass
```

## Issues
[Specific problems encountered, with error messages if relevant. "None" if clean.]

## Deviations
[Only if has_deviations: true — what the plan said vs what was done and why]

## Important Findings
[Only if has_findings: true — discovered context that affects future tasks]

## Next
[What the next agent should know. "Continue with P0-T02" if clean handoff.]
```

---

## 4. Status Values

| Status | Meaning |
|--------|---------|
| `completed` | Task done, validation passed, ready for next task |
| `partial` | Some work done, not finished — log what's done and what remains |
| `blocked` | Cannot proceed — log the blocker clearly |
| `error` | Failed — log the error, attempted fixes, and recommended approach |

---

## 5. Frontmatter Flags

| Flag | When True |
|------|-----------|
| `has_deviations` | Implementation differs from plan spec — fill Deviations section |
| `has_issues` | Problems encountered — fill Issues section |
| `has_findings` | Discovered something important for future tasks — fill Important Findings section |

When any flag is `true`, the orchestrator **must** read the corresponding section before assigning the next task.

---

## 6. Writing Guidelines

### Be Concise
- Summarize outcomes, don't narrate every step
- Reference files by path, avoid large code dumps
- Include code snippets only for novel/critical logic (≤ 20 lines)

### Be Specific
- Include exact error messages when logging issues
- Reference plan files by path when noting deviations
- Name the specific validation commands run and their output

### Be Actionable
- Issues section should suggest solutions
- Deviations should explain why the new approach is better
- Next section should give the next agent enough context to start immediately

---

## 7. Validation Section

Every task log must include the validation section showing:

```bash
pnpm format    # ✅ pass | ❌ fail (details)
pnpm typecheck # ✅ pass | ❌ fail (details)
pnpm lint      # ✅ pass | ❌ fail (details)
```

For VERIFY gate tasks (P0-T18, P1-T14, etc.), also include gate-specific checks:
```bash
# Gate G00 example:
proxy.ts exports     # ✅ verified
Artifact table       # ✅ verified (zero "document")
Credit/gateway codes # ✅ zero found
```

---

## 8. Gate Task Logs

Verification gate tasks (P0-T18, P1-T14, P2-T09, etc.) create no files — they're verification-only.

- **Summary:** Describe what was verified and overall result
- **Work Performed:** List each gate check performed and its pass/fail result
- **Files Created/Modified:** Write `None — verification-only gate task`
- **Validation:** Include gate-specific command outputs (e.g., `pnpm typecheck` stdout, grep results)
- **Issues:** Note any gate failures encountered and how they were resolved

---

## 9. Example: Good vs Poor Logging

### Poor
```
I worked on the config. Made some files. Had problems but fixed them. It works now.
```

### Good
```yaml
---
task: P0-T01
title: Initialize project config
agent: hephaestus
status: completed
phase: 0
started: 2026-03-02 10:00
finished: 2026-03-02 10:42
validation_passed: true
has_deviations: true
has_issues: false
has_findings: false
---
```
```markdown
# P0-T01: Initialize project config

## Summary
Created project config files (package.json, tsconfig.json, next.config.ts, biome.json) with all dependencies pinned per scaffold/base-config.md.

## Work Performed
1. Created package.json with exact dependency versions from plan/scaffold/base-config.md
2. Created tsconfig.json with strict mode, path aliases (@/ → .), incremental builds
3. Created next.config.ts with experimental.reactCompiler, ppr, cacheComponents
4. Created biome.json with formatting (indent: tab, line: 100) and lint rules

## Files Created/Modified
- `package.json` — 42 dependencies, 8 devDependencies
- `tsconfig.json` — strict, paths: {"@/*": ["./*"]}
- `next.config.ts` — experimental block + images remotePatterns
- `biome.json` — formatter + linter config

## Validation
pnpm format   # ✅ pass
pnpm typecheck # ✅ pass
pnpm lint      # ✅ pass

## Issues
None

## Deviations
Plan specified `react: "^19.0.0"` but pinned to `react: "19.1.0"` to avoid RC instability. 
Logged in plan/memory/deviations-log.md as IMPL-DEV-001.

## Next
Continue with P0-T02 (Create tooling config). No blockers.
```

---

**End of Guide**
