---
last_updated: "2026-03-03"
---

## Cross-Cutting Decisions

### D001 — Next.js 16 Config API (P0-T01)
- `reactCompiler` and `cacheComponents` are top-level config in Next.js 16 (moved out of `experimental`)
- `ppr` deprecated in favor of `cacheComponents`

### D002 — Error Code Pattern (P0-T08)
- Granular `type:surface:detail` pattern (e.g., `unauthorized:auth:no_session`)
- 19 error codes covering all use cases, no credit/gateway codes

### D003 — Pagination Style (P0-T05)
- Cursor-based pagination per `shared-types.md` §14 (not page-based)
- `HistoryResponse<T>` uses `cursor` + `hasMore` pattern

### D004 — UI Components Parity (P0-T11)
- 22 shadcn/ui components copied (oldapp had 22, not ~32 as estimated)
- Missing components will be added on-demand in later phases

### D005 — Simplified UUID Generation (P0-T09)
- Single `crypto.randomUUID()` call (dropped oldapp's 3-tier fallback)
- All target runtimes (Node 20+, modern browsers) support it natively
