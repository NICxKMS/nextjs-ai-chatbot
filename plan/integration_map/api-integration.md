> **Updated per redesign audit (2026-03-01)**

# API Integration

> Every client→server communication point: fetch calls, SWR configurations,
> SSE/streaming connections, file uploads, and auth cookie handling.
> Updated to reflect: Server Actions replacing some Route Handlers,
> artifact naming, ChatStreamProvider, useOptimistic for votes/visibility,
> proxy.ts replacing middleware.ts, removal of credit/quota/gateway APIs,
> title polling removed (server-awaited single channel).

---

## 1. API Endpoints (Client → Server)

### Streaming

| Endpoint | Method | Client Caller | Transport | Auth |
|----------|--------|---------------|-----------|------|
| `/api/chat` | POST | `useChat` (AI SDK) via `useChatSession` | SSE via `DefaultChatTransport` | Cookie (sb_token or guest_token) |

### REST (Route Handlers)

| Endpoint | Method | Client Caller | Purpose | Auth |
|----------|--------|---------------|---------|------|
| `/api/history` | GET | `SidebarHistoryClient` (useSWRInfinite) | Paginated chat list | Cookie |
| `/api/artifact` | GET | `ArtifactPreview`, `ArtifactPanel` | Fetch artifact versions | Cookie |
| `/api/artifact` | POST | `ArtifactPanel` (debounced save) | Save user-edited artifact version | Cookie |
| `/api/artifact` | DELETE | `VersionFooter` (restore) | Delete later versions | Cookie |
| `/api/suggestions` | GET | `ArtifactPanel` (text) | Fetch saved suggestions | Cookie |
| `/api/files/upload` | POST | `MultimodalInput` | Upload file to Vercel Blob | Cookie |
| `/api/health` | GET | External monitors | Health check | None |

### Server Actions (Mutations)

| Action | Client Caller | Purpose | Revalidation |
|--------|---------------|---------|--------------|
| `deleteChat` | `SidebarHistoryItem` dropdown | Delete single chat | `updateTag('chats:{userId}')` |
| `deleteAllChats` | `AppSidebar` dropdown | Delete all chats | `updateTag('chats:{userId}')` |
| `deleteTrailingMessages` | `MessageEditor` | Delete messages after edit point | `updateTag('chat:{id}')` |
| `voteOnMessage` | `VoteButtons` | Upvote/downvote message | `updateTag('votes:{chatId}')` |
| `updateChatVisibility` | `VisibilitySelector` | Toggle public/private | `updateTag('chat:{id}')` + `updateTag('chats:{userId}')` |
| `renameChat` | `SidebarHistoryItem` dropdown | Rename chat | `updateTag('chats:{userId}')` |
| `login` | `AuthForm` | Email/password login + cookie set | Router Cache invalidated |
| `register` | `AuthForm` | Registration + cookie set | Router Cache invalidated |
| `logout` | `SidebarUserNav` | Clear session cookie, sign out | Router Cache invalidated |

> **Removed:** `PATCH /api/vote` (→ Server Action), `DELETE /api/history` (→ Server Action),
> `DELETE /api/chat/[id]` (→ Server Action). Mutations use Server Actions with `updateTag`.

---

## 2. SWR Configurations

### SWR Keys & Fetchers

| Key Pattern | Data Type | Fetcher | Component |
|-------------|-----------|---------|-----------|
| History pagination | `{ chats, hasMore }` | `fetch(url).json()` | `SidebarHistoryClient` |
| `"/api/artifact?id={id}"` | `Artifact[]` | `fetch(url).json()` | `ArtifactPreview`, `ArtifactPanel` |

> **Removed SWR keys:**
> - ~~`"artifact"`~~ — replaced by `artifactStore` (useSyncExternalStore)
> - ~~`"artifact-metadata-{id}"`~~ — no longer needed
> - ~~`"{chatId}-visibility"`~~ — replaced by `useOptimistic`
> - ~~`"/api/vote?chatId={chatId}"`~~ — replaced by Server Action + `useOptimistic`
> - ~~`"messages:should-scroll"`~~ — useRef-based scroll (no SWR)

### SWR Infinite (Sidebar History)

```typescript
// Key generator
function getChatHistoryPaginationKey(index, previousData) {
  if (previousData && !previousData.hasMore) return null;
  if (index === 0) return '/api/history?limit=20';
  return `/api/history?limit=20&cursor=${previousData?.nextCursor}`;
}

// Usage in SidebarHistoryClient
const { data, size, setSize, mutate } = useSWRInfinite(
  getChatHistoryPaginationKey,
  fetcher,
  {
    fallbackData: [{ chats: initialChats, hasMore: initialHasMore }],
    revalidateFirstPage: true,
  }
);
```

> **Key change:** `fallbackData` populated from server-rendered `SidebarShell` — no waterfall on initial load.

> **SWR configuration note:** SWR is still used for sidebar history pagination (`useSWRInfinite`) and artifact version history (`useSWR` on-demand). Configuration is applied at point-of-use rather than via a global `SWRConfig` provider. There is no global `dedupingInterval` or `revalidateOnFocus` override — each SWR consumer configures its own options.

---

## 3. SSE / Streaming Connections

### Chat Streaming (`POST /api/chat`)

```
Transport: DefaultChatTransport (AI SDK)
Content-Type: text/event-stream
Encoding: JsonToSseTransformStream (server-side)

Flow:
  Client → POST JSON body → Server
  Server → SSE stream → Client

Custom data parts (via ChatStream.writeData()):
  artifact-id, artifact-title, artifact-kind, artifact-clear,
  artifact-textDelta, artifact-codeDelta, artifact-sheetDelta, artifact-imageDelta,
  artifact-finish, artifact-suggestion, chat-title

AI SDK standard parts:
  text-delta, reasoning, tool-call, tool-result,
  finish-step, finish-message

Timeout: 55s (AbortSignal.timeout on server), 60s maxDuration on route

Client processing:
  - useChat hook processes standard AI SDK parts automatically
  - useChat.onData callback routes custom data parts:
    → chat-title → PendingChats.updateTitle()
    → artifact-* → ChatStreamProvider dispatch
  - ChatStreamProvider (StateCtx) accumulates artifact parts (RAF batched)
  - StreamBridge processes accumulated parts → artifactStore.setState()
```

### Adaptive Throttle

```typescript
const adaptiveThrottle = (() => {
  if (typeof navigator === 'undefined') return 100;
  const conn = (navigator as any).connection;
  if (!conn) return 100;
  const dl = conn.downlink;
  if (dl >= 10) return 50;     // Fast
  if (dl >= 1) return 100;     // Medium
  return 150;                   // Slow
})();
```

### AbortController Usage

```typescript
// Per-request in useChatSession
const abortControllerRef = useRef<AbortController | null>(null)

// On send: abortControllerRef.current = new AbortController()
// On stop/navigation: abortControllerRef.current?.abort()
// Cleanup effect: artifactStore.reset() — synchronous, prevents stale state
```

---

## 4. File Upload Mechanics

### Upload Flow

```typescript
// MultimodalInput → file input → handleFileChange
async function handleFileChange(files: FileList) {
  const uploads = Array.from(files).map(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData,
      signal: abortController.signal,
    });
    return response.json();  // { url, pathname, contentType }
  });
  const results = await Promise.all(uploads);
  setAttachments(prev => [...prev, ...results]);
}
```

### Server-Side Processing

```typescript
// Route: POST /api/files/upload
// Auth: required (cookie)
// Rate limit: upload (10/hour)
// Storage: Vercel Blob (put())
// Response: { url: string, pathname: string, contentType: string }
```

### Attachment in Message

```typescript
// On submit, attachments become message parts:
{ type: "file", data: attachment.url, mimeType: attachment.contentType, name: attachment.pathname }
```

---

## 5. Auth Cookie Handling

### Cookie Lifecycle

| Cookie | Set By | Validated By | TTL | Attributes |
|--------|--------|-------------|-----|------------|
| `sb_token` | `login` / `register` Server Actions | `getAppSession()` | 7 days | httpOnly, secure, sameSite=lax, path=/ |
| `guest_token` | `proxy.ts` guest bootstrap/rotation | `getAppSession()` | 7 days (cookie), 1h (JWT) | httpOnly, secure, sameSite=lax, path=/ |
| `chat-model` | Client JS (`document.cookie`) | Server page components | Session | path=/ |
| `sidebar:state` | Client (SidebarProvider) | Chat layout server component | Session | path=/ |

### Session Resolution Order

```
1. Read sb_token cookie → jwtVerify() → if valid → authenticated session
2. Read guest_token cookie → jwtVerify() → if valid → guest session
3. No valid token → null (redirect to login or auto-create guest)
```

### Guest Token Rotation (proxy.ts)

```
Every request (proxy.ts):
  1. Read guest_token cookie
  2. Decode JWT, check exp claim
  3. If exp - now < 30 minutes:
     a. Sign new JWT: same sub (guest:{uuid}), fresh 1h exp
     b. Set-Cookie: guest_token with fresh 7d maxAge
  4. Pass through to Next.js
```

> **Changed:** `middleware.ts` → `proxy.ts` (Next.js 16 convention).

### Auth Flow (Client-Side)

```
Login:
  1. AuthForm submits to `login` Server Action (`useActionState`)
  2. Server Action validates input + calls Supabase sign-in
  3. Server Action sets `sb_token` cookie
  4. redirect('/') + router cache invalidation

Register:
  1. AuthForm submits to `register` Server Action (`useActionState`)
  2. Server Action validates input + calls Supabase sign-up
  3. On success: set `sb_token` cookie or redirect to /login when email confirmation is required

Logout:
  1. Client calls logout() Server Action
  2. Server Action: supabase.auth.signOut() + delete sb_token cookie
  3. Server Action: redirect('/login')

Guest Bootstrap:
  1. Request enters `proxy.ts`
  2. If no valid auth cookies: proxy mints/rotates guest JWT and sets `guest_token`
  3. `getAppSession()` resolves guest session for server components and actions
```

---

## 6. Request/Response Patterns

### Standard JSON Request (Route Handler)

```typescript
const response = await fetch('/api/artifact?id=' + artifactId);
const versions = await response.json();
// Auth: automatic via httpOnly cookie (no manual headers needed)
```

### Server Action Call

```typescript
// Client component
const result = await voteOnMessage({ chatId, messageId, type: 'up' });
if (!result.success) toast.error(result.error.message);
// Returns ActionResult<T>, never throws
```

### Streaming Request (useChat)

```typescript
// AI SDK handles transport. Custom prepareSendMessagesRequest:
{
  id: chatId,
  message: messages.at(-1),          // Only latest message
  selectedChatModel: modelId,
  selectedVisibilityType: visibility,
  settings: {
    temperature, topP, maxOutputTokens,
    systemPrompt, enableReasoning,
  },
}
```

### Error Response Shape

```typescript
// Route Handler errors:
{ error: { code: "rate_limit:chat:daily_limit_exceeded", message: "...", status: 429 } }

// Server Action errors (ActionResult):
{ success: false, error: { code: "UNAUTHORIZED", message: "Login required" } }

// Client: toast.error(parsed.message) for both patterns
```

---

## 7. What's NOT in This API Surface

| Removed | Reason |
|---------|--------|
| `PATCH /api/vote` | Replaced by `voteOnMessage()` Server Action + `useOptimistic` |
| `DELETE /api/history` | Replaced by `deleteAllChats()` Server Action |
| `DELETE /api/chat/[id]` | Replaced by `deleteChat()` Server Action |
| Title polling (`GET /api/chat?id=` 5×500ms) | Title AWAITED server-side, delivered via `chat-title` stream part |
| `window.dispatchEvent('chat-title-updated')` | Replaced by `PendingChats.updateTitle()` single channel |
| Credit/quota/gateway APIs | No credit system in redesign |
| `data-usage` stream part | No usage tracking |
| `data-appendMessage` stream part | useChat manages messages natively |
| SWR synthetic key `"artifact"` | Replaced by `artifactStore` (useSyncExternalStore) |
| SWR key `"{chatId}-visibility"` | Replaced by `useOptimistic` in VisibilitySelector |
