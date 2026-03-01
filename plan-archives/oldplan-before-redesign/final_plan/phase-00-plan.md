# Phase 00 — Project Scaffold & Foundation

> Bootstrap the project from zero: tooling, directory structure, shared types, utilities, UI primitives, AI elements copy.

---

## Objective

Create a fully configured Next.js 16 project with all shared infrastructure: TypeScript strict, Biome, Tailwind v4, Drizzle schema, shadcn/ui components, AI elements copy, error handling, and test setup. After this phase, all subsequent phases can build on a working, type-safe foundation.

**Entry state:** Empty project directory
**Exit state:** Compilable scaffold with all shared dependencies, types, UI components, and AI elements in place
**Est. duration:** ~1 day
**Tasks:** 17

---

## Task Table

| ID | Title | Type | Complexity | Dependencies |
|----|-------|------|------------|-------------|
| P00-T01 | Initialize project (Next.js 16 + pnpm) | IMPLEMENTATION | M | — |
| P00-T02 | Configure tooling (Biome, TypeScript strict) | IMPLEMENTATION | M | T01 |
| P00-T03 | Configure Tailwind v4 + PostCSS | IMPLEMENTATION | S | T01 |
| P00-T04 | Create root app shell (layout, head, globals.css) | IMPLEMENTATION | M | T02, T03 |
| P00-T05 | Create provider composition component | IMPLEMENTATION | M | T04 |
| P00-T06 | Create directory skeleton (all feature dirs) | IMPLEMENTATION | S | T01 |
| P00-T07 | Define Drizzle ORM schema | IMPLEMENTATION | L | T01 |
| P00-T08 | Define shared types (all .types.ts files) | IMPLEMENTATION | L | T07 |
| P00-T09 | Create error handling module (AppError) | IMPLEMENTATION | M | T08 |
| P00-T10 | Create utility functions (cn, generateUUID, etc.) | IMPLEMENTATION | S | T01 |
| P00-T11 | Copy shadcn/ui components | IMPLEMENTATION | M | T03 |
| P00-T12 | Copy AI element primitives (31 files) | IMPLEMENTATION | L | T10, T11 |
| P00-T13 | Create shared components (icons, markdown, etc.) | IMPLEMENTATION | M | T11 |
| P00-T14 | Create middleware base (matcher, headers) | IMPLEMENTATION | M | T01 |
| P00-T15 | Create instrumentation stubs | IMPLEMENTATION | S | T01 |
| P00-T16 | Create test setup (Vitest config) | IMPLEMENTATION | S | T01 |
| P00-T17 | Verification gate G00 | VERIFICATION | S | ALL |

---

## Entry/Exit States

| State | Condition |
|-------|-----------|
| Entry | Empty directory, no `package.json` |
| Exit | `pnpm typecheck` passes; `pnpm lint` passes; all 31 AI elements copied with checksums; directory structure matches scaffold spec |

---

## Integration Verification

- `pnpm format && pnpm typecheck && pnpm lint` all pass
- All 31 AI element files have matching SHA-256 checksums
- Root layout renders with provider tree (ThemeProvider > children)
- Drizzle schema generates valid SQL
- All shared types export correctly

---

## Seams Addressed

No integration seams directly — this phase creates the foundation for all subsequent seams.
