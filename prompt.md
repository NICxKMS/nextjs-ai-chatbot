## Agent Team

Use these agents by role:

| Agent             | Invoke               | Use For                                     |
| ----------------- | -------------------- | ------------------------------------------- |
| Prometheus        | `@prometheus`        | Strategic planning, interview-based scoping |
| Hephaestus        | `@hephaestus`        | Deep autonomous implementation              |
| Oracle            | `@oracle`            | Architecture review, tradeoff analysis      |
| Explorer          | `@explorer`          | Codebase discovery, pattern finding         |
| Atlas             | `@atlas`             | Structured plan execution                   |
| Frontend Engineer | `@frontend-engineer` | React/UI implementation                     |
| Backend Engineer  | `@backend-engineer`  | Server Actions, DB, API                     |
| Sentinel          | `@sentinel`          | Security audit                              |
| Code Reviewer     | `@code-reviewer`     | Quality review                              |
| Code Skeptic      | `@code-skeptic`      | Verification, evidence checking             |
| Optimizer         | `@optimizer`         | Performance analysis                        |
| Docs Specialist   | `@docs-specialist`   | Documentation                               |
| DevOps Specialist | `@devops-specialist` | CI/CD, deployment                           |
| Code Simplifier   | `@code-simplifier`   | Refactoring                                 |

---

## Primary Objective

Generate a **complete rebuild plan** that:

- Rebuilds system from scratch at project root (`./`)
- Uses `oldapp/` as behavioral reference (read-only)
- Uses refactor-migration spec (`.ouroboros/specs/refactor-migration/`) as architecture guide
- **Actively improves** architecture where a better approach exists
- Preserves ALL functionality, integrations, behaviors, UI states, data flows, and AI behaviors

Guarantees:

- Zero missing features
- Zero broken integrations
- Zero UI regressions
- Full traceability: feature → task → file → integration → verification

---

## Source of Truth (Priority Order)

1. **Observed behavior in `oldapp/`** — what the app actually does
2. **Explicit architecture spec constraints** — `.ouroboros/specs/refactor-migration/`
3. **Engineering best practices** — Next.js App Router + Vercel AI SDK patterns
4. **Performance + maintainability**
5. **Simplicity**

- If spec contradicts real behavior → **behavior wins**
- If spec is suboptimal → **improve it**, log deviation
- Never copy old code (except `ai-elements/` — copied as-is)

---

## Architectural Improvement Policy

The refactor-migration spec is a **starting point, not a ceiling**.

- Where spec is sound → follow it
- Where a better approach exists → **use it**, log the deviation
- Where spec is silent → design the best approach, document the decision
- "Better" = simpler, more maintainable, more performant, or better aligned with Next.js App Router + Vercel AI SDK best practices
- If patterns are unnecessarily complex → **simplify them**. Reduce indirection, flatten hierarchies, eliminate over-engineering.
- Every deviation logged with: what spec says, what we do instead, why, trade-offs, severity

---

## Project Context

**Stack**: Next.js 16 · React 19 · TypeScript · Drizzle ORM · Supabase · Tailwind v4 · Vercel AI SDK · Biome

| Path                                   | Purpose                                                 |
| -------------------------------------- | ------------------------------------------------------- |
| `oldapp/`                              | Old application (read-only behavioral reference)        |
| `.ouroboros/specs/refactor-migration/` | Architecture spec (improvable guide)                    |
| `./` (project root)                    | New code target (starting fresh)                        |
| `/plan/`                               | Planning output (new folder, clean slate)               |
| `AGENTS.md`                            | Project rules and conventions                           |
| `.next-docs/`                          | Next.js 16 documentation (read before any Next.js work) |
| `.github/agents/`                      | Specialist agent definitions                            |

---

## Lessons from Prior Failure

Previous plan failed. These fixes are mandatory:

| Failure                                    | Fix                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| Features identified but never became tasks | **Traceability matrix**: every feature → task(s) → file(s) → integration(s)    |
| Tasks planned in isolation, wiring assumed | **Every task declares inputs and outputs**. Every integration seam gets a task |
| `ai-elements/` rewritten instead of copied | **Copy as-is, NEVER modify**. Only wrappers in `ai-wrappers/` are new          |
| Inter-phase contracts undefined            | **Entry/exit states** for every phase                                          |
| Tasks too large ("implement chat system")  | **One task = one logical unit** (1-4 tightly coupled files)                    |
| Tasks organized by file type               | **Vertical slice phases** — complete data flow built as a unit                 |

---

## AI Two-Layer Architecture (Hard Boundary)

### Layer 1 — `ai-elements/` (Read-Only Primitives)

Copied directly from `oldapp/` with **zero modifications**.

Components: Message, Conversation, PromptInput, Artifact, Canvas, WebPreview, Reasoning, ChainOfThought, Sources, Tool, Confirmation, Task, CodeBlock, Image, Shimmer, Loader, Suggestion, ModelSelector, Node, Edge, Controls, Panel, Context, Queue

**Rules:**

- No editing, refactoring, reformatting, retyping, renaming, or logic insertion
- Only `ai-wrappers/` may import from `ai-elements/`
- Enforced by CI checksum manifest

### Layer 2 — `ai-wrappers/` (Integration Layer — Newly Written)

Wrapper components that:

- Import primitives from `ai-elements/`
- Connect to application state, hooks, AI SDK providers
- Handle data fetching, streaming, tool execution, error states

### Import Graph (Strict DAG)

```
ai-elements/ → ai-wrappers/ → features/ → app/
```

`features/`, `app/`, `hooks/`, `lib/` **never** import from `ai-elements/` directly.

### AI Content Protection

AI prompts, system instructions, tool definitions, and structured output schemas use `COPY_CONTENT` tasks. Content must not be modified — only import paths and wrapper integration code may change.

---

## Analysis Approach — Flow-First

When analyzing `oldapp/` or the spec:

**Do:**

- Trace user actions end-to-end: trigger → handler → data fetch → state update → render
- Trace data flows: source → processing → storage → consumption
- Trace AI flows: prompt → provider → stream → tool calls → UI update
- Map runtime interactions, not just static exports

**Don't:**

- Grep files and list contents in isolation
- Catalog components as static inventories without understanding runtime behavior

---

## Orchestration Protocol

### Delegation Rules

- Delegate tasks to specialist agents — don't do everything directly
- Each delegated task should have a clear, bounded deliverable
- Pass file paths between agents, not file contents
- Maximize parallel dispatch for independent tasks

### Agent Briefing

When delegating, provide:

- **What** to do (concrete deliverable)
- **Where** to read inputs and write outputs (exact file paths)
- **Context** (relevant behavioral directives, architectural constraints)
- **Quality bar** (success criteria)
- **What to avoid** (forbidden patterns, prior failure modes)

---

## Build Phases — Vertical Slices

### Phase 00 — Scaffold (Blocking)

Project structure, config, base architecture, shared types/utilities, environment system, `ai-elements/` copy + checksum validation.

### Phase 01 — AI Foundation (Blocking for AI feature phases)

AI SDK provider setup, base wrappers for `ai-elements/` primitives, core streaming infrastructure. All `ai-wrappers/` built here.

### Phase 02+ — Feature Vertical Slices

Each delivers working, integrated functionality. Task order follows data flow:

1. Data layer (types, schemas, API routes, server actions)
2. State/logic (hooks, stores, utilities)
3. UI components (import from wrappers, not elements)
4. Integration (wire data → state → UI)
5. AI wrappers (if slice introduces new AI interactions)
6. Verification (slice works end-to-end)

Related functionality stays in the **same phase** (e.g., chat send + receive + render + stream = one phase).

Every phase defines: entry state, scope, exit state, integration verification.

---

## Task Schema

```
TASK: [ID: P{phase}-T{number}]
Title: [clear, specific action]
Phase: [number and name]
Type: SCAFFOLD | AI_COPY | AI_WRAPPER | IMPLEMENTATION | INTEGRATION | VERIFICATION

Behavior ref: [feature/flow from /plan/behavioral_extraction/]
Architecture ref: [pattern from /plan/architecture/ or deviation ID]

Action: [exactly what to do]

Output files: [file paths this task creates]
Inputs: [files/exports consumed, from which task/source]
Outputs: [files/exports produced, consumed by which task(s)]

AI layer handling: AI_COPY | AI_WRAPPER | COPY_CONTENT | NEW | N/A

Dependencies: [task IDs that must complete first]
Dependents: [task IDs that depend on this]

Success criteria:
- [testable condition 1]
- [testable condition 2]

Complexity: S | M | L
```

### Task Sizing

Correctly sized (1 logical unit, 1-4 files):

- Create Button component (Button.tsx, types.ts, index.ts)
- Create useChat hook (useChat.ts, types.ts)
- Create /api/chat route (route.ts, schema.ts)

Too large → split: "Build chat UI", "Create all API routes"
Too small → merge: "Create types file", "Create barrel export"

Expected scale: ~100-300 tasks for a mid-scale application.

---

## Deviation Protocol

When a better approach than spec is identified:

1. **Use** the better approach
2. **Log** to `/plan/deviations/`:

```
DEVIATION: [title]
ID: DEV-[NNN]
Area: [routing / state / components / AI / data / etc.]
Spec says: [exact rule being deviated from]
We do instead: [what the plan does]
Reason: [technical justification]
Trade-offs: [what is given up]
Severity: MINOR | STRUCTURAL | MAJOR
```

- **MINOR** (naming, file organization): log, no user decision
- **STRUCTURAL** (pattern, data flow): log + flag for user
- **MAJOR** (architectural philosophy): log + BLOCKING — pause until approved

---

## Plan File System

Output goes to `/plan/` with this structure:

```
/plan
  /behavioral_extraction    ← features, user flows, data flows, API contracts,
                              AI SDK usage, state management, edge cases
  /architecture             ← spec analysis, improvements, conventions,
                              patterns, decisions, AI layer architecture
  /deviations               ← deviation log + per-area details
  /ui_parity                ← screens, components, interactions, accessibility
  /integration_map          ← contracts, data flow chains, component wiring,
                              API integration, AI integration, seam inventory
  /traceability             ← feature→task mapping (100% coverage required)
  /scaffold                 ← directory structure, base config, shared types
  /strategy                 ← approach, vertical slices, phase order
  /phases                   ← per-phase: tasks, entry/exit state, integration
  /dependencies             ← graph, critical path, inter-phase deps
  /final_plan               ← preamble, AI migration guide, phase plans,
                              integration summary, traceability proof
```

File rules:

- No file exceeds ~400 lines — split into numbered sub-files
- Every domain folder has `index.md` listing files with summaries
- Domain files include reasoning; `final_plan` files do NOT

---

## Verification Checklist

### Completeness

- Every `oldapp/` feature has at least one task
- Every API route has handling tasks
- Every `ai-elements/` component has an `AI_COPY` task
- Every `AI_COPY` has a wrapper consuming it
- Every data flow chain has end-to-end coverage

### Integration

- Every seam in seam_inventory has an integration task
- Every task declares inputs and outputs
- Phase entry states match previous phase exit states
- AI boundary (`ai-elements/` → `ai-wrappers/` → `features/`) enforced

### Traceability

- `feature_to_task.md` covers 100% of features
- `uncovered_features.md` is empty
- Dependency graph is cycle-free

---

## Key Rules

**Never:**

- Modify `ai-elements/` internals
- Import `ai-elements/` from `features/`, `app/`, `hooks/`, or `lib/`
- Start feature phases before scaffold is verified
- Bundle unrelated tasks
- Organize by file type instead of data flow
- Leave architectural decisions deferred to implementation
- Create compatibility layers, shims, or legacy bridges — all new code must be clean and native

**Always:**

- Copy `ai-elements/` as-is, write wrappers fresh
- Enforce the two-layer AI import boundary
- Evaluate spec critically — improve where possible
- Log every deviation with reasoning and severity
- Declare inputs and outputs for every task
- Organize phases by vertical slice / data flow
- Enforce 100% feature traceability
- Write clean, native code for the new architecture

---

## Final Output

The completed `/plan/` directory containing:

1. All domain analysis files (behavioral extraction, architecture, UI parity, integration map)
2. Complete traceability proof (100% feature coverage)
3. Final execution plan in `/plan/final_plan/`:
   - Preamble (deviations, improvements, risks)
   - AI migration guide (copy manifest, wrapper list, boundary rules)
   - Phase 00 Scaffold → Phase 01 AI Foundation → Phase 02-N Feature slices
   - Integration summary, dependency graph, traceability proof

---

## Start

Previous plan failed: missing features, broken integrations, rewritten AI primitives. This plan must be **complete**, **integrated**, and **traceable**.

Use your agent team. Delegate to `@prometheus` for planning, `@explorer` for codebase research, `@oracle` for architecture decisions, and `@atlas` to execute the plan.

Completion condition: **Fully verified, production-ready rebuild plan.**
