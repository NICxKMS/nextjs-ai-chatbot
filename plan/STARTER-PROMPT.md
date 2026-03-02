# Plan Execution — Starter Prompt

> Read this at the start of every session. This file is **stateless** — mutable state lives in `plan/memory/state.md`.

---

## 1. Project Context

Full rebuild of a Next.js AI chatbot (`ai-assistant`). Old app preserved at `oldapp/` for behavioral reference. Building from scratch in project root.

**Stack:** Next.js 16 · React 19 · TypeScript strict · Drizzle ORM · Supabase · Tailwind v4 · Vercel AI SDK 5.x · Biome · pnpm
**Scale:** 8 phases · 125 tasks · ~210 files
**Decision hierarchy:** Correctness → Architecture → Consistency → Performance → Speed
**Reuse hierarchy:** Reuse → Extend → Refactor → Create

---

## 2. Document Precedence

When documents conflict, this hierarchy wins:

| Topic | Canonical Source |
|-------|------------------|
| Provider tree, component wiring | `plan/integration_map/component-wiring.md` |
| Architecture patterns, coding rules | `plan/architecture/patterns.md` + `conventions.md` |
| Task details, dependencies | `plan/phases/p{NN}-{name}.md` (phase specs) |
| Naming conventions | `plan/architecture/conventions.md` + `plan-archives/redesign/naming-conventions.md` |
| Redesign decisions | `plan-archives/redesign/` folder (13 authoritative docs) |

> **Rule:** Specific documents override general summaries. Phase specs > guides > this file.

---

## 3. Guides

| Guide | Audience | Purpose |
|-------|----------|---------|
| [`Task_Assignment_Guide.md`](guides/Task_Assignment_Guide.md) | Orchestrator | Delegation protocol, agent selection, dependencies, phase checklists |
| [`Implementation_Agent_Guide.md`](guides/Implementation_Agent_Guide.md) | Subagents | **MANDATORY pre-read** — naming, patterns, provider tree, validation |
| [`Memory_System_Guide.md`](guides/Memory_System_Guide.md) | All | Memory file architecture, what goes where, file formats |
| [`Task_Log_Guide.md`](guides/Task_Log_Guide.md) | Subagents | Per-task log format, YAML frontmatter, examples |
| [`Review_Agent_Guide.md`](guides/Review_Agent_Guide.md) | Review subagents | Review scope, report format, flag evaluation |

---

## 4. Reference Documents

| Category | Documents |
|----------|-----------|
| Architecture | `plan/architecture/patterns.md` · `conventions.md` · `decisions.md` · `plan/final_plan/preamble.md` |
| Phase specs | `plan/phases/p{NN}-{name}.md` · `plan/final_plan/phase-{NN}-plan.md` |
| Integration | `plan/integration_map/component-wiring.md` · `seam-inventory.md` · `contracts.md` · `data-flow-chains-01.md` · `data-flow-chains-02.md` · `plan/final_plan/ai-migration-guide.md` |
| Types & scaffold | `plan/scaffold/shared-types.md` · `base-config.md` · `directory-structure.md` |
| Behavioral ref | `plan/behavioral_extraction/` (9 files) · `plan/ui_parity/` (7 files) · `oldapp/` |
| Redesign | `plan-archives/redesign/` (13 authoritative docs) |
| Memory | `plan/memory/state.md` (execution state) · `plan/memory/decisions.md` (cross-cutting) |

---

## 5. Phase Overview

| Phase | Name | Tasks | Key Deliverable |
|-------|------|:-----:|-----------------|
| P0 | Scaffold & Infrastructure | 18 | Compilable skeleton: config, types, errors, UI primitives, proxy.ts |
| P1 | Data Foundation | 14 | Data access layer, cache, Supabase client, revalidation helpers |
| P2 | Auth | 9 | SessionProvider, login/register, proxy.ts auth guard, guest flow |
| P3 | Chat Core | 27 | ChatShell, ChatStreamProvider, StreamBridge, useChat, tool stubs |
| P4 | Artifacts | 18 | Artifact store, handler registry, text/code/sheet/image editors |
| P5 | Sidebar | 12 | SidebarShell (SERVER), PendingChatsProvider, history pagination |
| P6 | Enhancements | 14 | Voting, model selector, visibility, file upload, health |
| P7 | Polish | 13 | Error boundaries, loading states, a11y, responsive, E2E, build |

**Critical path:** P0 → P1 → P2 → P3 → (P4 ∥ P5) → P6 → P7

---

## 6. Phase Gates

| Gate | Key Checks |
|------|-----------|
| G00 | `pnpm typecheck` passes; `proxy.ts` exports; DB schema uses `Artifact`; zero credit/gateway codes |
| G01 | All `lib/data/*.ts` resolve; cache helpers work; revalidation wired |
| G02 | SessionProvider renders; login/register works; guest token rotates in proxy.ts |
| G03 | ChatShell ≤80 lines; StreamBridge works; handler registry functional; `useChat` streams |
| G04 | All 4 artifact types render; `useSyncExternalStore` for state; version navigation works |
| G05 | SidebarShell SERVER-rendered; PendingChatsProvider wired; single-channel title delivery |
| G06 | Voting, model selector, visibility, file upload all functional with Server Actions |
| G07 | Build passes; E2E tests pass; zero "document" in code; responsive + accessible |

---

## 7. Session Protocol

> **This is the single canonical session protocol.** Other files reference it but do not duplicate it.

### Session Start

1. Read this file
2. Read `plan/memory/state.md` frontmatter → entire execution state (phase, active_task, next_task, blockers, progress, sessions)
3. Read `plan/memory/decisions.md` → cross-cutting decisions + learnings
4. Read `plan/guides/Task_Assignment_Guide.md` → delegation protocol
5. **Increment `session` counter** in `state.md`. Use this value as the new session `id`.
6. Resume from `next_task` (or handle crash recovery if `active_task` is not null — see Session Interruption below)

> **Reads 4 files total.** All execution state is in `state.md` frontmatter.
> Baseline validation is handled by the first implementation subagent. If their validation fails on pre-existing issues, they report via `has_issues: true`.

### During Session

> **Every task — implementation AND review — is delegated to subagents.**
> The orchestrator's only direct actions are: reading plan/memory files, dispatching subagents, and updating `state.md` + `decisions.md`.
> **The orchestrator NEVER reads source code files** (`app/`, `features/`, `lib/`, `components/`, `oldapp/`). All code reading is done by subagents.

For each task:
1. **Prepare** — check dependencies are `done/pass` in `state.md` progress, select subagent per `Task_Assignment_Guide.md` § 2
2. **Delegate implementation** — dispatch subagent with assignment message per `Task_Assignment_Guide.md` § 7
3. **Delegate review** — dispatch review subagent per `Task_Assignment_Guide.md` § 4 (review subagent writes directly to task file)
4. **Record** — update `state.md` (progress, active_task, next_task, phases), promote cross-cutting flags to `decisions.md` as needed
5. **Next** — repeat from step 1

### Session End

1. Set `state.md`: `active_task: null`
2. Compose session summary and push to `state.md` `sessions` array (rolling 3 — drop oldest if >3)
3. Verify `state.md` consistency: `active_task` is null, `next_task` correct, progress counts match `phases.done`
4. Save `state.md`

### Session Interruption / Crash Recovery

If a session ends mid-task:
1. Leave `state.md` `active_task` set — do NOT clear it
2. Next session detects `active_task != null` at step 5 above and runs recovery:

**Recovery logic** (check task file at `plan/memory/tasks/{active_task}.md`):
- **No task file exists** → task never started. Set `active_task: null`, dispatch normally.
- **Task file, status: active** → crashed mid-implementation. Re-dispatch from scratch — subagent assesses file system state.
- **Task file, status: done, no review** → implementation done, review didn't happen. Dispatch review subagent.
- **Task file, status: done, review: pass** → review done, `state.md` not updated. Apply PASS steps (update progress, advance next_task).
- **Task file, status: done, review: fail** → rework pending. Re-dispatch implementation with review feedback.

### Task Correction (Rollback)

If a completed task is discovered to be wrong:
1. Update `state.md` progress for the task to `done/fail`
2. Log correction rationale in `decisions.md`
3. Re-dispatch the task (orchestrator increments `attempt_count` in task file)
4. Identify downstream tasks that consumed the wrong output — re-verify or re-assign
5. Delegate the correction task to a subagent

### Spec Amendment

If a task spec is discovered to be wrong mid-execution:
1. Subagent sets `has_findings: true` with spec conflict details
2. Orchestrator delegates spec amendment to an appropriate subagent with the correction rationale
3. Log in `decisions.md`
4. Delegate checking downstream tasks in the same phase for cascading impacts

