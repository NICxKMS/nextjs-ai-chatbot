> **Updated per redesign audit (2026-03-01)**

# Shared Types

> Types that must exist before any feature implementation begins.
> These are derived from the database schema, AI SDK, and cross-cutting contracts.
> All live in `lib/types/` and are imported via `@/lib/types/[file]`.
> No barrel `index.ts` — direct imports only.

---

## 1. Database Model Types (`lib/types/models.types.ts`)

Inferred from Drizzle schema. These are the source-of-truth shapes.

```typescript
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import type { chats, messages, artifacts, votes, suggestions, users } from '@/lib/db/schema'

// ── Select types (read from DB) ──
export type User = InferSelectModel<typeof users>
export type Chat = InferSelectModel<typeof chats>
export type Message = InferSelectModel<typeof messages>
export type Artifact = InferSelectModel<typeof artifacts>
export type Vote = InferSelectModel<typeof votes>
export type Suggestion = InferSelectModel<typeof suggestions>

// ── Insert types (write to DB) ──
export type NewUser = InferInsertModel<typeof users>
export type NewChat = InferInsertModel<typeof chats>
export type NewMessage = InferInsertModel<typeof messages>
export type NewArtifact = InferInsertModel<typeof artifacts>
export type NewVote = InferInsertModel<typeof votes>
export type NewSuggestion = InferInsertModel<typeof suggestions>

// ── Enum types (from schema) ──
export type Visibility = 'public' | 'private'
export type MessageRole = 'user' | 'assistant' | 'system'
export type ArtifactKind = 'text' | 'code' | 'image' | 'sheet'

// ── Composite types (used across features) ──
export type ChatWithMessages = Chat & {
  messages: Message[]
}

export type ArtifactWithVersions = {
  id: string
  userId: string
  chatId: string
  versions: Artifact[]
}
```

### Dependencies

- Requires `lib/db/schema.ts` to exist first
- Schema defines tables: `users`, `chats`, `messages`, `votes`, `artifacts` (NOT documents), `suggestions`

### Schema Column Reference

| Table | Key Columns |
|-------|-------------|
| `users` | id (uuid), email, passwordHash, createdAt, lastLogin |
| `chats` | id (uuid), userId (FK), title, visibility (enum), createdAt, updatedAt |
| `messages` | id (uuid), chatId (FK), role (enum), parts (jsonb), attachments (jsonb), createdAt |
| `votes` | chatId + messageId + userId (composite PK), isUpvoted (boolean) |
| `artifacts` | id + createdAt (composite PK), title, content, kind (enum: `artifact_kind`), userId (FK), chatId (FK) |
| `suggestions` | id (uuid), artifactId, artifactCreatedAt, originalText, suggestedText, description, isResolved, userId |

---

## 2. Result Type (`lib/types/result.types.ts`)

Server Actions return structured results, never throw.

```typescript
// ── ActionResult for Server Actions ──
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }
```

---

## 3. Data Context Type (`lib/types/data-context.types.ts`)

Gates guest vs auth data access.

```typescript
// ── Data context (gates guest vs auth data access) ──
export type DataContext = {
  userId: string
  isGuest: boolean
}
```

---

## 4. Artifact Types (`lib/types/artifact.types.ts`)

Cross-feature artifact type contract.

```typescript
export type ArtifactKind = 'text' | 'code' | 'image' | 'sheet'

export type ArtifactStatus =
  | 'idle'
  | 'streaming'
  | 'complete'
  | 'error'

export type UIArtifact = {
  artifactId: string
  title: string
  kind: ArtifactKind
  content: string
  isVisible: boolean
  status: ArtifactStatus
}
```

---

## 5. Artifact Handler Types (`lib/types/artifact-handler.types.ts`)

Handler registry contract — shared between `features/artifacts/handlers/` and `lib/ai/artifact-handlers.ts`.

```typescript
import type { ArtifactKind } from './artifact.types'

export type ArtifactStreamWriter = {
  writeData(data: { type: string; content: unknown }): void
}

export type CreateArtifactParams = {
  kind: ArtifactKind
  title: string
  artifactId: string
  streamWriter: ArtifactStreamWriter
  // ... additional context as needed
}

export type UpdateArtifactParams = {
  kind: ArtifactKind
  artifactId: string
  description: string
  streamWriter: ArtifactStreamWriter
  // ... additional context as needed
}

export type ArtifactHandler = {
  kind: ArtifactKind
  create(params: CreateArtifactParams): Promise<void>
  update(params: UpdateArtifactParams): Promise<void>
}
```

---

## 6. Pending Chats Types (`lib/types/pending-chats.types.ts`)

Shared between `features/sidebar/` and `features/chat/`.

```typescript
export type PendingChat = {
  id: string
  title: string
  createdAt: Date
  confirmed: boolean
}

export type PendingChatOperations = {
  add(chat: PendingChat): void
  remove(chatId: string): void
  updateTitle(chatId: string, title: string): void
  markConfirmed(chatId: string): void
}
```

---

## 7. Model Types (`lib/types/model.types.ts`)

Model metadata and provider config.

```typescript
// ── Provider identifiers (NO vercel-gateway) ──
export type ProviderId =
  | 'openai'
  | 'google'
  | 'xai'
  | 'openrouter'
  | 'cloudflare-workers'
  | 'cloudflare-ai-gateway'

// ── Model capabilities ──
export type ModelCapability =
  | 'chat'
  | 'reasoning'
  | 'vision'
  | 'audio'
  | 'multimodal'
  | 'code'
  | 'tooling'
  | 'memory'
  | 'image-generation'
  | 'video-generation'

export type ModelModality = 'text' | 'image' | 'audio' | 'video'

// ── Reasoning ──
export type ReasoningType =
  | 'openai-thinking'
  | 'anthropic-thinking'
  | 'gemini-thinking'
  | 'deepseek-thinking'
  | 'internal-thinking'

// ── Model metadata ──
export type ModelMetadata = {
  id: string                           // e.g., "google:gemini-2.5-flash"
  providerId: ProviderId
  modelId: string                      // Provider-specific ID
  name: string                         // Human-readable
  capabilities: ModelCapability[]
  modalities: ModelModality[]
  reasoningType?: ReasoningType
  thinkingBudget?: number
  source: 'curated' | 'discovered'
  isCurated: boolean
}

// ── Default model constants ──
export const DEFAULT_CHAT_MODEL = 'google:gemma-3-4b-it'
export const TITLE_MODEL = 'google:gemma-3-4b-it'
export const ARTIFACT_MODEL = 'google:gemini-2.5-flash-lite'
```

**Key changes from old plan:**
- Removed `vercel-gateway` from `ProviderId`
- Removed `AppUsage` type (no credit/usage system)
- Constants renamed: `DEFAULT_TITLE_MODEL` → `TITLE_MODEL`, `DEFAULT_ARTIFACT_MODEL` → `ARTIFACT_MODEL`

---

## 8. Settings Types (`lib/types/settings.types.ts`)

```typescript
export type UserSettings = {
  sampling: {
    temperature: number
    topP: number
    maxOutputTokens: number
  }
  systemPrompt: string
  enableReasoning: boolean
  reasoningBudget: number
  streamArtifacts: boolean
  autoScroll: boolean
  selectedModelId: string
}
```

---

## 9. Custom Data Stream Types (in `features/chat/types/chat.types.ts`)

> **Note:** Custom stream types now live in the chat feature, not in shared `lib/types/`.
> Stream part names use `artifact-` prefix (not `data-` prefix).

```typescript
export type ArtifactDataPart =
  | { type: 'artifact-id'; content: string }
  | { type: 'artifact-title'; content: string }
  | { type: 'artifact-kind'; content: ArtifactKind }
  | { type: 'artifact-clear'; content: '' }
  | { type: 'artifact-finish'; content: '' }
  | { type: 'artifact-textDelta'; content: string }
  | { type: 'artifact-codeDelta'; content: string }
  | { type: 'artifact-sheetDelta'; content: string }
  | { type: 'artifact-imageDelta'; content: string }
  | { type: 'artifact-suggestion'; content: SuggestionData }

export type ChatDataPart =
  | { type: 'chat-title'; content: string }

export type DataPart = ArtifactDataPart | ChatDataPart

export type SuggestionData = {
  originalText: string
  suggestedText: string
  description: string
}

export type ChatStatus = 'idle' | 'streaming' | 'error' | 'submitted'
```

**Key changes from old plan:**
- All `data-*` prefixed stream parts → `artifact-*` or `chat-*` prefixes
- `data-usage` removed (no credit/usage system)
- `data-appendMessage` removed (`useChat` manages messages natively)
- `data-chatTitle` → `chat-title`
- Types moved to `features/chat/types/chat.types.ts` (feature-owned, not shared)

---

## 10. Chat Session Types (in `features/chat/types/chat.types.ts`)

```typescript
import type { UIMessage } from '@ai-sdk/react'

// ── ChatSessionContext value (replaces old ChatContext) ──
export type ChatSessionValue = {
  chatId: string
  messages: UIMessage[]
  status: ChatStatus
  isLoading: boolean
  append: (message: UIMessage) => void
  stop: () => void
  reload: () => void
  setMessages: (messages: UIMessage[]) => void
  selectedModelId: string
  isReadonly: boolean
}
```

---

## 11. Error Types (`lib/errors/codes.ts`)

```typescript
export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'RATE_LIMITED'
  | 'AI_ERROR'
  | 'DATABASE_ERROR'
  | 'CACHE_ERROR'
  | 'CONFLICT'
  | 'BAD_REQUEST'

// Maps error codes to HTTP status
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  RATE_LIMITED: 429,
  AI_ERROR: 502,
  DATABASE_ERROR: 500,
  CACHE_ERROR: 500,
  CONFLICT: 409,
  BAD_REQUEST: 400,
}
```

**Key change from old plan:** No `activate_gateway` or credit-related error codes.

---

## 12. Session Types (in `features/auth/types/auth.types.ts`)

```typescript
// ── Session (used across all features via SessionProvider) ──
export type AppSession = {
  user: {
    id: string                         // UUID or "guest:{uuid}"
    type: 'authenticated' | 'guest'
    email?: string                     // Only for authenticated users
  }
}
```

---

## 13. Cache Tags (`lib/cache/keys.ts`)

```typescript
// Cache key factory — prevents key collision, makes cache auditable
export const cacheKeys = {
  chat: (chatId: string) => `chat:${chatId}`,
  chats: (userId: string) => `chats:${userId}`,
  artifact: (artifactId: string) => `artifact:${artifactId}`,
  votes: (chatId: string) => `votes:${chatId}`,
  models: () => 'models',
} as const
```

**Key changes from old plan:**
- `document` key → `artifact` key
- `userChats` → `chats` (simpler)
- `quota` key removed (no credit system)
- Keys simplified: no `userId` in artifact/chat keys (consistency with cacheTag pattern)

---

## Type Dependency Order

Types must be created in this order (each depends on the previous):

```
1. lib/db/schema.ts              ← Drizzle table definitions (Artifact, NOT Document)
2. lib/types/models.types.ts      ← Inferred from schema
3. lib/types/result.types.ts      ← ActionResult<T> (no dependencies)
4. lib/types/data-context.types.ts ← DataContext (no dependencies)
5. lib/types/artifact.types.ts    ← UIArtifact, ArtifactKind (no dependencies)
6. lib/types/artifact-handler.types.ts ← Imports ArtifactKind
7. lib/types/pending-chats.types.ts ← PendingChat (no dependencies)
8. lib/types/model.types.ts       ← ModelMetadata, ProviderId
9. lib/types/settings.types.ts    ← UserSettings (no dependencies)
10. lib/errors/codes.ts           ← ErrorCode string literal union
11. lib/errors/app-error.ts       ← Imports ErrorCode
12. lib/cache/keys.ts             ← String templates (no type dependencies)
13. lib/types/api.types.ts         ← PaginatedResult, PaginationParams, ErrorResponse, HealthResponse
```

---

## Pre-Feature Type Checklist

Before starting any feature phase, verify:

- [ ] All Drizzle schema tables defined (Artifact table, NOT Document)
- [ ] `InferSelectModel` / `InferInsertModel` types compile
- [ ] `AppSession` type available at `@/features/auth/types/auth.types`
- [ ] `DataContext` type available at `@/lib/types/data-context.types`
- [ ] `ActionResult<T>` available at `@/lib/types/result.types`
- [ ] `ErrorCode` and `AppError` available at `@/lib/errors/`
- [ ] `ModelMetadata` and provider types available at `@/lib/types/model.types`
- [ ] `UIArtifact` and `ArtifactKind` defined at `@/lib/types/artifact.types`
- [ ] `ArtifactHandler` defined at `@/lib/types/artifact-handler.types`
- [ ] Cache key factory compiles with correct string templates
- [ ] Zero occurrences of "document" in any type name or identifier
- [ ] `pnpm typecheck` passes with all type files in place

---

## 14. Cross-Cutting API Types (`lib/types/api.types.ts`)

Generic contracts for paginated responses, error shapes, and health checks.
Used by route handlers (`app/api/`) and data access functions (`lib/data/`).

```typescript
// lib/types/api.types.ts
export interface PaginatedResult<T> {
  data: T[]
  hasMore: boolean
  nextCursor?: string
}

export interface PaginationParams {
  cursor?: string
  limit?: number
}

export interface ErrorResponse {
  error: string
  code?: string
  details?: Record<string, unknown>
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down'
  timestamp: string
  services: Record<string, 'ok' | 'error'>
}
```

**Usage:**
- `PaginatedResult<Chat>` returned by `GET /api/history`
- `PaginationParams` accepted by `getChatsByUserId()` in `lib/data/chat.ts`
- `ErrorResponse` returned by all API error responses
- `HealthResponse` returned by `GET /api/health`
