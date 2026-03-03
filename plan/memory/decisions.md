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

### D006 — Revalidation Split: updateTag vs revalidateTag (P1-T03)
- Server Actions use `updateTag(tag)` for immediate consistency (read-your-own-writes)
- Route Handlers use `revalidateTag(tag, "max")` for stale-while-revalidate
- Named as `invalidate*` / `refresh*` for semantic clarity

### D007 — withCache Directive Constraint (P1-T04)
- `'use cache'` cannot be placed inside a generic wrapper (fetcher not serializable)
- `withCache<T>` handles `cacheTag` + `cacheLife` + fetcher invocation; caller declares `'use cache'` at their function scope
- Documented deviation from spec's idealized wrapper design

### D008 — AI Provider via fallbackProvider (P1-T12)
- `customProvider()` takes static `Record<string, LanguageModel>` for `languageModels`, not a callback
- Used `fallbackProvider` parameter with a `ProviderV2`-conformant object for dynamic model resolution + conditional reasoning middleware
- Canonical AI SDK pattern for dynamic providers
