# Memory System Guide

> How the memory system works for the 125-task / 8-phase plan execution.
> For the canonical session protocol (start/during/end), see `plan/STARTER-PROMPT.md` § 7.

---

## 1. Architecture

```
plan/
├── STARTER-PROMPT.md               # Session entry point — stateless rules + session protocol
├── guides/
│   ├── Task_Assignment_Guide.md    # Orchestrator's delegation playbook
│   ├── Implementation_Agent_Guide.md  # Subagent's implementation playbook
│   ├── Task_Log_Guide.md           # Per-task log format + examples
│   └── Memory_System_Guide.md      # This file — memory architecture
└── memory/
    ├── index.md                     # File listing + links
    ├── status.md                    # CURRENT STATE — phase, next task, blockers
    ├── progress.md                  # 125-task completion tracker
    ├── session-log.md               # Chronological session records
    ├── decisions-log.md             # Cross-cutting implementation decisions
    ├── issues-log.md                # Bugs, blockers, workarounds
    ├── deviations-log.md            # Plan deviations with justification
    ├── learnings.md                 # Reusable patterns and gotchas
    └── phases/
        ├── Phase_00_Scaffold/       # 18 task logs
        ├── Phase_01_Data_Foundation/ # 14 task logs
        ├── Phase_02_Auth/           # 9 task logs
        ├── Phase_03_Chat_Core/      # 27 task logs
        ├── Phase_04_Artifacts/      # 18 task logs
        ├── Phase_05_Sidebar/        # 12 task logs
        ├── Phase_06_Enhancements/   # 14 task logs
        └── Phase_07_Polish/         # 13 task logs
```

---

## 2. What Goes Where

| Information | File | Example |
|-------------|------|---------|
| Current execution state | `status.md` | Phase: P0, Next: P0-T03, Blockers: None |
| What was done for a task | `phases/Phase_XX_*/P{N}-T{NN}_*.md` | "Created ChatShell at 60 lines" |
| Which tasks are done | `progress.md` | P0-T01 ✅, P0-T02 🔄, P0-T03 ⬜ |
| What happened this session | `session-log.md` | "Session 003: Completed P0-T04 through P0-T08" |
| Why we chose approach X | `decisions-log.md` | "DEC-005: Used Drizzle push instead of migrate" |
| Something is broken | `issues-log.md` | "ISS-003: pnpm typecheck fails on cache type" |
| Implementation differs from plan | `deviations-log.md` | "IMPL-DEV-002: Merged P0-T05 and P0-T06" |
| Useful tip for future work | `learnings.md` | "LRN-005: cacheLife requires string literal" |

---

## 3. Who Writes What

### Orchestrator Updates

| File | When |
|------|------|
| `status.md` | End of every session |
| `progress.md` | After reviewing each completed task |
| `session-log.md` | End of every session |
| `decisions-log.md` | When making non-obvious cross-cutting choices |
| `issues-log.md` | When encountering or resolving blockers |
| `deviations-log.md` | When accepting a subagent's plan deviation |
| `learnings.md` | When discovering reusable knowledge |

### Subagent Updates

| File | When |
|------|------|
| `phases/Phase_XX_*/P{N}-T{NN}_*.md` | After completing assigned task |

> Subagents write **only** their task log. All other memory files are orchestrator-maintained.

---

## 4. Cross-Cutting Log Formats

### decisions-log.md

```markdown
### DEC-NNN: {Title} — {Date}
**Context:** [What prompted the decision]
**Decision:** [What was decided]
**Rationale:** [Why this approach]
**Alternatives:** [What was considered]
**Tradeoffs:** [What was given up]
```

### deviations-log.md

```markdown
### IMPL-DEV-NNN: {Title} — {Date}
**Task:** P{N}-T{NN}
**Plan prescribed:** [What the spec said]
**Actual:** [What was done]
**Justification:** [Why the deviation is better]
**Tradeoffs:** [Any downsides]
```

### issues-log.md

```markdown
### ISS-NNN: {Title} — {Date}
**Severity:** low | medium | high | critical
**Status:** open | resolved | deferred
**Description:** [What's broken/blocked]
**Impact:** [What tasks are affected]
**Workaround:** [If any]
**Resolution:** [When resolved]
```

### learnings.md

```markdown
### LRN-NNN: {Title} — {Date}
**Category:** Next.js | Drizzle | AI SDK | Testing | Architecture
**What:** [The learning]
**Context:** [Where it was discovered]
**Application:** [How future tasks should use this]
```

---

## 5. Progress Tracking

`progress.md` provides a single-glance view of all 125 tasks:

| Symbol | Meaning |
|--------|---------|
| ⬜ | Not started |
| 🔄 | In progress |
| ✅ | Complete |
| ⏭️ | Skipped (with justification) |
| ❌ | Blocked |

Summary table at top shows phase-level progress. Individual tables show per-task status.

---

## 6. Phase & Task Naming

Phase folders: `Phase_{NN}_{Slug}/` (e.g., `Phase_00_Scaffold`, `Phase_03_Chat_Core`)
Task log files: see `Task_Log_Guide.md` § 1 for naming pattern and examples.
Phase overview (names + task counts): see `STARTER-PROMPT.md` § 5.
