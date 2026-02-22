# Final Plan — Appendix

## 6. Dependency Map Summary

### Hard Gate Chain
- `P00-T09` gates all Phase 01 tasks
- `P01-T08` gates all Phase 02 tasks
- `P02-T07` gates all Phase 03 tasks
- `P03-T11` gates all Phase 04 tasks
- `P04-T07` gates all Phase 05 tasks
- `P05-T08` gates all Phase 06 tasks

### Graph Topology
- **Structure:** DAG (cycle-free)
- **Pattern:** Strict serial phases with internal parallelism
- **Containment:** No cross-phase bypass edges

### High Fan-In Nodes (Risk)
- `P01-T08` — 4 internal producers
- `P00-T08`, `P02-T07`, `P03-T10`, `P05-T08`, `P06-T08` — 3-prerequisite convergence
- `P03-T11` — depends on high-risk predecessors P03-T07 and P03-T10

### High Fan-Out Nodes
- Phase gates: P00-T09, P01-T08, P02-T07, P03-T11, P04-T07, P05-T08
- Internal hubs: P03-T03, P05-T01, P06-T01

### High-Risk Predecessor Control
- P03-T07, P03-T09 (Phase 03) — require explicit acceptance evidence before P03-T11
- P05-T06 (Phase 05) — must be complete and fixture-verified before P05-T08

---

## 7. UI Parity Validation Summary

### Coverage Status
- **Total checklist items:** 21
- **Fully covered:** 21
- **Partially covered:** 0
- **Zero coverage:** 0
- **Coverage score:** 100%
- **Release standard:** final UI/UX must be same as oldapp or improved, with zero regressions

### Checklist-to-Task Evidence (Condensed)
| Area | Tasks |
|------|-------|
| Root Layout and Providers | P01-T04, P04-T05 |
| Global Error Surface | P01-T03 |
| Chat Layout, New Chat, Existing Chat | P03-T01–T03, P04-T05, P00-T04, P05-T02, P06-T02 |
| Chat Loading and Error Routes | P06-T05 |
| Login/Register Screens | P05-T04 |
| Responsive and Accessibility | P04-T04, P04-T05, P06-T05 |
| Message List, Bubble, Parts | P00-T06, P02-T04, P03-T02–T03, P03-T08, P06-T05 |
| Multimodal Composer | P02-T06, P03-T01, P03-T06, P03-T09 |
| Model and Visibility Selection | P01-T02, P03-T04, P04-T02 |
| Sidebar, History, User Menu | P02-T02, P03-T10, P04-T05, P05-T03 |
| Artifact Panel, Documents, Toolbar | P03-T05, P03-T07, P04-T03, P05-T06, P06-T03 |
| Settings Sheet | P04-T02 |
| Toast System | P04-T07 |

### Remediation
- No unmapped items; no partial-coverage risk in task definitions.
- Treat task acceptance lines as non-optional during implementation and Phase 06 verification.
- Treat any UI/UX regression as release-blocking until corrected.
