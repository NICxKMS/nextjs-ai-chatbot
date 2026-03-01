# Architecture Plan

> Critical evaluation of architecture-v6-final spec with feature collocation enforcement,
> simplification of over-engineered patterns, and alignment with Next.js 16 best practices.
>
> **Updated per redesign audit (2026-03-01)**: All architectural decisions have been validated
> and refined through a comprehensive redesign audit. Provider naming, component decomposition,
> state management patterns, revalidation strategy, and naming conventions are now finalized.

## Documents

| # | File | Purpose |
|---|------|---------|
| 1 | [spec-analysis.md](spec-analysis.md) | Critical analysis of v6 spec — what works, what's over-engineered, what's missing. Verdicts updated with redesign outcomes. |
| 2 | [improvements.md](improvements.md) | Confirmed improvements: collocation, simplified data access, state management, revalidation, provider scoping |
| 3 | [conventions.md](conventions.md) | Final conventions: directory structure, naming (artifact terminology), imports, file placement |
| 4 | [patterns.md](patterns.md) | Pattern catalog: data access, server actions, components, hooks, AI/streaming, revalidation |
| 5 | [decisions.md](decisions.md) | Key architectural decisions with rationale and tradeoffs |

## Related

- [Deviations from spec](../deviations/index.md) — Every deviation logged with justification
- [Behavioral extraction](../behavioral_extraction/index.md) — What the app actually does today
- [Architecture v6 spec](../../.ouroboros/specs/refactor-migration/architecture-v6-final.md) — Original spec
- [Redesign documents](../../redesign/index.md) — Authoritative redesign decisions and patterns

## Guiding Principles

1. **Server-first architecture** — every component is a Server Component unless it requires browser APIs, state, or event handlers
2. **Feature collocation is non-negotiable** — all feature code lives in `features/[name]/`
3. **Simplify aggressively** — no unnecessary abstraction layers
4. **Align with Next.js 16** — Server Components, Server Functions, `use cache`, PPR, `proxy.ts`
5. **Preserve behavioral parity** — everything the oldapp does, the new app must do
6. **Evidence-based** — every recommendation grounded in actual codebase analysis
7. **Revalidation completeness** — every mutation calls `updateTag`/`revalidateTag`
8. **Naming consistency** — "artifact" not "document", provider names match their purpose
9. **Provider scope minimization** — providers wrap only the components that consume them
10. **No dead code** — no credit/gateway/quota logic, no unused infrastructure
