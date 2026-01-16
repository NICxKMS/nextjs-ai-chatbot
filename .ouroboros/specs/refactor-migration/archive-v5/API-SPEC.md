# API Specification

**Version**: 1.0  
**Framework**: Next.js 16.1 App Router  
**Base Path**: `/api/`  
**Auth**: Auth.js v5 + Supabase  
**Created**: 2024-12-27  
**Status**: 🟢 Active

---

## Table of Contents

1. [Response Format](#1-response-format)
2. [Authentication](#2-authentication)
3. [Rate Limiting](#3-rate-limiting)
4. [API Routes](#4-api-routes)
   - [Auth Routes](#41-auth-routes)
   - [Chat Routes](#42-chat-routes)
   - [History Routes](#43-history-routes)
   - [Document Routes](#44-document-routes)
   - [Suggestions Routes](#45-suggestions-routes)
   - [Vote Routes](#46-vote-routes)
   - [File Upload Routes](#47-file-upload-routes)
   - [Health Check Routes](#48-health-check-routes)
5. [Error Codes](#5-error-codes)
6. [Streaming API](#6-streaming-api)
7. [Middleware](#7-middleware)

---

## 1. Response Format

### Standard Success Response

```typescript
interface ApiResponse<T> {
  success?: true;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
    nextCursor?: string | null;
  };
}
```

### Standard Error Response

```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    retryAfter?: number; // For rate limit errors
  };
}
```

### AppError Structure

All API errors use the `AppError` class which provides consistent error handling:

```typescript
interface AppErrorOptions {
  code: ErrorCode;           // Structured error code (e.g., "auth:unauthorized")
  message: string;           // Human-readable message
  statusCode?: number;       // HTTP status code (default: 500)
  cause?: Error;             // Original error for debugging
  context?: Record<string, unknown>; // Additional context
}
```

---

## 2. Authentication

### Auth Flow

The application supports two authentication methods:

1. **Supabase Auth** - Full authenticated users
2. **Guest Sessions** - Anonymous users with limited capabilities

### Session Types

```typescript
type UserType = "authenticated" | "guest";

interface AppUser {
  id: string;
  type: UserType;
  email?: string;
}

interface AppSession {
  user: AppUser;
  expires?: string;
}
```

### Auth Headers

| Header | Description |
|--------|-------------|
| `Cookie: sb-*-auth-token` | Supabase auth token cookie |
| `Cookie: guest-token` | Guest session token |

### Guest Restrictions

Guest users have limited access:
- **Allowed Models**: `gpt-4o-mini`, `gemini-2.0-flash-exp`, `gemini-1.5-flash`
- **No Persistence**: Chat history not saved
- **No Voting**: Cannot vote on messages
- **Stricter Rate Limits**: 20 req/min vs 100 req/min

---

## 3. Rate Limiting

### Rate Limit Tiers

| Tier | Requests | Window | Use Case |
|------|----------|--------|----------|
| `standard` | 100 | 60s | General API endpoints |
| `strict` | 10 | 60s | Sensitive operations (guest creation) |
| `auth` | 20 | 60s | Authentication endpoints |
| `chat` | 50 | 60s | AI chat (with burst: 10) |
| `upload` | 10 | 1h | File uploads |
| `guest` | 20 | 60s | Guest user override |
| `search` | 1000 | 60s | Suggestions/search |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1703678400000
Retry-After: 60
```

### Route-to-Limiter Mapping

| Route | Limiter |
|-------|---------|
| `/api/auth/login` | `auth` |
| `/api/auth/register` | `auth` |
| `/api/auth/guest` | `strict` |
| `/api/auth/exchange` | `auth` |
| `/api/auth/logout` | `auth` |
| `/api/chat` | `chat` |
| `/api/files/upload` | `upload` |
| `/api/suggestions` | `search` |
| `/api/document` | `standard` |
| `/api/vote` | `standard` |
| `/api/history` | `standard` |

---

## 4. API Routes

### 4.1 Auth Routes

---

#### POST /api/auth/guest

**File**: `app/api/auth/guest/route.ts`  
**Auth**: None (creates guest session)  
**Rate Limit**: `strict` (10/min)

Creates or retrieves a guest session for anonymous users.

**Request Body**: None

**Response** (200):
```typescript
{
  user: {
    id: string;
    type: "guest";
  };
  isNewSession: boolean;
}
```

**Errors**:

| Code | Status | Description |
|------|--------|-------------|
| `rate_limited` | 429 | Too many session requests |
| `auth:guest_unavailable` | 500 | Guest auth not configured |

---

#### POST /api/auth/exchange

**File**: `app/api/auth/exchange/route.ts`  
**Auth**: None (exchanges token)  
**Rate Limit**: `auth` (20/min)

Exchanges Supabase access token for session cookie.

**Request Body**:
```typescript
{
  accessToken: string;
}
```

**Response** (200):
```typescript
{
  success: true;
}
```

**Side Effects**:
- Sets `sb-*-auth-token` cookie
- Migrates guest data to authenticated user (SEC-003)
- Prewarms user cache (PERF-004)

**Errors**:

| Code | Status | Description |
|------|--------|-------------|
| `validation:invalid_input` | 400 | Missing or invalid accessToken |
| `auth:invalid_token` | 401 | Token validation failed |

---

#### POST /api/auth/logout

**File**: `app/api/auth/logout/route.ts`  
**Auth**: None  
**Rate Limit**: `auth` (20/min)

Clears all authentication cookies.

**Request Body**: None

**Response** (200):
```typescript
{
  success: true;
  message: "Logged out successfully";
}
```

---

### 4.2 Chat Routes

---

#### POST /api/chat

**File**: `app/api/chat/route.ts`  
**Auth**: Required (authenticated or guest)  
**Rate Limit**: `chat` (50/min with burst: 10)  
**Max Duration**: 55s (serverless limit)

Handles chat message submission and streams AI response.

**Request Body**:
```typescript
{
  id: string;          // Chat ID (UUID)
  messages: UIMessage[];
  modelId?: string;    // Optional model override
}

interface UIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content?: string;
  parts?: MessagePart[];
  createdAt?: Date;
}

type MessagePart = 
  | { type: "text"; text: string }
  | { type: "file"; url: string; name?: string; mediaType: string };
```

**Response** (200): `ReadableStream` (SSE)

See [Streaming API](#6-streaming-api) for stream format.

**Errors**:

| Code | Status | Description |
|------|--------|-------------|
| `auth:unauthorized` | 401 | No valid session |
| `validation:invalid_input` | 400 | Invalid request body |
| `validation:model_restricted` | 403 | Model not allowed for guests |
| `rate_limited` | 429 | Too many requests |
| `ai:provider_error` | 502 | AI provider failed |
| `ai:content_filter` | 400 | Content blocked by safety filter |
| `ai:token_limit` | 400 | Token limit exceeded |

---

### 4.3 History Routes

---

#### GET /api/history

**File**: `app/api/history/route.ts`  
**Auth**: Required (authenticated only)  
**Rate Limit**: `standard` (100/min)

Fetches paginated chat history for the authenticated user.

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 20 | Items per page (max: 100) |
| `cursor` | string | - | Pagination cursor |

**Response** (200):
```typescript
{
  chats: Array<{
    id: string;
    title: string;
    createdAt: Date;
    visibility: "private" | "public";
    userId: string;
  }>;
  hasMore: boolean;
  nextCursor: string | null;
}
```

**Errors**:

| Code | Status | Description |
|------|--------|-------------|
| `auth:unauthorized` | 401 | No valid session |
| `internal:error` | 500 | Database error |

---

#### DELETE /api/history

**File**: `app/api/history/route.ts`  
**Auth**: Required (authenticated only)  
**Rate Limit**: `standard` (100/min)

Deletes all chat history for the authenticated user.

**Request Body**: None

**Response** (200):
```typescript
{
  success: true;
}
```

**Errors**:

| Code | Status | Description |
|------|--------|-------------|
| `auth:unauthorized` | 401 | No valid session |
| `internal:error` | 500 | Deletion failed |

---

### 4.4 Document Routes

---

#### GET /api/document

**File**: `app/api/document/route.ts`  
**Auth**: Required  
**Rate Limit**: `standard` (100/min)  
**Max Duration**: 10s

Fetches all versions of a document by ID.

**Query Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Document ID |

**Response** (200):
```typescript
Array<{
  id: string;
  content: string;
  title: string;
  kind: "text" | "code" | "image" | "sheet";
  chatId: string;
  createdAt: Date;
}>
```

**Headers**:
```
Cache-Control: private, max-age=60
```

**Errors**:

| Code | Status | Description |
|------|--------|-------------|
| `validation:missing_parameter` | 400 | Missing id parameter |
| `validation:invalid_format` | 400 | Invalid UUID format |
| `auth:unauthorized` | 401 | No valid session |
| `resource:not_found:document` | 404 | Document not found |

---

#### POST /api/document

**File**: `app/api/document/route.ts`  
**Auth**: Required  
**Rate Limit**: `standard` (100/min)  
**Max Duration**: 10s

Creates a new document version.

**Query Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Document ID |

**Request Body**:
```typescript
{
  content: string;   // Max 1MB
  title: string;     // 1-500 chars
  kind: "text" | "code" | "image" | "sheet";
}
```

**Response** (200):
```typescript
{
  id: string;
  content: string;
  title: string;
  kind: string;
  chatId: string;
  createdAt: Date;
}
```

**Errors**:

| Code | Status | Description |
|------|--------|-------------|
| `validation:missing_parameter` | 400 | Missing id parameter |
| `validation:invalid_format` | 400 | Invalid UUID format |
| `validation:invalid_body` | 400 | Invalid JSON body |
| `validation:invalid_input` | 400 | Schema validation failed |
| `validation:kind_mismatch` | 400 | Cannot change document kind |
| `validation:no_chat_context` | 400 | No chat context for document |
| `auth:unauthorized` | 401 | No valid session |

---

#### DELETE /api/document

**File**: `app/api/document/route.ts`  
**Auth**: Required  
**Rate Limit**: `standard` (100/min)  
**Max Duration**: 10s

Deletes document versions after a specific timestamp.

**Query Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Document ID |
| `timestamp` | ISO 8601 | Yes | Delete versions after this time |

**Response** (200):
```typescript
Array<{
  id: string;
  createdAt: Date;
  // ... deleted version data
}>
```

**Errors**:

| Code | Status | Description |
|------|--------|-------------|
| `validation:missing_parameter` | 400 | Missing required parameter |
| `validation:invalid_format` | 400 | Invalid UUID or timestamp format |
| `auth:unauthorized` | 401 | No valid session |
| `resource:not_found:document` | 404 | No versions found to delete |

---

### 4.5 Suggestions Routes

---

#### GET /api/suggestions

**File**: `app/api/suggestions/route.ts`  
**Auth**: Required  
**Rate Limit**: `search` (1000/min)  
**Max Duration**: 10s

Gets suggestions for a document.

**Query Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `documentId` | UUID | Yes | Document ID |

**Response** (200):
```typescript
Array<{
  id: string;
  documentId: string;
  content: string;
  createdAt: Date;
}>
```

**Headers**:
```
Cache-Control: private, max-age=300
```

**Notes**:
- Guest users receive empty array (no persistence)
- Returns empty array if document not found (IDOR protection)

**Errors**:

| Code | Status | Description |
|------|--------|-------------|
| `validation:invalid_input` | 400 | Missing or invalid documentId |
| `auth:unauthorized` | 401 | No valid session |

---

### 4.6 Vote Routes

---

#### PATCH /api/vote

**File**: `app/api/vote/route.ts`  
**Auth**: Required (authenticated only)  
**Rate Limit**: `standard` (100/min)  
**Max Duration**: 10s

Submits or updates a vote on a message.

**Request Body**:
```typescript
{
  chatId: string;    // UUID
  messageId: string; // UUID
  type: "up" | "down";
}
```

**Response** (200):
```typescript
{
  success: true;
  messageId: string;
  type: "up" | "down";
}
```

**Errors**:

| Code | Status | Description |
|------|--------|-------------|
| `validation:invalid_input` | 400 | Invalid request body |
| `auth:unauthorized` | 401 | No valid session |
| `auth:forbidden` | 403 | Guest users cannot vote |
| `resource:not_found:chat` | 404 | Chat not found |
| `resource:not_found:message` | 404 | Message not found in chat |
| `rate_limited` | 429 | Too many vote requests |
| `internal:database` | 500 | Failed to save vote |

---

### 4.7 File Upload Routes

---

#### POST /api/files/upload

**File**: `app/api/files/upload/route.ts`  
**Auth**: Required  
**Rate Limit**: `upload` (10/hour)  
**Max Duration**: 30s

Uploads a file attachment for chat.

**Content-Type**: `multipart/form-data`

**Request Body**:
```
file: Blob (max 5MB)
```

**Allowed MIME Types**:
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Documents: `application/pdf`, `text/plain`, `text/markdown`, `text/csv`
- Code: `application/json`, `application/javascript`, `text/javascript`, `text/typescript`

**Response** (200):
```typescript
{
  url: string;           // Blob URL
  pathname: string;      // Storage path
  contentType: string;   // MIME type
}
```

**Errors**:

| Code | Status | Description |
|------|--------|-------------|
| `validation:invalid_input` | 400 | No file uploaded |
| `validation:file_too_large` | 400 | File exceeds 5MB limit |
| `validation:file_type_unsupported` | 400 | Unsupported MIME type |
| `auth:unauthorized` | 401 | No valid session |
| `internal:configuration` | 500 | Blob storage not configured |

---

### 4.8 Health Check Routes

---

#### GET /api/health

**File**: `app/api/health/route.ts`  
**Auth**: None  
**Rate Limit**: None  
**Max Duration**: 10s

Legacy health check endpoint with full diagnostics.

**Response** (200):
```typescript
{
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    database: {
      status: "healthy" | "degraded" | "unhealthy";
      latency?: number;
      error?: string;
    };
    cache: {
      status: "healthy" | "degraded" | "unhealthy";
      latency?: number;
      error?: string;
    };
    environment: {
      status: "healthy" | "unhealthy";
      error?: string;
    };
    external?: {
      status: "healthy" | "degraded" | "unhealthy";
      latency?: number;
      error?: string;
    };
  };
}
```

**Thresholds**:
- Database latency > 1000ms = degraded
- Cache latency > 500ms = degraded
- External API latency > 2000ms = degraded

---

#### GET /api/healthz

**File**: `app/api/healthz/route.ts`  
**Auth**: None  
**Rate Limit**: None

Kubernetes liveness probe. Fast, no dependency checks.

**Response** (200):
```typescript
{
  status: "alive";
  timestamp: string;
}
```

**Headers**:
```
Cache-Control: no-cache, no-store, must-revalidate
X-Probe-Type: liveness
```

---

#### GET /api/readyz

**File**: `app/api/readyz/route.ts`  
**Auth**: None  
**Rate Limit**: None  
**Max Duration**: 10s

Kubernetes readiness probe. Checks database and cache connectivity.

**Response** (200 or 503):
```typescript
{
  status: "ready" | "not_ready";
  timestamp: string;
  checks: Array<{
    name: string;
    status: "healthy" | "unhealthy";
    latencyMs?: number;
    error?: string;
  }>;
}
```

**Thresholds**:
- Check timeout: 5000ms
- Database latency > 3000ms = unhealthy
- Cache latency > 1000ms = unhealthy

---

## 5. Error Codes

### Error Code Format

Error codes follow a hierarchical format: `category:subcategory:detail`

### Complete Error Code Reference

| Code | HTTP | Description | Resolution |
|------|------|-------------|------------|
| **Authentication Errors** ||||
| `auth:unauthorized` | 401 | No valid session | Login required |
| `auth:invalid_token` | 401 | Token validation failed | Re-authenticate |
| `auth:forbidden` | 403 | No permission for action | Check user type |
| `auth:guest_unavailable` | 500 | Guest auth not configured | Contact admin |
| **Validation Errors** ||||
| `validation:invalid_input` | 400 | Schema validation failed | Check request format |
| `validation:invalid_body` | 400 | Invalid JSON body | Fix JSON syntax |
| `validation:invalid_format` | 400 | Invalid format (UUID, etc.) | Use correct format |
| `validation:missing_parameter` | 400 | Required parameter missing | Add required param |
| `validation:kind_mismatch` | 400 | Document kind change attempt | Use original kind |
| `validation:no_chat_context` | 400 | Document has no chat | Create in chat first |
| `validation:model_restricted` | 403 | Model not allowed for user | Use allowed model |
| `validation:file_too_large` | 400 | File exceeds size limit | Reduce file size |
| `validation:file_type_unsupported` | 400 | Unsupported file type | Use allowed type |
| **Resource Errors** ||||
| `resource:not_found:chat` | 404 | Chat not found | Check chat ID |
| `resource:not_found:message` | 404 | Message not found | Check message ID |
| `resource:not_found:document` | 404 | Document not found | Check document ID |
| **Rate Limit Errors** ||||
| `rate_limited` | 429 | Too many requests | Wait and retry |
| **AI Errors** ||||
| `ai:provider_error` | 502 | AI provider failed | Retry later |
| `ai:content_filter` | 400 | Content blocked | Modify content |
| `ai:token_limit` | 400 | Token limit exceeded | Reduce input size |
| `ai:model_not_found` | 400 | Model not available | Use valid model |
| `ai:streaming_error` | 500 | Stream processing failed | Retry |
| **Internal Errors** ||||
| `internal:error` | 500 | Unexpected server error | Report issue |
| `internal:database` | 500 | Database operation failed | Retry later |
| `internal:configuration` | 500 | Server misconfigured | Contact admin |

---

## 6. Streaming API

### Stream Format

The chat API uses Server-Sent Events (SSE) with the Vercel AI SDK streaming format.

**Headers**:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Vercel-AI-Data-Stream: v1
```

### Stream Events

```typescript
// Text delta
data: {"type":"text-delta","textDelta":"Hello"}

// Tool call start
data: {"type":"tool-call","toolCallId":"abc123","toolName":"search","args":{}}

// Tool result
data: {"type":"tool-result","toolCallId":"abc123","result":{}}

// Reasoning (for reasoning models)
data: {"type":"reasoning","reasoning":"Let me think..."}

// Finish
data: {"type":"finish","finishReason":"stop","usage":{"promptTokens":10,"completionTokens":50}}

// Error
data: {"type":"error","error":"Provider error"}
```

### Stream Lifecycle

```
┌──────────────────────────────────────────────────┐
│                  Stream Start                     │
│  → Validate request                               │
│  → Setup model & tools                            │
│  → Generate title (new chats)                     │
└─────────────────────┬────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────┐
│                  Streaming                        │
│  → Text deltas sent as generated                  │
│  → Tool calls/results interleaved                 │
│  → Reasoning tokens for o1/o3 models              │
└─────────────────────┬────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────┐
│                  Completion                       │
│  → Finish event with usage stats                  │
│  → Messages persisted to database                 │
│  → Stream closed                                  │
└──────────────────────────────────────────────────┘
```

### Abort Handling

Streams support abort via:
1. Client disconnect
2. Timeout (55s serverless limit)
3. Combined abort signal monitors both

```typescript
const abortSignal = createStreamAbortSignal(request, AI_COMPLETION_TIMEOUT_MS);
```

---

## 7. Middleware

### Middleware Stack

Applied via Next.js `middleware.ts`:

```
Request
   │
   ▼
┌────────────────────┐
│   CORS Headers     │  → Add CORS for API routes
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│   Rate Limiting    │  → Redis-based, IP + route key
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│   Auth Check       │  → Session validation
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│   Request Valid.   │  → Zod schema validation
└─────────┬──────────┘
          │
          ▼
     Route Handler
```

### CORS Configuration

```typescript
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGINS || "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};
```

### Auth Middleware

```typescript
// Routes requiring authentication
const AUTH_REQUIRED_ROUTES = [
  "/api/chat",
  "/api/history",
  "/api/document",
  "/api/vote",
  "/api/files/upload",
  "/api/suggestions",
];

// Routes allowing guest access
const GUEST_ALLOWED_ROUTES = [
  "/api/chat",
  "/api/suggestions",
];
```

### Request Validation

Each route uses Zod schemas for validation:

```typescript
// Example: Chat request validation
const chatRequestSchema = z.object({
  id: z.string().min(1, "Chat ID is required"),
  messages: z.array(uiMessageSchema).min(1, "At least one message is required"),
  modelId: z.string().optional(),
});
```

---

## Appendix A: Type Definitions

### Core Types

```typescript
// lib/auth/types.ts
type UserType = "authenticated" | "guest";

interface AppUser {
  id: string;
  type: UserType;
  email?: string;
  name?: string;
  image?: string;
}

interface AppSession {
  user: AppUser;
  expires?: string;
}

// lib/db/schema.ts
interface Chat {
  id: string;
  userId: string;
  title: string;
  visibility: "private" | "public";
  createdAt: Date;
}

interface Message {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  parts: MessagePart[];
  attachments: Attachment[];
  createdAt: Date;
}

interface Document {
  id: string;
  chatId: string;
  title: string;
  content: string;
  kind: "text" | "code" | "image" | "sheet";
  createdAt: Date;
}

interface Vote {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}
```

---

## Appendix B: Security Considerations

### Authentication Security

- **SEC-001**: IP-based rate limiting prevents guest session cycling
- **SEC-003**: Guest data migrated atomically on auth
- **IDOR Protection**: All resource access validated against user ownership

### Input Validation

- All endpoints validate input with Zod schemas
- UUID format enforced for all IDs
- File uploads validated for type and size
- SQL injection prevented via parameterized queries (Drizzle ORM)

### Rate Limiting

- Redis-based with fallback to memory
- Fail-closed: If Redis unavailable, requests blocked (not allowed)
- Per-IP and per-route rate limiting
- Guest users get stricter limits

---

## Appendix C: Performance Optimizations

### Caching Strategy

| Resource | TTL | Cache Location |
|----------|-----|----------------|
| Session | Request-scoped | Memory |
| Chat list | 60s | Redis |
| Document | 60s | HTTP Cache-Control |
| Suggestions | 300s | HTTP Cache-Control |
| Health check | 5s | Memory |

### Vercel Optimizations

```typescript
// Fluid Compute optimization
export const maxDuration = 10; // 10s for most routes
export const maxDuration = 30; // 30s for uploads
export const maxDuration = 55; // 55s for chat (serverless limit)

// Dynamic rendering
export const dynamic = "force-dynamic"; // Health routes
export const runtime = "nodejs"; // Health routes
```

---

*Last Updated: 2024-12-27*
