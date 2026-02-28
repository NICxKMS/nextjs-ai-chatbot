# Edge Cases & Error Handling

## Error System Architecture

### `ChatSDKError` (`lib/errors.ts`)

Structured error class with coded error types:

```typescript
class ChatSDKError extends Error {
  code: string;    // e.g., "bad_request:api:invalid_model_id"
  status: number;  // HTTP status code
  
  toResponse(): Response    // Converts to HTTP Response
  toJSON(): object          // Serializable representation
}
```

### Error Code Structure
Format: `{type}:{surface}:{reason?}`

**Types**: `bad_request` (400), `unauthorized` (401), `forbidden` (403), `not_found` (404), `rate_limit` (429), `offline` (503)

**Surfaces**: `chat`, `auth`, `api`, `stream`, `database`, `history`, `vote`, `document`, `suggestions`, `activate_gateway`, `ui`

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

### Chat Page Loading (`app/(chat)/loading.tsx`)
- Skeleton UI rendered during page transition
- Shows: sidebar skeleton + chat area skeleton + input placeholder
- Suspense boundary triggers this automatically

### Sidebar Skeleton (`components/sidebar-skeleton.tsx`)
- Placeholder bars for chat history items
- Animated pulse effect
- Displayed while `GET /api/history` is in flight

### Document Skeleton (`components/document-skeleton.tsx`)
- Placeholder bars for document content area
- Shows while document is being fetched or generated

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
- Suggestions panel hidden when no suggestions exist for a document

---

## Network Error Handling

### Chat Request Failures
```typescript
onError: (error: Error) => {
  // Parse ChatSDKError from response
  // Show toast with user-friendly message
  // If rate_limit → show specific "rate limited" message
  // If offline → show "connection lost" message
}
```

### AbortController Usage
- Chat requests: custom `AbortController` per request
- File uploads: `AbortController` for cancellation
- Server-side: `AbortSignal.timeout(55_000)` for AI completions
- User can click "Stop" button → aborts current stream

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
| `standard` | 100/min | `rate_limit:{surface}:too_many_requests` |
| `strict` | 10/min | `rate_limit:{surface}:too_many_requests` |
| `upload` | 10/hour | `rate_limit:upload:too_many_requests` |

### Daily Quota
| User Type | Limit | Error Code |
|-----------|-------|------------|
| Guest | 20/day | `rate_limit:chat:daily_limit_exceeded` |
| Authenticated | 100/day | `rate_limit:chat:daily_limit_exceeded` |

Tracked via Redis counter with daily TTL. Checked before processing, incremented after successful save.

---

## Cache Failure Modes

### Circuit Breaker Pattern
```
Normal → 5 consecutive failures → Circuit OPEN (30s)
  │                                    │
  │                                    └── All cache ops return null/void
  │                                    └── Auth users: DB fallback
  │                                    └── Guest users: feature degraded
  │
  └── After 30s → Circuit HALF-OPEN → next success → CLOSED
```

### Guest Without Redis
- If Redis unavailable on first request: `bad_request:api:guest_requires_cache`
- If Redis fails mid-session: cached data inaccessible, no fallback
- Guest users cannot create/read chats without cache

### Auth User Cache Miss
- Transparent fallback to database
- Background cache warming after DB read
- No user-visible impact

---

## Data Integrity

### Message Deduplication
- Messages read from cache use `Map<id, message>` for dedup
- Prevents duplicate messages from ZSET edge cases (score ties)

### Optimistic Update Rollback
- `useChatVisibility`: On server action failure, reverts to previous value + shows toast
- `useOptimisticChats`: Auto-cleanup of stale optimistic entries (>2 min old)

### Race Conditions
- Title generation: runs in parallel with streaming, writes to cache/DB async
- If title save fails: no user-facing error, stale placeholder title persists
- If chat save fails: assistant message lost, user message may be orphaned
- Concurrent sessions: last-write-wins for title updates

### Chat Ownership Validation
- Every mutation checks `chat.userId === session.user.id`
- Prevents IDOR attacks on chat/vote/document operations
- Public chats readable by anyone, writable only by owner

---

## Specific Edge Cases

### Model Unavailable
- Model not in registry → `bad_request:api:invalid_model_id`
- Provider API down → AI SDK error propagates, caught by onError
- No retry mechanism for provider failures

### Long Messages
- No explicit message length limit on client
- Server relies on model's context window
- `MAX_MESSAGES_LIMIT = 1000` for cache storage

### Browser Storage
- localStorage full → Settings write fails silently
- Cookies blocked → No auth possible, stuck on login page

### Concurrent Editors
- No collaborative editing (single-user documents)
- Multiple tabs: last save wins, no conflict detection
- SWR state is per-tab (no cross-tab sync)

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
- No limit on document versions
- Each version is a separate DB row + appended to cache array
- Theoretical unlimited growth (performance may degrade)

---

## Instrumentation

### Client (`instrumentation-client.ts`)
- VercelToolbar integration (dev/preview only)
- Speed insights collection

### Server (`instrumentation.ts`)
- Server-side instrumentation hooks
- Error reporting setup
