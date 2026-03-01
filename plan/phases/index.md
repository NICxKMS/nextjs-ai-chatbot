# Phase Task Plans — Index

> **Updated per redesign audit (2026-03-01)**

> Detailed task plans for the complete rebuild, phases P00–P07.
> Each task follows the mandatory schema with explicit inputs, outputs, dependencies, and success criteria.
> "artifact" naming throughout. No credit/gateway logic. `proxy.ts` (not middleware.ts).
> Server layouts + client islands. ChatShell + ChatSessionContext. `useSyncExternalStore` for artifact state.

---

## Phase Files

| Phase | File | Tasks | Est. Files | Focus |
|-------|------|-------|------------|-------|
| P00 | [p00-scaffold.md](p00-scaffold.md) | 18 | ~55 | Config, types, errors, utils, UI primitives, root layout, proxy |
| P01 | [p01-data-foundation.md](p01-data-foundation.md) | 14 | ~22 | DB, cache, data access, AI providers, test fixtures |
| P02 | [p02-auth.md](p02-auth.md) | 9 | ~14 | Session, auth actions, auth UI, proxy wiring |
| P03 | [p03-chat-core.md](p03-chat-core.md) | 27 | ~42 | AI integration, settings, streaming, ChatShell, messages, input, pages |
| P04 | [p04-artifacts.md](p04-artifacts.md) | 18 | ~28 | Store, handlers, editors, artifact panel, API routes |
| P05 | [p05-sidebar.md](p05-sidebar.md) | 12 | ~12 | Server-rendered sidebar, optimistic chats, history pagination |
| P06 | [p06-enhancements.md](p06-enhancements.md) | 14 | ~17 | Voting, model selector, visibility, file upload, weather |
| P07 | [p07-polish.md](p07-polish.md) | 13 | ~20 | Error boundaries, a11y, tests, verification, build |

**Total: 125 tasks across 8 phases (~210 estimated files)**

---

## Task Type Legend

| Type | Meaning |
|------|---------|
| `SCAFFOLD` | Project infrastructure, config, directory creation |
| `AI_COPY` | Copy existing code verbatim with verification |
| `AI_WRAPPER` | Feature component that wraps shared primitives |
| `IMPLEMENTATION` | New business logic, components, hooks, actions |
| `INTEGRATION` | Wiring multiple modules together across boundaries |
| `VERIFICATION` | Build/lint/typecheck validation gate |

## AI Layer Handling Legend

| Value | Meaning |
|-------|---------|
| `AI_COPY` | Copy from oldapp/ verbatim |
| `AI_WRAPPER` | Wraps shared primitives for feature use |
| `COPY_CONTENT` | Copy from oldapp/ with minimal path adjustments |
| `NEW` | Written from scratch |
| `N/A` | No AI layer involvement |

## Complexity Legend

| Size | Scope |
|------|-------|
| `S` | 1 file, < 50 lines, straightforward |
| `M` | 1–3 files, 50–200 lines, moderate logic |
| `L` | 2–4 files, > 200 lines, complex logic or integration |

---

## Dependency Graph (Tasks)

```
P00-T01 ──────────────┐
P00-T02 ──────────────┤
  (parallel setup)    │
       ├─ P00-T03–T18 │
       └─ P00-T18 ────┘ (verification gate G00)
                       │
P01-T01 ──────────────┐
  (sequential build)  │
       ├─ P01-T01–T13 │
       └─ P01-T14 ────┘ (verification gate G01)
                       │
P02-T01 ──────────────┐
  (auth vertical)     │
       ├─ P02-T01–T08 │
       └─ P02-T09 ────┘ (verification gate G02)
                       │
P03-T01 ──────────────┐
  (chat core)         │
       ├─ P03-T01–T26 │
       └─ P03-T27 ────┘ (verification gate G03)
                       │
P04-T01 ──────────────┐
  (artifacts)         │
       ├─ P04-T01–T17 │
       └─ P04-T18 ────┘ (verification gate G04)
                       │
P05-T01 ──────────────┐
  (sidebar & nav)     │
       ├─ P05-T01–T11 │
       └─ P05-T12 ────┘ (verification gate G05)
                       │
P06-T01 ──────────────┐
  (enhancements)      │
       ├─ P06-T01–T13 │
       └─ P06-T14 ────┘ (verification gate G06)
                       │
P07-T01 ──────────────┐
  (polish)            │
       ├─ P07-T01–T12 │
       └─ P07-T13 ────┘ (verification gate G07 — FINAL)
```

---

## Seam Coverage (P00–P07)

| Phase | Seams | IDs |
|-------|-------|-----|
| P00 | 0 | — (creates foundation for all seams) |
| P01 | 4 | SEAM-023, SEAM-024*, SEAM-025*, SEAM-026* (* = partial) |
| P02 | 5 | SEAM-001, SEAM-002, SEAM-003, SEAM-004, SEAM-005 |
| P03 | 8 | SEAM-006, SEAM-007, SEAM-008, SEAM-015, SEAM-028, SEAM-029, SEAM-031, SEAM-038 |
| P04 | 10 | SEAM-009, SEAM-010, SEAM-011, SEAM-012, SEAM-021, SEAM-025, SEAM-032, SEAM-033, SEAM-034, SEAM-035 |
| P05 | 4 | SEAM-013, SEAM-014, SEAM-020, SEAM-030 |
| P06 | 6 | SEAM-016, SEAM-017, SEAM-018, SEAM-019, SEAM-022, SEAM-036 |
| P07 | 1 | SEAM-027 |
| **Total** | **38** | All seams covered (some span multiple phases) |
