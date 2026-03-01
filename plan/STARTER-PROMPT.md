# Plan Execution — Starter Prompt

> Read this at the start of every session. This file is **stateless** — mutable state lives in `plan/memory/status.md`.

---

## 1. Project Context

Full rebuild of a Next.js AI chatbot (`ai-assistant`). Old app preserved at `oldapp/` for behavioral reference. Building from scratch in project root.

**Stack:** Next.js 16 · React 19 · TypeScript strict · Drizzle ORM · Supabase · Tailwind v4 · Vercel AI SDK 4.x · Biome · pnpm
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
| Memory | `plan/memory/index.md` → file listing and links |

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
2. Read `plan/memory/status.md` → current execution state
3. Read `plan/memory/progress.md` → current phase tasks
4. Read `plan/memory/session-log.md` → last 3 entries (+ phase-start entry if mid-phase)
5. Read `plan/memory/issues-log.md` → open blockers
6. Read `plan/memory/decisions-log.md` → pending decisions
7. Read `plan/guides/Task_Assignment_Guide.md` → delegation protocol
8. Resume from the next task

> **Note:** Baseline validation is handled by the first implementation subagent. If their validation fails on pre-existing issues, they report via `has_issues: true`.

### During Session

> **Every task — implementation AND review — is delegated to subagents.** The orchestrator's only direct actions are: reading context, dispatching subagents, and updating memory files.

For each task:
1. **Prepare** — check dependencies in `progress.md`, select subagent per `Task_Assignment_Guide.md` § 2
2. **Delegate implementation** — dispatch subagent with assignment message per `Task_Assignment_Guide.md` § 7
3. **Delegate review** — dispatch review subagent per `Task_Assignment_Guide.md` § 4
4. **Record** — update memory files (`progress.md`, cross-cutting logs) based on review report
5. **Next** — repeat from step 1

### Session End

1. Update `plan/memory/status.md` (phase, last task, next task, blockers, session count)
2. Write entry in `plan/memory/session-log.md`
3. Update `plan/memory/progress.md` with completed tasks
4. Close resolved issues in `plan/memory/issues-log.md`

### Session Interruption

If a session ends mid-task:
1. Mark the task as 🔄 in `progress.md`
2. Update `status.md` noting current task is in-progress
3. Write partial context in `session-log.md`
4. Next session reads the task log for recovery context and re-assigns to a subagent
5. If the task log is empty/absent, the re-assigned subagent must assess current file state against the task spec before resuming or restarting

### Task Correction (Rollback)

If a completed task is discovered to be wrong:
1. Mark original task as `revised` in `progress.md`
2. Log correction in `decisions-log.md` with rationale
3. Create correction task with suffix `-fix` (e.g., `P1-T05-fix`) and new task log file
4. Identify downstream tasks that consumed the wrong output — re-verify or re-assign
5. Delegate the correction task to a subagent

### Spec Amendment

If a task spec is discovered to be wrong mid-execution:
1. Subagent sets `has_findings: true` with spec conflict details
2. Orchestrator delegates spec amendment to a subagent (e.g., `docs-specialist`) with the correction rationale
3. Log in `decisions-log.md`
4. Delegate checking downstream tasks in the same phase for cascading impacts

