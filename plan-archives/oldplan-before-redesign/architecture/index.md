# Architecture Plan

> Critical evaluation of architecture-v6-final spec with feature collocation enforcement,
> simplification of over-engineered patterns, and alignment with Next.js 16 best practices.

## Documents

| # | File | Purpose |
|---|------|---------|
| 1 | [spec-analysis.md](spec-analysis.md) | Critical analysis of v6 spec — what works, what's over-engineered, what's missing |
| 2 | [improvements.md](improvements.md) | Proposed improvements: collocation, simplified data access, state management |
| 3 | [conventions.md](conventions.md) | Final conventions: directory structure, naming, imports, file placement |
| 4 | [patterns.md](patterns.md) | Pattern catalog: data access, server actions, components, hooks, AI/streaming |
| 5 | [decisions.md](decisions.md) | Key architectural decisions with rationale and tradeoffs |

## Related

- [Deviations from spec](../deviations/index.md) — Every deviation logged with justification
- [Behavioral extraction](../behavioral_extraction/index.md) — What the app actually does today
- [Architecture v6 spec](../../.ouroboros/specs/refactor-migration/architecture-v6-final.md) — Original spec

## Guiding Principles

1. **Feature collocation is non-negotiable** — all feature code lives in `features/[name]/`
2. **Simplify aggressively** — no unnecessary abstraction layers
3. **Align with Next.js 16** — Server Components, Server Functions, `use cache`, PPR
4. **Preserve behavioral parity** — everything the oldapp does, the new app must do
5. **Evidence-based** — every recommendation grounded in actual codebase analysis
