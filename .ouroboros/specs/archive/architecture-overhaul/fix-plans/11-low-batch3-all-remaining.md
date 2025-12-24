# Fix Plan: LOW Batch 3 - Complete LOW Issues Reference

**Total LOW Issues**: 49
**Priority**: 🟢 LOW
**Total Effort**: ~4.5 hours
**Created**: 2025-12-22

---

## Complete LOW Issues Table

| #    | Category | Issue                             | File/Location                  | Effort | Phase | Status  |
| ---- | -------- | --------------------------------- | ------------------------------ | ------ | ----- | ------- |
| #31  | Config   | Hardcoded model list              | lib/ai/models.ts               | 15m    | 8     | TODO    |
| #35  | Config   | Missing model icons               | lib/ai/models.ts               | -      | 12+   | DEFER   |
| #44  | UX       | No keyboard shortcuts help        | features/chat/\*               | 20m    | 9     | TODO    |
| #45  | UX       | Missing chat export               | features/chat/actions/\*       | 30m    | 9     | TODO    |
| #46  | UX       | No chat import                    | features/chat/actions/\*       | 30m    | 9     | TODO    |
| #47  | UX       | Missing chat search               | features/sidebar/\*            | 30m    | 9     | TODO    |
| #48  | UX       | No chat folders/tags              | features/sidebar/\*            | -      | 12+   | DEFER   |
| #49  | UX       | Missing chat pinning              | features/sidebar/\*            | 20m    | 9     | TODO    |
| #94  | Security | Unused TURNSTILE env              | lib/auth/\*                    | 5m     | 8     | TODO    |
| #95  | Security | Missing Playwright auth state     | tests/config/\*                | 10m    | 8     | TODO    |
| #96  | Security | Test credentials exposed          | tests/e2e/\*.spec.ts           | 10m    | 8     | TODO    |
| #100 | Testing  | Test isolation issues             | tests/e2e/                     | 15m    | 8     | TODO    |
| #106 | Build    | Unused tsconfig paths             | tsconfig.json                  | 5m     | 8     | TODO    |
| #108 | Build    | Missing .nvmrc                    | /                              | 2m     | 8     | TODO    |
| #117 | Build    | Old Node.js in CI                 | .github/workflows/\*           | 5m     | 8     | TODO    |
| #124 | Testing  | Vitest browser mock incomplete    | tests/\_\_mocks\_\_/           | 15m    | 8     | TODO    |
| #125 | Testing  | No visual regression tests        | tests/                         | -      | 12+   | DEFER   |
| #126 | Testing  | Missing accessibility tests       | tests/e2e/                     | 20m    | 8     | TODO    |
| #127 | Testing  | No load testing                   | tests/                         | -      | 12+   | DEFER   |
| #132 | UI       | Missing skeleton loading states   | components/ui/\*               | 20m    | 9     | TODO    |
| #133 | UI       | Inconsistent button sizes         | components/ui/button.tsx       | 10m    | 9     | TODO    |
| #137 | UI       | Sidebar width not persisted       | features/sidebar/\*            | 15m    | 9     | TODO    |
| #143 | UI       | Missing empty state illustrations | features/\*/components/\*      | -      | 12+   | DEFER   |
| #145 | UI       | Chat list virtualization missing  | features/sidebar/components/\* | 30m    | 10    | TODO    |
| #192 | Hooks    | useOptimistic stale closure       | features/chat/hooks/\*         | 15m    | 10    | TODO    |
| #199 | Error    | Swallowed error in saveChat       | features/chat/actions/\*       | 5m     | 8     | TODO    |
| #203 | Error    | Silent fail in processChunk       | lib/ai/stream-processor.ts     | 10m    | 8     | TODO    |
| #208 | Error    | Empty catch in file handler       | features/chat/actions/\*.ts    | 5m     | 8     | TODO    |
| #251 | Database | Missing soft delete               | lib/db/schema.ts               | 15m    | 10    | TODO    |
| #258 | Database | Naming inconsistency (userId)     | lib/db/schema.ts               | -      | 12+   | DEFER   |
| #324 | Hooks    | pendingCount unbounded            | features/sidebar/hooks/\*      | 10m    | 10    | TODO    |
| #325 | Hooks    | Missing delete confirmation       | features/sidebar/hooks/\*      | -      | -     | WONTFIX |
| #326 | Hooks    | No undo for delete                | features/sidebar/hooks/\*      | -      | 12+   | DEFER   |
| #328 | Hooks    | Sync temp ID with server          | features/sidebar/hooks/\*      | 10m    | 10    | TODO    |
| #329 | Perf     | No debounce on resize             | features/sidebar/\*            | 10m    | 10    | TODO    |
| #330 | Perf     | Heavy re-renders in chat          | features/chat/components/\*    | 20m    | 10    | TODO    |
| #331 | A11y     | Missing skip link                 | app/layout.tsx                 | 5m     | 9     | TODO    |
| #332 | A11y     | Form inputs missing labels        | components/ui/\*               | 10m    | 9     | TODO    |
| #333 | A11y     | Color contrast issues             | globals.css                    | 15m    | 9     | TODO    |
| #334 | i18n     | Date formatting inconsistent      | lib/utils/date.ts              | 10m    | 11    | TODO    |
| #335 | i18n     | Number formatting locale          | lib/utils/format.ts            | 10m    | 11    | TODO    |
| #336 | DX       | Missing component documentation   | components/\*                  | 30m    | 11    | TODO    |
| #337 | DX       | No Storybook setup                | /                              | -      | 12+   | DEFER   |
| #338 | DX       | Missing API documentation         | lib/api/\*                     | 30m    | 11    | TODO    |
| #339 | Types    | Loose typing in utilities         | lib/utils/\*                   | 15m    | 11    | TODO    |
| #340 | Types    | Missing discriminated unions      | lib/types/\*                   | 15m    | 11    | TODO    |
| #341 | Perf     | No service worker                 | public/                        | -      | 12+   | DEFER   |
| #342 | Perf     | Missing prefetch hints            | app/layout.tsx                 | 10m    | 10    | TODO    |
| #343 | Logging  | Inconsistent log levels           | lib/\*                         | 15m    | 11    | TODO    |

---

## Phase Breakdown

### Phase 8: Quick Wins (~1.5h)

| #    | Issue                   | Effort |
| ---- | ----------------------- | ------ |
| #94  | TURNSTILE env cleanup   | 5m     |
| #95  | Playwright auth state   | 10m    |
| #96  | Test credentials to env | 10m    |
| #100 | Test isolation          | 15m    |
| #106 | tsconfig cleanup        | 5m     |
| #108 | Add .nvmrc              | 2m     |
| #117 | Update CI Node version  | 5m     |
| #124 | Browser mocks           | 15m    |
| #126 | A11y tests              | 20m    |
| #199 | saveChat error logging  | 5m     |
| #203 | processChunk logging    | 10m    |
| #208 | File handler logging    | 5m     |

**Phase 8 Total**: ~1.5 hours (12 issues)

---

### Phase 9: UX & UI (~2h)

| #    | Issue                    | Effort |
| ---- | ------------------------ | ------ |
| #31  | Model list from config   | 15m    |
| #44  | Keyboard shortcuts modal | 20m    |
| #45  | Chat export              | 30m    |
| #46  | Chat import              | 30m    |
| #47  | Chat search              | 30m    |
| #49  | Chat pinning             | 20m    |
| #132 | Skeleton states          | 20m    |
| #133 | Button sizes             | 10m    |
| #137 | Sidebar width persist    | 15m    |
| #331 | Skip link                | 5m     |
| #332 | Form labels              | 10m    |
| #333 | Color contrast           | 15m    |

**Phase 9 Total**: ~2 hours (12 issues)

---

### Phase 10: Performance & Hooks (~1.5h)

| #    | Issue                    | Effort |
| ---- | ------------------------ | ------ |
| #145 | Chat list virtualization | 30m    |
| #192 | Stale closure fix        | 15m    |
| #251 | Soft delete              | 15m    |
| #324 | Bound pendingCount       | 10m    |
| #328 | Sync temp ID             | 10m    |
| #329 | Debounce resize          | 10m    |
| #330 | Reduce re-renders        | 20m    |
| #342 | Prefetch hints           | 10m    |

**Phase 10 Total**: ~1.5 hours (8 issues)

---

### Phase 11: DX & Types (~2h)

| #    | Issue                 | Effort |
| ---- | --------------------- | ------ |
| #334 | Date formatting       | 10m    |
| #335 | Number formatting     | 10m    |
| #336 | Component docs        | 30m    |
| #338 | API documentation     | 30m    |
| #339 | Utility typing        | 15m    |
| #340 | Discriminated unions  | 15m    |
| #343 | Consistent log levels | 15m    |

**Phase 11 Total**: ~2 hours (7 issues)

---

## Status Summary

| Status    | Count | Notes                     |
| --------- | ----- | ------------------------- |
| TODO      | 39    | Scheduled for Phases 8-11 |
| DEFER     | 9     | Future phases (12+)       |
| WONTFIX   | 1     | #325 - UX decision        |
| **Total** | 49    | -                         |

---

## Deferred Items (Phase 12+)

| #    | Issue               | Reason                      |
| ---- | ------------------- | --------------------------- |
| #35  | Model icons         | Needs design assets         |
| #48  | Chat folders/tags   | Major feature               |
| #125 | Visual regression   | Needs Percy/Chromatic setup |
| #127 | Load testing        | Needs k6/Artillery setup    |
| #143 | Empty illustrations | Needs design assets         |
| #258 | userId naming       | Breaking DB change          |
| #326 | Undo delete         | Needs undo infrastructure   |
| #337 | Storybook           | Major DX investment         |
| #341 | Service worker      | PWA feature                 |

---

## Effort Distribution

```
Phase 8  ████████░░░░░░░░░░░░  1.5h  (Quick wins)
Phase 9  ██████████░░░░░░░░░░  2.0h  (UX & UI)
Phase 10 ███████░░░░░░░░░░░░░  1.5h  (Perf & Hooks)
Phase 11 ██████████░░░░░░░░░░  2.0h  (DX & Types)
─────────────────────────────────────
Total    ████████████████████  7.0h  (39 TODO issues)
Deferred ░░░░░░░░░░░░░░░░░░░░  TBD   (9 issues)
```
