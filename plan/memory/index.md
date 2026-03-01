# Memory System — File Index

> Quick reference for all memory files. For session protocol, see `plan/STARTER-PROMPT.md` § 7.
> For file formats and what goes where, see `plan/guides/Memory_System_Guide.md`.

## Files

| File | Purpose | Updated By |
|------|---------|------------|
| [status.md](status.md) | **Current execution state** — phase, next task, blockers, session count | Orchestrator (end of session) |
| [progress.md](progress.md) | 125-task completion tracker | Orchestrator (after each task) |
| [session-log.md](session-log.md) | Chronological session records | Orchestrator (end of session) |
| [decisions-log.md](decisions-log.md) | Cross-cutting implementation decisions | Orchestrator (when deciding) |
| [issues-log.md](issues-log.md) | Open issues, blockers, workarounds | Orchestrator (when encountering) |
| [deviations-log.md](deviations-log.md) | Plan deviations with justification | Orchestrator (when accepting) |
| [learnings.md](learnings.md) | Reusable patterns, gotchas, tips | Orchestrator (when discovering) |
| [phases/](phases/) | Per-task execution logs (125 files) | Subagents (after each task) |

Task log format and phase folder naming: see `plan/guides/Task_Log_Guide.md`
