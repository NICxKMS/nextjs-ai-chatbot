> **Updated per redesign audit (2026-03-01)**

# Critical Path Analysis

> The longest sequential chain through the 125-task plan.
> Determines minimum calendar time to completion.
> Task IDs: P0-T01 through P7-T13. "artifact" naming throughout. No credit/gateway logic.
> proxy.ts (not middleware.ts). ChatShell + ChatSessionContext. useSyncExternalStore for artifact state.

---

## Critical Path

The critical path runs through **~30 tasks** across all 8 phases:

```
P0-T01 → T09 → T11 → T12 → T13 → T18
  → P1-T02 → T04 → T06 → T14
    → P2-T01 → T03 → T04 → T05 → T09
      → P3-T05 → T08 → T09 → T11 → T21 → T25 → T27
        ├─→ P4-T01 → T02 → T07 → T11 → T17 → T18
        └─→ P5-T02 → T05 → T08 → T11 → T12
              (P6 starts when G04 + G05 are both complete)
              → P6-T01 → T02 → T03 → T14
                → P7-T03 → T12 → T13
```

---

## Task-by-Task Critical Path Detail

| Step | Task | Title | Complexity | Duration | Cumulative |
|------|------|-------|-----------|----------|------------|
| 1 | P0-T01 | Project config | M | 0.5d | 0.5d |
| 2 | P0-T09 | Utility functions | S | 0.25d | 0.75d |
| 3 | P0-T11 | shadcn/ui components | M | 0.5d | 1.25d |
| 4 | P0-T12 | Shared components | M | 0.5d | 1.75d |
| 5 | P0-T13 | Root layout + global error | M | 0.5d | 2.25d |
| 6 | P0-T18 | Gate G00 | S | 0.25d | 2.5d |
| — | — | **P0 subtotal** | — | **2.5d** | — |
| 7 | P1-T02 | Cache client + keys | M | 0.5d | 3.0d |
| 8 | P1-T04 | Cache-through helper | S | 0.25d | 3.25d |
| 9 | P1-T06 | Chat data access | L | 1.0d | 4.25d |
| 10 | P1-T14 | Gate G01 | S | 0.25d | 4.5d |
| — | — | **P1 subtotal** | — | **2.0d** | — |
| 11 | P2-T01 | Session resolution | M | 0.5d | 5.0d |
| 12 | P2-T03 | Guest bootstrap | M | 0.5d | 5.5d |
| 13 | P2-T04 | Auth actions | M | 0.5d | 6.0d |
| 14 | P2-T05 | Auth form | L | 1.0d | 7.0d |
| 15 | P2-T09 | Gate G02 | S | 0.25d | 7.25d |
| — | — | **P2 subtotal** | — | **2.75d** | — |
| 16 | P3-T05 | Chat types + schemas | M | 0.5d | 7.75d |
| 17 | P3-T08 | ChatSessionContext | S | 0.25d | 8.0d |
| 18 | P3-T09 | Chat pure functions | M | 0.5d | 8.5d |
| 19 | P3-T11 | useChatSession hook | L | 1.0d | 9.5d |
| 20 | P3-T21 | ChatShell orchestrator (~60 lines) | L | 1.0d | 10.5d |
| 21 | P3-T25 | Chat pages (`use cache` + `cacheTag`) | M | 0.5d | 11.0d |
| 22 | P3-T27 | Gate G03 | S | 0.25d | 11.25d |
| — | — | **P3 subtotal** | — | **4.0d** | — |
| 23 | P4-T01 | Artifact types + schemas | M | 0.5d | 11.75d |
| 24 | P4-T02 | Artifact store (useSyncExternalStore) | L | 1.0d | 12.75d |
| 25 | P4-T07 | Text editor (TipTap) | L | 1.0d | 13.75d |
| 26 | P4-T11 | Artifact panel | L | 1.0d | 14.75d |
| 27 | P4-T17 | Wire artifact panel into ChatShell | M | 0.5d | 15.25d |
| 28 | P4-T18 | Gate G04 | S | 0.25d | 15.5d |
| — | — | **P4 subtotal** | — | **4.25d** | — |
| 29 | P5-T02 | PendingChatsProvider | L | 1.0d | 16.5d |
| 30 | P5-T05 | SidebarHistoryClient | L | 1.0d | 17.5d |
| 31 | P5-T08 | SidebarShell (SERVER, `use cache`) | L | 1.0d | 18.5d |
| 32 | P5-T11 | Wire sidebar into chat layout | L | 1.0d | 19.5d |
| 33 | P5-T12 | Gate G05 | S | 0.25d | 19.75d |
| — | — | **P5 subtotal** | — | **4.25d** | — |
| 34 | P6-T01 | Voting types + action | M | 0.5d | 20.25d |
| 35 | P6-T02 | VoteButtons + useVotes | M | 0.5d | 20.75d |
| 36 | P6-T03 | Wire voting into messages (VoteResolver) | M | 0.5d | 21.25d |
| 37 | P6-T14 | Gate G06 | S | 0.25d | 21.5d |
| — | — | **P6 subtotal** | — | **1.75d** | — |
| 38 | P7-T03 | Accessibility + keyboard nav | M | 0.5d | 22.0d |
| 39 | P7-T12 | Full build verification | M | 0.5d | 22.5d |
| 40 | P7-T13 | Gate G07 (final) | S | 0.25d | 22.75d |
| — | — | **P7 subtotal** | — | **1.25d** | — |

---

## Summary

| Metric | Value |
|--------|-------|
| **Critical path length** | ~40 steps (~30 tasks + gate overhead) |
| **Estimated duration** | **~22–23 working days** (depending on P4/P5 overlap efficiency) |
| **Tasks on critical path** | ~30 / 125 (24%) |
| **Longest phase on path** | P4 Artifacts (~4.25d) + P5 Sidebar (~4.25d) |
| **Shortest phase on path** | P7 Polish (1.25d) |

---

## Bottleneck Tasks

Tasks where delays have maximum downstream impact:

| Task | Title | Why It's a Bottleneck | Impact |
|------|-------|----------------------|--------|
| P0-T18 | Gate G00 | Blocks ALL of P1 + P2 | 6+ phases delayed |
| P1-T06 | Chat data access | Feeds P2 auth, P3 chat, P5 sidebar, P6 voting | 4 phases impacted |
| P1-T14 | Gate G01 | Blocks P2 + P3 entry | 5+ phases delayed |
| P3-T02 | System prompts + provider options | Required by P3-T09, P4-T04/T05 handlers | 2 phases impacted |
| P3-T21 | ChatShell orchestrator | Required by P3-T25, P4-T17, P5-T11 | 2 phases impacted |
| P4-T02 | Artifact store (useSyncExternalStore) | All editors + panel depend on it | P4 stalls |
| P4-T11 | Artifact panel | All editors converge here → blocks T17 | P4 stalls |
| P4-T17 | Wire artifacts into ChatShell | Last integration task before P4 gate | P6 start delayed (awaits G04+G05) |

---

## Risk Areas

| Risk | Phase | Mitigation |
|------|-------|------------|
| AI provider integration complexity | P3 | Start P3-T01 early; mock providers for testing |
| Pyodide loading / WASM setup | P4 | P4-T08 (code editor) is gated late; test Pyodide in isolation |
| TipTap + suggestions integration | P4 | P4-T07/T11 interaction can be prototyped early |
| ChatStreamProvider across features | P3→P4 | StreamBridge is shared; verify early |
| Auth guest-to-user migration | P2 | P2-T03 (guest bootstrap) is complex; test with real Supabase |
| useSyncExternalStore selector perf | P4 | P4-T02/T03 — verify selector granularity early |
| Gate tasks delay visibility | All | Run format/typecheck/lint incrementally, not just at gates |

---

## Parallelization Opportunities

Tasks NOT on the critical path that can run in parallel:

| Phase | Parallel Tasks | Max Parallelism |
|-------|---------------|-----------------|
| P0 | T06, T07, T08, T09, T10→T11→T12, T14–T17 | 5 tracks |
| P1 | T01, T03, T05, T07–T13 | 6 tracks |
| P2 | T02, T06, T07→T08 | 3 tracks |
| P3 | T03–T08, T10, T12–T20, T22–T24, T26 | 8+ tracks |
| P4 | T03, T05–T10, T12–T16 | 6+ tracks |
| P5 | T01, T03–T04, T06–T07, T09–T10 | 5 tracks |
| P6 | T04–T06, T07–T08, T09–T11, T12–T13 | 5 tracks |
| P7 | T01–T02, T04–T11 | 8 tracks |
