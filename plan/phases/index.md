# Phase Task Plans — Index

> **Updated per redesign audit (2026-03-01)**

> Detailed task plans for the complete rebuild, phases P0–P7.
> Each task follows the mandatory schema with explicit inputs, outputs, dependencies, and success criteria.
> "artifact" naming throughout. No credit/gateway logic. `proxy.ts` (not middleware.ts).
> Server layouts + client islands. ChatShell + ChatSessionContext. `useSyncExternalStore` for artifact state.

---

## Phase Files

| Phase | File | Tasks | Est. Files | Focus |
|-------|------|-------|------------|-------|
| P0 | [p00-scaffold.md](p00-scaffold.md) | 18 | ~55 | Config, types, errors, utils, UI primitives, root layout, proxy |
| P1 | [p01-data-foundation.md](p01-data-foundation.md) | 14 | ~22 | DB, cache, data access, AI providers, test fixtures |
| P2 | [p02-auth.md](p02-auth.md) | 9 | ~14 | Session, auth actions, auth UI, proxy wiring |
| P3 | [p03-chat-core.md](p03-chat-core.md) | 27 | ~42 | AI integration, settings, streaming, ChatShell, messages, input, pages |
| P4 | [p04-artifacts.md](p04-artifacts.md) | 18 | ~28 | Store, handlers, editors, artifact panel, API routes |
| P5 | [p05-sidebar.md](p05-sidebar.md) | 13 | ~12 | Server-rendered sidebar, pending chats, history pagination | <!-- W4-CYCLE1: CONFLICT-002 fix — P5-T13 (Delete All Chats) exists -->
| P6 | [p06-enhancements.md](p06-enhancements.md) | 14 | ~17 | Voting, model selector, visibility, file upload, weather |
| P7 | [p07-polish.md](p07-polish.md) | 13 | ~20 | Error boundaries, a11y, tests, verification, build |

**Total: 126 tasks across 8 phases (~210 estimated files)** <!-- W4-CYCLE1: CONFLICT-002 fix — P5-T13 added -->

---

## Task Type Legend

| Type | Meaning |
|------|---------|
| `SCAFFOLD` | Project infrastructure, config, directory creation |
| `AI_COPY` | Legacy reference marker (reserved — not currently used in redesign execution) |
| `AI_WRAPPER` | Legacy wrapper marker (reserved — not currently used in redesign execution) |
| `IMPL` | New business logic, components, hooks, actions |
| `INTEG` | Wiring multiple modules together across boundaries |
| `VERIFY` | Build/lint/typecheck validation gate |

## AI Layer Handling Legend

| Value | Meaning |
|-------|---------|
| `AI_COPY` | Legacy reference marker only (avoid verbatim copying unless explicitly approved) |
| `AI_WRAPPER` | Wrapper around shared primitives when required by design |
| `COPY_CONTENT` | Port behavior with redesign-conformant structure/naming (not blind copy) |
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
P0-T01 ──────────────┐
P0-T02 ──────────────┤
  (parallel setup)    │
       ├─ P0-T03–T18 │
       └─ P0-T18 ────┘ (verification gate G00)
                       │
P1-T01 ──────────────┐
  (sequential build)  │
       ├─ P1-T01–T13 │
       └─ P1-T14 ────┘ (verification gate G01)
                       │
P2-T01 ──────────────┐
  (auth vertical)     │
       ├─ P2-T01–T08 │
       └─ P2-T09 ────┘ (verification gate G02)
                       │
P3-T01 ──────────────┐
  (chat core)         │
       ├─ P3-T01–T26 │
       └─ P3-T27 ────┘ (verification gate G03)
                       │
P4-T01 ──────────────┐
  (artifacts)         │
       ├─ P4-T01–T17 │
       └─ P4-T18 ────┘ (verification gate G04)
                       │
P5-T01 ──────────────┐
  (sidebar & nav)     │
       ├─ P5-T01–T11, T13 │ <!-- W4-CYCLE1: CONFLICT-002 fix -->
       └─ P5-T12 ────┘ (verification gate G05)
                       │
P6-T01 ──────────────┐
  (enhancements)      │
       ├─ P6-T01–T13 │
       └─ P6-T14 ────┘ (verification gate G06)
                       │
P7-T01 ──────────────┐
  (polish)            │
       ├─ P7-T01–T12 │
       └─ P7-T13 ────┘ (verification gate G07 — FINAL)
```

> Note: The diagram is a simplified gate sequence. Per `strategy/phase-order.md`, P4 and P5 work can overlap after P3 (P5 can begin once P3 layout scaffolding is available).

---

## Seam Coverage (P0–P7)

| Phase | Seams | IDs |
|-------|-------|-----|
| P0 | 0 | — (creates foundation for all seams) |
| P1 | 5 | SEAM-017, SEAM-023, SEAM-024*, SEAM-025*, SEAM-026* (* = partial) |
| P2 | 5 | SEAM-001, SEAM-002, SEAM-003, SEAM-004, SEAM-005 |
| P3 | 8 | SEAM-006, SEAM-007, SEAM-008, SEAM-015, SEAM-028, SEAM-029, SEAM-031, SEAM-038 |
| P4 | 13 | SEAM-009, SEAM-010, SEAM-011, SEAM-012, SEAM-021, SEAM-025, SEAM-032, SEAM-033, SEAM-034, SEAM-035, SEAM-037, SEAM-039, SEAM-040 |
| P5 | 4 | SEAM-013, SEAM-014, SEAM-020, SEAM-030 |
| P6 | 6 | SEAM-016, SEAM-017, SEAM-018, SEAM-019, SEAM-022, SEAM-036 |
| P7 | 1 | SEAM-027 |
| **Total** | **40** | All seams covered (some span multiple phases) |
