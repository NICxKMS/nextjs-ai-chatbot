# Memory Log System

> Persistent memory for the 125-task / 8-phase plan execution.
> Every session reads and writes to these logs.
> Guides: `plan/guides/Task_Log_Guide.md` and `plan/guides/Memory_System_Guide.md`

## Files

| File | Purpose | When to Update |
|------|---------|----------------|
| [status.md](status.md) | **Current execution state** — phase, next task, blockers, session count | End of every session |
| [session-log.md](session-log.md) | Chronological session records | End of every session |
| [decisions-log.md](decisions-log.md) | Cross-cutting implementation decisions with rationale | When making non-obvious choices |
| [issues-log.md](issues-log.md) | Open issues, blockers, and workarounds | When encountering problems |
| [deviations-log.md](deviations-log.md) | Plan deviations — when implementation differs from spec | When deviating from plan |
| [progress.md](progress.md) | Task-level completion tracker (125 tasks) — quick status view | After completing each task |
| [learnings.md](learnings.md) | Reusable patterns, gotchas, and tips | When discovering something reusable |
| [phases/](phases/) | Per-task execution logs (one file per task) | After completing each task |

## Task Log Structure

```
phases/
├── Phase_00_Scaffold/          # 18 task logs
│   ├── P0-T01_Initialize_Project_Config.md
│   └── ...
├── Phase_01_Data_Foundation/   # 14 task logs
├── Phase_02_Auth/              # 9 task logs
├── Phase_03_Chat_Core/         # 27 task logs
├── Phase_04_Artifacts/         # 18 task logs
├── Phase_05_Sidebar/           # 12 task logs
├── Phase_06_Enhancements/      # 14 task logs
└── Phase_07_Polish/            # 13 task logs
```

Task log format: See `plan/guides/Task_Log_Guide.md`

## Protocol

### Start of Session
1. Read `plan/STARTER-PROMPT.md` → rules + architecture
1b. Read `plan/memory/status.md` → current execution state
2. Read `progress.md` → which tasks are done
3. Read `session-log.md` → last 3 entries for recent context
4. Read `issues-log.md` → check for open blockers
5. Read `decisions-log.md` → check for pending decisions
6. Resume from the next task

### During Session
- Fill per-task logs in `phases/Phase_XX_*/P{N}-T{NN}_*.md`
- Log cross-cutting decisions in `decisions-log.md`
- Log issues/blockers in `issues-log.md`
- Log plan deviations in `deviations-log.md`

### End of Session

> Canonical protocol: `plan/guides/Memory_System_Guide.md`

1. Update `plan/memory/status.md` (phase, last task, next task, blockers, session count)
2. Write session summary in `session-log.md`
3. Update `progress.md` with completed tasks
4. Close resolved issues in `issues-log.md`
5. Verify all task logs are filled for completed tasks
