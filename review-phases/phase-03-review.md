# Phase 3: Error & Data Infrastructure — Detailed Review (Multi-Agent, Chunked)

- Date: 2026-02-18
- Phase: Phase 3: Error & Data Infrastructure
- Task count: 15
- Chunk files: P3-C1, P3-C2, P3-C3

## Summary

- Status counts: Completed=5, Partial=9, Incorrect=1, Missing=0
- Difference counts: defect=3, partial=7, other-problem=0, improvement=2, no-difference=3

## Task Matrix

| Task | Name | Status | Difference Type | Detail |
|---|---|---|---|---|
| 3.1 | Create Shared Fetcher & Error Handler Functions | Completed | no-difference | `fetcher<T>` and `fetchWithErrorHandlers` are implemented with JSON error parsing, AppError mapping, offline detection, chat-not-found redirect behavior, and barrel export alignment. |
| 3.2 | Create Missing Utility Functions | Completed | no-difference | All required utilities exist in dedicated modules and are exported via the `lib/utils` barrel: `generateUUID`, `getMostRecentUserMessage`, `getTrailingMessageId`, and `sanitizeText`. |
| 3.3 | Fix Error Utility Functions | Partial | partial | Database error mapping utilities are implemented (`DatabaseError`, `mapPostgresCodeToError`, `toDatabaseError`), but guest-specific messaging is implemented through contextual helpers instead of the planned `getMessageByErrorCode` path, and no active call sites consume the contextual guest helpers. |
| 3.4 | Fix Missing Auth Guard Functions | Completed | improvement | Required guards are present and aligned with v6 patterns. `requireAuth` now returns `{ session, userId }`; rate limiting is split into named-limiter and custom-config guards for clearer typing and reuse. |
| 3.5 | Fix saveWithContext Batch Operation | Partial | defect | `saveWithContext` now uses a transaction, idempotent message insert, ownership-aware context update, and debug logging, but it only invalidates message-list caches and does not invalidate chat-entity cache keys after context mutation; the service write path also does not call `saveWithContext`. |
| 3.6 | Fix deleteAfterTimestamp for Message Regeneration | Partial | defect | `deleteAfterTimestamp` exists with cache invalidation and is used by the trailing-message action, but the chat-service regeneration flow does not call this repository method and performs its own DB transaction without repository-level cache invalidation, causing plan drift and stale-cache risk. |
| 3.7 | Implement Circuit Breaker for Redis | Partial | partial | Circuit breaker primitives and constants are implemented and used by `strategies`/`zset`, but the repository hot path uses `TieredCache`, which performs direct Redis operations without `isCircuitOpen`/failure tracking; outage protection is therefore not consistently applied. |
| 3.8 | Implement Guest-Aware Data Strategy | Incorrect | defect | `RepositoryContext.isGuest` is populated, but repositories do not use it for guest cache-only behavior. On cache miss, base repository reads still fall back to DB, and `ChatRepository`/`MessageRepository`/`ArtifactRepository` do not implement the required guest short-circuit semantics. |
| 3.9 | Create Cache Entity Types | Completed | improvement | All required cache entity types are implemented and exported; implementation additionally includes runtime type guards and broader re-exports for safe cache casting and consumption. |
| 3.10 | Create Message Parts Type System | Partial | partial | A strong message-parts system with Zod schemas and exports is present, but plan-specified coverage is incomplete: required part types (`ErrorPart`, `SystemPart`, `AudioPart`, `VideoPart`, `EmbedPart`) and helper names (`getTextContent`, `getImageParts`) are not implemented. |
| 3.11 | Add Missing ZSET Cache Operations | Partial | partial | Low-level ZSET primitives were added (`zadd`, `zrem`, `zrevrange`), but the plan-required chat-list APIs (`addToChatList`, `removeFromChatList`, `getChatList`) and chat-repository integration are not implemented. |
| 3.12 | Create Batch Operations & Transaction Wrapper | Partial | partial | Batch insert/update/delete utilities and a robust `withTransaction` wrapper exist, but required API contract details are incomplete: `batchUpdate(..., keyFn)` is not implemented, progress callback support is missing, and outputs were placed under `lib/db` instead of the requested `lib/data` paths. |
| 3.13 | Create Cursor-Based Pagination | Partial | partial | A comprehensive cursor pagination utility was created, but it diverges from the requested contract: type/function names differ (`CursorPaginationOptions`, `paginate`, `createPaginationResponse`), required APIs (`CursorPaginationParams`, `applyCursorPagination`, `buildCursorResponse`) are missing, and exports are in `lib/db` rather than `lib/data`. |
| 3.14a | Fix Schema Column Types & Data Casting | Partial | partial | `lastContext` typing and cache casting utilities were implemented correctly, but the plan bullet to document auth provider architecture differences (NextAuth vs Supabase patterns) in code comments is not present in the updated schema/casting scope. |
| 3.14b | Fix Auth Route Operational Issues | Completed | no-difference | Guest auth route includes structured operational logging for session reuse/create and rate-limit events, and exports `maxDuration = 10` as requested. |

## Defect Items

### 3.5 — Fix saveWithContext Batch Operation (Partial)
- Detail: `saveWithContext` now uses a transaction, idempotent message insert, ownership-aware context update, and debug logging, but it only invalidates message-list caches and does not invalidate chat-entity cache keys after context mutation; the service write path also does not call `saveWithContext`.
- Issues:
  - Chat entity cache invalidation is missing after context updates (only message cache keys are invalidated).
  - Primary chat save path in ChatService does not route through `saveWithContext`, limiting task impact on runtime flows.
- Suggested fixes:
  - Invalidate `chat:${chatId}` and chat list cache keys after successful context updates.
  - Route chat/message persistence flow through `saveWithContext` (or replicate equivalent context + cache semantics in `ChatService.saveChat`).
- Evidence (new):
  - lib/data/repositories/message.repository.ts#L579-L667
  - lib/data/repositories/chat.repository.ts#L107-L115
  - lib/data/services/chat.service.ts#L49-L57
  - lib/data/services/chat.service.ts#L266-L303
- Evidence (legacy):
  - archive/oldapp/lib/data/chat.ts#L1015-L1168
  - archive/oldapp/lib/data/chat-operations.ts#L68-L75
- Plan refs:
  - .apm/Implementation_Plan.md#L361-L369
  - .apm/Memory/Phase_03_error_data_infrastructure/Task_3_05_save_with_context.md#L1-L56

### 3.6 — Fix deleteAfterTimestamp for Message Regeneration (Partial)
- Detail: `deleteAfterTimestamp` exists with cache invalidation and is used by the trailing-message action, but the chat-service regeneration flow does not call this repository method and performs its own DB transaction without repository-level cache invalidation, causing plan drift and stale-cache risk.
- Issues:
  - Regeneration logic in `ChatService.deleteMessagesAfterTimestamp` bypasses `MessageRepository.deleteAfterTimestamp`, so required service wiring is incomplete.
  - Service-side regeneration delete path does not invalidate message/chat caches after mutation.
- Suggested fixes:
  - Route regeneration deletes through `messageRepository.deleteAfterTimestamp` (or extract shared deletion primitive used by both service and action).
  - After service-side deletion transaction, invalidate chat message keys and chat entity/list keys to avoid stale reads.
- Evidence (new):
  - lib/data/repositories/message.repository.ts#L697-L717
  - features/chat/actions/delete-trailing-messages.action.ts#L72-L103
  - lib/data/services/chat.service.ts#L633-L704
- Evidence (legacy):
  - archive/oldapp/lib/data/chat.ts#L1190-L1235
- Plan refs:
  - .apm/Implementation_Plan.md#L371-L378

### 3.8 — Implement Guest-Aware Data Strategy (Incorrect)
- Detail: `RepositoryContext.isGuest` is populated, but repositories do not use it for guest cache-only behavior. On cache miss, base repository reads still fall back to DB, and `ChatRepository`/`MessageRepository`/`ArtifactRepository` do not implement the required guest short-circuit semantics.
- Issues:
  - Guest cache-miss path still performs DB fallback in repository reads, violating the required guest cache-only strategy.
  - Guest-aware checks were not applied to `ChatRepository.doFindWithMessages`, `MessageRepository`, and `ArtifactRepository` as specified.
  - Only requirement 3.8.4 is satisfied (`RepositoryContext.isGuest` is populated).
- Suggested fixes:
  - Add guest short-circuit behavior on cache miss in base/chat read paths (return `null`/empty results for guests without DB fallback).
  - Implement explicit guest-aware branches for chat-with-messages, message reads, and artifact reads/writes where plan requires cache-only behavior.
  - Add regression tests verifying no DB queries are executed for guest cache misses.
- Evidence (new):
  - lib/data/repositories/base.repository.ts#L359-L379
  - lib/data/repositories/chat.repository.ts#L157-L166
  - lib/data/repositories/chat.repository.ts#L519-L535
  - lib/data/repositories/message.repository.ts#L155-L187
  - lib/data/repositories/artifact.repository.ts#L169-L211
  - lib/data/services/auth.service.ts#L317-L323
- Evidence (legacy):
  - archive/oldapp/lib/data/chat.ts#L85-L124
  - archive/oldapp/lib/data/chat.ts#L187-L270
- Plan refs:
  - .apm/Implementation_Plan.md#L391-L399

## Partial Items

### 3.3 — Fix Error Utility Functions (Partial)
- Detail: Database error mapping utilities are implemented (`DatabaseError`, `mapPostgresCodeToError`, `toDatabaseError`), but guest-specific messaging is implemented through contextual helpers instead of the planned `getMessageByErrorCode` path, and no active call sites consume the contextual guest helpers.
- Issues:
  - Planned `getMessageByErrorCode`-style guest messaging hook is not present in new error entry points.
  - `getErrorMessageWithContext`/guest contextual helpers are defined but have no non-test runtime consumers.
- Suggested fixes:
  - Add a compatibility `getMessageByErrorCode` wrapper (or equivalent adapter) that routes through contextual message resolution.
  - Wire guest-aware message resolution into the main error rendering/response path where user type is known.
- Evidence (new):
  - lib/errors/database.ts#L107-L399
  - lib/errors/messages.ts#L360-L514
  - lib/errors.ts#L1-L422
- Evidence (legacy):
  - archive/oldapp/lib/errors.ts#L110-L188
  - archive/oldapp/lib/errors.ts#L186-L260
- Plan refs:
  - .apm/Implementation_Plan.md#L340-L349
  - .apm/Memory/Phase_03_error_data_infrastructure/Task_3_03_error_utility_functions.md#L1-L76

### 3.7 — Implement Circuit Breaker for Redis (Partial)
- Detail: Circuit breaker primitives and constants are implemented and used by `strategies`/`zset`, but the repository hot path uses `TieredCache`, which performs direct Redis operations without `isCircuitOpen`/failure tracking; outage protection is therefore not consistently applied.
- Issues:
  - Primary repository cache operations (`TieredCache`) bypass circuit-breaker guards, so cascading-failure protection is incomplete.
  - Circuit-breaker behavior is split across cache modules rather than uniformly enforced at the shared cache client path.
- Suggested fixes:
  - Integrate `isCircuitOpen`, `recordCacheFailure`, and `recordCacheSuccess` into `TieredCache` get/set/delete/has operations.
  - Prefer a centralized wrapper for Redis calls so all cache modules inherit the same breaker behavior.
- Evidence (new):
  - lib/cache/circuit-breaker.ts#L22-L132
  - lib/cache/strategies.ts#L104-L204
  - lib/cache/zset.ts#L79-L116
  - lib/data/repositories/base.repository.ts#L233-L237
  - lib/cache/tiered-cache.ts#L161-L299
- Evidence (legacy):
  - archive/oldapp/lib/cache/operations.ts#L37-L89
  - archive/oldapp/lib/cache/operations.ts#L149-L219
- Plan refs:
  - .apm/Implementation_Plan.md#L380-L389

### 3.10 — Create Message Parts Type System (Partial)
- Detail: A strong message-parts system with Zod schemas and exports is present, but plan-specified coverage is incomplete: required part types (`ErrorPart`, `SystemPart`, `AudioPart`, `VideoPart`, `EmbedPart`) and helper names (`getTextContent`, `getImageParts`) are not implemented.
- Issues:
  - Union/type schema set does not include several plan-required part families (error/system/audio/video/embed).
  - Plan-required helper API names are missing, which can break downstream expectations tied to task contract.
- Suggested fixes:
  - Add schemas/types for `ErrorPart`, `SystemPart`, `AudioPart`, `VideoPart`, and `EmbedPart`, then include them in `MessagePart` union + exports.
  - Add `getTextContent` and `getImageParts` helpers (or explicit aliases to existing helpers) and export them via `lib/types/index.ts`.
- Evidence (new):
  - lib/types/message-parts.ts#L38-L195
  - lib/types/message-parts.ts#L204-L264
  - lib/types/message-parts.ts#L447-L500
  - lib/types/index.ts#L567-L617
- Evidence (legacy):
  - archive/oldapp/lib/types/message-parts.ts#L20-L155
  - archive/oldapp/lib/types/message-parts.ts#L235-L289
- Plan refs:
  - .apm/Implementation_Plan.md#L413-L422

### 3.11 — Add Missing ZSET Cache Operations (Partial)
- Detail: Low-level ZSET primitives were added (`zadd`, `zrem`, `zrevrange`), but the plan-required chat-list APIs (`addToChatList`, `removeFromChatList`, `getChatList`) and chat-repository integration are not implemented.
- Issues:
  - The required wrapper contract is missing: no `addToChatList`, `removeFromChatList`, or `getChatList` symbols are implemented.
  - Chat list repository flow (`findByUserId`) remains DB-only and is not integrated with ZSET chat-list cache management.
- Suggested fixes:
  - Add typed wrappers in `lib/cache` that map chat list operations to `zadd`/`zrem`/`zrevrange` using `userChatsKey`.
  - Integrate those wrappers in chat repository create/update/delete/list paths for plan-level parity.
- Evidence (new):
  - lib/cache/zset.ts#L74-L476
  - lib/cache/index.ts#L253-L253
  - lib/data/repositories/chat.repository.ts#L127-L128
  - lib/data/repositories/chat.repository.ts#L418-L500
- Evidence (legacy):
  - archive/oldapp/lib/cache/operations.ts#L703-L703
  - archive/oldapp/lib/cache/operations.ts#L735-L772
- Plan refs:
  - .apm/Implementation_Plan.md#L424-L433
  - .apm/Memory/Phase_03_error_data_infrastructure/Task_3_11_cache_quota.md#L1-L41

### 3.12 — Create Batch Operations & Transaction Wrapper (Partial)
- Detail: Batch insert/update/delete utilities and a robust `withTransaction` wrapper exist, but required API contract details are incomplete: `batchUpdate(..., keyFn)` is not implemented, progress callback support is missing, and outputs were placed under `lib/db` instead of the requested `lib/data` paths.
- Issues:
  - Plan bullet `batchUpdate<T>(table, items, keyFn)` is not met; current update API is fixed to `{ id, data }`.
  - Plan bullet for progress callback support is unmet (no progress callback option in batch operation options).
  - Requested output location (`lib/data/batch.ts`, `lib/data/transaction.ts`) is not present; implementation is under `lib/db/*`.
- Suggested fixes:
  - Add a `keyFn`-based overload (or adapter) for `batchUpdate` to satisfy the plan contract.
  - Add optional progress callback support (e.g., `onProgress({ processed, total, chunk })`) across batch operations.
  - Create `lib/data` compatibility exports or wrappers to align with requested module paths.
- Evidence (new):
  - lib/db/batch.ts#L48-L52
  - lib/db/batch.ts#L112-L357
  - lib/db/client.ts#L204-L248
  - lib/db/index.ts#L19-L34
  - lib/data/index.ts#L1-L154
- Evidence (legacy):
  - archive/oldapp/lib/db/batch.ts#L49-L258
  - archive/oldapp/lib/db/transactions.ts#L34-L90
- Plan refs:
  - .apm/Implementation_Plan.md#L434-L444
  - .apm/Memory/Phase_03_error_data_infrastructure/Task_3_12_batch_operations.md#L1-L75

### 3.13 — Create Cursor-Based Pagination (Partial)
- Detail: A comprehensive cursor pagination utility was created, but it diverges from the requested contract: type/function names differ (`CursorPaginationOptions`, `paginate`, `createPaginationResponse`), required APIs (`CursorPaginationParams`, `applyCursorPagination`, `buildCursorResponse`) are missing, and exports are in `lib/db` rather than `lib/data`.
- Issues:
  - Required type name `CursorPaginationParams` is absent (implemented as `CursorPaginationOptions`).
  - Required APIs `applyCursorPagination` and `buildCursorResponse` are absent.
  - Requested `lib/data/pagination.ts` + `lib/data/index.ts` export path contract is not implemented.
- Suggested fixes:
  - Add a `lib/data/pagination.ts` adapter exposing the exact required names while delegating to `lib/db/pagination.ts`.
  - Provide compatibility result shape (`items`, `nextCursor`, `hasMore`) via `buildCursorResponse` wrapper.
  - Export the adapter APIs from `lib/data/index.ts` for downstream consistency.
- Evidence (new):
  - lib/db/pagination.ts#L39-L56
  - lib/db/pagination.ts#L137-L215
  - lib/db/pagination.ts#L403-L526
  - lib/db/index.ts#L44-L55
  - lib/data/index.ts#L1-L154
- Evidence (legacy):
  - archive/oldapp/lib/db/pagination.ts#L36-L53
  - archive/oldapp/lib/db/pagination.ts#L94-L164
  - archive/oldapp/lib/db/pagination.ts#L286-L317
- Plan refs:
  - .apm/Implementation_Plan.md#L445-L455
  - .apm/Memory/Phase_03_error_data_infrastructure/Task_3_13_cursor_pagination.md#L1-L102

### 3.14a — Fix Schema Column Types & Data Casting (Partial)
- Detail: `lastContext` typing and cache casting utilities were implemented correctly, but the plan bullet to document auth provider architecture differences (NextAuth vs Supabase patterns) in code comments is not present in the updated schema/casting scope.
- Issues:
  - Plan bullet for documenting auth-provider architecture differences in comments is not satisfied in the touched schema/cache modules.
- Suggested fixes:
  - Add a concise architecture comment block in the relevant auth/data boundary module explaining v6 NextAuth session model vs legacy Supabase cookie/JWT pattern and why current schema/cache typing is aligned.
- Evidence (new):
  - lib/db/schema.ts#L28-L28
  - lib/db/schema.ts#L115-L115
  - lib/cache/cast.ts#L11-L11
  - lib/cache/cast.ts#L121-L217
  - lib/cache/index.ts#L267-L281
- Evidence (legacy):
  - archive/oldapp/lib/db/schema.ts#L53-L53
- Plan refs:
  - .apm/Implementation_Plan.md#L456-L464
  - .apm/Memory/Phase_03_error_data_infrastructure/Task_3_14a_schema_cache_fixes.md#L1-L52

## Other-Problem Items

- None

## Improvement Items

### 3.4 — Fix Missing Auth Guard Functions (Completed)
- Detail: Required guards are present and aligned with v6 patterns. `requireAuth` now returns `{ session, userId }`; rate limiting is split into named-limiter and custom-config guards for clearer typing and reuse.
- Evidence (new):
  - lib/auth/guards.ts#L78-L95
  - lib/auth/guards.ts#L448-L521
  - lib/auth/guards.ts#L533-L677
- Evidence (legacy):
  - archive/oldapp/lib/api/guards.ts#L118-L304
  - archive/oldapp/lib/api/validators.ts#L87-L154
- Plan refs:
  - .apm/Implementation_Plan.md#L350-L360
  - .apm/Memory/Phase_03_error_data_infrastructure/Task_3_04_auth_guard_functions.md#L1-L44

### 3.9 — Create Cache Entity Types (Completed)
- Detail: All required cache entity types are implemented and exported; implementation additionally includes runtime type guards and broader re-exports for safe cache casting and consumption.
- Evidence (new):
  - lib/cache/types.ts#L108-L247
  - lib/cache/types.ts#L278-L320
  - lib/cache/index.ts#L186-L230
- Evidence (legacy):
  - archive/oldapp/lib/cache/types.ts#L33-L75
- Plan refs:
  - .apm/Implementation_Plan.md#L401-L411

## No-Difference Items

### 3.1 — Create Shared Fetcher & Error Handler Functions (Completed)
- Detail: `fetcher<T>` and `fetchWithErrorHandlers` are implemented with JSON error parsing, AppError mapping, offline detection, chat-not-found redirect behavior, and barrel export alignment.
- Evidence (new):
  - lib/utils/fetcher.ts#L155-L243
  - lib/utils/index.ts#L23-L23
- Evidence (legacy):
  - archive/oldapp/lib/utils.ts#L17-L104
- Plan refs:
  - .apm/Implementation_Plan.md#L320-L327
  - .apm/Memory/Phase_03_error_data_infrastructure/Task_3_01_shared_fetcher_error_handler.md#L1-L34

### 3.2 — Create Missing Utility Functions (Completed)
- Detail: All required utilities exist in dedicated modules and are exported via the `lib/utils` barrel: `generateUUID`, `getMostRecentUserMessage`, `getTrailingMessageId`, and `sanitizeText`.
- Issues:
  - No Phase 3 memory log is tagged as Task 3.2; existing similarly named memory file is tagged Task 3.6.
- Suggested fixes:
  - Add/rename the Phase 3 memory log so task_ref matches Task 3.2 for traceability.
- Evidence (new):
  - lib/utils/uuid.ts#L20-L49
  - lib/utils/message.ts#L26-L61
  - lib/utils/string.ts#L108-L110
  - lib/utils/index.ts#L54-L55
  - lib/utils/index.ts#L75-L80
- Evidence (legacy):
  - archive/oldapp/lib/utils.ts#L113-L178
- Plan refs:
  - .apm/Implementation_Plan.md#L329-L338

### 3.14b — Fix Auth Route Operational Issues (Completed)
- Detail: Guest auth route includes structured operational logging for session reuse/create and rate-limit events, and exports `maxDuration = 10` as requested.
- Evidence (new):
  - app/api/auth/guest/route.ts#L24-L24
  - app/api/auth/guest/route.ts#L99-L99
  - app/api/auth/guest/route.ts#L118-L118
  - app/api/auth/guest/route.ts#L134-L134
  - app/api/auth/guest/route.ts#L165-L165
  - app/api/auth/guest/route.ts#L177-L177
- Evidence (legacy):
  - archive/oldapp/app/api/auth/guest/route.ts#L15-L15
  - archive/oldapp/app/api/auth/guest/route.ts#L50-L50
  - archive/oldapp/app/api/auth/guest/route.ts#L66-L66
  - archive/oldapp/app/api/auth/guest/route.ts#L86-L86
- Plan refs:
  - .apm/Implementation_Plan.md#L465-L471
  - .apm/Memory/Phase_03_error_data_infrastructure/Task_3_14b_auth_route_fixes.md#L1-L40
