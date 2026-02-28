# Phase 06 — Enhancements

> Secondary features: voting, model selection, settings panel, file upload, visibility toggle, toolbar, toast, health check.

---

## Objective

Implement all enhancement features that augment the core experience: message voting with optimistic SWR updates, model catalog with searchable selector, settings panel with sampling controls, file upload to Vercel Blob, chat visibility toggle, toast notifications, artifact toolbar, and health check endpoint.

**Entry state:** P05 complete — chat, artifacts, sidebar all work; full navigation functional
**Exit state:** All enhancement features work — voting, model selection, settings UI, file upload, visibility, toolbar
**Est. duration:** ~3 days
**Tasks:** 18

---

## Task Table

| ID | Title | Type | Complexity | Dependencies |
|----|-------|------|------------|-------------|
| P06-T01 | Create vote schemas + server action | IMPLEMENTATION | M | P01-T07, P01-T08, P01-T10, P02-T01 |
| P06-T02 | Create vote API route (PATCH /api/vote) | IMPLEMENTATION | M | T01, P02-T01, P01-T13 |
| P06-T03 | Wire voting into message actions | INTEGRATION | M | T01, T02, P03-T15 |
| P06-T04 | Create model catalog + discovery | IMPLEMENTATION | M | P03-T03, P00-T08 |
| P06-T05 | Create model selector component | IMPLEMENTATION | L | T04, P00-T08, P00-T11 |
| P06-T06 | Wire model selector into chat input | INTEGRATION | M | T05, P03-T04, P03-T17 |
| P06-T07 | Create settings panel component | IMPLEMENTATION | L | P03-T04, P00-T11 |
| P06-T08 | Wire settings panel into chat header | INTEGRATION | S | T07, P03-T18 |
| P06-T09 | Create file upload route (POST /api/files/upload) | IMPLEMENTATION | M | P02-T01, P01-T13 |
| P06-T10 | Create preview attachment component | IMPLEMENTATION | M | P00-T11 |
| P06-T11 | Wire file upload into multimodal input | INTEGRATION | L | T09, T10, P03-T17 |
| P06-T12 | Create visibility selector | IMPLEMENTATION | M | T13, P00-T11 |
| P06-T13 | Create use-chat-visibility hook (SWR optimistic) | IMPLEMENTATION | M | P01-T07, P02-T01 |
| P06-T14 | Wire visibility selector into chat header | INTEGRATION | S | T12, P03-T18 |
| P06-T15 | Create toast component (Sonner wrapper) | IMPLEMENTATION | M | P00-T11 |
| P06-T16 | Create artifact toolbar component | IMPLEMENTATION | M | P04-T01 |
| P06-T17 | Create health check endpoint (GET /api/health) | IMPLEMENTATION | M | P01-T01, P01-T03 |
| P06-T18 | Verification gate G06 | VERIFICATION | S | ALL |

---

## Entry/Exit States

| State | Condition |
|-------|-----------|
| Entry | P05 gate passed; chat, artifacts, sidebar all functional |
| Exit | Voting works on assistant messages; model selector changes AI model; settings panel controls sampling parameters; file upload attaches images to messages; visibility toggle works; health check returns OK |

---

## Integration Verification

- Vote on assistant message → optimistic update → server persist → rollback on failure
- Model selector grouped by provider → selection persists to cookie + localStorage → chat uses selected model
- Settings panel sliders → values persist → affect chat completion parameters
- File picker → upload to Vercel Blob → preview thumbnail → attach to message on submit
- Visibility toggle → optimistic SWR update → server action → DB update
- Health check returns 200 with DB/cache status

---

## Seams Addressed

| Seam | Description | Task |
|------|-------------|------|
| SEAM-016 | Model catalog → selector → chat | P06-T04, T05, T06 |
| SEAM-017 | AI provider registry (fully wired) | P06-T04 |
| SEAM-018 | Vote mutation (optimistic + server + DB) | P06-T01, T02, T03 |
| SEAM-019 | File upload → message attachment | P06-T09, T10, T11 |
| SEAM-022 | Visibility toggle (optimistic + server action) | P06-T12, T13, T14 |
| SEAM-036 | Rate limiting pipeline (all per-route limiters active) | P06-T02, T09, T17 |
