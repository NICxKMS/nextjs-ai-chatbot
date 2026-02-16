# ai-assistant (v6.0)

Next.js AI chatbot with multi-model support, artifact management, real-time streaming, and feature-based architecture.

**Tech stack**: Next.js 16, React 19, TypeScript, Drizzle ORM, Supabase (auth + DB), Tailwind CSS, AI SDK, Biome (lint + format).

---

## ⚠️ Mandatory Pre-Implementation Protocol (EVERY TASK)

> **CRITICAL**: Before writing any code, agents MUST complete these steps in order. Failure to complete = rejected work.

| Step | Action | Purpose |
|------|--------|---------|
| 1 | **Check New App First** | Search the NEW codebase for the functionality. It may already exist under a different name, file path, or architectural pattern. If an equivalent or improved implementation exists, document it and mark the issue as "Already Implemented" — do NOT overwrite working code with old patterns. |
| 2 | **Read Reference Code** | Read the OLD implementation files listed in the task's Guidance field (`archive/oldapp/` paths) to understand the original logic, props, state, and edge cases. Also search the OLD codebase for related files, imports, and callers to get full context. |
| 3 | **Compare Architectures** | Determine whether the OLD implementation should be ported as-is, adapted to v6 patterns, or skipped because the new approach is already better. Document the decision with rationale. |
| 4 | **Search Related Code** | Search BOTH the NEW and OLD codebases for related files, imports, consumers, and dependencies to understand the full integration surface and how the code was originally used vs how it's currently wired. |
| 5 | **Understand Architecture** | Read the relevant v6 architecture section from `.ouroboros/specs/refactor-migration/architecture-v6-final.md` to ensure the fix follows v6 patterns (Repository/Service, feature modules, slim routes, layer imports). |
| 6 | **Document Findings** | Note key decisions, architecture differences, and any deviations before implementing. |

### Code Reuse & Consistency Mandate

- **Use existing functions, variables, types, and utilities** before creating new ones. Search the codebase first.
- **Follow existing coding patterns** — match naming conventions, file structure, export style, error handling, and formatting of surrounding code.
- **Extend, don't duplicate** — if similar logic exists, refactor it to be reusable rather than writing a parallel implementation.
- **Import from barrel exports** (`index.ts`) where they exist. Do not bypass them with direct file imports.
- **Match existing error handling patterns** — use `AppError` subclasses, guard functions, and the established try/catch → typed error flow.

During the v5→v6 migration comparison, ~45 "improvement" issues were identified where the new codebase had **intentionally better implementations** than the old code (e.g., `ChatSDKError` → `AppError` class hierarchy, `myProvider` → `getModel()` registry, `verifyOwnership` → domain-specific guards). Without Step 1, agents would overwrite these improvements with legacy patterns.

---

## Commands

### Validation — Run Before Marking Work Complete

| Command | Purpose | Requirement |
|---------|---------|-------------|
| `pnpm format` | Auto-format (`biome format --write .`) | **Always run** after code changes, before lint |
| `pnpm typecheck` | TypeScript type checking (`tsc --noEmit`) | **Zero errors** |
| `pnpm lint` | Biome lint check (`biome check .`) | **Zero errors** |
| `pnpm lint:fix` | Auto-fix lint issues (`biome check --write .`) | Use when lint fails |

### Setup, Dev & Testing

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install all dependencies |
| `pnpm dev` | Start Next.js dev server with HMR |
| `pnpm build` | Run migrations + production build (**not during agent sessions**) |
| `pnpm test:unit` | Vitest unit tests |
| `pnpm test:e2e` | Playwright end-to-end tests |

### Database

| Command | Purpose |
|---------|---------|
| `pnpm db:generate` | Generate Drizzle migrations from schema |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Open Drizzle Studio |

**IMPORTANT**: Do NOT create manual migration SQL files. Drizzle ORM auto-generates them. Update the schema in `lib/db/schema.ts` and run `pnpm db:generate`.

---

## Architecture & Patterns

### Key Architecture Patterns (v6)

| Pattern | Implementation |
|---------|---------------|
| **Repository Pattern** | All data access through `lib/data/repositories/` |
| **Service Layer** | Business logic in `lib/data/services/` |
| **Feature Modules** | Self-contained under `features/` (auth, chat, artifact, input, settings, sidebar) |
| **Slim Routes** | API routes delegate to services; minimal logic in route files |
| **Error Hierarchy** | `AppError` → `ValidationError`, `NotFoundError`, `UnauthorizedError`, etc. |
| **Guard Functions** | Auth/access checks in `lib/auth/guards.ts` (throw-based, not return-based) |
| **AI Registry** | `getModel(id)` from `lib/ai/registry.ts` — no direct provider access |

### Code Style

- **TypeScript strict mode** — no `any` unless explicitly justified
- **Biome** for linting and formatting (not ESLint/Prettier)
- **Zod schemas** for validation (co-located in feature `schemas/` directories)
- **Server Actions** for mutations (co-located in feature `actions/` directories)

### Architecture Specs

Canonical architecture documentation lives in `.ouroboros/specs/refactor-migration/`:

| File | Content |
|------|---------|
| `architecture-v6-final.md` | Canonical architecture (29 sections) |
| `functional-structure-v6.md` | File-by-file specs (~274 files) |
| `directory-structure-v6.md` | Target directory structure |
| `architecture-v6-decisions.md` | ADRs for design rationale |

---

## Project Structure

```
features/          → Feature modules (auth, chat, artifact, input, settings, sidebar)
  └── <feature>/
      ├── actions/   → Server actions
      ├── components/ → Feature-specific UI
      ├── hooks/      → Feature-specific hooks
      └── schemas/    → Zod validation schemas
components/        → Shared components (ui/, ai/, artifact/)
hooks/             → Shared hooks (use-mobile, use-debounce, etc.)
lib/               → Core libraries
  ├── a11y/          → Accessibility utilities
  ├── api/           → API context, response, validation
  ├── auth/          → Auth config, guards, session
  ├── cache/         → Tiered caching (memory + Redis)
  ├── data/          → Repositories, services, queries
  ├── db/            → Drizzle client + schema
  ├── editor/        → Editor utilities
  ├── errors/        → Error messages
  ├── middleware/     → Request middleware
  ├── rate-limit/    → Rate limiting
  ├── types/         → Shared TypeScript types
  └── utils/         → General utilities
archive/oldapp/    → Legacy v5 code (migration source)
drizzle/           → Migration SQL files + seed script
```

---

## Migration Reference (archive/oldapp)

Legacy v5 source files are in `archive/oldapp/`. Agents must follow the Pre-Implementation Protocol above when referencing these files.

### Common Packages

Verify before implementation — install missing with `pnpm add <package>`:

| Package | Purpose |
|---------|---------|
| `@radix-ui/*` | UI primitives |
| `clsx`, `tailwind-merge` | Class utilities |
| `zod` | Validation |
| `drizzle-orm` | Database ORM |
| `@upstash/redis` | Caching |

---

## Current Implementation Plan

**Location:** `.apm/Implementation_Plan.md`
**Scope:** 215 issues across 97 tasks in 8 phases
**Issue Source:** `issues/` directory (11 phase files), master index: `issues/root.md`

### Phase Overview

| Phase | Name | Tasks | Agent | Priority | Parallel With |
|-------|------|-------|-------|----------|---------------|
| 1 | AI Core & Chat Streaming | 13 | Agent_AICore | CRITICAL | 2, 3, 8 |
| 2 | Security Hardening | 10 | Agent_Security | CRITICAL | 1, 3, 8 |
| 3 | Error & Data Infrastructure | 15 | Agent_DataLayer | HIGH | 1, 2, 8 |
| 4 | Chat UI & Sidebar Components | 14 | Agent_ChatUI | HIGH | 5, 8 (after 1) |
| 5 | Artifact System | 10 | Agent_ArtifactUI | HIGH | 4, 8 (after 1) |
| 6 | Pages, Hooks & State | 13 | Agent_Pages | MEDIUM | 7, 8 (after 4) |
| 7 | API Routes & Server Actions | 13 | Agent_APIRoutes | MEDIUM | 6, 8 (after 1+3) |
| 8 | Middleware, Types & Config | 9 | Agent_Middleware | MEDIUM | All |

### Critical Path

```
Phase 1 (AI Core) ──┬──→ Phase 4 (Chat UI) ──→ Phase 6 (Pages)
                     ├──→ Phase 5 (Artifacts)
                     └──→ Phase 7 (API Routes)
Phase 2 (Security) ─────→ Phase 7 (API Routes)
Phase 3 (Data Layer) ───→ Phase 7 (API Routes)
Phase 8 (Middleware) ────→ (independent, parallel with all)
```

---

## Shared Protocols

### Behavioral Expectations (ALL AGENTS)

- **Knowledge-First**: No agent begins implementation without completing its knowledge acquisition phase — read all referenced files, search for related code, review specs, understand dependencies
- **Autonomous Execution**: All agents execute without user confirmation between steps. Only pause for critical ambiguity that cannot be resolved from context
- **Logging Obligation**: All significant work, findings, and decisions must be logged:
  - Task execution details → Memory Logs (`.apm/Memory/`)
  - **CRITICAL** — Issues and irregularities → `global-issues.md`
  - **CRITICAL** — Generalizable insights → `AGENTS.md` (Contributions Log)
- **Scope Discipline**: Stay within assigned task scope. Scope expansion requires justification, Memory Log entry, and a flag in the Final Task Report

### Error Resolution — 3-Strike Rule

| Attempt | Action |
|---------|--------|
| 1st | Analyze and fix |
| 2nd | Alternative approach |
| 3rd | Broader rethink |
| 4th+ | **PROHIBITED** — escalate |

### Error Escalation Chain

```
1. Self-resolve (max 3 attempts)
       ↓ (if unresolved)
2. Log to global-issues.md
       ↓
3. Delegate to Ad-Hoc Agent (debug or research)
       ↓ (if still unresolved)
4. Report to Manager Agent for decision
```

### Context Drift Recovery

If you cannot recall task objective, dependencies, or progress → **STOP** → Re-read workflow → Re-read context files (Implementation Plan, Task Assignment, Memory Logs) → Confirm recovery → Resume

### Workflow Re-Read (MANDATORY)

**ALWAYS** re-read your workflow file when:
- Context has been summarized
- Context drift is detected
- Session is resumed after handover

---

## Issue Tracking (`global-issues.md`)

**ALL** findings, irregularities, migration inconsistencies, architectural deviations, and missing dependencies MUST be logged.

### Issue Categories

| Category | When to Use |
|---|---|
| **Bug** | Functional errors, runtime failures, incorrect behavior |
| **Migration** | Inconsistencies between old app and new implementation |
| **Dependency** | Missing packages, version conflicts, import issues |
| **Refactor** | Technical debt, code quality issues, structural problems |
| **Architecture** | Deviations from architectural specifications |
| **Drift** | Context drift events, protocol violations, alignment issues |

### Entry Format

```markdown
## [Timestamp] - [Issue Title]

- **Category**: [Bug | Migration | Dependency | Refactor | Architecture | Drift]
- **Agent**: [Agent name]
- **Task**: [Task reference]
- **Context**: [What was happening when the issue was found]
- **Root Cause**: [If known, otherwise "Under investigation"]
- **Action Taken**: [What was done to address it]
- **Status**: [Open | Resolved | Deferred]
- **Related Files**: [Affected file paths]
```

---

## APM System

### Agent Roles

| Agent | Role | Workflow |
|-------|------|----------|
| **Manager** | Orchestrator — delegates all work, never reads/writes directly | `.kilocode/workflows/apm-2-initiate-manager-autonomous.md` |
| **Implementation** | Executor — coding, research, analysis, issue logging | `.kilocode/workflows/apm-3-initiate-implementation-autonomous.md` |
| **Ad-Hoc** | Specialist — debugging, research delegation | `.kilocode/workflows/apm-7-delegate-research.md`, `.kilocode/workflows/apm-8-delegate-debug.md` |

### Responsibility Matrix

| Responsibility | Manager | Implementation |
|---|---|---|
| Task delegation & planning | **Primary** | — |
| Code implementation | — | **Primary** |
| `global-issues.md` | Reviews & considers | **Writes entries** |
| Code quality validation | — | **Runs typecheck + lint** |
| Memory Log creation | Delegates | **Writes** |
| Error resolution | Delegates | Up to 3 attempts |

### Memory System

```
.apm/Memory/
├── Memory_Root.md              ← Project overview & phase summaries
├── Phase_XX_slug/              ← Phase-level directory
│   ├── Task_X_Y_slug.md        ← Individual task execution records
│   └── ...
└── Handover/                    ← Session transition context
    └── Handover_YYYY-MM-DD_HH-MM.md
```

### Key File Paths

| File/Directory | Purpose |
|----------------|---------|
| `AGENTS.md` | This file — shared knowledge base |
| `global-issues.md` | Global issue tracking |
| `.apm/Implementation_Plan.md` | Task definitions and dependencies |
| `.apm/guides/` | Memory Log, Memory System, Task Assignment guides |
| `.apm/Memory/` | Task logs and phase summaries |
| `.kilocode/workflows/` | Agent workflow files |

---

## Agent Contributions Log

> Append new entries below. Do not modify or remove existing entries.

---