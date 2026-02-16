# Phase 6: API Routes - Issues

**Phase Name:** API Routes
**Comparison Scope:** API routes, server actions, and artifact handlers
**Date Started:** 2026-02-15
**Date Completed:** 2026-02-16

## Issue Counts

| Category | Count |
|----------|-------|
| UI Inconsistencies | 0 |
| Bugs | 1 |
| Broken Code | 6 |
| Functional Discrepancies | 50 |
| Improvement Only | 3 |
| **Total** | **60** |

### By Severity

| Severity | Count |
|----------|-------|
| Critical | 6 |
| High | 17 |
| Medium | 29 |
| Low | 8 |

### By Verification Status

| Verdict | Count | Issues |
|---------|-------|--------|
| Verified / Defect | 44 | P6-BUG-001, P6-BRK-001–006, P6-FNC-001–011, P6-FNC-014–018, P6-FNC-021, P6-FNC-023–026, P6-FNC-029–035, P6-FNC-037, P6-FNC-039, P6-FNC-041–047 |
| False Positive | 3 | P6-FNC-013, P6-FNC-027, P6-FNC-028 |
| Improvement | 13 | P6-FNC-012, P6-FNC-019, P6-FNC-020, P6-FNC-022, P6-FNC-036, P6-FNC-038, P6-FNC-040, P6-FNC-048–050, P6-IMP-001–003 |

## Table of Contents

- [Issue Counts](#issue-counts)
- [UI Inconsistencies](#ui-inconsistencies)
- [Bugs](#bugs)
- [Broken Code](#broken-code)
- [Functional Discrepancies](#functional-discrepancies)
- [Improvement Only](#improvement-only)

## VERIFICATION SUMMARY

| Issue | Status | Timestamp |
|-------|--------|-----------|
| P6-BUG-001 | Defect | 2026-02-16T21:00:00Z |
| P6-BRK-001 | Defect | 2026-02-16T21:00:00Z |
| P6-BRK-002 | Defect | 2026-02-16T00:00:00Z |
| P6-BRK-003 | Defect | 2026-02-16T00:00:00Z |
| P6-BRK-004 | Defect | 2026-02-16T00:00:00Z |
| P6-BRK-005 | Defect | 2026-02-16T00:00:00Z |
| P6-BRK-006 | Defect | 2026-02-16T00:00:00Z |
| P6-FNC-001 | Defect | 2026-02-16T00:00:00Z |
| P6-FNC-002 | Defect | 2026-02-16T00:00:00Z |
| P6-FNC-003 | Defect | 2026-02-16T00:00:00Z |
| P6-FNC-004 | Defect | 2026-02-16T12:00:00Z |
| P6-FNC-005 | Defect | 2026-02-16T12:00:00Z |
| P6-FNC-006 | Defect | 2026-02-16T12:00:00Z |
| P6-FNC-007 | Defect | 2026-02-16T12:00:00Z |
| P6-FNC-008 | Defect | 2026-02-16T12:00:00Z |
| P6-FNC-009 | Defect | 2026-02-16T12:00:00Z |
| P6-FNC-010 | Defect | 2026-02-16T12:00:00Z |
| P6-FNC-011 | Defect | 2026-02-16T12:00:00Z |
| P6-FNC-012 | Improvement | 2026-02-16T22:30:00Z |
| P6-FNC-013 | False Positive | 2026-02-16T23:59:00Z |
| P6-FNC-014 | Defect | 2026-02-16T22:30:00Z |
| P6-FNC-015 | Defect | 2026-02-16T22:30:00Z |
| P6-FNC-016 | Defect | 2026-02-16T22:30:00Z |
| P6-FNC-017 | Defect | 2026-02-16T22:30:00Z |
| P6-FNC-018 | Defect | 2026-02-16T22:30:00Z |
| P6-FNC-019 | Improvement | 2026-02-16T22:30:00Z |
| P6-FNC-020 | Improvement | 2026-02-16T22:30:00Z |
| P6-FNC-021 | Defect | 2026-02-16T22:30:00Z |
| P6-FNC-022 | Improvement | 2026-02-16T22:30:00Z |
| P6-FNC-023 | Defect | 2026-02-16T22:30:00Z |
| P6-FNC-024 | Defect | 2026-02-16T22:30:00Z |
| P6-FNC-025 | Defect | 2026-02-16T22:30:00Z |
| P6-FNC-026 | Defect | 2026-02-16T22:30:00Z |
| P6-FNC-027 | False Positive | 2026-02-16T23:59:00Z |
| P6-FNC-028 | False Positive | 2026-02-16T23:59:00Z |
| P6-FNC-029 | Defect | 2026-02-16T23:30:00Z |
| P6-FNC-030 | Defect | 2026-02-16T23:30:00Z |
| P6-FNC-031 | Defect | 2026-02-16T23:30:00Z |
| P6-FNC-032 | Defect (Overturned) | 2026-02-16T23:59:00Z |
| P6-FNC-033 | Defect | 2026-02-16T23:30:00Z |
| P6-FNC-034 | Defect | 2026-02-16T23:30:00Z |
| P6-FNC-035 | Defect | 2026-02-16T23:30:00Z |
| P6-FNC-036 | Improvement | 2026-02-16T22:00:00Z |
| P6-FNC-037 | Defect | 2026-02-16T22:00:00Z |
| P6-FNC-038 | Improvement | 2026-02-16T22:00:00Z |
| P6-FNC-039 | Defect | 2026-02-16T22:00:00Z |
| P6-FNC-040 | Improvement | 2026-02-16T22:00:00Z |
| P6-FNC-041 | Defect | 2026-02-16T22:00:00Z |
| P6-FNC-042 | Defect | 2026-02-16T22:00:00Z |
| P6-FNC-043 | Defect | 2026-02-16T22:00:00Z |
| P6-FNC-044 | Defect | 2026-02-16T23:30:00Z |
| P6-FNC-045 | Defect (Overturned) | 2026-02-16T23:59:00Z |
| P6-FNC-046 | Defect (Overturned) | 2026-02-16T23:59:00Z |
| P6-FNC-047 | Defect | 2026-02-16T23:30:00Z |
| P6-FNC-048 | Improvement | 2026-02-16T23:30:00Z |
| P6-FNC-049 | Improvement | 2026-02-16T23:30:00Z |
| P6-FNC-050 | Improvement | 2026-02-16T23:30:00Z |
| P6-IMP-001 | Improvement | 2026-02-16T23:30:00Z |
| P6-IMP-002 | Improvement | 2026-02-16T23:50:00Z |
| P6-IMP-003 | Improvement | 2026-02-16T23:50:00Z |

---

## UI Inconsistencies

*No UI Inconsistencies identified in this phase.*

## Bugs

### [P6-BUG-001] Incomplete rejectSuggestion Implementation

| Field | Value |
|-------|-------|
| **Issue ID** | P6-BUG-001 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | N/A (NEW functionality) |
| **NEW Path** | `features/artifact/actions/suggestions.ts` |

**Description:**
The `rejectSuggestion()` function has a TODO comment at line 218-219: "TODO: Implement suggestion deletion when available". The function currently only verifies the suggestion exists but doesn't actually delete or mark it as rejected.

**Impact:**
Rejected suggestions remain in the database and may still appear in UI. Users cannot properly dismiss suggestions.

**Suggested Fix:**
Implement suggestion deletion in `artifactService` and call it from `rejectSuggestion()`.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T21:00:00Z |

**Findings:** Confirmed. `features/artifact/actions/suggestions.ts:194-220` — `rejectSuggestion(artifactId, suggestionId)` authenticates the user, fetches suggestions, finds the matching suggestion, verifies it exists (throws `Error("Suggestion not found")` if not) — then **does nothing**. Lines 216-219 contain comments: "Note: The current service doesn't have a deleteSuggestion method... This is a placeholder — the actual implementation would need a suggestionRepository.delete method. TODO: Implement suggestion deletion when available." However, the `SuggestionRepository` in `lib/data/repositories/suggestion.repository.ts` DOES have a `doDelete(id, context)` method (L382-414) that deletes a suggestion by ID. Additionally, `deleteByArtifactId(artifactId, context)` (L477-515) and `deleteAfterTimestamp(artifactId, timestamp, context)` (L518-560) exist. The service layer (`ArtifactService` in `lib/data/services/artifact.service.ts`) does NOT expose a `deleteSuggestion` pass-through method, but the repository capability is available. The function effectively has a no-op body after verification — rejected suggestions remain in the database and will continue appearing in UI. This is a genuine defect with a straightforward fix: either (1) add `deleteSuggestion(id, ctx)` to `ArtifactService` wrapping `suggestionRepository.doDelete`, or (2) call the suggestion repository directly from the action.

## Broken Code

### [P6-BRK-001] Missing AI Execution in Chat POST Route

| Field | Value |
|-------|-------|
| **Issue ID** | P6-BRK-001 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/chat/route.ts` |
| **NEW Path** | `app/api/chat/route.ts` |

**Description:**
The OLD route calls `executeChatCompletion()` which handles the actual AI model invocation and streaming. The NEW route's `streamChatAction` only saves messages to the database - it does not call any AI model or generate responses.

**Impact:**
Chat is completely non-functional. Users send messages but receive no AI responses.

**Suggested Fix:**
Implement AI execution in `streamChatAction` or create a separate action that calls the AI model using the AI SDK's `streamText` or similar function. Reference the OLD implementation's `executeChatCompletion()` pattern.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T21:00:00Z |

**Findings:** Confirmed critical defect. OLD `archive/oldapp/app/(chat)/api/chat/route.ts:59-410` implements the full chat pipeline: validates model ID via `isValidModelId`, checks daily message quota via `entitlementsByUserType`, creates `UIMessageStream` via `createUIMessageStream`, calls `executeChatCompletion()` inside the stream's `execute` callback (which invokes `streamText` with tools, provider options, reasoning middleware, smoothStream, AbortSignal.timeout), runs background title generation via `generateTitleFromUserMessage`, streams `data-chatTitle` events, saves chat with usage data in `onFinish`, and returns `stream.pipeThrough(new JsonToSseTransformStream())` — an actual SSE stream.

NEW `app/api/chat/route.ts` (40 lines total): calls `requireAuthAction()`, parses `request.json()`, calls `streamChatAction(input)`, returns `success({ chatId: result.chatId })` — a **static JSON response**, not a stream. `features/chat/actions/stream-chat.action.ts:108-168` — `streamChatAction`: authenticates, checks rate limit, maps `input.messages` to `DBMessage[]`, calls `chatService.saveChat(saveParams, ctx)` — **only saves messages to DB**. No `streamText`, no `createUIMessageStream`, no `executeChatCompletion`, no `JsonToSseTransformStream`, no tool wiring, no model invocation, no AI SDK streaming call anywhere in the action chain or route. The `prepareStreamContext` function (L178-222) retrieves messages from DB but does not generate AI responses. Chat is completely non-functional: users send messages, messages are persisted, but **zero AI response is generated or streamed**. This also subsumes P6-BRK-002 (missing streaming response) — both the AI execution and streaming transport are absent.

---

### [P6-BRK-002] Missing Streaming Response in Chat POST Route

| Field | Value |
|-------|-------|
| **Issue ID** | P6-BRK-002 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/chat/route.ts` |
| **NEW Path** | `app/api/chat/route.ts` |

**Description:**
The OLD route returns `stream.pipeThrough(new JsonToSseTransformStream())` - an actual SSE stream that the client can consume for real-time AI responses. The NEW route returns `success({ chatId: result.chatId })` - a static JSON response, not a stream.

**Impact:**
No real-time streaming of AI responses. The chat interface cannot display responses as they're generated.

**Suggested Fix:**
Return a proper SSE stream using AI SDK's `createUIMessageStream` and `JsonToSseTransformStream`, matching the OLD implementation pattern.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T00:00:00Z |

**Findings:** Confirmed defect. OLD `app/(chat)/api/chat/route.ts` L365 returns `new Response(stream.pipeThrough(new JsonToSseTransformStream()))` using `createUIMessageStream` with `executeChatCompletion()` callback. NEW `app/api/chat/route.ts` L35 returns `success({ chatId: result.chatId })` — a static JSON response. The `streamChatAction` (`features/chat/actions/stream-chat.action.ts`) only saves messages to the database via `chatService.saveChat()` and returns `{ chatId, isNewChat, success }`. No AI model invocation, no stream construction, no SSE response. Chat is fundamentally non-streaming.

---

### [P6-BRK-003] Code Handler Uses Placeholder Model String

| Field | Value |
|-------|-------|
| **Issue ID** | P6-BRK-003 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/artifacts/code/server.ts` |
| **NEW Path** | `features/artifact/handlers/code.handler.ts` |

**Description:**
OLD uses `myProvider.languageModel("artifact-model")` - an actual provider call that returns a language model instance.

NEW uses `model: "artifact-model"` - a plain string placeholder. The file has a TODO comment: "Replace with actual provider from lib/ai/providers when available".

**Impact:**
Code artifact generation is completely broken. The `streamObject` call will fail because it receives a string instead of a model instance.

**Suggested Fix:**
Import and use the actual provider from `lib/ai/providers.ts` once available, or create a temporary provider import.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T00:00:00Z |

**Findings:** Confirmed defect. OLD `archive/oldapp/artifacts/code/server.ts` L14 uses `model: myProvider.languageModel("artifact-model")` which returns a `LanguageModelV2` instance. NEW `features/artifact/handlers/code.handler.ts` L79 and L118 both pass `model: "artifact-model"` — a raw string. AI SDK's `streamObject()` requires a `LanguageModelV2` instance, not a string. Both `onCreateDocument` and `onUpdateDocument` are affected. The NEW codebase has `lib/ai/registry.ts` with `getModel(id): LanguageModelV2` that could serve as the replacement, but no import exists in the handler. TODO comments on L77 and L116 confirm this is known placeholder code.

---

### [P6-BRK-004] Text Handler Uses Placeholder Model String

| Field | Value |
|-------|-------|
| **Issue ID** | P6-BRK-004 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/artifacts/text/server.ts` |
| **NEW Path** | `features/artifact/handlers/text.handler.ts` |

**Description:**
Same issue as P6-BRK-003. OLD uses `myProvider.languageModel("artifact-model")`, NEW uses `model: "artifact-model"` string placeholder with TODO comment.

**Impact:**
Text artifact generation is completely broken. The `streamText` call will fail.

**Suggested Fix:**
Import and use the actual provider from `lib/ai/providers.ts`.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T00:00:00Z |

**Findings:** Confirmed defect. OLD `archive/oldapp/artifacts/text/server.ts` L12 uses `model: myProvider.languageModel("artifact-model")`. NEW `features/artifact/handlers/text.handler.ts` L64 and L100 both pass `model: "artifact-model"` string to `streamText()`. AI SDK's `streamText()` requires `LanguageModelV2`, not a string. Both `onCreateDocument` and `onUpdateDocument` are affected. TODO comments on L62 and L98 confirm placeholder status. Same root cause as P6-BRK-003.

---

### [P6-BRK-005] Sheet Handler Uses Placeholder Model String

| Field | Value |
|-------|-------|
| **Issue ID** | P6-BRK-005 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/artifacts/sheet/server.ts` |
| **NEW Path** | `features/artifact/handlers/sheet.handler.ts` |

**Description:**
Same issue as P6-BRK-003 and P6-BRK-004. The sheet handler also uses a string placeholder instead of an actual model instance.

**Impact:**
Sheet/CSV artifact generation is completely broken. The `streamObject` call will fail.

**Suggested Fix:**
Import and use the actual provider from `lib/ai/providers.ts`.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T00:00:00Z |

**Findings:** Confirmed defect. OLD `archive/oldapp/artifacts/sheet/server.ts` L14 uses `model: myProvider.languageModel("artifact-model")`. NEW `features/artifact/handlers/sheet.handler.ts` L79 and L125 both pass `model: "artifact-model"` string to `streamObject()`. Both `onCreateDocument` and `onUpdateDocument` are affected. TODO comments on L77 and L123 confirm placeholder status. Same root cause as P6-BRK-003 and P6-BRK-004. All three handlers (code, text, sheet) share this identical defect — a batch fix importing `getModel` from `lib/ai/registry.ts` would resolve all three.

---

### [P6-BRK-006] GET Returns Single Artifact Instead of Version Array

| Field | Value |
|-------|-------|
| **Issue ID** | P6-BRK-006 |
| **Severity** | Critical |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/document/route.ts` |
| **NEW Path** | `app/api/artifacts/route.ts` |

**Description:**
OLD returns array of all document versions via `documentData.getAll()`. NEW returns single artifact (latest version) via `getArtifact()`. Clients expecting version history array will break.

**Impact:**
Frontend components expecting version history array will receive wrong data structure, breaking version display and rollback UI.

**Suggested Fix:**
Either update GET endpoint to return version array, or create separate `/api/artifacts/versions` endpoint.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T00:00:00Z |

**Findings:** Confirmed defect. OLD `archive/oldapp/app/(chat)/api/document/route.ts` GET handler calls `documentData.getAll(id, ctx)` and returns `Response.json(documents, ...)` — an array of all versions. NEW `app/api/artifacts/route.ts` L31-33 calls `getArtifact(id)` which returns `Artifact | null` (single latest version) via `artifactService.getArtifact()`. The NEW codebase does have `getVersionHistory(artifactId)` in `features/artifact/actions/versions.ts` that returns `Artifact[]`, but this is NOT exposed through any API route — only available as a server action. No `/api/artifacts/versions` endpoint exists. Any frontend or external client querying `GET /api/artifacts?id=X` expecting an array will receive a single object and break.

## Functional Discrepancies

### [P6-FNC-001] Missing DELETE Endpoint for Chat Route

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-001 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/chat/route.ts` |
| **NEW Path** | `app/api/chat/route.ts` |

**Description:**
The OLD route has a DELETE endpoint that:
1. Validates chat ID from query params
2. Authenticates user
3. Applies rate limiting
4. Verifies chat exists and ownership
5. Deletes the chat

The NEW route only has a POST endpoint.

**Impact:**
Users cannot delete chats via the API. This breaks chat management functionality.

**Suggested Fix:**
Add a DELETE endpoint to `app/api/chat/route.ts` or create a separate route that delegates to `deleteChatAction`.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T00:00:00Z |

**Findings:** Confirmed defect. OLD `archive/oldapp/app/(chat)/api/chat/route.ts` exports `DELETE` handler at L413-L466 with full validation: `requireQueryParamForRoute`, `requireAuthForRoute`, `requireRateLimitForRoute`, `chatData.get`, `verifyOwnershipForRoute`, and `chatData.delete`. NEW `app/api/chat/route.ts` only exports `POST` — confirmed by grep (no `DELETE` export). The server action `deleteChatAction` exists in `features/chat/actions/delete-chat.action.ts` with rate limiting and ownership checks, but is NOT exposed via any API route handler. The only DELETE endpoint in the system is `DELETE /api/history` which calls `deleteAllChatsAction` (bulk delete all chats), not individual chat deletion. Individual chat deletion via API is impossible.

---

### [P6-FNC-002] Missing Settings Support in Schema

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-002 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/chat/schema.ts` |
| **NEW Path** | `features/chat/schemas/chat.schema.ts` |

**Description:**
The OLD schema supports a `settings` object with:
- `temperature` (0-2)
- `topP` (0-1)
- `maxOutputTokens` (256-1,000,000)
- `systemPrompt` (max 8192 chars)
- `enableReasoning` (boolean)
- `streamArtifacts` (boolean)
- `autoScroll` (boolean)

The NEW `StreamChatSchema` does not include any settings support.

**Impact:**
Users cannot customize AI behavior (temperature, system prompts, etc.). Advanced features like reasoning mode are unavailable.

**Suggested Fix:**
Add a `settings` field to `StreamChatSchema` with the same validation rules as the OLD schema.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T00:00:00Z |

**Findings:** Confirmed defect. OLD `archive/oldapp/app/(chat)/api/chat/schema.ts` L33-52 defines `settings` as optional object with `sampling: { temperature, topP, maxOutputTokens }`, `systemPrompt`, `enableReasoning`, `streamArtifacts`, `autoScroll`. NEW `features/chat/schemas/chat.schema.ts` `StreamChatSchema` (L159-174) contains only: `id`, `message`, `selectedChatModel`, `selectedVisibilityType`. Grep for `settings|temperature|topP|maxOutputTokens|systemPrompt|enableReasoning` across `features/chat/schemas/` returned zero matches. The settings capability is entirely absent from the new schema. The `streamChatAction` also has no settings parameter in its `StreamChatInput` interface.

---

### [P6-FNC-003] Missing File Part Validation in Schema

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-003 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/chat/schema.ts` |
| **NEW Path** | `features/chat/schemas/chat.schema.ts` |

**Description:**
The OLD schema has `filePartSchema` that validates:
- `mediaType` using `isAllowedAttachmentMimeType()`
- `name` (1-100 chars)
- `url` (valid URL format)

The NEW schema does not have file part validation.

**Impact:**
File attachments cannot be properly validated. Unsupported file types may be accepted, posing security risks.

**Suggested Fix:**
Add file part validation to the message schema, including MIME type validation using `getAllowedAttachmentMimeTypes()`.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T00:00:00Z |

**Findings:** Confirmed defect. OLD `archive/oldapp/app/(chat)/api/chat/schema.ts` L15-22 defines `filePartSchema` with: `type: z.enum(["file"])`, `mediaType: z.string().refine(isAllowedAttachmentMimeType, ...)`, `name: z.string().min(1).max(100)`, `url: z.string().url()`. The OLD also defines `partSchema = z.union([textPartSchema, filePartSchema])` and validates message parts via `parts: z.array(partSchema)`. NEW `features/chat/schemas/chat.schema.ts` `StreamChatSchema` message field (L165-170) only validates `content: MessageContentSchema` (simple string) and `role: MessageRoleSchema`. No `parts` validation, no `filePartSchema`, no MIME type checking. Grep for `filePartSchema|mediaType.*refine|isAllowedAttachment` across `features/chat/` returned zero matches. The NEW `CreateMessageSchema` does have an `attachments` array but only validates `name: z.string()`, `contentType: z.string()`, `url: z.string().url()` — no MIME type allowlist enforcement via `isAllowedAttachmentMimeType`.

---

### [P6-FNC-004] Missing Geolocation Request Hints

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-004 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/chat/route.ts` |
| **NEW Path** | `app/api/chat/route.ts` |

**Description:**
The OLD route uses `geolocation(request)` from `@vercel/functions` to extract:
- longitude, latitude
- city, country

These are passed as `requestHints` to the AI for location-aware responses.

**Impact:**
AI responses cannot be personalized based on user location. Features like "what's the weather near me" may not work correctly.

**Suggested Fix:**
Import and use `geolocation` from `@vercel/functions` in the chat action, passing location data to the AI execution.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed. OLD imports `geolocation` from `@vercel/functions` (L1) and calls it at L165 to extract `{ longitude, latitude, city, country }`, passing the result as `requestHints` to `executeChatCompletion()`. NEW `app/api/chat/route.ts` delegates to `streamChatAction` which has no geolocation support. Grep across all non-archive `app/`, `features/`, and `lib/` directories confirms zero references to `geolocation`, `requestHints`, or `RequestHints`. The `@vercel/functions` package import and `RequestHints` type from `@/lib/ai/prompts` are only in the OLD code. The entire geolocation pipeline is absent from the new codebase.

---

### [P6-FNC-005] Missing Background Title Generation

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-005 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/chat/route.ts` |
| **NEW Path** | `app/api/chat/route.ts` |

**Description:**
The OLD route:
1. Generates a placeholder title immediately
2. Starts background title generation with `generateTitleFromUserMessage()`
3. Streams the generated title to the client via `data-chatTitle` event
4. Updates the chat title in the database asynchronously

The NEW route has no title generation logic.

**Impact:**
New chats have no auto-generated titles. Users see generic titles like "New Chat" instead of meaningful summaries.

**Suggested Fix:**
Implement title generation in the chat action, using the pattern from OLD: placeholder first, then background generation with streaming update.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed. Three distinct gaps identified:
1. **No background generation during streaming**: OLD starts `generateTitleFromUserMessage()` in parallel with AI completion (L189-213), using `generateText()` with a dedicated title model (`DEFAULT_TITLE_MODEL`). NEW `streamChatAction` only accepts an optional `title` from the client — it never generates one.
2. **No SSE title event**: OLD streams `data-chatTitle` to the client when the title is ready (L198-203). NEW returns static JSON `{ chatId }`, not an SSE stream, so there's no mechanism to deliver a generated title mid-stream.
3. **Degraded fallback**: `generateTitleAction` in `update-title.action.ts` (L123-201) exists but only does simple truncation (`textContent.substring(0, 50)`) — NOT AI-based generation. OLD used full `generateText()` with model + system prompt for contextual 80-char titles, with a fallback to 80-char text truncation on failure.

---

### [P6-FNC-006] Missing Tokenlens Model Catalog

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-006 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/chat/route.ts` |
| **NEW Path** | `app/api/chat/route.ts` |

**Description:**
The OLD route fetches and caches the Tokenlens model catalog for:
- Model pricing information
- Token usage tracking
- Cost estimation

The NEW route doesn't use Tokenlens.

**Impact:**
No model pricing/cost information available. Token usage tracking may be incomplete.

**Suggested Fix:**
Integrate Tokenlens catalog fetching with caching using `cacheLife` and `cacheTag`.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed. OLD has `getTokenlensCatalog()` (L44-56) with `"use cache"` directive, `cacheTag("tokenlens-catalog")`, and `cacheLife("days")`. It dynamically imports `tokenlens/fetch` → `fetchModels()` and passes the promise to `executeChatCompletion()` at L176. Inside `chat-completion.ts` (L221-267), the catalog is used with `getUsage()` from `tokenlens/helpers` for pricing/cost enrichment of `AppUsage`. In NEW: grep across all non-archive `lib/`, `features/`, and `app/` directories finds zero imports of `tokenlens/fetch`, `tokenlens/helpers`, or `tokenlens/core`. The only reference is a comment in `lib/ai/token-counter.ts` ("Uses tokenlens for accurate counting when available") which is documentation only, not an actual import. No `AppUsage` type or pricing enrichment exists in the new code.

---

### [P6-FNC-007] Missing Vercel AI Gateway Error Handling

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-007 |
| **Severity** | Low |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/chat/route.ts` |
| **NEW Path** | `app/api/chat/route.ts` |

**Description:**
The OLD route has special handling for Vercel AI Gateway credit card errors:
```typescript
if (error.message?.includes("AI Gateway requires a valid credit card on file")) {
    return new ChatSDKError("bad_request:activate_gateway").toResponse();
}
```

**Impact:**
Users may see generic error messages instead of actionable guidance when Gateway requires payment setup.

**Suggested Fix:**
Add special error handling for Vercel AI Gateway errors in the chat action.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed. OLD `route.ts` L380-403 checks for `"AI Gateway requires a valid credit card on file to service requests"` in the error message, differentiates `vercel-gateway:` prefixed models from others, and returns `ChatSDKError("bad_request:activate_gateway")` which maps to a user-actionable message with a URL to add a credit card (OLD `lib/errors.ts:364-365`). NEW `app/api/chat/route.ts` has a generic `catch (err) { return error(err) }` with no special-case handling. The new error system (`lib/errors.ts`) has no `activate_gateway` error code, no gateway-related codes whatsoever. `lib/ai/providers.ts` does define a Vercel AI Gateway provider (L63), so the gateway is available but its errors are not handled gracefully. Users hitting billing issues will see opaque generic errors.

---

### [P6-FNC-008] Missing Cursor-Based Pagination

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-008 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/chat/[id]/messages/route.ts` |
| **NEW Path** | `app/api/chat/[id]/messages/route.ts` |

**Description:**
The OLD route implements full cursor-based pagination:
- `CursorCodec` for encoding/decoding timestamps
- `cursor` parameter for pagination position
- `limit` parameter (1-100, default 50)
- `direction` parameter (forward/backward)
- `hasMore`, `nextCursor`, `prevCursor` metadata
- Backwards compatibility mode (no params = all messages)

The NEW route just returns all messages via `getChatAction`.

**Impact:**
Large chats will cause performance issues and potential timeouts. No lazy loading of messages.

**Suggested Fix:**
Implement cursor-based pagination in the messages route or `getChatAction`, matching the OLD implementation pattern.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed. OLD implements a complete cursor-based pagination system: `CursorCodec` (L24-44) with base64url-encoded timestamps, `cursor`/`limit`/`direction` query params, `hasMore`/`nextCursor`/`prevCursor` metadata in response, backwards-compatible mode when no pagination params provided, `sortMessagesByTimeAndRole()` helper, and `MAX_PAGINATION_LIMIT` cap. NEW `app/api/chat/[id]/messages/route.ts` delegates entirely to `getChatAction(chatId)` which calls `chatService.getWithMessages()`. That method executes `db.select().from(message).where(eq(message.chatId, chatId)).orderBy(message.createdAt)` — an unbounded query with no LIMIT clause. Response is `{ messages: [] }` with zero pagination metadata. The `_request` parameter is not even used (prefixed with underscore). For chats with thousands of messages this will cause significant latency and memory consumption.

---

### [P6-FNC-009] Missing Ownership Verification in Messages Route

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-009 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/chat/[id]/messages/route.ts` |
| **NEW Path** | `app/api/chat/[id]/messages/route.ts` |

**Description:**
The OLD route verifies ownership for private chats:
```typescript
if (chat.visibility === "private") {
    const ownershipCheck = verifyOwnershipForRoute(chat, session, "chat");
    if (ownershipCheck) return ownershipCheck;
}
```

The NEW route doesn't check visibility or ownership.

**Impact:**
Private chats may be accessible to non-owners. Security vulnerability.

**Suggested Fix:**
Add ownership verification in `getChatAction` for private chats.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Partially accurate — the description is misleading. NEW **does** check ownership, but with different semantics:
- OLD uses visibility-based access: `if (chat.visibility === "private") { verifyOwnership... }` — public chats are accessible to anyone, private chats require ownership.
- NEW `getChatAction` → `chatService.getWithMessages()` (L124-131 of `chat.service.ts`) performs a blanket ownership check: `if (chatResult.userId !== ctx.userId) { throw new ForbiddenError(...) }` — ALL chats require ownership regardless of visibility.
- **Security impact is inverted**: NEW is actually MORE restrictive, not less. Private chats are protected. However, this breaks the public chat sharing feature — non-owners cannot view public chats via this endpoint.
- The real functional gap is: **public chats cannot be accessed by non-owners** (a feature regression, not a security vulnerability).

---

### [P6-FNC-010] Missing Guest User Redis Check

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-010 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/chat/[id]/messages/route.ts` |
| **NEW Path** | `app/api/chat/[id]/messages/route.ts` |

**Description:**
The OLD route checks if Redis is available for guest users before allowing pagination:
```typescript
if (ctx.isGuest && !isRedisAvailable()) {
    return new ChatSDKError("bad_request:api:guest_requires_cache").toResponse();
}
```

**Impact:**
Guest users may experience errors when Redis is unavailable instead of a clear error message.

**Suggested Fix:**
Add Redis availability check for guest users in the action.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed, with a broader finding. Not only is the Redis check missing, but the entire guest user concept is absent from the NEW action layer:
- `getChatAction` (get-history.action.ts L155-156) hardcodes `isGuest: false` when creating `RepositoryContext`.
- `streamChatAction` (stream-chat.action.ts L117) also hardcodes `isGuest: false`.
- All other actions (`updateTitleAction`, `deleteChatsAction`, etc.) similarly hardcode `isGuest: false`.
- `requireAuthAction()` is used at the top of every action — if it blocks guest tokens, guests can't use any API at all; if it accepts them, they're silently treated as regular users.
- The OLD chat route (L109-113) had explicit guest handling: `if (ctx.isGuest && !isRedisAvailable())` with a clear error. The specific Redis check for pagination is moot since the NEW code has no pagination (see P6-FNC-008) and no guest awareness at all.
- **This issue is a symptom of a larger gap**: guest user support is systematically absent across all NEW action layers.

---

### [P6-FNC-011] Missing Stream Reconnection Logic

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-011 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/chat/[id]/stream/route.ts` |
| **NEW Path** | `app/api/chat/[id]/reconnect/route.ts` |

**Description:**
The OLD route implements proper stream reconnection:
1. Checks if most recent message is an assistant message
2. Checks if message was created within 15 seconds
3. If yes, restores the stream with `data-appendMessage` event
4. Uses `createUIMessageStream` and `JsonToSseTransformStream`

The NEW route just returns `{ chatId }` with no message restoration.

**Impact:**
Users who lose connection during AI response generation cannot resume. They lose the partial response.

**Suggested Fix:**
Implement the 15-second window check and message restoration logic in the reconnect route.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T12:00:00Z |

**Findings:** Confirmed. Detailed comparison:
- **OLD** (L81-129): Gets messages, checks `mostRecentMessage.role !== "assistant"`, checks `differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15`, and if both pass, writes `{ type: "data-appendMessage", data: mostRecentMessage, transient: true }` via `createUIMessageStream` → `JsonToSseTransformStream`. Also has rate limiting (`requireRateLimitForRoute "standard"`, L33-41), ownership verification for private chats (L73-79), and proper error handling.
- **NEW** (L17-40): Gets chat via `getChatAction(chatId)`, returns a manual `ReadableStream` that writes `data: {"chatId":"..."} \n\n` and immediately closes. No message type check, no recency window, no message content in the response. The SSE payload `{ chatId }` provides zero reconnection data.
- **Additional gaps**: OLD uses `createUIMessageStream` (AI SDK standard) while NEW uses a raw `ReadableStream` with manual `TextEncoder`, which is inconsistent with the AI SDK patterns used elsewhere. The `stream()` helper from `lib/api` wraps it but the underlying data is empty.

---

### [P6-FNC-012] Missing Rate Limiting in Reconnect Route

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-012 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/chat/[id]/stream/route.ts` |
| **NEW Path** | `app/api/chat/[id]/reconnect/route.ts` |

**Description:**
The OLD route applies rate limiting for stream reconnection:
```typescript
const rateLimitResult = await requireRateLimitForRoute("standard", session.user.id, "stream");
```

The NEW route doesn't have route-level rate limiting (only in the action).

**Impact:**
Potential for abuse via repeated reconnection attempts.

**Suggested Fix:**
Add rate limiting at the route level or ensure the action's rate limiting covers reconnection scenarios.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Partially accurate. The reconnect route (`app/api/chat/[id]/reconnect/route.ts`) has NO route-level rate limiting — confirmed by grep (zero matches for `rateLimit|checkApiLimit` in the file). However, the route delegates to `getChatAction(chatId)` (`features/chat/actions/get-history.action.ts:166-218`) which DOES call `checkApiLimit(userId)` at L171. So rate limiting IS present, but at the action layer rather than the route layer. OLD used route-level `requireRateLimitForRoute("standard", session.user.id, "stream")` — a stream-specific rate limit. NEW uses a generic `checkApiLimit` inside the action. The security exposure is low since rate limiting exists; the issue is architectural (route-level vs action-level) and semantic (stream-specific vs generic limiter). Reclassified as Improvement.

---

### [P6-FNC-013] Missing Ownership Verification in Reconnect Route

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-013 |
| **Severity** | Medium |
| **Status** | False Positive |
| **OLD Path** | `archive/oldapp/app/(chat)/api/chat/[id]/stream/route.ts` |
| **NEW Path** | `app/api/chat/[id]/reconnect/route.ts` |

**Description:**
The OLD route verifies ownership for private chats before allowing reconnection. The NEW route doesn't.

**Impact:**
Private chat streams may be accessible to non-owners.

**Suggested Fix:**
Add ownership verification in the reconnect route or `getChatAction`.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | False Positive |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Ownership verification IS present, rendering this a false positive. The reconnect route delegates to `getChatAction(chatId)` → `chatService.getWithMessages(chatId, ctx)` (`lib/data/services/chat.service.ts:114-160`). The service performs a blanket ownership check at L128-135: `if (chatResult.userId !== ctx.userId) { throw new ForbiddenError("You do not have access to this chat") }` — this applies to ALL chats regardless of visibility. OLD only checked ownership for private chats (`if (chat.visibility === "private") { verifyOwnershipForRoute(...) }`), allowing non-owners to access public chat streams. NEW is actually MORE restrictive: non-owners cannot reconnect to ANY chat, including public ones. The security claim ("private chat streams accessible to non-owners") is incorrect — private chats are fully protected. However, the NEW approach blocks non-owner access to public chat streams (same finding as P6-FNC-009).

**Re-Verification (2026-02-16T23:59:00Z):** Full call chain traced: `reconnect/route.ts` → `getChatAction(chatId)` → `chatService.getWithMessages(chatId, ctx)` → `chatRepository.findById(chatId, ctx)`. The repository's `doFindById` (`chat.repository.ts:139-157`) uses `and(eq(chat.id, id), eq(chat.userId, context.userId))` when context is provided — SQL-level ownership filter. Additionally, the service layer (`chat.service.ts:125-131`) performs an explicit `if (chatResult.userId !== ctx.userId) throw new ForbiddenError(...)` check as defense-in-depth (catches cache hits from `base.repository.ts:findById` where cache key doesn't include userId). The ForbiddenError IS reachable from the reconnect path — caught by `getChatAction`'s try/catch and returned as `{ success: false, error }`, then the route returns `error(result.error)`. Ownership is verified at TWO layers. **FP confirmed.**

---

### [P6-FNC-014] Missing Timestamp-Based DELETE for Rollback

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-014 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/document/route.ts` |
| **NEW Path** | `app/api/artifacts/route.ts` |

**Description:**
OLD supports `DELETE /api/document?id=uuid&timestamp=ISO` to delete versions after timestamp (for rollback). NEW only supports full artifact deletion via `DELETE /api/artifacts?id=uuid`.

**Impact:**
API-based version rollback is no longer available. While `rollbackToVersion()` server action exists, the API endpoint for programmatic rollback is missing.

**Suggested Fix:**
Add timestamp parameter support to DELETE endpoint, or document that rollback is only available via server action.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/(chat)/api/document/route.ts` DELETE handler (L170-237) requires both `id` and `timestamp` params, calls `parseTimestampForRoute(timestampResult)` for validation, applies `strict` rate limiting, verifies ownership, then calls `documentData.deleteAfterTimestamp(id, timestampDate, ctx)` — selective version deletion for rollback. NEW `app/api/artifacts/route.ts` DELETE handler (L76-90) only accepts `id`, calls `deleteArtifact(id)` which invokes `artifactService.deleteArtifact(artifactId, ctx)` → `artifactRepository.delete(artifactId, ctx)` — deletes ALL versions permanently. No timestamp parameter, no rollback capability at the API level. The `rollbackToVersion(artifactId, timestamp)` server action exists in `features/artifact/actions/versions.ts:92-116` and calls `artifactService.rollbackToTimestamp()` → `artifactRepository.deleteVersionsAfterTimestamp()` (L647+), proving the repository layer supports timestamp-based deletion. But this is ONLY accessible via server action, not via REST API. External/programmatic clients cannot perform rollback.

---

### [P6-FNC-015] Missing Rate Limiting in Artifact Routes

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-015 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/document/route.ts` |
| **NEW Path** | `app/api/artifacts/route.ts` |

**Description:**
OLD applies rate limiting (`standard` for GET/POST, `strict` for DELETE). NEW has no rate limiting in route - delegates to actions, but actions don't have rate limiting.

**Impact:**
Artifact API is unprotected against abuse. Attackers can flood the endpoint with requests.

**Suggested Fix:**
Add rate limiting to artifact routes using `lib/rate-limit/` module.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/(chat)/api/document/route.ts` applies rate limiting at all three endpoints: GET uses `requireRateLimitForRoute("standard", ...)` (L53-59), POST uses `requireRateLimitForRoute("standard", ...)` (L111-117), DELETE uses `requireRateLimitForRoute("strict", ...)` (L206-212). NEW `app/api/artifacts/route.ts` has ZERO rate limiting — grep for `rateLimit|rate.limit|checkApiLimit` across `app/api/artifacts/` returned zero matches. The actions called by the route (`getArtifact`, `createArtifact`, `updateArtifact`, `deleteArtifact` in `features/artifact/actions/`) also have ZERO rate limiting — grep confirmed zero matches. Rate limiting is completely absent at BOTH route and action levels. All four CRUD endpoints (GET, POST, PATCH, DELETE) are unprotected. This is the most severe rate limiting gap — artifact operations are typically expensive (DB writes, version creation) and should at minimum have `strict` limiting on write operations.

---

### [P6-FNC-016] Missing Kind Mismatch Validation

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-016 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/document/route.ts` |
| **NEW Path** | `features/artifact/actions/update-artifact.action.ts` |

**Description:**
OLD validates that `kind` matches original document - returns `bad_request:document:kind_mismatch`. NEW has no such validation in `updateArtifact`.

**Impact:**
Artifact type can be changed after creation, potentially breaking type-specific editors and handlers.

**Suggested Fix:**
Add kind validation in `updateArtifact` action to ensure consistency.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/(chat)/api/document/route.ts` POST handler L143-149 explicitly validates: `if (mostRecent.kind !== kind) { return new ChatSDKError("bad_request:document:kind_mismatch", \`Cannot change document kind from '${mostRecent.kind}' to '${kind}'\`).toResponse(); }`. NEW `features/artifact/actions/update-artifact.action.ts` `updateArtifact(artifactId, params)` passes params directly to `artifactService.updateArtifact()`. The service method (`lib/data/services/artifact.service.ts:318-365`) fetches the current version, then creates a new version with `kind: params.kind ?? current.kind` — if `params.kind` is provided and differs from `current.kind`, it silently applies the change without validation. The `UpdateArtifactParams` interface explicitly allows `kind?: "text" | "code" | "image" | "sheet"` as an optional field. No mismatch guard exists anywhere in the chain. A caller could change a text artifact to a code artifact, breaking the type-specific handler/editor association. The route-level PATCH handler (`app/api/artifacts/route.ts:58-70`) also does no validation — it casts `body` directly to `UpdateArtifactParams`.

---

### [P6-FNC-017] Missing Graceful Degradation for Suggestions

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-017 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/artifacts/actions.ts` |
| **NEW Path** | `features/artifact/actions/suggestions.ts` |

**Description:**
OLD `getSuggestions` has try-catch returning `[]` on error. NEW `getSuggestions` throws errors up the chain.

**Impact:**
Suggestion failures will cause unhandled errors instead of gracefully showing empty suggestions.

**Suggested Fix:**
Wrap suggestion fetching in try-catch and return empty array on failure.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/artifacts/actions.ts` `getSuggestions({ documentId })` wraps the entire function body in try-catch with graceful degradation: `catch (error) { logWarn("getSuggestions graceful degradation", ...); return []; }`. It also differentiates `ChatSDKError` (expected errors) from unexpected errors, logs both, and always returns `[]`. NEW `features/artifact/actions/suggestions.ts` `getSuggestions(artifactId)` (L60-80) has NO try-catch. The function calls `requireAuthAction()` (can throw `UnauthorizedError`), then `artifactService.getSuggestions(artifactId, ctx)` (can throw `InternalServerError`). Any error propagates uncaught to the caller. If the service throws (e.g., database connection error), the UI component rendering suggestions will receive an unhandled error instead of an empty array, potentially crashing the component or showing an error boundary. The OLD pattern was explicitly designed as a UX improvement — suggestions are non-critical data that should degrade gracefully.

---

### [P6-FNC-018] Missing UUID Validation at Route Level

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-018 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/document/route.ts` |
| **NEW Path** | `app/api/artifacts/route.ts` |

**Description:**
OLD uses `validateUUIDForRoute(id, "id")` returns 400 for invalid UUIDs. NEW passes string directly to actions without validation.

**Impact:**
Invalid UUIDs will cause database errors instead of clean 400 responses.

**Suggested Fix:**
Add UUID validation at route level or in action layer.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/(chat)/api/document/route.ts` calls `validateUUIDForRoute(id, "id")` at GET L36-39, POST L97-100, and DELETE L180-183 — returning a clean `400 Bad Request` with `ChatSDKError("bad_request:api:invalid_uuid")` for malformed IDs. NEW `app/api/artifacts/route.ts` extracts `id` via `searchParams.get("id")` and passes it directly to action functions (GET L30, POST L49, PATCH L64, DELETE L83). No UUID format validation at the route level — grep confirmed zero matches for `uuid|UUID|validateUUID|z.string().uuid` in `app/api/artifacts/`. The action layer also performs no UUID validation — `getArtifact(artifactId)`, `deleteArtifact(artifactId)`, `updateArtifact(artifactId, params)` all pass the string directly to the service/repository layer. While `ArtifactUUIDSchema = z.string().uuid()` exists in `features/artifact/schemas/artifact.schema.ts:28`, it is NOT imported or used in the route or any action. Invalid UUIDs (e.g., `"not-a-uuid"`, `"<script>alert(1)</script>"`) will reach the database query layer, causing `InternalServerError` instead of a descriptive `400` response.

---

### [P6-FNC-019] Missing Ownership Verification at Route Level

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-019 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/document/route.ts` |
| **NEW Path** | `app/api/artifacts/route.ts` |

**Description:**
OLD uses `verifyOwnershipForRoute()` to check document belongs to session user. NEW relies on service/repository layer (implementation needs verification).

**Impact:**
Potential security issue if ownership check is not properly implemented in service layer.

**Suggested Fix:**
Verify ownership check exists in `ArtifactService` or add at route level.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Ownership verification IS present, but at a different layer. Traced the full chain:
- **GET** → `getArtifact(id)` → `artifactService.getArtifact(id, ctx)` → `artifactRepository.findLatestVersion(id, ctx)` includes `eq(artifact.userId, context.userId)` in WHERE clause (L510-515). Non-owners get `null` → route returns `notFound("Artifact not found")`.
- **PATCH** → `updateArtifact(id, params)` → `artifactService.updateArtifact(id, params, ctx)` → `artifactRepository.findLatestVersion(id, ctx)` with userId filter. Non-owners get `NotFoundError` thrown.
- **DELETE** → `deleteArtifact(id)` → first calls `getArtifact(id, ctx)` (userId-filtered), then `artifactRepository.delete(id, ctx)` includes `eq(artifact.userId, context.userId)` in DELETE WHERE clause (L423-425). Non-owners get `false`.
- **POST** → `createArtifact(body)` sets `context.userId` as owner during creation.

Security is maintained — no unauthorized access is possible. The difference is semantic: OLD returns explicit `403 Forbidden` via `verifyOwnershipForRoute()`, NEW returns `404 Not Found` or ambiguous responses. This is an architectural choice (repository-level filtering vs route-level guards), not a security defect. Reclassified as Improvement for error semantics consistency.

---

### [P6-FNC-020] Missing Cache-Control Headers

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-020 |
| **Severity** | Low |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/document/route.ts` |
| **NEW Path** | `app/api/artifacts/route.ts` |

**Description:**
OLD returns `Cache-Control: private, max-age=60` for GET responses. NEW has no caching headers.

**Impact:**
Reduced caching efficiency, more repeated requests for unchanged artifacts.

**Suggested Fix:**
Add Cache-Control headers to GET responses.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/(chat)/api/document/route.ts` GET handler returns `Response.json(documents, { status: 200, headers: { "Cache-Control": "private, max-age=60" } })` at L79-83. NEW `app/api/artifacts/route.ts` GET handler calls `return success(artifact)`. The `success()` helper in `lib/api/response.ts` creates a `new Response(JSON.stringify(response), { status: 200, headers: createHeaders(...) })` where `createHeaders()` only sets `Content-Type: application/json` and optionally `X-Request-ID`. No `Cache-Control` header is set, and the `success()` API does not accept custom headers. The caching behavior is absent from ALL artifact GET responses. While not a breaking defect, it degrades caching efficiency for clients and CDN proxies that use `Cache-Control` to avoid redundant artifact fetches. Classifying as **Improvement** since the NEW code still functions correctly — it just misses a performance optimization.

---

### [P6-FNC-021] Missing Body Validation at Route Level

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-021 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/document/route.ts` |
| **NEW Path** | `app/api/artifacts/route.ts` |

**Description:**
OLD uses `documentPostSchema` with content max 1MB, title 1-500 chars. NEW passes raw JSON to action without validation.

**Impact:**
Oversized content or invalid titles will cause database errors instead of clean 400 responses.

**Suggested Fix:**
Add body validation using Zod schema at route or action level.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/(chat)/api/document/route.ts` POST handler calls `parseJsonBodyForRoute(request, documentPostSchema, "document")` at L120-125. The `documentPostSchema` (in `archive/oldapp/app/(chat)/api/document/schema.ts`) validates: `content: z.string().max(1024*1024)` (1MB limit), `title: z.string().min(1).max(500)`, `kind: artifactKindSchema`. Invalid bodies return a clean 400 response. NEW `app/api/artifacts/route.ts` POST handler does `const body = await request.json()` then `await createArtifact(body)` — no Zod schema, no size limits, no field validation. The `createArtifact` action (`features/artifact/actions/create-artifact.action.ts`) accepts `CreateArtifactParams` as a TypeScript type only (erased at runtime) — it passes `params.chatId`, `params.title`, `params.kind`, `params.content` directly to `artifactService.createArtifact()` with zero runtime validation. Similarly, PATCH uses `await request.json() as UpdateArtifactParams` — a type assertion with no runtime checking. An attacker could submit arbitrarily large content (no 1MB cap), empty titles, invalid kinds, or extra fields. The NEW `lib/api/validation.ts` exports `validateBody(request, schema)` utility that could be used but is not called in this route.

---

### [P6-FNC-022] PATCH vs POST for Updates

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-022 |
| **Severity** | Low |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/document/route.ts` |
| **NEW Path** | `app/api/artifacts/route.ts` |

**Description:**
OLD uses POST for both create and update (determined by whether document exists). NEW uses POST for create, PATCH for update.

**Impact:**
Different HTTP semantics - may affect caching proxies and API clients expecting POST-only pattern.

**Suggested Fix:**
Document the API change, or provide backward-compatible POST endpoint.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Confirmed as a deliberate architectural change, not a defect. OLD `archive/oldapp/app/(chat)/api/document/route.ts` POST handler at L128-130 checks `if (documents.length > 0)` to determine whether to treat the request as an update (existing document) or an error (no chat context). Both create and update go through POST. NEW `app/api/artifacts/route.ts` cleanly separates: POST exports `createArtifact(body)` at L49-55, PATCH exports `updateArtifact(id, body)` at L62-73. This is **better REST semantics** — POST for creation, PATCH for partial update — and follows HTTP method conventions more accurately. The only concern is backward compatibility: clients that used `POST /api/document?id=X` for updates must now use `PATCH /api/artifacts?id=X`. The path also changed from `/api/document` to `/api/artifacts`. This is a breaking API change but an architectural improvement.

---

### [P6-FNC-023] Missing CSRF Protection in Guest POST Route

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-023 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/api/auth/guest/route.ts` |
| **NEW Path** | `app/api/auth/guest/route.ts` |

**Description:**
OLD validates Origin/Referer headers via `validateOrigin(request)` to prevent CSRF attacks. NEW has no CSRF protection in the POST handler.

**Impact:**
Guest session creation is vulnerable to CSRF attacks. Malicious sites could create guest sessions on behalf of users.

**Suggested Fix:**
Add `validateOrigin(request)` call in the POST handler before processing the request.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/api/auth/guest/route.ts` POST handler L25-30: `if (!validateOrigin(request)) { return new ChatSDKError("forbidden:auth:csrf", "Invalid request origin").toResponse(); }` — validates Origin/Referer before any session creation. NEW `app/api/auth/guest/route.ts` POST handler (L19-33) has zero CSRF checks — it immediately calls `getSession()` then `getOrCreateGuestSession()`. The `validateOrigin` function IS available in the NEW codebase (exported from `lib/api/context.ts` L453 and re-exported via `lib/api/index.ts` L124), so this is not a missing dependency — it's simply not called. The NEW logout route DOES call `validateOrigin(request)`, proving the pattern is used elsewhere. A malicious site could issue `fetch('https://target.com/api/auth/guest', { method: 'POST', credentials: 'include' })` to create guest sessions on the victim's browser, potentially disrupting existing sessions or creating unwanted cookie state.

---

### [P6-FNC-024] Missing Rate Limiting in Guest Route

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-024 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/api/auth/guest/route.ts` |
| **NEW Path** | `app/api/auth/guest/route.ts` |

**Description:**
OLD applies IP-based rate limiting using `requireCustomRateLimitForRoute()` with `AUTH_GUEST` limits. NEW has no rate limiting.

**Impact:**
Attackers can flood the guest endpoint to create unlimited guest sessions, potentially exhausting database resources.

**Suggested Fix:**
Add rate limiting using the rate limit module from `lib/rate-limit/`.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/api/auth/guest/route.ts` POST handler L35-47 calls `requireCustomRateLimitForRoute()` with `{ strategy: "sliding_window", limit: RATE_LIMITS.AUTH_GUEST.limit, window: RATE_LIMITS.AUTH_GUEST.window, identifier: ip, namespace: RATE_LIMITS.AUTH_GUEST.namespace }` — IP-based sliding window rate limiting. NEW `app/api/auth/guest/route.ts` POST handler has zero rate limiting. The `getOrCreateGuestSession()` (in `lib/auth/session.ts` L240-254) simply checks for an existing guest cookie, and if absent, creates a new one with `crypto.randomUUID()` — no rate limiting at any layer. Impact note: while NEW guests are cookie-based (not DB-stored), unlimited requests could still be used for cookie-stuffing attacks, automated session harvesting, or DoS via CPU cost of UUID generation and cookie operations at scale. The `lib/rate-limit/` module exists and is functional in the NEW codebase.

---

### [P6-FNC-025] Missing Open Redirect Protection in Guest GET Route

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-025 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/api/auth/guest/route.ts` |
| **NEW Path** | `app/api/auth/guest/route.ts` |

**Description:**
OLD has comprehensive open redirect protection (Issue #21 Fix):
- Validates against dangerous schemes (javascript:, data:, vbscript:, file:)
- Path traversal protection with `PATH_TRAVERSAL_REGEX`
- Origin matching for absolute URLs
- URL normalization to prevent encoding bypass

NEW just uses `redirectUrl` param directly without validation.

**Impact:**
Open redirect vulnerability allows phishing attacks. Attackers can craft URLs that appear to be from the application but redirect to malicious sites.

**Suggested Fix:**
Implement the full redirect URL validation from OLD, including scheme validation, path traversal protection, and origin matching.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Confirmed security vulnerability. OLD `archive/oldapp/app/api/auth/guest/route.ts` GET handler L110-161 implements `getSafeRedirectUrl()` with 6 protection layers: (1) `decodeURIComponent` normalization to prevent encoding bypass, (2) dangerous scheme blocking (`javascript:`, `data:`, `vbscript:`, `file:` — case-insensitive), (3) protocol-relative URL blocking (`//`), (4) path traversal detection via `PATH_TRAVERSAL_REGEX = /^\/[\\]+/` (e.g., `/\evil.com`), (5) origin matching for absolute URLs (`parsed.origin === url.origin`), (6) fallback to `"/"` on any parse failure. This was a deliberate security fix (Issue #21).

NEW `app/api/auth/guest/route.ts` GET handler L46-56: `const redirectUrl = url.searchParams.get("redirectUrl") || "/"` → `NextResponse.redirect(new URL(redirectUrl, url.origin))`. Zero validation. Attack vectors: (1) `?redirectUrl=https://evil.com` → redirects to external site (phishing). While `new URL(redirectUrl, url.origin)` treats relative paths correctly, an absolute URL like `https://evil.com` overwrites the base. (2) `?redirectUrl=javascript:alert(1)` — while `NextResponse.redirect` using `new URL()` may throw on non-http schemes, the error handling is missing (`try/catch` absent), causing a 500 instead of safe redirect. The entire `getSafeRedirectUrl()` logic was dropped during migration.

---

### [P6-FNC-026] Missing Rate Limiting in Logout Route

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-026 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/api/auth/logout/route.ts` |
| **NEW Path** | `app/api/auth/logout/route.ts` |

**Description:**
OLD applies IP-based rate limiting for logout. NEW has no rate limiting.

**Impact:**
Potential for abuse via repeated logout requests, though impact is limited.

**Suggested Fix:**
Add rate limiting to the logout endpoint.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/api/auth/logout/route.ts` POST handler L36-48 calls `requireCustomRateLimitForRoute()` with `{ strategy: "sliding_window", limit: RATE_LIMITS.AUTH_EXCHANGE.limit, window: RATE_LIMITS.AUTH_EXCHANGE.window, identifier: ip, namespace: "rate_limit:auth_logout" }` — IP-based sliding window rate limiting. NEW `app/api/auth/logout/route.ts` POST handler has zero rate limiting — it immediately validates origin, calls `signOut()`, deletes guest cookie. While the impact is lower than other missing rate limits (logout is a read-light operation that clears cookies + NextAuth session), an attacker could still abuse this to: (1) repeatedly clear sessions for a user in a shared-IP environment, (2) cause excessive `signOut()` calls which hit NextAuth internals and potentially the session store, (3) generate log noise. The NEW route does correctly retain CSRF protection via `validateOrigin(request)`.

---

### [P6-FNC-027] Guest Cookie Name Mismatch

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-027 |
| **Severity** | Medium |
| **Status** | False Positive |
| **OLD Path** | `archive/oldapp/app/api/auth/logout/route.ts` |
| **NEW Path** | `app/api/auth/logout/route.ts` |

**Description:**
OLD uses `guest_token` as the guest cookie name. NEW uses `guest_id`. This inconsistency could cause issues if both old and new code run in the same environment or during migration.

**Impact:**
Guest sessions may not be properly cleared on logout if the wrong cookie name is used.

**Suggested Fix:**
Verify the correct cookie name is used consistently across all auth-related code. Check `lib/auth/session.ts` for the canonical name.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | False Positive |
| **Verified At** | 2026-02-16T22:30:00Z |

**Findings:** The NEW codebase is internally consistent — NOT a defect. Traced all references:
- OLD canonical: `archive/oldapp/lib/auth/session.ts` L29: `const GUEST_COOKIE_NAME = "guest_token"` — used by OLD logout (`archive/oldapp/app/api/auth/logout/route.ts` L14), OLD guest route, and OLD session functions.
- NEW canonical: `lib/auth/session.ts` L56: `const GUEST_COOKIE_NAME = "guest_id"` — used by NEW logout (`app/api/auth/logout/route.ts` L15), NEW guest session creation (`createGuestSession()` at L294), and NEW guest session reading (`getGuestSession()` at L261).
- Grep for `guest_token` in non-archive code returns zero matches. Grep for `guest_id` in non-archive code returns consistent matches in `lib/auth/session.ts` and `app/api/auth/logout/route.ts`.

The cookie name change from `guest_token` to `guest_id` is a **deliberate rename**, and the NEW codebase is fully consistent. The only migration concern is that pre-existing `guest_token` cookies from the OLD app won't be cleared by the NEW logout route — but guest cookies are ephemeral (7-day TTL) and will expire naturally. No code defect exists; this is a deployment/migration consideration, not a bug.

**Re-Verification (2026-02-16T23:59:00Z):** Exhaustive grep for `guest_token` in `lib/**` returned zero cookie-name matches. The only hits are `GUEST_TOKEN_TTL` (`lib/constants.ts:214`) — a TTL duration constant, NOT a cookie name. NEW cookie name `guest_id` is used consistently at: `lib/auth/session.ts:56` (canonical constant), `app/api/auth/logout/route.ts:15`, `middleware.ts:280` (`request.cookies.get("guest_id")`). Zero cross-contamination between old and new cookie names. Migration users' stale `guest_token` cookies will expire within 7 days (ephemeral). **FP confirmed.**

---

### [P6-FNC-028] Missing Auth Exchange Endpoint

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-028 |
| **Severity** | Medium |
| **Status** | False Positive |
| **OLD Path** | `archive/oldapp/app/api/auth/exchange/route.ts` |
| **NEW Path** | N/A (uses NextAuth pattern) |

**Description:**
OLD has `/api/auth/exchange` endpoint for Supabase token exchange:
- Validates JWT format via Zod schema
- Verifies token before setting cookie
- Sets cookie with proper TTL (3600 seconds)
- Deletes guest cookie on auth upgrade

NEW uses NextAuth pattern with `[...nextauth]` catch-all route. This is an architectural change, but the exchange endpoint may still be needed for Supabase auth integration.

**Impact:**
If the application uses Supabase auth with token exchange, this endpoint may be required. Need to verify auth flow works correctly with NextAuth.

**Suggested Fix:**
Verify the complete auth flow works with NextAuth. If Supabase token exchange is needed, create the exchange endpoint or document the alternative approach.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | False Positive |
| **Verified At** | 2026-02-16T23:30:00Z |

**Findings:** The exchange endpoint is Supabase-specific and does NOT apply to the new architecture. OLD used Supabase auth with direct JWT verification via `getSupabaseSessionFromToken()` (`archive/oldapp/lib/auth/session.ts:100`), which required a client-side token exchange step (`POST /api/auth/exchange`) to set the `sb-access-token` cookie. NEW uses NextAuth v5 (`lib/auth/config.ts`) with a Credentials provider (`email + bcrypt password verification` at L72-100), JWT session strategy (L128), and internal session callbacks (jwt callback at L162, session callback at L171). NextAuth handles session management and token lifecycle internally — no external exchange endpoint is needed. The `[...nextauth]` catch-all route (`app/api/auth/[...nextauth]/route.ts`) plus the OAuth callback route (`app/api/auth/callback/route.ts`) fully cover the auth flow. Zero references to Supabase JWT verification exist in the new `lib/auth/` directory (confirmed by grep). This is an intentional architectural migration from Supabase to NextAuth, not a missing feature.

**Re-Verification (2026-02-16T23:59:00Z):** Project fully migrated from Supabase to NextAuth v5. Auth config at `lib/auth/config.ts` uses Credentials provider with bcrypt + JWT session strategy. NextAuth's `[...nextauth]` catch-all route handles login/session/CSRF internally. The Supabase token exchange pattern (client sends JWT → server sets cookie) is architecturally irrelevant — NextAuth manages session cookies automatically via `SessionProvider`. No `getSupabaseSessionFromToken`, `sb-access-token`, or Supabase client references exist in new auth code. **FP confirmed.**

---

### [P6-FNC-029] Missing Rate Limiting in File Upload

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-029 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/files/upload/route.ts` |
| **NEW Path** | `app/api/files/upload/route.ts` |

**Description:**
OLD applies rate limiting (5 requests per hour) using `requireRateLimitForRoute("upload", ...)`. NEW has no rate limiting.

**Impact:**
Users can upload unlimited files, potentially exhausting storage and bandwidth resources.

**Suggested Fix:**
Add rate limiting to the file upload endpoint using `lib/rate-limit/`.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T23:30:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/(chat)/api/files/upload/route.ts:58-63` calls `requireRateLimitForRoute("upload", session.user.id, "api")` which applies the `upload` limiter (5 requests per hour). NEW `app/api/files/upload/route.ts` (96 lines total) only calls `requireAuthAction()` at L58 — zero rate limiting at any layer. The `lib/rate-limit/limits.ts` module exports `uploadLimiter` (20 req/min) and `checkUploadLimit(userId)` that are specifically designed for file uploads, but neither is imported nor invoked from the upload route. Authenticated users can upload files at unlimited frequency, risking storage exhaustion and bandwidth abuse. Fix: Add `const rl = await checkUploadLimit(userId); if (!rl.success) throw new RateLimitError(...)` after `requireAuthAction()`.

---

### [P6-FNC-030] Different File Size Limits

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-030 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/files/upload/route.ts` |
| **NEW Path** | `app/api/files/upload/route.ts` |

**Description:**
OLD uses `ATTACHMENT_MAX_FILE_SIZE` (5MB) from `lib/files.ts`. NEW uses `MAX_FILE_SIZE` (10MB) defined inline. The limit doubled.

**Impact:**
Larger files may cause issues if the application isn't designed for 10MB uploads. May also increase storage costs.

**Suggested Fix:**
Verify 10MB is the intended limit. Consider centralizing the constant in `lib/files.ts` for consistency.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T23:30:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/lib/files.ts:1` defines `ATTACHMENT_MAX_FILE_SIZE = 5 * 1024 * 1024` (5MB), imported by `archive/oldapp/app/(chat)/api/files/upload/schema.ts:4` and used in the Zod schema validation. NEW `app/api/files/upload/route.ts:16` defines `MAX_FILE_SIZE = 10 * 1024 * 1024` (10MB) inline — a 2× increase with no ADR, spec, or code comment explaining the change. Additionally, the constant is defined inline in the route file rather than centralized in a shared module (OLD used `lib/files.ts`). No corresponding `lib/files.ts` or `lib/files/` directory exists in the new codebase (confirmed by `file_search lib/files/**` returning zero results). Two issues: (1) undocumented limit change from 5MB to 10MB, (2) non-centralized constant violates the OLD's shared-module pattern, making it harder to maintain consistency if other components need the same limit.

---

### [P6-FNC-031] Reduced MIME Type Support

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-031 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/files/upload/route.ts`, `archive/oldapp/lib/files.ts` |
| **NEW Path** | `app/api/files/upload/route.ts` |

**Description:**
OLD supports comprehensive MIME types via `isAllowedAttachmentMimeType()`:
- Images: jpeg, png, gif, webp
- Documents: pdf, text, markdown, csv, json
- Archives: zip
- Office: xls, xlsx, doc, docx, ppt, pptx
- Media prefixes: image/*, audio/*, video/*

NEW only supports: jpeg, png, gif, webp, pdf, text/plain, text/markdown

Missing: csv, json, zip, office documents, audio/*, video/*

**Impact:**
Users cannot upload CSV, JSON, ZIP, or Office documents. Audio and video files are rejected.

**Suggested Fix:**
Expand `ALLOWED_TYPES` to match OLD's comprehensive list, or use the centralized `isAllowedAttachmentMimeType()` from `lib/files.ts`.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T23:30:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/lib/files.ts:3-20` defines 19 explicit MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `application/pdf`, `text/plain`, `text/markdown`, `text/csv`, `application/json`, `application/zip`, `application/octet-stream`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`. Additionally, OLD L28-32 defines prefix patterns: `image/*`, `audio/*`, `video/*` — so ANY image, audio, or video MIME type is accepted. NEW `app/api/files/upload/route.ts:19-26` defines only 7 types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `application/pdf`, `text/plain`, `text/markdown`. Uses exact-match `ALLOWED_TYPES.includes(contentType)` — no prefix matching. Missing from NEW: `text/csv`, `application/json`, `application/zip`, `application/octet-stream`, all 6 Office document formats, and all `audio/*`/`video/*` types. Additionally, OLD's `isAllowedAttachmentMimeType()` utility function with its `null`/`undefined` rejection for security is not replicated — NEW falls through to `application/octet-stream` fallback at L74 which then fails the allowlist check.

---

### [P6-FNC-032] Missing Rate Limiting in History Route

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-032 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/history/route.ts` |
| **NEW Path** | `app/api/history/route.ts` |

**Description:**
OLD applies rate limiting:
- GET: `standard` limiter (100 req/min)
- DELETE: `strict` limiter (10 req/min)

NEW has no rate limiting in either handler.

**Impact:**
History endpoint vulnerable to abuse. DELETE endpoint especially needs protection against mass deletion attempts.

**Suggested Fix:**
Add rate limiting to both GET and DELETE handlers.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect (Overturned) |
| **Verified At** | 2026-02-16T23:59:00Z |

**Findings:** Initially classified as False Positive because rate limiting DOES exist at the action layer:
- **GET**: `app/api/history/route.ts` → `getHistoryAction()` → `features/chat/actions/get-history.action.ts:115` calls `checkApiLimit(userId)` (100 req/min via `apiLimiter`).
- **DELETE**: `app/api/history/route.ts` → `deleteAllChatsAction()` → `features/chat/actions/delete-chat.action.ts:147` calls `checkApiLimit(userId)` (100 req/min via `apiLimiter`).

However, the original FP classification was overturned because it overlooked a critical security nuance. OLD differentiated: GET used `standard` (100 req/min), DELETE used `strict` (10 req/min). NEW uses the same `checkApiLimit` (100 req/min via `apiLimiter`) for BOTH operations. `deleteAllChatsAction` (`features/chat/actions/delete-chat.action.ts:147`) — which permanently deletes ALL of a user's chats — allows 100 requests/minute, identical to a read-only history fetch. This is 10× more lenient than OLD's `strict` limiter for the same destructive operation. A malicious script or compromised session could trigger mass deletion repeatedly. The rate limiting is not "missing" but is **inadequately permissive for destructive operations**. Fix: Replace `checkApiLimit` with `checkChatLimit` or a dedicated strict limiter in `deleteAllChatsAction`. **FP overturned — reclassified as Defect (inadequate rate limiting for destructive DELETE).**

---

### [P6-FNC-033] Missing Conflicting Pagination Params Validation

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-033 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/history/route.ts` |
| **NEW Path** | `app/api/history/route.ts` |

**Description:**
OLD validates that `starting_after` and `ending_before` are not both provided:
```typescript
if (startingAfter && endingBefore) {
    return new ChatSDKError("bad_request:api:conflicting_pagination_params", ...);
}
```

NEW doesn't validate this.

**Impact:**
Invalid pagination requests may cause unexpected behavior or errors.

**Suggested Fix:**
Add validation for conflicting pagination parameters in the action or route.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T23:30:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/(chat)/api/history/route.ts:31-36` explicitly validates: `if (startingAfter && endingBefore) { return new ChatSDKError("bad_request:api:conflicting_pagination_params", ...).toResponse() }` — returning a clear 400 error. Full trace through NEW: `app/api/history/route.ts:26-28` passes both `startingAfter` and `endingBefore` to `getHistoryAction()` → `features/chat/actions/get-history.action.ts:134-137` passes them to `chatService.getHistory(pagination, ctx)` → `lib/data/services/chat.service.ts` → `chatRepository.findByUserId(userId, pagination)` → `lib/data/repositories/chat.repository.ts:413-427` uses `if (startingAfter) { ... } else if (endingBefore) { ... }`. The `else if` silently ignores `endingBefore` when both are provided — no error, no log, no indication to the caller. The request succeeds but with unexpected semantics (only `startingAfter` is applied). No validation exists at any layer: route, action, service, or repository. Fix: Add `if (startingAfter && endingBefore) throw new ValidationError(...)` in `getHistoryAction` or at the route level.

---

### [P6-FNC-034] Missing Rate Limiting in Suggestions Route

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-034 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/suggestions/route.ts` |
| **NEW Path** | `app/api/suggestions/route.ts` |

**Description:**
OLD applies rate limiting (`standard` limiter). NEW has no rate limiting.

**Impact:**
Suggestions endpoint vulnerable to abuse.

**Suggested Fix:**
Add rate limiting to the suggestions endpoint.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T23:30:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/(chat)/api/suggestions/route.ts:27-32` calls `requireRateLimitForRoute("standard", session.user.id, "api")` — applying the `standard` limiter (100 req/min). Full trace through NEW: `app/api/suggestions/route.ts:22` calls `getSuggestions(artifactId)` → `features/artifact/actions/suggestions.ts:63-73` only calls `requireAuthAction()` and then `artifactService.getSuggestions(artifactId, ctx)` — zero rate limiting at any layer. Unlike the history route which delegates to actions with `checkApiLimit()`, the suggestions action has NO rate limiter call. The `lib/rate-limit` module exports `checkApiLimit` which could be used but is not imported in `features/artifact/actions/suggestions.ts`. Fix: Add `const rl = await checkApiLimit(userId); if (!rl.success) throw new RateLimitError(...)` in `getSuggestions` action.

---

### [P6-FNC-035] Missing Guest User Handling in Suggestions

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-035 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/suggestions/route.ts` |
| **NEW Path** | `app/api/suggestions/route.ts` |

**Description:**
OLD returns empty array for guest users since suggestions aren't persisted for guests:
```typescript
if (session.user.type === "guest") {
    return Response.json([], { status: 200, headers: { "Cache-Control": "private, max-age=300" } });
}
```

NEW doesn't handle guest users specially.

**Impact:**
Guest users may get errors or unexpected behavior when fetching suggestions.

**Suggested Fix:**
Add guest user check and return empty array for guests.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T23:30:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/(chat)/api/suggestions/route.ts:37-43` checks `if (session.user.type === "guest")` and returns `Response.json([], { status: 200, headers: { "Cache-Control": "private, max-age=300" } })` — a fast-path that avoids unnecessary DB queries since suggestions are never persisted for guests. NEW `features/artifact/actions/suggestions.ts:63-73` `getSuggestions()` calls `requireAuthAction()` → gets `userId` → creates context with `isGuest: false` (hardcoded at L68) → queries `artifactService.getSuggestions(artifactId, ctx)`. No guest check at any layer. Two failure modes: (1) If `requireAuthAction()` from `lib/auth/guards.ts` blocks guest sessions entirely, guests get an auth error instead of an empty array (worse UX, unnecessary 401). (2) If guests pass auth, they're treated as regular users with `isGuest: false`, potentially causing DB query failures since no suggestions exist for guest user IDs. This is part of the systemic guest handling gap identified in P6-FNC-010 — all NEW actions hardcode `isGuest: false`. OLD also returns `Cache-Control: private, max-age=300` headers in the guest response for caching efficiency, which is absent from NEW.

---

### [P6-FNC-036] Missing Document Ownership Verification in Suggestions

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-036 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/suggestions/route.ts` |
| **NEW Path** | `app/api/suggestions/route.ts` |

**Description:**
OLD verifies document ownership before returning suggestions (Issue #13 Fix):
```typescript
const document = await documentData.get(documentId, ctx);
if (!document) {
    return Response.json([], { status: 200 }); // Avoid information disclosure
}
```

NEW doesn't verify ownership.

**Impact:**
Users could potentially retrieve suggestions for documents they don't own. Security vulnerability.

**Suggested Fix:**
Add document/artifact ownership verification in the action or route.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T22:00:00Z |

**Findings:** The issue description is partially accurate but overstates the severity. Traced the full call chain: `app/api/suggestions/route.ts` GET → `getSuggestions(artifactId)` (`features/artifact/actions/suggestions.ts:62`) → `artifactService.getSuggestions(artifactId, ctx)` (`lib/data/services/artifact.service.ts:250`) → `suggestionRepository.findByArtifactId(artifactId, ctx)` (`lib/data/repositories/suggestion.repository.ts:428-460`). The repository query uses `WHERE artifactId = ? AND userId = ?` — filtering by **both** `suggestion.artifactId` AND `context.userId`. This means if user B queries suggestions for artifact X (owned by user A), the query returns `[]` because no suggestions with `userId=B` exist for that artifact. **Cross-user data leakage does not occur.** However, the defense-in-depth layer IS missing: OLD first calls `documentData.get(documentId, ctx)` (which has ownership filtering) to verify the document belongs to the user BEFORE fetching suggestions. NEW skips this step entirely — going straight to the suggestion query. While the userId filter on suggestions provides base-level protection, the explicit artifact ownership check (the OLD Issue #13 fix) is absent. This is a defense-in-depth gap, not a direct vulnerability. Severity should be **Medium** (not High).

---

### [P6-FNC-037] Missing UUID Validation in Suggestions Route

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-037 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/suggestions/route.ts` |
| **NEW Path** | `app/api/suggestions/route.ts` |

**Description:**
OLD validates UUID format via `validateUUIDForRoute(documentId, "documentId")`. NEW only checks for presence of `artifactId`.

**Impact:**
Invalid UUIDs will cause database errors instead of clean 400 responses.

**Suggested Fix:**
Add UUID validation for the artifactId parameter.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T22:00:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/(chat)/api/suggestions/route.ts:56-60` calls `validateUUIDForRoute(documentId, "documentId")` which returns a 400 response for invalid UUID format. NEW `app/api/suggestions/route.ts:24-26` only checks `if (!artifactId)` for null/empty — accepts any non-empty string. The `suggestion.artifactId` column is `uuid("artifact_id")` in the schema (`lib/db/schema.ts:327`), meaning PostgreSQL expects UUID format. Passing a non-UUID string (e.g., `?artifactId=not-a-uuid`) flows through to `suggestionRepository.findByArtifactId` → Drizzle `eq(suggestion.artifactId, artifactId)` → PostgreSQL raises `ERROR: invalid input syntax for type uuid`. This bubbles up as a 500 Internal Server Error (caught by the generic `catch (err) { return error(err) }` in the route, which would map to a 500). Instead of a clean 400 "Invalid UUID format" response, the user sees an opaque server error.

---

### [P6-FNC-038] Parameter Name Change in Suggestions Route

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-038 |
| **Severity** | Low |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/suggestions/route.ts` |
| **NEW Path** | `app/api/suggestions/route.ts` |

**Description:**
OLD uses `documentId` query parameter. NEW uses `artifactId`. This is a breaking change for API consumers.

**Impact:**
Existing API clients using `documentId` will fail.

**Suggested Fix:**
Document the API change, or support both parameter names for backward compatibility.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T22:00:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/(chat)/api/suggestions/route.ts:49-53` reads `requireQueryParamForRoute(searchParams, "documentId")`. NEW `app/api/suggestions/route.ts:23` reads `searchParams.get("artifactId")`. This is an intentional rename aligned with the v5→v6 architectural shift from "Document" to "Artifact" (consistent with schema rename in `lib/db/schema.ts:260` — table `Artifact`, and the entire `features/artifact/` module naming). The route path also changed from `/api/suggestions?documentId=` to `/api/suggestions?artifactId=`. This is a deliberate API design change, not a defect. Clients using the OLD parameter name will get a 400 "Missing artifactId parameter" error. Since this is a ground-up v6 rewrite (not an in-place migration), this is acceptable as a documented breaking change.

---

### [P6-FNC-039] Missing Cache-Control Headers in Suggestions

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-039 |
| **Severity** | Low |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/suggestions/route.ts` |
| **NEW Path** | `app/api/suggestions/route.ts` |

**Description:**
OLD returns `Cache-Control: private, max-age=300` headers. NEW has no caching headers.

**Impact:**
Reduced caching efficiency, more repeated requests.

**Suggested Fix:**
Add Cache-Control headers to suggestions responses.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T22:00:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/(chat)/api/suggestions/route.ts` consistently returns `Cache-Control: private, max-age=300` on ALL response paths: guest user empty array (L36-42), document-not-found empty array (L68-75), no-suggestions empty array (L84-98), and success with data (L91-98). NEW `app/api/suggestions/route.ts:30` returns `success(suggestions)` which calls `lib/api/response.ts:64` → `createHeaders()` (L35-39) which only sets `Content-Type: application/json` and optionally `X-Request-ID`. No `Cache-Control` header is set anywhere in the response chain. The `success()` helper has no option to add custom headers. The 300-second (5-minute) cache was designed for suggestion data which changes infrequently — its absence means browsers and proxies will re-fetch suggestions on every page load, increasing API load.

---

### [P6-FNC-040] HTTP Method Change for Voting

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-040 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/vote/route.ts` |
| **NEW Path** | `app/api/votes/route.ts` |

**Description:**
OLD uses PATCH method for voting. NEW uses POST method. This is a breaking change for API consumers.

**Impact:**
Existing API clients using PATCH will fail. The route path also changed from `/api/vote` to `/api/votes`.

**Suggested Fix:**
Document the API change, or support both PATCH and POST for backward compatibility.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T22:00:00Z |

**Findings:** Confirmed. Two breaking changes: (1) **HTTP method**: OLD exports `PATCH` (`archive/oldapp/app/(chat)/api/vote/route.ts:19`), NEW exports `POST` (`app/api/votes/route.ts:64`). (2) **Route path**: OLD at `/api/vote` (singular), NEW at `/api/votes` (plural). Both are intentional v6 API design changes. The method change from PATCH to POST is debatable — PATCH is arguably more semantically correct for upsert operations ("update or create a vote"), while POST implies creating a new resource. However, the NEW implementation uses POST with `onConflictDoUpdate` (upsert) in `chatService.voteMessage` (`lib/data/services/chat.service.ts:583-589`), which functionally works. The NEW route also adds a GET endpoint (`app/api/votes/route.ts:33-55`) for retrieving votes — not present in OLD. Since this is a v6 ground-up rewrite with no backwards-compatibility requirement, these changes are acceptable design decisions, not defects. Severity should be **Low** (not High).

---

### [P6-FNC-041] Missing Rate Limiting in Votes Route

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-041 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/vote/route.ts` |
| **NEW Path** | `app/api/votes/route.ts` |

**Description:**
OLD applies rate limiting (`standard` limiter). NEW has no rate limiting.

**Impact:**
Votes endpoint vulnerable to abuse - users could spam votes.

**Suggested Fix:**
Add rate limiting to both GET and POST handlers.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T22:00:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/(chat)/api/vote/route.ts:37-45` applies `requireRateLimitForRoute("standard", session.user.id, "api")` before processing votes. NEW `app/api/votes/route.ts` has zero rate limiting on both GET (L33-55) and POST (L64-86) handlers. Grep for `rateLimit|rate.limit|requireRateLimit` across the file returns no matches. The route calls `requireAuthAction()` for auth but has no abuse protection. The `chatService.voteMessage` (`lib/data/services/chat.service.ts:571-619`) also has no rate limiting — it directly performs the DB upsert. A malicious user could spam the POST endpoint to write excessive vote records (even though upsert limits to one per user/message, the CPU + DB write cost per request is non-trivial) and spam the GET endpoint to overload read operations.

---

### [P6-FNC-042] Missing Guest User Check in Votes

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-042 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/vote/route.ts` |
| **NEW Path** | `app/api/votes/route.ts` |

**Description:**
OLD prevents guest users from voting:
```typescript
const guestCheck = requireNonGuestForRoute(session, "vote", "vote");
if (guestCheck) return guestCheck;
```

NEW doesn't check for guest users.

**Impact:**
Guest users may be able to vote, which could cause issues since votes require database persistence.

**Suggested Fix:**
Add guest user check and return appropriate error for guests.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T22:00:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/(chat)/api/vote/route.ts:47-51` calls `requireNonGuestForRoute(session, "vote", "vote")` which blocks guest users from voting. NEW `app/api/votes/route.ts` uses `requireAuthAction()` (`lib/auth/guards.ts:99-106`) which calls `getUserId()` → `getSession()` → checks both authenticated sessions AND guest sessions (`lib/auth/session.ts:81-97`). `getUserId()` returns the guest user ID (e.g., `guest:UUID`) if a guest session exists — meaning `requireAuthAction()` succeeds for guests. The NEW route has no `requireNonGuest()` or `requireAuthenticatedUser()` call — both of which exist in `lib/auth/guards.ts` (L121 and L116 respectively) but are not used. Guest users will be able to create votes. The vote schema (`lib/db/schema.ts:221`) has `userId: uuid("user_id").references(() => user.id)` — if guest user IDs follow a `guest:UUID` format that doesn't match any entry in the `user` table, the FK constraint would block the insert (causing a 500). If guest users DO have entries in the user table, stale votes would accumulate for ephemeral sessions. Either way, the behavior is broken for guests.

---

### [P6-FNC-043] Missing Chat Ownership Verification in Votes

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-043 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/vote/route.ts` |
| **NEW Path** | `app/api/votes/route.ts` |

**Description:**
OLD verifies chat ownership before allowing votes:
```typescript
const chat = await chatData.get(chatId, ctx, { warmCache: false });
const ownershipCheck = verifyOwnershipForRoute(chat, session, "vote");
```

NEW doesn't verify ownership.

**Impact:**
Users could vote on messages in chats they don't own. Security vulnerability.

**Suggested Fix:**
Add chat ownership verification in the action or route.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T22:00:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/(chat)/api/vote/route.ts:53-68` performs: (1) `chatData.get(chatId, ctx, { warmCache: false })` to fetch the chat, (2) `requireResourceForRoute(chat, "vote")` to verify chat exists, (3) `verifyOwnershipForRoute(chatResource, session, "vote")` to verify the authenticated user owns the chat. NEW `app/api/votes/route.ts` POST handler (L64-86): calls `requireAuthAction()`, parses body, then directly calls `chatService.voteMessage(chatId, messageId, userId, isUpvoted)`. Traced `chatService.voteMessage` (`lib/data/services/chat.service.ts:571-619`): performs a raw `db.insert(vote).values({chatId, messageId, userId, isUpvoted}).onConflictDoUpdate(...)` — **zero** ownership verification. No chat lookup, no ownership check, no chat existence check. Any authenticated user who knows a valid `chatId` and `messageId` (both UUIDs) can insert a vote for ANY chat. The DB FK constraint on `vote.chatId` → `chat.id` will prevent votes on non-existent chats (returning 500), but valid chats owned by OTHER users are unprotected. The GET handler (`L33-55`) uses `voteRepository.findByChatId(chatId, { userId, isGuest: false })` but `findByChatId` (`lib/data/repositories/vote.repository.ts:594-614`) queries `WHERE chatId = ?` with `_context` parameter **unused** (prefixed with underscore) — returns ALL votes for a chat regardless of who requests them. Both GET and POST lack chat ownership checks. This is a genuine security vulnerability.

---

### [P6-FNC-044] Missing Message Existence Verification in Votes

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-044 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/api/vote/route.ts` |
| **NEW Path** | `app/api/votes/route.ts` |

**Description:**
OLD verifies the message belongs to the chat (Issue #9 Fix):
```typescript
const chatWithMessages = await chatData.getWithMessages(chatId, ctx);
const messageExists = chatWithMessages?.messages.some((m) => m.id === messageId);
if (!messageExists) {
    return new ChatSDKError("not_found:vote", "Message not found in this chat");
}
```

NEW doesn't verify message existence.

**Impact:**
Users could vote on messages from other chats if they know the message ID.

**Suggested Fix:**
Add message existence verification in the `chatService.voteMessage()` method.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T23:30:00Z |

**Findings:** Confirmed. OLD `archive/oldapp/app/(chat)/api/vote/route.ts:70-81` fetches the full chat with messages via `chatData.getWithMessages(chatId, ctx)`, then checks `chatWithMessages?.messages.some(m => m.id === messageId)`, returning `ChatSDKError("not_found:vote", "Message not found in this chat")` if the message doesn't belong to that chat. This was an explicit Issue #9 Fix to prevent cross-chat vote injection.

NEW `app/api/votes/route.ts:60-82` POST handler parses `{ chatId, messageId, type }` via `voteBodySchema` (Zod UUID + enum validation), then calls `chatService.voteMessage(chatId, messageId, userId, isUpvoted)` directly. `ChatService.voteMessage()` at `lib/data/services/chat.service.ts:571-620` performs only `db.insert(vote).values({chatId, messageId, userId, isUpvoted}).onConflictDoUpdate(...)` — a raw upsert with **zero message existence check**. No verification that `messageId` belongs to `chatId`. An attacker knowing a valid `messageId` from another chat can associate a vote record with an unrelated `chatId`, creating data integrity issues and potentially leaking information about message existence across chats.

---

### [P6-FNC-045] Missing deleteTrailingMessages Action

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-045 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/actions.ts` |
| **NEW Path** | `features/chat/actions/` (missing) |

**Description:**
OLD has `deleteTrailingMessages({ chatId, createdAt })` that:
1. Validates session and creates context
2. Applies rate limiting
3. Validates UUID and timestamp
4. Verifies chat ownership
5. Deletes all messages after the given timestamp
6. Revalidates the chat page

NEW has no equivalent action. The `delete-chat.action.ts` only handles full chat deletion, not trailing message deletion.

**Impact:**
Users cannot delete messages after a specific point in the conversation. This breaks the "edit and resubmit" workflow where trailing messages should be removed when editing an earlier message.

**Suggested Fix:**
Create a `delete-trailing-messages.action.ts` in `features/chat/actions/` that implements the same functionality.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect (Overturned) |
| **Verified At** | 2026-02-16T23:59:00Z |

**Findings:** Initially classified as False Positive because the function at `archive/oldapp/app/(chat)/actions.ts:54-84` exists with full guards. However, `archive/oldapp/` IS the OLD codebase, not part of NEW. Verified: `features/chat/actions/` contains 7 files: `create-chat.action.ts`, `delete-chat.action.ts`, `get-history.action.ts`, `index.ts`, `save-message.action.ts`, `stream-chat.action.ts`, `update-title.action.ts` — NO `delete-trailing-messages.action.ts` or equivalent. Grep for `deleteTrailingMessages` in `features/**` returned exactly 1 match: `features/chat/components/message-editor.tsx:142` — a `console.log` placeholder, not an action. The function at `archive/oldapp/app/(chat)/actions.ts:54-84` is legacy code in the OLD codebase. Per project structure convention (`archive/oldapp/` = OLD, everything else = NEW), the action does NOT exist in the NEW codebase. The v6 feature-based architecture requires a migrated action in `features/chat/actions/`. **FP overturned — the action IS genuinely missing from the NEW codebase.**

---

### [P6-FNC-046] Missing updateChatVisibility Action

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-046 |
| **Severity** | High |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/actions.ts` |
| **NEW Path** | `features/chat/actions/` (missing) |

**Description:**
OLD has `updateChatVisibility({ chatId, visibility })` that:
1. Validates session and creates context
2. Applies rate limiting
3. Validates UUID and visibility type via Zod schema
4. Verifies chat ownership
5. Updates chat visibility (public/private)
6. Revalidates the chat page

NEW has no equivalent action. Visibility is only set during chat creation via `visibility` parameter in `create-chat.action.ts` and `stream-chat.action.ts`.

**Impact:**
Users cannot change a chat's visibility after creation. Public chats cannot be made private, and private chats cannot be made public.

**Suggested Fix:**
Create an `update-visibility.action.ts` in `features/chat/actions/` that implements visibility updates with ownership verification.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect (Overturned) |
| **Verified At** | 2026-02-16T23:59:00Z |

**Findings:** Same logic as P6-FNC-045 re-verification. The previous FP reasoning incorrectly treated `archive/oldapp/` as part of the NEW codebase. Verified: grep for `updateChatVisibility` in `features/**` returned ZERO matches. The `features/chat/actions/` directory has no visibility-related action. The function at `archive/oldapp/app/(chat)/actions.ts:86-122` is OLD code. The hook at `hooks/use-chat-visibility.ts:77` explicitly confirms the action doesn't exist in NEW: `// TODO: Implement updateChatVisibility action when available` followed by `console.log(...)`. The hook never persists visibility changes to the server — they revert on page refresh. **FP overturned — the action IS genuinely missing from the NEW codebase, and the v6 feature-based architecture requires a migrated `update-visibility.action.ts` in `features/chat/actions/`.**

---

### [P6-FNC-047] Different Title Generation Signature

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-047 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/app/(chat)/actions.ts` |
| **NEW Path** | `features/chat/actions/update-title.action.ts` |

**Description:**
OLD `generateTitleFromUserMessage({ message: UIMessage })` accepts a full UIMessage object and passes it to `generateTitle({ message })` for AI-based title generation.

NEW `generateTitleAction(chatId: string)` accepts a chatId, fetches the chat with messages, and generates a simple title by truncating the first user message to 50 characters.

Key differences:
1. OLD uses AI to generate contextual titles via `lib/ai/title-generation.ts`
2. NEW uses simple text truncation without AI
3. OLD accepts the message directly; NEW fetches from database

**Impact:**
Title quality is reduced. OLD generates meaningful AI titles like "Discussion about React hooks" while NEW produces truncated text like "Can you explain how useEffect works in...".

**Suggested Fix:**
Integrate AI-based title generation in `generateTitleAction` using the pattern from OLD's `lib/ai/title-generation.ts`.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Defect |
| **Verified At** | 2026-02-16T23:30:00Z |

**Findings:** Confirmed. Three distinct regressions:

1. **Signature change**: OLD `generateTitleFromUserMessage({ message: UIMessage })` at `archive/oldapp/app/(chat)/actions.ts:31-52` accepts a `UIMessage` directly. NEW `generateTitleAction(chatId: string)` at `features/chat/actions/update-title.action.ts:123` accepts a `chatId` and fetches messages from the database. Different interface means callers must be updated.

2. **AI vs truncation**: OLD calls `generateTitle({ message })` → `archive/oldapp/lib/ai/title-generation.ts:12-36` which invokes `generateText()` with `DEFAULT_TITLE_MODEL`, a system prompt ("generate a short title... not more than 80 characters... summary of the user's message... no quotes or colons"), and `JSON.stringify(message)` as the prompt. This produces contextual, AI-generated titles. NEW at L176-181 does `textContent.substring(0, 50) + "..."` — simple string truncation with a 50-char limit (OLD used 80 chars even in its fallback).

3. **Error handling regression**: OLD has a `try/catch` that falls back to 80-char text extraction on AI failure with `logWarn`. NEW's `generateTitleAction` has a `try/catch` that returns `{ success: false, error }` — no fallback title generation. Additionally, the OLD action at `archive/oldapp/app/(chat)/actions.ts:31-52` also exists with auth + rate limiting + input validation via `uiMessageSchema`, which the NEW `generateTitleAction` does replicate (auth + rate limit), but the Zod validation of the message structure is lost since NEW fetches from DB.

Note: The OLD action at `archive/oldapp/app/(chat)/actions.ts:31-52` with AI integration is still present in the codebase and importable, but the NEW `generateTitleAction` is the replacement being used by the new architecture. Both coexist but with degraded functionality in the new version.

---

### [P6-FNC-048] Missing Centralized AI Prompts in Code Handler

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-048 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/artifacts/code/server.ts` |
| **NEW Path** | `features/artifact/handlers/code.handler.ts` |

**Description:**
OLD imports `codePrompt` and `updateDocumentPrompt` from `@/lib/ai/prompts` - centralized, maintainable prompts.

NEW defines prompts inline as `CODE_CREATE_SYSTEM_PROMPT` and `getUpdateSystemPrompt()`. This duplicates prompt logic and makes it harder to maintain consistency.

**Impact:**
Prompt changes need to be made in multiple places. Inconsistent prompt behavior between handlers and other AI operations.

**Suggested Fix:**
Move prompts to `lib/ai/prompts.ts` and import them in the handlers, matching the OLD pattern.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T23:30:00Z |

**Findings:** Confirmed as a valid architectural concern, but classified as **Improvement** rather than Defect because the inline prompts are functionally adequate — they just reduce maintainability.

OLD `archive/oldapp/artifacts/code/server.ts:3` imports `{ codePrompt, updateDocumentPrompt }` from `@/lib/ai/prompts`. The centralized `codePrompt` (at `archive/oldapp/lib/ai/prompts.ts`) focuses on: complete/runnable Python, `print()` for output, under 15 lines, standard lib only, no `input()`/infinite loops/file/network, brief comments. The centralized `updateDocumentPrompt(content, type)` is concise: `"Update the {type} below based on the user's request.\n\n{content}"`.

NEW `features/artifact/handlers/code.handler.ts:24-31` defines `CODE_CREATE_SYSTEM_PROMPT` inline — similar intent but different wording (adds "PEP 8" reference, omits "no `input()`" and line length guidance). `getUpdateSystemPrompt(content)` at L38-43 is significantly more verbose with a Python code block wrapper and different instructions ("Maintain the overall structure and style").

Critically, `lib/ai/prompts.ts` does NOT exist in the NEW codebase (only in `archive/oldapp/`). All three handlers (code, text, sheet) define prompts independently, creating 6 separate prompt definitions instead of the OLD's 4 centralized ones. Content drift between handlers is already visible: each `getUpdateSystemPrompt` has different formatting and instructions despite serving the same purpose.

---

### [P6-FNC-049] Missing Centralized AI Prompts in Text Handler

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-049 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/artifacts/text/server.ts` |
| **NEW Path** | `features/artifact/handlers/text.handler.ts` |

**Description:**
OLD imports `updateDocumentPrompt` from `@/lib/ai/prompts`. NEW defines prompts inline.

**Impact:**
Same as P6-FNC-048 - prompt maintenance becomes harder.

**Suggested Fix:**
Use centralized prompts from `lib/ai/prompts.ts`.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T23:30:00Z |

**Findings:** Confirmed, same pattern as P6-FNC-048. OLD `archive/oldapp/artifacts/text/server.ts:2` imports `{ updateDocumentPrompt }` from `@/lib/ai/prompts`. The create prompt is inline in both OLD and NEW (identical text: "Write about the given topic. Markdown is supported. Use headings wherever appropriate.").

For updates: OLD uses the centralized `updateDocumentPrompt(document.content, "text")` → `"Update the document below based on the user's request.\n\n{content}"`. NEW `features/artifact/handlers/text.handler.ts:24-31` defines `getUpdateSystemPrompt(content)` inline with a more verbose template: "You are a helpful assistant that helps update documents.\n\nCurrent document content:\n{content}\n\nPlease update the document based on the user's request. Maintain the overall structure and style unless specifically asked to change it."

The content differs from both the OLD centralized version AND the code handler's update prompt, confirming cross-handler prompt drift. Classified as Improvement: the prompts work but centralization would improve maintainability.

---

### [P6-FNC-050] Missing Centralized AI Prompts in Sheet Handler

| Field | Value |
|-------|-------|
| **Issue ID** | P6-FNC-050 |
| **Severity** | Medium |
| **Status** | Open |
| **OLD Path** | `archive/oldapp/artifacts/sheet/server.ts` |
| **NEW Path** | `features/artifact/handlers/sheet.handler.ts` |

**Description:**
OLD imports `sheetPrompt` and `updateDocumentPrompt` from `@/lib/ai/prompts`. NEW defines prompts inline.

**Impact:**
Same as P6-FNC-048 - prompt maintenance becomes harder.

**Suggested Fix:**
Use centralized prompts from `lib/ai/prompts.ts`.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T23:30:00Z |

**Findings:** Confirmed, same pattern as P6-FNC-048/049. OLD `archive/oldapp/artifacts/sheet/server.ts:3` imports `{ sheetPrompt, updateDocumentPrompt }` from `@/lib/ai/prompts`. OLD `sheetPrompt` is concise: "Generate a CSV spreadsheet... Include meaningful headers. Ensure data is consistent and formatted correctly."

NEW `features/artifact/handlers/sheet.handler.ts:24-33` defines `SHEET_CREATE_SYSTEM_PROMPT` inline with expanded requirements: column headers, realistic sample data, CSV formatting, quoting rules, first row headers — more detailed than OLD but divergent. `getUpdateSystemPrompt(content)` at L39-47 wraps content in a CSV code block with different instructions than both the code and text handlers' update prompts.

All three handlers now have independent, inconsistent update prompts:
- Code: "Maintain the overall structure and style" (Python code block)
- Text: "Maintain the overall structure and style" (no code block)
- Sheet: "Maintain the overall structure" (CSV code block)

OLD had ONE `updateDocumentPrompt(content, type)` that parameterized by type. Classified as Improvement — functionally adequate but architecturally regressed.

## Improvement Only

### [P6-IMP-001] New GET Endpoint for Votes

| Field | Value |
|-------|-------|
| **Issue ID** | P6-IMP-001 |
| **Location** | `app/api/votes/route.ts` |

**Description:** NEW adds a GET endpoint to retrieve votes by chatId. This is new functionality not present in OLD. The GET endpoint allows fetching existing votes for a chat.

**Status:** Enhancement - No action required.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T23:30:00Z |

**Findings:** Confirmed as a genuine enhancement. OLD `archive/oldapp/app/(chat)/api/vote/route.ts` exports only `PATCH` — no GET endpoint to retrieve existing votes. NEW `app/api/votes/route.ts:29-54` adds `GET /api/votes?chatId=uuid` which: authenticates via `requireAuthAction()`, validates `chatId` presence, validates UUID format via `voteQuerySchema` (Zod), calls `voteRepository.findByChatId(chatId, { userId, isGuest: false })`, and returns votes via `success(votes)`. The implementation is functional and well-structured. Note: While this is a valid enhancement, the GET endpoint inherits the same security gaps flagged in other issues — no rate limiting (P6-FNC-041), no guest user check (P6-FNC-042), and no chat ownership verification (P6-FNC-043). The `isGuest: false` hardcode also means guest users who somehow authenticate will be treated as regular users.

---

### [P6-IMP-002] Missing createDocumentHandler Factory Import

| Field | Value |
|-------|-------|
| **Issue ID** | P6-IMP-002 |
| **Location** | `features/artifact/handlers/base.handler.ts` |

**Description:** OLD uses `createDocumentHandler<"code">()` factory function from `@/lib/artifacts/server`. NEW uses `createArtifactHandler()` from `./base.handler.ts`. This is an architectural refactoring — the NEW approach uses a class-based handler pattern while OLD used a factory function. The functionality is preserved, but the import path and pattern changed.

**Status:** Enhancement - No action required.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T23:50:00Z |

**Findings:** Confirmed as intentional architectural refactoring, not a defect. OLD `archive/oldapp/lib/artifacts/server.ts:48-97` exports `createDocumentHandler<T>()` — a factory function that wraps `onCreateDocument`/`onUpdateDocument` callbacks with persistence logic via `documentData.save()` and context creation via `createContext(session)`. OLD handlers (code L5, text L4, sheet L5) all import from `@/lib/artifacts/server`. NEW `features/artifact/handlers/base.handler.ts:191-233` exports `createArtifactHandler<T>()` — an equivalent factory that wraps callbacks with persistence via dynamic `import('../actions/create-artifact.action')` and `import('../actions/update-artifact.action')`. Both factories have identical behavioral contracts: accept `{kind, onCreateDocument, onUpdateDocument}` config, return a handler that (1) calls the callback to get content, (2) persists via the data layer. Key differences: (1) NEW uses dynamic imports for actions instead of direct data-layer calls (better code splitting), (2) NEW also provides `BaseArtifactHandler` abstract class as an alternative OOP pattern, (3) NEW handler context uses `userId: string` instead of full `AppSession` object. The `createArtifactHandler` factory is used by all four NEW handlers (`code.handler.ts:74`, `text.handler.ts`, `sheet.handler.ts`, `image.handler.ts:38`). Functionality is fully preserved — this is an architectural improvement.

---

### [P6-IMP-003] Missing Image Handler in OLD

| Field | Value |
|-------|-------|
| **Issue ID** | P6-IMP-003 |
| **Location** | `features/artifact/handlers/image.handler.ts` |

**Description:** NEW has an `image.handler.ts` for image artifacts that OLD doesn't have. This is new functionality — image artifacts are now supported as a first-class handled artifact kind, whereas OLD only had partial client-side support.

**Status:** Enhancement - No action required.

#### Verification

| Field | Value |
|-------|-------|
| **Verification Status** | Improvement |
| **Verified At** | 2026-02-16T23:50:00Z |

**Findings:** Confirmed as a genuine enhancement. OLD has `archive/oldapp/artifacts/image/client.tsx` (client-side only — UI rendering and clipboard copy for image artifacts), but NO server-side handler (`archive/oldapp/artifacts/image/server.ts` does NOT exist). The OLD `documentHandlersByArtifactKind` array in `archive/oldapp/lib/artifacts/server.ts:101-105` only registers `[textDocumentHandler, codeDocumentHandler, sheetDocumentHandler]` — image is absent. OLD `artifactKinds` constant is `["text", "code", "sheet"]` (L107). NEW `features/artifact/handlers/image.handler.ts:38-63` provides a server-side `imageHandler` using `createArtifactHandler({ kind: "image" })` with stub implementations (images are uploaded client-side, not AI-generated). NEW `features/artifact/handlers/index.ts` registers all four handlers including `image: imageHandler` in the `artifactHandlers` map. This is additive — the NEW architecture formalizes image as a first-class handled artifact kind, whereas OLD only had partial client-side support.
