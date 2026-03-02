> **Updated per redesign audit (2026-03-01)**

# Traceability Proof

> Complete coverage verification: 20 features (20 full), 40 seams, 125 tasks, critical path analysis — updated with redesign task IDs and patterns.

---

## Feature Coverage — 20 Features (20 Full)

| # | Feature | Phase(s) | Task Count | Status |
|---|---------|----------|-----------|--------|
| 1 | Chat messaging (send, receive, stream) | P3 | 16 | ✅ Full |
| 2 | Auth (login, register, guest) | P1, P2 | 9 | ✅ Full |
| 3 | Chat history / sidebar | P5 | 11 | ✅ Full |
| 4 | Artifacts (text, code, image, sheet) | P4 | 14 | ✅ Full |
| 5 | Artifact versioning | P4 | 2 | ✅ Full |
| 6 | Artifact suggestions | P4 | 1 | ✅ Full |
| 7 | Message voting (Server Action + VoteResolver) | P1, P6 | 4 | ✅ Full |
| 8 | File upload | P6 | 3 | ✅ Full |
| 9 | Model selection | P3, P6 | 3 | ✅ Full |
| 10 | Chat visibility (own feature module) | P6 | 3 | ✅ Full |
| 11 | Settings (`useSyncExternalStore` + localStorage) | P3 | 2 | ✅ Full |
| 12 | Weather tool | P3, P6 | 2 | ✅ Full |
| 13 | Title generation (single-channel delivery) | P3, P5 | 2 | ✅ Full |
| 14 | Message actions (copy, edit, delete) | P3 | 2 | ✅ Full |
| 15 | Suggested actions | P3 | 1 | ✅ Full |
| 16 | Data streaming (ChatStreamProvider + StreamBridge) | P3 | 2 | ✅ Full |
| 17 | Error handling (boundaries) | P0, P3, P4, P7 | 6 | ✅ Full |
| 18 | Reconnection / resilience | P3, P7 | 3 | ✅ Full |
| 19 | Theme switching | P0, P5 | 2 | ✅ Full |
| 20 | Import boundary enforcement | P0, P7 | 2 | ✅ Full |

> **Standalone:** Health check (P6-T13) — tracked separately, not a numbered feature.

---

## Traceability Gap Resolution

All gaps from original plan are resolved. Redesign-specific resolutions:

| Gap | Severity | Resolution | Status | Task |
|-----|----------|------------|--------|------|
| Reconnection / resilience | Medium | Covered by `useChat` built-in reconnection + error boundaries + offline UX handling in polish | ✅ Resolved | P3-T11, P7-T03 |
| URL query auto-send (`?q=`) | Low | Handled in `useChatSession` URL state logic | P3-T11 |
| Credit/usage alert UI | N/A | **Removed entirely** — no credit/gateway/quota logic | — |
| AutoScroll setting wire | Low | Absorbed into `use-scroll-to-bottom.ts` | P3-T12 |

---

## Seam Coverage — 40 Seams (100%)

| Category | Seams | Count | Tasks Covering | Status |
|----------|-------|-------|----------------|--------|
| Authentication & Session | SEAM-001..005 | 5 | 6 | ✅ |
| Chat Streaming | SEAM-006..008 | 3 | 5 | ✅ |
| Chat ↔ Artifacts | SEAM-009..012 | 4 | 6 | ✅ |
| Chat ↔ Sidebar | SEAM-013..014 | 2 | 4 | ✅ |
| Settings ↔ Chat | SEAM-015 | 1 | 3 | ✅ |
| Model Selection | SEAM-016..017 | 2 | 5 | ✅ |
| Voting | SEAM-018 | 1 | 3 | ✅ |
| File Upload | SEAM-019 | 1 | 3 | ✅ |
| Sidebar History | SEAM-020 | 1 | 2 | ✅ |
| Artifact Fetch | SEAM-021 | 1 | 1 | ✅ |
| Visibility | SEAM-022 | 1 | 3 | ✅ |
| Data Layer | SEAM-023..026 | 4 | 5 | ✅ |
| Error Handling | SEAM-027..028 | 2 | 4 | ✅ |
| UI Infrastructure | SEAM-029..031 | 3 | 6 | ✅ |
| Artifact Editors | SEAM-032..035 | 4 | 4 | ✅ |
| Miscellaneous | SEAM-036..040 | 5 | 6 | ✅ |
| **Total** | **SEAM-001..040** | **40** | **65 task refs** | **✅ 100%** |

---

## Task Count by Phase

| Phase | Title | Tasks | Seams | Est. Duration |
|-------|-------|-------|-------|---------------|
| P0 | Scaffold & Infrastructure | 18 | 0 (foundation) | ~2.5 days |
| P1 | Data Foundation | 14 | 5 | ~2 days |
| P2 | Auth Vertical | 9 | 5 | ~2.75 days |
| P3 | Chat Core Vertical | 27 | 8 | ~4 days |
| P4 | Artifacts Vertical | 18 | 13 | ~4.25 days |
| P5 | Sidebar & Navigation | 12 | 4 | ~4.25 days |
| P6 | Enhancements | 14 | 6 | ~1.75 days |
| P7 | Polish & Production | 13 | 1 | ~1.25 days |
| **Total** | | **125** | **40** | **~23 days** |

---

## Task Type Distribution

| Type | Count | Percentage |
|------|-------|-----------|
| IMPL | 97 | 78% |
| VERIFY | 13 | 10% |
| INTEG | 9 | 7% |
| SCAFFOLD | 6 | 5% |

---

## Complexity Distribution

| Complexity | Count | Percentage |
|-----------|-------|-----------|
| Small (S) | 26 | 21% |
| Medium (M) | 62 | 50% |
| Large (L) | 37 | 29% |

---

## Critical Path

The critical path runs through key tasks across all 8 phases:

```
P0 (scaffold) → P1 (data) → P2 (auth) → P3 (chat core) → P4 (artifacts) → P5 (sidebar) → P6 (enhancements) → P7 (polish)
```

| Metric | Value |
|--------|-------|
| Critical path length | ~30 tasks |
| Estimated sequential duration | ~23 working days |
| Longest phase on path | P4 Artifacts + P5 Sidebar (~4.25d each) |
| Shortest phase on path | P7 Polish (~1.25d) |
| Parallelizable (P4 ∥ P5 start) | Saves ~1 day |

### Bottleneck Tasks

| Task | Why | Impact |
|------|-----|--------|
| P0-T18 (Gate G00) | Blocks all subsequent phases | 7 phases delayed |
| P1-T06 (Chat data) | Feeds auth, chat, sidebar, voting | 4 phases impacted |
| P1-T12 (AI provider wrapper) | Required by completion, all handlers | 2 phases impacted |
| P3-T11 (`useChatSession`) | Central integration point — `useChat` config + callbacks | 2 phases impacted |
| P3-T04 (Handler registry) | All 4 artifact handlers depend on it | P4 stalls |
| P4-T02 (Artifact store) | All editors + panel depend on `useSyncExternalStore` | P4 stalls |

---

## Verification Gates

| Gate | Phase | Required Checks |
|------|-------|----------------|
| G00 | P0 | `pnpm install` + `typecheck` + `lint` + `dev` starts |
| G01 | P1 | Data functions type-correct, DB connects, cache connects |
| G02 | P2 | Login/register/guest works E2E, session resolves |
| G03 | P3 | Send message → stream → display → persist; ChatShell ~60 lines |
| G04 | P4 | AI creates artifact, user edits, versions work; `useSyncExternalStore` in use |
| G05 | P5 | Sidebar server-renders initial load, pagination works, single-channel title |
| G06 | P6 | Voting via Server Action + VoteResolver; visibility as own module |
| G07 | P7 | `pnpm build` + E2E pass + import boundaries + naming grep clean |

---

## Key Redesign Naming Changes

| Old Name | New Name | Scope |
|----------|----------|-------|
| OptimisticChatsProvider | PendingChatsProvider | P5 |
| DataStreamProvider | ChatStreamProvider | P3 |
| DataStreamHandler | StreamBridge | P3 |
| AuthProvider | SessionProvider | P2 |
| VoteHydrator | VoteResolver | P6 |
| ChatContext | ChatSessionContext | P3 |
| useChatContext | useChatSessionContext | P3 |
| documentId | artifactId | All phases |
| SettingsProvider | Removed (useSyncExternalStore) | P3 |
| document (artifact) | artifact | All phases |
| createDocument | createArtifact | P3, P4 |
| updateDocument | updateArtifact | P3, P4 |
| middleware.ts | proxy.ts | P0 |
| DocumentHandler | ArtifactHandler | P4 |
| DocumentKind | ArtifactKind | P4 |

---

## Source References

| Document | Location |
|----------|----------|
| Phase plan (authoritative) | `../../plan-archives/redesign/phase-plan.md` |
| AI integration | `../../plan-archives/redesign/ai-integration.md` |
| Streaming architecture | `../../plan-archives/redesign/streaming-architecture.md` |
| Component architecture | `../../plan-archives/redesign/component-architecture.md` |
| Architecture overview | `../../plan-archives/redesign/architecture.md` |
| State management | `../../plan-archives/redesign/state-management.md` |
| Data flow | `../../plan-archives/redesign/data-flow.md` |
| Domain boundaries | `../../plan-archives/redesign/domain-boundaries.md` |
| Directory structure | `../../plan-archives/redesign/directory-structure.md` |
| Naming conventions | `../../plan-archives/redesign/naming-conventions.md` |
| Cleanup inventory | `../../plan-archives/redesign/cleanup-inventory.md` |
| Principles | `../../plan-archives/redesign/principles.md` |
| Redesign index | `../../plan-archives/redesign/index.md` |
| Redesign audit | `../../plan-archives/plan_review/redesign-reaudit.md` |
