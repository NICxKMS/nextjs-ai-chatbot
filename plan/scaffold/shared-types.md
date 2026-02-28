# Shared Types

> Types that must exist before any feature implementation begins.
> These are derived from the database schema, AI SDK, and cross-cutting contracts.
> All live in `lib/types/` and are imported via `@/lib/types`.

---

## 1. Database Model Types (`lib/types/models.types.ts`)

Inferred from Drizzle schema. These are the source-of-truth shapes.

```typescript
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import type { chats, messages, documents, votes, suggestions, users } from '@/lib/db/schema'

// ── Select types (read from DB) ──
export type User = InferSelectModel<typeof users>
export type Chat = InferSelectModel<typeof chats>
export type Message = InferSelectModel<typeof messages>
export type Document = InferSelectModel<typeof documents>
export type Vote = InferSelectModel<typeof votes>
export type Suggestion = InferSelectModel<typeof suggestions>

// ── Insert types (write to DB) ──
export type NewUser = InferInsertModel<typeof users>
export type NewChat = InferInsertModel<typeof chats>
export type NewMessage = InferInsertModel<typeof messages>
export type NewDocument = InferInsertModel<typeof documents>
export type NewVote = InferInsertModel<typeof votes>
export type NewSuggestion = InferInsertModel<typeof suggestions>

// ── Enum types (from schema) ──
export type Visibility = 'public' | 'private'
export type MessageRole = 'user' | 'assistant' | 'system'
export type DocumentKind = 'text' | 'code' | 'image' | 'sheet'

// ── Composite types (used across features) ──
export type ChatWithMessages = Chat & {
  messages: Message[]
}

export type DocumentWithVersions = {
  id: string
  userId: string
  chatId: string
  versions: Document[]
}
```

### Dependencies

- Requires `lib/db/schema.ts` to exist first
- Schema defines tables: `users`, `chats`, `messages` (Message_v2), `votes` (Vote_v2), `documents`, `suggestions`

### Schema Column Reference

| Table | Key Columns |
|-------|-------------|
| `users` | id (uuid), email, passwordHash, createdAt, lastLogin |
| `chats` | id (uuid), userId (FK), title, visibility (enum), createdAt, updatedAt, lastContext (jsonb) |
| `messages` | id (uuid), chatId (FK), role (enum), parts (jsonb), attachments (jsonb), createdAt |
| `votes` | chatId + messageId + userId (composite PK), isUpvoted (boolean) |
| `documents` | id + createdAt (composite PK), title, content, kind (enum), userId (FK), chatId (FK) |
| `suggestions` | id (uuid), documentId, documentCreatedAt, originalText, suggestedText, description, isResolved, userId |

---

## 2. API Types (`lib/types/api.types.ts`)

Request/response shapes for route handlers and server actions.

```typescript
import type { Visibility, DocumentKind } from './models.types'

// ── Chat request ──
export type ChatRequestBody = {
  id: string
  message: UIMessage
  selectedChatModel: string
  selectedVisibilityType: Visibility
  settings: ChatSettings
}

export type ChatSettings = {
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

// ── Pagination ──
export type PaginatedResult<T> = {
  data: T[]
  hasMore: boolean
}

export type PaginationParams = {
  limit: number
  cursor?: string
  direction?: 'forward' | 'backward'
}

// ── History ──
export type HistoryResponse = {
  chats: Chat[]
  hasMore: boolean
}

// ── Vote ──
export type VoteRequest = {
  chatId: string
  messageId: string
  type: 'up' | 'down'
}

// ── Document ──
export type DocumentRequest = {
  id: string
  title: string
  content: string
  kind: DocumentKind
}

// ── Health ──
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export type HealthResponse = {
  status: HealthStatus
  checks: {
    database: { status: HealthStatus; latencyMs: number }
    cache: { status: HealthStatus; latencyMs: number }
    environment: { status: HealthStatus; missing: string[] }
  }
}

// ── Generic error response ──
export type ErrorResponse = {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}
```

---

## 3. AI Types (`lib/types/ai.types.ts`)

Model metadata, provider config, and usage tracking types.

```typescript
// ── Provider identifiers ──
export type ProviderId =
  | 'vercel-gateway'
  | 'openai'
  | 'google'
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

// ── Usage tracking ──
export type AppUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  modelId: string
  cost?: {
    inputCost: number
    outputCost: number
    totalCost: number
    currency: string
  }
}

// ── Custom data stream types ──
export type CustomUIDataTypes = {
  'data-id': string
  'data-title': string
  'data-kind': DocumentKind
  'data-clear': null
  'data-finish': null
  'data-textDelta': string
  'data-codeDelta': string
  'data-sheetDelta': string
  'data-imageDelta': string
  'data-suggestion': SuggestionData
  'data-chatTitle': string
  'data-usage': AppUsage
  'data-appendMessage': unknown
}

export type SuggestionData = {
  originalText: string
  suggestedText: string
  description: string
}

// ── Default model constants ──
export const DEFAULT_CHAT_MODEL = 'google:gemma-3-4b-it'
export const DEFAULT_TITLE_MODEL = 'google:gemma-3-4b-it'
export const DEFAULT_ARTIFACT_MODEL = 'google:gemini-2.5-flash-lite'
```

---

## 4. Error Types (`lib/errors/codes.ts`)

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

---

## 5. Session & Auth Types (`lib/types/index.ts` re-exports)

```typescript
// ── Session (used across all features) ──
export type AppSession = {
  user: {
    id: string                         // UUID or "guest:{uuid}"
    type: 'authenticated' | 'guest'
    email?: string                     // Only for authenticated users
  }
}

// ── Data context (gates guest vs auth data access) ──
export type DataContext = {
  userId: string
  isGuest: boolean
}

// ── Entitlements ──
export type UserEntitlements = {
  maxMessagesPerDay: number            // 20 (guest) or 100 (auth)
  canVote: boolean                     // false for guest
  canPersistSuggestions: boolean       // false for guest
  canViewPublicChats: boolean          // false for guest
}
```

---

## 6. Utility Types (`lib/types/index.ts`)

```typescript
// ── Brand types for type safety ──
export type ChatId = string & { readonly __brand: 'ChatId' }
export type MessageId = string & { readonly __brand: 'MessageId' }
export type DocumentId = string & { readonly __brand: 'DocumentId' }
export type UserId = string & { readonly __brand: 'UserId' }

// Note: Brand types are optional. Use plain strings if team prefers simplicity.
// The above provides compile-time safety against mixing IDs of different entities.
```

---

## 7. Cache Types (`lib/cache/keys.ts`)

```typescript
// Cache key factory — prevents key collision, makes cache auditable
export const cacheKeys = {
  chat: (chatId: string, userId: string) => `chat:${chatId}:${userId}:meta`,
  chatMessages: (chatId: string, userId: string) => `chat:${chatId}:${userId}:msgs`,
  userChats: (userId: string) => `user:${userId}:chats`,
  document: (docId: string, userId: string) => `doc:${docId}:${userId}`,
  quota: (userId: string) => `quota:${userId}:messages`,
} as const
```

---

## Type Dependency Order

Types must be created in this order (each depends on the previous):

```
1. lib/db/schema.ts          ← Drizzle table definitions (no dependencies)
2. lib/types/models.types.ts  ← Inferred from schema
3. lib/errors/codes.ts        ← String literal union (no dependencies)
4. lib/types/ai.types.ts      ← Imports DocumentKind from models
5. lib/types/api.types.ts     ← Imports from models + ai types
6. lib/types/index.ts         ← Re-exports all + adds AppSession, DataContext
7. lib/cache/keys.ts          ← String templates (no type dependencies)
8. lib/errors/app-error.ts    ← Imports ErrorCode from codes.ts
```

---

## Pre-Feature Type Checklist

Before starting any feature phase, verify:

- [ ] All Drizzle schema tables defined and matching oldapp schema
- [ ] `InferSelectModel` / `InferInsertModel` types compile
- [ ] `AppSession` type available at `@/lib/types`
- [ ] `DataContext` type available at `@/lib/types`
- [ ] `ErrorCode` type and `AppError` class available at `@/lib/errors`
- [ ] `ModelMetadata` and provider types available at `@/lib/types`
- [ ] `CustomUIDataTypes` defined for type-safe stream parts
- [ ] Cache key factory compiles with correct string templates
- [ ] `pnpm typecheck` passes with all type files in place
