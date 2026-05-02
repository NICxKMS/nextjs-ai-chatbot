# Data Flow And APIs

This document defines how data enters, moves through, mutates, streams from, and refreshes in the app.

## API Surface

| Surface | Type | Purpose |
|---|---|---|
| `POST /api/chat` | Route Handler | SSE chat stream through the AI SDK |
| `GET /api/history` | Route Handler | Cursor-based sidebar history pagination |
| `GET /api/artifact` | Route Handler | Fetch artifact versions |
| `POST /api/artifact` | Route Handler | Save or restore an artifact version |
| `GET /api/suggestions` | Route Handler | Fetch saved artifact suggestions |
| `POST /api/files/upload` | Route Handler | Upload attachments to Vercel Blob |
| `GET /api/health` | Route Handler | Public health check for database and Redis |
| `deleteChat` | Server Action | Delete one chat |
| `deleteAllChats` | Server Action | Delete all chats for the current user |
| `renameChat` | Server Action | Rename a chat from the sidebar |
| `deleteTrailingMessages` | Server Action | Delete messages after an edited message |
| `voteOnMessage` | Server Action | Upsert assistant message vote |
| `updateChatVisibility` | Server Action | Set chat public/private visibility |
| `login`, `register`, `logout` | Server Actions | Auth form and session mutations |

## Route Handler Contracts

### `POST /api/chat`

Auth is required. Guest sessions are allowed. The request is rate limited.

```typescript
type ChatRequest = {
  id: string
  message: {
    id: string
    role: 'user'
    parts: Array<
      | { type: 'text'; text: string }
      | { type: 'file'; mediaType: string; name: string; url: string }
    >
    createdAt?: string
  }
  selectedChatModel: string
  selectedVisibilityType: 'public' | 'private'
  settings?: {
    temperature: number
    topP: number
    maxOutputTokens: number
    systemPrompt: string
    enableReasoning: boolean
  }
}
```

Response is an SSE stream using the AI SDK UI message stream protocol plus custom data parts. Pre-stream failures return structured `AppError` JSON.

Side effects are chat creation when needed, user message persistence, assistant message persistence, title update, artifact persistence through tools, and cache revalidation with `revalidateTag(tag, 'max')`.

### `GET /api/history`

```typescript
type HistoryResponse = {
  chats: Chat[]
  nextCursor?: string
  hasMore: boolean
}
```

Query params are `limit` and optional `cursor`. Limit defaults to `20` and is clamped from `1` to `100`. The response is scoped to the current session user, including guest users.

### `GET /api/artifact`

Query is `id=<artifact uuid>`. Response is an array of artifact versions ordered newest first.

```typescript
type ArtifactVersionsResponse = Artifact[]
```

### `POST /api/artifact`

Save mode creates a new version row.

```typescript
type SaveArtifactRequest = {
  id: string
  mode?: 'save'
  title: string
  content: string
  kind: 'text' | 'code' | 'sheet' | 'image'
}

type SaveArtifactResponse = {
  artifact: Artifact
}
```

Restore mode removes versions newer than the target timestamp and refreshes `artifact:{id}`.

```typescript
type RestoreArtifactRequest = {
  id: string
  mode: 'restore'
  timestamp: string
}

type RestoreArtifactResponse = {
  success: true
}
```

### `GET /api/suggestions`

Query is `artifactId=<uuid>`. Response:

```typescript
type SuggestionsResponse = {
  suggestions: Array<{
    id: string
    artifactId: string
    artifactCreatedAt: string
    originalText: string
    suggestedText: string
    description: string
    isResolved: boolean
  }>
}
```

### `POST /api/files/upload`

Accepts multipart form data with one file. Stores through Vercel Blob. Response:

```typescript
type UploadResponse = {
  url: string
  pathname: string
  contentType: string
}
```

### `GET /api/health`

Public endpoint. It checks Postgres and Redis.

```typescript
type HealthResponse = {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: {
    database: { status: 'healthy' | 'unhealthy'; latencyMs: number; error?: string }
    cache: { status: 'healthy' | 'unhealthy'; latencyMs: number; error?: string }
  }
}
```

## Server Action Envelope

Expected action failures return values, not thrown errors.

```typescript
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }
```

## Revalidation Matrix

| Mutation | Location | Tags | Primitive |
|---|---|---|---|
| Send message stream finish | Route Handler | `chat:{id}`, `chats:{userId}` | `revalidateTag(tag, 'max')` |
| Create chat during stream | Route Handler | `chats:{userId}` | `revalidateTag(tag, 'max')` |
| Update title during stream | Route Handler | `chat:{id}`, `chats:{userId}` | `revalidateTag(tag, 'max')` |
| Save artifact version | Route Handler | `artifact:{id}` | `revalidateTag(tag, 'max')` |
| Restore artifact version | Route Handler | `artifact:{id}` | `revalidateTag(tag, 'max')` |
| Delete chat | Server Action | `chats:{userId}` | `updateTag` |
| Delete all chats | Server Action | `chats:{userId}` | `updateTag` |
| Rename chat | Server Action | `chat:{id}`, `chats:{userId}` | `updateTag` |
| Delete trailing messages | Server Action | `chat:{id}` | `updateTag` |
| Vote on message | Server Action | `votes:{chatId}` | `updateTag` |
| Update chat visibility | Server Action | `chat:{id}`, `chats:{userId}` | `updateTag` |

## Auth Flow

`getAppSession()` resolves cookies in this order:

1. Validate `sb-access-token` as a Supabase session.
2. Validate `guest_token` as a guest JWT.
3. Return `null` if neither token is valid.

`proxy.ts` classifies routes. Public routes such as `/login`, `/register`, and `/api/health` skip auth redirects. Chat routes are guest eligible and can mint a guest token. Sensitive route handlers and Server Actions still enforce their own ownership and guest rules.

## Rate Limits

Redis-backed rate limits have two layers. `proxy.ts` applies a lightweight global throttle, roughly `50/min`, keyed by session user or IP. Route Handlers and Server Actions apply more specific limits:

| Surface | Limit |
|---|---|
| Chat generation | `50/min` |
| Standard actions | `100/min` |
| Upload | `10/hour` |
| Login | `5/min` |
| Register | `3/min` |
| Delete all chats | Strict action limit, `10/min` |

## Main Data Chains

```text
New or existing chat page
  -> server fetches session, chat, votes, models
  -> ChatShell receives initial data
  -> user submits through MultimodalInput
  -> useChatSession prepares request
  -> POST /api/chat validates body, session, rate limit, ownership
  -> AI stream runs with tools and data parts
  -> onFinish saves messages, updates title, refreshes tags
```

```text
SidebarShell
  -> server fetches first 21 chats with cache tag
  -> SidebarHistoryClient receives first 20 plus hasMore
  -> useSWRInfinite fetches later pages from /api/history
  -> PendingChatsProvider merges optimistic entries and streamed title updates
```

```text
Artifact save
  -> editor debounces content changes
  -> POST /api/artifact save mode
  -> saveArtifactVersion inserts a new row
  -> revalidateTag('artifact:{id}', 'max')
  -> VersionFooter and ArtifactPanel can refetch versions
```
