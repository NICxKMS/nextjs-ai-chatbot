# Task Assignment Guide — Orchestrator Playbook

> **The orchestrator NEVER implements tasks directly.** Every task — including config, scaffolding, and gate verification — MUST be delegated to a subagent.You do not read code files.
>
> Orchestrator role: **plan → delegate → review → record → next**

---
## **Critical** Subagents must be instructed to read their respective guide before starting any implementation and review work.
>For Implementing/Implementation Subagent, Subagent must read `plan/guides/Implementation_Agent_Guide.md` and `.next-docs/` before starting.
>For Review Subagent, Subagent must read `plan/guides/Review_Agent_Guide.md` before starting.
---

## 1. Before Assigning a Task

1. Read `plan/memory/state.md` frontmatter — confirm the task's dependencies are `done/pass` in `progress` map
2. Check `plan/memory/state.md` `blockers` field — ensure no blockers affect this task
3. Read `plan/memory/decisions.md` — note any relevant past decisions
4. If first task in a phase — confirm previous phase gate is `done/pass` in `state.md`
5. Read the current phase spec (`plan/phases/p{NN}-{name}.md`) for intra-phase task dependencies (see § 3)

---

## 2. Agent Selection

| Task Type | Agent | Template | When |
|-----------|-------|----------|------|
| Config, schema, types | `hephaestus` | A | P0 scaffold tasks, type definitions |
| Data access layer | `poseidon` | B | P1 data tasks, cache, revalidation |
| Auth flows | `poseidon` | B | P2 auth tasks |
| Server-side chat logic | `poseidon` | B | P3 route handler, server actions, AI integration |
| Client components | `apollo` | B | P3 UI components, P4 editors, P5 sidebar UI |
| Complex multi-file | `hephaestus` | A | Tasks touching 5+ files or cross-cutting concerns |
| Verification gates | `hephaestus` | A | Gate tasks (G00–G07) — always delegated |
| Test infrastructure | `poseidon` | B | P0-T16, P7-T06/T07/T08 |
| Accessibility/responsive | `apollo` | B | P7-T03, P7-T04 |
| **Task review (quality)** | `momus` | — | After every implementation task returns |
| **Task review (architecture)** | `themis` | — | After cross-cutting or complex tasks |
| **Post-phase quality review** | `theseus` | — | End-of-phase sweep (before gate task). Writes to `plan/memory/tasks/P{N}-SWEEP.md` |

> **`theseus` sweep output:** Create `tasks/P{N}-SWEEP.md` with findings (redundancy, dead code, naming drift). Orchestrator reviews before gate task. `theseus` reads `Review_Agent_Guide.md` (not `Implementation_Agent_Guide.md`).

---

## 3. Dependency Chains

### Inter-Phase (Gate) Dependencies

```
P1 ←── P0-T18 (entire phase depends on P0 gate)
P2 ←── P1-T14 (entire phase depends on P1 gate)
P3 ←── P2-T09 (entire phase depends on P2 gate)
P4, P5 ←── P3-T27 (both depend on P3 gate)
P4 ∥ P5 (can run in parallel)
P6 ←── P4-T18 + P5-T12 (depends on both gates)
P7 ←── P6-T14 (depends on P6 gate)
```

### Intra-Phase Dependencies

Read the current phase spec (`plan/phases/p{NN}-{name}.md`) for each task's `depends_on` field. Compute `next_task` by finding the first task in the current phase whose dependencies are all `done/pass` in `state.md` progress.

### Parallelization

Tasks within a phase whose dependencies are all satisfied can run in parallel. The major opportunity is **P4 ∥ P5** (full phases, after P3 gate).

---

## 4. After a Subagent Returns — Review (Delegated)

> **The orchestrator delegates the review to a subagent.** Use `momus` for quality review or `themis` for architecture review.
> Review subagent MUST read `plan/guides/Review_Agent_Guide.md` before starting.

Dispatch a review subagent with this context:
- Task file path: `plan/memory/tasks/P{N}-T{NN}.md`
- Task spec path (for intent comparison)
- Files created/modified (from task file body)
- Current validation state

### What the Review Subagent Checks

1. **Task log completeness** — all sections filled per `Task_Log_Guide.md`
2. **Flag review:**
   - `has_deviations: true` → evaluate Deviations section → recommend accept/reject
   - `has_issues: true` → evaluate Issues section → recommend resolution
   - `has_findings: true` → evaluate Findings section → recommend plan adjustment
3. **Code spot-check** — read primary created/modified files, verify they match task spec intent, naming conventions, and size constraints
4. **Verify validation section** in task log shows all-green (`pnpm format && pnpm typecheck && pnpm lint`). For cross-cutting tasks (5+ files), the review subagent may optionally re-run validation as a trust check.
5. **Write review directly to task file** — Review section + YAML `review` field (`pass` | `fail`)

### Orchestrator Actions After Review

1. Read the task file — review subagent has already written `review: pass` or `review: fail`
2. If review passes → update `state.md` (`progress`, `phases`, `active_task`, `next_task`), promote cross-cutting flags to `decisions.md` as needed
3. If review fails → re-assign implementation task with review feedback (orchestrator increments `attempt_count` in task file)
4. Decide next task

---

## 5. Phase Checklists

### Phase Entry

- [ ] Previous phase gate task is `done/pass` in `state.md` progress map
- [ ] No blockers in `state.md` `blockers` field for this phase
- [ ] Previous phase's last task validation was green (implementation subagent checks in first task if not)

### Phase Exit

- [ ] Post-phase quality review dispatched to `theseus` (before gate task)
- [ ] All task files exist in `plan/memory/tasks/` (verified during review of each task)
- [ ] Gate task verification passed (delegated to `hephaestus`)
- [ ] Last task's validation was green
- [ ] Phase-specific gate checks pass (see `STARTER-PROMPT.md` § 6)
- [ ] `state.md` updated — all phase tasks `done/pass` in progress map, `phases.P{N}.status: done`
- [ ] Session summary added to `state.md` sessions array
- [ ] Active blockers documented in `state.md` `blockers` field

---

## 6. Error Handling

| Situation | Action |
|-----------|--------|
| Subagent returns `status: blocked` | Delegate investigation to a subagent → fix dependency or re-sequence |
| Subagent returns `status: error` | Delegate retry to a subagent with different approach (max 3 attempts) |
| Subagent fails 3 times (`attempt_count` ≥ 4) | **Escalate to user** — task is stuck, needs human guidance |
| Subagent returns `has_deviations: true` | Delegate review to `themis` → accept if justified OR re-assign with correction |
| Validation fails after task | Delegate fix to a subagent → do not proceed until green |
| Task touches files outside its spec | Delegate re-implementation with strict scope |
| Subagent takes too long | Split into sub-tasks (P0-T05a, P0-T05b); log in `decisions.md`; delegate sub-tasks |

---

## 7. Assignment Templates

> **Orchestrator reads ONLY plan/memory files** (`plan/`, `plan/memory/`). Never read source code files.
> Assignment template info comes from the **task spec** (a plan file), not from reading code.Just point it to complete task specs and let it figure out the rest. The subagent will read the relevant code files itself as part of implementation.
> Subagents read code files themselves as part of their implementation work.

### Template A: Hephaestus (Goal-Oriented)

> Use for `hephaestus` — give the goal, not a recipe. Let it explore and decide the approach.

```markdown
## Task: P{N}-T{NN} — {Title}

**MANDATORY: Read `plan/guides/Implementation_Agent_Guide.md` and `.next-docs/` before starting.**

**Goal:** [1-2 sentence description of what needs to exist when done]

- Task spec: `plan/phases/p{NN}-{name}.md` → P{N}-T{NN}
- Phase plan: `plan/final_plan/phase-{NN}-plan.md`
- Task log: `plan/memory/tasks/P{N}-T{NN}.md`
- Dependencies completed: [list]

**Acceptance Criteria:**
1. [from task spec]
2. `pnpm format && pnpm typecheck && pnpm lint` passes
3. Task log filled per `plan/guides/Task_Log_Guide.md`

Fill task log and report back with status + flags.
```

### Template B: Specialists (Structured)

> Use for `poseidon`, `apollo`, `theseus` — provide structure and constraints.

```markdown
## Task Assignment: P{N}-T{NN} — {Title}

**MANDATORY: Read `plan/guides/Implementation_Agent_Guide.md` and `.next-docs/` before starting.**

### Context
- Phase: P{N} — {Phase Name}
- Task spec: `plan/phases/p{NN}-{name}.md` → P{N}-T{NN}
- Phase plan: `plan/final_plan/phase-{NN}-plan.md`
- Task log: `plan/memory/tasks/P{N}-T{NN}.md`

### Dependencies Completed
- [list of completed dependency tasks]

### Files to Create
- [from task spec]

### Reference (oldapp/)
- [relevant oldapp/ file paths from task spec — subagent reads these themselves]

### Constraints
- [naming, patterns, architecture rules from task spec]

### Acceptance Criteria
1. [from task spec]
2. `pnpm format && pnpm typecheck && pnpm lint` passes
3. Task log filled per `plan/guides/Task_Log_Guide.md`

### When Done
Fill task log and report back with status + flags.
```
