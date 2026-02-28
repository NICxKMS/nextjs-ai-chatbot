# Phase Order & Dependencies

> Execution order, dependency graph, critical path, and parallelization opportunities.

---

## 1. Dependency Graph

```
P00 Scaffold ─────────────────────────────────────────────────────┐
  │                                                                │
  ▼                                                                │
P01 Data Foundation ──────────────────────────────────────────┐    │
  │                                                            │    │
  ▼                                                            │    │
P02 Auth ─────────────────────────────────────────────────┐    │    │
  │                                                        │    │    │
  ▼                                                        │    │    │
P03 Chat Core ────────────────────────────────────────┐    │    │    │
  │                    │                               │    │    │    │
  ▼                    ▼                               │    │    │    │
P04 Artifacts      P05 Sidebar  ◄──── CAN PARALLEL    │    │    │    │
  │                    │                               │    │    │    │
  └────────┬───────────┘                               │    │    │    │
           ▼                                           │    │    │    │
         P06 Enhancements ────────────────────────┐    │    │    │    │
           │                                       │    │    │    │    │
           ▼                                       │    │    │    │    │
         P07 Polish                                │    │    │    │    │
                                                   │    │    │    │    │
                                            All must pass format/typecheck/lint
```

---

## 2. Phase Dependencies (Strict)

| Phase | Depends On | Reason |
|-------|-----------|--------|
| P00 Scaffold | — | First phase, no dependencies |
| P01 Data Foundation | P00 | Needs schema types, error types, config |
| P02 Auth | P01 | Needs DB client, cache client, API guards |
| P03 Chat Core | P02 | Needs auth session, data context, rate limiting |
| P04 Artifacts | P03 | Needs chat tools, DataStreamHandler, data stream pipeline |
| P05 Sidebar | P03 | Needs chat data, optimistic chat context, title sync |
| P06 Enhancements | P04 + P05 | Needs all core features working for cross-feature wiring |
| P07 Polish | P06 | Needs all features complete for error boundaries and E2E tests |

---

## 3. Critical Path

The **critical path** determines the minimum total time:

```
P00 (Scaffold)    →  ~1 day
P01 (Data)        →  ~2 days
P02 (Auth)        →  ~1.5 days
P03 (Chat Core)   →  ~4 days
P04 (Artifacts)   →  ~3 days   ──┐
                                   ├──  P04 + P05 in parallel = ~3 days
P05 (Sidebar)     →  ~2 days   ──┘
P06 (Enhancements)→  ~2.5 days
P07 (Polish)      →  ~2 days
                     ─────────
     Critical Path:  ~16 days (sequential estimate)
     With parallel:  ~15 days (P04 ∥ P05 saves ~2 days)
```

**The critical path runs through: P00 → P01 → P02 → P03 → P04 → P06 → P07**

P05 (Sidebar) is off the critical path when parallelized with P04.

---

## 4. Parallelization Opportunities

### P04 ∥ P05 (After P03)

After Chat Core is complete, Artifacts and Sidebar can be built independently:

| P04 (Artifacts) | P05 (Sidebar) |
|-----------------|---------------|
| Artifact handlers + editors | Sidebar history + optimistic updates |
| Chat tool implementations | SWR infinite scroll |
| Document data layer | Date grouping + Virtuoso |
| Artifact panel + versions | User nav + theme toggle |
| DataStreamHandler extensions | History route handler |

**No shared files** between P04 and P05 except:
- `features/chat/components/chat.tsx` — P04 adds tool wiring, P05 adds optimistic chat calls
- **Resolution**: P04 works on chat tool definitions (separate files), P05 works on optimistic chat context (separate file). Both modify `chat.tsx` but in different sections (tool config vs handleSubmit). Merge at P05 completion.

### P06 Sub-Task Parallelism

The 6 enhancement sub-tasks have minimal interdependencies:

```
06a Voting       ──── independent
06b Models       ──── independent
06c Settings     ──── independent (hook already stubbed)
06d Upload       ──── independent
06e Visibility   ──── independent
06f Health       ──── independent
```

**All 6 can run in parallel.** Each touches different feature directories and API routes. The only shared modification is `multimodal-input.tsx` which gets file upload (06d) and model selector (06b) — these touch different sections of the component.

With 2 workers: ~1.5 days instead of ~2.5 days.

---

## 5. Phase Execution Table

| Phase | Est. Days | Blocking? | Parallel With | Files (~) | Seams |
|-------|-----------|-----------|---------------|-----------|-------|
| P00 Scaffold | 1 | Yes | — | 80+ | 0 |
| P01 Data Foundation | 2 | Yes | — | 25 | 4 (partial) |
| P02 Auth | 1.5 | Yes | — | 14 | 5 |
| P03 Chat Core | 4 | Yes | — | 35 | 8 |
| P04 Artifacts | 3 | No | P05 | 28 | 12 |
| P05 Sidebar | 2 | No | P04 | 8 | 4 |
| P06 Enhancements | 2.5 | Yes (for P07) | Internal sub-tasks | 18 | 6 |
| P07 Polish | 2 | — | — | 10 | 3 |
| **Total** | **~16** | | | **~218** | **40** |

---

## 6. Seam Coverage by Phase

| Phase | Seams Addressed | IDs |
|-------|----------------|-----|
| P00 | 0 | — |
| P01 | 4 | SEAM-023, 024*, 025*, 026* (* = partial, stubs) |
| P02 | 5 | SEAM-001, 002, 003, 004, 005 |
| P03 | 8 | SEAM-006, 007, 008, 015, 028, 029, 031, 038 |
| P04 | 12 | SEAM-009, 010, 011, 012, 021, 032, 033, 034, 035, 037, 039, 040 |
| P05 | 4 | SEAM-013, 014, 020, 030 |
| P06 | 6 | SEAM-016, 017, 018, 019, 022, 036 |
| P07 | 3 | SEAM-027, 030*, 037* (* = finalized from earlier stub) |
| **Total** | **40** | **SEAM-001 through SEAM-040** |

All 40 seams are covered. No orphan seams.

---

## 7. Checkpoint Gates

Each phase must pass its gate before the next begins:

| Gate | Required Checks | Blocks |
|------|-----------------|--------|
| G00 | `pnpm install` + `typecheck` + `lint` + `dev` starts | P01 |
| G01 | Data functions unit-tested, DB connects, cache connects | P02 |
| G02 | Login/register/guest works E2E, session resolves | P03 |
| G03 | Send message → stream → display → persist works | P04, P05 |
| G04 | AI creates document, user edits, versions work | P06 (with P05) |
| G05 | Sidebar loads, navigates, optimistic updates work | P06 (with P04) |
| G06 | All secondary features work, no regressions | P07 |
| G07 | `pnpm build` succeeds, E2E suite passes | Release |

---

## 8. Rollback Strategy

If a phase fails its gate:

| Scenario | Action |
|----------|--------|
| Phase fails typecheck | Fix in-phase (don't proceed) |
| Phase introduces regressions | Revert phase, investigate root cause |
| Phase is blocked by missing info | Stub the dependency, document the gap, proceed with stub |
| Parallel phases conflict on merge | Rebase the later-completing branch, resolve conflicts |

Each phase corresponds to a git branch:
- `scaffold/phase-00`
- `data/phase-01`
- `auth/phase-02`
- `chat/phase-03`
- `artifacts/phase-04`
- `sidebar/phase-05`
- `enhancements/phase-06`
- `polish/phase-07`

Merge into `main` only after gate passes.

---

## 9. Recommended Execution Pattern

### Solo Developer

Execute strictly sequentially: P00 → P01 → P02 → P03 → P04 → P05 → P06 → P07.
No parallelism. Each phase is a single focused sprint.

### Two Developers

```
Dev A: P00 → P01 → P02 → P03 → P04 ──────→ P06(abc) → P07
Dev B:                         (wait) → P05 → P06(def) → P07
```

Dev B joins at P05 (after P03 completes). P06 sub-tasks split between developers.

### Three+ Developers

```
Dev A: P00 → P01 → P02 → P03 → P04 → P07
Dev B:                    (wait) → P05 → P06(abc)
Dev C:                         (wait) → P06(def) → P07
```

P04, P05, and P06 sub-tasks distribute across developers after the critical path (P00-P03) completes.

---

## 10. Time Estimates by Complexity

| Phase | Complexity | Primary Risk | Time Estimate |
|-------|-----------|-------------|---------------|
| P00 | Low | ai-elements import paths | 1 day |
| P01 | Medium | Guest/auth data branching pattern | 2 days |
| P02 | Medium | JWT validation + cookie security | 1.5 days |
| P03 | **High** | SSE streaming + DataStreamHandler pipeline | 4 days |
| P04 | **High** | 4 editor types + handler factory + versioning | 3 days |
| P05 | Medium | Optimistic updates + infinite scroll | 2 days |
| P06 | Medium | Cross-feature integration | 2.5 days |
| P07 | Low-Medium | Error boundary edge cases | 2 days |

**P03 is the riskiest phase.** It wires the most complex integration (useChat → SSE → DataStreamHandler → SWR) and has the most seams (8). Allocate extra time and test thoroughly.
