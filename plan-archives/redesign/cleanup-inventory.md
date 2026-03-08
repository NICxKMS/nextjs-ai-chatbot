# Cleanup Inventory

> Complete inventory of everything to remove, rename, or replace in the ground-up rebuild.
> Three categories: Credit/Gateway Logic Removal, "document" → "artifact" Rename, Legacy Pattern Removal.
> Addresses: VIII-1, VIII-2, VIII-9, all audit findings.

---

## 1. Credit/Gateway Logic Removal

### Rule

> **No credit, gateway, quota, or usage-based billing logic exists anywhere in the rebuilt codebase.**
> Rate limiting for abuse prevention (50 req/min, daily message caps) is a separate concern and may be retained, but must NOT use credit/entitlement terminology.

### Items to REMOVE — Exhaustive List

| # | Item | Old Location (plan reference) | Action | Severity |
|---|------|-------------------------------|--------|----------|
| 1 | `data-usage` stream part type | `data-flow-chains-02.md` Flow 2, `StreamBridge` | REMOVE — no credit display in streaming | HIGH |
| 2 | `setUsage()` state + usage display in chat | `data-flow-chains-02.md` Flow 2, `features/chat/components/chat.tsx` | REMOVE — no usage state management | HIGH |
| 3 | Credit depletion `AlertDialog` (non-dismissable overlay) | `traceability/uncovered-features.md` §3, P03-T19 | REMOVE — no credit depletion UI | HIGH |
| 4 | `AppUsage` type definition | `lib/types/ai.types.ts` (old plan) | REMOVE — no usage type needed | MEDIUM |
| 5 | Daily quota/entitlements check in stream-chat action | `data-flow-chains-01.md` Flow 1, `features/chat/actions/stream-chat.ts` | REMOVE — "20 guest / 100 auth" entitlement check | HIGH |
| 6 | `incrementQuota()` in onFinish callback | `data-flow-chains-01.md` Flow 1, `stream-chat.ts` onFinish | REMOVE — no quota increment after messages | HIGH |
| 7 | `getUserMessageCount()` pre-stream validation | `data-flow-chains-01.md` Flow 1 | REMOVE — no daily message count gating | MEDIUM |
| 8 | `vercel-gateway` provider in AI registry | `p03-chat-core.md` P03-T01, `lib/ai/registry.ts` | REMOVE — no gateway provider registration | HIGH |
| 9 | `activate_gateway` error code and handler | `lib/errors/codes.ts`, `seam-inventory.md` SEAM-028 | REMOVE — no gateway error handling | HIGH |
| 10 | Gateway credit card detection in `onError` | `features/chat/lib/chat-callbacks.ts`, SEAM-028 | REMOVE — no gateway-specific error parsing | MEDIUM |
| 11 | `rate_limit:chat:daily_limit_exceeded` error code | `api-contracts.md`, `lib/errors/codes.ts` | EVALUATE — keep ONLY if daily limits remain as abuse prevention, rename from "entitlements" | LOW |
| 12 | Redis quota counter key (`quota:{userId}:messages`) | `lib/cache/keys.ts` | REMOVE — or rename to `ratelimit:{userId}:daily` if abuse prevention retained | MEDIUM |
| 13 | "entitlements check" terminology everywhere | Multiple plan docs | RENAME to "rate limit check" or "daily limit check" if retained | LOW |
| 14 | `lastContext` field on Chat table (if usage-only) | `lib/db/schema.ts`, `data-flows.md` | EVALUATE — remove if only stores usage. Keep if stores model ID or other non-credit context | LOW |
| 15 | Credit/usage prompt fragments in system prompts | `lib/ai/prompts.ts` | REMOVE — no "credit remaining" or "usage warning" in AI prompts | MEDIUM |
| 16 | Usage tracking in `StreamBridge` | `features/chat/components/stream-bridge.tsx` | REMOVE — no `data-usage` processing | MEDIUM |
| 17 | "AI Gateway" references in all documentation | Various plan docs | REMOVE — no gateway concept in codebase | LOW |
| 18 | Gateway-specific ChatSDKError parsing | Error handling code | REMOVE — no gateway error classification | MEDIUM |

### Items to EVALUATE — May Serve Non-Credit Purposes

| Item | Current Purpose | Keep If... | Rename To |
|------|----------------|-----------|-----------|
| Daily message cap (20 guest / 100 auth) | Was "entitlements" | Abuse prevention, not billing | "daily limit" or "rate limit" |
| `incrementDailyMessageCount()` | Was `incrementQuota()` | If daily limits are retained | Keep new name |
| Redis counter for daily messages | Was quota counter | If daily limits are retained | `ratelimit:{userId}:daily` |
| `data-usage` token count (non-credit) | Display token usage to power users | UI shows tokens without credit context | `token-usage` (new part type, optional) |
| `lastContext` on Chat table | Stored usage data + model ID | If it stores model context for chat continuation | Remove `usage` fields, keep `modelId` |

### Items to KEEP — Unrelated to Credits

| Item | Reason |
|------|--------|
| Rate limiting (50 req/min via Redis) | Standard abuse prevention, not credit-based |
| `RateLimiters.chat()` | Redis-based rate limiter — keep |
| `rate_limit:api:too_many_requests` error | Rate limiting, not credit depletion |
| Rate limit check in `proxy.ts` | Lightweight abuse prevention at edge |

### Old Plan File References Containing Credit/Gateway Logic

| File | Specific Reference | Status |
|------|-------------------|--------|
| `plan/integration_map/data-flow-chains-01.md` Flow 1 | "entitlements check (20/day guest, 100/day auth)" | REMOVE or RENAME |
| `plan/integration_map/data-flow-chains-01.md` Flow 1 | "incrementQuota() → Redis" in onFinish | REMOVE |
| `plan/integration_map/data-flow-chains-02.md` Flow 2 | "onData: data-usage → setUsage(mergedUsage)" | REMOVE |
| `plan/traceability/uncovered-features.md` §3 | Credit depletion AlertDialog description | REMOVE |
| `plan/integration_map/api-contracts.md` | "rate_limit:chat:daily_limit_exceeded → 429" | EVALUATE |
| `plan/integration_map/seam-inventory.md` SEAM-028 | "activate_gateway error handling, gateway credit card detection" | REMOVE |
| `plan/phases/p03-chat-core.md` P03-T01 | "vercel-gateway (gateway with all keys)" provider | REMOVE |
| `plan/phases/p03-chat-core.md` P03-T19 | Credit depletion AlertDialog implementation | REMOVE |
| `plan/scaffold/directory-structure.md` | `lib/types/ai.types.ts` containing `AppUsage` | REMOVE type |
| `plan/integration_map/data-flows.md` | `Chat.lastContext (jsonb) — usage data` | EVALUATE |

---

## 2. "document" → "artifact" — Complete Rename Inventory

### Rule

> **Every identifier, file name, database entity, cache key, and stream part that referred to "document" is renamed to "artifact".** Zero occurrences of "document" in the rebuilt codebase (excluding external docs, node_modules, and `.next-docs/`).

### Database Layer

| # | Old Name | New Name | File |
|---|----------|----------|------|
| 1 | `Document` table name | `Artifact` | `lib/db/schema.ts` |
| 2 | `document_kind` enum | `artifact_kind` | `lib/db/schema.ts` |
| 3 | `artifactId` column (Suggestion FK) | `artifactId` | `lib/db/schema.ts` |
| 4 | `documentCreatedAt` column (Suggestion) | `artifactCreatedAt` | `lib/db/schema.ts` |
| 5 | All Drizzle relations referencing `Document` | Reference `Artifact` | `lib/db/schema.ts` |

### Data Access Layer

| # | Old Name | New Name | File |
|---|----------|----------|------|
| 6 | `lib/data/document.ts` file | `lib/data/artifact.ts` | File rename |
| 7 | `getDocumentById()` | `getArtifactById()` | `lib/data/artifact.ts` |
| 8 | `saveDocumentVersion()` | `saveArtifactVersion()` | `lib/data/artifact.ts` |
| 9 | `getDocumentVersions()` | `getArtifactVersions()` | `lib/data/artifact.ts` |
| 10 | `deleteDocumentVersion()` | `deleteArtifactVersionsAfter()` | `lib/data/artifact.ts` |
| 11 | `appendDocumentVersionToCache()` | `appendArtifactVersionToCache()` | `lib/data/artifact.ts` (if cache-through pattern) |
| 12 | `documentData.get()` / `documentData.save()` | Direct function calls: `getArtifactById()` / `saveArtifactVersion()` | Simplify accessor pattern |

### Cache Keys

| # | Old Key | New Key | File |
|---|---------|---------|------|
| 13 | `doc:{docId}:{userId}` | `artifact:{artifactId}` | `lib/cache/keys.ts` |
| 14 | `cacheKeys.doc(id)` | `cacheKeys.artifact(id)` | `lib/cache/keys.ts` |
| 15 | `revalidateArtifact(artifactId)` | `revalidateArtifact(artifactId)` | `lib/cache/revalidate.ts` (param rename) |

### AI Tool Definitions

| # | Old Name | New Name | File |
|---|----------|----------|------|
| 16 | `create-document.ts` file | `create-artifact.ts` | `features/chat/lib/tools/` |
| 17 | `update-document.ts` file | `update-artifact.ts` | `features/chat/lib/tools/` |
| 18 | `createDocument` tool name (visible to AI) | `createArtifact` | Tool description string |
| 19 | `updateDocument` tool name (visible to AI) | `updateArtifact` | Tool description string |
| 20 | `artifactId` parameter in update tool | `id` (artifact's ID) | Tool parameter schema |
| 21 | Tool description: "create a document" | "create an artifact" | Tool description string |

### Handler System

| # | Old Name | New Name | File |
|---|----------|----------|------|
| 22 | `DocumentHandler` interface | `ArtifactHandler` | `lib/types/artifact-handler.types.ts` |
| 23 | `DocumentStreamWriter` interface | `ArtifactStreamWriter` | `lib/types/artifact-handler.types.ts` |
| 24 | `CreateDocumentParams` type | `CreateArtifactParams` | `lib/types/artifact-handler.types.ts` |
| 25 | `UpdateDocumentParams` type | `UpdateArtifactParams` | `lib/types/artifact-handler.types.ts` |
| 26 | `documentHandlersByArtifactKind` map | `artifactHandlersByKind` (or Map in `artifact-handlers.ts`) | `lib/ai/artifact-handlers.ts` |
| 27 | `registerDocumentHandler()` | `registerArtifactHandler()` | `lib/ai/artifact-handlers.ts` |
| 28 | `getDocumentHandler()` | `getArtifactHandler()` | `lib/ai/artifact-handlers.ts` |
| 29 | `hasDocumentHandler()` | `hasArtifactHandler()` | `lib/ai/artifact-handlers.ts` |
| 30 | `onCreateDocument()` method | `create()` | `ArtifactHandler` interface |
| 31 | `onUpdateDocument()` method | `update()` | `ArtifactHandler` interface |
| 32 | `features/artifacts/handlers/base.ts` | Remove (interface moves to `lib/types/`) | File deleted |

### Data Stream Parts

| # | Old Part Type | New Part Type | Context |
|---|---------------|---------------|---------|
| 33 | `data-id` | `artifact-id` | Server→Client: artifact UUID |
| 34 | `data-title` | `artifact-title` | Server→Client: artifact title |
| 35 | `data-kind` | `artifact-kind` | Server→Client: artifact kind |
| 36 | `data-clear` | `artifact-clear` | Server→Client: clear content signal |
| 37 | `data-finish` | `artifact-finish` | Server→Client: generation complete |
| 38 | `data-textDelta` | `artifact-textDelta` | Content delta: APPEND |
| 39 | `data-codeDelta` | `artifact-codeDelta` | Content delta: REPLACE |
| 40 | `data-sheetDelta` | `artifact-sheetDelta` | Content delta: REPLACE |
| 41 | `data-imageDelta` | `artifact-imageDelta` | Content delta: REPLACE |
| 42 | `data-suggestion` | `artifact-suggestion` | Inline edit suggestion |
| 43 | `data-chatTitle` | `chat-title` | Chat title (not artifact-related) |

### Components

| # | Old Name | New Name | Location |
|---|----------|----------|----------|
| 44 | `document-preview.tsx` | `artifact-preview.tsx` | `features/artifacts/components/` |
| 45 | `DocumentPreview` component | `ArtifactPreview` | Component export |
| 46 | `create-artifact.tsx` (old: manual creation UI) | `artifact-preview.tsx` (if preview is the actual need) | Evaluate if needed |

### Types

| # | Old Name | New Name | Location |
|---|----------|----------|----------|
| 47 | `DocumentKind` | `ArtifactKind` | `lib/types/artifact.types.ts` |
| 48 | `Document` (Drizzle-inferred) | `Artifact` | Drizzle `typeof artifact.$inferSelect` |
| 49 | `UIDocument` | `UIArtifact` | `features/artifacts/types/artifact.types.ts` |
| 50 | `ArtifactDefinition` | `ArtifactHandler` (or remove if redundant) | Evaluate |
| 51 | `DocumentVersion` | `ArtifactVersion` | If not using composite PK pattern |

### Schemas

| # | Old Name | New Name | Location |
|---|----------|----------|----------|
| 52 | `documentSchema` (Zod) | `artifactSchema` | `features/artifacts/schemas/artifact.schema.ts` |
| 53 | `artifactId` field in Suggestion schemas | `artifactId` | Zod schema fields |
| 54 | `documentCreatedAt` field in schemas | `artifactCreatedAt` | Zod schema fields |

### API Routes

| # | Old Path | New Path | Location |
|---|----------|----------|----------|
| 55 | `/api/document` (route.ts references) | `/api/artifact` | `app/api/artifact/route.ts` |
| 56 | `artifactId` in request/response payloads | `artifactId` | API contract |
| 57 | `/api/suggestions?artifactId=` | `/api/suggestions?artifactId=` | Query parameter |

### System Prompts

| # | Old Reference | New Reference | Location |
|---|---------------|---------------|----------|
| 58 | "create a document" in prompt text | "create an artifact" | `lib/ai/prompts.ts` |
| 59 | "update the document" in prompt text | "update the artifact" | `lib/ai/prompts.ts` |
| 60 | "document" in tool descriptions | "artifact" | Tool definition strings |

### Test Fixtures

| # | Old Name | New Name | Location |
|---|----------|----------|----------|
| 61 | `tests/fixtures/document.ts` | `tests/fixtures/artifact.ts` | File rename |
| 62 | `createTestDocument()` | `createTestArtifact()` | Factory function |

### Estimated Scope

- **~62 individual renames** across **~20 files**
- Should be done as the first task in the rebuild — no code written with "document" naming

---

## 3. Legacy Pattern Removal

### Items from `oldapp/` That Should NOT Survive the Rebuild

| # | Legacy Pattern | Replacement | Rationale |
|---|---------------|-------------|-----------|
| 1 | `oldapp/proxy.ts` (custom proxy file) | `proxy.ts` at project root (Next.js 16 convention) | Next.js 16 renamed middleware.js to proxy.js. Old custom proxy pattern is superseded. |
| 2 | `middleware.ts` (if any reference remains) | `proxy.ts` at project root | Same as above. No middleware.ts in Next.js 16. |
| 3 | `app/(chat)/chat-layout-client.tsx` | Server layout `app/(chat)/layout.tsx` | CRITICAL-1 fix. Layout is a server component. No monolithic client layout wrapper. |
| 4 | SWR-as-state-store (`useSWR("artifact", null)`) | `useSyncExternalStore` (`features/artifacts/lib/artifact-store.ts`) | III-1 fix. SWR without fetcher is an anti-pattern. useSyncExternalStore with selectors reduces re-renders ~80%. |
| 5 | `window.dispatchEvent('chat-title-updated')` | `PendingChats.updateTitle()` via typed context | III-2, IV-2 fix. Global events are untyped, untraceable, and untestable. |
| 6 | `window.dispatchEvent` for any cross-feature communication | Typed React context + callbacks | All 3 window event channels replaced by single-channel typed APIs. |
| 7 | `dynamic(import, { ssr: false })` for sidebar | Server component `SidebarShell` with `'use cache'` | I-2 fix. Server-rendered sidebar saves ~15KB client JS and eliminates waterfall. |
| 8 | `dynamic(import, { ssr: false })` as default strategy | Server components are default; `'use client'` only when needed | Principle 1 (Server-First Architecture). |
| 9 | `pollForTitle()` (3-5× setTimeout at 500ms intervals) | Server-side title await before stream close + single `chat-title` data part | VII-3 fix. Eliminates 5 redundant HTTP requests per chat creation. |
| 10 | 3-channel title update (stream + polling + window event) | Single-channel: `chat-title` stream part → `PendingChats.updateTitle()` | IV-2 fix. One typed API, one delivery mechanism. |
| 11 | `ChatLayoutClient` monolith (~524 lines) | `ChatShell` (~60 lines) + extracted hooks + pure functions | CRITICAL-2 fix. God Component decomposed into focused units. |
| 12 | 14+ responsibilities in Chat component | Max 3 per component. Logic in hooks, pure functions in lib/ | V-1 fix. Single Responsibility Principle. |
| 13 | 15-16 prop drilling through Chat children | `ChatSessionContext` with intent-based callbacks | V-1, V-4 fix. Children read from context, not prop chains. |
| 14 | Setter functions as implicit RPC props | Intent-based callbacks (`sendMessage`, `stop`) | V-4 fix. Clear API contract. |
| 15 | `ChatStreamProvider` at layout level | `ChatStreamProvider` at page level (inside chat page) | V-5, III-3 fix. High-frequency streaming deltas don't cascade to sidebar. |
| 16 | StreamBridge as hidden controller with business logic | Thin bridge (~20 lines) + pure `processStreamDelta()` function | IV-7 fix. Business logic is extracted and testable. |
| 17 | SWR `mutate("artifact")` triggering 5+ subscriber re-renders | `artifactStore.setState()` + selector-based subscriptions | VI-1, VI-2 fix. ~80% fewer re-renders during streaming. |
| 18 | `PATCH /api/vote` Route Handler | Server Action `voteOnMessage()` with `updateTag` | VII-5 fix. Enables read-your-own-writes + useOptimistic. |
| 19 | No `revalidateTag`/`updateTag` after any mutation | Every mutation calls appropriate revalidation primitive | VII-1 fix (CRITICAL). Prevents stale Router Cache. |
| 20 | Thrown errors from Server Actions | Return `ActionResult<T>` result objects | VII-7 fix. React sanitizes thrown errors — client loses structured info. |
| 21 | `app-shell.tsx` in `components/` importing from `features/auth/` | Move `getAppSession()` to `lib/auth/session.ts` | VIII-4 fix. Respects import boundaries. |
| 22 | No import boundary enforcement | `scripts/check-imports.mjs` in `pnpm lint` | VIII-8 fix. CI-enforced import rules. |
| 23 | `loading.tsx` for chat route | PPR with `<Suspense>` boundaries | Server components render real content, not loading skeletons. |
| 24 | Client-fetched sidebar (SWR waterfall) | Server-fetched initial page + client SWR for pagination | II-1 fix. ~300ms vs ~1000ms for initial sidebar. |
| 25 | Sequential server fetches on chat page | `Promise.all([chat, votes])` parallel fetch | II-2 fix. |
| 26 | 9+ nested providers for unrelated concerns | Scoped + flat provider architecture (max 7 levels) | I-4, V-3 fix. Settings/ChatStream don't cascade to sidebar. |
| 27 | `TooltipProvider` at root layout | Moved to point of consumption (sidebar, chat header) | I-5 fix. |
| 28 | `auth/callback/route.ts` (OAuth callback) | Evaluate if needed. Server Action auth flow preferred. | Simplification if no OAuth. |
| 29 | `auth/guest/route.ts` (guest JWT creation) | `proxy.ts` handles guest bootstrap at edge | Consolidation into proxy layer. |
| 30 | `auth/logout/route.ts` (logout via route handler) | Server Action `logout()` via `cookies.delete()` + redirect | Consistent pattern — mutations are Server Actions. |
| 31 | `api/vote/route.ts` | Server Action in `features/voting/actions/vote.ts` | VII-5 fix. |
| 32 | `api/chat/[id]/messages/route.ts` | Messages co-fetched with chat via `getChatWithMessages()` | Eliminates separate API call. |
| 33 | `api/chat/[id]/reconnect/route.ts` | Not needed — `useChat` handles SSE lifecycle | Simplification. |
| 34 | `features/artifacts/components/artifact-messages.tsx` | Removed — messages shown in main chat, not duplicated in artifact panel | Simplification. |
| 35 | `features/artifacts/components/create-artifact.tsx` (manual creation UI) | Removed — artifacts created only via AI tool calls | Simplification. |
| 36 | `features/artifacts/components/toolbar.tsx` (draggable toolbar) | Consolidated into `artifact-actions.tsx` | De-duplication. |
| 37 | `features/artifacts/components/diffview.tsx` (version diff) | Evaluate — keep if needed, but not in MVP | Scope reduction. |
| 38 | `features/chat/components/stream-bridge.tsx` complex logic | Pure function `processStreamDelta()` + thin bridge component | IV-7, VIII-7 fix. |
| 39 | `features/chat/hooks/use-messages.ts` (context for messages) | Messages managed by `ChatSessionContext` (via `useChatSession`) | Consolidation — no separate message context. |
| 40 | `features/settings/lib/defaults.ts` + `features/settings/lib/types.ts` | Merged into `features/settings/types/settings.types.ts` + inline defaults | Fewer files. |

### Old API Routes Removed or Replaced

| Old Route | Replacement | Reason |
|-----------|-------------|--------|
| `POST /api/auth/exchange` | Server Action `login()` | Auth flow consolidated |
| `POST /api/auth/guest` | `proxy.ts` guest bootstrap | Edge-level handling |
| `POST /api/auth/logout` | Server Action `logout()` | Mutations are Server Actions |
| `PATCH /api/vote` | Server Action `voteOnMessage()` | VII-5 fix |
| `GET /api/chat/[id]/messages` | Co-fetched via `getChatWithMessages()` | Eliminates waterfall |
| `GET /api/chat/[id]/reconnect` | Not needed | `useChat` manages SSE |
| `DELETE /api/history` | Server Action `deleteAllChats()` | Mutations are Server Actions |
| `GET /api/document` | `GET /api/artifact` (renamed) | VIII-1 fix |
| `POST /api/document` | `POST /api/artifact` (renamed) | VIII-1 fix |
| `DELETE /api/document` | Server Action if user-initiated, or `POST /api/artifact` | Evaluate need |

### Old Components Not Carried Forward

| Component | File | Reason |
|-----------|------|--------|
| `ChatLayoutClient` | `app/(chat)/chat-layout-client.tsx` | CRITICAL-1: Layout is server component |
| `AppShell` | `components/app-shell.tsx` | Provider tree moved to layout.tsx directly |
| `ArtifactMessages` | `features/artifacts/components/artifact-messages.tsx` | Messages shown in main chat only |
| `CreateArtifact` (manual) | `features/artifacts/components/create-artifact.tsx` | Artifacts created via AI tools only |
| `Toolbar` (draggable) | `features/artifacts/components/toolbar.tsx` | Merged into artifact-actions.tsx |
| `Console` | `features/artifacts/editors/console.tsx` | Evaluate — may live inside code-editor.tsx |
| `DiffView` | `features/artifacts/components/diffview.tsx` | Evaluate — not in MVP scope |

### Old Hooks Not Carried Forward

| Hook | File | Replacement |
|------|------|-------------|
| `useMessages` | `features/chat/hooks/use-messages.ts` | `ChatSessionContext` (via `useChatSession`) |
| `useArtifact` (SWR-based) | `features/artifacts/hooks/use-artifact.ts` | `useSyncExternalStore` (`artifact-store.ts`) |

### Old Lib Files Not Carried Forward

| File | Reason |
|------|--------|
| `lib/data/document.ts` | Renamed to `lib/data/artifact.ts` |
| `lib/data/context.ts` (`DataContext` class) | Simplified to `lib/types/data-context.types.ts` plain type |
| `lib/ai/providers.ts` | Split into `registry.ts` + `provider.ts` for clarity |
| `lib/ai/model-discovery.ts` | Merged into `lib/ai/models.ts` |
| `lib/api/guards.ts` | Auth checks inlined in Server Actions / route handlers |
| `lib/api/validation.ts` | Zod .parse() called directly in handlers |
| `lib/api/response.ts` | `AppError.toResponse()` handles error responses |
| `lib/rate-limit/config.ts` | Inline in proxy.ts + route handlers, or `lib/cache/` |
| `lib/utils/lazy.ts` | Not needed — server components eliminate most lazy loading |
| `lib/utils/logger.ts` | Evaluate — console or structured logger |
| `lib/hooks/` barrel (if `index.ts`) | No barrel files |
| `lib/db/index.ts` barrel | No barrel files — direct imports |
| `lib/cache/index.ts` barrel | No barrel files — direct imports |
| `lib/ai/index.ts` barrel | No barrel files — direct imports |
| `lib/auth/index.ts` barrel | No barrel files — direct import `session.ts` |
| `lib/errors/index.ts` barrel | No barrel files — direct imports |
| `lib/types/index.ts` barrel | No barrel files — direct imports per type file |

---

## 4. Terminology Cleanup Summary

| Old Term | New Term | Scope |
|----------|----------|-------|
| "document" (any code identifier) | "artifact" | ALL code, types, files, DB, cache, API |
| "entitlements check" | "daily limit check" (if retained) | Rate limiting context |
| "credit depletion" | REMOVED entirely | No concept exists |
| "AI Gateway" | REMOVED from all docs | No concept exists |
| "activate_gateway" | REMOVED | Error code deleted |
| "usage alert" | REMOVED (or "rate limit notification" if retained) | No credit system |
| "DocumentHandler" | "ArtifactHandler" | Handler interface |
| "middleware.ts" | "proxy.ts" | Next.js 16 convention |
| `data-*` stream parts | `artifact-*` stream parts | Data stream protocol |
| `data-chatTitle` | `chat-title` | Rename for consistency |

---

## 5. Verification Checklist

After the rebuild, run these verification steps:

```bash
# 1. No "document" in code identifiers (excluding .next-docs/, node_modules/, oldapp/)
grep -r "document" --include="*.ts" --include="*.tsx" \
  --exclude-dir=".next-docs" --exclude-dir="node_modules" \
  --exclude-dir="oldapp" --exclude-dir="plan" \
  --exclude-dir="plan_review" --exclude-dir="redesign" \
  | grep -v "// " | grep -v "*.md"
# Expected: 0 results

# 2. No credit/gateway logic
grep -rE "credit|gateway|quota|entitlement|AppUsage|activate_gateway|data-usage" \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir="node_modules" --exclude-dir="oldapp" \
  --exclude-dir="plan" --exclude-dir="plan_review" --exclude-dir="redesign"
# Expected: 0 results

# 3. No middleware.ts (should be proxy.ts)
find . -name "middleware.ts" -not -path "*/node_modules/*" -not -path "*/oldapp/*"
# Expected: 0 results

# 4. proxy.ts exists at root
test -f proxy.ts && echo "OK" || echo "MISSING"
# Expected: OK

# 5. No barrel files (except allowed exceptions)
find . -name "index.ts" -not -path "*/node_modules/*" -not -path "*/oldapp/*" \
  -not -path "*/handlers/index.ts" -not -path "*/migrations/*"
# Expected: 0 results (or only the handlers/index.ts exception)

# 6. Validation passes
pnpm format && pnpm typecheck && pnpm lint
# Expected: All pass
```
