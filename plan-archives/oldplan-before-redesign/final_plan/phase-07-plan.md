# Phase 07 — Polish & Production

> Production readiness: error boundaries, loading states, accessibility, responsive design, instrumentation, E2E tests, connection resilience, final verification.

---

## Objective

Polish the application for production: finalize error boundaries at all 3 levels, loading states for all routes, accessibility attributes and keyboard navigation, responsive design verification, instrumentation setup, import boundary enforcement, E2E test specs, connection resilience hook, and comprehensive build + integration verification.

**Entry state:** P06 complete — all features work: auth, chat, artifacts, sidebar, voting, models, settings, upload, visibility
**Exit state:** App is production-ready: error handling, accessibility, responsive, instrumented, tested, build-passing
**Est. duration:** ~2 days
**Tasks:** 15

---

## Task Table

| ID | Title | Type | Complexity | Dependencies |
|----|-------|------|------------|-------------|
| P07-T01 | Finalize global error boundary | IMPLEMENTATION | M | P00-T05 |
| P07-T02 | Finalize chat error boundary | IMPLEMENTATION | M | P03-T23, P05-T10 |
| P07-T03 | Finalize artifact error boundary | IMPLEMENTATION | S | P04-T18 |
| P07-T04 | Finalize loading states (3 routes) | IMPLEMENTATION | M | P03-T23, P05-T02 |
| P07-T05 | Add accessibility attributes | IMPLEMENTATION | M | P06-T18 |
| P07-T06 | Add keyboard navigation | IMPLEMENTATION | M | P06-T18 |
| P07-T07 | Verify responsive design | VERIFICATION | M | P06-T18 |
| P07-T08 | Add reduced motion support | IMPLEMENTATION | S | P00-T10 |
| P07-T09 | Finalize instrumentation (OTel) | IMPLEMENTATION | M | P00-T15 |
| P07-T10 | Create import boundary check script | IMPLEMENTATION | M | — |
| P07-T11 | Create E2E test specs (Playwright) | IMPLEMENTATION | L | P06-T18 |
| P07-T12 | Run full build verification | VERIFICATION | M | T01–T10 |
| P07-T13 | Run comprehensive integration test | VERIFICATION | L | T11, T12 |
| P07-T15 | Connection resilience hook (NEW) | IMPLEMENTATION | M | P03-T19, P06-T18 |
| P07-T14 | Verification gate G07 (final) | VERIFICATION | S | ALL |

---

## Patch Notes (Traceability Gap Fix)

| Task | Gap | Patch |
|------|-----|-------|
| P07-T15 | Reconnection / resilience | New task: `useConnectionStatus` hook monitors `navigator.onLine`, SSE reconnection with exponential backoff (max 3 retries), offline toast, submit button disabled when offline |

---

## Entry/Exit States

| State | Condition |
|-------|-----------|
| Entry | P06 gate passed; all features functional |
| Exit | `pnpm build` passes; E2E tests pass; error boundaries work at 3 levels; mobile usable; keyboard navigation works; import boundaries enforced; connection resilience operational |

---

## Integration Verification

- Error boundaries catch at global, chat, and artifact levels
- Loading states render for all route transitions
- All interactive elements have ARIA labels
- Keyboard: Enter submits, Shift+Enter newline, Escape cancels edit
- Mobile layout works at 320px (sidebar overlay, full-screen artifacts)
- `pnpm format && pnpm typecheck && pnpm lint && pnpm build` all exit 0
- Import boundary script passes
- SSE reconnection recovers from dropped connections

---

## Seams Addressed

| Seam | Description | Task |
|------|-------------|------|
| SEAM-027 | Error boundaries (all 3 levels) | P07-T01, T02, T03 |
| (new) | SSE reconnection / offline detection | P07-T15 |
