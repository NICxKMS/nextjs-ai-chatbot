# API Contracts

> **Updated per redesign audit (2026-03-01)**

## Route Inventory

All routes are under `app/(chat)/api/` or `app/api/`.

**Route Handlers** (retained): `POST /api/chat`, `GET /api/history`, `GET/POST /api/artifact`, `GET /api/suggestions`, `POST /api/files/upload`, `GET /api/health`.

**Server Actions** (mutations): `deleteChat`, `deleteAllChats`, `voteOnMessage`, `updateChatVisibility`, `deleteTrailingMessages`, `loginAction`, `registerAction`, `logoutAction`, `exchangeTokenAction`.

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
    sampling?: {
      temperature?: number;
      topP?: number;
      maxOutputTokens?: number;
    };
    systemPrompt?: string;
    enableReasoning?: boolean;
    reasoningBudget?: number;
    streamArtifacts?: boolean;
    autoScroll?: boolean;
    selectedModelId?: string;
  };
}
```

### Response
SSE stream (`Content-Type: text/event-stream`). Uses Vercel AI SDK `UIMessageStream` protocol.

### Validation Steps
1. Parse body with Zod schema
2. `getAppSession()` → user session
3. Resolve model from registry; check model exists
4. If guest: verify Redis is available
5. Rate limit check (50 req/min per user)
6. Daily quota check (20 guest / 100 auth)
7. If existing chat: verify ownership + no model mismatch warning
8. Build system prompt, configure tools, stream response

### Side Effects
- Creates chat record (DB + cache) if new; `revalidateTag('chats:{userId}')`
- Creates message records (user message saved before streaming, assistant after)
- Increments daily message quota counter
- Updates chat title (async) via `chat-title` stream part (single-channel)
- Updates chat `lastContext` with usage data

### Error Responses
| Error | Code | Status |
|-------|------|--------|
| Invalid body | `bad_request:api:invalid_request_body` | 400 |
| Not authenticated | `unauthorized:chat:auth_required` | 401 |
| Invalid model | `bad_request:api:invalid_model_id` | 400 |
| Guest without Redis | `bad_request:api:guest_requires_cache` | 400 |
| Rate limited | `rate_limit:chat:*` | 429 |
| Chat owner mismatch | `forbidden:chat:owner_mismatch` | 403 |

---

## ~~DELETE `/api/chat/[id]`~~ → Server Action `deleteChat(chatId)`

> *Replaced by Server Action `deleteChat()`. Enables `updateTag('chats:{userId}')` + `useOptimistic` pattern. Returns `ActionResult<void>`.*

### Auth
Required, non-guest.

### Request
Path param: `id` (UUID)

### Validation
1. Auth check (non-guest)
2. UUID validation
3. Chat ownership verification (query chat, compare userId)

### Side Effects
- Deletes chat from DB
- Removes from cache (meta + messages + user's ZSET entry)
- `revalidateTag('chats:{userId}')`

### Response
`204 No Content` on success

### Errors
| Error | Code | Status |
|-------|------|--------|
| Unauthorized | `unauthorized:chat:auth_required` | 401 |
| Invalid ID | `bad_request:chat:invalid_id` | 400 |
| Not found | `not_found:chat:not_found` | 404 |
| Not owner | `forbidden:chat:owner_mismatch` | 403 |

---

## GET `/api/history` — List Chats

### Auth
Required (guest or authenticated).

### Query Parameters
| Param | Type | Default | Constraints |
|-------|------|---------|-------------|
| `limit` | number | 10 | 1–100 |
| `starting_after` | string | — | UUID cursor |
| `ending_before` | string | — | UUID cursor |

### Response Shape
```typescript
{
  chats: Chat[];    // Array of chat objects (id, title, visibility, createdAt, etc.)
  hasMore: boolean; // Whether more pages exist
}
```

### Cache Headers
`Cache-Control: private, max-age=0, s-maxage=10, stale-while-revalidate=30`

### Behavior
- **Guest**: Reads from cache ZSET, batch MGET for metadata
- **Auth**: DB query with cursor pagination, ordered by `createdAt DESC`

---

## ~~DELETE `/api/history`~~ → Server Action `deleteAllChats()`

> *Replaced by Server Action `deleteAllChats()`. Rate limited (strict: 10/min). Returns `ActionResult<void>`.*

### Auth
Required. Rate limited (strict: 10/min).

### Response
`204 No Content`

### Side Effects
- Deletes all chats for user from DB
- Clears all cache entries (per-chat meta + messages + user ZSET)
- `revalidateTag('chats:{userId}')` *(cache invalidation)*

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
Artifact[]  // Array of artifact versions, ordered by createdAt
// Each: { id, createdAt, title, content, kind, userId, chatId }
```

### Behavior
Cache-first. Artifact versions returned as array (latest = last element).

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
- `revalidateTag('artifact:{id}')`

---

## ~~DELETE `/api/document`~~ → managed via artifact version history

> *Version deletion may be handled by Server Action `deleteArtifactVersion()` instead of Route Handler. Same validation: auth required, non-guest.*

### Query Parameters
| Param | Type | Required |
|-------|------|----------|
| `id` | string (UUID) | Yes |
| `timestamp` | string (ISO 8601) | Yes |

### Side Effects
Deletes specific version from DB and cache. `revalidateTag('artifact:{id}')`.

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
{
  success: true;
  messageId: string;
  type: "up" | "down";
}
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
None (public endpoint, skips edge rate limiting).

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
    environment: {
      status: "healthy" | "unhealthy";
      missing?: string[];
    };
  };
}
```

### Logic
- `healthy`: all checks pass, latency < 1000ms
- `degraded`: all pass but latency > 1000ms
- `unhealthy`: any check fails

---

## ~~POST `/api/auth/exchange`~~ → Server Action `exchangeTokenAction()`

> *Replaced by Server Action. Same validation logic, but returns `ActionResult<{ user }>` and sets cookie server-side. `proxy.ts` handles guest session creation.*

### Auth
None (this *creates* the session).

### Request
```typescript
{
  accessToken: string;  // Supabase JWT
}
```

### Response
```typescript
{ user: { id: string; email: string } }
```

### Side Effects
- Validates JWT (SUPABASE_JWT_SECRET, audience=authenticated, issuer)
- Sets `sb_token` httpOnly cookie (7-day TTL, secure, sameSite=lax)
- Returns user data from JWT claims

### Errors
| Error | Code | Status |
|-------|------|--------|
| Missing token | `unauthorized:auth:token_missing` | 401 |
| Invalid JWT | `unauthorized:auth:invalid_token` | 401 |
