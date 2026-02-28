---
description: "APM Autonomous Resume — Resume autonomous execution from where it left off"
tools: ["read", "write", "edit", "bash", "glob", "grep", "webfetch"]
---

# APM Autonomous Resume

Resume autonomous task execution from where it was previously paused.

---

## Resume Protocol

1. **Read `AGENTS.md`** for execution protocols and architecture rules
2. **Read `.apm/Implementation_Plan.md`** to determine current project state
3. **Check for in-progress tasks**:
   - If a task has status `in_progress`:
     - Read its memory log to understand what work was completed
     - Assess whether the task is actually finished (validation passes, files exist) or partially done
     - If finished: update status to `completed`, update Progress Summary, proceed to next task
     - If partially done: resume from where it left off and complete it
     - If blocked or broken: mark as `blocked`, log the issue to `global-issues.md`, and move to the next eligible task
4. **Apply the Task Selection Algorithm** from the full autonomous prompt (see `.github/prompts/apm-auto-start.prompt.md` §2)
5. **Continue the autonomous execution loop** (see `.github/prompts/apm-auto-start.prompt.md` §3–§5)

---

## Key References

| Purpose | Path |
|---------|------|
| Full autonomous protocol | `.github/prompts/apm-auto-start.prompt.md` |
| Execution rules | `AGENTS.md` |
| Task status index | `.apm/Implementation_Plan.md` |
| Plan specs | `plan/final_plan/phase_00.md` through `phase_05.md` |
| Memory logs | `.apm/Memory/Phase_XX_<slug>/` |
| Memory log format | `.apm/guides/Memory_Log_Guide.md` |
| Issue log | `global-issues.md` |
