# Spec Issues and Critique

This file captures **critique only** (not neutral facts).  
Focus: ambiguity, contradiction, incompleteness, and outdated guidance risk for Next.js 16 + Vercel AI SDK ecosystem.

## Severity Scale

- `Critical`: likely to cause incorrect architecture or broken implementation.
- `High`: likely to cause major churn, boundary drift, or planning failure.
- `Medium`: likely to slow implementation or create inconsistencies.
- `Low`: polish/clarity debt.

## Issues

| ID | Severity | Issue | Impacted Areas | Suggested Correction |
|---|---|---|---|---|
| SI-001 | Critical | Export rule says "named exports only/no default exports", but Next.js App Router requires default exports for `page.tsx`, `layout.tsx`, `error.tsx`, etc. | `app/**` components, route conventions, lint strategy | Split export convention: allow required Next file-convention default exports; keep named exports elsewhere. |
| SI-002 | Critical | Path roots conflict: docs alternate between `components/*` vs `src/components/*`, and similarly mixed `lib/types` vs `src/types`. | Module boundaries, import paths, scaffolding, codegen scripts | Choose one canonical root layout and publish single alias policy (`@/*` mapping) with migration matrix. |
| SI-003 | High | Artifact/document unification is incomplete and internally contradictory (`artifacts` table but `suggestions.documentId`, tool names `create-document`, etc.). | DB schema, repositories, API contracts, tool contracts | Enforce immediate canonical artifact naming across schema/repositories/routes/tools with no alias layer. |
| SI-004 | High | `implementation-plan-v6.md` task granularity and file targets diverge from `architecture-v6-final.md`/`directory-structure-v6.md` (different file names and module shapes). | Planning reliability, execution sequencing, effort estimate | Regenerate implementation plan from canonical architecture snapshot and freeze with spec version hash. |
| SI-005 | High | "Slim route ~15 lines" and strict delegation intent conflict with examples embedding auth/validation/response utilities in route body; practical policy unclear. | Route design consistency, review outcomes | Define explicit slim-route budget and approved in-route responsibilities (e.g., guard+validate+delegate allowed). |
| SI-006 | High | Boundary rule "`features` can import other features (actions only)" is weakly specified and not machine-enforced in shown ESLint patterns. | Feature isolation, cyclic dependencies | Add explicit `no-restricted-imports` patterns for cross-feature internals and document allowed public entrypoints. |
| SI-007 | Medium | Rate-limit specs diverge across files (`/api/upload` vs `/api/files/upload`, auth route variants, sample middleware mismatch). | Security controls, infra config drift | Add single source-of-truth route policy table generated from route manifest. |
| SI-008 | Medium | AI wrapper narrative says wrappers are UI-only, but some sections prescribe substantial business behavior in wrappers (state/actions/integration), risking layer bleed. | `components/ai` vs `features/*` ownership | Clarify allowed wrapper logic ceiling: presentation+UI state only; feature/business workflows stay in `features`. |
| SI-009 | Medium | Service architecture placement is ambiguous (`src/services` in one place, repo-service split in `lib/data/services` elsewhere). | Cross-cutting concerns, injection/test patterns | Define service taxonomy: domain services vs infra services vs adapters, each with fixed location. |
| SI-010 | Medium | Barrel export mandate ("every folder MUST have index.ts") is too absolute and can increase cycle/tree-shake risks, contrary to some ADR caveats. | Build hygiene, dependency cycles | Change to selective policy: barrels for public module boundaries only; avoid deep/internal barrels. |
| SI-011 | Medium | Several examples include potentially stale/incorrect App Router idioms (`'use server'` shown in route handler example), risking misuse. | API route implementation correctness | Add Next.js 16 verified examples only; remove/flag noncanonical snippets with "pseudo-code" labels. |
| SI-012 | Low | File counts/LOC estimates vary significantly across documents, making effort and scope planning noisy. | Scheduling and staffing estimates | Treat counts as non-normative metadata; auto-generate counts from tree snapshots. |

## Evidence and Reasoning

### SI-001 (Critical): Default export contradiction

- Export rule forbids defaults:
  - `architecture-v6-final.md#22-standardization-rules` ("named exports only", "no default exports").
- Same corpus uses required default export examples for App Router files:
  - `architecture-v6-final.md` login/register page examples.
  - `functional-structure-v6.md` many `export default` entries for app routes/layouts.

Reasoning:
- Next.js App Router file conventions require default exports for pages/layouts/error UIs.
- A blanket "no default exports" rule is unimplementable without violating framework conventions.

### SI-002 (Critical): Root path inconsistency

Observed inconsistencies:
- `architecture-v6-final.md` top-level tree uses `components/`, yet AI sections and functional docs heavily use `src/components/`.
- `implementation-plan-v6.md` mixes `lib/types` and `src/types` references.
- `functional-structure-v6.md` includes both `@/lib/types` and `@/src/types` patterns.

Reasoning:
- This ambiguity directly affects code generation paths, import aliases, and enforcement rules.
- High likelihood of duplicated modules and broken import boundaries.

### SI-003 (High): Artifact/document drift not fully resolved

Sources:
- ADR-019 establishes artifact unification.
- Plan still references `documentId` in suggestions and tool names with `document`.

Reasoning:
- Terminology drift at schema/repository/API level creates mapping debt and bug risk.
- Without an explicit canonicalization strategy, teams will implement mixed-domain language.

### SI-004 (High): Plan/spec divergence

Sources:
- `implementation-plan-v6.md` includes task files that do not align cleanly with canonical structure in `architecture-v6-final.md` and `directory-structure-v6.md`.

Reasoning:
- Execution pipeline depends on tasks; divergent task paths trigger rework and invalid acceptance checks.

### SI-005 (High): Slim route policy ambiguity

Sources:
- "SLIM route" guidance in architecture.
- Example routes still do multi-step guard/validate/response composition.

Reasoning:
- Teams need precise route responsibility boundary to avoid code review churn.

### SI-006 (High): Cross-feature import loophole

Sources:
- Import matrix allows "other features (actions only)".
- ESLint snippet is not explicit enough for action-only cross-feature gating.

Reasoning:
- Lax enforcement permits hidden coupling and dependency cycles.

### SI-007 (Medium): Rate limit config drift

Sources:
- Route lists differ between files (`architecture-v6-final`, `directory-structure-v6`, `implementation-plan-v6`).

Reasoning:
- Security posture can silently degrade if config and real routes diverge.

### SI-008 (Medium): Wrapper layer responsibility creep

Sources:
- UI wrapper narrative (AI UI only) vs wrapper descriptions that include richer behavior.

Reasoning:
- Can accidentally move business logic into shared component layer, violating architecture intent.

### SI-009 (Medium): Service placement ambiguity

Sources:
- `src/services` in architecture section, `lib/data/services` in functional/plan areas.

Reasoning:
- Inconsistent service placement makes boundaries and ownership unclear.

### SI-010 (Medium): Barrel absolutism

Sources:
- Mandatory barrel statement vs ADR caveats around circular deps/tree-shaking concerns.

Reasoning:
- Blanket requirement is not universally safe; should be constrained to API surfaces.

### SI-011 (Medium): Potentially stale snippets

Sources:
- Route snippet containing `'use server'` and other pseudo-ish samples.

Reasoning:
- Without explicit "illustrative only" labeling, teams may copy invalid patterns.

### SI-012 (Low): Unstable file-count metadata

Sources:
- Different docs report inconsistent totals and structures.

Reasoning:
- Planning noise more than correctness issue; still impacts effort forecasts.

## Conclusions

The spec corpus has strong architectural intent, but is currently not execution-safe as a single source of truth.  
Before implementation planning, stabilize:

1. Canonical path roots (`components` vs `src/components`, `lib/types` vs `src/types`).
2. Framework-required export exceptions.
3. Artifact/domain canonical naming cutover policy.
4. Plan-to-architecture synchronization (regenerate tasks from canonical spec).
5. Enforcement rules that match intended boundaries.

## Candidate Deviation Areas (Likely Needed)

1. **Next.js file-convention exception policy** for default exports in App Router files.
2. **Single canonical root layout** (`src/` strategy or root strategy) with import alias lock.
3. **Immediate artifact/document canonicalization policy** (types/routes/tools) during migration.
4. **Selective barrel policy** (public APIs only) instead of universal barrels.
5. **Stronger boundary enforcement** for cross-feature imports via explicit lint rules.
