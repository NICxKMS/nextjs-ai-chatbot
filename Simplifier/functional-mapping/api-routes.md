# API Routes Functional Mapping

## Overview

This document maps all API endpoints in `app/api/` to their functionality, request/response schemas, and dependencies.

---

## Endpoint Summary Table

| Endpoint | Method | Purpose | Auth Required | Rate Limited |
|----------|--------|---------|---------------|--------------|
| `/api/chat` | POST | Stream AI chat responses | Yes | Yes (chat) |
| `/api/chat` | DELETE | Delete a chat | Yes | Yes (chat) |
| `/api/chat/[id]/messages` | GET | Get paginated messages | Yes | No |
| `/api/chat/[id]/reconnect` | GET | Reconnect to stream | Yes | Yes (api) |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handlers | Varies | No |
| `/api/auth/callback` | GET | OAuth callback | No | No |
| `/api/auth/guest` | GET | Create guest session (redirect) | No | Yes (guest) |
| `/api/auth/guest` | POST | Create guest session (JSON) | No | Yes (guest) |
| `/api/auth/logout` | POST | Terminate session | No | No |
| `/api/auth/session` | GET | Get current session | No | No |
| `/api/artifacts` | GET | Get artifact versions | Yes | Yes (api) |
| `/api/artifacts` | POST | Create artifact | Yes | Yes (api) |
| `/api/artifacts` | PATCH | Update artifact | Yes | Yes (api) |
| `/api/artifacts` | DELETE | Delete artifact | Yes | Yes (strict) |
| `/api/history` | GET | Get chat history | Yes | Yes (api) |
| `/api/history` | DELETE | Delete all chats | Yes | Yes (strict) |
| `/api/suggestions` | GET | Get artifact suggestions | Yes | Yes (api) |
| `/api/votes` | GET | Get chat votes | Yes | Yes (api) |
| `/api/votes` | PATCH | Create/update vote | Yes | Yes (strict) |
| `/api/files/upload` | POST | Upload file to Blob | Yes | Yes (upload) |
| `/api/health` | GET | Health check | No | Yes (public) |

---

## Detailed Endpoint Mapping

### 1. Chat API (`/api/chat`)

#### POST `/api/chat`

**Purpose**: Main chat streaming endpoint. Creates AI message streams using AI SDK and returns SSE responses for real-time streaming.

**Request Body**:
```typescript
interface ChatPostBody {
  id: string;                    // Chat ID (UUID)
  message: UIMessage;            // User message with parts
  selectedChatModel: string;     // AI model ID
  selectedVisibilityType: "public" | "private";
  settings?: ChatSettings;       // Optional settings
}
```

**Response**: SSE stream with AI response chunks

**Dependencies**:
- [`executeChatCompletion`](../../lib/ai) - AI completion execution
- [`chatService`](../../lib/data/services/chat.service) - Chat persistence
- [`getSession`](../../lib/auth/session) - Authentication
- [`checkChatLimit`](../../lib/rate-limit) - Rate limiting
- [`geolocation`](@vercel/functions) - Location hints

**Flow**:
1. Validate model ID
2. Get session
3. Check rate limit
4. Check if new or existing chat
5. Build UI messages from DB + new message
6. Create SSE stream with AI completion
7. Save messages on finish

---

#### DELETE `/api/chat?id=<chatId>`

**Purpose**: Delete a chat conversation with all its messages and votes.

**Query Parameters**:
- `id`: Chat ID (UUID, required)

**Response**:
```typescript
// Success (200)
{ id: string }

// Error responses: 400, 401, 403, 404, 429, 500
{ error: string }
```

**Dependencies**:
- [`chatService.deleteChat`](../../lib/data/services/chat.service)
- [`getSession`](../../lib/auth/session)
- [`checkChatLimit`](../../lib/rate-limit)

---

### 2. Chat Messages API (`/api/chat/[id]/messages`)

#### GET `/api/chat/[id]/messages`

**Purpose**: Fetch paginated messages for a chat. Delegates to feature actions.

**Route Parameters**:
- `id`: Chat ID (UUID)

**Response**:
```typescript
{ success: true, data: { messages: Message[] } }
```

**Dependencies**:
- [`getChatAction`](../../features/chat/actions)
- [`requireAuthAction`](../../lib/auth/guards)

**Note**: This is a thin wrapper around the feature action - follows slim route pattern.

---

### 3. Chat Reconnect API (`/api/chat/[id]/reconnect`)

#### GET `/api/chat/[id]/reconnect`

**Purpose**: SSE reconnection endpoint for resuming chat streams.

**Route Parameters**:
- `id`: Chat ID (UUID)

**Query Parameters**:
- `lastEventId`: Last event ID received (optional)
- `retryCount`: Current retry attempt number (optional)

**Response Headers**:
- `Retry-After`: Suggested delay before next reconnect
- `X-Reconnect-Window`: Time window for valid reconnection (15s)
- `X-Message-Age`: Age of the message in seconds
- `X-Message-Id`: ID of the replayed message

**Response**: SSE stream with replayed assistant message or empty stream

**Dependencies**:
- [`chatService.getWithMessages`](../../lib/data/services/chat.service)
- [`requireAuthAction`](../../lib/auth/guards)
- [`requireRateLimit`](../../lib/auth/guards)

**Constants**:
- `RECONNECT_WINDOW_SECONDS = 15`
- `DEFAULT_RETRY_AFTER_SECONDS = 1`
- `MAX_RETRY_AFTER_SECONDS = 30`

---

### 4. Authentication APIs (`/api/auth/*`)

#### `/api/auth/[...nextauth]` (GET/POST)

**Purpose**: Catch-all route for NextAuth.js v5 authentication endpoints.

**Dependencies**:
- [`handlers`](../../lib/auth) - NextAuth handlers

**Note**: Delegates entirely to NextAuth - no custom logic.

---

#### GET `/api/auth/callback`

**Purpose**: Handles OAuth provider callbacks (Google, GitHub, etc.).

**Dependencies**:
- [`handlers.GET`](../../lib/auth)

**Note**: Simple re-export of NextAuth handler.

---

#### GET `/api/auth/guest`

**Purpose**: Server-side guest session creation with redirect support.

**Query Parameters**:
- `redirectUrl`: URL to redirect after session creation (default: "/")

**Response**: Redirect to `redirectUrl`

**Security**:
- Validates redirect URL to prevent open redirect attacks
- Only allows relative paths or same-origin URLs

**Dependencies**:
- [`getOrCreateGuestSession`](../../lib/auth)
- [`getSession`](../../lib/auth/session)
- [`getSafeRedirectUrl`](../../lib/utils)

---

#### POST `/api/auth/guest`

**Purpose**: Create or retrieve a guest session (JSON response).

**Response**:
```typescript
{
  success: true,
  data: {
    user: { id: string, type: "guest" },
    isNewSession: boolean
  }
}
```

**Security**:
- CSRF protection via Origin/Referer validation
- Rate limited (5 req/min per IP)

**Dependencies**:
- [`validateOrigin`](../../lib/api)
- [`checkGuestLimit`](../../lib/rate-limit)
- [`getOrCreateGuestSession`](../../lib/auth)

---

#### POST `/api/auth/logout`

**Purpose**: Terminate the current session and clear all auth cookies.

**Response**:
```typescript
{ success: true, data: { success: true, message: "Logged out successfully" } }
```

**Security**:
- CSRF protection via Origin validation

**Dependencies**:
- [`signOut`](../../lib/auth)
- [`validateOrigin`](../../lib/api)

---

#### GET `/api/auth/session`

**Purpose**: Returns the current session state for client-side polling.

**Response**:
```typescript
{ success: true, data: { session: AppSession | null } }
```

**Dependencies**:
- [`getSession`](../../lib/auth/session)

---

### 5. Artifacts API (`/api/artifacts`)

#### GET `/api/artifacts?id=<uuid>`

**Purpose**: Fetch all versions of an artifact by ID.

**Query Parameters**:
- `id`: Artifact UUID (required)

**Response**: Array of artifact versions (chronologically ordered)

**Dependencies**:
- [`getVersionHistory`](../../features/artifact/actions/versions)
- [`requireAuthAction`](../../lib/auth/guards)
- [`checkApiLimit`](../../lib/rate-limit)

---

#### POST `/api/artifacts`

**Purpose**: Create a new artifact.

**Request Body**:
```typescript
{
  chatId: string;      // UUID (required)
  title: string;       // 1-500 chars (required)
  kind: "text" | "code" | "image" | "sheet"; // (required)
  content?: string;    // Max 1MB (optional, defaults to "")
}
```

**Dependencies**:
- [`createArtifact`](../../features/artifact/actions)
- [`validateBody`](../../lib/api)
- [`CreateArtifactSchema`](../../features/artifact/schemas)

---

#### PATCH `/api/artifacts?id=<uuid>[&version=timestamp]`

**Purpose**: Update an existing artifact.

**Query Parameters**:
- `id`: Artifact UUID (required)
- `version`: ISO timestamp for specific version (optional)

**Request Body**:
```typescript
{
  title?: string;
  content?: string;
  kind?: string;  // Must match existing kind
}
```

**Dependencies**:
- [`updateArtifact`](../../features/artifact/actions)
- [`getVersionHistory`](../../features/artifact/actions/versions)

---

#### DELETE `/api/artifacts?id=<uuid>`

**Purpose**: Delete an artifact.

**Rate Limit**: Strict (10 req/min)

**Dependencies**:
- [`deleteArtifact`](../../features/artifact/actions)
- [`checkStrictLimit`](../../lib/rate-limit)

---

### 6. History API (`/api/history`)

#### GET `/api/history`

**Purpose**: Get paginated chat history for the current user.

**Query Parameters**:
- `cursor`: Pagination cursor (encoded timestamp)
- `limit`: Number of chats (1-100, default 20)
- `direction`: "forward" | "backward" (default: "forward")
- `q`: Search query for title filtering
- `from`: Date filter (ISO date string)
- `to`: Date filter (ISO date string)

**Response**:
```typescript
{
  success: true,
  data: [...chats],
  pagination: {
    nextCursor: string | null,
    prevCursor: string | null,
    hasMore: boolean,
    links: { next: "...", prev: "..." }
  }
}
```

**Dependencies**:
- [`getHistoryAction`](../../features/chat/actions)
- [`CursorCodec`](#cursor-codec) - Base64url encoding/decoding

---

#### DELETE `/api/history`

**Purpose**: Delete all chats for the current user.

**Rate Limit**: Strict (10 req/min)

**Dependencies**:
- [`deleteAllChatsAction`](../../features/chat/actions)

---

### 7. Suggestions API (`/api/suggestions`)

#### GET `/api/suggestions?artifactId=<uuid>`

**Purpose**: Get AI suggestions for an artifact.

**Security**:
- Verifies artifact exists
- Verifies user owns the chat the artifact belongs to
- Guest users receive empty array

**Response**: Array of suggestions (not wrapped)

**Dependencies**:
- [`artifactRepository.findLatestVersion`](../../lib/data/repositories)
- [`suggestionRepository.findByArtifactId`](../../lib/data/repositories)

---

### 8. Votes API (`/api/votes`)

#### GET `/api/votes?chatId=<uuid>`

**Purpose**: Get all votes for a chat that belong to the current user.

**Security**:
- Verifies chat ownership before returning votes

**Dependencies**:
- [`chatRepository.findById`](../../lib/data/repositories)
- [`voteRepository.findByChatIdAndUserId`](../../lib/data/repositories)

---

#### PATCH `/api/votes`

**Purpose**: Create or update a vote on a message.

**Request Body**:
```typescript
{
  chatId: string;      // UUID
  messageId: string;   // UUID
  type: "up" | "down";
}
```

**Security**:
- Requires non-guest user
- Verifies chat ownership
- Verifies message belongs to chat

**Dependencies**:
- [`chatService.voteMessage`](../../lib/data/services/chat.service)
- [`requireNonGuest`](../../lib/auth/guards)

---

### 9. Files Upload API (`/api/files/upload`)

#### POST `/api/files/upload`

**Purpose**: Upload a file to Vercel Blob storage.

**Request**: Multipart form data with `file` field

**Rate Limit**: 10 uploads per hour per user

**File Validation**:
- MIME type validation (16 explicit types + image/audio/video prefixes)
- File size limit: 5MB
- Filename sanitization (path traversal prevention)

**Response**:
```typescript
{
  url: string;
  pathname: string;
  contentType: string;
  filename: string;
}
```

**Dependencies**:
- [`put`](@vercel/blob)
- [`validateAttachment`](../../lib/utils/file-validation)
- [`checkUploadLimit`](../../lib/rate-limit)

---

### 10. Health API (`/api/health`)

#### GET `/api/health`

**Purpose**: Health check endpoint for monitoring.

**Response**:
```typescript
{
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    database: { status: string; latency?: number; error?: string };
    cache: { status: string; latency?: number; error?: string };
    environment: { status: string; error?: string };
  }
}
```

**Checks**:
1. **Database**: `SELECT 1` query with latency check (>1s = degraded)
2. **Cache**: Redis ping (not configured = degraded)
3. **Environment**: Required env vars (DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY)

**Dependencies**:
- [`db`](../../lib/db) - Database client
- [`getRedisClient`](../../lib/cache) - Redis client
- [`publicMiddleware`](../../lib/middleware) - Rate limiting wrapper

---

## Dependency Map

```mermaid
graph TD
    subgraph "API Routes"
        chat[chat/route.ts]
        messages[chat/[id]/messages/route.ts]
        reconnect[chat/[id]/reconnect/route.ts]
        nextauth[auth/[...nextauth]/route.ts]
        callback[auth/callback/route.ts]
        guest[auth/guest/route.ts]
        logout[auth/logout/route.ts]
        session[auth/session/route.ts]
        artifacts[artifacts/route.ts]
        history[history/route.ts]
        suggestions[suggestions/route.ts]
        votes[votes/route.ts]
        upload[files/upload/route.ts]
        health[health/route.ts]
    end

    subgraph "Feature Actions"
        chatActions[features/chat/actions]
        artifactActions[features/artifact/actions]
    end

    subgraph "Services"
        chatService[lib/data/services/chat.service]
    end

    subgraph "Repositories"
        chatRepo[lib/data/repositories/chat]
        artifactRepo[lib/data/repositories/artifact]
        voteRepo[lib/data/repositories/vote]
        suggestionRepo[lib/data/repositories/suggestion]
    end

    subgraph "Auth"
        guards[lib/auth/guards]
        sessionLib[lib/auth/session]
        authLib[lib/auth]
    end

    subgraph "Infrastructure"
        rateLimit[lib/rate-limit]
        apiLib[lib/api]
        db[lib/db]
        cache[lib/cache]
    end

    chat --> chatService
    chat --> guards
    chat --> rateLimit
    
    messages --> chatActions
    messages --> guards
    
    reconnect --> chatService
    reconnect --> guards
    
    guest --> authLib
    guest --> rateLimit
    
    logout --> authLib
    logout --> apiLib
    
    session --> sessionLib
    
    artifacts --> artifactActions
    artifacts --> guards
    artifacts --> rateLimit
    
    history --> chatActions
    history --> guards
    history --> rateLimit
    
    suggestions --> artifactRepo
    suggestions --> suggestionRepo
    suggestions --> guards
    
    votes --> chatService
    votes --> chatRepo
    votes --> voteRepo
    votes --> guards
    
    upload --> rateLimit
    upload --> apiLib
    
    health --> db
    health --> cache
```

---

## Route Categories

### 1. **Slim Routes** (Delegates to Feature Actions)
- `/api/chat/[id]/messages` - Uses `getChatAction`
- `/api/artifacts` - Uses artifact actions
- `/api/history` - Uses chat actions

### 2. **Service Routes** (Uses Service Layer)
- `/api/chat` - Uses `chatService`
- `/api/chat/[id]/reconnect` - Uses `chatService`
- `/api/votes` - Uses `chatService`

### 3. **Repository Routes** (Direct Repository Access)
- `/api/suggestions` - Uses repositories directly

### 4. **Auth Routes** (NextAuth or Custom Auth)
- `/api/auth/[...nextauth]` - NextAuth handlers
- `/api/auth/callback` - NextAuth handler
- `/api/auth/guest` - Custom guest session
- `/api/auth/logout` - Custom logout
- `/api/auth/session` - Session polling

### 5. **Infrastructure Routes**
- `/api/health` - System health check
- `/api/files/upload` - File upload to Blob storage

---

## Notes

1. **Pattern Consistency**: Most routes follow the slim route pattern, delegating to feature actions or services.

2. **Rate Limiting**: Three tiers of rate limiting:
   - `api`: 100 req/min (standard)
   - `strict`: 10 req/min (destructive operations)
   - `chat`: Chat-specific limits
   - `guest`: 5 req/min per IP
   - `upload`: 10 req/hour per user

3. **Authentication Patterns**:
   - `requireAuthAction()`: Standard auth check
   - `requireNonGuest()`: Excludes guest users
   - `isGuestSession()`: Check for guest limitations

4. **Error Handling**: Routes use centralized `error()` helper from `lib/api` for consistent error responses.
