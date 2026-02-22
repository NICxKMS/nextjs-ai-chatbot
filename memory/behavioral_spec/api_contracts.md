# API Contract Catalog

## Conventions
- Error envelope generally follows `ChatSDKError.toResponse()`:
  - `{ code, message, cause? }` where `cause` omitted in production.
- Error code shape: `type:surface[:reason]`.
- Most protected routes require authenticated session; some permit guest session as "authenticated guest".
- Ownership and resource existence checks are consistently enforced through guard utilities.

## 1) `POST /api/chat`
Purpose: submit user message and receive SSE response stream.

Request body (validated):
- `id`: UUID chat id.
- `message`:
  - `id`: UUID.
  - `role`: `"user"` only.
  - `parts`: array of:
    - text part: `{ type: "text", text: string(1..2000) }`
    - file part: `{ type: "file", mediaType, name, url }` with MIME allow checks.
- `selectedChatModel`: non-empty string, must exist in model registry.
- `selectedVisibilityType`: `"public" | "private"`.
- `settings` optional:
  - sampling: `temperature(0..2)`, `topP(0..1)`, `maxOutputTokens(256..1000000)`.
  - `systemPrompt(max 8192)`.
  - `enableReasoning`, `streamArtifacts`, `autoScroll`.

Guards/constraints:
- session required (guest or regular).
- request rate limit (`chat` limiter).
- daily quota by user type.
- guest requires Redis available.
- ownership enforced when chat already exists.

Response:
- `200` SSE (`JsonToSseTransformStream`) containing standard assistant deltas plus custom data parts (usage/title/artifact signals).

Common errors:
- `bad_request:api:invalid_json`
- `bad_request:api:invalid_model_id`
- `unauthorized:chat:missing_session`
- `rate_limit:chat:too_many_requests`
- `rate_limit:chat:daily_limit_exceeded`
- `forbidden:chat:owner_mismatch`
- `bad_request:api:guest_requires_cache`
- `bad_request:activate_gateway` for specific Vercel gateway billing failure text
- fallback `offline:chat:unhandled`

## 2) `DELETE /api/chat?id=<chatId>`
Purpose: delete one chat.

Query:
- `id` required.

Guards:
- auth required.
- standard rate limit.
- resource exists.
- ownership required.

Response:
- `200` JSON `{ id: <deletedId> }`.

Errors:
- missing id, unauthorized, not found, forbidden owner mismatch, rate-limit.

## 3) `GET /api/chat/[id]/messages`
Purpose: fetch chat messages (legacy full mode and paginated mode).

Path:
- `id` required.

Modes:
- no `cursor` and no `limit` -> returns full legacy shape `{ messages: [...] }`.
- with `cursor` or `limit` -> paginated response:
  - `{ data: [...], pagination: { nextCursor, prevCursor, hasMore } }`.

Query params:
- `cursor`: base64url-encoded ISO timestamp.
- `limit`: positive integer, capped by `MAX_PAGINATION_LIMIT`.
- `direction`: `"forward" | "backward"` (default forward).

Guards:
- auth + standard rate limit.
- ownership for private chats.
- guest pagination requires Redis.

Errors:
- invalid cursor/limit, missing chatId, unauthorized, forbidden, guest cache required.

## 4) `GET /api/chat/[id]/stream`
Purpose: short-window stream restoration endpoint.

Path:
- `id` required.

Guards:
- auth + standard rate limit.
- resource + ownership (private).

Behavior:
- returns empty SSE stream when no recent assistant message or outside recency window.
- returns transient `data-appendMessage` event when resumable.

Errors:
- missing id, not found, unauthorized, forbidden.

## 5) `GET /api/history`
Purpose: list user chats with pagination.

Query:
- `limit` parsed and clamped.
- `starting_after` and `ending_before` mutually exclusive.

Guards:
- auth + standard rate limit.

Response:
- `{ chats: Chat[], hasMore: boolean }` plus cache-control headers.

Errors:
- conflicting pagination params, unauthorized, rate-limit.

## 6) `DELETE /api/history`
Purpose: delete all user chats.

Guards:
- auth + strict rate limit.

Response:
- `{ deletedCount: number }`.

## 7) `GET /api/document?id=<documentId>`
Purpose: retrieve all versions for a document id.

Guards:
- id required + UUID format.
- auth + standard rate limit.
- resource exists + ownership.

Response:
- `200` JSON array of document versions.

Errors:
- missing/invalid id, unauthorized, not found, forbidden.

## 8) `POST /api/document?id=<documentId>`
Purpose: save/create document version through API.

Body schema:
- `content` string (<= 1MB).
- `title` string (1..500).
- `kind` enum (`text|code|image|sheet`) by shared schema.

Guards:
- id required + UUID.
- auth + standard rate limit.
- requires existing document/chat context in current implementation.
- ownership and kind immutability enforced when versions already exist.

Response:
- `200` saved document payload.

Errors:
- `bad_request:document:no_chat_context`
- `bad_request:document:kind_mismatch`
- plus standard auth/validation/ownership errors.

## 9) `DELETE /api/document?id=<id>&timestamp=<iso>`
Purpose: delete versions newer than timestamp.

Guards:
- id + timestamp required and validated.
- auth + strict rate limit.
- resource exists + ownership.

Response:
- array of deleted document versions (regular users), empty for guest cache-only behavior.

## 10) `GET /api/suggestions?documentId=<id>`
Purpose: retrieve suggestions for document.

Guards:
- auth first, then standard rate limit.
- `documentId` required + UUID.
- document ownership checked; not-found returns empty list to avoid disclosure.

Guest behavior:
- returns empty list with `200` (suggestions not persisted for guests).

Response:
- `200` array of suggestions (possibly empty), cache-control private.

## 11) `PATCH /api/vote`
Purpose: set/update vote on a message.

Body schema:
- `chatId`: UUID.
- `messageId`: UUID.
- `type`: `"up" | "down"`.

Guards:
- auth + standard rate limit.
- non-guest required.
- chat exists and owned by requester.
- message must belong to provided chat.

Response:
- `200` `{ success: true, messageId, type }`.

Errors:
- forbidden for guest, not found vote target, ownership mismatch, validation errors.

## 12) `POST /api/files/upload`
Purpose: upload attachment file.

Request:
- multipart form-data with `file`.

Guards:
- auth + upload rate limit.
- storage token required.
- file must pass Blob schema:
  - max 5MB,
  - allowed MIME.

Response:
- `{ url, pathname, contentType, filename }`.

Errors:
- `bad_request:api:storage_not_configured`
- `bad_request:api:no_file_uploaded`
- `bad_request:api:file_too_large`
- `bad_request:api:file_type_unsupported`
- `bad_request:api:upload_failed`

## 13) `GET /api/health`
Purpose: health check for monitoring.

Checks:
- database query latency/status.
- Redis ping status.
- required env vars for auth integration.

Response:
- `{ status, timestamp, checks: { database, cache, environment } }`.
- HTTP `200` for healthy/degraded.
- HTTP `503` for unhealthy.

## 14) `POST /api/auth/guest`
Purpose: obtain/reuse guest session (or return existing regular session).

Guards:
- CSRF origin validation.
- IP custom rate limit.

Response:
- `{ user, isNewSession }`.
- returns existing Supabase session user when present.

Errors:
- `forbidden:auth:csrf`
- `bad_request:auth:guest_unavailable`

## 15) `GET /api/auth/guest?redirectUrl=...`
Purpose: server-side guest session creation for direct navigations and redirect.

Behavior:
- sanitizes redirect target to prevent open redirect.
- if session exists, redirects directly.
- else creates guest session if possible, then redirects.

## 16) `POST /api/auth/exchange`
Purpose: exchange Supabase access token into server cookie auth state.

Body schema:
- `accessToken` string with JWT-like three-part format.

Guards:
- CSRF origin validation.
- IP custom rate limit.
- token verification before cookie write.

Response:
- `{ user }`.

Side effects:
- sets Supabase access token cookie with secure options.
- deletes guest cookie.

## 17) `GET /ping`
Purpose: proxy-level fast-path liveness endpoint used by Playwright/operational checks.

Behavior:
- handled directly in `proxy.ts` (before route-handler delegation).
- returns plain-text `pong` with HTTP `200`.
- bypasses guest-session bootstrap and downstream route logic.

Operational note:
- this endpoint is distinct from `GET /api/health`; it validates edge/proxy path liveness, not component health semantics.

## 18) `POST /api/auth/logout`
Purpose: clear auth-related cookies.

Guards:
- CSRF origin validation.
- IP custom rate limit.

Response:
- `{ success: true, message }`.

Side effects:
- deletes Supabase access token cookie and guest cookie.
