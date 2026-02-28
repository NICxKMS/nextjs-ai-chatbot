# Phase Task Plans — Index

> Detailed task plans for the complete rebuild, phases P00–P07.
> Each task follows the mandatory schema with explicit inputs, outputs, dependencies, and success criteria.

---

## Phase Files

| Phase | File | Tasks | Est. Days | Focus |
|-------|------|-------|-----------|-------|
| P00 | [p00-scaffold.md](p00-scaffold.md) | 17 | ~1 | Config, types, errors, utils, copies, root shell |
| P01 | [p01-data-foundation.md](p01-data-foundation.md) | 16 | ~2 | DB, cache, data access, auth config, API utils |
| P02 | [p02-auth.md](p02-auth.md) | 12 | ~1.5 | Session, actions, form, provider, routes, pages |
| P03 | [p03-chat-core.md](p03-chat-core.md) | 24 | ~4 | AI providers, settings, tools, streaming, UI, routes |
| P04 | [p04-artifacts.md](p04-artifacts.md) | 22 | ~4 | Handlers, editors, panel, versioning, tool wiring |
| P05 | [p05-sidebar.md](p05-sidebar.md) | 12 | ~2 | History, optimistic chats, navigation, user nav |
| P06 | [p06-enhancements.md](p06-enhancements.md) | 18 | ~3 | Voting, models, settings panel, upload, visibility |
| P07 | [p07-polish.md](p07-polish.md) | 14 | ~2 | Error boundaries, a11y, responsive, E2E, build |

**Total: 135 tasks across 8 phases (~19.5 estimated days)**

---

## Task Type Legend

| Type | Meaning |
|------|---------|
| `SCAFFOLD` | Project infrastructure, config, directory creation |
| `AI_COPY` | Copy ai-elements verbatim with checksum verification |
| `AI_WRAPPER` | Feature component that wraps ai-elements primitives |
| `IMPLEMENTATION` | New business logic, components, hooks, actions |
| `INTEGRATION` | Wiring multiple modules together across boundaries |
| `VERIFICATION` | Build/lint/typecheck validation gate |

## AI Layer Handling Legend

| Value | Meaning |
|-------|---------|
| `AI_COPY` | Copy from oldapp/components/elements/ verbatim |
| `AI_WRAPPER` | Wraps ai-elements primitives for feature use |
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
       ├─ P00-T03–T17 │
       └─ P00-T17 ────┘ (verification gate G00)
                       │
P01-T01 ──────────────┐
  (sequential build)  │
       ├─ P01-T01–T15 │
       └─ P01-T16 ────┘ (verification gate G01)
                       │
P02-T01 ──────────────┐
  (auth vertical)     │
       ├─ P02-T01–T11 │
       └─ P02-T12 ────┘ (verification gate G02)
                       │
P03-T01 ──────────────┐
  (chat core)         │
       ├─ P03-T01–T23 │
       └─ P03-T24 ────┘ (verification gate G03)
                       │
P04-T01 ──────────────┐
  (artifacts)         │
       ├─ P04-T01–T21 │
       └─ P04-T22 ────┘ (verification gate G04)
                       │
P05-T01 ──────────────┐
  (sidebar & nav)     │
       ├─ P05-T01–T11 │
       └─ P05-T12 ────┘ (verification gate G05)
                       │
P06-T01 ──────────────┐
  (enhancements)      │
       ├─ P06-T01–T17 │
       └─ P06-T18 ────┘ (verification gate G06)
                       │
P07-T01 ──────────────┐
  (polish)            │
       ├─ P07-T01–T13 │
       └─ P07-T14 ────┘ (verification gate G07 — FINAL)
```

---

## Seam Coverage (P00–P07)

| Phase | Seams | IDs |
|-------|-------|-----|
| P00 | 0 | — (creates foundation for all seams) |
| P01 | 4 | SEAM-023, SEAM-024*, SEAM-025*, SEAM-026* (* = partial) |
| P02 | 5 | SEAM-001, SEAM-002, SEAM-003, SEAM-004, SEAM-005 |
| P03 | 8 | SEAM-006, SEAM-007, SEAM-008, SEAM-015, SEAM-028, SEAM-029, SEAM-031, SEAM-038 |
| P04 | 13 | SEAM-009, SEAM-010, SEAM-011, SEAM-012, SEAM-021, SEAM-025, SEAM-032, SEAM-033, SEAM-034, SEAM-035, SEAM-037, SEAM-039, SEAM-040 |
| P05 | 4 | SEAM-013, SEAM-014, SEAM-020, SEAM-030 |
| P06 | 6 | SEAM-016, SEAM-017, SEAM-018, SEAM-019, SEAM-022, SEAM-036 |
| P07 | 1 | SEAM-027 |
| **Total** | **41** | All 40 seams covered (some span multiple phases) |
