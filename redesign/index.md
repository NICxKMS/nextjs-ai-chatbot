# Redesign — Master Index

> Ground-up architectural redesign for the Next.js 16 AI chatbot application.  
> Informed by 53 audit findings (3 CRITICAL, 15 HIGH, 19 MEDIUM, 6 LOW).  
> Date: 2026-02-28

---

## Documents

| File | Description |
|------|-------------|
| [`index.md`](./index.md) | This file — master index |
| [`principles.md`](./principles.md) | Core design principles (14 principles) |
| [`architecture.md`](./architecture.md) | System architecture: layers, routes, proxy.ts, import rules, technology stack |
| [`component-architecture.md`](./component-architecture.md) | Component tree with RSC/client boundaries, ChatShell decomposition |
| [`state-management.md`](./state-management.md) | State topology, scoped providers as siblings, artifact store |
| [`data-flow.md`](./data-flow.md) | Data fetching, mutations, revalidation matrix |
| [`domain-boundaries.md`](./domain-boundaries.md) | Feature boundaries, handler registry, inter-feature interfaces |
| [`streaming-architecture.md`](./streaming-architecture.md) | SSE flow, ChatStream parts, stream lifecycle |
| [`ai-integration.md`](./ai-integration.md) | Provider registry, tool system, model catalog, system prompt |
| [`directory-structure.md`](./directory-structure.md) | Complete ~193 file tree with artifact naming |
| [`naming-conventions.md`](./naming-conventions.md) | Unified naming conventions, artifact migration |
| [`cleanup-inventory.md`](./cleanup-inventory.md) | Credit/gateway removal (18 items), document→artifact renames (62 items) |
| [`phase-plan.md`](./phase-plan.md) | 125 tasks across 8 phases, ~210 files |

---

## Design Constraints (Non-Negotiable)

1. **Server components by default** — minimal client islands, no monolithic `'use client'` layouts
2. **`proxy.js` replaces `middleware.js`** — Next.js 16 convention
3. **Providers as siblings not nested** when they serve unrelated domains
4. **"artifact" everywhere** — no "document" naming in any file, type, function, variable
5. **No credit/gateway logic** — remove all usage tracking, quota checking, credit alerts
6. **Feature collocation** — all feature code in `features/[name]/`
7. **No God Components** — each component has ONE responsibility
8. **Revalidation after EVERY mutation** — never let RSC data go stale
9. **No SWR-as-state-store** — SWR for server data only, `useSyncExternalStore` for client state
10. **No `window.dispatchEvent`** for cross-feature communication

---

## Audit Findings Addressed

This redesign addresses all 53 findings from the four audit reports:

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 3 | All addressed — co-dependent, solved together |
| HIGH | 15 | All addressed |
| MEDIUM | 19 | All addressed |
| LOW | 6 | All addressed or documented as acceptable |

### The Three CRITICALs (Co-Dependent)

```
CRITICAL-1: ChatLayoutClient monolith → Server layout with client islands
CRITICAL-2: Chat God Component (14 responsibilities) → ChatShell + ChatSessionContext + focused hooks
CRITICAL-3: Zero revalidation strategy → updateTag/revalidateTag after every mutation
```

These three are co-dependent: fixing one without the others creates new inconsistencies. This redesign addresses all three simultaneously.

---

## Decision Hierarchy

```
Correctness → Architecture → Consistency → Performance → Speed
```

## Reuse Hierarchy

```
Reuse → Extend → Refactor → Create
```
