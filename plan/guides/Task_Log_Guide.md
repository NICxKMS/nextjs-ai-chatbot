# Task Log Guide

> How to write per-task execution logs.
> **Who writes:** The implementation subagent executing the task.
> **Who reads:** Review subagents (evaluates quality) and the orchestrator (reads for dispatch context). Also read by future sessions for context recovery.

---

## 1. File Location

```
plan/memory/phases/Phase_{NN}_{Slug}/P{N}-T{NN}_{Title_Words}.md
```

Examples:
- `plan/memory/phases/Phase_00_Scaffold/P0-T01_Initialize_Project_Config.md`
- `plan/memory/phases/Phase_03_Chat_Core/P3-T08_Create_ChatShell.md`

> **ID format:** Phase specs use `P00-T01`, guides use `P0-T01`. These are equivalent. Task logs use single-digit.

---

## 2. Format

### YAML Frontmatter

```yaml
---
task: P0-T01
title: Initialize project config
agent: hephaestus
status: completed | partial | blocked | error
phase: 0
started: YYYY-MM-DD HH:MM
finished: YYYY-MM-DD HH:MM
validation_passed: true | false
has_deviations: false
has_issues: false
has_findings: false
---
```

### Markdown Sections

```markdown
# P0-T01: Initialize project config

## Summary
[1–2 sentences: what was accomplished]

## Work Performed
[Steps taken in logical order. Decisions and outcomes, not every keystroke.]

## Files Created/Modified
- `package.json` — created with all dependencies
- `tsconfig.json` — strict mode, path aliases

## Validation
pnpm format    # ✅ pass | ❌ fail (details)
pnpm typecheck # ✅ pass | ❌ fail (details)
pnpm lint      # ✅ pass | ❌ fail (details)

## Issues
[Problems encountered with error messages. "None" if clean.]

## Deviations
[Only if has_deviations: true — what plan said vs what was done and why]

## Important Findings
[Only if has_findings: true — context that affects future tasks]

## Next
[What the next agent should know. "Continue with P0-T02" if clean.]
```

---

## 3. Status Values

| Status | Meaning |
|--------|---------|
| `completed` | Done, validation passed, ready for next task |
| `partial` | Some work done — log what's done and what remains |
| `blocked` | Cannot proceed — log the blocker clearly |
| `error` | Failed — log error, fixes attempted, recommended approach |

---

## 4. Flags

| Flag | When True | Definition |
|------|-----------|------------|
| `has_deviations` | Implementation intentionally differs from plan spec | Fill Deviations section |
| `has_issues` | Bug, blocker, or error encountered during implementation | Fill Issues section |
| `has_findings` | Unexpected discovery that affects other tasks (not a bug) | Fill Findings section |

When any flag is `true`, the orchestrator **must** read the corresponding section before assigning the next task.

---

## 5. Gate Task Logs

Verification gate tasks (P0-T18, P1-T14, P2-T09, etc.) create no implementation files.

- **Summary:** What was verified and overall result
- **Work Performed:** Each gate check and its pass/fail result
- **Files Created/Modified:** `None — verification-only gate task`
- **Validation:** Gate-specific outputs (e.g., grep results, typecheck stdout)
- **Issues:** Gate failures encountered and how they were resolved

---

## 6. Writing Guidelines

**Be concise** — summarize outcomes, don't narrate every step. Reference files by path. Code snippets only for novel logic (≤20 lines).

**Be specific** — exact error messages for issues. Plan file paths for deviations. Validation command output.

**Be actionable** — Issues should suggest solutions. Deviations should explain why new approach is better. Next section should give enough context to start immediately.

---

## 7. Example

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
pnpm format    # ✅ pass
pnpm typecheck # ✅ pass
pnpm lint      # ✅ pass

## Issues
None

## Deviations
Plan specified `react: "^19.0.0"` but pinned to `react: "19.1.0"` to avoid RC instability.
Logged as IMPL-DEV-001.

## Next
Continue with P0-T02 (Create tooling config). No blockers.
```
