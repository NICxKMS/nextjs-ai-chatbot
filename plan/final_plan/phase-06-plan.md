> **Updated per redesign audit (2026-03-01)**

# Phase 6 — Enhancements

> Secondary features: Server Action voting with `useOptimistic`, VoteResolver with React 19 `use()`, model selection, visibility as own feature module, file upload, weather UI, health check.

---

## Objective

Implement all enhancement features that augment the core experience: message voting via Server Actions + `useOptimistic` (NOT `PATCH /api/vote`), VoteResolver with React 19 `use()` for promise-based hydration, model selector with cookie + localStorage persistence, visibility toggle as its own feature module with Server Action + `updateTag`, file upload to Vercel Blob, weather display component, and health check endpoint.

**Entry state:** P5 complete — chat, artifacts, sidebar all work; full navigation functional
**Exit state:** All enhancement features work — voting, model selection, visibility, file upload, weather, health check
**Est. duration:** ~3 days
**Tasks:** 14

---

## Task Table

| ID | Title | Type | Files Created | Dependencies | Complexity |
|---|---|---|---|---|---|
| P6-T01 | Create voting types + Server Action | IMPL | `features/voting/types/vote.types.ts`, `features/voting/actions/vote.ts` (Server Action + `useOptimistic` + `updateTag`) | P1-T09 | M |
| P6-T02 | Create VoteButtons + useVotes | IMPL | `features/voting/components/vote-buttons.tsx`, `features/voting/hooks/use-votes.ts` | P6-T01 | M |
| P6-T03 | Wire voting into messages | INTEG | Update `message.tsx` to render `VoteButtons`, add `VoteResolver` to chat pages | P6-T02, P3-T15, P3-T25 | M |
| P6-T04 | Create ModelSelector | IMPL | `features/models/components/model-selector.tsx` (grouped by provider, cookie + localStorage persistence) | P3-T01 | L |
| P6-T05 | Wire model selector into ChatHeader | INTEG | Update `chat-header.tsx` to render `ModelSelector` | P6-T04, P3-T19 | S |
| P6-T06 | Create visibility types + action | IMPL | `features/visibility/types/visibility.types.ts`, `features/visibility/actions/update-visibility.ts` (Server Action + `updateTag`) | P1-T06, P1-T03 | M |
| P6-T07 | Create VisibilitySelector | IMPL | `features/visibility/components/visibility-selector.tsx` (`useOptimistic` toggle) | P6-T06 | M |
| P6-T08 | Wire visibility into chat page | INTEG | Update `chat/[id]/page.tsx` to render `VisibilitySelector` | P6-T07, P3-T25 | S |
| P6-T09 | Create file upload route | IMPL | `app/api/files/upload/route.ts` (multipart → Vercel Blob) | P2-T01 | M |
| P6-T10 | Create PreviewAttachment | IMPL | `features/chat/components/preview-attachment.tsx` (file thumbnail) | P3-T18 | S |
| P6-T11 | Wire file upload into MultimodalInput | INTEG | Update `multimodal-input.tsx` with attachment handling + `PreviewAttachment` | P6-T09, P6-T10 | M |
| P6-T12 | Create Weather component | IMPL | `components/weather.tsx` (weather tool result renderer) | P3-T13 | S |
| P6-T13 | Create health check route | IMPL | `app/api/health/route.ts` (DB + Redis ping) | P1-T02 | S |
| P6-T14 | Verification gate G06 | VERIFY | — | P6-T01..T13 | S |

---

## Key Changes from Pre-Redesign Plan

| Aspect | Before | After |
|--------|--------|-------|
| Vote mutation | `PATCH /api/vote` route + SWR optimistic (`mutate`) | **Server Action** + `useOptimistic` + `updateTag` (no API route) |
| Vote hydration | SWR fetch on mount | **VoteResolver** with React 19 `use()` — promise-based, streamed from server |
| Vote hook naming | `VoteHydrator` | `VoteResolver` |
| Visibility module | Mixed into chat feature | **Own feature module** (`features/visibility/`) |
| Visibility mutation | SWR optimistic + server action | Server Action + `useOptimistic` + `updateTag` on both `chat:{id}` and `chats:{userId}` tags |
| Settings panel | Standalone P06 task (SettingsProvider) | **SettingsProvider removed** — settings store uses `useSyncExternalStore` + localStorage (created in P3-T06/T07) |
| Task IDs | P06-T01..T18 (18 tasks) | P6-T01..T14 (14 tasks, leaner) |
| Rate limit seam | P06 tasks for per-route limiters | Simplified — rate limiting handled in proxy.ts + route-level checks |

---

## Entry/Exit States

| State | Condition |
|-------|-----------|
| Entry | P5 gate passed; chat, artifacts, sidebar all functional |
| Exit | Voting works via Server Action on assistant messages; VoteResolver hydrates via `use()`; model selector changes AI model; visibility toggle as own feature; file upload attaches images; health check returns OK |

---

## Exit Criteria

- [ ] Voting uses Server Action + `useOptimistic` (NOT `PATCH /api/vote`)
- [ ] VoteResolver uses React 19 `use()` for promise-based hydration
- [ ] Visibility uses Server Action + `updateTag` on both chat and chat-list tags
- [ ] Visibility is its own feature module (`features/visibility/`)
- [ ] `ModelSelector` persists to cookie (server-readable) + localStorage
- [ ] File upload returns blob URL, preview renders thumbnail
- [ ] Health check pings DB + Redis
- [ ] All Server Actions return `ActionResult<T>` (never throw)
- [ ] `pnpm typecheck && pnpm lint` pass

**Verification:** `pnpm typecheck && pnpm lint && pnpm format`

---

## Integration Verification

- Vote on assistant message → `useOptimistic` update → Server Action → DB persist → `updateTag` → VoteResolver reads fresh data
- VoteResolver: server passes promise → client `use()` unwraps → votes available without loading state
- Model selector grouped by provider → selection persists to cookie + localStorage → chat uses selected model
- File picker → upload to Vercel Blob → preview thumbnail → attach to message on submit
- Visibility toggle → `useOptimistic` update → Server Action → DB update → `updateTag`
- Health check returns 200 with DB/cache status

---

## Seams Addressed

| Seam | Description | Task |
|------|-------------|------|
| SEAM-016 | Model catalog → selector → chat | P6-T04, P6-T05 |
| SEAM-017 | AI provider registry (fully wired) | P6-T04 |
| SEAM-018 | Vote mutation (Server Action + `useOptimistic` + VoteResolver) | P6-T01, P6-T02, P6-T03 |
| SEAM-019 | File upload → message attachment | P6-T09, P6-T10, P6-T11 |
| SEAM-022 | Visibility toggle (Server Action + `useOptimistic` + `updateTag`) | P6-T06, P6-T07, P6-T08 |
| SEAM-036 | Rate limiting pipeline (proxy.ts + route handlers) | P6-T09, P6-T13 |
