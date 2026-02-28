# Final Rebuild Plan — Master Index

> ai-assistant · Next.js AI chatbot rebuild with multi-model support, artifact management, and real-time streaming.

---

## Plan Documents

| # | File | Description |
|---|------|-------------|
| 1 | [preamble.md](preamble.md) | Plan overview, key decisions, deviations, risks, success criteria |
| 2 | [ai-migration-guide.md](ai-migration-guide.md) | AI layer copy manifest, wrapper mapping, import rules, SDK patterns |
| 3 | [phase-00-plan.md](phase-00-plan.md) | P00 — Project Scaffold & Foundation |
| 4 | [phase-01-plan.md](phase-01-plan.md) | P01 — Data Foundation |
| 5 | [phase-02-plan.md](phase-02-plan.md) | P02 — Authentication |
| 6 | [phase-03-plan.md](phase-03-plan.md) | P03 — Chat Core |
| 7 | [phase-04-plan.md](phase-04-plan.md) | P04 — Artifacts |
| 8 | [phase-05-plan.md](phase-05-plan.md) | P05 — Sidebar & History |
| 9 | [phase-06-plan.md](phase-06-plan.md) | P06 — Enhancements |
| 10 | [phase-07-plan.md](phase-07-plan.md) | P07 — Polish & Production |
| 11 | [integration-summary.md](integration-summary.md) | All 40 seams, data flow, provider tree, API routes |
| 12 | [traceability-proof.md](traceability-proof.md) | Feature coverage 20/20, seam coverage 40/40, task totals, critical path |

---

## Source Documents (in `/plan/`)

| Directory | Contents |
|-----------|----------|
| `architecture/` | decisions.md, conventions.md, improvements.md, patterns.md, spec-analysis.md |
| `behavioral_extraction/` | features.md, interactions.md, edge-cases.md |
| `dependencies/` | critical-path.md, dependency-graph.md |
| `deviations/` | deviations-01.md, index.md |
| `integration_map/` | seam-inventory.md, data-flow.md |
| `phases/` | p00-scaffold.md through p07-polish.md, index.md |
| `scaffold/` | directory-structure.md |
| `strategy/` | approach.md, phase-order.md, vertical-slices.md |
| `traceability/` | feature-to-task.md, seam-to-task.md, uncovered-features.md |
| `ui_parity/` | ai-elements-manifest.md |

---

## Quick Stats

| Metric | Value |
|--------|-------|
| Total phases | 8 (P00–P07) |
| Total tasks | 136 |
| Integration seams | 40 |
| Features covered | 20/20 (100%) |
| Estimated duration | ~19.5 working days |
| Critical path tasks | 32 |
| AI elements to copy | 31 files, 4881 LOC |
| Architectural deviations | 10 |
