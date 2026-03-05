# Project Info

> Quick reference for subagents — extracted from Implementation_Agent_Guide.md.

---

## Old App

`oldapp/` is the previous implementation. It serves as **behavioral reference only** — it shows what the app does, not how to build it.

---

## Plan Documents `plan/`

### Required Reading

1. Task spec
2. Implementation guide
3. Next.js 16 docs — `.next-docs/`
4. Naming conventions — `plan/architecture/conventions.md`
5. Relevant patterns — `plan/architecture/patterns.md`
6. Previous task logs

### Conditional Reading

| If your task involves... | Also read... |
|--------------------------|---------------|
| Phase context | Phase plan documents |
| Next.js features | `.next-docs/` |
| Data access or Drizzle | Data foundation docs |
| Streaming or AI SDK | AI migration guide |
| Component wiring | Component wiring docs |
| Integration seams | Seam inventory |
| Shared types | Shared types docs |
| Old app behavior | `oldapp/` |

---

## Redesign

The redesign directory (`plan-archives/redesign/`) contains 13 authoritative docs with upgraded design.

> **Conflict Resolution:** In case of any conflict between plan documents and the redesign directory, **the redesign directory takes precedence**. The redesign docs are the authoritative source of architectural truth.

---

## Key Paths

| What | Where |
|------|-------|
| Architecture patterns | `plan/architecture/patterns.md` |
| Naming conventions | `plan/architecture/conventions.md` |
| Component wiring | Integration map docs |
| Shared types | Scaffold docs |
| Old app (reference) | `oldapp/` |
| Redesign docs | `plan-archives/redesign/` |
| Task log format | Task log guide |
