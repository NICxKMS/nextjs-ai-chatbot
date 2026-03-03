# Memory System v2 — Complete Design

> Replaces: `Memory_System_Guide.md` § 1–6, all current memory files.
> Constraint: All files are `.md` with YAML frontmatter. Orchestrator reads frontmatter + flagged body sections (Issues/Deviations/Findings when corresponding frontmatter flag is true).

---

## 1. File Structure

```
plan/memory/
├── state.md                         # THE ONE FILE — orchestrator reads this
├── decisions.md                     # Cross-cutting decisions + learnings
└── tasks/
    ├── P0-T01.md                    # Created on-demand by subagent
    ├── P0-T02.md                    # ...
     └── ...                          # (up to 126 files, created as needed) <!-- C2-W4: IC-05/06 fix -->
```

**That's it.** Three concerns, three file types:

| File | Purpose | Created |
|------|---------|---------|
| `state.md` | Machine-readable execution state | Once (migrated from current files) |
| `decisions.md` | Human-readable cross-cutting knowledge | Once (migrated from current files) |
| `tasks/P{N}-T{NN}.md` | Per-task implementation record | On-demand when subagent starts work |

**Eliminated:**
- `index.md` — self-documenting structure
- `progress.md` — absorbed into `state.md` → `progress`
- `session-log.md` — absorbed into `state.md` → `sessions` (rolling 3)
- `issues-log.md` — active blockers in `state.md` → `blockers`; resolved in task files
- `deviations-log.md` — cross-cutting in `decisions.md`; task-local in task files
- `learnings.md` — cross-cutting in `decisions.md`; task-local in task files
- `phases/Phase_XX_*/` — flat `tasks/` directory; phase info in task frontmatter
- Pre-created empty task files — "file doesn't exist" = "task hasn't started"

---

## 2. `state.md` Schema

The orchestrator reads **only the YAML frontmatter** of this file. The markdown body is reserved for scratch notes (the orchestrator ignores it).

```yaml
---
# ─── Cursor ───────────────────────────────────────────
phase: P0
phase_name: "Scaffold & Infrastructure"
active_task: null          # Task ID currently dispatched, or null
next_task: P0-T01          # Next task to dispatch
session: 0                 # Monotonically increasing session counter

# ─── Blockers ─────────────────────────────────────────
# Active blockers only. Remove when resolved.
# Empty array = no blockers.
blockers: []
#  Example:
#  blockers:
#    - id: BLK-001
#      task: P0-T04
#      description: "Supabase connection string missing from env"
#      since: 2026-03-02
#      blocks: [P0-T05, P0-T06, P0-T07]

# ─── Progress ─────────────────────────────────────────
# Compact map: task_id → status/review
# Absent key = not started.
# Status: active | done | failed — compound format: status/review
# Review: pass | fail (appended after done, omitted if not yet reviewed)
#
# Examples:
#   P0-T01: done/pass       ← completed, review passed
#   P0-T02: done            ← completed, review pending
#   P0-T03: done/fail       ← completed, review failed (needs rework)
#   P0-T04: active          ← currently dispatched (no review yet)
#   P0-T05: failed          ← implementation failed
#   (P0-T06 absent)         ← not started
progress: {}

# ─── Phase Summary ────────────────────────────────────
phases:
  P0: { total: 18, done: 0, status: pending }
  P1: { total: 14, done: 0, status: pending }
  P2: { total: 9,  done: 0, status: pending }
  P3: { total: 27, done: 0, status: pending }
  P4: { total: 18, done: 0, status: pending }
  P5: { total: 12, done: 0, status: pending }
  P6: { total: 14, done: 0, status: pending }
  P7: { total: 13, done: 0, status: pending }
# Phase status: pending | active | done | blocked
# blocked = all remaining tasks have unresolvable blockers

# ─── Sessions (rolling 3) ─────────────────────────────
# Most recent first. Oldest entry drops when 4th is added.
# Full history is recoverable from task file timestamps.
sessions: []
#  Example:
#  sessions:
#    - id: 3
#      date: 2026-03-04
#      tasks_completed: [P0-T07, P0-T08]
#      tasks_failed: []
#      decisions_made: [DEC-004]
#      summary: "Completed state types and error handling. No issues."
#      next: P0-T09
#    - id: 2
#      date: 2026-03-03
#      tasks_completed: [P0-T03, P0-T04, P0-T05, P0-T06]
#      tasks_failed: []
#      decisions_made: [DEC-002, DEC-003]
#      summary: "Completed CSS, schema, core types, artifact types. DEC-003: merged T05/T06."
#      next: P0-T07
#    - id: 1
#      date: 2026-03-02
#      tasks_completed: [P0-T01, P0-T02]
#      tasks_failed: []
#      decisions_made: [DEC-001]
#      summary: "First implementation session. Project config and tooling."
#      next: P0-T03
---

## Scratch

_Orchestrator may use this area for transient notes. Not machine-read._
```

### Field Reference

| Field | Type | Updated When | By |
|-------|------|-------------|-----|
| `phase` | string | Phase changes | Orchestrator |
| `phase_name` | string | Phase changes | Orchestrator |
| `active_task` | string \| null | Task dispatch / completion | Orchestrator |
| `next_task` | string \| null | After each task completes | Orchestrator |
| `session` | int | Session start | Orchestrator |
| `blockers` | array | Blocker discovered / resolved | Orchestrator |
| `progress` | map | After implementation + after review | Orchestrator |
| `phases` | map | After each task; phase transitions | Orchestrator |
| `sessions` | array (max 3) | Session end | Orchestrator |

### Progress Status Transitions

```
(absent)  →  active  →  done    →  done/pass     (happy path)
(absent)  →  active  →  done    →  done/fail     (review rejected)
(absent)  →  active  →  failed                    (implementation failed)
done/fail →  active  →  done    →  done/pass     (rework succeeded)
done/fail →  active  →  done    →  done/fail     (rework fails again)
done/fail →  active  →  failed                    (rework itself fails)
failed    →  active  →  done    →  done/pass     (retry succeeded)
failed    →  active  →  done    →  done/fail     (retry succeeded but review rejected)
failed    →  active  →  failed                    (retry itself failed)
active    →  active                               (session crash → re-dispatch)
```

### Invariants

1. At most ONE `active` entry in `progress` at any time (sequential dispatch).
2. `active_task` matches the `active` or `done` (pending review) entry in `progress`, or both are empty/null.
3. `sessions` has at most 3 entries. When adding a 4th, discard the oldest.
4. `blockers` only contains unresolved blockers. Resolution removes the entry.
5. `next_task` is null when all 126 tasks are `done/pass` (project complete), OR when no dispatchable task exists (all remaining tasks are blocked/failed — escalate to user).
6. A `done/fail` task must be re-dispatched before advancing `next_task` past it.
7. If a task reaches `attempt_count` 4 (i.e., 3 retries), escalate to user.

> Note: task status is denormalized between `state.md` (compact, for orchestrator) and task files (detailed, for subagents). `state.md` is authoritative for dispatch decisions.

---

## 3. Task File Schema

Path: `plan/memory/tasks/P{N}-T{NN}.md`

**File does not exist** = task has not started. No pre-creation.

### YAML Frontmatter (machine-readable)

```yaml
---
task: P0-T01
title: "Initialize project config"
phase: P0
agent: hephaestus
depends_on: []              # [P0-T01, P0-T02] — populated from task spec
status: done               # active | done | failed
review: pass               # null | pass | fail
attempt_count: 1
started: "2026-03-02 10:00"
finished: "2026-03-02 10:42"   # null if active/failed
has_deviations: false
has_issues: false
has_findings: false
---
```

### Markdown Body (subagent prose)

```markdown
## Summary
Created project config files (package.json, tsconfig.json, next.config.ts, biome.json)
with all dependencies pinned per scaffold/base-config.md.

## Files Changed
- `package.json` — created, 42 deps + 8 devDeps
- `tsconfig.json` — strict mode, path aliases
- `next.config.ts` — experimental flags
- `biome.json` — formatter + linter rules

## Validation
pnpm format    # ✅
pnpm typecheck # ✅
pnpm lint      # ✅

## Issues
None.

## Deviations
_Only present when `has_deviations: true`._

Plan specified `react: "^19.0.0"` but pinned to `react: "19.1.0"` for stability.
Logged as DEC-001 in decisions.md.

## Findings
_Only present when `has_findings: true`._

## Review
_Populated by review subagent after implementation._

**Verdict:** ✅ PASS
**Reviewer:** momus
**Date:** 2026-03-02

Naming compliant. Size within limits. Validation confirmed.
No issues found.
```

### Field Reference

| Field | Type | Written By | Read By |
|-------|------|-----------|---------|
| `task` | string | Subagent (create) | Orchestrator, review subagent |
| `title` | string | Subagent (create) | Orchestrator, review subagent |
| `phase` | string | Subagent (create) | — |
| `agent` | string | Subagent (create) | Orchestrator |
| `depends_on` | array | Subagent (create, from task spec) | Orchestrator |
| `status` | enum | Subagent (create), Orchestrator (on rework) | Orchestrator |
| `review` | enum \| null | Review subagent (after review) | Orchestrator |
| `attempt_count` | int (starts at 1) | Orchestrator (on rework/retry) | Orchestrator |
| `started` | datetime | Subagent (create) | — |
| `finished` | datetime \| null | Subagent (on completion) | — |
| `has_deviations` | bool | Subagent | Orchestrator, review subagent |
| `has_issues` | bool | Subagent | Orchestrator, review subagent |
| `has_findings` | bool | Subagent | Orchestrator, review subagent |

### Status Values

| Status | Condition | Markdown Body |
|--------|-----------|---------------|
| `active` | Subagent is currently working | Partial — may have Summary only |
| `done` | Subagent finished, all sections populated | Complete |
| `failed` | Subagent could not complete | Has Issues section explaining why |

### Gate Task Variant

Gate tasks (P0-T18, P1-T14, P2-T09, etc.) use the same schema but:
- `Files Changed` → `None — verification-only gate task`
- `Summary` → what was verified and pass/fail result
- `Validation` → gate-specific checks (grep results, typecheck output, etc.)

> Gate tasks are dispatched to `hephaestus` for verification (see Task_Assignment_Guide.md § 2).

---

## 4. `decisions.md` Schema

Cross-cutting decisions AND learnings that affect future task dispatch. Task-local learnings stay in their task file's Findings section.

### YAML Frontmatter

```yaml
---
last_updated: null          # Date of most recent entry
---
```

### Markdown Body

```markdown
## DEC-001: Pinned React 19.1.0 instead of ^19.0.0

**Date:** 2026-03-02
**Task:** P0-T01
**Type:** decision
**Impact:** All tasks using React APIs

Pinned exact version to avoid RC instability. Plan specified `^19.0.0` but
19.0.x has known issues with Server Components streaming.

**Affects:** All future tasks — use `19.1.0` not `^19.0.0`.

---

## DEC-002: cacheLife requires string literal argument

**Date:** 2026-03-03
**Task:** P0-T14
**Type:** learning
**Impact:** P1-T02, P1-T04, any task using cacheLife

`cacheLife('hours')` works. `cacheLife(variable)` fails at build time. The argument
must be a string literal, not a variable reference.

**Affects:** All cache-related tasks (P1-T02, P1-T04, P3-T10).

---
```

### Entry Format

Each entry has:
- **Heading:** `## DEC-{NNN}: {Title}`
- **Metadata:** Date, originating task, type (`decision` | `learning` | `deviation`), impact scope
- **Body:** What was decided/learned and why
- **Affects:** Explicit list of future tasks or areas affected

### What Goes Here vs. Task File

| Here (`decisions.md`) | Task file (Findings/Deviations) |
|----------------------|-------------------------------|
| Affects multiple future tasks | Affects only this task |
| Changes how future dispatch works | Informational context |
| Overrides plan spec for future tasks | Local workaround |
| Naming/architecture decisions | Implementation detail |

---

## 5. Ownership Matrix

### `state.md` — Orchestrator-exclusive

| Section | Read | Write | When |
|---------|------|-------|------|
| `phase`, `phase_name` | Orchestrator | Orchestrator | Phase transition |
| `active_task` | Orchestrator | Orchestrator | Dispatch (set) / completion (clear) |
| `next_task` | Orchestrator | Orchestrator | After task completion + review |
| `session` | Orchestrator | Orchestrator | Session start (increment) |
| `blockers` | Orchestrator | Orchestrator | Blocker found (add) / resolved (remove) |
| `progress.{task}` | Orchestrator | Orchestrator | Dispatch (→ active) / subagent returns (→ done\|failed) / review (→ /pass\|/fail) |
| `phases` | Orchestrator | Orchestrator | After each task; phase transitions |
| `sessions` | Orchestrator | Orchestrator | Session end (push + trim to 3) |
| Markdown body | Anyone | Orchestrator | Anytime (scratch space) |

**Subagents never touch `state.md`.** All state updates flow through the orchestrator.

### Task files (`tasks/P{N}-T{NN}.md`) — Subagent creates, Orchestrator amends

| Section | Read | Write | When |
|---------|------|-------|------|
| YAML frontmatter (all except `review`) | Orchestrator, Review subagent | Implementation subagent | Task start (create file) + task end (update status) |
| YAML `review` field | Orchestrator | Review subagent | After review completes |
| YAML `status` field | Orchestrator | Subagent (create), Orchestrator (rework reset) | On rework: Orchestrator sets back to `active` |
| Summary | Review subagent, Orchestrator (flags only) | Implementation subagent | Task completion |
| Files Changed | Review subagent | Implementation subagent | Task completion |
| Validation | Review subagent | Implementation subagent | Task completion |
| Issues | Orchestrator (if `has_issues`) | Implementation subagent | Task completion |
| Deviations | Orchestrator (if `has_deviations`) | Implementation subagent | Task completion |
| Findings | Orchestrator (if `has_findings`) | Implementation subagent | Task completion |
| Review (section) | Orchestrator | Review subagent | After review |

### `decisions.md` — Orchestrator-exclusive

| Section | Read | Write | When |
|---------|------|-------|------|
| YAML `last_updated` | Orchestrator | Orchestrator | After adding entry |
| Decision/learning entries | Orchestrator, Subagents (context) | Orchestrator | After reviewing task with cross-cutting flags |

**Subagents report findings in their task file.** The orchestrator promotes cross-cutting ones to `decisions.md`.

### Access Summary

| Actor | `state.md` | `decisions.md` | Task files |
|-------|-----------|----------------|------------|
| **Orchestrator** | Read frontmatter + Write all | Read + Write all | Read frontmatter + flagged body sections |
| **Implementation subagent** | ❌ Never | Read (context) | Create file. Write all except `review` field + Review section |
| **Review subagent** | ❌ Never | Read (context) | Read all. Write `review` field + Review section |

---

## 6. Workflows

### 6.1 Session Start

```
1. Read plan/STARTER-PROMPT.md                    (stateless rules)
2. Read plan/memory/state.md frontmatter          (entire execution state)
3. Increment `session` field
4. IF state.active_task is not null:
     → Crash recovery (see § 6.6)
   Note: §6.6 routes back to §6.2 for dispatch. Control does NOT return to step 4a.
   Step 4a is only reached if active_task was null (no crash recovery needed).
4a. Verify `progress` counts match `phases.done` counts. If mismatch, reconcile.
5. IF state.blockers is not empty:
     → Evaluate blockers before dispatch
6. Read plan/memory/decisions.md                   (cross-cutting context)
7. Read plan/guides/Task_Assignment_Guide.md       (delegation protocol)
8. Dispatch state.next_task
```

**Reads:** 4 files total (STARTER-PROMPT, state.md, decisions.md, Task_Assignment_Guide).
Contrast with current system: 7+ files at session start.

### 6.2 Task Dispatch

```
0. Assert `active_task` is null. If not null → crash recovery (§ 6.6).
1. Confirm next task's dependencies are done/pass in state.progress
1a. IF progress.{task} is `done/fail`:
      → This is a rework dispatch. Perform rework preparation:
        - Set task file status: active
        - Clear task file review: null
        - Increment task file attempt_count
        - Set task file started: now
        - Include review feedback in dispatch message
    IF progress.{task} is `failed`:
      → This is a retry dispatch. Perform retry preparation:
        - Set task file status: active
        - Increment task file attempt_count
        - Set task file started: now
2. Set in state.md:
     active_task: P0-T03
     progress.P0-T03: active
   Note: `next_task` is intentionally NOT cleared on dispatch. It is updated
   only after review (§ 6.4). During active work, `active_task == next_task`
   — this aids crash recovery.
2a. IF phases.P{N}.status is `pending`:
      → Set phases.P{N}.status: active
3. Compose dispatch message to subagent with:
     - Task spec location (plan/phases/p{NN}-{name}.md)
     - Relevant decisions from decisions.md
     - Active blockers (if any affect this task)
     - Mandatory reads (guides, architecture docs)
4. Dispatch subagent
5. Wait for subagent to return
```

**Subagent actions on dispatch:**
```
1. Read dispatch message (contains all needed spec info)
2. Read plan/guides/Implementation_Agent_Guide.md
3. Read task spec from plan/phases/
4. (Optionally) Read plan/memory/decisions.md for relevant context
5. Create plan/memory/tasks/P{N}-T{NN}.md with:
     - YAML frontmatter: status: active, started: now, agent: self
     - Markdown body: partial (at minimum, empty sections)
6. Implement the task
7. Update task file:
     - status: done (or failed)
     - finished: now
     - Fill all markdown sections
     - Set flags (has_deviations, has_issues, has_findings)
8. Return to orchestrator
```

### 6.3 After Implementation (subagent returns)

```
1. Read task file frontmatter: plan/memory/tasks/P{N}-T{NN}.md
2. Update state.md:
     progress.P{N}-T{NN}: done     (no review suffix yet)
3. IF has_deviations OR has_issues OR has_findings:
     → Read the corresponding markdown section(s) in the task file
     → IF cross-cutting: add entry to decisions.md
     → IF blocker: add to state.blockers
4. Dispatch review subagent with:
     - Task file path
     - Task spec path
     - Files created/modified (from task file body)
5. Wait for review subagent to return
```

**Review subagent actions on dispatch:**
```
1. Read plan/guides/Review_Agent_Guide.md
2. Read task file (all sections)
3. Read task spec from plan/phases/
4. Spot-check source files listed in Files Changed
5. Evaluate against review criteria (naming, size, architecture, validation)
6. Write Review section in task file markdown body
7. Set YAML `review` field: pass | fail
8. Return to orchestrator with verdict + recommendations
```

### 6.4 After Review (review subagent returns)

```
IF verdict = PASS:
  1. Read task file — review subagent already set review: pass
  2. Update state.md:
       progress.P{N}-T{NN}: done/pass
       active_task: null
       phases.P{N}.done: increment
  3. Compute next_task:
       - Next task in dependency order whose deps are all done/pass
       - If last task in phase → next_task = gate task
       - If gate passed → next_task = first task of next phase
     - If all 126 done → next_task: null
  4. Set state.md: next_task: {computed}
  5. IF current task is the phase gate task AND review passed:
       phases.P{N}.status: done
       phase: P{N+1}
       phase_name: {next phase name}
     IF P{N} is the final phase (P7):
       → Set phase: COMPLETE
       → Set phase_name: "All phases complete"
       → Set next_task: null

IF verdict = FAIL:
  1. Read task file — review subagent already set review: fail
  2. Update state.md:
       progress.P{N}-T{NN}: done/fail
       active_task: null
  3. next_task remains P{N}-T{NN} (same task, needs rework)
  4. On re-dispatch:
       - Set task file status back to active
       - Clear review: null
       - `attempt_count`: increment
       - `started`: update to rework start time
       - Include review feedback in dispatch message
       - Subagent updates existing task file:
         - Summary: overwritten with updated content
         - Files Changed: appended with new changes
         - Validation: overwritten with new results
         - Old Review section: preserved with `### Previous Review` prefix
```

### 6.5 Session End

```
1. Set state.md: active_task: null  (if task still in flight, leave state unchanged — §6.6 handles recovery at next session start.)
2. Compose session summary:
     id: {current session number}
     date: today
     tasks_completed: [list of tasks that reached done/pass this session]
     tasks_failed: [list of tasks that reached done/fail or failed this session]
     decisions_made: [DEC IDs added this session]
     summary: 1-2 sentence summary
     next: state.next_task
3. Push to state.sessions (prepend — most recent first)
4. IF state.sessions.length > 3:
     → Remove the oldest entry (last in array)
5. Verify state.md consistency:
     - active_task is null
     - next_task points to correct next task
     - progress counts match phases.done counts
6. Save state.md
```

### 6.6 Session Recovery (crash / interrupted session)

```
1. Session start reads state.md
2. Detect: active_task is not null (e.g., P0-T05)
3. Check if task file exists: plan/memory/tasks/P0-T05.md
   
   IF task file does NOT exist:
     → Task never started. Re-dispatch from scratch.
     → Set progress.P0-T05 back to absent (delete key)
     → Set active_task: null
     → Set next_task: P0-T05
     → Proceed to normal dispatch (§ 6.2)
   
   IF task file exists with status: active:
     → Previous session crashed mid-task.
     → Do NOT attempt to resume partial work.
     → Re-dispatch from scratch: the new subagent assesses
       current file state against the task spec.
     → Set task file status: active (already is)
     → Update started timestamp
     → Subagent overwrites the markdown body with fresh work
     → Set active_task: null
     → Proceed to normal dispatch (§ 6.2)
   
   IF task file exists with status: done (no review):
     → Implementation finished but review didn't happen.
     → Skip to § 6.3 step 4 (dispatch review subagent)
     → Set active_task to this task
   
   IF task file exists with status: done, review: fail:
     → Rework was pending.
     → Set active_task: null
     → Proceed to normal dispatch (§ 6.2)
       with review feedback included.
   
   IF task file exists with status: done, review: pass:
     → Review completed but state.md not updated.
     → Apply § 6.4 PASS path steps 2–5 (update state.md, advance next_task).
```

**Key principle:** Recovery always re-dispatches from scratch. No partial resume. The new subagent reads the file system to determine actual state.

### 6.7 Blocker Resolution

```
1. Verify blocker condition is cleared (delegate to `hephaestus` for verification if needed, or `momus` for quick validation check)
2. Remove entry from `state.blockers`
3. Update originating task file's Issues section with resolution note
4. Resume dispatch of unblocked tasks
```

---

## 7. Migration Mapping

### Files Eliminated

| Old File | New Location | Migration Action |
|----------|-------------|------------------|
| `plan/memory/status.md` | `plan/memory/state.md` → cursor fields | Move current values into `phase`, `next_task`, `session` |
| `plan/memory/progress.md` | `plan/memory/state.md` → `progress` map + `phases` map | Convert markdown tables to YAML map. All tasks currently `⬜` → omit from map (absent = not started) |
| `plan/memory/session-log.md` | `plan/memory/state.md` → `sessions` array | Convert Session 000 entry to first sessions array element |
| `plan/memory/decisions-log.md` | `plan/memory/decisions.md` body | Move template + existing entries (currently none) |
| `plan/memory/learnings.md` | `plan/memory/decisions.md` body (LRN-001, LRN-002 become DEC-001, DEC-002) | Re-number as DEC entries; these are cross-cutting |
| `plan/memory/issues-log.md` | `plan/memory/state.md` → `blockers` (active) / task files (resolved) | Currently empty — no migration needed |
| `plan/memory/deviations-log.md` | `plan/memory/decisions.md` body (cross-cutting) / task files (local) | Currently empty — no migration needed |
| `plan/memory/index.md` | Eliminated | Delete — structure is self-documenting |

### Directories Eliminated

| Old Directory | New Location | Migration Action |
|--------------|-------------|------------------|
| `plan/memory/phases/Phase_00_Scaffold/` | `plan/memory/tasks/` | Delete directory + 18 empty placeholder files |
| `plan/memory/phases/Phase_01_Data_Foundation/` | `plan/memory/tasks/` | Delete directory + 14 empty placeholder files |
| `plan/memory/phases/Phase_02_Auth/` | `plan/memory/tasks/` | Delete directory + 9 empty placeholder files |
| `plan/memory/phases/Phase_03_Chat_Core/` | `plan/memory/tasks/` | Delete directory + 27 empty placeholder files |
| `plan/memory/phases/Phase_04_Artifacts/` | `plan/memory/tasks/` | Delete directory + 18 empty placeholder files |
| `plan/memory/phases/Phase_05_Sidebar/` | `plan/memory/tasks/` | Delete directory + 12 empty placeholder files |
| `plan/memory/phases/Phase_06_Enhancements/` | `plan/memory/tasks/` | Delete directory + 14 empty placeholder files |
| `plan/memory/phases/Phase_07_Polish/` | `plan/memory/tasks/` | Delete directory + 13 empty placeholder files |
| `plan/memory/phases/` | `plan/memory/tasks/` (flat) | Delete entire directory tree |

### Name Changes in Task Files

| Old Pattern | New Pattern |
|------------|------------|
| `phases/Phase_00_Scaffold/P0-T01_Initialize_Project_Config.md` | `tasks/P0-T01.md` |
| `phases/Phase_03_Chat_Core/P3-T08_Create_ChatShell.md` | `tasks/P3-T08.md` |

Title moved from filename into YAML frontmatter `title` field.

### Guides to Update

| Guide | Changes Needed |
|-------|---------------|
| `plan/guides/Memory_System_Guide.md` | Rewrite entirely to match this design |
| `plan/guides/Task_Log_Guide.md` | Update file path pattern, remove old YAML schema, reference new schema |
| `plan/guides/Task_Assignment_Guide.md` | Update § 1 (reads state.md not progress.md+issues-log), § 4 (review writes to task file), § 5 phase checklists |
| `plan/guides/Review_Agent_Guide.md` | Update § 4 report format (write to task file Review section) |
| `plan/STARTER-PROMPT.md` | Update § 7 session protocol (reads 4 files not 7+) |

### Migration Steps (Ordered)

```
1. Create plan/memory/tasks/                          (empty directory)
2. Create plan/memory/state.md                        (from template above, with current values)
3. Create plan/memory/decisions.md                    (migrate LRN-001, LRN-002 as DEC-001, DEC-002)
4. Delete plan/memory/status.md
5. Delete plan/memory/progress.md
6. Delete plan/memory/session-log.md
7. Delete plan/memory/decisions-log.md
8. Delete plan/memory/learnings.md
9. Delete plan/memory/issues-log.md
10. Delete plan/memory/deviations-log.md
11. Delete plan/memory/index.md
12. Delete plan/memory/phases/                         (entire directory tree, all empty files)
13. Update plan/guides/Memory_System_Guide.md          (rewrite)
14. Update plan/guides/Task_Log_Guide.md               (update paths + schema)
15. Update plan/guides/Task_Assignment_Guide.md        (update references)
16. Update plan/guides/Review_Agent_Guide.md           (update report target)
17. Update plan/STARTER-PROMPT.md § 7                  (update session protocol)
```

---

## Appendix A: Initial `state.md` Content (Post-Migration)

```yaml
---
phase: P0
phase_name: "Scaffold & Infrastructure"
active_task: null
next_task: P0-T01
session: 0

blockers: []

progress: {}

phases:
  P0: { total: 18, done: 0, status: pending }
  P1: { total: 14, done: 0, status: pending }
  P2: { total: 9,  done: 0, status: pending }
  P3: { total: 27, done: 0, status: pending }
  P4: { total: 18, done: 0, status: pending }
  P5: { total: 12, done: 0, status: pending }
  P6: { total: 14, done: 0, status: pending }
  P7: { total: 13, done: 0, status: pending }

sessions:
  - id: 0                  # Session 0 is a synthetic bootstrap entry (pre-implementation setup)
    date: "2026-03-01"
    tasks_completed: []
    tasks_failed: []
    decisions_made: []
    summary: "Pre-implementation session. Plan audit and memory system creation."
    next: P0-T01
---

## Scratch

_Orchestrator scratch space. Not machine-read._
```

## Appendix B: Initial `decisions.md` Content (Post-Migration)

```yaml
---
last_updated: "2026-03-01"
---
```

```markdown
## DEC-001: Next.js 16 API Verification Required

**Date:** 2026-03-01
**Task:** Pre-implementation
**Type:** learning
**Impact:** All tasks using Next.js APIs

Next.js 16 uses `proxy.ts` instead of `middleware.ts`, supports `'use cache'` directive
with `cacheTag`/`cacheLife`, and `cacheComponents: true` in experimental config.
Training data about Next.js may be outdated.

**Affects:** All tasks. Always read `.next-docs/` before implementing any Next.js feature.

---

## DEC-002: Naming Consistency is Critical

**Date:** 2026-03-01
**Task:** Pre-implementation
**Type:** learning
**Impact:** All tasks creating files or components

The plan uses a comprehensive rename table (artifact not document, ChatStreamProvider not
DataStreamProvider, etc.). Before creating any new file, verify the component/concept name
against the naming table in `plan/final_plan/preamble.md`.

**Affects:** All tasks. Use grep to check consistency after bulk changes.
```

## Appendix C: Size Analysis

| State | Old System | New System |
|-------|-----------|------------|
| Orchestrator session-start reads | 7+ files | 4 files (STARTER-PROMPT, state.md, decisions.md, Task_Assignment_Guide) |
| Files in `plan/memory/` | 8 + 126 pre-created = 134 | 2 + on-demand tasks |
| At project completion | 134 files | 128 files (state.md + decisions.md + 126 task files) |
| Info to find "is P0-T05 done?" | Open progress.md, scan table | Read state.md frontmatter → `progress.P0-T05` |
| Info to find review status | Open task file + progress.md | Read state.md frontmatter → `progress.P0-T05: done/pass` |
| Session history | Unbounded append-only log | Rolling 3 in state.md; full history in task timestamps |
