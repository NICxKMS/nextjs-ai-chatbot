# Phase 7: API Routes & Server Actions — Detailed Review (Multi-Agent, Chunked)

- Date: 2026-02-18
- Phase: Phase 7: API Routes & Server Actions
- Task count: 14
- Chunk files: P7-C1, P7-C2, P7-C3

## Summary

- Status counts: Completed=2, Partial=9, Incorrect=3, Missing=0
- Difference counts: defect=8, partial=4, other-problem=0, improvement=1, no-difference=1

## Task Matrix

| Task | Name | Status | Difference Type | Detail |
|---|---|---|---|---|
| 7.1 | Add Missing DELETE Endpoint for Chat | Partial | partial | `DELETE /api/chat` is implemented with chatId validation, auth, rate limiting, ownership-aware service deletion, and structured error responses; however, cascade coverage remains incomplete versus plan criteria because deletion flow explicitly handles votes/messages/chat but does not explicitly handle suggestions, and artifact-suggestion FK topology does not guarantee suggestion cleanup during chat deletion. |
| 7.2 | Add Settings Support in Chat Schema | Partial | partial | Settings support is present in `StreamChatSchema`/`ChatSettingsSchema`, and chat route forwards settings to `executeChatCompletion` (temperature/topP/maxOutputTokens). But route input is still parsed as raw JSON typed interface (not validated via Zod schema), and plan-specified schema-level `selectedModel`/`maxTokens` style contract is not implemented verbatim. |
| 7.3 | Add File Part Validation | Partial | defect | File-part primitives are implemented (`FilePartSchema`, MIME allowlist checks, attachment size cap in `CreateMessageSchema`), but chat streaming input schema still validates message as `{ id, content, role }` without `parts`/attachment payload validation, so invalid file-part payloads in chat POST are not reliably rejected. |
| 7.4 | Add Cursor-Based Pagination to History | Incorrect | defect | History route exposes cursor-shaped API and returns `nextCursor`/`hasMore`, but cursor flow is functionally mismatched: incoming `cursor` (base64 timestamp) is forwarded as `startingAfter`/`endingBefore` IDs to repository lookups, while decode path is unused. This breaks true cursor progression and does not satisfy the plan requirement to use data-layer cursor pagination (`applyCursorPagination`). |
| 7.5 | Add Stream Reconnection Logic | Partial | partial | Reconnect endpoint is implemented with assistant-message replay window, SSE responses, and exponential backoff guidance headers. However, `lastEventId` is accepted but not used to resume from event position, and rate limiting is generic `requireRateLimit("api", userId)` rather than the plan-specified stream-scoped route limiter semantics. |
| 7.6 | Create Missing Server Actions | Partial | defect | Both missing actions are now present and wired (`deleteTrailingMessagesAction`, `updateVisibilityAction`), but `deleteTrailingMessagesAction` still lacks parity with old ownership/input-guard behavior because it accepts raw `createdAt` without runtime validation and deletes by `chatId`+timestamp through a repository method that ignores ownership context. |
| 7.7a | Add Chat Route Input Validation & Quota | Partial | defect | Model validation and daily quota enforcement are implemented in `stream-chat.action.ts` with actionable messages, but these protections are not applied in the active `POST /api/chat` execution path, which validates model ID and per-minute rate limit only. |
| 7.7b | Add Chat Route Infrastructure Enhancements | Partial | partial | Key infrastructure improvements are present (stream timeout via `maxDuration = 60`, request geo hints, and chronological DB message ordering path), but header enrichment is not fully implemented per plan because `x-forwarded-for` extraction is not included in the request-hints payload. |
| 7.8 | Add Artifact Route Validation & Versioning | Incorrect | defect | UUID validation and cache-control were added, but core task requirements remain unmet: invalid GET `id` uses `error("...")` (string) which resolves as 500-style error handling, version targeting is only partially parsed (not applied to update/create flow), and content-type-to-kind validation is not implemented. |
| 7.9 | Fix Vote Route Methods & Validation | Partial | defect | The votes route now uses `PATCH`, has Zod validation, ownership/message checks, non-guest enforcement, rate limiting, and structured failure logging; however client compatibility remains broken because active chat UI still targets `/api/vote` while only `/api/votes` exists, and the plan-specified `isUpvoted` payload contract is not accepted directly. |
| 7.10 | Fix Suggestion Route Query & Response | Incorrect | defect | Suggestion retrieval is improved with auth/rate-limit/UUID checks and full-list query semantics, but the task contract is not met: no `documentVersion` filter is implemented, and response shape still returns a raw array instead of `{ suggestions: [...] }` with metadata. |
| 7.11 | Integrate File Validation in Upload Route | Completed | improvement | Upload validation is integrated before Blob storage using centralized file-validation utilities; MIME/type failures map to 415 and size-limit failures map to 413 with the 5MB attachment limit, satisfying the task objective with broader utility reuse than the legacy schema-only check. |
| 7.12 | Add Artifact Route Body Validation | Partial | defect | Body validation is implemented for POST/PATCH via Zod schemas (`CreateArtifactSchema`, `UpdateArtifactSchema`) and field-level errors are produced by `validateBody`; however route-level UUID validation is inconsistent and incomplete because GET invalid-id handling returns `error("...")` (non-AppError) which maps to generic 500 behavior instead of structured 400 validation output. |
| 7.13 | Add History Route Search & Caching (Enhancement) | Completed | no-difference | History enhancement requirements are implemented: route accepts `q`/`from`/`to`, forwards filters through action/service layers, repository applies case-insensitive `ILIKE` and date-range predicates, cache headers are set as specified, and list queries remain sorted by `updatedAt` descending for returned items. |

## Defect Items

### 7.3 — Add File Part Validation (Partial)
- Detail: File-part primitives are implemented (`FilePartSchema`, MIME allowlist checks, attachment size cap in `CreateMessageSchema`), but chat streaming input schema still validates message as `{ id, content, role }` without `parts`/attachment payload validation, so invalid file-part payloads in chat POST are not reliably rejected.
- Issues:
  - Task requires file-part validation in chat message schema and rejection of invalid attachments; `StreamChatSchema.message` has no `parts` file-part validation path.
  - Route-level body parsing bypasses schema validation, so attachment rejection behavior is not consistently enforced for chat POST.
- Suggested fixes:
  - Update `StreamChatSchema.message` to validate structured `parts` (text/file union) and attachment size constraints for chat POST payloads.
  - Enforce schema parsing in `POST /api/chat` and reject invalid file-part payloads with 400 responses.
- Evidence (new):
  - features/chat/schemas/chat.schema.ts#L67-L82
  - features/chat/schemas/chat.schema.ts#L94-L111
  - features/chat/schemas/chat.schema.ts#L241-L249
  - app/api/chat/route.ts#L129-L136
- Evidence (legacy):
  - archive/oldapp/app/(chat)/api/chat/schema.ts#L15-L35
- Plan refs:
  - .apm/Implementation_Plan.md#L879-L887

### 7.4 — Add Cursor-Based Pagination to History (Incorrect)
- Detail: History route exposes cursor-shaped API and returns `nextCursor`/`hasMore`, but cursor flow is functionally mismatched: incoming `cursor` (base64 timestamp) is forwarded as `startingAfter`/`endingBefore` IDs to repository lookups, while decode path is unused. This breaks true cursor progression and does not satisfy the plan requirement to use data-layer cursor pagination (`applyCursorPagination`).
- Issues:
  - `CursorCodec.decode()` exists but is not used to translate inbound cursor before repository calls.
  - Repository expects cursor chat IDs (`where(eq(chat.id, startingAfter|endingBefore))`), but route passes encoded timestamp cursors.
  - Plan step 2 (`applyCursorPagination` from data layer) is not satisfied; no usage path exists in route/history action flow.
- Suggested fixes:
  - Use one cursor contract end-to-end: either ID-based cursors throughout, or decode timestamp cursors and apply timestamp-based repository predicates.
  - Integrate data-layer cursor utility (`paginate`/`applyCursorPagination` equivalent) directly in history retrieval path.
  - Add backward-compatible handling for legacy pagination query style if required by plan consumers.
- Evidence (new):
  - app/api/history/route.ts#L55-L57
  - app/api/history/route.ts#L72-L99
  - app/api/history/route.ts#L150-L151
  - app/api/history/route.ts#L175-L190
  - lib/data/repositories/chat.repository.ts#L454-L472
  - lib/db/pagination.ts#L199-L309
- Evidence (legacy):
  - archive/oldapp/app/(chat)/api/history/route.ts#L28-L60
- Plan refs:
  - .apm/Implementation_Plan.md#L889-L897

### 7.6 — Create Missing Server Actions (Partial)
- Detail: Both missing actions are now present and wired (`deleteTrailingMessagesAction`, `updateVisibilityAction`), but `deleteTrailingMessagesAction` still lacks parity with old ownership/input-guard behavior because it accepts raw `createdAt` without runtime validation and deletes by `chatId`+timestamp through a repository method that ignores ownership context.
- Issues:
  - `deleteTrailingMessagesAction` does not perform runtime UUID/timestamp validation equivalent to OLD (`validateUUID`, `parseTimestamp`).
  - `messageRepository.deleteAfterTimestamp()` deletes by `chatId`+timestamp only and does not enforce user ownership via context, so the action-level ownership guarantee is incomplete.
- Suggested fixes:
  - Add Zod/runtime validation for `chatId` and `createdAt` in `deleteTrailingMessagesAction` before DB mutation.
  - Enforce ownership before deletion (e.g., verify chat ownership in action, or make `messageRepository.deleteAfterTimestamp` context-aware with user filter).
- Evidence (new):
  - features/chat/actions/delete-trailing-messages.action.ts#L25-L107
  - features/chat/actions/update-visibility.action.ts#L30-L118
  - features/chat/components/message-editor.tsx#L121-L132
  - hooks/use-chat-visibility.ts#L77-L90
  - lib/data/repositories/message.repository.ts#L697-L708
- Evidence (legacy):
  - archive/oldapp/app/(chat)/actions.ts#L54-L84
  - archive/oldapp/app/(chat)/actions.ts#L86-L122
- Plan refs:
  - .apm/Implementation_Plan.md#L910-L919

### 7.7a — Add Chat Route Input Validation & Quota (Partial)
- Detail: Model validation and daily quota enforcement are implemented in `stream-chat.action.ts` with actionable messages, but these protections are not applied in the active `POST /api/chat` execution path, which validates model ID and per-minute rate limit only.
- Issues:
  - `POST /api/chat` does not enforce daily quota/entitlement checks (`checkMessageQuota` / user entitlements) in the request pipeline.
  - `streamChatAction` contains the required checks but is not integrated into the route path that serves chat streaming responses.
- Suggested fixes:
  - Apply entitlement + daily quota checks in `app/api/chat/route.ts` (or refactor route to delegate preflight validation to `streamChatAction`).
  - Keep one canonical validation path to avoid drift between route and action logic.
- Evidence (new):
  - features/chat/actions/stream-chat.action.ts#L130-L183
  - features/chat/actions/index.ts#L53-L62
  - app/api/chat/route.ts#L140-L151
- Evidence (legacy):
  - archive/oldapp/app/(chat)/api/chat/route.ts#L125-L138
- Plan refs:
  - .apm/Implementation_Plan.md#L920-L928

### 7.8 — Add Artifact Route Validation & Versioning (Incorrect)
- Detail: UUID validation and cache-control were added, but core task requirements remain unmet: invalid GET `id` uses `error("...")` (string) which resolves as 500-style error handling, version targeting is only partially parsed (not applied to update/create flow), and content-type-to-kind validation is not implemented.
- Issues:
  - GET invalid-id handling calls `error(string)`, which is treated as unknown error type rather than explicit 400 validation response.
  - `version` is parsed in PATCH but not actually used to target a specific version in mutation logic; POST has no version-target handling.
  - No request `Content-Type` validation is performed against artifact `kind`.
- Suggested fixes:
  - Return explicit validation responses (e.g., `validationError(...)` or `error(new ValidationError(...))`) for invalid IDs in GET.
  - Plumb `version` through action/service/repository so updates can target requested versions deterministically.
  - Validate `Content-Type` header against the artifact kind contract before processing POST/PATCH bodies.
- Evidence (new):
  - app/api/artifacts/route.ts#L61-L62
  - app/api/artifacts/route.ts#L73-L73
  - app/api/artifacts/route.ts#L95-L109
  - app/api/artifacts/route.ts#L167-L220
  - lib/api/response.ts#L151-L169
- Evidence (legacy):
  - archive/oldapp/app/(chat)/api/document/route.ts#L23-L31
  - archive/oldapp/app/(chat)/api/document/route.ts#L70-L104
- Plan refs:
  - .apm/Implementation_Plan.md#L938-L947

### 7.9 — Fix Vote Route Methods & Validation (Partial)
- Detail: The votes route now uses `PATCH`, has Zod validation, ownership/message checks, non-guest enforcement, rate limiting, and structured failure logging; however client compatibility remains broken because active chat UI still targets `/api/vote` while only `/api/votes` exists, and the plan-specified `isUpvoted` payload contract is not accepted directly.
- Issues:
  - Current UI vote calls still hit `/api/vote` (singular), so route-method/validation fixes in `/api/votes` are not exercised by the active client path.
  - Vote body schema accepts `type: "up"|"down"` only, not the plan-stated `isUpvoted` boolean payload.
- Suggested fixes:
  - Align client and server endpoints by migrating callers to `/api/votes` or adding a compatibility alias route for `/api/vote`.
  - Accept both `type` and `isUpvoted` (or normalize one to the other) to satisfy the stated payload contract while preserving backward compatibility.
- Evidence (new):
  - app/api/votes/route.ts#L30-L33
  - app/api/votes/route.ts#L113-L177
  - features/chat/components/message-actions.tsx#L256-L283
  - features/chat/components/chat.tsx#L403-L403
- Evidence (legacy):
  - archive/oldapp/app/(chat)/api/vote/route.ts#L18-L98
  - archive/oldapp/components/message-actions.tsx#L83-L103
- Plan refs:
  - .apm/Implementation_Plan.md#L948-L956

### 7.10 — Fix Suggestion Route Query & Response (Incorrect)
- Detail: Suggestion retrieval is improved with auth/rate-limit/UUID checks and full-list query semantics, but the task contract is not met: no `documentVersion` filter is implemented, and response shape still returns a raw array instead of `{ suggestions: [...] }` with metadata.
- Issues:
  - `documentVersion` query parameter support is missing in `GET /api/suggestions`.
  - Response contract does not match plan: route returns `Response.json(suggestions)` instead of an object wrapper with metadata.
- Suggested fixes:
  - Extend query schema to accept optional `documentVersion` (or artifact-version equivalent) and apply it in repository filtering.
  - Return a structured payload such as `{ suggestions, metadata }` and include stable metadata fields required by consumers.
- Evidence (new):
  - app/api/suggestions/route.ts#L24-L25
  - app/api/suggestions/route.ts#L63-L70
  - app/api/suggestions/route.ts#L103-L108
  - lib/data/repositories/suggestion.repository.ts#L428-L442
- Evidence (legacy):
  - archive/oldapp/app/(chat)/api/suggestions/route.ts#L47-L57
  - archive/oldapp/app/(chat)/api/suggestions/route.ts#L79-L93
- Plan refs:
  - .apm/Implementation_Plan.md#L958-L966

### 7.12 — Add Artifact Route Body Validation (Partial)
- Detail: Body validation is implemented for POST/PATCH via Zod schemas (`CreateArtifactSchema`, `UpdateArtifactSchema`) and field-level errors are produced by `validateBody`; however route-level UUID validation is inconsistent and incomplete because GET invalid-id handling returns `error("...")` (non-AppError) which maps to generic 500 behavior instead of structured 400 validation output.
- Issues:
  - GET invalid UUID path uses `error(string)` and does not return explicit 400 validation responses with field-level details.
  - UUID validation strategy is inconsistent across handlers (GET differs from PATCH/DELETE AppError-based validation flow).
- Suggested fixes:
  - Use `ArtifactUUIDSchema.safeParse` (or `validateQuery`) in GET and return `ValidationError`/`validationError(...)` for malformed IDs.
  - Standardize all artifact route UUID failures to structured 400 payloads with `fieldErrors.id` for contract consistency.
- Evidence (new):
  - app/api/artifacts/route.ts#L18-L20
  - app/api/artifacts/route.ts#L61-L62
  - app/api/artifacts/route.ts#L107-L107
  - app/api/artifacts/route.ts#L157-L163
  - app/api/artifacts/route.ts#L186-L186
  - lib/api/validation.ts#L65-L66
- Evidence (legacy):
  - archive/oldapp/app/(chat)/api/document/route.ts#L19-L19
  - archive/oldapp/app/(chat)/api/document/route.ts#L34-L34
  - archive/oldapp/app/(chat)/api/document/route.ts#L117-L119
- Plan refs:
  - .apm/Implementation_Plan.md#L976-L985

## Partial Items

### 7.1 — Add Missing DELETE Endpoint for Chat (Partial)
- Detail: `DELETE /api/chat` is implemented with chatId validation, auth, rate limiting, ownership-aware service deletion, and structured error responses; however, cascade coverage remains incomplete versus plan criteria because deletion flow explicitly handles votes/messages/chat but does not explicitly handle suggestions, and artifact-suggestion FK topology does not guarantee suggestion cleanup during chat deletion.
- Issues:
  - Task step 3 requires cascade delete for messages, votes, suggestions, and artifacts; current delete path is explicit for votes/messages/chat and does not include explicit suggestion cleanup.
  - `suggestion` references artifacts via composite FK without explicit `onDelete: "cascade"` configuration, so chat->artifact cascade does not clearly ensure suggestion cleanup.
- Suggested fixes:
  - Extend `chatService.deleteChat` transaction to delete artifact suggestions (and artifacts if needed) explicitly before deleting chat.
  - Add explicit cascade behavior for artifact->suggestion FK, or maintain explicit transactional cleanup to satisfy deterministic cascade requirements.
- Evidence (new):
  - app/api/chat/route.ts#L553-L655
  - app/api/chat/route.ts#L593-L603
  - lib/data/services/chat.service.ts#L354-L438
  - lib/db/schema.ts#L260-L279
  - lib/db/schema.ts#L321-L350
- Evidence (legacy):
  - archive/oldapp/app/(chat)/api/chat/route.ts#L413-L466
  - archive/oldapp/app/(chat)/api/chat/route.ts#L417-L458
- Plan refs:
  - .apm/Implementation_Plan.md#L859-L867

### 7.2 — Add Settings Support in Chat Schema (Partial)
- Detail: Settings support is present in `StreamChatSchema`/`ChatSettingsSchema`, and chat route forwards settings to `executeChatCompletion` (temperature/topP/maxOutputTokens). But route input is still parsed as raw JSON typed interface (not validated via Zod schema), and plan-specified schema-level `selectedModel`/`maxTokens` style contract is not implemented verbatim.
- Issues:
  - Route does not enforce the chat Zod schema at request boundary (`await request.json()` is cast to `ChatPostBody`), so settings validation is not guaranteed at runtime.
  - Plan bullet calls for chat POST schema additions (`selectedModel`, `temperature`, `maxTokens`) but current contract remains `selectedChatModel` + nested `settings.sampling.maxOutputTokens`.
- Suggested fixes:
  - Validate POST body against `StreamChatSchema` (or route-specific Zod schema) before processing.
  - Add compatibility mapping or direct schema fields for `selectedModel` and `maxTokens` if strict plan parity is required.
- Evidence (new):
  - features/chat/schemas/chat.schema.ts#L209-L256
  - app/api/chat/route.ts#L129-L141
  - app/api/chat/route.ts#L286-L307
  - lib/ai/chat-completion.ts#L420-L430
- Evidence (legacy):
  - archive/oldapp/app/(chat)/api/chat/schema.ts#L30-L54
  - archive/oldapp/app/(chat)/api/chat/route.ts#L62-L70
- Plan refs:
  - .apm/Implementation_Plan.md#L869-L877

### 7.5 — Add Stream Reconnection Logic (Partial)
- Detail: Reconnect endpoint is implemented with assistant-message replay window, SSE responses, and exponential backoff guidance headers. However, `lastEventId` is accepted but not used to resume from event position, and rate limiting is generic `requireRateLimit("api", userId)` rather than the plan-specified stream-scoped route limiter semantics.
- Issues:
  - `lastEventId` is parsed/logged but not used to restore from a specific stream position.
  - Rate limiting does not follow the stream-specific route pattern requested in plan step 5 (`... "stream"`).
- Suggested fixes:
  - Implement event-position resume semantics keyed by `lastEventId` (or explicitly document fallback replay-only behavior).
  - Introduce stream-scoped limiter semantics for reconnect route to match plan contract and abuse profile.
- Evidence (new):
  - app/api/chat/[id]/reconnect/route.ts#L109-L170
  - app/api/chat/[id]/reconnect/route.ts#L206-L221
  - app/api/chat/[id]/reconnect/route.ts#L254-L320
- Evidence (legacy):
  - archive/oldapp/app/(chat)/api/chat/[id]/stream/route.ts#L16-L41
  - archive/oldapp/app/(chat)/api/chat/[id]/stream/route.ts#L82-L126
- Plan refs:
  - .apm/Implementation_Plan.md#L899-L908

### 7.7b — Add Chat Route Infrastructure Enhancements (Partial)
- Detail: Key infrastructure improvements are present (stream timeout via `maxDuration = 60`, request geo hints, and chronological DB message ordering path), but header enrichment is not fully implemented per plan because `x-forwarded-for` extraction is not included in the request-hints payload.
- Issues:
  - `requestHints` includes geo metadata from `geolocation(request)` but does not include `x-forwarded-for`/client IP enrichment called out in the task guidance.
- Suggested fixes:
  - Add explicit request-header extraction for `x-forwarded-for` (and any required Vercel geo header fallbacks) and include it in `requestHints`.
- Evidence (new):
  - app/api/chat/route.ts#L64-L64
  - app/api/chat/route.ts#L198-L215
  - app/api/chat/route.ts#L302-L304
  - lib/data/repositories/chat.repository.ts#L519-L535
- Evidence (legacy):
  - archive/oldapp/app/(chat)/api/chat/route.ts#L42-L42
  - archive/oldapp/app/(chat)/api/chat/route.ts#L165-L170
- Plan refs:
  - .apm/Implementation_Plan.md#L929-L937

## Other-Problem Items

- None

## Improvement Items

### 7.11 — Integrate File Validation in Upload Route (Completed)
- Detail: Upload validation is integrated before Blob storage using centralized file-validation utilities; MIME/type failures map to 415 and size-limit failures map to 413 with the 5MB attachment limit, satisfying the task objective with broader utility reuse than the legacy schema-only check.
- Evidence (new):
  - app/api/files/upload/route.ts#L26-L27
  - app/api/files/upload/route.ts#L67-L68
  - app/api/files/upload/route.ts#L77-L82
  - lib/utils/file-validation.ts#L18-L18
  - lib/utils/file-validation.ts#L447-L460
- Evidence (legacy):
  - archive/oldapp/app/(chat)/api/files/upload/route.ts#L90-L111
- Plan refs:
  - .apm/Implementation_Plan.md#L967-L975

## No-Difference Items

### 7.13 — Add History Route Search & Caching (Enhancement) (Completed)
- Detail: History enhancement requirements are implemented: route accepts `q`/`from`/`to`, forwards filters through action/service layers, repository applies case-insensitive `ILIKE` and date-range predicates, cache headers are set as specified, and list queries remain sorted by `updatedAt` descending for returned items.
- Evidence (new):
  - app/api/history/route.ts#L59-L61
  - app/api/history/route.ts#L152-L154
  - app/api/history/route.ts#L204-L205
  - lib/data/repositories/chat.repository.ts#L439-L450
  - lib/data/repositories/chat.repository.ts#L483-L484
- Evidence (legacy):
  - archive/oldapp/app/(chat)/api/history/route.ts#L28-L29
  - archive/oldapp/app/(chat)/api/history/route.ts#L71-L72
- Plan refs:
  - .apm/Implementation_Plan.md#L986-L995
