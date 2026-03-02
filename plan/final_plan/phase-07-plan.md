> **Updated per redesign audit (2026-03-01)**

# Phase 7 — Polish & Production

> Production readiness: error boundaries, accessibility, responsive design, instrumentation, import boundary enforcement, artifact naming verification, credit/gateway grep, E2E tests, full build verification.

---

## Objective

Polish the application for production: finalize error boundaries at all levels, accessibility attributes and keyboard navigation, responsive design verification, instrumentation setup, import boundary enforcement via `scripts/check-imports.mjs`, "artifact" naming grep verification, credit/gateway terminology grep verification, E2E test specs, integration tests, and comprehensive build + typecheck + lint verification.

**Entry state:** P6 complete — all features work: auth, chat, artifacts, sidebar, voting, models, visibility, upload, weather
**Exit state:** App is production-ready: error handling, accessibility, responsive, instrumented, tested, build-passing, naming verified, import boundaries enforced
**Est. duration:** ~2 days
**Tasks:** 13

---

## Task Table

| ID | Title | Type | Files Created | Dependencies | Complexity |
|---|---|---|---|---|---|
| P7-T01 | Finalize error boundaries | IMPL | Polish `app/global-error.tsx`, `app/(chat)/error.tsx`, `app/(auth)/error.tsx` | P0-T13, P3-T26, P2-T07 | M |
| P7-T02 | Finalize artifact error boundary | IMPL | Polish `features/artifacts/components/artifact-error-boundary.tsx` | P4-T13 | S |
| P7-T03 | Add accessibility + keyboard nav | IMPL | ARIA attributes across chat, sidebar, artifact components (~8 files); `prefers-reduced-motion` support | P3-T21, P5-T11 | M |
| P7-T04 | Verify responsive design | VERIFY | Mobile layout adjustments across chat, sidebar, artifact (~5 files) | P5-T11 | M |
| P7-T05 | Finalize instrumentation | IMPL | Complete `instrumentation.ts`, `instrumentation-client.ts` (OpenTelemetry) | P0-T15 | M |
| P7-T06 | Create E2E test specs | IMPL | `tests/e2e/chat.spec.ts`, `artifacts.spec.ts`, `auth.spec.ts`, `sidebar.spec.ts` | all phases | L |
| P7-T07 | Create integration tests | IMPL | `tests/integration/chat-flow.test.ts`, `artifact-flow.test.ts`, `auth-flow.test.ts`, `sidebar-flow.test.ts` | all phases | L |
| P7-T08 | Create stream test utility | IMPL | `tests/utils/stream.ts` (`collectStreamEvents`), `tests/mocks/ai.ts`, `tests/mocks/fetch.ts` | P0-T16 | M |
| P7-T09 | Verify import boundaries | VERIFY | Run `scripts/check-imports.mjs` — zero violations | P0-T17 | S |
| P7-T10 | Verify "artifact" naming | VERIFY | `grep -r "document"` in code — zero results (excl. `.next-docs`, `oldapp`, `node_modules`, `plan`, `redesign`) | all phases | S |
| P7-T11 | Verify no credit/gateway logic | VERIFY | `grep -rE "credit\|gateway\|quota\|entitlement\|AppUsage\|activate_gateway"` — zero results | all phases | S |
| P7-T12 | Full build verification | VERIFY | `pnpm build` — clean production build | all phases | M |
| P7-T13 | Verification gate G07 (final) | VERIFY | — | P7-T01..T12 | S |

---

## Key Changes from Pre-Redesign Plan

| Aspect | Before | After |
|--------|--------|-------|
| Import boundaries | P07-T10 (late addition) | **P0-T17** creates script; **P7-T09** runs verification — first-class from scaffold |
| Artifact naming grep | Not present | **P7-T10**: explicit grep for "document" in code identifiers — zero tolerance |
| Credit/gateway grep | Not present | **P7-T11**: explicit grep for credit/gateway/quota terminology — zero tolerance |
| Connection resilience | P07-T15 (`useConnectionStatus` hook) | Removed as standalone task — SSE reconnection handled natively by `useChat` + error boundary |
| Task IDs | P07-T01..T15 (15 tasks) | P7-T01..T13 (13 tasks, leaner) |
| `proxy.ts` verification | Not present | Implicit in P7-T11 (verify no `middleware.ts` exists) |
| Loading states | P07-T04 standalone | Folded into P7-T04 responsive design verification |

---

## Entry/Exit States

| State | Condition |
|-------|-----------|
| Entry | P6 gate passed; all features functional |
| Exit | `pnpm build` passes; E2E tests pass; error boundaries work at all levels; mobile usable; keyboard navigation works; import boundaries enforced; artifact naming verified; credit/gateway grep clean |

---

## Exit Criteria

- [ ] All error boundaries render standalone with recovery actions
- [ ] `scripts/check-imports.mjs` reports zero violations
- [ ] Zero occurrences of "document" in code identifiers (excl. docs/oldapp)
- [ ] Zero occurrences of credit/gateway/quota terminology
- [ ] `proxy.ts` exists (not `middleware.ts`)
- [ ] `pnpm format && pnpm typecheck && pnpm lint` all pass
- [ ] `pnpm build` succeeds cleanly
- [ ] E2E test specs cover: auth flow, chat send/receive, artifact create/edit, sidebar navigation

**Verification:**
```bash
pnpm format && pnpm typecheck && pnpm lint
node scripts/check-imports.mjs
pnpm build
pnpm test:unit
pnpm test:e2e
```

---

## Integration Verification

- Error boundaries catch at global, chat/auth, and artifact levels
- Loading states render for all route transitions
- All interactive elements have ARIA labels
- Keyboard: Enter submits, Shift+Enter newline, Escape cancels edit
- Mobile layout works at 320px (sidebar overlay, full-screen artifacts)
- `pnpm format && pnpm typecheck && pnpm lint && pnpm build` all exit 0
- Import boundary script passes — zero cross-feature imports
- Artifact naming grep: zero "document" in code
- Credit/gateway grep: zero forbidden terms
- All CSS animations respect `prefers-reduced-motion: reduce` media query
- SSE streaming recovers via `useChat` built-in reconnection

---

## Seams Addressed

| Seam | Description | Task |
|------|-------------|------|
| SEAM-027 | Error boundaries (all levels) | P7-T01, P7-T02 |
