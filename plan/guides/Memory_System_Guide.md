# Memory System Guide — ai-assistant Migration

> Explains how the memory system works for the 125-task / 8-phase plan execution.
> Read by all agents at session start. Maintained by the orchestrating agent.

---

## 1. System Architecture

The memory system has **three layers**:

```
plan/
├── STARTER-PROMPT.md                    # Session entry point — stateless rules + architecture
├── guides/
│   ├── Implementation_Agent_Guide.md   # MANDATORY pre-read for implementation subagents
│   ├── Task_Assignment_Guide.md        # How the orchestrator delegates tasks
│   ├── Task_Log_Guide.md               # How to write task logs
│   └── Memory_System_Guide.md          # This file — how the system works
└── memory/
    ├── index.md                         # Quick reference + protocol
    ├── status.md                        # CURRENT EXECUTION STATE — phase, next task, blockers
    ├── progress.md                      # 125-task completion tracker
    ├── session-log.md                   # Chronological session records
    ├── decisions-log.md                 # Cross-cutting implementation decisions
    ├── issues-log.md                    # Open bugs, blockers, workarounds
    ├── deviations-log.md               # Plan deviations with justification
    ├── learnings.md                     # Reusable patterns and gotchas
    └── phases/
        ├── Phase_00_Scaffold/           # P0 task logs (18 files)
        │   ├── P0-T01_Initialize_Project_Config.md
        │   ├── P0-T02_Create_Tooling_Config.md
        │   └── ...
        ├── Phase_01_Data_Foundation/    # P1 task logs (14 files)
        ├── Phase_02_Auth/               # P2 task logs (9 files)
        ├── Phase_03_Chat_Core/          # P3 task logs (27 files)
        ├── Phase_04_Artifacts/          # P4 task logs (18 files)
        ├── Phase_05_Sidebar/            # P5 task logs (12 files)
        ├── Phase_06_Enhancements/       # P6 task logs (14 files)
        └── Phase_07_Polish/             # P7 task logs (13 files)
```

---

## 2. What Goes Where

| Information Type | File | Example |
|-----------------|------|---------|
| What was done for a specific task | `phases/Phase_XX_*/P{N}-T{NN}_*.md` | "Created ChatShell component at 60 lines" |
| What task is next | `progress.md` | P0-T01 ✅, P0-T02 🔄, P0-T03 ⬜ |
| What happened this session | `session-log.md` | "Session 003: Completed P0-T04 through P0-T08" |
| Why we chose approach X over Y | `decisions-log.md` | "DEC-005: Used Drizzle push instead of migrate" |
| Something is broken/blocked | `issues-log.md` | "ISS-003: pnpm typecheck fails on cache type" |
| Implementation differs from plan | `deviations-log.md` | "IMPL-DEV-002: Merged P0-T05 and P0-T06" |
| Useful tip for future work | `learnings.md` | "LRN-005: cacheLife requires string literal" |

---

## 3. Orchestrator Responsibilities

### Phase Entry
1. Create `plan/memory/phases/Phase_{NN}_{Slug}/` directory
2. Create **empty** task log files for all tasks in the phase
3. Add phase entry note to `session-log.md`

### Task Assignment
1. Provide the implementation agent with:
   - Task spec path: `plan/phases/p{NN}-{name}.md` → task section
   - Task log path: `plan/memory/phases/Phase_{NN}_*/P{N}-T{NN}_*.md`
   - Any relevant context from `decisions-log.md` or `issues-log.md`

### Task Review
1. Read completed task log
2. If `has_deviations: true` → review the Deviations section, update `deviations-log.md`
3. If `has_issues: true` → review the Issues section, update `issues-log.md`
4. If `has_findings: true` → review the Findings section, decide if plan adjustment needed
5. Update `progress.md`
6. Assign next task or address blocker

### Phase Exit
1. Run validation gate: `pnpm format && pnpm typecheck && pnpm lint`
2. Run phase-specific gate checks (see STARTER-PROMPT.md § Phase Gates)
3. Add phase summary to `session-log.md`
4. Update `progress.md` summary table

---

## 4. Implementation Agent Responsibilities

### Receiving a Task
1. Read the task spec in `plan/phases/p{NN}-{name}.md`
2. Read the task's plan context in `plan/final_plan/phase-{NN}-plan.md`
3. Check `plan/architecture/patterns.md` and `plan/architecture/conventions.md` for relevant patterns
4. If Next.js feature: read `.next-docs/` for current API docs

### During Execution
1. Follow the task spec exactly — files listed, dependencies respected
2. Apply all naming conventions (see STARTER-PROMPT.md § Naming)
3. Reference `oldapp/` for behavioral parity

### After Completion
1. Run: `pnpm format && pnpm typecheck && pnpm lint`
2. Fill in the task log file per `plan/guides/Task_Log_Guide.md` format
3. Report completion to orchestrator

---

## 5. Session Protocol

### Session Start
```
1. Read plan/STARTER-PROMPT.md         → rules + architecture
1b. Read plan/memory/status.md        → current execution state
2. Read plan/memory/progress.md        → which tasks are done
3. Read plan/memory/session-log.md     → last 3 entries
4. Read plan/memory/issues-log.md      → open blockers
5. Read plan/memory/decisions-log.md   → pending decisions
6. Resume from next task
```

### Session End
```
1. Update plan/memory/status.md        → phase, last task, next task, blockers, session count
2. Write entry in session-log.md       → what was accomplished
3. Update progress.md                  → mark completed tasks
4. Close resolved issues               → issues-log.md
5. Verify all task logs are filled      → phases/Phase_XX_*/
```

---

## 6. Phase Folder Naming

| Phase | Folder Name |
|-------|-------------|
| P0 | `Phase_00_Scaffold` |
| P1 | `Phase_01_Data_Foundation` |
| P2 | `Phase_02_Auth` |
| P3 | `Phase_03_Chat_Core` |
| P4 | `Phase_04_Artifacts` |
| P5 | `Phase_05_Sidebar` |
| P6 | `Phase_06_Enhancements` |
| P7 | `Phase_07_Polish` |

---

## 7. Task Log File Naming

Pattern: `P{N}-T{NN}_{Title_Words}.md`

Examples:
- `P0-T01_Initialize_Project_Config.md`
- `P3-T08_Create_ChatShell.md`
- `P7-T13_Verification_Gate_G07.md`

Use the task title from `plan/phases/`, converting spaces to underscores and removing special characters.

---

## 8. Cross-Cutting Logs

These files track concerns that span multiple tasks:

### decisions-log.md
For non-obvious choices that affect future work. Format: `DEC-NNN` with date, context, decision, rationale, alternatives, tradeoffs.

### deviations-log.md
For plan deviations. Format: `IMPL-DEV-NNN` with date, what plan prescribed, what was done, why it's better, tradeoffs.

### issues-log.md
For bugs and blockers. Format: `ISS-NNN` with date, severity, status, description, impact, workaround, resolution.

### learnings.md
For reusable knowledge. Format: `LRN-NNN` with date, category, what, context, application.

---

## 9. Progress Tracking

`progress.md` provides a single-glance view of all 125 tasks:

| Symbol | Meaning |
|--------|---------|
| ⬜ | Not started |
| 🔄 | In progress |
| ✅ | Complete |
| ⏭️ | Skipped (with justification) |
| ❌ | Blocked |

The summary table at the top shows phase-level progress. Individual task tables show per-task status with session number and notes.

---

**End of Guide**
