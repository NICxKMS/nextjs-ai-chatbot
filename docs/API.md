# API Reference

> Complete API reference for the Next.js AI Chatbot application.

## Authentication

All endpoints except `/api/health` require authentication via session cookie or guest token.

| Header          | Value                       | Required                |
| --------------- | --------------------------- | ----------------------- |
| `Cookie`        | Session cookie from Auth.js | For authenticated users |
| `Authorization` | `Bearer <guest_token>`      | For guest sessions      |

Unauthenticated requests return `401 Unauthorized`.

## Rate Limiting

All endpoints are rate-limited using Upstash Redis with different algorithms:

| Limiter    | Requests       | Window | Algorithm      |
| ---------- | -------------- | ------ | -------------- |
| `standard` | 100            | 60s    | Sliding Window |
| `chat`     | 50 (+10 burst) | 60s    | Token Bucket   |
| `auth`     | 20             | 60s    | Sliding Window |
| `upload`   | 10             | 1h     | Fixed Window   |
| `strict`   | 10             | 60s    | Sliding Window |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1703500000
```

When exceeded: `429 Too Many Requests` with `Retry-After` header.

## Error Response Format

All errors follow a consistent JSON structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": { "field": "messages", "reason": "required" }
  }
}
```

| Code                   | HTTP Status | Description                      |
| ---------------------- | ----------- | -------------------------------- |
| `VALIDATION_ERROR`     | 400         | Invalid request parameters       |
| `AUTHENTICATION_ERROR` | 401         | Missing or invalid credentials   |
| `AUTHORIZATION_ERROR`  | 403         | Insufficient permissions         |
| `NOT_FOUND`            | 404         | Resource not found               |
| `RATE_LIMIT_ERROR`     | 429         | Too many requests                |
| `SERVICE_UNAVAILABLE`  | 503         | Provider temporarily unavailable |

## Endpoints

### POST `/api/chat`

Stream AI responses with tool calling support.

**Request:**

```json
{
  "id": "uuid",
  "messages": [{ "role": "user", "content": "Hello" }],
  "selectedModelId": "gpt-4o"
}
```

**Response:** Server-Sent Events (SSE) stream with AI response chunks.

**Rate Limit:** `chat` (50/min + burst)

<details>
<summary><strong>Examples</strong></summary>

**curl:**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=<session_token>" \
  -d '{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "messages": [{"role": "user", "content": "Hello"}],
    "selectedModelId": "gpt-4o"
  }'
```

**fetch:**

```typescript
const response = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    id: crypto.randomUUID(),
    messages: [{ role: "user", content: "Hello" }],
    selectedModelId: "gpt-4o",
  }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (reader) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(decoder.decode(value));
}
```

</details>

---

### GET `/api/chat/[id]`

Retrieve a specific chat with messages.

**Response:** `{ "chat": Chat, "messages": Message[] }`

<details>
<summary><strong>Examples</strong></summary>

**curl:**

```bash
curl -X GET "http://localhost:3000/api/chat/550e8400-e29b-41d4-a716-446655440000" \
  -H "Cookie: authjs.session-token=<session_token>"
```

**fetch:**

```typescript
const response = await fetch(`/api/chat/${chatId}`, {
  credentials: "include",
});
const { chat, messages } = await response.json();
```

</details>

---

### DELETE `/api/chat/[id]`

Delete a chat and all associated messages.

**Response:** `204 No Content`

<details>
<summary><strong>Examples</strong></summary>

**curl:**

```bash
curl -X DELETE "http://localhost:3000/api/chat/550e8400-e29b-41d4-a716-446655440000" \
  -H "Cookie: authjs.session-token=<session_token>"
```

**fetch:**

```typescript
await fetch(`/api/chat/${chatId}`, {
  method: "DELETE",
  credentials: "include",
});
```

</details>

---

### GET `/api/history`

Fetch paginated chat history.

**Query:** `?limit=20&cursor=<last_chat_id>`

**Response:** `{ "chats": Chat[], "nextCursor": string | null }`

<details>
<summary><strong>Examples</strong></summary>

**curl:**

```bash
# First page
curl -X GET "http://localhost:3000/api/history?limit=20" \
  -H "Cookie: authjs.session-token=<session_token>"

# Subsequent pages
curl -X GET "http://localhost:3000/api/history?limit=20&cursor=<next_cursor>" \
  -H "Cookie: authjs.session-token=<session_token>"
```

**fetch:**

```typescript
async function fetchHistory(cursor?: string) {
  const params = new URLSearchParams({ limit: "20" });
  if (cursor) params.set("cursor", cursor);

  const response = await fetch(`/api/history?${params}`, {
    credentials: "include",
  });
  return response.json();
}

// Paginate through all history
let cursor: string | null = null;
do {
  const { chats, nextCursor } = await fetchHistory(cursor ?? undefined);
  console.log(chats);
  cursor = nextCursor;
} while (cursor);
```

</details>

---

### DELETE `/api/history`

Delete all chats for the authenticated user.

**Response:** `204 No Content`

<details>
<summary><strong>Examples</strong></summary>

**curl:**

```bash
curl -X DELETE "http://localhost:3000/api/history" \
  -H "Cookie: authjs.session-token=<session_token>"
```

**fetch:**

```typescript
await fetch("/api/history", {
  method: "DELETE",
  credentials: "include",
});
```

</details>

---

### PATCH `/api/vote`

Submit or update a message vote.

**Request:** `{ "messageId": "uuid", "chatId": "uuid", "type": "up" | "down" }`

**Response:** `{ "success": true }`

<details>
<summary><strong>Examples</strong></summary>

**curl:**

```bash
curl -X PATCH "http://localhost:3000/api/vote" \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=<session_token>" \
  -d '{
    "messageId": "550e8400-e29b-41d4-a716-446655440001",
    "chatId": "550e8400-e29b-41d4-a716-446655440000",
    "type": "up"
  }'
```

**fetch:**

```typescript
await fetch("/api/vote", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    messageId: "550e8400-e29b-41d4-a716-446655440001",
    chatId: "550e8400-e29b-41d4-a716-446655440000",
    type: "up",
  }),
});
```

</details>

---

### GET/POST/DELETE `/api/document`

Document CRUD operations.

| Method | Action          | Body                       |
| ------ | --------------- | -------------------------- |
| GET    | Get document    | `?id=<doc_id>`             |
| POST   | Create document | `{ title, content, kind }` |
| DELETE | Delete document | `?id=<doc_id>`             |

<details>
<summary><strong>Examples</strong></summary>

**curl:**

```bash
# Get document
curl -X GET "http://localhost:3000/api/document?id=<doc_id>" \
  -H "Cookie: authjs.session-token=<session_token>"

# Create document
curl -X POST "http://localhost:3000/api/document" \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=<session_token>" \
  -d '{
    "title": "My Document",
    "content": "Document content here",
    "kind": "text"
  }'

# Delete document
curl -X DELETE "http://localhost:3000/api/document?id=<doc_id>" \
  -H "Cookie: authjs.session-token=<session_token>"
```

**fetch:**

```typescript
// Get document
const doc = await fetch(`/api/document?id=${docId}`, {
  credentials: "include",
}).then((r) => r.json());

// Create document
const newDoc = await fetch("/api/document", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    title: "My Document",
    content: "Document content here",
    kind: "text",
  }),
}).then((r) => r.json());

// Delete document
await fetch(`/api/document?id=${docId}`, {
  method: "DELETE",
  credentials: "include",
});
```

</details>

---

### POST `/api/files/upload`

Upload files (images, documents).

**Content-Type:** `multipart/form-data`

**Response:** `{ "url": string, "name": string }`

**Rate Limit:** `upload` (10/hour)

<details>
<summary><strong>Examples</strong></summary>

**curl:**

```bash
curl -X POST "http://localhost:3000/api/files/upload" \
  -H "Cookie: authjs.session-token=<session_token>" \
  -F "file=@/path/to/document.pdf"
```

**fetch:**

```typescript
const formData = new FormData();
formData.append("file", fileInput.files[0]);

const { url, name } = await fetch("/api/files/upload", {
  method: "POST",
  credentials: "include",
  body: formData,
}).then((r) => r.json());
```

</details>

---

### GET `/api/suggestions`

Get AI-powered suggestions for the current context.

**Response:** `{ "suggestions": string[] }`

<details>
<summary><strong>Examples</strong></summary>

**curl:**

```bash
curl -X GET "http://localhost:3000/api/suggestions" \
  -H "Cookie: authjs.session-token=<session_token>"
```

**fetch:**

```typescript
const { suggestions } = await fetch("/api/suggestions", {
  credentials: "include",
}).then((r) => r.json());
```

</details>

---

### GET `/api/health`

Health check endpoint (no auth required).

**Response:** `{ "status": "ok", "timestamp": "ISO8601" }`

<details>
<summary><strong>Examples</strong></summary>

**curl:**

```bash
curl -X GET "http://localhost:3000/api/health"
```

**fetch:**

```typescript
const health = await fetch("/api/health").then((r) => r.json());
console.log(health.status); // "ok"
```

</details>

## See Also

- [Architecture](./ARCHITECTURE.md) - System design overview
- [Error Handling](./ERROR-HANDLING.md) - Error handling patterns
- [Caching](./CACHING.md) - Cache strategy documentation
