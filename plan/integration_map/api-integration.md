# API Integration

> Every client→server communication point: fetch calls, SWR configurations,
> SSE/streaming connections, file uploads, and auth cookie handling.

---

## 1. API Endpoints (Client → Server)

### Streaming

| Endpoint | Method | Client Caller | Transport | Auth |
|----------|--------|---------------|-----------|------|
| `/api/chat` | POST | `useChat` (AI SDK) | SSE via `DefaultChatTransport` | Cookie (sb_token or guest_token) |

### REST

| Endpoint | Method | Client Caller | SWR Key | Auth |
|----------|--------|---------------|---------|------|
| `/api/history` | GET | `SidebarHistory` | `useSWRInfinite` pagination keys | Cookie |
| `/api/history` | DELETE | `AppSidebar` delete all | Manual fetch + SWR mutate | Cookie |
| `/api/history/{id}` | DELETE | `SidebarHistoryItem` | Manual fetch + SWR mutate | Cookie |
| `/api/chat/[id]` | DELETE | `SidebarHistoryItem` / route handler | Manual fetch | Cookie |
| `/api/document` | GET | `DocumentPreview`, `Artifact` | `"/api/document?id={id}"` | Cookie |
| `/api/document` | POST | `Artifact` (debounced save) | Manual fetch | Cookie |
| `/api/document` | DELETE | `VersionFooter` (restore) | Manual fetch + SWR mutate | Cookie |
| `/api/vote` | PATCH | `MessageActions` | `"/api/vote?chatId={chatId}"` + optimistic | Cookie |
| `/api/suggestions` | GET | `Artifact` (text) | Fetched by suggestion tool handler | Cookie |
| `/api/files/upload` | POST | `MultimodalInput` | Manual fetch (FormData) | Cookie |
| `/api/health` | GET | (external monitors) | — | None |
| `/api/auth/exchange` | POST | `AuthForm` (login/register) | Manual fetch | None (creates session) |
| `/api/auth/guest` | POST | `AuthProvider` (auto) | Manual fetch | None (creates session) |
| `/api/auth/logout` | POST | `SidebarUserNav` | Manual fetch | Cookie |

---

## 2. SWR Configurations

### Global SWR Config (Root Layout)

```typescript
{
  dedupingInterval: 10_000,          // 10s dedup
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  revalidateIfStale: true,
}
```

### SWR Keys & Fetchers

| Key Pattern | Data Type | Fetcher | Component |
|-------------|-----------|---------|-----------|
| `"artifact"` | `UIArtifact` | `null` (no fetcher — client-only state) | `useArtifact`, `DataStreamHandler`, `Artifact`, `DocumentPreview` |
| `"artifact-metadata-{docId}"` | Document metadata | `null` (no fetcher) | Artifact components |
| `"{chatId}-visibility"` | `"public" \| "private"` | `null` (no fetcher — optimistic) | `useChatVisibility`, `VisibilitySelector` |
| `"messages:should-scroll"` | `boolean` | `null` (no fetcher) | `useScrollToBottom` |
| `"/api/document?id={id}"` | `Document[]` | `fetch(url).json()` | `DocumentPreview`, `Artifact` |
| History pagination | `{ chats, hasMore }` | `fetch(url).json()` | `SidebarHistory` |

### SWR Infinite (Sidebar History)

```typescript
// Key generator
function getChatHistoryPaginationKey(index, previousData) {
  if (previousData && !previousData.hasMore) return null;  // End of pagination
  return `/api/history?limit=20&offset=${index * 20}`;
}

// Usage
const { data, size, setSize, mutate } = useSWRInfinite(
  getChatHistoryPaginationKey,
  fetcher,
  { revalidateFirstPage: true }
);
```

### SWR Optimistic Mutations

| Operation | Key | Optimistic Update | Rollback |
|-----------|-----|-------------------|----------|
| Visibility toggle | `"{chatId}-visibility"` | `mutate(type, false)` | `mutate(initialVisibility)` + toast |
| Vote | `"/api/vote?chatId={chatId}"` | Update vote in cached array | Revert on error |
| Delete chat | History pages | Filter out chat from cached pages | N/A (redirect on success) |
| Document restore | `"/api/document?id={id}"` | Truncate versions array | N/A |

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

Custom data parts (via dataStream.write()):
  data-id, data-title, data-kind, data-clear,
  data-textDelta, data-codeDelta, data-sheetDelta, data-imageDelta,
  data-finish, data-suggestion, data-chatTitle, data-usage,
  data-appendMessage

AI SDK standard parts:
  text-delta, reasoning, tool-call, tool-result,
  finish-step, finish-message

Timeout: 55s (AbortSignal.timeout on server), 60s maxDuration on route

Client processing:
  - useChat hook processes standard AI SDK parts automatically
  - useChat.onData callback processes custom data parts
  - DataStreamProvider accumulates custom parts in state
  - DataStreamHandler processes accumulated deltas → updates useArtifact SWR
```

### Adaptive Throttle

```typescript
// Client-side throttle based on connection speed
const adaptiveThrottle = (() => {
  if (typeof navigator === 'undefined') return 100;
  const conn = (navigator as any).connection;
  if (!conn) return 100;
  const dl = conn.downlink;           // Mbps
  if (dl >= 10) return 50;            // Fast
  if (dl >= 1) return 100;            // Medium
  return 150;                         // Slow
})();

// Applied to useChat hook
experimental_throttle: adaptiveThrottle
```

### AbortController Usage

```typescript
// Per-request AbortController in useChat custom fetch
const controller = new AbortController();
// Stop button: controller.abort()
// Component unmount: controller.abort()
// Server-side: AbortSignal.timeout(55_000) for AI completion
```

---

## 4. File Upload Mechanics

### Upload Flow

```typescript
// MultimodalInput component
const fileInputRef = useRef<HTMLInputElement>(null);

// Hidden input trigger
<input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} />

// Upload handler (max 3 concurrent)
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
// Auth: required
// Rate limit: upload (10/hour)
// Storage: Vercel Blob (put())
// Response: { url: string, pathname: string, contentType: string }
```

### Attachment in Message

```typescript
// On submit, attachments become message parts:
{
  type: "file",
  data: attachment.url,      // Vercel Blob URL
  mimeType: attachment.contentType,
  name: attachment.pathname,
}
```

---

## 5. Auth Cookie Handling

### Cookie Lifecycle

| Cookie | Set By | Validated By | TTL | Attributes |
|--------|--------|-------------|-----|------------|
| `sb_token` | `POST /api/auth/exchange` | `getAppSession()` | 7 days | httpOnly, secure, sameSite=lax, path=/ |
| `guest_token` | `POST /api/auth/guest` (or proxy) | `getAppSession()` | 7 days (cookie), 1h (JWT) | httpOnly, secure, sameSite=lax, path=/ |
| `chat-model` | Client JS (`document.cookie`) | Server page components | Session | path=/ |
| `sidebar_state` | Client (SidebarProvider) | Chat layout server component | Session | path=/ |

### Session Resolution Order

```
1. Read sb_token cookie → jwtVerify() → if valid → authenticated session
2. Read guest_token cookie → jwtVerify() → if valid → guest session
3. No valid token → null (redirect to login or auto-create guest)
```

### Guest Token Rotation

```
Every request (proxy.ts or middleware):
  1. Read guest_token cookie
  2. Decode JWT, check exp claim
  3. If exp - now < 30 minutes:
     a. Sign new JWT: same sub (guest:{uuid}), fresh 1h exp
     b. Set-Cookie: guest_token with fresh 7d maxAge
  4. Pass through to Next.js
```

### Auth Flow (Client-Side)

```
Login:
  1. supabase.auth.signInWithPassword({ email, password })
  2. POST /api/auth/exchange { accessToken: session.access_token }
  3. Server: jwtVerify → Set-Cookie sb_token → Return user
  4. router.push('/') + router.refresh()

Register:
  1. supabase.auth.signUp({ email, password })
  2. If session returned: same exchange flow as login
  3. If no session (email confirm): redirect to /login

Logout:
  1. POST /api/auth/logout
  2. Server: delete sb_token cookie
  3. Client: supabase.auth.signOut()
  4. Clear SWR cache (useSWRConfig().cache.clear())
  5. router.push('/')

Guest Bootstrap:
  1. AuthProvider detects no initialSession
  2. POST /api/auth/guest
  3. Server: sign guest JWT → Set-Cookie guest_token → Return session
  4. AuthProvider.setSession(guestSession)
  5. isNewSession = true (skips initial SWR history fetch)
```

---

## 6. Request/Response Patterns

### Standard JSON Request

```typescript
// Client
const response = await fetch('/api/vote', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chatId, messageId, type }),
});

// Auth: automatic via httpOnly cookie (no manual headers needed)
```

### Streaming Request (useChat)

```typescript
// AI SDK handles transport. Custom prepareSendMessagesRequest:
{
  id: chatId,
  message: messages.at(-1),  // Only latest message
  selectedChatModel: modelId,
  selectedVisibilityType: visibility,
  settings: {
    sampling: { temperature, topP, maxOutputTokens },
    systemPrompt,
    enableReasoning,
    reasoningBudget,
    streamArtifacts,
    autoScroll,
    selectedModelId,
  },
}
```

### Error Response Shape

```typescript
// All API errors use ChatSDKError/AppError format:
{
  error: {
    code: "rate_limit:chat:daily_limit_exceeded",
    message: "Daily message limit exceeded",
    status: 429,
  }
}

// Client parses in useChat.onError:
// 1. Parse response JSON
// 2. Extract error code
// 3. Show toast with user-friendly message
// 4. Special handling for rate_limit, offline codes
```

### Cache Headers

```typescript
// GET /api/history response:
'Cache-Control': 'private, max-age=0, s-maxage=10, stale-while-revalidate=30'
// Private (user-specific), CDN caches 10s, stale-while-revalidate 30s
```

---

## 7. Title Polling Pattern

After chat completion, the client polls for the confirmed title:

```typescript
// In useChat.onFinish:
async function pollForTitle(chatId: string, maxAttempts = 5) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 500));
    const res = await fetch(`/api/chat?id=${chatId}`);
    if (res.ok) {
      const chat = await res.json();
      if (chat.title) {
        window.dispatchEvent(new Event('chat-title-updated'));
        return;
      }
    }
  }
}
```

This pattern exists because:
1. Title generation runs in parallel with streaming (non-blocking)
2. The data-chatTitle stream part may arrive before DB persistence
3. Polling confirms the title is persisted and triggers SWR revalidation
