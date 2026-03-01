# Audit: `plan/phases/` Completeness

**Date:** 2026-03-01
**Scope:** Verify (1) all redesign improvements ported into `plan/phases/`, (2) no valuable old plan content lost.
**Sources compared:**

- **OLD** = `oldplan-before-redesign/phases/{file}`
- **NEW** = `plan/phases/{file}`
- **REDESIGN** = `redesign/phase-plan.md` + `redesign/architecture.md` + `redesign/component-architecture.md` + `redesign/streaming-architecture.md`

---

## Summary Table

| File | Redesign Gaps | Old Plan Losses | Verdict |
| --- | --- | --- | --- |
| `index.md` | None | 3 seams dropped (justified) | **COMPLETE** |
| `p00-scaffold.md` | None | Tasks restructured, nothing valuable lost | **COMPLETE** |
| `p01-data-foundation.md` | None | 2 tasks consolidated (rate-limit, API utils) | **COMPLETE** |
| `p02-auth.md` | None | 3 tasks consolidated into proxy/SessionProvider | **COMPLETE** |
| `p03-chat-core.md` | None | Net gain of 3 tasks; settings moved here from P06 | **COMPLETE** |
| `p04-artifacts.md` | None | 4 tasks consolidated; 3 seams dropped | **COMPLETE** |
| `p05-sidebar.md` | None | Same count, content fully updated | **COMPLETE** |
| `p06-enhancements.md` | None | 4 tasks removed (voting API, settings, toolbar, toast) — all justified | **COMPLETE** |
| `p07-polish.md` | None | 2 tasks dropped without redesign replacement | **MINOR_GAPS** |

**Overall Verdict: COMPLETE with 2 minor advisory items in P07**

---

## Task Count Reconciliation

| Phase | Old Plan | Redesign Spec | New Plan | Match? |
| --- | --- | --- | --- | --- |
| P00 — Scaffold | 17 | 18 | 18 | ✅ |
| P01 — Data Foundation | 16 | 14 | 14 | ✅ |
| P02 — Auth | 12 | 9 | 9 | ✅ |
| P03 — Chat Core | 24 | 27 | 27 | ✅ |
| P04 — Artifacts | 22 | 18 | 18 | ✅ |
| P05 — Sidebar | 12 | 12 | 12 | ✅ |
| P06 — Enhancements | 18 | 14 | 14 | ✅ |
| P07 — Polish | 15 | 13 | 13 | ✅ |
| **Total** | **136** | **125** | **125** | ✅ |

All 125 tasks from the redesign spec are present in the new plan. Task ID ranges match exactly.

---

## Naming Convention Verification

All redesign naming changes are present throughout `plan/phases/`:

| Old Name | Redesign Name | Present in New Plan? |
| --- | --- | --- |
| `OptimisticChatsProvider` | `PendingChatsProvider` | ✅ (P05-T02) |
| `DataStreamProvider` | `ChatStreamProvider` | ✅ (P03-T10) |
| `DataStreamHandler` | `StreamBridge` | ✅ (P03-T20, ~20 lines) |
| `AuthProvider` | `SessionProvider` | ✅ (P02-T06) |
| `VoteHydrator` | `VoteResolver` | ✅ (P06-T03) |
| `ChatContext` | `ChatSessionContext` | ✅ (P03-T08) |
| `documentId` | `artifactId` | ✅ (throughout P04) |
| `middleware.ts` | `proxy.ts` | ✅ (P00-T14) |
| `DocumentKind` | `ArtifactKind` | ✅ (P00-T06, P04) |
| `createDocument` | `createArtifact` | ✅ (P03-T18) |
| `updateDocument` | `updateArtifact` | ✅ (P03-T19) |
| `document-preview` | `artifact-preview` | ✅ (P04-T14) |
| `SettingsProvider` (removed) | `useSyncExternalStore` | ✅ (P03-T06) |
| `document.ts` (data layer) | `artifact.ts` | ✅ (P01-T08) |
| barrel `index.ts` exports | separate file imports | ✅ (P00-T09) |
| `app-shell.tsx` wrapper | server layout composition | ✅ (P00-T13) |
| `ACTIVATE_GATEWAY` / credit codes | removed entirely | ✅ (P00-T08, P07-T11) |

No old naming found in any new plan file.

---

## Per-File Detailed Analysis

### 1. `index.md`

**Redesign gaps:** None. Phase descriptions, task counts, and cross-references all match the redesign spec.

**Old plan losses:**
- Old plan listed 41 seams across phases; new plan lists 38.
- Missing seams: **SEAM-037**, **SEAM-039**, **SEAM-040** (all were in P04).
- These were artifact-specific integration seams (console↔artifact, diffview↔artifact, suggestions↔artifact) that were consolidated when the artifact phase was simplified from 22→18 tasks.
- **Justified:** The functionality these seams represented is still covered by the consolidated P04 tasks; only the separate seam tracking was removed.

**Verdict: COMPLETE**

---

### 2. `p00-scaffold.md`

**Redesign gaps:** None. All 18 tasks (P00-T01 through P00-T18) match the redesign spec exactly.

**Key redesign improvements verified:**
- P00-T04: Drizzle schema uses `Artifact` table (not `Document`), includes `lib/db/client.ts`
- P00-T05/T06/T07: Shared types split into purpose-specific files (`result.types`, `data-context.types`, `model.types`, `artifact.types`, `pending-chats.types`) instead of barrel `index.ts`
- P00-T08: Enum stubs explicitly exclude `ACTIVATE_GATEWAY` and credit codes
- P00-T12: No `app-shell.tsx`, adds `toaster.tsx`, SessionProvider deferred to P02
- P00-T13: Server layout (`app/layout.tsx`) with no `'use client'`, no `AppShell` wrapper
- P00-T14: `proxy.ts` (not `middleware.ts`)
- P00-T17: Import boundary script moved here from P07 (earlier enforcement)

**Old plan losses:**
- Old P00-T04 (`app-shell.tsx` creation) → replaced by server layout composition. **Correct.**
- Old P00-T06 (directory skeleton) → implicit in task outputs. **Correct.**
- Old P00-T12 (copy 31 ai-elements files) → removed entirely per redesign architecture. **Correct.**
- Old `head.tsx` → removed (viewport metadata handled via `metadata` export in Next.js 16). **Correct.**

**Verdict: COMPLETE**

---

### 3. `p01-data-foundation.md`

**Redesign gaps:** None. All 14 tasks (P01-T01 through P01-T14) match redesign exactly.

**Key redesign improvements verified:**
- P01-T03: Revalidation utilities use `invalidate*`/`refresh*` naming pattern with `revalidateTag`
- P01-T08: `lib/data/artifact.ts` (not `document.ts`)
- P01-T11: No `vercel-gateway` provider
- P01-T13: Test fixtures use `artifact.ts` naming

**Old plan losses:**
- Old P01-T12 (API utilities: `createJsonResponse` wrapper) → simplified. Server Actions return `ActionResult<T>` directly, no wrapper needed. **Correct.**
- Old P01-T13 (Rate limiting module) → consolidated into `proxy.ts` and route handler logic. **Correct.**

**Verdict: COMPLETE**

---

### 4. `p02-auth.md`

**Redesign gaps:** None. All 9 tasks (P02-T01 through P02-T09) match redesign exactly.

**Key redesign improvements verified:**
- P02-T04: Auth actions return `ActionResult<T>` (not bare throws)
- P02-T05: Login/register forms use `useActionState` (React 19)
- P02-T06: `session-provider.tsx` with `SessionProvider` (not `AuthProvider`)
- P02-T07: `app/(auth)/error.tsx` error boundary included
- P02-T08: Wire root layout with `SessionProvider` wrapping

**Old plan losses:**
- Old P02-T06 (Create Supabase auth helpers) → consolidated into P02-T01 session resolution. **Correct.**
- Old P02-T07 (Create Supabase auth provider component) → simplified to `SessionProvider` (P02-T06). **Correct.**
- Old P02-T10 (Wire middleware with guest rotation) → consolidated into `proxy.ts` (P00-T14). **Correct.**

**Verdict: COMPLETE**

---

### 5. `p03-chat-core.md`

**Redesign gaps:** None. All 27 tasks (P03-T01 through P03-T27) match redesign exactly.

**Key redesign improvements verified:**
- P03-T05: `ChatSessionValue`, `ArtifactDataPart` types
- P03-T06: `useSyncExternalStore` for settings (no `SettingsProvider`)
- P03-T08: `ChatSessionContext` + `useChatSessionContext` (not `ChatContext`)
- P03-T09: Pure functions (chat-callbacks.ts, process-stream-deltas.ts) extracted
- P03-T10: `ChatStreamProvider` with **split contexts** + `requestAnimationFrame` batching
- P03-T11: `useChatSession` (~120 lines, not a God hook)
- P03-T14: `NoticeHandler` extracted (~15 lines)
- P03-T18: `createArtifact` tool (not `createDocument`)
- P03-T19: `updateArtifact` tool (not `updateDocument`)
- P03-T20: `StreamBridge` (~20 lines, not `DataStreamHandler`)
- P03-T21: `ChatShell` ~60 lines (composition, not God Component)
- P03-T23: `createUIMessageStream` + `onFinish` with revalidation
- P03-T24: SERVER layout for chat (no `'use client'`)
- P03-T25: `use cache` + `cacheTag` for chat pages

**Old plan losses:**
- Net **gain** of 3 tasks (24→27). No losses.
- Settings panel moved **from P06 to P03** (P03-T06, P03-T07) — earlier availability, correct placement.

**Verdict: COMPLETE**

---

### 6. `p04-artifacts.md`

**Redesign gaps:** None. All 18 tasks (P04-T01 through P04-T18) match redesign exactly.

**Key redesign improvements verified:**
- P04-T02: `useSyncExternalStore` for artifact store (not SWR-based state)
- P04-T03: `useArtifactSelector` for minimal re-renders
- P04-T04/T05: Handlers with APPEND vs REPLACE delta distinction
- P04-T06: Side-effect handler registration pattern
- P04-T14: `artifact-preview` (not `document-preview`)
- P04-T15: `revalidateTag` for artifact API
- `artifactId` naming used throughout

**Old plan losses:**
- Old had 22 tasks → new has 18. Consolidated tasks:
  - Separate console editor task → folded into P04-T09
  - Separate suggestions extension → folded into text editor tasks
  - Separate diffview task → folded into P04-T10
  - Separate integration wiring tasks → consolidated
- 3 seams dropped (SEAM-037/039/040): These tracked console↔artifact, suggestions↔artifact, diffview↔artifact integration points that no longer need separate tracking after consolidation. **Justified.**

**Verdict: COMPLETE**

---

### 7. `p05-sidebar.md`

**Redesign gaps:** None. All 12 tasks (P05-T01 through P05-T12) match redesign exactly.

**Key redesign improvements verified:**
- P05-T02: `PendingChatsProvider` (not `OptimisticChatsProvider`)
- P05-T05: `SidebarHistoryClient` receives server initial data
- P05-T08: `SidebarShell` as SERVER component with `'use cache'` + `cacheTag`
- Single-channel title delivery pattern
- Chat layout is SERVER component

**Old plan losses:** Same task count (12→12). Content fully updated with new naming and architecture. No valuable content lost.

**Verdict: COMPLETE**

---

### 8. `p06-enhancements.md`

**Redesign gaps:** None. All 14 tasks (P06-T01 through P06-T14) match redesign exactly.

**Key redesign improvements verified:**
- P06-T01: Voting via Server Action + `useOptimistic` (not PATCH `/api/vote` + SWR)
- P06-T02: `VoteButtons` + `useVotes` hook
- P06-T03: `VoteResolver` with React 19 `use()` (not `VoteHydrator`)
- P06-T04: `ModelSelector` with cookie + localStorage persistence
- P06-T06–T08: Visibility as its own feature module (`features/visibility/`)
- P06-T12: Weather component added
- P06-T13: Health check simplified
- All Server Actions return `ActionResult<T>`

**Old plan losses:**
- Old P06-T02 (Vote API route `/api/vote`) → **removed** — voting now uses Server Actions. **Correct.**
- Old P06-T07/T08 (Settings panel + wire settings) → **moved to P03-T06/T07**. **Correct.**
- Old P06-T15 (Toast component) → **removed** — `toaster.tsx` created in P00-T12. **Correct.**
- Old P06-T16 (Artifact toolbar with drag/polish/suggestions) → **removed** by redesign. Functionality folded into artifact action buttons. **Correct.**

**Verdict: COMPLETE**

---

### 9. `p07-polish.md`

**Redesign gaps:** None. All 13 tasks (P07-T01 through P07-T13) match redesign exactly.

**Key redesign improvements verified:**
- P07-T01: Consolidated 3 error boundaries → 1 task
- P07-T03: Combined accessibility + keyboard nav → 1 task
- P07-T09: Verify import boundaries (references `scripts/check-imports.mjs` from P00-T17)
- P07-T10: Verify "artifact" naming with comprehensive 15-pattern grep list
- P07-T11: Verify no `ACTIVATE_GATEWAY`/credit/gateway logic
- P07-T12: Full build verification including `proxy.ts` check
- P07-T13: Final gate with all naming conventions listed

**Old plan losses:**
- Old P07-T04 (Loading states finalization) → **removed** — loading states should be created in their respective phases, not deferred to polish. **Justified, improvement.**
- Old P07-T10 (Import boundary script creation) → **moved to P00-T17** — earlier enforcement. **Improvement.**

**⚠️ 2 items dropped without redesign replacement:**

| Lost Item | Old Task | Description | Severity |
| --- | --- | --- | --- |
| **Reduced motion support** | P07-T08 | `prefers-reduced-motion` CSS via centralized `lib/motion.tsx`. Ensures animations respect user's OS-level reduced motion preference. A11y best practice. | **MINOR** |
| **Connection resilience** | P07-T15 | SSE reconnection with exponential backoff (1s/2s/4s, max 3 retries). `useConnectionStatus` hook for `navigator.onLine` monitoring. Disables submit when offline. Shows "Connection lost" toast. | **MINOR–MODERATE** |

Neither item is in the redesign spec, so the new plan correctly omits them per spec. However, both provide genuine production value:

- **Reduced motion**: Low-effort a11y win (~20 lines). Could be added as P07-T03 sub-item or future backlog.
- **Connection resilience**: Medium-effort resilience feature. The Vercel AI SDK's `useChat` does have some built-in error handling, but the old plan's explicit offline detection + retry logic is more robust. Strong candidate for post-MVP backlog.

**Verdict: MINOR_GAPS** (spec-compliant, but 2 valuable old-plan items dropped)

---

## Seam Coverage

| Metric | Old Plan | New Plan | Delta |
| --- | --- | --- | --- |
| Total seams tracked | 41 | 38 | -3 |
| Missing seams | — | SEAM-037, SEAM-039, SEAM-040 | P04 consolidation |

The 3 dropped seams (all in P04) tracked fine-grained artifact sub-component integration points that were consolidated when artifact phase tasks were reduced from 22→18. The underlying integration functionality is still covered by the remaining P04 tasks. **No tracking gap.**

---

## Final Assessment

### Redesign Porting: ✅ COMPLETE
All 125 tasks from `redesign/phase-plan.md` are present in `plan/phases/` with correct task IDs, correct naming conventions, correct architectural patterns, and correct dependency chains. No redesign improvements are missing.

### Old Plan Preservation: ✅ COMPLETE (with 2 advisory items)
All task reductions from old plan (136→125) are justified by the redesign's intentional simplification. Every removed task maps to either:
1. **Consolidated** into another task (e.g., separate auth helpers → SessionProvider)
2. **Moved** to a more appropriate phase (e.g., settings panel P06→P03, import boundary P07→P00)
3. **Removed by redesign design** (e.g., Vote API route → Server Action, app-shell → server layout)

**Two items merit future consideration:**
1. **Reduced motion support** — low-cost a11y improvement, consider adding to P07-T03 or backlog
2. **Connection resilience** — production robustness feature, consider for post-MVP iteration

### Confidence: **95%**
High confidence in completeness. The 5% uncertainty is due to the possibility of subtle implementation detail differences within task descriptions that could only be caught during actual implementation.
