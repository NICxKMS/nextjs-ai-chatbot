# ai-assistant (v6.0)

Next.js AI chatbot with multi-model support, artifact management, real-time streaming, and feature-based architecture.

**Tech stack**: Next.js 16, React 19, TypeScript, Drizzle ORM, Supabase (auth + DB), Tailwind CSS, AI SDK, Biome (lint + format).

---

## Commands

### Setup & Dev

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install all dependencies |
| `pnpm dev` | Start Next.js dev server with HMR |
| `pnpm build` | Run migrations + production build (**not during agent sessions**) |

### Validation — Run Before Marking Work Complete

| Command | Purpose | Requirement |
|---------|---------|-------------|
| `pnpm typecheck` | TypeScript type checking (`tsc --noEmit`) | **Zero errors** |
| `pnpm lint` | Biome lint check (`biome check .`) | **Zero errors** |
| `pnpm lint:fix` | Auto-fix lint issues (`biome check --write .`) | Use when lint fails |
| `pnpm format` | Auto-format (`biome format --write .`) | Always Run after code changes and before lint and format verification |

### Testing

| Command | Purpose |
|---------|---------|
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

## Project Structure

```
features/          → Feature modules (auth, chat, artifact, input, settings, sidebar)
  └── <feature>/
      ├── actions/   → Server actions
      ├── components/ → Feature-specific UI
      ├── hooks/      → Feature-specific hooks
      ├── schemas/    → Zod validation schemas
      └── types/      → TypeScript types
components/        → Shared components (ui/, ai/, artifact/)
lib/               → Core libraries
  ├── api/           → API context, response, validation
  ├── auth/          → Auth config, guards, session
  ├── cache/         → Tiered caching (memory + Redis)
  ├── data/          → Repositories, services, queries
  ├── db/            → Drizzle client + schema
  ├── errors/        → Error messages
  ├── files/         → File upload, validation
  ├── middleware/     → Request middleware
  ├── rate-limit/    → Rate limiting
  └── utils/         → General utilities
archive/oldapp/    → Legacy v5 code (migration source)
drizzle/           → Migration SQL files + seed script
```

---

## Code Style & Conventions

- **TypeScript strict mode** — no `any` unless explicitly justified
- **Biome** for linting and formatting (not ESLint/Prettier)
- **Feature-based architecture** — each feature is self-contained under `features/`
- **Repository pattern** for data access (`lib/data/repositories/`)
- **Service layer** for business logic (`lib/data/services/`)
- **Zod schemas** for validation (co-located in feature `schemas/` directories)
- **Server Actions** for mutations (co-located in feature `actions/` directories)

---

## Architecture Specs

Canonical architecture documentation lives in `.ouroboros/specs/refactor-migration/`:

| File | Content |
|------|---------|
| `architecture-v6-final.md` | Canonical architecture (29 sections) |
| `functional-structure-v6.md` | File-by-file specs (~274 files) |
| `directory-structure-v6.md` | Target directory structure |
| `architecture-v6-decisions.md` | ADRs for design rationale |

---

## Migration Reference (archive/oldapp)

When migrating from the legacy v5 app:
1. Source files are in `archive/oldapp/`
2. Read source completely before migrating
3. Adapt to v6 patterns (Repository/Service/feature-based)
4. Log migrations in Memory Log and `global-issues.md` (Category: Migration)

### Common Missing Files

| Target | Source |
|--------|--------|
| `components/ui/button.tsx` | `archive/oldapp/components/ui/button.tsx` |
| `components/ui/input.tsx` | `archive/oldapp/components/ui/input.tsx` |
| Other UI primitives | `archive/oldapp/components/ui/` |

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

## APM Agent Roles

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
| `global-issues.md` | Reviews & considers in planning | **Writes entries** |
| `AGENTS.md` contributions | Reviews at phase boundaries | **Writes insights** |
| Code quality validation | — | **Runs typecheck + lint** |
| Memory Log creation | Delegates | **Writes** |
| Error resolution | Delegates | Up to 3 attempts, then delegates |

---

## Shared Protocols

### Behavioral Expectations (ALL AGENTS)

- **Knowledge-First**: No agent begins implementation without completing its knowledge acquisition phase — read all referenced files, search for related code, review specs, understand dependencies
- **Autonomous Execution**: All agents execute without user confirmation between steps. Only pause for critical ambiguity that cannot be resolved from context
- **Logging Obligation**: All significant work, findings, and decisions must be logged:
  - Task execution details → Memory Logs (`.apm/Memory/`)
 **CRITICAL** - Issues and irregularities → `global-issues.md`
 **CRITICAL** - Generalizable insights → `AGENTS.md` (Contributions Log)
- **Scope Discipline**: Stay within assigned task scope. Scope expansion requires justification, Memory Log entry, and a flag in the Final Task Report

### Workflow Re-Read (MANDATORY — ALL AGENTS)

**ALWAYS** re-read your workflow file when:
- Context has been summarized
- Context drift is detected
- Session is resumed after handover

After re-reading, confirm compliance before proceeding.

### Error Resolution — 3-Strike Rule

| Attempt | Action |
|---------|--------|
| 1st | Analyze and fix |
| 2nd | Alternative approach |
| 3rd | Broader rethink |
| 4th+ | **PROHIBITED** — delegate via `.kilocode/workflows/apm-8-delegate-debug.md` or `.kilocode/workflows/apm-7-delegate-research.md` |

### Context Drift Recovery

Watch for these drift indicators:

| Indicator | Severity |
|---|---|
| Cannot recall task objective or progress | Critical |
| Cannot recall dependencies or prior decisions | Critical |
| Uncertain of registered role or agent name | Critical |
| Cannot recall what steps were completed | High |
| Cannot recall target output locations | High |
| Unsure about workflow rules or procedures | Medium |

**Recovery**: STOP → Re-read workflow → Re-read context files (Implementation Plan, Task Assignment, Memory Logs) → Confirm recovery → Resume

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

---

## Issue Tracking (`global-issues.md`)

**ALL** findings, irregularities, migration inconsistencies, architectural deviations, and missing dependencies MUST be logged.

### What Must Be Logged

- All findings that deviate from expectations
- Migration inconsistencies between `archive/oldapp/` and new code
- Missing dependencies or packages
- Architectural deviations from specifications in `.ouroboros/specs/`
- Refactor-related issues or technical debt
- Any irregularities discovered during implementation
- Context drift events or protocol deviations

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

## Knowledge Sharing

Append insights to the Contributions Log below when you discover something generalizable, non-obvious, and actionable for other agents.

### Entry Format

```markdown
## [Date] - [Insight Title] - [Agent Name]
**Category**: [Architecture | Pitfall | Efficiency | Integration | Configuration | Debug]

[What you learned and how to apply it. 1-3 sentences is fine.]

---
```

---

## Memory System

```
.apm/Memory/
├── Memory_Root.md              ← Project overview & phase summaries
├── Phase_XX_slug/              ← Phase-level directory
│   ├── Task_X_Y_slug.md        ← Individual task execution records
│   └── ...
└── Handover/                    ← Session transition context
    └── Handover_YYYY-MM-DD_HH-MM.md
```

**Mandatory logging triggers** — create/update Memory Logs when:
- A task is completed (success or failure)
- A significant finding is discovered (`important_findings: true`)
- A delegation occurs (`ad_hoc_delegation: true`)
- A compatibility issue is detected (`compatibility_issues: true`)
- Context drift recovery is performed

---

## APM File Paths

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

## 2026-02-13 - Drizzle ORM Handles Migration SQL Automatically - System
**Category**: Pitfall

Do NOT create manual migration SQL files. Drizzle ORM automatically generates migration SQL from the schema file. Update your schema in `lib/db/schema.ts` and run `pnpm db:generate`. Hand-written SQL files will conflict with Drizzle's generated output.

---
