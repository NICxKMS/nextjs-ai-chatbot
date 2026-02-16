# API Routes Comparison - Phase 6 Issues

**Comparison Date:** 2026-02-15
**Focus:** API routes, server actions, and artifact handlers

---

## Summary

This comparison reveals **60 issues** across API routes, authentication, file uploads, and server actions. The NEW implementation has critical broken code in artifact handlers and missing core chat functionality.

---

# UI Inconsistencies (UI)

*No UI inconsistency issues found in this phase.*

---

# Bugs (BUG)

## [P6-BUG-001] Incomplete rejectSuggestion Implementation

**Severity:** Medium
**Status:** Open
**OLD File:** N/A (NEW functionality)
**NEW File:** features/artifact/actions/suggestions.ts
**Line Ref:** L194-L220 (NEW)

**Description:**
The `rejectSuggestion()` function has a TODO comment at line 218-219: "TODO: Implement suggestion deletion when available". The function currently only verifies the suggestion exists but doesn't actually delete or mark it as rejected.

**Impact:**
Rejected suggestions remain in the database and may still appear in UI. Users cannot properly dismiss suggestions.

**Suggested Fix:**
Implement suggestion deletion in `artifactService` and call it from `rejectSuggestion()`.

---

# Broken Code (BRK)

## [P6-BRK-001] Missing AI Execution in Chat POST Route

**Severity:** Critical
**Status:** Open
**OLD File:** `archive/oldapp/app/(chat)/api/chat/route.ts`
**NEW File:** `app/api/chat/route.ts`
**Line Ref:** L217-L231 (OLD)

**Description:**
The OLD route calls `executeChatCompletion()` which handles the actual AI model invocation and streaming. The NEW route's `streamChatAction` only saves messages to the database - it does not call any AI model or generate responses.

**Impact:**
Chat is completely non-functional. Users send messages but receive no AI responses.

**Suggested Fix:**
Implement AI execution in `streamChatAction` or create a separate action that calls the AI model using the AI SDK's `streamText` or similar function. Reference the OLD implementation's `executeChatCompletion()` pattern.

---

## [P6-BRK-002] Missing Streaming Response in Chat POST Route

**Severity:** Critical
**Status:** Open
**OLD File:** `archive/oldapp/app/(chat)/api/chat/route.ts`
**NEW File:** `app/api/chat/route.ts`
**Line Ref:** L365 (OLD)

**Description:**
The OLD route returns `stream.pipeThrough(new JsonToSseTransformStream())` - an actual SSE stream that the client can consume for real-time AI responses. The NEW route returns `success({ chatId: result.chatId })` - a static JSON response, not a stream.

**Impact:**
No real-time streaming of AI responses. The chat interface cannot display responses as they're generated.

**Suggested Fix:**
Return a proper SSE stream using AI SDK's `createUIMessageStream` and `JsonToSseTransformStream`, matching the OLD implementation pattern.

---

## [P6-BRK-003] Code Handler Uses Placeholder Model String

**Severity:** Critical
**Status:** Open
**OLD File:** archive/oldapp/artifacts/code/server.ts
**NEW File:** features/artifact/handlers/code.handler.ts
**Line Ref:** L13-L14 (OLD), L78-L79 (NEW)

**Description:**
OLD uses `myProvider.languageModel("artifact-model")` - an actual provider call that returns a language model instance.

NEW uses `model: "artifact-model"` - a plain string placeholder. The file has a TODO comment: "Replace with actual provider from lib/ai/providers when available".

**Impact:**
Code artifact generation is completely broken. The `streamObject` call will fail because it receives a string instead of a model instance.

**Suggested Fix:**
Import and use the actual provider from `lib/ai/providers.ts` once available, or create a temporary provider import.

---

## [P6-BRK-004] Text Handler Uses Placeholder Model String

**Severity:** Critical
**Status:** Open
**OLD File:** archive/oldapp/artifacts/text/server.ts
**NEW File:** features/artifact/handlers/text.handler.ts
**Line Ref:** L11-L12 (OLD), L63-L64 (NEW)

**Description:**
Same issue as P6-BRK-003. OLD uses `myProvider.languageModel("artifact-model")`, NEW uses `model: "artifact-model"` string placeholder with TODO comment.

**Impact:**
Text artifact generation is completely broken. The `streamText` call will fail.

**Suggested Fix:**
Import and use the actual provider from `lib/ai/providers.ts`.

---

## [P6-BRK-005] Sheet Handler Uses Placeholder Model String

**Severity:** Critical
**Status:** Open
**OLD File:** archive/oldapp/artifacts/sheet/server.ts
**NEW File:** features/artifact/handlers/sheet.handler.ts
**Line Ref:** L13-L14 (OLD), L78-L79 (NEW)

**Description:**
Same issue as P6-BRK-003 and P6-BRK-004. The sheet handler also uses a string placeholder instead of an actual model instance.

**Impact:**
Sheet/CSV artifact generation is completely broken. The `streamObject` call will fail.

**Suggested Fix:**
Import and use the actual provider from `lib/ai/providers.ts`.

---

## [P6-BRK-006] GET Returns Single Artifact Instead of Version Array

**Severity:** Critical
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/document/route.ts
**NEW File:** app/api/artifacts/route.ts
**Line Ref:** L45-52

**Description:**
OLD returns array of all document versions via `documentData.getAll()`. NEW returns single artifact (latest version) via `getArtifact()`. Clients expecting version history array will break.

**Impact:**
Frontend components expecting version history array will receive wrong data structure, breaking version display and rollback UI.

**Suggested Fix:**
Either update GET endpoint to return version array, or create separate `/api/artifacts/versions` endpoint.

---

# Functional Discrepancies (FNC)

## [P6-FNC-001] Missing DELETE Endpoint for Chat Route

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/app/(chat)/api/chat/route.ts`
**NEW File:** `app/api/chat/route.ts`
**Line Ref:** L413-L466 (OLD)

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

---

## [P6-FNC-002] Missing Settings Support in Schema

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/app/(chat)/api/chat/schema.ts`
**NEW File:** `features/chat/schemas/chat.schema.ts`
**Line Ref:** L39-L52 (OLD)

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

---

## [P6-FNC-003] Missing File Part Validation in Schema

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/app/(chat)/api/chat/schema.ts`
**NEW File:** `features/chat/schemas/chat.schema.ts`
**Line Ref:** L15-L22 (OLD)

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

---

## [P6-FNC-004] Missing Geolocation Request Hints

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/app/(chat)/api/chat/route.ts`
**NEW File:** `app/api/chat/route.ts`
**Line Ref:** L165-L172 (OLD)

**Description:**
The OLD route uses `geolocation(request)` from `@vercel/functions` to extract:
- longitude, latitude
- city, country

These are passed as `requestHints` to the AI for location-aware responses.

**Impact:**
AI responses cannot be personalized based on user location. Features like "what's the weather near me" may not work correctly.

**Suggested Fix:**
Import and use `geolocation` from `@vercel/functions` in the chat action, passing location data to the AI execution.

---

## [P6-FNC-005] Missing Background Title Generation

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/app/(chat)/api/chat/route.ts`
**NEW File:** `app/api/chat/route.ts`
**Line Ref:** L189-L213 (OLD)

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

---

## [P6-FNC-006] Missing Tokenlens Model Catalog

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/app/(chat)/api/chat/route.ts`
**NEW File:** `app/api/chat/route.ts`
**Line Ref:** L44-L56, L176 (OLD)

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

---

## [P6-FNC-007] Missing Vercel AI Gateway Error Handling

**Severity:** Low
**Status:** Open
**OLD File:** `archive/oldapp/app/(chat)/api/chat/route.ts`
**NEW File:** `app/api/chat/route.ts`
**Line Ref:** L380-L403 (OLD)

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

---

## [P6-FNC-008] Missing Cursor-Based Pagination

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/app/(chat)/api/chat/[id]/messages/route.ts`
**NEW File:** `app/api/chat/[id]/messages/route.ts`
**Line Ref:** L24-L44, L181-L262 (OLD)

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

---

## [P6-FNC-009] Missing Ownership Verification in Messages Route

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/app/(chat)/api/chat/[id]/messages/route.ts`
**NEW File:** `app/api/chat/[id]/messages/route.ts`
**Line Ref:** L142-L151, L166-L171 (OLD)

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

---

## [P6-FNC-010] Missing Guest User Redis Check

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/app/(chat)/api/chat/[id]/messages/route.ts`
**NEW File:** `app/api/chat/[id]/messages/route.ts`
**Line Ref:** L173-L179 (OLD)

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

---

## [P6-FNC-011] Missing Stream Reconnection Logic

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/app/(chat)/api/chat/[id]/stream/route.ts`
**NEW File:** `app/api/chat/[id]/reconnect/route.ts`
**Line Ref:** L81-L129 (OLD)

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

---

## [P6-FNC-012] Missing Rate Limiting in Reconnect Route

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/app/(chat)/api/chat/[id]/stream/route.ts`
**NEW File:** `app/api/chat/[id]/reconnect/route.ts`
**Line Ref:** L33-L41 (OLD)

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

---

## [P6-FNC-013] Missing Ownership Verification in Reconnect Route

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/app/(chat)/api/chat/[id]/stream/route.ts`
**NEW File:** `app/api/chat/[id]/reconnect/route.ts`
**Line Ref:** L73-L79 (OLD)

**Description:**
The OLD route verifies ownership for private chats before allowing reconnection. The NEW route doesn't.

**Impact:**
Private chat streams may be accessible to non-owners.

**Suggested Fix:**
Add ownership verification in the reconnect route or `getChatAction`.

---

## [P6-FNC-014] Missing Timestamp-Based DELETE for Rollback

**Severity:** High
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/document/route.ts
**NEW File:** app/api/artifacts/route.ts
**Line Ref:** L89-105

**Description:**
OLD supports `DELETE /api/document?id=uuid&timestamp=ISO` to delete versions after timestamp (for rollback). NEW only supports full artifact deletion via `DELETE /api/artifacts?id=uuid`.

**Impact:**
API-based version rollback is no longer available. While `rollbackToVersion()` server action exists, the API endpoint for programmatic rollback is missing.

**Suggested Fix:**
Add timestamp parameter support to DELETE endpoint, or document that rollback is only available via server action.

---

## [P6-FNC-015] Missing Rate Limiting in Artifact Routes

**Severity:** High
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/document/route.ts
**NEW File:** app/api/artifacts/route.ts
**Line Ref:** L1-30

**Description:**
OLD applies rate limiting (`standard` for GET/POST, `strict` for DELETE). NEW has no rate limiting in route - delegates to actions, but actions don't have rate limiting.

**Impact:**
Artifact API is unprotected against abuse. Attackers can flood the endpoint with requests.

**Suggested Fix:**
Add rate limiting to artifact routes using `lib/rate-limit/` module.

---

## [P6-FNC-016] Missing Kind Mismatch Validation

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/document/route.ts
**NEW File:** features/artifact/actions/update-artifact.action.ts
**Line Ref:** L148-153

**Description:**
OLD validates that `kind` matches original document - returns `bad_request:document:kind_mismatch`. NEW has no such validation in `updateArtifact`.

**Impact:**
Artifact type can be changed after creation, potentially breaking type-specific editors and handlers.

**Suggested Fix:**
Add kind validation in `updateArtifact` action to ensure consistency.

---

## [P6-FNC-017] Missing Graceful Degradation for Suggestions

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/artifacts/actions.ts
**NEW File:** features/artifact/actions/suggestions.ts
**Line Ref:** L21-30

**Description:**
OLD `getSuggestions` has try-catch returning `[]` on error. NEW `getSuggestions` throws errors up the chain.

**Impact:**
Suggestion failures will cause unhandled errors instead of gracefully showing empty suggestions.

**Suggested Fix:**
Wrap suggestion fetching in try-catch and return empty array on failure.

---

## [P6-FNC-018] Missing UUID Validation at Route Level

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/document/route.ts
**NEW File:** app/api/artifacts/route.ts
**Line Ref:** L40-50

**Description:**
OLD uses `validateUUIDForRoute(id, "id")` returns 400 for invalid UUIDs. NEW passes string directly to actions without validation.

**Impact:**
Invalid UUIDs will cause database errors instead of clean 400 responses.

**Suggested Fix:**
Add UUID validation at route level or in action layer.

---

## [P6-FNC-019] Missing Ownership Verification at Route Level

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/document/route.ts
**NEW File:** app/api/artifacts/route.ts
**Line Ref:** L55-70

**Description:**
OLD uses `verifyOwnershipForRoute()` to check document belongs to session user. NEW relies on service/repository layer (implementation needs verification).

**Impact:**
Potential security issue if ownership check is not properly implemented in service layer.

**Suggested Fix:**
Verify ownership check exists in `ArtifactService` or add at route level.

---

## [P6-FNC-020] Missing Cache-Control Headers

**Severity:** Low
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/document/route.ts
**NEW File:** app/api/artifacts/route.ts
**Line Ref:** L60-75

**Description:**
OLD returns `Cache-Control: private, max-age=60` for GET responses. NEW has no caching headers.

**Impact:**
Reduced caching efficiency, more repeated requests for unchanged artifacts.

**Suggested Fix:**
Add Cache-Control headers to GET responses.

---

## [P6-FNC-021] Missing Body Validation at Route Level

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/document/route.ts
**NEW File:** app/api/artifacts/route.ts
**Line Ref:** L80-95

**Description:**
OLD uses `documentPostSchema` with content max 1MB, title 1-500 chars. NEW passes raw JSON to action without validation.

**Impact:**
Oversized content or invalid titles will cause database errors instead of clean 400 responses.

**Suggested Fix:**
Add body validation using Zod schema at route or action level.

---

## [P6-FNC-022] PATCH vs POST for Updates

**Severity:** Low
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/document/route.ts
**NEW File:** app/api/artifacts/route.ts
**Line Ref:** L100-120

**Description:**
OLD uses POST for both create and update (determined by whether document exists). NEW uses POST for create, PATCH for update.

**Impact:**
Different HTTP semantics - may affect caching proxies and API clients expecting POST-only pattern.

**Suggested Fix:**
Document the API change, or provide backward-compatible POST endpoint.

---

## [P6-FNC-023] Missing CSRF Protection in Guest POST Route

**Severity:** High
**Status:** Open
**OLD File:** archive/oldapp/app/api/auth/guest/route.ts
**NEW File:** app/api/auth/guest/route.ts
**Line Ref:** L22-L28 (OLD)

**Description:**
OLD validates Origin/Referer headers via `validateOrigin(request)` to prevent CSRF attacks. NEW has no CSRF protection in the POST handler.

**Impact:**
Guest session creation is vulnerable to CSRF attacks. Malicious sites could create guest sessions on behalf of users.

**Suggested Fix:**
Add `validateOrigin(request)` call in the POST handler before processing the request.

---

## [P6-FNC-024] Missing Rate Limiting in Guest Route

**Severity:** High
**Status:** Open
**OLD File:** archive/oldapp/app/api/auth/guest/route.ts
**NEW File:** app/api/auth/guest/route.ts
**Line Ref:** L30-L45 (OLD)

**Description:**
OLD applies IP-based rate limiting using `requireCustomRateLimitForRoute()` with `AUTH_GUEST` limits. NEW has no rate limiting.

**Impact:**
Attackers can flood the guest endpoint to create unlimited guest sessions, potentially exhausting database resources.

**Suggested Fix:**
Add rate limiting using the rate limit module from `lib/rate-limit/`.

---

## [P6-FNC-025] Missing Open Redirect Protection in Guest GET Route

**Severity:** High
**Status:** Open
**OLD File:** archive/oldapp/app/api/auth/guest/route.ts
**NEW File:** app/api/auth/guest/route.ts
**Line Ref:** L108-L162 (OLD)

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

---

## [P6-FNC-026] Missing Rate Limiting in Logout Route

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/app/api/auth/logout/route.ts
**NEW File:** app/api/auth/logout/route.ts
**Line Ref:** L30-L45 (OLD)

**Description:**
OLD applies IP-based rate limiting for logout. NEW has no rate limiting.

**Impact:**
Potential for abuse via repeated logout requests, though impact is limited.

**Suggested Fix:**
Add rate limiting to the logout endpoint.

---

## [P6-FNC-027] Guest Cookie Name Mismatch

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/app/api/auth/logout/route.ts
**NEW File:** app/api/auth/logout/route.ts
**Line Ref:** L14 (OLD), L15 (NEW)

**Description:**
OLD uses `guest_token` as the guest cookie name. NEW uses `guest_id`. This inconsistency could cause issues if both old and new code run in the same environment or during migration.

**Impact:**
Guest sessions may not be properly cleared on logout if the wrong cookie name is used.

**Suggested Fix:**
Verify the correct cookie name is used consistently across all auth-related code. Check `lib/auth/session.ts` for the canonical name.

---

## [P6-FNC-028] Missing Auth Exchange Endpoint

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/app/api/auth/exchange/route.ts
**NEW File:** N/A (uses NextAuth pattern)
**Line Ref:** L1-L97 (OLD)

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

---

## [P6-FNC-029] Missing Rate Limiting in File Upload

**Severity:** High
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/files/upload/route.ts
**NEW File:** app/api/files/upload/route.ts
**Line Ref:** L53-L61 (OLD)

**Description:**
OLD applies rate limiting (5 requests per hour) using `requireRateLimitForRoute("upload", ...)`. NEW has no rate limiting.

**Impact:**
Users can upload unlimited files, potentially exhausting storage and bandwidth resources.

**Suggested Fix:**
Add rate limiting to the file upload endpoint using `lib/rate-limit/`.

---

## [P6-FNC-030] Different File Size Limits

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/files/upload/route.ts
**NEW File:** app/api/files/upload/route.ts
**Line Ref:** L13 (OLD schema), L16 (NEW)

**Description:**
OLD uses `ATTACHMENT_MAX_FILE_SIZE` (5MB) from `lib/files.ts`. NEW uses `MAX_FILE_SIZE` (10MB) defined inline. The limit doubled.

**Impact:**
Larger files may cause issues if the application isn't designed for 10MB uploads. May also increase storage costs.

**Suggested Fix:**
Verify 10MB is the intended limit. Consider centralizing the constant in `lib/files.ts` for consistency.

---

## [P6-FNC-031] Reduced MIME Type Support

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/files/upload/route.ts, archive/oldapp/lib/files.ts
**NEW File:** app/api/files/upload/route.ts
**Line Ref:** L3-L21 (OLD lib/files.ts), L18-L27 (NEW)

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

---

## [P6-FNC-032] Missing Rate Limiting in History Route

**Severity:** High
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/history/route.ts
**NEW File:** app/api/history/route.ts
**Line Ref:** L45-L53 (OLD GET), L86-L95 (OLD DELETE)

**Description:**
OLD applies rate limiting:
- GET: `standard` limiter (100 req/min)
- DELETE: `strict` limiter (10 req/min)

NEW has no rate limiting in either handler.

**Impact:**
History endpoint vulnerable to abuse. DELETE endpoint especially needs protection against mass deletion attempts.

**Suggested Fix:**
Add rate limiting to both GET and DELETE handlers.

---

## [P6-FNC-033] Missing Conflicting Pagination Params Validation

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/history/route.ts
**NEW File:** app/api/history/route.ts
**Line Ref:** L31-L36 (OLD)

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

---

## [P6-FNC-034] Missing Rate Limiting in Suggestions Route

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/suggestions/route.ts
**NEW File:** app/api/suggestions/route.ts
**Line Ref:** L24-L32 (OLD)

**Description:**
OLD applies rate limiting (`standard` limiter). NEW has no rate limiting.

**Impact:**
Suggestions endpoint vulnerable to abuse.

**Suggested Fix:**
Add rate limiting to the suggestions endpoint.

---

## [P6-FNC-035] Missing Guest User Handling in Suggestions

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/suggestions/route.ts
**NEW File:** app/api/suggestions/route.ts
**Line Ref:** L34-L42 (OLD)

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

---

## [P6-FNC-036] Missing Document Ownership Verification in Suggestions

**Severity:** High
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/suggestions/route.ts
**NEW File:** app/api/suggestions/route.ts
**Line Ref:** L62-L75 (OLD)

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

---

## [P6-FNC-037] Missing UUID Validation in Suggestions Route

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/suggestions/route.ts
**NEW File:** app/api/suggestions/route.ts
**Line Ref:** L56-L60 (OLD)

**Description:**
OLD validates UUID format via `validateUUIDForRoute(documentId, "documentId")`. NEW only checks for presence of `artifactId`.

**Impact:**
Invalid UUIDs will cause database errors instead of clean 400 responses.

**Suggested Fix:**
Add UUID validation for the artifactId parameter.

---

## [P6-FNC-038] Parameter Name Change in Suggestions Route

**Severity:** Low
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/suggestions/route.ts
**NEW File:** app/api/suggestions/route.ts
**Line Ref:** L47-L54 (OLD), L22 (NEW)

**Description:**
OLD uses `documentId` query parameter. NEW uses `artifactId`. This is a breaking change for API consumers.

**Impact:**
Existing API clients using `documentId` will fail.

**Suggested Fix:**
Document the API change, or support both parameter names for backward compatibility.

---

## [P6-FNC-039] Missing Cache-Control Headers in Suggestions

**Severity:** Low
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/suggestions/route.ts
**NEW File:** app/api/suggestions/route.ts
**Line Ref:** L36-L42, L68-L75, L84-L98 (OLD)

**Description:**
OLD returns `Cache-Control: private, max-age=300` headers. NEW has no caching headers.

**Impact:**
Reduced caching efficiency, more repeated requests.

**Suggested Fix:**
Add Cache-Control headers to suggestions responses.

---

## [P6-FNC-040] HTTP Method Change for Voting

**Severity:** High
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/vote/route.ts
**NEW File:** app/api/votes/route.ts
**Line Ref:** L18 (OLD PATCH), L60 (NEW POST)

**Description:**
OLD uses PATCH method for voting. NEW uses POST method. This is a breaking change for API consumers.

**Impact:**
Existing API clients using PATCH will fail. The route path also changed from `/api/vote` to `/api/votes`.

**Suggested Fix:**
Document the API change, or support both PATCH and POST for backward compatibility.

---

## [P6-FNC-041] Missing Rate Limiting in Votes Route

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/vote/route.ts
**NEW File:** app/api/votes/route.ts
**Line Ref:** L37-L45 (OLD)

**Description:**
OLD applies rate limiting (`standard` limiter). NEW has no rate limiting.

**Impact:**
Votes endpoint vulnerable to abuse - users could spam votes.

**Suggested Fix:**
Add rate limiting to both GET and POST handlers.

---

## [P6-FNC-042] Missing Guest User Check in Votes

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/vote/route.ts
**NEW File:** app/api/votes/route.ts
**Line Ref:** L47-L51 (OLD)

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

---

## [P6-FNC-043] Missing Chat Ownership Verification in Votes

**Severity:** High
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/vote/route.ts
**NEW File:** app/api/votes/route.ts
**Line Ref:** L53-L68 (OLD)

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

---

## [P6-FNC-044] Missing Message Existence Verification in Votes

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/api/vote/route.ts
**NEW File:** app/api/votes/route.ts
**Line Ref:** L70-L81 (OLD)

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

---

## [P6-FNC-045] Missing deleteTrailingMessages Action

**Severity:** High
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/actions.ts
**NEW File:** features/chat/actions/
**Line Ref:** L54-L84 (OLD)

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

---

## [P6-FNC-046] Missing updateChatVisibility Action

**Severity:** High
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/actions.ts
**NEW File:** features/chat/actions/
**Line Ref:** L86-L122 (OLD)

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

---

## [P6-FNC-047] Different Title Generation Signature

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/app/(chat)/actions.ts
**NEW File:** features/chat/actions/update-title.action.ts
**Line Ref:** L31-L52 (OLD), L123-L201 (NEW)

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

---

## [P6-FNC-048] Missing Centralized AI Prompts in Code Handler

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/artifacts/code/server.ts
**NEW File:** features/artifact/handlers/code.handler.ts
**Line Ref:** L5 (OLD), L24-L31 (NEW)

**Description:**
OLD imports `codePrompt` and `updateDocumentPrompt` from `@/lib/ai/prompts` - centralized, maintainable prompts.

NEW defines prompts inline as `CODE_CREATE_SYSTEM_PROMPT` and `getUpdateSystemPrompt()`. This duplicates prompt logic and makes it harder to maintain consistency.

**Impact:**
Prompt changes need to be made in multiple places. Inconsistent prompt behavior between handlers and other AI operations.

**Suggested Fix:**
Move prompts to `lib/ai/prompts.ts` and import them in the handlers, matching the OLD pattern.

---

## [P6-FNC-049] Missing Centralized AI Prompts in Text Handler

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/artifacts/text/server.ts
**NEW File:** features/artifact/handlers/text.handler.ts
**Line Ref:** L5 (OLD), L16-L17, L24-L31 (NEW)

**Description:**
OLD imports `updateDocumentPrompt` from `@/lib/ai/prompts`. NEW defines prompts inline.

**Impact:**
Same as P6-FNC-048 - prompt maintenance becomes harder.

**Suggested Fix:**
Use centralized prompts from `lib/ai/prompts.ts`.

---

## [P6-FNC-050] Missing Centralized AI Prompts in Sheet Handler

**Severity:** Medium
**Status:** Open
**OLD File:** archive/oldapp/artifacts/sheet/server.ts
**NEW File:** features/artifact/handlers/sheet.handler.ts
**Line Ref:** L5 (OLD), L24-L31, L38-L47 (NEW)

**Description:**
OLD imports `sheetPrompt` and `updateDocumentPrompt` from `@/lib/ai/prompts`. NEW defines prompts inline.

**Impact:**
Same as P6-FNC-048 - prompt maintenance becomes harder.

**Suggested Fix:**
Use centralized prompts from `lib/ai/prompts.ts`.

---

# Improvement Only (IMP)

## [P6-IMP-001] New GET Endpoint for Votes

**Severity:** Low
**Status:** Open
**OLD File:** N/A
**NEW File:** app/api/votes/route.ts
**Line Ref:** L29-L54 (NEW)

**Description:**
NEW adds a GET endpoint to retrieve votes by chatId. This is new functionality not present in OLD.

**Impact:**
This is an enhancement, not an issue. The GET endpoint allows fetching existing votes for a chat.

**Suggested Fix:**
No fix needed - this is additional functionality. Consider documenting the new endpoint.

---

## [P6-IMP-002] Missing createDocumentHandler Factory Import

**Severity:** Low
**Status:** Open
**OLD File:** archive/oldapp/artifacts/code/server.ts, text/server.ts, sheet/server.ts
**NEW File:** features/artifact/handlers/base.handler.ts
**Line Ref:** L6 (OLD), L12 (NEW code.handler.ts)

**Description:**
OLD uses `createDocumentHandler<"code">()` factory function from `@/lib/artifacts/server`. NEW uses `createArtifactHandler()` from `./base.handler.ts`.

This is an architectural refactoring - the NEW approach uses a class-based handler pattern while OLD used a factory function. The functionality is preserved, but the import path and pattern changed.

**Impact:**
No functional impact - this is acceptable architectural refactoring.

**Suggested Fix:**
No fix needed - document the architectural change.

---

## [P6-IMP-003] Missing Image Handler in OLD

**Severity:** Low
**Status:** Open
**OLD File:** N/A
**NEW File:** features/artifact/handlers/image.handler.ts
**Line Ref:** L1-L60 (NEW)

**Description:**
NEW has an `image.handler.ts` for image artifacts that OLD doesn't have. This is new functionality, not a migration issue.

**Impact:**
This is an enhancement - image artifacts are now supported.

**Suggested Fix:**
No fix needed - this is additional functionality.

---

---

## Running Count

### Total Issues: 60

### By Category

| Category | Count |
|----------|-------|
| UI Inconsistencies (UI) | 0 |
| Bugs (BUG) | 1 |
| Broken Code (BRK) | 6 |
| Functional Discrepancies (FNC) | 50 |
| Improvement Only (IMP) | 3 |

### By Severity

| Severity | Count |
|----------|-------|
| Critical | 6 |
| High | 17 |
| Medium | 27 |
| Low | 10 |

---

## Summary Table

| Issue ID | Category | Severity | Description | Status |
|----------|----------|----------|-------------|--------|
| P6-BUG-001 | BUG | Medium | Incomplete rejectSuggestion implementation | Open |
| P6-BRK-001 | BRK | Critical | Missing AI execution in chat POST | Open |
| P6-BRK-002 | BRK | Critical | Missing streaming response in chat POST | Open |
| P6-BRK-003 | BRK | Critical | Code handler placeholder model string | Open |
| P6-BRK-004 | BRK | Critical | Text handler placeholder model string | Open |
| P6-BRK-005 | BRK | Critical | Sheet handler placeholder model string | Open |
| P6-BRK-006 | BRK | Critical | GET returns single artifact not version array | Open |
| P6-FNC-001 | FNC | High | Missing DELETE endpoint for chat | Open |
| P6-FNC-002 | FNC | High | Missing settings support in schema | Open |
| P6-FNC-003 | FNC | High | Missing file part validation in schema | Open |
| P6-FNC-004 | FNC | Medium | Missing geolocation request hints | Open |
| P6-FNC-005 | FNC | Medium | Missing background title generation | Open |
| P6-FNC-006 | FNC | Medium | Missing Tokenlens model catalog | Open |
| P6-FNC-007 | FNC | Low | Missing Gateway error handling | Open |
| P6-FNC-008 | FNC | High | Missing cursor-based pagination | Open |
| P6-FNC-009 | FNC | Medium | Missing ownership verification (messages) | Open |
| P6-FNC-010 | FNC | Medium | Missing guest user Redis check | Open |
| P6-FNC-011 | FNC | High | Missing stream reconnection logic | Open |
| P6-FNC-012 | FNC | Medium | Missing rate limiting (reconnect) | Open |
| P6-FNC-013 | FNC | Medium | Missing ownership verification (reconnect) | Open |
| P6-FNC-014 | FNC | High | Missing timestamp-based DELETE for rollback | Open |
| P6-FNC-015 | FNC | High | Missing rate limiting in artifact routes | Open |
| P6-FNC-016 | FNC | Medium | Missing kind mismatch validation | Open |
| P6-FNC-017 | FNC | Medium | Missing graceful degradation for suggestions | Open |
| P6-FNC-018 | FNC | Medium | Missing UUID validation at route level | Open |
| P6-FNC-019 | FNC | Medium | Missing ownership verification at route level | Open |
| P6-FNC-020 | FNC | Low | Missing Cache-Control headers | Open |
| P6-FNC-021 | FNC | Medium | Missing body validation at route level | Open |
| P6-FNC-022 | FNC | Low | PATCH vs POST for updates | Open |
| P6-FNC-023 | FNC | High | Missing CSRF protection in guest POST | Open |
| P6-FNC-024 | FNC | High | Missing rate limiting in guest route | Open |
| P6-FNC-025 | FNC | High | Missing open redirect protection | Open |
| P6-FNC-026 | FNC | Medium | Missing rate limiting in logout route | Open |
| P6-FNC-027 | FNC | Medium | Guest cookie name mismatch | Open |
| P6-FNC-028 | FNC | Medium | Missing auth exchange endpoint | Open |
| P6-FNC-029 | FNC | High | Missing rate limiting in file upload | Open |
| P6-FNC-030 | FNC | Medium | Different file size limits | Open |
| P6-FNC-031 | FNC | Medium | Reduced MIME type support | Open |
| P6-FNC-032 | FNC | High | Missing rate limiting in history route | Open |
| P6-FNC-033 | FNC | Medium | Missing conflicting pagination params validation | Open |
| P6-FNC-034 | FNC | Medium | Missing rate limiting in suggestions route | Open |
| P6-FNC-035 | FNC | Medium | Missing guest user handling in suggestions | Open |
| P6-FNC-036 | FNC | High | Missing document ownership verification | Open |
| P6-FNC-037 | FNC | Medium | Missing UUID validation in suggestions | Open |
| P6-FNC-038 | FNC | Low | Parameter name change in suggestions | Open |
| P6-FNC-039 | FNC | Low | Missing Cache-Control headers in suggestions | Open |
| P6-FNC-040 | FNC | High | HTTP method change for voting | Open |
| P6-FNC-041 | FNC | Medium | Missing rate limiting in votes route | Open |
| P6-FNC-042 | FNC | Medium | Missing guest user check in votes | Open |
| P6-FNC-043 | FNC | High | Missing chat ownership verification in votes | Open |
| P6-FNC-044 | FNC | Medium | Missing message existence verification | Open |
| P6-FNC-045 | FNC | High | Missing deleteTrailingMessages action | Open |
| P6-FNC-046 | FNC | High | Missing updateChatVisibility action | Open |
| P6-FNC-047 | FNC | Medium | Different title generation signature | Open |
| P6-FNC-048 | FNC | Medium | Missing centralized AI prompts (code) | Open |
| P6-FNC-049 | FNC | Medium | Missing centralized AI prompts (text) | Open |
| P6-FNC-050 | FNC | Medium | Missing centralized AI prompts (sheet) | Open |
| P6-IMP-001 | IMP | Low | New GET endpoint for votes | Open |
| P6-IMP-002 | IMP | Low | Missing createDocumentHandler factory import | Open |
| P6-IMP-003 | IMP | Low | Missing image handler in OLD (enhancement) | Open |
