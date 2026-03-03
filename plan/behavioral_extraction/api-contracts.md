# API Contracts

> **Updated per redesign audit (2026-03-01)**

> Path notation is normalized to target rebuild routes (`app/api/**`). Equivalent oldapp source paths are mapped during extraction.

## Route Inventory

All route handlers follow `app/api/**/route.ts`.

**Route Handlers** (retained): `POST /api/chat`, `GET /api/history`, `GET/POST /api/artifact`, `GET /api/suggestions`, `POST /api/files/upload`, `GET /api/health`.

**Server Actions** (mutations): `deleteChat`, `deleteAllChats`, `renameChat`, `voteOnMessage`, `updateChatVisibility`, `deleteTrailingMessages`, `login`, `register`, `logout`.

### `ActionResult<T>` Return Type

All Server Actions return `ActionResult<T>` instead of throwing HTTP errors:

```typescript
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }
```

### Server Action vs Route Handler Decision

| Criterion | Choice |
|-----------|--------|
| SSE stream or file upload | Route Handler |
| Paginated GET consumed by SWR | Route Handler |
| Public non-auth endpoint | Route Handler |
| User-triggered mutation | Server Action (`updateTag` works) |
| Form submission | Server Action (`useActionState`) |

---

## POST `/api/chat` — Send Chat Message

### Auth
Required (guest or authenticated). Rate limited.

### Request Schema (`postRequestBodySchema`)
```typescript
{
  id: string;                     // UUID of the chat
  message: {
    id: string;                   // UUID of the message
    role: "user";
    parts: Array<
      | { type: "text"; text: string }
      | { type: "file"; mediaType: string; name: string; url: string }
    >;
    createdAt?: string;
  };
  selectedChatModel: string;      // Provider-qualified model ID (e.g., "google:gemini-2.5-flash")
  selectedVisibilityType: "public" | "private";
  settings?: {
    temperature: number;
    topP: number;
    maxOutputTokens: number;
    systemPrompt: string;
    enableReasoning: boolean;
  }; // Matches SettingsState in lib/types/settings.types.ts
  // Settings limited to: temperature, topP, maxOutputTokens, systemPrompt, enableReasoning.
  // Model selection via `chat-model` cookie.
}
```

### Response
SSE stream (`Content-Type: text/event-stream`). Uses Vercel AI SDK `UIMessageStream` protocol.

### Validation Steps
1. Parse body with Zod schema
2. `getAppSession()` → user session
3. Resolve model from registry; check model exists
4. Rate limit check (50 req/min per user)
5. If existing chat: verify ownership + no model mismatch warning
6. Build system prompt, configure tools, stream response

### Side Effects
- Creates chat record (DB) if new; `revalidateTag('chats:{userId}', 'max')` refreshes framework cache <!-- wave4: CONF-038 — clarified "DB + cache" → "DB"; cache = Next.js framework cache via revalidateTag, not Redis -->
- Creates message records (user message saved before streaming, assistant after)
- Updates chat title (async) via `chat-title` stream part (single-channel)
- Persists chat `model` column with the selected model ID (e.g. `google:gemini-2.5-flash`)
<!-- C2-W4: C2X-004 fix -->

### Error Responses
Pre-stream validation/auth failures are thrown as `AppError` instances with these codes and serialized via `AppError.toResponse()` as:

```typescript
{ error: { code: string; message: string; status: number } }
```

| Error | Code | Status |
|-------|------|--------|
| Invalid body | `bad_request:api:invalid_request_body` | 400 |
| Not authenticated | `unauthorized:chat:auth_required` | 401 |
| Invalid model | `bad_request:chat:invalid_model_id` | 400 |
| Rate limited | `rate_limit:chat:*` | 429 |
| Chat owner mismatch | `forbidden:chat:owner_mismatch` | 403 |
<!-- C2-W4: C2X-006 fix -->

---

## ~~DELETE `/api/chat/[id]`~~ → Server Action `deleteChat({ chatId })`

> *Replaced by Server Action `deleteChat()`. Enables `updateTag('chats:{userId}')` + `useOptimistic` pattern. Returns `ActionResult<void>`.*

### Auth
Required (guest sessions allowed with ownership checks).

### Input
`{ chatId: string }` (UUID, Zod validated)

### Validation
1. Auth check (authenticated or guest session)
2. UUID validation
3. Chat ownership verification (query chat, compare userId)

### Side Effects
- Deletes chat from DB, `updateTag('chats:{userId}')` <!-- wave4: CONF-018 — removed stale Redis ZSET reference; no Redis cache keys for chat data -->

### Response
`ActionResult<void>` on success/failure envelope

### Errors
| Error | Code | Status |
|-------|------|--------|
| Unauthorized | `unauthorized:chat:auth_required` | 401 |
| Invalid ID | `bad_request:validation:invalid_input` | 400 |
| Not found | `not_found:chat:chat_not_found` | 404 |
| Not owner | `forbidden:chat:owner_mismatch` | 403 |
<!-- C2-W4: C2X-006 fix -->

> **Current behavior (post-redesign):** `deleteChat` and `deleteAllChats` are Server Actions returning `ActionResult<void>`. They call `updateTag('chats:{userId}')` for immediate invalidation (not `revalidateTag`). See `architecture/patterns.md` revalidation matrix.

---

## Server Action `renameChat({ chatId, title })` <!-- wave4: CONF-041 — added missing dedicated section; matches contracts.md §6 pattern -->

> *Enables inline title editing from sidebar. Returns `ActionResult`.*

### Auth
Required (ownership verified).

### Input
`{ chatId: string, title: string }` (Zod validated)

### Validation
1. Auth check (authenticated or guest session)
2. UUID validation for chatId
3. Title string validation (non-empty, max length)
4. Chat ownership verification

### Side Effects
- Updates chat title in DB
- `updateTag('chat:{chatId}')` + `updateTag('chats:{userId}')`

### Response
`ActionResult` on success/failure envelope

### Errors
| Error | Code | Status |
|-------|------|--------|
| Unauthorized | `unauthorized:chat:auth_required` | 401 |
| Invalid ID | `bad_request:validation:invalid_input` | 400 |
| Not found | `not_found:chat:chat_not_found` | 404 |
| Not owner | `forbidden:chat:owner_mismatch` | 403 |
<!-- C2-W4: C2X-006 fix -->

---

## GET `/api/history` — List Chats

### Auth
Required (guest or authenticated).

### Query Parameters
| Param | Type | Default | Constraints |
|-------|------|---------|-------------|
| `limit` | number | 20 | 1–100 |
| `cursor` | string | — | Opaque pagination cursor |

### Response Shape
```typescript
{
  chats: Chat[];    // Array of chat objects (id, title, visibility, createdAt, etc.)
  nextCursor?: string;
  hasMore: boolean; // Whether more pages exist
}
```

### Cache Headers
`Cache-Control: private, max-age=0, s-maxage=10, stale-while-revalidate=30`

### Behavior
- DB query with cursor pagination, ordered by `createdAt DESC`
- Guest/auth flows share persistence model; auth context governs filtering/ownership

---

## ~~DELETE `/api/history`~~ → Server Action `deleteAllChats()`

> *Replaced by Server Action `deleteAllChats()`. Rate limited (strict: 10/min). Returns `ActionResult<void>`.*

### Auth
Required. Rate limited (strict: 10/min).

### Response
`ActionResult<void>`

### Side Effects
- Deletes all user data from DB, `updateTag('chats:{userId}')` <!-- wave4: CONF-018 — removed stale Redis ZSET reference; no Redis cache keys for chat data -->

> **Current behavior (post-redesign):** `deleteChat` and `deleteAllChats` are Server Actions returning `ActionResult<void>`. They call `updateTag('chats:{userId}')` for immediate invalidation (not `revalidateTag`). See `architecture/patterns.md` revalidation matrix.

---

## GET `/api/artifact` — Get Artifact Versions

### Auth
Required.

### Query Parameters
| Param | Type | Required |
|-------|------|----------|
| `id` | string (UUID) | Yes |

### Response
```typescript
Artifact[]  // ordered by createdAt
```

### Behavior
Cache-first. Artifact versions returned as array ordered by `createdAt DESC` (latest = first element).

---

## POST `/api/artifact` — Save Artifact Version

### Auth
Required.

### Request
Query: `?id=uuid`
Body:
```typescript
{
  title: string;
  content: string;
  kind: "text" | "code" | "image" | "sheet";
}
```

### Side Effects
- Creates new artifact version row (same `id`, new `createdAt`)
- Updates cache
- `revalidateTag('artifact:{id}', 'max')`

### Response
```typescript
{ artifact: Artifact }
```

---

## ~~DELETE `/api/document`~~ → handled by `POST /api/artifact` restore mode

> *User-triggered version restore is modeled through `POST /api/artifact` with restore payload (`{ id, timestamp, mode: "restore" }`) rather than a DELETE route.*

### Restore Payload
```typescript
{
  id: string;          // artifact id
  timestamp: string;   // ISO 8601 restore target
  mode: "restore";
}
```

### Side Effects
Truncates newer versions after the restore timestamp and revalidates `artifact:{id}`.

### Response
```typescript
{ success: true }
```

---

## ~~PATCH `/api/vote`~~ → Server Action `voteOnMessage()`

> *Replaced by Server Action `voteOnMessage()`. Enables `updateTag('votes:{chatId}')` + `useOptimistic` pattern. Returns `ActionResult<{ messageId, type }>`.*

### Auth
Required, non-guest only.

### Request Schema (`voteSchema`)
```typescript
{
  chatId: string;     // UUID
  messageId: string;  // UUID
  type: "up" | "down";
}
```

### Response
```typescript
ActionResult<{
  messageId: string;
  type: "up" | "down";
}>
```

### Validation Steps
1. Auth check (non-guest — votes require DB persistence)
2. Rate limit (standard: 100/min)
3. Chat ownership check
4. Message-to-chat membership check (IDOR protection)
5. Upsert vote (atomic ON CONFLICT DO UPDATE)

### Errors
| Error | Code | Status |
|-------|------|--------|
| Guest attempt | `forbidden:vote:guest_not_allowed` | 403 |
| Not owner | `forbidden:chat:owner_mismatch` | 403 |
| Message not in chat | `forbidden:vote:message_not_in_chat` | 403 |

---

## GET `/api/suggestions` — Get Artifact Suggestions

### Auth
Required.

### Query Parameters
| Param | Type | Required |
|-------|------|----------|
| `artifactId` | string (UUID) | Yes |

### Response
```typescript
Suggestion[]  // Array of suggestion objects
// Each: { id, artifactId, artifactCreatedAt, originalText, suggestedText, description, isResolved }
```

---

## POST `/api/files/upload` — Upload File Attachment

### Auth
Required. Rate limited (upload: 10/hour).

### Request
`Content-Type: multipart/form-data` with file data.

### Response
```typescript
{
  url: string;       // Vercel Blob URL
  pathname: string;  // File path
  contentType: string;
}
```

---

## GET `/api/health` — Health Check

### Auth
None (public endpoint; proxy applies standard abuse-prevention rate limiting).

### Response
```typescript
{
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;  // ISO 8601
  checks: {
    database: {
      status: "healthy" | "unhealthy";
      latencyMs: number;
      error?: string;
    };
    cache: {
      status: "healthy" | "unhealthy";
      latencyMs: number;
      error?: string;
    };
  };
}
```

### Logic
- `healthy`: all checks pass, latency < 1000ms
- `degraded`: all pass but latency > 1000ms
- `unhealthy`: any check fails

---

## Auth Mutations via Server Actions

Authentication uses Server Actions (`login`, `register`, `logout`) rather than `/api/auth/*` routes.

### Common Behavior
- Inputs validated with Zod schemas
- Supabase auth APIs invoked server-side
- Session cookies (`sb_token`) set/deleted with secure attributes
- Returns `ActionResult<T>` (never throws expected validation/auth failures)
