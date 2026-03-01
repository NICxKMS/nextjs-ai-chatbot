# Memory System Guide

> Quick-reference for subagents and orchestrator. Session protocol: `plan/STARTER-PROMPT.md` § 7.

---

## 1. Architecture

```
plan/memory/
├── state.md          # THE ONE FILE — orchestrator reads this
├── decisions.md      # Cross-cutting decisions + learnings
└── tasks/            # Per-task records (created on-demand)
    └── P{N}-T{NN}.md
```

| File | Purpose | Created |
|------|---------|---------|
| `state.md` | Machine-readable execution state (YAML frontmatter) | Bootstrap |
| `decisions.md` | Human-readable cross-cutting knowledge | Bootstrap |
| `tasks/P{N}-T{NN}.md` | Per-task implementation + review record | On-demand |

**"File doesn't exist" = "task hasn't started."**

## 2. `state.md` — Execution State

Orchestrator reads **only YAML frontmatter**. Key fields:

| Field | Purpose |
|-------|---------|
| `phase` / `phase_name` | Current phase |
| `active_task` | Dispatched task ID, or null |
| `next_task` | Next task to dispatch |
| `session` | Monotonic session counter |
| `blockers` | Active blockers (removed when resolved). Format: `[{ id: BLK-001, task: P0-T04, description: "...", since: "2026-03-02" }]` |
| `progress` | Map: `task_id → status/review` (absent = not started) |
| `phases` | Per-phase: `{ total, done, status }` |
| `sessions` | Rolling 3 most-recent session summaries |

Progress values: `active` · `done` · `done/pass` · `done/fail` · `failed` · `blocked`.

Phase status values: `pending` → `active` (first task dispatched) → `done` (gate passes) → `blocked` (if phase-level blocker).

## 3. Task Files — `tasks/P{N}-T{NN}.md`

### YAML Frontmatter

```yaml
---
task: P0-T01
title: "Initialize project config"
phase: P0
agent: hephaestus
depends_on: []
status: active | done | failed
review: null | pass | fail
attempt_count: 1
started: "2026-03-02 10:00"
finished: null
has_deviations: false
has_issues: false
has_findings: false
---
```

### Markdown Body

`Summary` · `Files Changed` · `Validation` · `Issues` · `Deviations` · `Findings` · `Review`

Implementation subagent writes all except Review. Review subagent writes Review + `review` field.
See `plan/guides/Task_Log_Guide.md` for full schema.

## 4. `decisions.md`

YAML frontmatter: `last_updated` date. Body: `## DEC-NNN: {Title}` with Date, Task, Type, Impact, prose, Affects.

See initial entries in `plan/memory/decisions.md` for a worked example.

Affects multiple future tasks → `decisions.md`. Local only → task file.

## 5. Ownership

| Actor | `state.md` | `decisions.md` | Task files |
|-------|-----------|----------------|------------|
| **Orchestrator** | Read + Write (exclusive) | Read + Write | Read all. Write `attempt_count`, `status`, `review`, `started` on rework only |
| **Implementation subagent** | ❌ Never | Read | Create. Write all except Review + `review` field |
| **Review subagent** | ❌ Never | Read | Read all. Write `review` field + Review section |

Subagents never touch `state.md`. All state updates flow through the orchestrator.

## 6. References

| What | Where |
|------|-------|
| Task log format | `plan/guides/Task_Log_Guide.md` |
| Task file format | `plan/guides/Task_Log_Guide.md` |
| Session protocol | `plan/STARTER-PROMPT.md` § 7 |
| Delegation | `plan/guides/Task_Assignment_Guide.md` |
| Review | `plan/guides/Review_Agent_Guide.md` |
