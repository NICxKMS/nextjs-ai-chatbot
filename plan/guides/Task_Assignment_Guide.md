# Task Assignment Guide — ai-assistant Migration

> How the orchestrating agent assigns tasks to implementation subagents.
> Read by the orchestrator before every task delegation.

---

## 1. Assignment Protocol

### Before Assigning

1. **Check progress:** Read `plan/memory/progress.md` — confirm the task's dependencies are ✅
2. **Check issues:** Read `plan/memory/issues-log.md` — ensure no blockers affect this task
3. **Check decisions:** Read `plan/memory/decisions-log.md` — note any relevant past decisions
4. **Verify phase entry:** If first task in a phase, confirm all previous phase gate tasks are ✅

### Assignment Message Structure

Every task assignment to a subagent **must** include:

```markdown
## Task Assignment: P{N}-T{NN} — {Title}

### Context
- **Phase:** P{N} — {Phase Name}
- **Task spec:** `plan/phases/p{NN}-{name}.md` → section P{N}-T{NN}
- **Phase plan:** `plan/final_plan/phase-{NN}-plan.md`
- **Task log (fill after completion):** `plan/memory/phases/Phase_{NN}_{Slug}/P{N}-T{NN}_{Title}.md`

### Dependencies
- Depends on: P{N}-T{XX} (✅ completed)
- Consumed by: P{N}-T{YY} (not yet started)

### Key Files
- Create: [list of files from task spec]
- Reference: [list of oldapp/ files for behavioral parity]

### Architectural Constraints
[Pull relevant constraints from plan/architecture/patterns.md and conventions.md]

### Acceptance Criteria
1. [Spec-specific criteria from task spec]
2. `pnpm format` passes
3. `pnpm typecheck` passes
4. `pnpm lint` passes

### Must Read Before Starting
- `plan/guides/Implementation_Agent_Guide.md` ← MANDATORY
- `plan/architecture/conventions.md` (naming rules)
- `plan/architecture/patterns.md` (relevant sections)
- `.next-docs/` (if Next.js feature)
```

### After Assignment Return

When a subagent returns with completed work:

1. **Read the task log** — verify all sections filled per Task_Log_Guide.md
2. **Check flags:**
   - `has_deviations: true` → read Deviations section, update `plan/memory/deviations-log.md`
   - `has_issues: true` → read Issues section, update `plan/memory/issues-log.md`
   - `has_findings: true` → read Findings section, decide if plan adjustment needed
3. **Run validation:** `pnpm format && pnpm typecheck && pnpm lint`
4. **Update progress:** Mark task ✅ in `plan/memory/progress.md`
5. **Decide next action:**
   - If clean → assign next task
   - If partial → provide feedback and re-assign
   - If blocked → investigate and resolve or escalate

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
| Verification gates | `hephaestus` or direct | Gate tasks (G00-G07) |
| Test infrastructure | `backend-engineer` | P0-T16, P7-T06/T07/T08 |
| Accessibility/responsive | `frontend-engineer` | P7-T03, P7-T04 |
| Code review | `code-simplifier` | Post-phase quality review |

---

## 3. Dependency Tracking

### Hard Dependencies (Cannot Start Until Complete)

> Arrow notation: `A ←── B` means **B depends on A** (B cannot start until A is complete).
> This lists KEY chains. Always verify full dependencies in the phase spec (`plan/phases/p{NN}-*.md`).

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
| P0 batch 3 | T03 + T05 + T08 | After T02/T04 (T03→T02, T05→T04, T08→T05) |
| P0 batch 4 | T06 + T07 + T11 + T16 + T17 | After T05/T09/T04 |
| P0 batch 5 | T12 | After T11 |
| P0 batch 6 | T13 + T14 | After T12/T03 |
| P0 batch 7 | T18 | Gate — after all |
| P4 ∥ P5 | Entire phases | After P3-T27 |

---

## 4. Phase Entry Checklist

Before starting any phase:

- [ ] Previous phase gate task is ✅
- [ ] Empty task log files exist in `plan/memory/phases/Phase_{NN}_{Slug}/`
- [ ] No blockers in `plan/memory/issues-log.md` affecting this phase
- [ ] `pnpm format && pnpm typecheck && pnpm lint` still passes (from previous work)

---

## 5. Phase Exit Checklist

After completing the last task in a phase:

- [ ] All task logs filled for the phase
- [ ] Gate task verification passed
- [ ] `pnpm format && pnpm typecheck && pnpm lint` passes
- [ ] Phase-specific gate checks pass (see STARTER-PROMPT.md § Phase Gates)
- [ ] `plan/memory/progress.md` updated — all tasks ✅
- [ ] Session log entry written summarizing the phase
- [ ] Any open issues documented in `plan/memory/issues-log.md`

---

## 6. Error Handling During Assignment

| Situation | Action |
|-----------|--------|
| Subagent returns `status: blocked` | Read blocker details → fix dependency or re-sequence tasks |
| Subagent returns `status: error` | Review error → retry with different approach (max 3 attempts) |
| Subagent returns `has_deviations: true` | Review deviation → accept if justified OR re-assign with correction |
| Validation fails after task | Fix the specific failures → re-run validation → do not proceed until green |
| Task touches files outside its spec | Reject work → re-assign with strict scope instructions |
| Subagent takes too long | Check if task is too large → split into sub-tasks if needed |

---

## 7. Assignment Template (Copy-Paste Ready)

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
- [naming, patterns, architecture rules]

### Acceptance Criteria
1. [from task spec]
2. `pnpm format && pnpm typecheck && pnpm lint` passes
3. Task log filled per plan/guides/Task_Log_Guide.md

### When Done
Fill task log and report back with status.
```

---

**End of Guide**
