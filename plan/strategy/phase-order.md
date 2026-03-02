> **Updated per redesign audit (2026-03-01)**

# Phase Order & Dependencies

> Execution order, dependency graph, critical path, and parallelization opportunities.
> 125 tasks across 8 phases (P0–P7). ~210 files total.
> Reflects redesign decisions: ChatShell, proxy.ts, useSyncExternalStore, handler registry.

---

## 1. Dependency Graph

```
P0 Scaffold ─────────────────────────────────────────────────────┐
  │                                                                │
  ▼                                                                │
P1 Data Foundation ──────────────────────────────────────────┐    │
  │                                                            │    │
  ▼                                                            │    │
P2 Auth ─────────────────────────────────────────────────┐    │    │
  │                                                        │    │    │
  ▼                                                        │    │    │
P3 Chat Core ────────────────────────────────────────┐    │    │    │
  │                    │                               │    │    │    │
  ▼                    ▼                               │    │    │    │
P4 Artifacts      P5 Sidebar  ◄──── CAN PARALLEL    │    │    │    │
  │                    │                               │    │    │    │
  └────────┬───────────┘                               │    │    │    │
           ▼                                           │    │    │    │
         P6 Enhancements ────────────────────────┐    │    │    │    │
           │                                       │    │    │    │    │
           ▼                                       │    │    │    │    │
         P7 Polish                                │    │    │    │    │
                                                   │    │    │    │    │
                                            All must pass format/typecheck/lint
```

---

## 2. Phase Dependencies (Strict)

| Phase | Depends On | Reason |
|-------|-----------|--------|
| P0 Scaffold | — | First phase, no dependencies |
| P1 Data Foundation | P0 | Needs schema types, error types, config |
| P2 Auth | P1 | Needs DB client, cache client, user data access |
| P3 Chat Core | P2 | Needs auth session, data context, handler registry |
| P4 Artifacts | P3 | Needs chat tools, StreamBridge, handler registry, data stream pipeline |
| P5 Sidebar | P3 | Needs chat data, PendingChatsProvider context, title sync |
| P6 Enhancements | P4 + P5 | Needs all core features working for cross-feature wiring |
| P7 Polish | P6 | Needs all features complete for error boundaries and E2E tests |

---

## 3. Critical Path

The **critical path** determines the minimum total time:

```
P0 (Scaffold)      →  18 tasks, ~55 files
P1 (Data)          →  14 tasks, ~22 files
P2 (Auth)          →  9 tasks, ~14 files
P3 (Chat Core)     →  27 tasks, ~42 files
P4 (Artifacts)     →  18 tasks, ~28 files  ──┐
                                               ├──  P4 + P5 in parallel
P5 (Sidebar)       →  12 tasks, ~12 files  ──┘
P6 (Enhancements)  →  14 tasks, ~17 files
P7 (Polish)        →  13 tasks, ~20 files
```

**With parallelization (P4∥P5):** critical path is P0→P1→P2→P3→P4→P6→P7, ~18.75d.
**Without parallelization:** P0→P1→P2→P3→P4→P5→P6→P7, ~23d.

P5 (Sidebar) is off the critical path when P4 and P5 are parallelized, since P5 depends only on P3 (not P4). The sequential worst case is documented in `dependencies/critical-path.md`.

---

## 4. Parallelization Opportunities

### P4 ∥ P5 (After P3)

After Chat Core is complete, Artifacts and Sidebar can be built independently:

| P4 (Artifacts) | P5 (Sidebar) |
|-----------------|---------------|
| Artifact store (useSyncExternalStore) | PendingChatsProvider + operations |
| Handler registration (side-effect) | SidebarShell (SERVER, `'use cache'`) |
| Editors (text, code, sheet, image) | SidebarHistoryClient (SWR infinite) |
| Artifact panel + versions | SidebarHistoryItem + user nav |
| Artifact API route | History API route |

**No shared files** between P4 and P5 except:
- `features/chat/components/chat-shell.tsx` — P4 adds ArtifactPanel wiring, P5 adds PendingChats calls
- **Resolution**: P4 works on artifact panel (separate file), P5 works on PendingChatsProvider (separate file). Both modify `chat-shell.tsx` but in different sections (artifact rendering vs title updates). Merge at P5 completion.

### P6 Sub-Task Parallelism

The enhancement sub-tasks have minimal interdependencies:

```
Voting           ──── independent (Server Action + useOptimistic)
Models           ──── independent
Visibility       ──── independent (own feature module)
Upload           ──── independent
Weather UI       ──── independent
Health           ──── independent
```

**All can run in parallel.** Each touches different feature directories and files. The only shared modification is `multimodal-input.tsx` which gets file upload and model selector — these touch different sections of the component.

---

## 5. Phase Execution Table

| Phase | Tasks | Files (~) | Blocking? | Parallel With |
|-------|-------|-----------|-----------|---------------|
| P0 Scaffold | 18 | ~55 | Yes | — |
| P1 Data Foundation | 14 | ~22 | Yes | — |
| P2 Auth | 9 | ~14 | Yes | — |
| P3 Chat Core | 27 | ~42 | Yes | — |
| P4 Artifacts | 18 | ~28 | No | P5 |
| P5 Sidebar | 12 | ~12 | No | P4 |
| P6 Enhancements | 14 | ~17 | Yes (for P7) | Internal sub-tasks |
| P7 Polish | 13 | ~20 | — | — |
| **Total** | **125** | **~210** | | |

---

## 6. Checkpoint Gates

Each phase must pass its gate before any **dependent** phase begins:

| Gate | Required Checks | Blocks |
|------|-----------------|--------|
| G00 | `pnpm install` + `typecheck` + `lint` + `format` + `dev` starts, proxy.ts exports `proxy()` | P1 |
| G01 | Data functions type-check, DB connects, cache connects, `lib/data/artifact.ts` exists (NOT document.ts) | P2 |
| G02 | Login/register/guest works, session resolves, `proxy.ts` redirects unauthenticated | P3 |
| G03 | ChatShell ~60 lines, StreamBridge works, handler registry functional, send message → stream → display → persist | P4, P5 |
| G04 | Artifact store (useSyncExternalStore), all 4 handlers register, editors render, artifact naming verified | P6 (with P5) |
| G05 | SidebarShell SERVER with `'use cache'`, PendingChatsProvider works, single-channel title sync | P6 (with P4) |
| G06 | All secondary features work, voting via Server Actions + useOptimistic, no regressions | P7 |
| G07 | `pnpm build` succeeds, E2E suite passes, zero "document" identifiers, zero credit/gateway refs | Release |

---

## 7. Key Architectural Decisions (Enforced Throughout)

| Decision | Enforcement |
|----------|-------------|
| `proxy.ts` NOT `middleware.ts` | P0 creates it; P7 verifies no middleware.ts |
| "artifact" EVERYWHERE | Every task uses artifact naming; P7 grep verification |
| No credit/gateway/quota | No tasks create credit logic; P7 grep verification |
| Server layout + client islands | Chat layout is SERVER (P3); ChatShell is `'use client'` |
| ChatShell ~60 lines (not God Component) | P3 creates thin orchestrator; logic in hooks/pure functions |
| `useSyncExternalStore` for artifact state | P4 creates store; NOT SWR synthetic key |
| `updateTag`/`revalidateTag` after EVERY mutation | P1 creates utilities; every SA/RH uses them |
| Handler registry (dependency inversion) | P3 creates registry; P4 registers handlers; P3 tools consume |
| Providers scoped as siblings | Layout places SidebarProvider; page places ChatStreamProvider |
| Single-channel title delivery | P3 awaits title server-side; P5 receives via PendingChats.updateTitle() |
| Import boundaries enforced | P0 creates script; P7 runs verification |
| No mandatory barrel files | Direct imports throughout; one exception: handlers/index.ts |

---

## 8. Rollback Strategy

If a phase fails its gate:

| Scenario | Action |
|----------|--------|
| Phase fails typecheck | Fix in-phase (don't proceed) |
| Phase introduces regressions | Revert phase, investigate root cause |
| Phase is blocked by missing info | Stub the dependency, document the gap, proceed with stub |
| Parallel phases conflict on merge | Rebase the later-completing branch, resolve conflicts |

Each phase corresponds to a git branch:
- `scaffold/phase-00`
- `data/phase-01`
- `auth/phase-02`
- `chat/phase-03`
- `artifacts/phase-04`
- `sidebar/phase-05`
- `enhancements/phase-06`
- `polish/phase-07`

Merge into `main` only after gate passes.

---

## 9. Recommended Execution Pattern

### Solo Developer

Default order is P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7.
Parallelization is allowed where dependency graph permits (notably P4 and P5 after P3).

### Two Developers

```
Dev A: P0 → P1 → P2 → P3 → P4 ──────→ P6(abc) → P7
Dev B:                         (wait) → P5 → P6(def) → P7
```

---

## 10. Seam-to-Phase Coverage

Condensed mapping of integration seams (SEAM-001 through SEAM-040) to the phase that implements them. Every seam is verified in P7 via integration testing.

| Phase | Seams | Key Integration Points |
|-------|-------|------------------------|
| P0 Scaffold | SEAM-029 (Provider Assembly), SEAM-036 (`proxy.ts` Rate Limiting) | Root layout provider tree, proxy auth guard |
| P1 Data Foundation | SEAM-021 (Artifact Version Schema), SEAM-025 (Artifact Data Access), SEAM-033 (Cache-Through Helper) | Drizzle schema, `lib/data/artifact.ts`, `withCache` |
| P2 Auth | SEAM-001 (SessionProvider Injection), SEAM-002 (Auth State to UI), SEAM-003 (Guest→Auth Migration), SEAM-004 (`proxy.ts` Guest Token), SEAM-005 (Auth Callback) | Session resolution, guest bootstrap, proxy wiring |
| P3 Chat Core | SEAM-006 (Chat Send), SEAM-007 (ChatStreamProvider Pipeline), SEAM-008 (Message Rendering), SEAM-009 (`createArtifact` Tool), SEAM-010 (`updateArtifact` Tool), SEAM-011 (Suggestion Pipeline), SEAM-014 (Title Sync Single-Channel), SEAM-015 (Settings `useSyncExternalStore`), SEAM-016 (Error Display) | Streaming pipeline, handler registry, ChatShell orchestration |
| P4 Artifacts | SEAM-012 (Artifact Store `useSyncExternalStore`), SEAM-017 (Artifact Save), SEAM-019 (Artifact UI Shell), SEAM-020 (Artifact Action Bar), SEAM-023 (Artifact Version Navigation), SEAM-024 (Code Editor), SEAM-026 (Sheet Editor), SEAM-027 (Text/Image Editor), SEAM-028 (Artifact Close), SEAM-040 (Inline Artifact Preview) | Artifact store, editors, panel, StreamBridge→store |
| P5 Sidebar | SEAM-013 (PendingChatsProvider), SEAM-030 (Sidebar Toggle), SEAM-031 (History Item), SEAM-032 (History Pagination), SEAM-034 (Search/Filter) | SidebarShell SERVER, SWR infinite, PendingChatsProvider |
| P6 Enhancements | SEAM-018 (Vote Server Action), SEAM-022 (Visibility Toggle), SEAM-035 (Model Selector), SEAM-037 (Attachment Preview), SEAM-038 (Multimodal Tools), SEAM-039 (Theme Toggle) | Voting `useOptimistic`, model persistence, file upload |
| P7 Polish | All seams verified via integration testing | E2E suite covers every seam end-to-end |
```

Dev B joins at P5 (after P3 completes). P6 sub-tasks split between developers.

### Three+ Developers

```
Dev A: P0 → P1 → P2 → P3 → P4 → P7
Dev B:                    (wait) → P5 → P6(abc)
Dev C:                         (wait) → P6(def) → P7
```

P4, P5, and P6 sub-tasks distribute across developers after the critical path (P0-P3) completes.

---

## 11. Time Estimates by Complexity

| Phase | Complexity | Primary Risk | Time Estimate |
|-------|-----------|-------------|---------------|
| P0 | Low | proxy/auth edge setup + baseline config correctness | 1 day |
| P1 | Medium | data/cache/revalidation foundation alignment | 2 days |
| P2 | Medium | JWT validation + cookie security | 1.5 days |
| P3 | **High** | ChatShell decomposition + StreamBridge + handler registry pipeline | 4 days |
| P4 | **High** | useSyncExternalStore store + 4 editor types + handler registration | 3 days |
| P5 | Medium | PendingChatsProvider + SERVER sidebar with `'use cache'` | 2 days |
| P6 | Medium | Cross-feature integration, Server Action voting | 2.5 days |
| P7 | Low-Medium | Import boundary verification, artifact naming grep | 2 days |

**P3 is the riskiest phase.** It creates the ChatShell orchestrator, StreamBridge, ChatStreamProvider (split contexts with RAF batching), handler registry, and wires the complete streaming pipeline. Allocate extra time and test thoroughly.
