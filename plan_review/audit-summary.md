# Architectural Audit — Executive Summary

## Verdict

**REDESIGN REQUIRED** — Three co-dependent CRITICAL defects make incremental patching infeasible. The plan builds a React SPA wrapped in Next.js; the redesign builds a Next.js application with targeted client interactivity.

## Audit Scope

| Dimension | Detail |
|-----------|--------|
| **Target** | Rebuild plan for `nextjs-ai-chatbot` (Next.js 16, App Router) |
| **Audited files** | Plan architecture (`plan/`), old app source (`oldapp/`), Next.js 16 docs (`.next-docs/`) |
| **Sections covered** | I–III (RSC, data fetching, state), IV–VI (coupling, props, performance), VII–VIII (server actions, structural integrity), IX (redesign recommendations) |
| **Finding count** | 53 total across 8 sections |
| **Auditors** | Oracle (Architecture), Backend Engineer |

## Findings Overview

| Severity | Count | Key Examples |
|----------|-------|-------------|
| **CRITICAL** | 3 | Monolithic client layout, Chat God Component, zero cache revalidation |
| **HIGH** | 19 | Client-only sidebar, 15-prop drilling, streaming re-render cascades, data loss on abort, naming inconsistency |
| **MEDIUM** | 22 | SWR-as-state-store, provider over-nesting, memory leaks, missing virtualization |
| **LOW** | 7 | TooltipProvider placement, legacy proxy pattern, cache abstraction review |
| **NONE** | 1 | Model catalog `use cache` (positive finding) |

## Critical Findings (Must Fix)

### 1. ChatLayoutClient Monolith (I-1)

The entire chat UI subtree is wrapped in a single `'use client'` component — solely to call `useSearchParams()` for a toast. This defeats Partial Prerendering, forces ~50–70 KB of JavaScript into the initial load, and prevents server-rendering the sidebar. The sidebar uses `dynamic(import, { ssr: false })`, guaranteeing a skeleton flash on every page load.

**Fix**: Keep the layout as a server component. Extract a 15-line `<NoticeHandler />` client island for toast handling. Server-render the sidebar shell with `<Suspense>`.

### 2. Chat God Component (IV-6)

The `Chat` component has **14 distinct responsibilities** across 524 lines: `useChat` orchestration, 4 provider hooks, attachment state, URL management, adaptive throttle, error handling with credit alert dialog, optimistic chat creation, artifact reset, and title polling with 3× `setTimeout`. It distributes 15–16 props to each child component.

**Fix**: Decompose into `ChatShell` (~60 lines), `useChatSession` hook (~120 lines), `useChatSideEffects` hook (~40 lines), and a `ChatContext` that reduces per-child props from 16 to 2–4.

### 3. Zero Revalidation Strategy (VII-1)

No mutation in the plan calls `revalidatePath`, `revalidateTag`, or `updateTag`. The Router Cache, Data Cache, and Full Route Cache are never invalidated. Currently masked because all data is client-fetched via SWR — but any move to server-side rendering (as recommended) causes immediate stale-data bugs.

**Fix**: Add `updateTag`/`revalidateTag` to every mutation. Create `lib/cache/revalidate.ts` utility. These three CRITICALs are co-dependent and must be addressed together.

## High-Priority Findings (Should Fix)

1. **I-2** — AppSidebar is entirely client-rendered (`ssr: false`); server-rendering saves 2–4× in time-to-content
2. **II-1** — Sidebar history has a 6-step client-side waterfall (540–1250 ms vs 220–300 ms server-fetched)
3. **III-2** — Chat↔Sidebar title sync uses 3 channels: stream, window event, 3× polling — fix root cause, remove workarounds
4. **IV-1** — Chat→Artifacts direct handler import violates declared feature boundaries
5. **IV-2** — `window.dispatchEvent('chat-title-updated')` is untyped, fire-and-forget, untestable global coupling
6. **V-1** — Chat distributes 15–16 props per child; massive duplication across Messages, MultimodalInput, Artifact
7. **V-3** — SettingsProvider + DataStreamProvider lifted to layout level; sidebar gets unnecessary re-renders
8. **V-5** — DataStreamProvider updates at 10–20 Hz during streaming, cascading through entire layout subtree
9. **VI-1** — Two-stage cascading re-renders: DataStream → SWR artifact → 5+ consumer components per delta
10. **VI-2** — SWR synthetic key `"artifact"` triggers all 5+ consumers on every mutation (~50–100 unnecessary re-renders/sec)
11. **VI-3** — `'use client'` layout bundles ~50–70 KB; server layout with islands reduces to ~15–25 KB (~60% saving)
12. **VI-5** — No `AbortController` on navigation; server continues generating tokens for up to 55 s after client leaves
13. **VII-2** — Three different mutation→UI patterns (SWR optimistic, cache manipulation, context+polling) with no decision framework
14. **VII-4** — Stream interruption (navigation, timeout, disconnect) causes silent assistant message loss — `onFinish` never fires
15. **VII-7** — Server Action errors are sanitized by React; client receives generic message, not structured `AppError`
16. **VIII-1** — "document" vs "artifact" naming split across layers (~25–30 renames needed in ~15 files)
17. **VIII-2** — Credit card / AI Gateway logic persists despite removal requirement
18. **VIII-3** — Circular conceptual dependency: chat → artifacts → dataStream → chat
19. **VIII-5** — Test coverage plan has no mocking patterns for Server Actions, streaming, or cross-feature integration

## Redesign Summary

### A. Component Architecture

| Aspect | Before (Current Plan) | After (Redesigned) |
|--------|----------------------|-------------------|
| Chat layout | `'use client'` wrapper (`ChatLayoutClient`) | **Server component** with client islands |
| Sidebar | `dynamic(import, { ssr: false })` — skeleton only | **Server-rendered shell** + client island for interactivity |
| Chat component | 524-line God Component, 14 responsibilities | `ChatShell` (~60 lines) + `useChatSession` hook + `ChatContext` |
| Props per child | 15–16 | 2–4 (via ChatContext) |
| PPR eligibility | Defeated | Enabled for sidebar header, layout chrome, chat structure |

### B. State Management

| Aspect | Before | After |
|--------|--------|-------|
| Artifact state | SWR with no fetcher (`useSWR("artifact", null)`) | `useSyncExternalStore` with native selectors |
| Provider depth | 9 levels (all in layout) | 8 max; Settings + DataStream scoped to page |
| Streaming re-renders | ~5–7 components per delta | ~1–2 components per delta (~75% reduction) |
| Title sync | Stream + window event + 3× polling | Stream only (single channel, guaranteed delivery) |
| Delta batching | None (raw SSE frequency) | RAF-based coalescing (~60 updates/sec cap) |

### C. Data Flow

| Aspect | Before | After |
|--------|--------|-------|
| Cache revalidation | Zero `revalidatePath`/`revalidateTag`/`updateTag` | Full revalidation matrix for all mutations |
| Sidebar initial data | Client-fetched (SWR), 6-step waterfall | Server-fetched with `use cache` + `cacheTag` |
| Mutation pattern | 3 ad-hoc patterns | Standardized 2-tier: Server Action + optimistic, or Stream + context |
| Stream abort | No handling; data loss on navigation | `AbortController` lifecycle + partial response saving |
| Error handling | Thrown errors (sanitized by React) | Result objects for Server Actions; `.toResponse()` for Route Handlers |

### D. Domain Boundaries

| Aspect | Before | After |
|--------|--------|-------|
| Chat → Artifacts | Direct handler import | Handler registry in `lib/ai/` (Dependency Inversion) |
| Chat ↔ Sidebar | OptimisticChats + window events + polling | OptimisticChats only (typed contract in `lib/types/`) |
| DataStreamHandler | Imports `useArtifact` from artifacts feature | Pure `processStreamDelta()` function + thin bridge |
| AppShell | In `components/`, imports from `features/auth/` | Moved to `app/_components/` (layout plumbing) |

### E. Naming & Cleanup

- **"document" → "artifact"**: ~25–30 renames across DB schema, data layer, cache keys, AI tools, handlers, API routes, components
- **Credit/Gateway removal**: Remove `vercel-gateway` provider, `activate_gateway` error, credit AlertDialog; rename "entitlements" → "daily limits"

## Implementation Priority

Ordered by impact/effort ratio. Items at the top unblock the most downstream work.

| # | Change | Effort | Findings Fixed |
|---|--------|--------|---------------|
| 1 | Add revalidation strategy (`lib/cache/revalidate.ts`, `updateTag` in all mutations) | M | CRITICAL-3, VII-1, VII-2, VII-6 |
| 2 | Decompose chat layout — server component + `NoticeHandler` island | L | CRITICAL-1, I-1, I-4, IV-3, V-3, VI-3 |
| 3 | Server-render sidebar — `SidebarShell` + initial data fetch | L | I-2, II-1, VI-3, VI-4 |
| 4 | Decompose Chat God Component — `ChatShell` + `useChatSession` + `ChatContext` | L | CRITICAL-2, IV-6, V-1, V-4 |
| 5 | Fix title delivery — await on server, remove window events + polling | M | III-2, IV-2, VII-3, VIII-7 |
| 6 | Migrate artifact state to `useSyncExternalStore` | M | III-1, VI-1, VI-2, IV-5 |
| 7 | Introduce handler registry (`lib/ai/artifact-handlers.ts`) | S | IV-1, VIII-3, VIII-4 |
| 8 | Stream abort handling — `AbortController`, partial saves, `stop()` on unmount | M | VII-4, VI-5 |
| 9 | Standardize error handling — result objects for Server Actions | M | VII-7, VII-8 |
| 10 | Extract `processStreamDelta()` pure function | S | IV-7, VIII-7 |
| 11 | "document" → "artifact" rename | M | VIII-1 |
| 12 | Credit/gateway logic removal | S | VIII-2 |
| 13–20 | Remaining: vote conversion, virtualization, RAF batching, memory cleanup, import enforcement, tests, `Promise.all` fetches | S–L | Remaining MEDIUM/LOW |

*S = 0.5–1 day, M = 1–2 days, L = 2–4 days*

## Timeline Impact

| Metric | Original Plan | Revised Estimate | Delta |
|--------|--------------|-----------------|-------|
| **P00 — Scaffold** | ~1 day | ~2 days | +1 day (rename, interfaces, credit removal) |
| **P01 — Data Foundation** | ~2 days | ~2.5 days | +0.5 days (revalidation, error pattern, test mocks) |
| **P02 — Auth** | ~1.5 days | ~1.5 days | No change |
| **P03 — Chat Core** | ~4 days | ~6–7 days | +2–3 days (decomposition, stream reliability, abort) |
| **P04 — Artifacts** | ~4 days | ~5–6 days | +1–2 days (store migration, handler registry) |
| **P05 — Sidebar** | ~2 days | ~3–4 days | +1–2 days (server rendering, initial data) |
| **P06 — Enhancements** | ~3 days | ~3.5 days | +0.5 days (vote conversion, revalidation) |
| **P07 — Polish** | ~2 days | ~3–4 days | +1–2 days (cleanup, import enforcement, integration tests) |
| **Total** | **~19.5 days** | **~27–31 days** | **+7.5–11.5 days (~40–60%)** |

**Cost of inaction** (not fixing): Stale-data bugs within 3 months, 2–4 s TTI on mobile, impossible to leverage PPR / `use cache` / `updateTag`. Estimated post-ship remediation cost: **2–3× the upfront cost**.

## Detailed Reports

- [Sections I–III: RSC Boundaries, Data Fetching, Context Architecture](audit-rsc-fetching-state.md) — 17 findings
- [Sections IV–VI: Component Coupling, Prop Flow, Performance](audit-coupling-props-perf.md) — 19 findings
- [Sections VII–VIII: Server Actions, Structural Integrity](audit-actions-structure.md) — 17 findings
- [Section IX: Architectural Redesign Recommendations](audit-redesign-recommendations.md) — Full redesign spec with implementation priority matrix

## Recommended Next Steps

1. **Update plan documents** — Revise `patterns.md` (add §9 Revalidation, §10 Error Handling), `conventions.md` (new provider tree), `component-wiring.md` (server layout + ChatContext), `decisions.md` (ADR-010: artifact store)
2. **Execute P00 additions first** — "document" → "artifact" rename, credit/gateway removal, shared interface scaffolds (`lib/types/`, `lib/cache/revalidate.ts`)
3. **Implement the 3 CRITICALs as a unit** — Server layout (#2) + Chat decomposition (#4) + Revalidation strategy (#1) are co-dependent; sequence them in P00–P03
4. **Fix title delivery early** — The `window.dispatchEvent` pattern is the single most fragile piece of architecture; fix in P03 before it propagates
5. **Add test infrastructure in P01** — Mock utilities for auth, DB, cache, and streaming are prerequisites for validating all subsequent phases
6. **Use revised timeline** — Communicate the 27–31 day estimate; the 40–60% increase prevents 2–3× remediation cost post-ship
