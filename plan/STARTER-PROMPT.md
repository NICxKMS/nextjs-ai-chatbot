# Plan Execution — Starter Prompt

> Read this at the start of every session. This file is **stateless** — all mutable state lives in `plan/memory/status.md`.
>
> **Guides (read before working):**
> - Implementation agents: `plan/guides/Implementation_Agent_Guide.md` — **MANDATORY**
> - Task assignment: `plan/guides/Task_Assignment_Guide.md`
> - Memory system: `plan/guides/Memory_System_Guide.md`
> - Task log format: `plan/guides/Task_Log_Guide.md`

---

## Current Status

> **→ See `plan/memory/status.md`** for current phase, last task, next task, blockers, and session count.

---

## Project Context

You are executing a **full rebuild** of a Next.js AI chatbot (`ai-assistant`). The old app is preserved at `oldapp/` for reference. You are building from scratch in the project root.

**Stack:** Next.js 16 · React 19 · TypeScript strict · Drizzle ORM · Supabase · Tailwind v4 · Vercel AI SDK 4.x · Biome · pnpm

**Scale:** 8 phases, 125 tasks, ~210 files

**Decision hierarchy:** Correctness → Architecture → Consistency → Performance → Speed
**Reuse hierarchy:** Reuse → Extend → Refactor → Create

---

## Document Precedence

When documents conflict, this hierarchy determines which source wins:

| Topic | Canonical Source |
|-------|------------------|
| Provider tree, component wiring | `plan/integration_map/component-wiring.md` |
| Architecture patterns, coding rules | `plan/architecture/patterns.md` + `conventions.md` |
| Task details, dependencies | `plan/phases/p{NN}-{name}.md` (phase specs) |
| Naming conventions | `plan/architecture/conventions.md` + `redesign/naming-conventions.md` |
| Session workflow, memory | `plan/guides/Memory_System_Guide.md` |
| Redesign decisions | `redesign/` folder (13 authoritative docs) |

> **Rule:** Specific documents override general summaries. phase specs > guides > STARTER-PROMPT.

---

## Critical Rules (Never Violate)

### Architecture
1. **Server-first**: Every component is a Server Component unless it requires browser APIs, state, or event handlers
2. **Three-layer imports**: `app/` → `features/` → `lib/` + `components/` (enforced by `scripts/check-imports.mjs`)
3. **Feature collocation**: All domain code is in `features/<domain>/` — components, hooks, actions, schemas, types
4. **No `src/` directory**: `app/`, `features/`, `lib/`, `components/` at project root

### Naming (Non-Negotiable)
| Correct | WRONG (never use) |
|---------|-------------------|
| `artifact` | `document` (in artifact context) |
| `artifactId` | `documentId` |
| `ArtifactKind` | `DocumentKind` |
| `ArtifactHandler` | `DocumentHandler` |
| `createArtifact` / `updateArtifact` | `createDocument` / `updateDocument` |
| `ChatShell` | `Chat` (god component) |
| `ChatStreamProvider` | `DataStreamProvider` |
| `StreamBridge` | `DataStreamHandler` |
| `SessionProvider` | `AuthProvider` |
| `VoteResolver` | `VoteHydrator` |
| `PendingChatsProvider` | `OptimisticChatsProvider` |
| `ChatSessionContext` | `ChatContext` |
| `proxy.ts` | `middleware.ts` |

### Patterns
- **Server Actions** return `ActionResult<T>` — never throw from client-called SAs
- **Every mutation** calls `updateTag()` (SAs) or `revalidateTag(tag, 'max')` (RHs)
- **Artifact state**: `useSyncExternalStore` with selector pattern — NOT SWR
- **Settings**: Direct `useSettings()` hook — NO SettingsProvider
- **ChatShell**: ≤80 lines thin orchestrator; logic in hooks + pure functions
- **StreamBridge**: ≤30 lines thin bridge dispatching to artifact store
- **No credit/gateway/quota** logic anywhere

### Validation (Run After Every Task)
```bash
pnpm format        # Biome formatting
pnpm typecheck     # TypeScript strict check
pnpm lint          # Biome linting
```

---

## Phase Overview

| Phase | Name | Tasks | Files | Key Deliverable |
|-------|------|:-----:|:-----:|-----------------|
| P0 | Scaffold & Infrastructure | 18 | ~55 | Compilable skeleton: config, types, errors, UI primitives, proxy.ts |
| P1 | Data Foundation | 14 | ~22 | Data access layer, cache, Supabase client, revalidation helpers |
| P2 | Auth | 9 | ~14 | SessionProvider, login/register, proxy.ts auth guard, guest flow |
| P3 | Chat Core | 27 | ~42 | ChatShell, ChatStreamProvider, StreamBridge, useChat, tool stubs |
| P4 | Artifacts | 18 | ~28 | Artifact store, handler registry, text/code/sheet/image editors |
| P5 | Sidebar | 12 | ~12 | SidebarShell (SERVER), PendingChatsProvider, history pagination |
| P6 | Enhancements | 14 | ~17 | Voting, model selector, visibility, file upload, health |
| P7 | Polish | 13 | ~20 | Error boundaries, loading states, a11y, responsive, E2E, build |

**Critical path:** P0 → P1 → P2 → P3 → P4 → P6 → P7 (P5 parallel with P4)

---

## How to Execute a Task

> Full details: `plan/guides/Task_Assignment_Guide.md` (orchestrator) | `plan/guides/Implementation_Agent_Guide.md` (subagent)

### Before Starting (implementation agent)
1. **Read the Implementation Agent Guide** — `plan/guides/Implementation_Agent_Guide.md` (if not read this session)
2. Read the task spec: `plan/phases/p{NN}-{name}.md` → find the task by ID
3. Read the phase plan: `plan/final_plan/phase-{NN}-plan.md`
4. Check architectural patterns: `plan/architecture/patterns.md` (relevant sections)
5. Check naming/conventions: `plan/architecture/conventions.md`
6. If building Next.js features: Read `.next-docs/` for current API docs

### During Implementation (implementation agent)
1. Follow the task spec exactly — files listed, dependencies respected
2. Use `oldapp/` as behavioral reference — match what it does, not how it does it
3. Apply all naming conventions (artifact, not document)
4. Every Server Action returns `ActionResult<T>`
5. Every mutation pairs with `updateTag`/`revalidateTag`

### After Task Completion (implementation agent)
1. Run: `pnpm format && pnpm typecheck && pnpm lint`
2. Fill the task log: `plan/memory/phases/Phase_XX_*/P{N}-T{NN}_*.md` per `plan/guides/Task_Log_Guide.md`
3. Report back to orchestrator with status + flags

### After Task Review (orchestrator)
1. Verify validation passed (re-run if needed)
2. Update `plan/memory/progress.md` with task status
3. Log any cross-cutting decisions in `plan/memory/decisions-log.md`
4. Log any deviations in `plan/memory/deviations-log.md`
5. If the task is a VERIFY gate — run all gate checks before proceeding

---

## Reference Documents

### Core Architecture
| Document | Purpose |
|----------|---------|
| `plan/architecture/patterns.md` | Pattern catalog — data access, server actions, components, hooks, streaming, caching |
| `plan/architecture/conventions.md` | Directory structure, naming rules, imports, file placement |
| `plan/architecture/decisions.md` | 15 ADRs with rationale and tradeoffs |
| `plan/final_plan/preamble.md` | Executive summary: ADRs, naming table, deviations, success criteria |

### Phase Details
| Document | Purpose |
|----------|---------|
| `plan/phases/p{NN}-{name}.md` | Detailed per-task specs: action, files, inputs/outputs, success criteria |
| `plan/final_plan/phase-{NN}-plan.md` | Phase overview with task table, entry/exit states, key changes |

### Integration
| Document | Purpose |
|----------|---------|
| `plan/integration_map/component-wiring.md` | Provider tree, context dependencies, render trees |
| `plan/integration_map/seam-inventory.md` | 40 integration seams with data contracts |
| `plan/integration_map/contracts.md` | TypeScript interfaces for all cross-component contracts |
| `plan/integration_map/data-flow-chains-01.md` | Chains 1-7: chat send, load, delete, edit, artifact create/update, settings |
| `plan/integration_map/data-flow-chains-02.md` | Chains 8-16: upload, vote, suggestions, model, visibility, title, auth, sidebar |
| `plan/final_plan/ai-migration-guide.md` | Handler registry, tool definitions, streaming architecture |

### Type Reference
| Document | Purpose |
|----------|---------|
| `plan/scaffold/shared-types.md` | All shared type definitions: ActionResult, UIArtifact, ChatSessionValue, etc. |
| `plan/scaffold/base-config.md` | Config templates: package.json, tsconfig, next.config, biome.json |
| `plan/scaffold/directory-structure.md` | Complete file tree with ~210 file paths |

### Behavioral Reference
| Document | Purpose |
|----------|---------|
| `plan/behavioral_extraction/` | 9 files documenting what the old app actually does |
| `plan/ui_parity/` | 7 files: screens, components, interactions, accessibility |
| `oldapp/` | The actual old app code — read-only reference |

### Redesign Decisions
| Document | Purpose |
|----------|---------|
| `redesign/` | 13 authoritative redesign documents — architecture, naming, state, streaming, etc. |
### Guides
| Document | Purpose |
|----------|--------|
| `plan/guides/Implementation_Agent_Guide.md` | **MANDATORY pre-read** — naming rules, forbidden patterns, provider tree, validation, reference paths |
| `plan/guides/Task_Assignment_Guide.md` | How to delegate — assignment template, dependencies, parallelization, phase checklists |
| `plan/guides/Memory_System_Guide.md` | Memory architecture, what-goes-where, orchestrator/agent workflows, session protocol |
| `plan/guides/Task_Log_Guide.md` | Per-task log format, YAML frontmatter, status values, writing guidelines, examples |

### Memory System
| Document | Purpose |
|----------|--------|
| `plan/memory/index.md` | Quick reference + protocol for the memory system |
| `plan/memory/progress.md` | 125-task tracker — single-glance view of all phases |
| `plan/memory/session-log.md` | Chronological session records |
| `plan/memory/decisions-log.md` | Cross-cutting implementation decisions |
| `plan/memory/issues-log.md` | Open issues, blockers, workarounds |
| `plan/memory/deviations-log.md` | Plan deviations with justification |
| `plan/memory/learnings.md` | Reusable patterns and gotchas |
---

## Key Provider Tree

> **Canonical source:** `plan/integration_map/component-wiring.md` § 1
> If this summary and component-wiring.md conflict, **component-wiring.md wins.**

```
Root Layout (SERVER):
  <ThemeProvider>
    <SessionProvider session={session}>   ← server-fetched
      {children}
    </SessionProvider>
  </ThemeProvider>
  <Toaster />                             ← outside ThemeProvider

Chat Layout (SERVER):
  <PendingChatsProvider>                  ← outermost (both sidebar + pages)
    <SidebarProvider>
      <SidebarShell />                    ← SERVER with 'use cache'
      {children}
    </SidebarProvider>
  </PendingChatsProvider>

Chat Page (SERVER):
  <ChatStreamProvider>                    ← Page-scoped, NOT layout
    <ChatShell>                           ← 'use client' ≤80 lines
      <ChatSessionContext.Provider>
        <ChatHeader />
        <Messages />
        <MultimodalInput />
        <ArtifactPanel />                 ← conditional
      </ChatSessionContext.Provider>
    </ChatShell>
    <StreamBridge />                      ← sibling of ChatShell (≤30 lines)
    <Suspense>
      <VoteResolver />                   ← React 19 use() deferred votes
    </Suspense>
  </ChatStreamProvider>
```

---

## Quick Reference: Phase Gates

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

## Session Protocol

> Full details: `plan/guides/Memory_System_Guide.md`

### Memory System

All execution memory lives in `plan/memory/`:
- **Status:** `plan/memory/status.md` (current phase, next task, blockers, session count)
- **Task logs:** `plan/memory/phases/Phase_XX_*/P{N}-T{NN}_*.md` (one per task, 125 total)
- **Cross-cutting:** `plan/memory/{session,decisions,issues,deviations,learnings}-log.md`
- **Progress:** `plan/memory/progress.md` (125-task tracker)
- **Guides:** `plan/guides/` (4 guides — see Reference Documents above)

### At the Start of Every Session
1. Read this file for rules and architecture
2. Read `plan/memory/status.md` for current execution state
3. Read `plan/guides/Implementation_Agent_Guide.md` (if not read recently)
4. Read `plan/memory/progress.md` → which tasks are done
5. Read `plan/memory/session-log.md` → last 3 entries for recent context
6. Read `plan/memory/issues-log.md` → open blockers
7. Read `plan/memory/decisions-log.md` → pending decisions
8. Resume from the next task

### During a Session
- Fill per-task logs per `plan/guides/Task_Log_Guide.md`
- Delegate tasks per `plan/guides/Task_Assignment_Guide.md`
- Log cross-cutting decisions in `plan/memory/decisions-log.md`
- Log issues/blockers in `plan/memory/issues-log.md`
- Log plan deviations in `plan/memory/deviations-log.md`
- Log reusable discoveries in `plan/memory/learnings.md`

### At the End of Every Session
1. Update `plan/memory/status.md` (phase, last task, next task, blockers, session count)
2. Write entry in `plan/memory/session-log.md`
3. Update `plan/memory/progress.md` with completed tasks
4. Close resolved issues in `plan/memory/issues-log.md`
5. Verify all task logs are filled for completed tasks

