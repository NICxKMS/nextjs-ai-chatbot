# Task Log Guide

> How to write per-task execution logs.
> **Who writes:** The implementation subagent executing the task (all sections except Review).
> **Who reads:** Review subagents (evaluates quality, writes Review section + `review` field), orchestrator (reads frontmatter + flagged sections). Also read by future sessions for context recovery.

---

## 1. File Location

```
plan/memory/tasks/P{N}-T{NN}.md
```

Examples:
- `plan/memory/tasks/P0-T01.md`
- `plan/memory/tasks/P3-T08.md`

> Title is in YAML frontmatter `title` field, not the filename.
> **File does not exist = task has not started.** No pre-creation.

---

## 2. Format

### YAML Frontmatter

```yaml
---
task: P0-T01
title: "Initialize project config"
phase: P0
agent: hephaestus
depends_on: []              # Populated from task spec
status: active              # active | done | failed
review: null                # null | pass | fail — set by review subagent
attempt_count: 1            # Starts at 1, incremented by orchestrator on rework/retry
started: "2026-03-02 10:00"
finished: null              # Set on completion, null if active/failed
has_deviations: false
has_issues: false
has_findings: false
---
```

### Markdown Sections

```markdown
## Summary
[1–2 sentences: what was accomplished]

## Files Changed
- `package.json` — created with all dependencies
- `tsconfig.json` — strict mode, path aliases

## Validation
pnpm format    # ✅ pass | ❌ fail (details)
pnpm typecheck # ✅ pass | ❌ fail (details)
pnpm lint      # ✅ pass | ❌ fail (details)

## Issues
[Problems encountered with error messages. "None" if clean.]
[Only present when has_issues: true]

## Deviations
[Only present when has_deviations: true — what plan said vs what was done and why]

## Findings
[Only present when has_findings: true — context that affects future tasks]

## Review
_Populated by review subagent after implementation._

**Verdict:** ✅ PASS | ❌ FAIL
**Reviewer:** momus | themis
**Date:** YYYY-MM-DD

[Review findings, recommendations, flag evaluations]
```

---

## 3. Status Values

| Status | Meaning | Set By |
|--------|---------|--------|
| `active` | Subagent is currently working (body may be partial) | Implementation subagent (create) |
| `done` | Subagent finished, all sections populated | Implementation subagent |
| `failed` | Subagent could not complete — Issues section explains why | Implementation subagent |
| `blocked` | Cannot proceed — dependency missing or external blocker | Implementation subagent |
| `partial` | Partially done — Remaining Work checklist in body | Implementation subagent |

Progress map in `state.md` uses: `active` · `done` · `done/pass` · `done/fail` · `failed` · `blocked`.
`partial` maps to `active` in progress (needs re-dispatch to complete).

## 4. Flags

| Flag | When True | Definition |
|------|-----------|------------|
| `has_deviations` | Implementation intentionally differs from plan spec | Fill Deviations section |
| `has_issues` | Bug, blocker, or error encountered during implementation | Fill Issues section |
| `has_findings` | Unexpected discovery that affects other tasks (not a bug) | Fill Findings section |

When any flag is `true`, the orchestrator **must** read the corresponding section before assigning the next task. Cross-cutting items get promoted to `plan/memory/decisions.md`.

---

## 5. Review Section

The **review subagent** (momus/themis) writes the Review section and sets the YAML `review` field:

1. Reads the entire task file
2. Spot-checks source files listed in Files Changed
3. Writes Review section with verdict, findings, and recommendations
4. Sets YAML `review: pass` or `review: fail`

On rework (review failed), the previous Review section is preserved under `### Previous Review` and the review subagent writes a new Review section.

---

## 6. Gate Task Logs

Verification gate tasks (P0-T18, P1-T14, P2-T09, etc.) create no implementation files.

- **Summary:** What was verified and overall result
- **Files Changed:** `None — verification-only gate task`
- **Validation:** Gate-specific outputs (e.g., grep results, typecheck stdout)
- **Issues:** Gate failures encountered and how they were resolved

---

## 7. Writing Guidelines

**Be concise** — summarize outcomes, don't narrate every step. Reference files by path. Code snippets only for novel logic (≤20 lines).

**Be specific** — exact error messages for issues. Plan file paths for deviations. Validation command output.

**Be actionable** — Issues should suggest solutions. Deviations should explain why new approach is better.

---

## 8. Example

```yaml
---
task: P0-T01
title: "Initialize project config"
phase: P0
agent: hephaestus
depends_on: []
status: done
review: pass
attempt_count: 1
started: "2026-03-02 10:00"
finished: "2026-03-02 10:42"
has_deviations: true
has_issues: false
has_findings: false
---
```

```markdown
## Summary
Created project config files (package.json, tsconfig.json, next.config.ts, biome.json)
with all dependencies pinned per scaffold/base-config.md.

## Files Changed
- `package.json` — 42 dependencies, 8 devDependencies
- `tsconfig.json` — strict, paths: {"@/*": ["./*"]}
- `next.config.ts` — experimental block + images remotePatterns
- `biome.json` — formatter + linter config

## Validation
pnpm format    # ✅ pass
pnpm typecheck # ✅ pass
pnpm lint      # ✅ pass

## Issues
None.

## Deviations
Plan specified `react: "^19.0.0"` but pinned to `react: "19.1.0"` for stability.
Logged as DEC-001 in decisions.md.

## Findings
None.

## Review
**Verdict:** ✅ PASS
**Reviewer:** momus
**Date:** 2026-03-02

Naming compliant. Size within limits. Validation confirmed.
No issues found.
```
