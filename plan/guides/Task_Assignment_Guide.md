# Task Assignment Guide — Orchestrator Playbook

> **The orchestrator NEVER implements tasks directly.** Every task — including config, scaffolding, and gate verification — MUST be delegated to a subagent.
>
> Orchestrator role: **plan → delegate → review → record → next**

---

## 1. Before Assigning a Task

1. Read `plan/memory/progress.md` — confirm the task's dependencies are ✅
2. Read `plan/memory/issues-log.md` — ensure no blockers affect this task
3. Read `plan/memory/decisions-log.md` — note any relevant past decisions
4. If first task in a phase — confirm previous phase gate is ✅

---

## 2. Agent Selection

| Task Type | Agent | When |
|-----------|-------|------|
| Config, schema, types | `hephaestus` | P0 scaffold tasks, type definitions |
| Data access layer | `backend-engineer` | P1 data tasks, cache, revalidation |
| Auth flows | `backend-engineer` | P2 auth tasks |
| Server-side chat logic | `backend-engineer` | P3 route handler, server actions, AI integration |
| Client components | `frontend-engineer` | P3 UI components, P4 editors, P5 sidebar UI |
| Complex multi-file | `hephaestus` | Tasks touching 5+ files or cross-cutting concerns |
| Verification gates | `hephaestus` | Gate tasks (G00–G07) — always delegated |
| Test infrastructure | `backend-engineer` | P0-T16, P7-T06/T07/T08 |
| Accessibility/responsive | `frontend-engineer` | P7-T03, P7-T04 |
| **Task review (quality)** | `code-simplifier` | After every implementation task returns |
| **Task review (architecture)** | `oracle` | After cross-cutting or complex tasks |
| **Post-phase quality review** | `code-simplifier` | End-of-phase sweep |

---

## 3. Dependency Chains

> Arrow notation: `A ←── B` means **B depends on A** (B cannot start until A is complete).

```
P0-T01 ←── P0-T02, P0-T03, P0-T04, P0-T05, ..., P0-T17
P0-T02 ←── P0-T03 (Tailwind needs tooling config)
P0-T04 ←── P0-T05 (core types need schema for InferSelectModel)
P0-T04 ←── P0-T16 (test mocks need schema)
P0-T05 ←── P0-T06, P0-T07 (artifact+state types need core types)
P0-T05 ←── P0-T08 (error handling needs core types)
P0-T03 ←── P0-T13 (root layout needs Tailwind/globals.css)
P0-T09 ←── P0-T11 (shadcn needs cn.ts)
P0-T11 ←── P0-T12 (shared components need UI primitives)
P0-T12 ←── P0-T13 (root layout needs ThemeProvider, icons)
P0-T01..T17 ←── P0-T18 (gate requires all prior)

P1 ←── P0-T18 (entire phase depends on P0 gate)
P2 ←── P1-T14 (entire phase depends on P1 gate)
P3 ←── P2-T09 (entire phase depends on P2 gate)
P4, P5 ←── P3-T27 (both depend on P3 gate)
P4 ∥ P5 (can run in parallel)
P6 ←── P4-T18 + P5-T12 (depends on both gates)
P7 ←── P6-T14 (depends on P6 gate)
```

### Parallelization Opportunities

| Opportunity | Tasks | Condition |
|-------------|-------|-----------|
| P0 batch 1 | T01 alone | First task |
| P0 batch 2 | T02 + T04 + T09 + T10 + T15 | After T01 |
| P0 batch 3 | T03 + T05 + T08 | After T02/T04 |
| P0 batch 4 | T06 + T07 + T11 + T16 + T17 | After T05/T09/T04 |
| P0 batch 5 | T12 | After T11 |
| P0 batch 6 | T13 + T14 | After T12/T03 |
| P0 batch 7 | T18 | Gate — after all |
| P4 ∥ P5 | Entire phases | After P3-T27 |

---

## 4. After a Subagent Returns — Review (Delegated)

> **The orchestrator delegates the review to a subagent.** Use `code-simplifier` for quality review or `oracle` for architecture review.
> Review subagent MUST read `plan/guides/Review_Agent_Guide.md` before starting.

Dispatch a review subagent with this context:
- Task log path to review
- Task spec path (for intent comparison)
- Files created/modified (for spot-check)
- Current validation state

### What the Review Subagent Checks

1. **Task log completeness** — all sections filled per `Task_Log_Guide.md`
2. **Flag review:**
   - `has_deviations: true` → evaluate Deviations section → recommend accept/reject
   - `has_issues: true` → evaluate Issues section → recommend resolution
   - `has_findings: true` → evaluate Findings section → recommend plan adjustment
3. **Code spot-check** — read primary created/modified files, verify they match task spec intent, naming conventions, and size constraints
4. **Verify validation section** in task log shows all-green (`pnpm format && pnpm typecheck && pnpm lint`). For cross-cutting tasks (5+ files), the review subagent may optionally re-run validation as a trust check.
5. **Report back** with: pass/fail, flag recommendations, any code quality concerns

### Orchestrator Actions After Review

1. Read the review subagent's report
2. If review passes → update `progress.md`, log flags to cross-cutting logs as needed
3. If review fails → re-assign implementation task (or correction task) with review feedback
4. Decide next task

---

## 5. Phase Checklists

### Phase Entry

- [ ] Previous phase gate task is ✅
- [ ] Empty task log files exist in `plan/memory/phases/Phase_{NN}_{Slug}/` (orchestrator creates empty placeholders if missing; subagents fill content)
- [ ] No blockers in `plan/memory/issues-log.md` for this phase
- [ ] Previous phase's last task validation was green (implementation subagent checks in first task if not)

### Phase Exit

- [ ] Post-phase quality review dispatched to `code-simplifier` (before gate task)
- [ ] All task logs filled (verified during review of each task's review subagent)
- [ ] Gate task verification passed (delegated to `hephaestus`)
- [ ] Last task's validation was green
- [ ] Phase-specific gate checks pass (see `STARTER-PROMPT.md` § 6)
- [ ] `plan/memory/progress.md` updated — all tasks ✅
- [ ] Session log entry summarizing the phase
- [ ] Open issues documented in `plan/memory/issues-log.md`

---

## 6. Error Handling

| Situation | Action |
|-----------|--------|
| Subagent returns `status: blocked` | Delegate investigation to a subagent → fix dependency or re-sequence |
| Subagent returns `status: error` | Delegate retry to a subagent with different approach (max 3 attempts) |
| Subagent returns `has_deviations: true` | Delegate review to `oracle` → accept if justified OR re-assign with correction |
| Validation fails after task | Delegate fix to a subagent → do not proceed until green |
| Task touches files outside its spec | Delegate re-implementation with strict scope |
| Subagent takes too long | Split into sub-tasks (P0-T05a, P0-T05b); log in `decisions-log.md`; delegate sub-tasks |

---

## 7. Assignment Template

Copy-paste this when delegating to a subagent:

```markdown
## Task Assignment: P{N}-T{NN} — {Title}

**MANDATORY: Read `plan/guides/Implementation_Agent_Guide.md` before starting.**

### Context
- Phase: P{N} — {Phase Name}
- Task spec: `plan/phases/p{NN}-{name}.md` → P{N}-T{NN}
- Phase plan: `plan/final_plan/phase-{NN}-plan.md`
- Task log: `plan/memory/phases/Phase_{NN}_{Slug}/P{N}-T{NN}_{Title}.md`

### Dependencies Completed
- [list of completed dependency tasks]

### Files to Create
- [from task spec]

### Reference (oldapp/)
- [relevant oldapp/ files for behavioral parity]

### Constraints
- [naming, patterns, architecture rules from task spec]

### Acceptance Criteria
1. [from task spec]
2. `pnpm format && pnpm typecheck && pnpm lint` passes
3. Task log filled per `plan/guides/Task_Log_Guide.md`

### When Done
Fill task log and report back with status + flags.
```
