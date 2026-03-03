# Edge Cases & Error Handling

> **Updated per redesign audit (2026-03-01)**

## Error System Architecture

### `AppError` (`lib/errors/app-error.ts`)

Structured error class with coded error types for route handlers (including `POST /api/chat`):

```typescript
class AppError extends Error {
  code: string;    // e.g., "bad_request:chat:invalid_model_id"
  status: number;  // HTTP status code

  toResponse(): Response    // Converts to HTTP Response.json({ error: { code, message, status } }, { status })
}
```

### Error Code Structure
<!-- C2-W4-FIXUP: ErrorCode drift fix -->
Format: `{type}:{surface}:{detail}`

**Types**: `bad_request` (400), `unauthorized` (401), `forbidden` (403), `not_found` (404), `rate_limit` (429), `offline` (503)

**Surfaces**: `chat`, `auth`, `api`, `stream`, `database`, `history`, `vote`, `artifact`, `suggestions`, `ui`

> *`document` error surface renamed to `artifact`. `activate_gateway` surface removed (no credit/gateway logic). Server Actions return `ActionResult<T>` instead of throwing route-style errors.*

**Usage by surface:**
- **Route handlers (e.g., `POST /api/chat`)** throw `AppError` with codes from `lib/errors/codes.ts` and serialize pre-stream failures via `AppError.toResponse()` as `{ error: { code, message, status } }`.
- **Server Actions (including chat mutations)** return `ActionResult<T>` and surface `{ success: false, error: { code, message } }` with the same codes.
- **In-stream chat failures** are emitted as `ChatStream` data parts of type `"error"` containing user-facing text only (no JSON error envelope in the stream).

### Visibility Rules
Each surface has a visibility setting controlling how errors are exposed:
- **response**: Error details included in HTTP response body (for user-facing errors)
- **log**: Error logged server-side only, generic message to client
- **none**: Suppressed entirely

---

## Error Boundaries

### Global Error Boundary (`app/global-error.tsx`)
- Catches unhandled errors at the root layout level
- Renders a full-page error UI
- Provides "Try Again" button (triggers `reset()`)
- Reports error to instrumentation (if configured)

### Chat Error (`app/(chat)/error.tsx`)
- Catches errors in the chat route group
- Shows error message with "Return to Home" link
- Preserves layout shell (sidebar, header)

### Artifact Error Boundary (`components/artifact-error-boundary.tsx`)
- Wraps artifact panel content
- Catches editor rendering errors (TipTap, CodeMirror, react-data-grid)
- Shows "Something went wrong" with retry button
- Prevents artifact errors from crashing the chat

---

## Loading States

### Chat Page Loading (PPR + Suspense)
- PPR renders static shell immediately; `<Suspense>` boundaries wrap async data sections
- Skeleton fallbacks provided per Suspense boundary (e.g., `<ChatSkeleton />`)
- No route-level `loading.tsx` — cleanup-inventory §3 #23 prescribes PPR + Suspense

### Sidebar Skeleton (`components/sidebar-skeleton.tsx`)
- Placeholder bars for chat history items
- Animated pulse effect
- Displayed while `GET /api/history` is in flight

### Artifact Skeleton (`components/artifact-skeleton.tsx`)
- Placeholder bars for artifact content area
- Shows while artifact is being fetched or generated

### Artifact Streaming
- During `status: "streaming"`:
  - Text: Content appears character-by-character
  - Code/Sheet: Full content replaced on each delta (may flash)
  - Shows "Generating..." placeholder before first delta
- Spinner/progress indicator in artifact header

### Message Streaming
- Streaming indicator (animated dots or similar)
- `status` from useChat: `"submitted"` → `"streaming"` → `"ready"`
- Partial content rendered as it arrives
- Reasoning blocks show thinking process in real-time (collapsible)

---

## Empty States

### New Chat (`components/greeting.tsx`)
- Welcome message displayed when no messages exist
- Suggested actions (quick-start prompts)
- Model selector visible and prominent

### Empty Sidebar
- "No chats yet" message when history is empty

### No Suggestions
- Suggestions panel hidden when no suggestions exist for an artifact

---

## Network Error Handling

### Chat Request Failures
```typescript
onError: (error: Error) => {
  // Parse AppError-based ErrorResponse from failed /api/chat HTTP responses (pre-stream)
  // Show toast with user-friendly message
  // If rate_limit → show specific "rate limited" message
  // If offline or stream interruption → show "connection lost" message
  // In-stream failures surface as ChatStream parts of type "error" with user-facing text only
}
```

### AbortController Usage
- Chat requests: custom `AbortController` per request
- File uploads: `AbortController` for cancellation
- Server-side: `AbortSignal.timeout(55_000)` for AI completions
- User can click "Stop" button → aborts current stream

### Partial Response Save on Abort
When the user navigates away or explicitly aborts a streaming response, the server's abort handler saves any accumulated partial assistant response to prevent message loss:
```
if (accumulatedContent.length > 0) await savePartialMessage(...)
```
This ensures that even interrupted responses are persisted and visible on reload.

### Fetch Retry
- No automatic retry on failure
- User can click "Reload" button to retry last message
- `reload()` from useChat re-sends the last user message

---

## Rate Limiting Behavior

### Edge Rate Limiting
- Applied at proxy/middleware level
- 100 requests/minute per user
- Returns `429 Too Many Requests` with `Retry-After` header
- Skips `/api/health` endpoint

### Application Rate Limiting
| Limiter | Limit | Error Code |
|---------|-------|------------|
| `chat` | 50/min | `rate_limit:chat:too_many_requests` |
| `standard` | 100/min | `rate_limit:api:too_many_requests` |
| `strict` | 10/min | `rate_limit:api:too_many_requests` |
| `upload` | 10/hour | `rate_limit:api:too_many_requests` |

### Daily Message Limits
| User Type | Limit | Error Code |
|-----------|-------|------------|
| Guest | 20/day | `rate_limit:chat:daily_limit_exceeded` |
| Authenticated | 100/day | `rate_limit:chat:daily_limit_exceeded` |

> *Daily message limits are abuse-prevention controls, not credit/entitlement billing.*

Tracked via Redis counter with daily TTL. Checked before processing, incremented after successful save.

---

<!-- wave4-cleanup: Redis is used for rate-limiting only, not as a general cache layer. Circuit breaker applies to Redis rate-limit checks. -->
## Redis (Rate-Limit) Failure Modes

### Circuit Breaker Pattern
```
Normal → 5 consecutive failures → Circuit OPEN (30s)
  │                                    │
  │                                    └── All rate-limit ops return allow (fail-open)
  │                                    └── Rate limits temporarily unenforced
  │
  └── After 30s → Circuit HALF-OPEN → next success → CLOSED
```

### Guest Session Resilience
- Guest sessions are cookie-backed via `proxy.ts` and use the same DB-backed reads/writes as authenticated sessions.
- Redis outages degrade rate-limit enforcement but do not affect data reads/writes (all data is DB-backed).

### Auth User Redis Outage
- Rate limits temporarily unenforced (fail-open)
- No data loss — all chat/message storage is DB-only
- No user-visible impact beyond relaxed rate limits

---

## Data Integrity

<!-- wave4-cleanup: Messages are stored in DB (not Redis ZSETs). Dedup is a DB/UI concern. -->
### Message Deduplication
- Messages read from DB use `Map<id, message>` for dedup in the UI layer
- Prevents duplicate rendering from concurrent fetches or optimistic update overlaps

### Optimistic Update Rollback
- `useChatVisibility`: On server action failure, reverts to previous value + shows toast
- `usePendingChats`: Explicit pending lifecycle via `add/remove/markConfirmed` (no timer-based auto-cleanup)

### Race Conditions
- Title generation: runs in parallel with streaming, writes to cache/DB async
- If title save fails: no user-facing error, stale placeholder title persists
- If chat save fails: assistant message lost, user message may be orphaned
- Concurrent sessions: last-write-wins for title updates

### Chat Ownership Validation
- Every mutation checks `chat.userId === session.user.id`
- Prevents IDOR attacks on chat/vote/artifact operations
- Public chats readable by anyone, writable only by owner

---

## Specific Edge Cases

### Model Unavailable
- Model not in registry → `bad_request:chat:invalid_model_id`
- Provider API down → AI SDK error propagates, caught by onError
- No retry mechanism for provider failures

### Long Messages
- No explicit message length limit on client
- Server relies on model's context window
<!-- wave4-cleanup: MAX_MESSAGES_LIMIT is a DB query guard / UI performance bound, not a cache limit. -->
- `MAX_MESSAGES_LIMIT = 1000` as DB query guard / UI performance bound

### Browser Storage
- localStorage full → Settings write fails silently
- Cookies blocked → No auth possible, stuck on login page

### Concurrent Editors
- No collaborative editing (single-user artifacts)
- Multiple tabs: last save wins, no conflict detection
- Artifact state is per-tab via `useSyncExternalStore` (no cross-tab sync)

### File Upload Edge Cases
- Large files: Vercel Blob limits apply
- Unsupported MIME types: handled by file picker accept attribute
- Upload failure: toast error, attachment not added to message

### Pyodide (Code Execution)
- First run: downloads ~10MB Pyodide WASM bundle
- Network failure during download: execution unavailable
- Infinite loops: no timeout mechanism (browser tab freezes)
- Memory limit: browser tab memory bounds
- No filesystem or network access (sandboxed)

### Version Overflow
- No limit on artifact versions
- Each version is a separate DB row + appended to cache array
- Theoretical unlimited growth (performance may degrade)

---

## Memory Leak Prevention

| Source | Prevention Pattern |
|--------|-------------------|
| SWR cache growth | Bounded cache size; stale entries evicted on navigation |
| MutationObserver / ResizeObserver | Disconnect observers in cleanup return of `useEffect` |
| ChatStream array growth | Reset accumulated stream arrays on chat change or navigation |
| `artifactStore` synchronous reset | `artifactStore.reset()` called synchronously on unmount / chat switch to prevent stale references |
| `requestAnimationFrame` timers | Cancel outstanding RAF handles in cleanup (`cancelAnimationFrame`) |

---

## Instrumentation

### Client (`instrumentation-client.ts`)
- VercelToolbar integration (dev/preview only)
- Speed insights collection

### Server (`instrumentation.ts`)
- Server-side instrumentation hooks
- Error reporting setup
