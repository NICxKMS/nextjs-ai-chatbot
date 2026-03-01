# Critical Path Analysis

> The longest sequential chain through the 135-task plan.
> Determines minimum calendar time to completion.

---

## Critical Path

The critical path runs through **32 tasks** across all 8 phases:

```
P00-T01 → T02 → T03 → T04 → T05 → T17
  → P01-T03 → T04 → T07 → T16
    → P02-T01 → T03 → T04 → T06 → T09 → T12
      → P03-T01 → T02 → T07 → T09 → T19 → T22 → T24
        → P04-T01 → T04 → T05 → T09 → T17 → T21 → T22
          → P05-T01 → T05 → T06 → T10 → T12
            → P06-T01 → T02 → T03 → T18
              → P07-T05 → T12 → T13 → T14
```

---

## Task-by-Task Critical Path Detail

| Step | Task | Title | Complexity | Duration | Cumulative |
|------|------|-------|-----------|----------|------------|
| 1 | P00-T01 | Project root | M | 0.5d | 0.5d |
| 2 | P00-T02 | Biome config | S | 0.25d | 0.75d |
| 3 | P00-T03 | Next.js config | M | 0.5d | 1.25d |
| 4 | P00-T04 | Root layout shell | M | 0.5d | 1.75d |
| 5 | P00-T05 | App shell (providers) | M | 0.5d | 2.25d |
| 6 | P00-T17 | Gate G00 | S | 0.25d | 2.5d |
| — | — | **P00 subtotal** | — | **2.5d** | — |
| 7 | P01-T03 | Cache framework | M | 0.5d | 3.0d |
| 8 | P01-T04 | Cache operations | M | 0.5d | 3.5d |
| 9 | P01-T07 | Chat data functions | L | 1.0d | 4.5d |
| 10 | P01-T16 | Gate G01 | S | 0.25d | 4.75d |
| — | — | **P01 subtotal** | — | **2.25d** | — |
| 11 | P02-T01 | Session resolution | M | 0.5d | 5.25d |
| 12 | P02-T03 | Token exchange | M | 0.5d | 5.75d |
| 13 | P02-T04 | Login/register actions | M | 0.5d | 6.25d |
| 14 | P02-T06 | Auth form component | L | 1.0d | 7.25d |
| 15 | P02-T09 | Auth pages | M | 0.5d | 7.75d |
| 16 | P02-T12 | Gate G02 | S | 0.25d | 8.0d |
| — | — | **P02 subtotal** | — | **3.25d** | — |
| 17 | P03-T01 | AI provider registry | L | 1.0d | 9.0d |
| 18 | P03-T02 | AI provider wrapper | L | 1.0d | 10.0d |
| 19 | P03-T07 | Chat completion logic | L | 1.0d | 11.0d |
| 20 | P03-T09 | Stream chat action | L | 1.0d | 12.0d |
| 21 | P03-T19 | Chat orchestrator | L | 1.0d | 13.0d |
| 22 | P03-T22 | Chat pages | M | 0.5d | 13.5d |
| 23 | P03-T24 | Gate G03 | S | 0.25d | 13.75d |
| — | — | **P03 subtotal** | — | **5.75d** | — |
| 24 | P04-T01 | Artifact types | M | 0.5d | 14.25d |
| 25 | P04-T04 | Handler factory | L | 1.0d | 15.25d |
| 26 | P04-T05 | Text handler | M | 0.5d | 15.75d |
| 27 | P04-T09 | Wire createDocument | L | 1.0d | 16.75d |
| 28 | P04-T17 | Artifact panel | L | 1.0d | 17.75d |
| 29 | P04-T21 | Wire into chat | L | 1.0d | 18.75d |
| 30 | P04-T22 | Gate G04 | S | 0.25d | 19.0d |
| — | — | **P04 subtotal** | — | **5.25d** | — |
| 31 | P05-T01 | Optimistic chats | L | 1.0d | 20.0d |
| 32 | P05-T05 | History list | L | 1.0d | 21.0d |
| 33 | P05-T06 | App sidebar shell | M | 0.5d | 21.5d |
| 34 | P05-T10 | Wire sidebar | L | 1.0d | 22.5d |
| 35 | P05-T12 | Gate G05 | S | 0.25d | 22.75d |
| — | — | **P05 subtotal** | — | **3.75d** | — |
| 36 | P06-T01 | Vote data module | M | 0.5d | 23.25d |
| 37 | P06-T02 | Vote API route | M | 0.5d | 23.75d |
| 38 | P06-T03 | Vote UI component | M | 0.5d | 24.25d |
| 39 | P06-T18 | Gate G06 | S | 0.25d | 24.5d |
| — | — | **P06 subtotal** | — | **1.75d** | — |
| 40 | P07-T05 | A11y audit | M | 0.5d | 25.0d |
| 41 | P07-T12 | Build verification | M | 0.5d | 25.5d |
| 42 | P07-T13 | Integration test | L | 1.0d | 26.5d |
| 43 | P07-T14 | Gate G07 (final) | S | 0.25d | 26.75d |
| — | — | **P07 subtotal** | — | **2.25d** | — |

---

## Summary

| Metric | Value |
|--------|-------|
| **Critical path length** | 43 steps (32 tasks + gate overhead) |
| **Estimated duration** | **~27 working days** |
| **Tasks on critical path** | 32 / 135 (24%) |
| **Longest phase on path** | P03 Chat Core (5.75d) |
| **Shortest phase on path** | P06 Enhancements (1.75d) |

---

## Bottleneck Tasks

Tasks where delays have maximum downstream impact:

| Task | Title | Why It's a Bottleneck | Impact |
|------|-------|----------------------|--------|
| P00-T17 | Gate G00 | Blocks ALL of P01 + P02 | 6+ phases delayed |
| P01-T07 | Chat data functions | Feeds P02 auth, P03 chat, P05 sidebar, P06 voting | 4 phases impacted |
| P01-T16 | Gate G01 | Blocks P02 + P03 entry | 5+ phases delayed |
| P03-T02 | AI provider wrapper | Required by P03-T07, P04-T05/T06/T07, T11 | 2 phases impacted |
| P03-T19 | Chat orchestrator | Required by P03-T22, P04-T21, P05-T08 | 2 phases impacted |
| P04-T04 | Handler factory | All 4 handlers depend on it | P04 stalls |
| P04-T17 | Artifact panel | All editors converge here → blocks T21 | P04 stalls |
| P04-T21 | Wire artifacts | Last integration task before P04 gate | P05 delayed |

---

## Risk Areas

| Risk | Phase | Mitigation |
|------|-------|------------|
| AI provider integration complexity | P03 | Start T01 early; mock providers for testing |
| Pyodide loading / WASM setup | P04 | T21 is gated late; test Pyodide in isolation |
| TipTap + suggestions integration | P04 | T12 + T11 interaction can be prototyped early |
| DataStream protocol across features | P03→P04 | T12 (DataStream) is shared; verify early |
| Auth guest-to-user migration | P02 | T03 (exchange) is complex; test with real Supabase |
| Gate tasks delay visibility | All | Run format/typecheck/lint incrementally, not just at gates |

---

## Parallelization Opportunities

Tasks NOT on the critical path that can run in parallel:

| Phase | Parallel Tasks | Max Parallelism |
|-------|---------------|-----------------|
| P00 | T06, T07→T08, T09, T10→T11→T12/T13, T14-T16 | 5 tracks |
| P01 | T01→T02, T05, T11, T12, T13, T14 | 6 tracks |
| P02 | T02, T05, T07→T11, T08→T10 | 4 tracks |
| P03 | T03-T06, T08, T10-T18, T20-T21, T23 | 8+ tracks |
| P04 | T02-T03, T06-T08, T10-T16, T18-T20 | 6+ tracks |
| P05 | T02-T04, T07, T08, T11 | 5 tracks |
| P06 | T04-T06, T07-T08, T09-T11, T12-T14, T15-T17 | 5 tracks |
| P07 | T01-T04, T06-T11 | 8 tracks |
