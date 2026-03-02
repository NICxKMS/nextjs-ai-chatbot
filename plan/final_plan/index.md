> **Updated per redesign audit (2026-03-01)**

# Final Rebuild Plan — Master Index

> ai-assistant · Next.js AI chatbot rebuild with multi-model support, artifact management, and real-time streaming.
> Server layouts + client islands. ChatShell + ChatSessionContext. `useSyncExternalStore` for artifact state.
> `proxy.ts` (not middleware.ts). "artifact" naming throughout. No credit/gateway logic.

---

## Plan Documents

| # | File | Description |
|---|------|-------------|
| 1 | [preamble.md](preamble.md) | Plan overview, key decisions, deviations, risks, success criteria |
| 2 | [ai-migration-guide.md](ai-migration-guide.md) | AI layer copy manifest, wrapper mapping, import rules, SDK patterns |
| 3 | [phase-00-plan.md](phase-00-plan.md) | P0 — Scaffold & Infrastructure |
| 4 | [phase-01-plan.md](phase-01-plan.md) | P1 — Data Foundation |
| 5 | [phase-02-plan.md](phase-02-plan.md) | P2 — Auth Vertical |
| 6 | [phase-03-plan.md](phase-03-plan.md) | P3 — Chat Core Vertical |
| 7 | [phase-04-plan.md](phase-04-plan.md) | P4 — Artifacts Vertical |
| 8 | [phase-05-plan.md](phase-05-plan.md) | P5 — Sidebar & Navigation |
| 9 | [phase-06-plan.md](phase-06-plan.md) | P6 — Enhancements |
| 10 | [phase-07-plan.md](phase-07-plan.md) | P7 — Polish & Production |
| 11 | [integration-summary.md](integration-summary.md) | All integration seams, data flow, provider tree, API routes |
| 12 | [traceability-proof.md](traceability-proof.md) | Feature coverage, seam coverage, task totals, critical path |

---

## Source Documents (in `/plan/`)

| Directory | Contents |
|-----------|----------|
| `architecture/` | decisions.md, conventions.md, improvements.md, patterns.md, spec-analysis.md |
| `behavioral_extraction/` | features.md, api-contracts.md, data-flows.md, edge-cases.md |
| `dependencies/` | critical-path.md, graph.md |
| `deviations/` | deviations-01.md, index.md |
| `integration_map/` | seam-inventory.md, data-flow-chains-01.md, data-flow-chains-02.md |
| `phases/` | p00-scaffold.md through p07-polish.md, index.md |
| `scaffold/` | base-config.md, directory-structure.md, shared-types.md |
| `strategy/` | approach.md, phase-order.md, vertical-slices.md |
| `traceability/` | feature-to-task.md, seam-to-task.md, uncovered-features.md |
| `ui_parity/` | accessibility.md, components-01.md, components-02.md, interactions.md, screens.md |

---

## Redesign Documents (in `../../plan-archives/redesign/`)

Full source index: [`../../plan-archives/redesign/index.md`](../../plan-archives/redesign/index.md)

| File | Contents |
|------|----------|
| `architecture.md` | Three-layer architecture, directory structure, proxy.ts, request/data flow, caching strategy |
| `principles.md` | 14 core design principles governing every decision |
| `phase-plan.md` | Authoritative 125-task execution plan across 8 phases |
| `component-architecture.md` | ChatShell decomposition, provider scoping, artifact store |
| `streaming-architecture.md` | ChatStreamProvider, StreamBridge, processStreamDelta |
| `state-management.md` | useSyncExternalStore, PendingChatsProvider, settings via localStorage |
| `data-flow.md` | Server fetch → client hydrate → real-time streaming |
| `domain-boundaries.md` | Feature module boundaries, cross-feature contracts |
| `naming-conventions.md` | Artifact naming, provider renames, component renames |

---

## Quick Stats

| Metric | Value |
|--------|-------|
| Total phases | 8 (P0–P7) |
| Total tasks | 125 |
| Estimated files | ~210 |
| Features covered | 20/20 (100%) |
| Decision hierarchy | Correctness → Architecture → Consistency → Performance → Speed |
| Reuse hierarchy | Reuse → Extend → Refactor → Create |
| Key patterns | Server layouts + client islands, ChatShell + ChatSessionContext, useSyncExternalStore |
| Naming | "artifact" everywhere (zero "document" in code identifiers) |
