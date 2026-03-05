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
- Used `fallbackProvider` parameter with a `ProviderV3`-conformant object for dynamic model resolution + conditional reasoning middleware
- Canonical AI SDK pattern for dynamic providers

### D009 — lib/ → features/ Import for Guest Auth (P2-T03)
- `lib/auth/session.ts` imports `verifyGuestToken` from `@/features/auth/lib/guest`
- This violates conventions.md §3 (`lib/ → nothing above`) but is spec-prescribed (P2-T01 + P2-T03 specs design this relationship)
- Accepted as-is since session resolution fundamentally needs guest verification
- Alternative: relocate `guest.ts` to `lib/auth/` (deferred to sweep if needed)

### D010 — Rate Limiting Deferred (P2-T04)
- Task spec requires per-action rate limiting (login 5/min, register 3/min)
- No rate limiting infrastructure exists yet — deferred to P6 or dedicated follow-up task
- Auth actions have TODO markers for wiring when infra is ready

### D011 — Supabase Client Variants (P2-T04, P2-T06)
- `supabase-action.ts` — write-capable server client for Server Actions (different cookie adapter from session.ts)
- `supabase-browser.ts` — singleton browser client for client-side auth state listeners
- Both collocated in `features/auth/lib/` alongside guest utilities

### D012 — Register Partial Failure Gap (P2 Review)
- If Supabase `signUp` succeeds but `createUser` fails, Supabase user exists without local DB record
- Login flow doesn't reconcile (create missing DB record)
- Tracked for future resolution (post-MVP or P6 cleanup task)

### D013 — Double JWT Verification on Rotation (P2 Review)
- `verifyGuestToken()` + `rotateGuestToken()` decode the JWT twice in proxy rotation path
- Accepted as-is (~0.5ms overhead in edge function is negligible)
- Could optimize by passing verified payload if performance becomes a concern

### D014 — AppError Factory Methods Require Explicit Error Code (P0-T08 Retrofix)
- **Original:** Factory methods (`AppError.internal()`, `AppError.unauthorized()`, etc.) hardcoded a single error code each, hiding the granular `type:surface:detail` system
- **Changed:** All factory methods now require the error code as the first parameter, type-restricted to the matching category using `Extract<ErrorCode, \`prefix:${string}\`>`
- **Why:** The granular error code system (19 codes) was defeated by factory methods collapsing categories to a single default. Call sites now explicitly declare the exact error code, improving traceability and preventing misuse (e.g., using `internal_error:database:query_failed` for cache failures)
- **Impact:** All 15 call sites in `lib/data/` updated. Future callers must choose the correct code — TypeScript enforces category membership

### D015 — AI SDK Type Reality (P3-T05)
- AI SDK `@ai-sdk/react` does not export an `Attachment` type — using inline type definition in ChatSessionValue
- `ChatStatus` from AI SDK has no `'idle'` value — uses `'ready'` instead
- `UIMessage` is the correct type (not `Message`) from `@ai-sdk/react`
- Downstream tasks (P3-T10, P3-T11, P3-T18, P3-T21) must use these verified SDK types

### D016 — ArtifactHandler Has No Render Method (P3-T04)
- P0-T06 defined `ArtifactHandler` with `create`/`update` only (server-side operations)
- `render` is a client-side React component concern, addressed separately in P4
- P4 will need a client-side kind→component map separate from server handler registry
