# Task Dependency Graph

> Full dependency graph for all 135 tasks across 8 phases.
> Dependencies shown as `→` (depends on). **Bold** = critical path tasks.

---

## Phase P00 — Scaffold (17 tasks)

```
P00-T01 ─────────────────────────── (no deps — project root)
  ├──→ P00-T02 → P00-T03 → P00-T04 ──┐
  ├──→ P00-T06                         │
  ├──→ P00-T07 → P00-T08              │
  ├──→ P00-T09                         │
  ├──→ P00-T10 → P00-T11 → P00-T12   │
  │              └──→ P00-T13          │
  ├──→ P00-T14                         │
  ├──→ P00-T15                         │
  └──→ P00-T16                         │
          P00-T04 + P00-T10 + P00-T11 ──→ P00-T05
          ALL P00 tasks ──────────────→ P00-T17 (gate G00)
```

### P00 Task Dependencies

| Task | Depends On | Critical Path |
|------|-----------|:---:|
| **P00-T01** | — | ✅ |
| **P00-T02** | T01 | ✅ |
| **P00-T03** | T01, T02 | ✅ |
| **P00-T04** | T01, T03 | ✅ |
| **P00-T05** | T01, T04, T10, T11 | ✅ |
| P00-T06 | T01 | |
| P00-T07 | T01 | |
| P00-T08 | T07 | |
| P00-T09 | T01 | |
| P00-T10 | T01 | |
| P00-T11 | T01, T10 | |
| P00-T12 | T01, T10, T11 | |
| P00-T13 | T01, T10, T11 | |
| P00-T14 | T01 | |
| P00-T15 | T01 | |
| P00-T16 | T01 | |
| **P00-T17** | All P00 | ✅ |

### P00 Parallelization

After T01 completes, 3 independent tracks can run in parallel:
1. **Config track:** T02 → T03 → T04 → T05
2. **Schema track:** T07 → T08
3. **Utils track:** T10 → T11 → T12, T13
4. **Independent:** T06, T09, T14, T15, T16

---

## Phase P01 — Data Foundation (16 tasks)

```
P00-T17 ──→ P01-T01 ──→ P01-T02
          ──→ P01-T03 → P01-T04
          ──→ P01-T05
          ──→ P01-T11
          ──→ P01-T12
          ──→ P01-T14

P01-T01 + T04 + T05 ──→ P01-T06, T07, T08, T09, T10
P01-T01 + T03 + T11 ──→ P01-T15
P01-T03 + P00-T14   ──→ P01-T13
ALL P01 tasks ──────→ P01-T16 (gate G01)
```

### P01 Task Dependencies

| Task | Depends On | Critical Path |
|------|-----------|:---:|
| P01-T01 | P00-T07, P00-T17 | |
| P01-T02 | T01 | |
| **P01-T03** | P00-T17 | ✅ |
| **P01-T04** | T03 | ✅ |
| P01-T05 | P00-T08, P00-T09, P00-T17 | |
| P01-T06 | T01, T05 | |
| **P01-T07** | T01, T04, T05 | ✅ |
| P01-T08 | T01, T04, T05 | |
| P01-T09 | T01, T04, T05 | |
| P01-T10 | T01, T05 | |
| P01-T11 | P00-T17 | |
| P01-T12 | P00-T08, P00-T09, P00-T17 | |
| P01-T13 | T03, P00-T14 | |
| P01-T14 | P00-T17 | |
| P01-T15 | T01, T03, T11 | |
| **P01-T16** | All P01 | ✅ |

### P01 Parallelization

After P00-T17, 4 independent tracks start:
1. **DB track:** T01 → T02, and T01 feeds into T06-T10
2. **Cache track:** T03 → T04 (then feeds T07-T09)
3. **Auth config:** T11 (independent)
4. **API utils:** T12 (independent)
5. **Rate limit:** T13 (needs T03 + P00-T14)
6. **Data functions (T06-T10):** converge after T01 + T04 + T05

---

## Phase P02 — Auth (12 tasks)

```
P01-T16 ──→ P02-T01 (session resolution, needs P01-T11)
          ──→ P02-T02 (schemas, needs P00-T17)

P02-T01 ──→ T03 (exchange, also needs P01-T07)
P02-T01 + T02 + T03 + P01-T06 ──→ T04 (login/register)
P02-T01 ──→ T05 (logout)
P02-T02 + T04 ──→ T06 (auth form)
P02-T01 + P01-T11 ──→ T07 (auth provider)
P02-T01 + P01-T11 + P01-T12 ──→ T08 (API routes)
P02-T06 ──→ T09 (auth pages)
P02-T01 + T08 + P01-T13 ──→ T10 (middleware)
P02-T07 + T01 ──→ T11 (wire layout)
ALL P02 tasks ──→ T12 (gate G02)
```

### P02 Task Dependencies

| Task | Depends On | Critical Path |
|------|-----------|:---:|
| **P02-T01** | P01-T11, P01-T16 | ✅ |
| P02-T02 | P00-T17 | |
| **P02-T03** | T01, P01-T07 | ✅ |
| **P02-T04** | T01, T02, T03, P01-T06 | ✅ |
| P02-T05 | T01 | |
| **P02-T06** | T02, T04 | ✅ |
| P02-T07 | T01, P01-T11 | |
| P02-T08 | T01, P01-T11, P01-T12 | |
| **P02-T09** | T06 | ✅ |
| P02-T10 | T01, T08, P01-T13 | |
| P02-T11 | T07, T01 | |
| **P02-T12** | All P02 | ✅ |

### P02 Parallelization

After P01-T16:
1. **Session + exchange track:** T01 → T03 → T04 → T06 → T09 (critical)
2. **Provider track:** T01 → T07 → T11
3. **API routes track:** T01 → T08 → T10
4. **Schemas:** T02 (can start immediately)

---

## Phase P03 — Chat Core (24 tasks)

```
P02-T12 ──→ P03-T01 → T02 → T07 (AI provider chain)
          ──→ T04, T05, T06, T08, T11, T12, T13, T14, T17, T18, T23

T07 (needs T02, T06, T08) ──→ T09 (stream action, also needs T05, P02-T01)
T10 (needs P01-T08, P02-T01, T05)
T15 (needs T10, T14)
T16 (needs T11, T13, T14, T15)
T19 (orchestrator: needs T04, T11, T12, T16, T17, T18)
T20 (route: needs T07, T05, P02-T01, P01-T12, P01-T13)
T21 (layouts: needs P02-T01, T12)
T22 (pages: needs T19, T21, P01-T07, P01-T08)
ALL P03 ──→ T24 (gate G03)
```

### P03 Task Dependencies

| Task | Depends On | Critical Path |
|------|-----------|:---:|
| **P03-T01** | P01-T16 | ✅ |
| **P03-T02** | T01 | ✅ |
| P03-T03 | T01 | |
| P03-T04 | P00-T08, P01-T16 | |
| P03-T05 | P00-T08, P01-T16 | |
| P03-T06 | P01-T16 | |
| **P03-T07** | T02, T06, T08 | ✅ |
| P03-T08 | P01-T16 | |
| **P03-T09** | T07, T05, P02-T01, P01-T07, P01-T08 | ✅ |
| P03-T10 | P01-T08, P02-T01, T05 | |
| P03-T11 | P01-T16 | |
| P03-T12 | P00-T08, P01-T16 | |
| P03-T13 | P00-T11, P01-T16 | |
| P03-T14 | P00-T12, P01-T16 | |
| P03-T15 | T10, T14 | |
| P03-T16 | T11, T13, T14, T15 | |
| P03-T17 | P00-T11, P00-T12, P01-T16 | |
| P03-T18 | P00-T11, P00-T13, P01-T16 | |
| **P03-T19** | T04, T11, T12, T16, T17, T18 | ✅ |
| P03-T20 | T07, T05, P02-T01, P01-T12, P01-T13 | |
| P03-T21 | P02-T01, T12 | |
| **P03-T22** | T19, T21, P01-T07, P01-T08 | ✅ |
| P03-T23 | P00-T11, P01-T16 | |
| **P03-T24** | All P03 | ✅ |

### P03 Parallelization

Massive parallelism available:
1. **AI chain:** T01 → T02 → T07 → T09 (critical path backbone)
2. **UI components (all parallel):** T11, T12, T13, T14, T17, T18, T23
3. **Schemas/prompts/tools (parallel):** T04, T05, T06, T08
4. **Message actions:** T10 → T15 → T16
5. **Orchestrator convergence:** T19 (waits for UI + settings)
6. **Layout + page:** T21 → T22 (waits for T19)

---

## Phase P04 — Artifacts (22 tasks)

```
P03-T24 ──→ P04-T01 → T02, T03 (types feed schemas + hooks)
                     → T04 (handler factory, also needs P01-T09)
T04 → T05, T06, T07, T08 (per-kind handlers, T05-T07 need P03-T02)
T04 + all handlers + T02 ──→ T09 (wire createDocument)
T04 + T02 + P01-T09 ──→ T10, T11 (wire updateDocument, suggestions)
T01 + T03 ──→ T12, T13, T15 (editors)
T14 (console, needs P00-T11)
T01 ──→ T16 (image editor)
T01 + T03 + P00-T11 ──→ T18 (supporting components)
T12-T16 + T18 ──→ T17 (artifact panel)
T01 + T03 + editors ──→ T19 (document preview + diff)
T02 + P02-T01 + P01-T09 ──→ T20 (API routes)
T17 + T19 + T03 + P03-T12/T19 ──→ T21 (wire into chat)
ALL P04 ──→ T22 (gate G04)
```

### P04 Task Dependencies

| Task | Depends On | Critical Path |
|------|-----------|:---:|
| **P04-T01** | P00-T08 | ✅ |
| P04-T02 | T01 | |
| P04-T03 | T01 | |
| **P04-T04** | T01, P01-T09 | ✅ |
| **P04-T05** | T04, P03-T02 | ✅ |
| P04-T06 | T04, P03-T02 | |
| P04-T07 | T04, P03-T02 | |
| P04-T08 | T04 | |
| **P04-T09** | T04, T05, T06, T07, T08, T02 | ✅ |
| P04-T10 | T04, T02, P01-T09 | |
| P04-T11 | T02, P03-T02, P01-T09 | |
| P04-T12 | T01, T03 | |
| P04-T13 | T01, T03 | |
| P04-T14 | P00-T11 | |
| P04-T15 | T01, T03 | |
| P04-T16 | T01 | |
| **P04-T17** | T01, T03, T12, T13, T14, T15, T16, T18 | ✅ |
| P04-T18 | T01, T03, P00-T11 | |
| P04-T19 | T01, T03, T12, T13, T15, T16 | |
| P04-T20 | T02, P02-T01, P01-T09, P01-T12 | |
| **P04-T21** | T03, T17, T19, P03-T12, P03-T19 | ✅ |
| **P04-T22** | All P04 | ✅ |

### P04 Parallelization

Two main tracks run in parallel:
1. **Handler track:** T01 → T04 → T05-T08 → T09 (tool wiring)
2. **Editor track:** T01 → T03 → T12, T13, T15 (editors) → T17 (panel)
3. **API track:** T02 + T20 (independent of editors)
4. **Convergence:** T17 + T19 → T21

---

## Phase P05 — Sidebar (12 tasks)

```
P04-T22 ──→ P05-T01 (optimistic chats, needs P00-T08)
          ──→ T02 (skeleton, needs P00-T11)
          ──→ T03 (user nav, needs P00-T11, P02-T07)
          ──→ T04 (history item, needs P00-T11)
T01 + T04 ──→ T05 (history list)
T03 + T05 ──→ T06 (app sidebar)
P01-T07 + P02-T01 + P01-T12/T13 ──→ T07 (history route)
T01 + P03-T19 ──→ T08 (wire optimistic)
T05 + T08 ──→ T09 (wire title sync)
T01 + T02 + T06 + P03-T21 ──→ T10 (wire sidebar)
P00-T13 ──→ T11 (sidebar toggle)
ALL P05 ──→ T12 (gate G05)
```

### P05 Task Dependencies

| Task | Depends On | Critical Path |
|------|-----------|:---:|
| **P05-T01** | P00-T08 | ✅ |
| P05-T02 | P00-T11 | |
| P05-T03 | P00-T11, P02-T07 | |
| P05-T04 | P00-T11 | |
| **P05-T05** | T01, T04, P00-T11 | ✅ |
| **P05-T06** | T03, T05, P00-T11 | ✅ |
| P05-T07 | P01-T07, P02-T01, P01-T12, P01-T13 | |
| P05-T08 | T01, P03-T19 | |
| P05-T09 | T05, T08 | |
| **P05-T10** | T01, T02, T06, P03-T21 | ✅ |
| P05-T11 | P00-T13 | |
| **P05-T12** | All P05 | ✅ |

---

## Phase P06 — Enhancements (18 tasks)

```
P05-T12 ──→ P06-T01 → T02 → T03 (voting chain)
          ──→ T04 → T05 → T06 (model chain)
          ──→ T07 → T08 (settings chain)
          ──→ T09 → T11 (upload chain, T10 parallel)
          ──→ T13 → T12 → T14 (visibility chain)
          ──→ T10, T15, T16, T17 (independent)
ALL P06 ──→ T18 (gate G06)
```

### P06 Task Dependencies

| Task | Depends On | Critical Path |
|------|-----------|:---:|
| **P06-T01** | P01-T07, P01-T08, P01-T10, P02-T01 | ✅ |
| **P06-T02** | T01, P02-T01, P01-T13 | ✅ |
| **P06-T03** | T01, T02, P03-T15 | ✅ |
| P06-T04 | P03-T03, P00-T08 | |
| P06-T05 | T04, P00-T08, P00-T11 | |
| P06-T06 | T05, P03-T04, P03-T17 | |
| P06-T07 | P03-T04, P00-T11 | |
| P06-T08 | T07, P03-T18 | |
| P06-T09 | P02-T01, P01-T13 | |
| P06-T10 | P00-T11 | |
| P06-T11 | T09, T10, P03-T17 | |
| P06-T12 | T13, P00-T11 | |
| P06-T13 | P01-T07, P02-T01 | |
| P06-T14 | T12, P03-T18 | |
| P06-T15 | P00-T11 | |
| P06-T16 | P04-T01, P04-T17, P00-T11 | |
| P06-T17 | P01-T01, P01-T03 | |
| **P06-T18** | All P06 | ✅ |

### P06 Parallelization

5 fully independent feature tracks:
1. **Voting:** T01 → T02 → T03 (3 tasks, critical)
2. **Models:** T04 → T05 → T06 (3 tasks)
3. **Settings:** T07 → T08 (2 tasks)
4. **Upload:** T09 ∥ T10 → T11 (3 tasks)
5. **Visibility:** T13 → T12 → T14 (3 tasks)
6. **Independent:** T15 (toast), T16 (toolbar), T17 (health)

---

## Phase P07 — Polish (14 tasks)

```
P06-T18 ──→ P07-T05, T06, T07, T11 (need all features)
P00-T05 ──→ T01 (global error)
P03-T23 + P05-T10 ──→ T02 (chat error)
P04-T18 ──→ T03 (artifact error)
P03-T23 + P05-T02 ──→ T04 (loading states)
P00-T10 ──→ T08 (reduced motion)
P00-T15 ──→ T09 (instrumentation)
(none) ──→ T10 (import check script)
T01..T10 ──→ T12 (build verification)
T11 + T12 ──→ T13 (integration test)
ALL P07 ──→ T14 (gate G07 — final)
```

### P07 Task Dependencies

| Task | Depends On | Critical Path |
|------|-----------|:---:|
| P07-T01 | P00-T05 | |
| P07-T02 | P03-T23, P05-T10 | |
| P07-T03 | P04-T18 | |
| P07-T04 | P03-T23, P05-T02 | |
| **P07-T05** | P06-T18 | ✅ |
| P07-T06 | P06-T18 | |
| P07-T07 | P06-T18 | |
| P07-T08 | P00-T10 | |
| P07-T09 | P00-T15 | |
| P07-T10 | — | |
| P07-T11 | P06-T18 | |
| **P07-T12** | T01..T10 | ✅ |
| **P07-T13** | T11, T12 | ✅ |
| **P07-T14** | All P07 | ✅ |

### P07 Parallelization

After P06-T18, massive parallelism:
- **Error boundaries:** T01, T02, T03 (parallel)
- **A11y + responsive:** T05, T06, T07 (parallel)
- **Infrastructure:** T08, T09, T10 (parallel)
- **E2E specs:** T11 (parallel with T01-T10)
- **Convergence:** T12 → T13 → T14
