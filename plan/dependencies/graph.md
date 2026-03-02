> **Updated per redesign audit (2026-03-01)**

# Task Dependency Graph

> Full dependency graph for all 125 tasks across 8 phases.
> Dependencies shown as `→` (depends on). **Bold** = critical path tasks.
> Task IDs: P0-T01 through P7-T13. "artifact" naming throughout. No credit/gateway logic.
> proxy.ts (not middleware.ts). ChatShell + ChatSessionContext. useSyncExternalStore for artifact state.

---

## Phase P0 — Scaffold & Infrastructure (18 tasks)

```
P0-T01 ─────────────────────────── (no deps — project config)
  ├──→ P0-T02 → P0-T03
  ├──→ P0-T04 (Drizzle schema + client, Artifact table)
  ├──→ P0-T05 → P0-T06, P0-T07
  ├──→ P0-T08 (error handling)
  ├──→ P0-T09 (utility functions)
  ├──→ P0-T10 (shared hooks)
  ├──→ P0-T11 (shadcn/ui) → P0-T12 (shared components)
  ├──→ P0-T13 (root layout + global error)
  ├──→ P0-T14 (proxy.ts — NOT middleware.ts)
  ├──→ P0-T15 (instrumentation stubs)
  ├──→ P0-T16 (test infrastructure)
  └──→ P0-T17 (import boundary script)
          ALL P0 tasks ──────────────→ P0-T18 (gate G00)
```

### P0 Task Dependencies

| Task | Depends On | Critical Path |
|------|-----------|:---:|
| **P0-T01** | — | ✅ |
| P0-T02 | T01 | |
| P0-T03 | T02 | |
| P0-T04 | T01 | |
| P0-T05 | T01 | |
| P0-T06 | T05 | |
| P0-T07 | T05 | |
| P0-T08 | T05 | |
| **P0-T09** | T01 | ✅ |
| P0-T10 | T01 | |
| **P0-T11** | T09 | ✅ |
| **P0-T12** | T11 | ✅ |
| **P0-T13** | T12 | ✅ |
| P0-T14 | T01 | |
| P0-T15 | T01 | |
| P0-T16 | T04 | |
| P0-T17 | T01 | |
| **P0-T18** | All P0 | ✅ |

### P0 Parallelization

After T01 completes, 5 independent tracks can run in parallel:
1. **Config track:** T02 → T03
2. **Schema track:** T04 → T16
3. **Types track:** T05 → T06, T07, T08
4. **Utils track:** T09 → T11 → T12 → T13
5. **Independent:** T10, T14, T15, T17

---

## Phase P1 — Data Foundation (14 tasks)

```
P0-T18 ──→ P1-T01 (DB migration)
          ──→ P1-T02 (cache client + keys) → P1-T03, P1-T04
          ──→ P1-T05 (user data)
          ──→ P1-T11 (AI provider registry)

P1-T02 + P0-T04 ──→ P1-T06 (chat data), T07, T08, T09, T10
P1-T11 ──→ P1-T12 (AI provider wrapper)
P0-T16 ──→ P1-T13 (test fixtures)
ALL P1 tasks ──────→ P1-T14 (gate G01)
```

### P1 Task Dependencies

| Task | Depends On | Critical Path |
|------|-----------|:---:|
| P1-T01 | P0-T04, P0-T18 | |
| **P1-T02** | P0-T01, P0-T18 | ✅ |
| P1-T03 | T02 | |
| **P1-T04** | T02 | ✅ |
| P1-T05 | P0-T04 | |
| **P1-T06** | P0-T04, T02 | ✅ |
| P1-T07 | P0-T04 | |
| P1-T08 | P0-T04 | |
| P1-T09 | P0-T04 | |
| P1-T10 | P0-T04 | |
| P1-T11 | P0-T01 | |
| P1-T12 | T11 | |
| P1-T13 | P0-T16 | |
| **P1-T14** | All P1 | ✅ |

### P1 Parallelization

After P0-T18, 4 independent tracks start:
1. **DB track:** T01 (migration)
2. **Cache track:** T02 → T03, T04 (then feeds T06–T10)
3. **AI track:** T11 → T12
4. **Data functions (T05–T10):** converge after T02 + P0-T04
5. **Test fixtures:** T13 (needs P0-T16)

---

## Phase P2 — Auth Vertical (9 tasks)

```
P1-T14 ──→ P2-T01 (session resolution, needs P1-T05)
          ──→ P2-T02 (auth types + schemas)

P2-T01 ──→ T03 (guest bootstrap)
P2-T01 + T02 + T03 ──→ T04 (auth actions: login, register, logout)
T04 ──→ T05 (auth form)
P2-T03 ──→ T06 (SessionProvider — NOT AuthProvider)
T05 + T06 ──→ T07 (auth layout + pages)
T06 ──→ T08 (wire root layout with SessionProvider)
ALL P2 tasks ──→ T09 (gate G02)
```

### P2 Task Dependencies

| Task | Depends On | Critical Path |
|------|-----------|:---:|
| **P2-T01** | P1-T05, P1-T14 | ✅ |
| P2-T02 | P0-T05 | |
| **P2-T03** | T01 | ✅ |
| **P2-T04** | T01, T02, T03 | ✅ |
| **P2-T05** | T04 | ✅ |
| P2-T06 | T03 | |
| P2-T07 | T05, T06 | |
| P2-T08 | T06 | |
| **P2-T09** | All P2 | ✅ |

### P2 Parallelization

After P1-T14:
1. **Session + auth track:** T01 → T03 → T04 → T05 → T07 (critical)
2. **Provider track:** T03 → T06 → T08
3. **Schemas:** T02 (can start immediately)

---

## Phase P3 — Chat Core Vertical (27 tasks)

```
P2-T09 ──→ P3-T01 → T02 (AI model + prompts chain)
          ──→ T03, T04, T05, T06, T07, T08, T10, T12–T20, T22–T24, T26

T05 (chat types) + T08 (ChatSessionContext) ──→ T09 (chat pure functions)
T08 + T09 + T10 (ChatStreamProvider) ──→ T11 (useChatSession hook)
T08 + T11 + T12 + T17 + T18 + T19 ──→ T21 (ChatShell orchestrator, ~60 lines)
T21 + T10 ──→ T25 (chat pages, `use cache` + `cacheTag`)
T09 + T10 ──→ T20 (StreamBridge, thin ~20 lines)
T04 + P1-T08 ──→ T13 (chat tools: createArtifact, updateArtifact, requestSuggestions)
T02 + T13 ──→ T23 (chat API route, createUIMessageStream)
ALL P3 ──→ T27 (gate G03)
```

### P3 Task Dependencies

| Task | Depends On | Critical Path |
|------|-----------|:---:|
| P3-T01 | P1-T12 | |
| P3-T02 | T01 | |
| P3-T03 | P1-T12 | |
| P3-T04 | P0-T06 | |
| **P3-T05** | P0-T06 | ✅ |
| P3-T06 | P0-T07 | |
| P3-T07 | T06 | |
| **P3-T08** | T05 | ✅ |
| **P3-T09** | T05, T08 | ✅ |
| P3-T10 | T05 | |
| **P3-T11** | T08, T09, T10 | ✅ |
| P3-T12 | T08 | |
| P3-T13 | T04, P1-T08 | |
| P3-T14 | T08 | |
| P3-T15 | T08 | |
| P3-T16 | T15 | |
| P3-T17 | T15, T12 | |
| P3-T18 | T08 | |
| P3-T19 | T08 | |
| P3-T20 | T09, T10 | |
| **P3-T21** | T11, T12, T17, T18, T19 | ✅ |
| P3-T22 | P1-T06, P1-T03 | |
| P3-T23 | T13, T02 | |
| P3-T24 | T14, P0-T11 | |
| **P3-T25** | T21, T10 | ✅ |
| P3-T26 | P0-T08 | |
| **P3-T27** | All P3 | ✅ |

### P3 Parallelization

Massive parallelism available:
1. **AI chain:** T01 → T02 → T09 → T11 → T21 → T25 (critical path backbone)
2. **UI components (all parallel):** T14, T15, T16, T17, T18, T19
3. **Schemas/types/tools (parallel):** T04, T05, T06, T07, T08
4. **Settings:** T06 → T07
5. **ChatStreamProvider:** T10 (independent of AI chain until T11)
6. **Tools:** T13 → T23 (API route)
7. **Orchestrator convergence:** T21 (waits for UI + hooks)
8. **Pages:** T25 (waits for T21)

---

## Phase P4 — Artifacts Vertical (18 tasks)

```
P3-T27 ──→ P4-T01 → T02 (artifact types → artifact store with useSyncExternalStore)
                   → T03 (hook aliases)
                   → T04, T05 (text+code handlers, sheet+image handlers — ArtifactHandler)
T04, T05 ──→ T06 (handler registration: side-effect import into artifact-handlers.ts)
T02 ──→ T07, T08, T09, T10 (editors: text, code, sheet, image)
T07–T10 + T03 ──→ T11 (artifact panel)
T03 ──→ T12 (artifact support components), T13 (error boundary), T14 (artifact preview)
T11 + P3-T20 ──→ T17 (wire artifact panel into ChatShell + StreamBridge → artifactStore)
P1-T08 + P1-T03 ──→ T15 (artifact API route, revalidateTag)
P1-T10 ──→ T16 (suggestions API route)
ALL P4 ──→ T18 (gate G04)
```

### P4 Task Dependencies

| Task | Depends On | Critical Path |
|------|-----------|:---:|
| **P4-T01** | P0-T06 | ✅ |
| **P4-T02** | T01 | ✅ |
| P4-T03 | T02 | |
| P4-T04 | P3-T04, P1-T12 | |
| P4-T05 | P3-T04 | |
| P4-T06 | T04, T05 | |
| **P4-T07** | T02 | ✅ |
| P4-T08 | T02 | |
| P4-T09 | T02 | |
| P4-T10 | T02 | |
| **P4-T11** | T07, T08, T09, T10, T03 | ✅ |
| P4-T12 | T03 | |
| P4-T13 | P0-T08 | |
| P4-T14 | T03 | |
| P4-T15 | P1-T08, P1-T03 | |
| P4-T16 | P1-T10 | |
| **P4-T17** | T11, P3-T20 | ✅ |
| **P4-T18** | All P4 | ✅ |

### P4 Parallelization

Two main tracks run in parallel:
1. **Handler track:** T01 → T04, T05 → T06 (handler registration)
2. **Store + Editor track:** T01 → T02 → T07, T08, T09, T10 → T11 (panel)
3. **API track:** T15, T16 (independent of editors)
4. **Support track:** T03 → T12, T13, T14
5. **Convergence:** T11 + P3-T20 → T17 (wire into ChatShell)

---

## Phase P5 — Sidebar & Navigation (12 tasks)

```
P4-T18 ──→ P5-T01 (sidebar types)
          ──→ P5-T02 (PendingChatsProvider — NOT OptimisticChatsProvider)
          ──→ T03 (useSidebarHistory)
          ──→ T04 (SidebarHistoryItem)
T02 + T03 + T04 ──→ T05 (SidebarHistoryClient)
P2-T04 ──→ T06 (SidebarUserNav)
P0-T11 ──→ T07 (SidebarSkeleton, SERVER)
P1-T06 + T05 + T06 ──→ T08 (SidebarShell, SERVER, `use cache` + cacheTag)
P1-T06 + P1-T03 ──→ T09 (rename chat action)
P1-T06 ──→ T10 (history API route)
T08 + T02 ──→ T11 (wire sidebar into chat layout)
ALL P5 ──→ T12 (gate G05)
```

### P5 Task Dependencies

| Task | Depends On | Critical Path |
|------|-----------|:---:|
| P5-T01 | P0-T07 | |
| **P5-T02** | P0-T07 | ✅ |
| P5-T03 | T01 | |
| P5-T04 | T01 | |
| **P5-T05** | T02, T03, T04 | ✅ |
| P5-T06 | P2-T04 | |
| P5-T07 | P0-T11 | |
| **P5-T08** | P1-T06, T05, T06 | ✅ |
| P5-T09 | P1-T06, P1-T03 | |
| P5-T10 | P1-T06 | |
| **P5-T11** | T08, T02 | ✅ |
| **P5-T12** | All P5 | ✅ |

### P5 Parallelization

After P4-T18:
1. **History track:** T01 → T03, T04 → T05 → T08 (critical)
2. **PendingChats:** T02 (feeds T05 and T11)
3. **User nav:** T06 (independent)
4. **Skeleton:** T07 (independent)
5. **API:** T09, T10 (independent)

---

## Phase P6 — Enhancements (14 tasks)

```
P5-T12 ──→ P6-T01 → T02 → T03 (voting chain + VoteResolver)
          ──→ T04 → T05 (ModelSelector chain)
          ──→ T06 → T07 → T08 (visibility chain)
          ──→ T09 → T10 → T11 (upload chain)
          ──→ T12 (Weather component)
          ──→ T13 (health check)
ALL P6 ──→ T14 (gate G06)
```

### P6 Task Dependencies

| Task | Depends On | Critical Path |
|------|-----------|:---:|
| **P6-T01** | P1-T09 | ✅ |
| **P6-T02** | T01 | ✅ |
| **P6-T03** | T02, P3-T15, P3-T25 | ✅ |
| P6-T04 | P3-T01 | |
| P6-T05 | T04, P3-T19 | |
| P6-T06 | P1-T06, P1-T03 | |
| P6-T07 | T06 | |
| P6-T08 | T07, P3-T25 | |
| P6-T09 | P2-T01 | |
| P6-T10 | P3-T18 | |
| P6-T11 | T09, T10 | |
| P6-T12 | P3-T13 | |
| P6-T13 | P1-T02 | |
| **P6-T14** | All P6 | ✅ |

### P6 Parallelization

5 fully independent feature tracks:
1. **Voting:** T01 → T02 → T03 (3 tasks, critical)
2. **Models:** T04 → T05 (2 tasks)
3. **Visibility:** T06 → T07 → T08 (3 tasks)
4. **Upload:** T09 ∥ T10 → T11 (3 tasks)
5. **Independent:** T12 (weather), T13 (health)

---

## Phase P7 — Polish & Production (13 tasks)

```
P6-T14 ──→ P7-T01 (error boundaries)
          ──→ T02 (artifact error boundary)
          ──→ T03 (accessibility + keyboard nav)
          ──→ T04 (responsive design)
          ──→ T05 (instrumentation)
          ──→ T06 (E2E test specs)
          ──→ T07 (integration tests)
          ──→ T08 (stream test utility)
          ──→ T09 (import boundaries)
          ──→ T10 (verify "artifact" naming)
          ──→ T11 (verify no credit/gateway)
T01..T11 ──→ T12 (full build verification)
ALL P7 ──→ T13 (gate G07 — final)
```

### P7 Task Dependencies

| Task | Depends On | Critical Path |
|------|-----------|:---:|
| P7-T01 | P0-T13, P3-T26, P2-T07 | |
| P7-T02 | P4-T13 | |
| **P7-T03** | P3-T21, P5-T11 | ✅ |
| P7-T04 | P5-T11 | |
| P7-T05 | P0-T15 | |
| P7-T06 | all phases | |
| P7-T07 | all phases | |
| P7-T08 | P0-T16 | |
| P7-T09 | P0-T17 | |
| P7-T10 | all phases | |
| P7-T11 | all phases | |
| **P7-T12** | T01..T11 | ✅ |
| **P7-T13** | All P7 | ✅ |

### P7 Parallelization

After P6-T14, massive parallelism:
- **Error boundaries:** T01, T02 (parallel)
- **A11y + responsive:** T03, T04 (parallel)
- **Infrastructure:** T05, T08, T09 (parallel)
- **Verification:** T10, T11 (parallel)
- **Tests:** T06, T07 (parallel with T01–T11)
- **Convergence:** T12 → T13
