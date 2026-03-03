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
import type { ErrorCode } from '@/lib/errors/codes'

// ── ActionResult for Server Actions ──
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: ErrorCode; message: string } }
```
<!-- C2-W4: C2X-006 fix -->

---

## 3. Artifact Types (`lib/types/artifact.types.ts`)

Cross-feature artifact type contract.

```typescript
import type { ArtifactKind } from './models.types' // Re-exported, not redefined
export type { ArtifactKind } from './models.types'

// Per redesign, only two states needed — artifact errors are handled
// at the component level via error boundaries.
export type ArtifactStatus =
  | 'idle'
  | 'streaming'

// Suggestion type — shared between artifact handlers (suggestions API) and
// streaming layer (processStreamDelta). Defined here in lib/types/ so both
// features/artifacts/ and features/chat/ can consume it.
// NOTE: Also defined in features/chat/types/chat.types.ts §9 — that
// definition should be replaced with a re-export from this file.
export type ArtifactSuggestion = {
  originalText: string
  suggestedText: string
  description: string
}

export type UIArtifact = {
  artifactId: string
  title: string
  kind: ArtifactKind
  content: string
  isVisible: boolean
  status: ArtifactStatus
  suggestions?: ArtifactSuggestion[]   // Accumulated by processStreamDelta artifact-suggestion handler (Wave 2 DG-4, Wave 3 TC-1)
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

export interface CreateArtifactParams {
  id: string                    // was artifactId
  title: string
  kind: ArtifactKind
  chatId: string                // NEW
  session: { userId: string; isGuest: boolean } // NEW
  ChatStream: ArtifactStreamWriter // was streamWriter → ChatStream (redesign-aligned)
}

export interface UpdateArtifactParams {
  id: string                    // was artifactId
  title: string
  kind: ArtifactKind
  currentContent: string        // NEW
  description: string
  session: { userId: string; isGuest: boolean } // NEW
  ChatStream: ArtifactStreamWriter // was streamWriter → ChatStream (redesign-aligned)
}

export type ArtifactHandler = {
  create(params: CreateArtifactParams): Promise<string>
  update(params: UpdateArtifactParams): Promise<string>
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
  isOptimistic: boolean
  visibility: 'public' | 'private'
}

export type PendingChatOperations = {
  add(chat: Omit<PendingChat, 'isOptimistic'>): void
  remove(chatId: string): void
  updateTitle(chatId: string, title: string): void
  markConfirmed(chatId: string): void
}
```

---

## 7. Model Types (`lib/types/model.types.ts`)

<!-- audit: MO-3 (removed ModelCapability, ModelModality, ReasoningType), DA-3/MO-4 (label→name) -->

Model metadata and provider config.

```typescript
// ── Provider identifiers (NO vercel-gateway) ──
export type ProviderId =
  | 'openai'
  | 'google'
  | 'openrouter'

// ── Model capabilities ──
// NOTE: ModelCapability, ModelModality, and ReasoningType removed per audit MO-3.
// Replaced by flat boolean flags (supportsToolCalling, supportsReasoning) on ModelMetadata.

// ── Model metadata (aligned with ../../plan-archives/redesign/architecture.md) ──
export interface ModelMetadata {
  id: string                           // full model ID (e.g. "openai:gpt-4o")
  provider: string                     // audit: W4-CONF-025 — widened from ProviderId to string. OpenRouter dynamic models return provider identifiers not in the static union. Runtime validation at API boundary via Zod schema instead. (was providerId: ProviderId)
  providerModelId: string              // was modelId
  name: string                         // canonical per redesign (was label)
  description?: string
  supportsToolCalling: boolean         // was capabilities array
  supportsReasoning: boolean           // was capabilities array
  modalities: { input: string[]; output: string[] }
  contextWindow: number                // NEW
  maxOutputTokens: number              // NEW
  source: 'static' | 'dynamic'        // was 'curated' | 'discovered'
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
- Provider list follows redesign baseline: `openai`, `google`, `openrouter` (conditionally registered by API key availability)

---

## 8. Settings Types (`lib/types/settings.types.ts`)

> Renamed from `UserSettings` → `SettingsState`. Flattened per redesign — model selection is separate from settings.

<!-- W4-CYCLE1: D-18 fix — Clarify UserSettings → SettingsState consolidation.
     Redesign docs (e.g. ai-integration.md, state-management.md) reference `UserSettings` in function
     signatures like `composeSystemPrompt(settings: UserSettings)` and `getProviderOptions(settings: UserSettings)`.
     All such references should use `SettingsState` — the canonical type defined here.
     `UserSettings` is NOT a separate type; it was the redesign's name for the same concept. -->

> **Alias note:** Redesign documents that reference `UserSettings` (e.g. `composeSystemPrompt(settings: UserSettings)`) should use `SettingsState` instead. `UserSettings` is the redesign's name for this same type — **do not create a separate `UserSettings` type**.

```typescript
export interface SettingsState {
  temperature: number
  topP: number
  maxOutputTokens: number
  systemPrompt: string
  enableReasoning: boolean
}

// Alias for redesign compatibility — redesign references `UserSettings` in function signatures.
// Implementation should use `SettingsState` directly; this alias exists only for traceability.
export type UserSettings = SettingsState
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
  | { type: 'artifact-suggestion'; content: ArtifactSuggestion }
  | { type: 'chat-title'; content: string }
  | { type: 'error'; content: string } // In-stream chat failure, user-facing text only

<!-- wave4-cleanup: Added error variant to reconcile with contracts.md §7 ArtifactDataPart (was present there, missing here). See sync-reports/wave4/cleanup-datapart.md -->

// Consolidated: ChatDataPart merged into ArtifactDataPart
export type DataPart = ArtifactDataPart

// Renamed from SuggestionData → ArtifactSuggestion
export type ArtifactSuggestion = {
  originalText: string
  suggestedText: string
  description: string
}

export type ChatStatus = 'idle' | 'submitted' | 'streaming' | 'error' | 'ready'
```

**Key changes from old plan:**
- All `data-*` prefixed stream parts → `artifact-*` or `chat-*` prefixes
- `data-usage` removed (no credit/usage system)
- `data-appendMessage` removed (`useChat` manages messages natively)
- `data-chatTitle` → `chat-title`
- Types moved to `features/chat/types/chat.types.ts` (feature-owned, not shared)

---

## 10. Chat Session Types (in `features/chat/types/chat.types.ts`)

> Intent-based callbacks (not setter-based) per ../../plan-archives/redesign/state-management.md

```typescript
import type { Message, Attachment } from 'ai'
import type { Dispatch, SetStateAction } from 'react'

// ── ChatSessionContext value (replaces old ChatContext) ──
export interface ChatSessionValue {
  chatId: string
  chatModel: string
  isReadonly: boolean
  messages: Message[]
  status: ChatStatus             // 'idle' | 'submitted' | 'streaming' | 'error' | 'ready'
  input: string
  setInput: (input: string) => void
  attachments: Attachment[]
  setAttachments: Dispatch<SetStateAction<Attachment[]>>
  sendMessage: (event?: { preventDefault?: () => void }) => void
  stop: () => void
  appendMessage: (message: Message) => void
  editMessage: (id: string, content: string) => Promise<void>
  error: Error | null
  clearError: () => void
  // ── Visibility (proactive for P6-T08 extensibility — CV-01 Option A) ──
  visibility: 'public' | 'private'           // server-fetched, default 'private' for new chats
  setVisibility: (v: 'public' | 'private') => void  // updates context so prepareSendMessagesRequest reads current value
}
```

<!-- AUDIT: W4-VI-01 — visibility and setVisibility added to ChatSessionValue proactively per CV-01 Option A.
     Traceability: wave2/visibility.md W2-VI-1, wave3/chat-visibility-conflicts.md CV-01/CV-03.
     Justification: prepareSendMessagesRequest requires selectedVisibilityType as one of 5 chatRequestSchema fields;
     ChatSessionContext is the only state path useChatSession can read at composition time.
     Deviation: redesign state-management.md §5 says "Visibility lives in server-fetched data + useOptimistic" (outside context).
     This deviates by placing visibility IN context, mirroring the chatModel pattern (also server-fetched per-chat metadata). -->

---

## 11. Error Types (`lib/errors/codes.ts`)

<!-- W4-CYCLE1: CONFLICT-001 fix — Merged plan + redesign error codes into single authoritative union.
     Redesign codes added: no_session, expired_token, guest_restricted, artifact_not_found, invalid_kind,
     rate_limit:api:too_many_requests, bad_request:validation:invalid_input.
     Plan-only codes retained: ai_error:*, internal_error:* (plan extends redesign).
     Contradictions resolved: bad_request:api:invalid_model_id → bad_request:chat:invalid_model_id (redesign scope);
     not_found:chat:not_found → not_found:chat:chat_not_found (redesign naming).
     Offline gap (W2-EH-02) resolved: added offline:api:service_unavailable (503). -->

> Error codes follow `type:surface:detail` naming per `architecture/conventions.md` and redesign `naming-conventions.md` §7.
<!-- C2-W4: C2X-006 fix -->

```typescript
export type ErrorCode =
  // ── Auth errors (from redesign naming-conventions.md §7) ──
  | 'unauthorized:auth:no_session'              // NEW: redesign — no session present
  | 'unauthorized:auth:expired_token'            // NEW: redesign — JWT/session expired
  | 'unauthorized:chat:auth_required'            // plan — chat-level auth guard
  | 'forbidden:auth:guest_restricted'            // NEW: redesign — guest cannot access
  | 'forbidden:chat:owner_mismatch'              // both — chat ownership check
  // ── Request validation errors ──
  | 'bad_request:api:invalid_request_body'       // plan — general API body validation
  | 'bad_request:chat:invalid_model_id'          // redesign — invalid model ID (was api scope in plan)
  | 'bad_request:artifact:invalid_kind'           // NEW: redesign — invalid artifact kind
  | 'bad_request:validation:invalid_input'        // NEW: redesign — Zod schema validation failure
  // ── Not found errors ──
  | 'not_found:chat:chat_not_found'              // redesign naming (was not_found:chat:not_found)
  | 'not_found:artifact:artifact_not_found'       // NEW: redesign — artifact lookup miss
  // ── Rate limiting errors ──
  | 'rate_limit:chat:too_many_requests'           // both — per-session chat rate limit
  | 'rate_limit:chat:daily_limit_exceeded'        // plan — abuse prevention (20 guest/100 auth daily caps)
  | 'rate_limit:api:too_many_requests'            // NEW: redesign — general API rate limit
  // ── Infrastructure errors (plan-only, extends redesign) ──
  | 'ai_error:provider:failed'                   // plan — AI provider failure
  | 'offline:api:service_unavailable'             // NEW: W2-EH-02 resolution — upstream 503
  | 'internal_error:database:query_failed'        // plan — DB query failure
  | 'internal_error:cache:operation_failed'        // plan — cache operation failure

// Maps error codes to HTTP status
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  'unauthorized:auth:no_session': 401,
  'unauthorized:auth:expired_token': 401,
  'unauthorized:chat:auth_required': 401,
  'forbidden:auth:guest_restricted': 403,
  'forbidden:chat:owner_mismatch': 403,
  'bad_request:api:invalid_request_body': 400,
  'bad_request:chat:invalid_model_id': 400,
  'bad_request:artifact:invalid_kind': 400,
  'bad_request:validation:invalid_input': 400,
  'not_found:chat:chat_not_found': 404,
  'not_found:artifact:artifact_not_found': 404,
  'rate_limit:chat:too_many_requests': 429,
  'rate_limit:chat:daily_limit_exceeded': 429,
  'rate_limit:api:too_many_requests': 429,
  'ai_error:provider:failed': 502,
  'offline:api:service_unavailable': 503,
  'internal_error:database:query_failed': 500,
  'internal_error:cache:operation_failed': 500,
}
```

### AppError class (`lib/errors/app-error.ts`)

```typescript
import type { NextResponse } from 'next/server'

export class AppError extends Error {
  code: ErrorCode
  statusCode: number
  details?: Record<string, unknown>

  static notFound(message?: string): AppError         // → 'not_found:chat:chat_not_found'
  static unauthorized(message?: string): AppError      // → 'unauthorized:auth:no_session'
  static forbidden(message?: string): AppError         // → 'forbidden:chat:owner_mismatch'
  static badRequest(message?: string): AppError        // → 'bad_request:api:invalid_request_body'
  static rateLimited(message?: string): AppError       // → 'rate_limit:chat:too_many_requests'
  static serviceUnavailable(message?: string): AppError // → 'offline:api:service_unavailable'  <!-- W4-CYCLE1: CONFLICT-001 + W2-EH-02 -->
  static internal(message?: string): AppError          // → 'internal_error:database:query_failed'

  toResponse(): NextResponse
}
```

**Key changes from old plan:**
- No `activate_gateway` or credit-related error codes
- Error codes use `type:surface:detail` naming convention
- Merged redesign auth-granular codes (`no_session`, `expired_token`, `guest_restricted`) with plan infrastructure codes (`ai_error:*`, `internal_error:*`) <!-- W4-CYCLE1: CONFLICT-001 -->
- Added `offline:api:service_unavailable` (503) to resolve W2-EH-02 offline type gap <!-- W4-CYCLE1: W2-EH-02 -->
- Added `not_found:artifact:artifact_not_found` and `bad_request:artifact:invalid_kind` for artifact error surface <!-- W4-CYCLE1: CONFLICT-001 -->

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
4. lib/types/artifact.types.ts    ← UIArtifact, ArtifactKind (no dependencies)
5. lib/types/artifact-handler.types.ts ← Imports ArtifactKind
6. lib/types/pending-chats.types.ts ← PendingChat (no dependencies)
7. lib/types/model.types.ts       ← ModelMetadata, ProviderId
8. lib/types/settings.types.ts    ← SettingsState (no dependencies)
9. lib/errors/codes.ts           ← ErrorCode string literal union
10. lib/errors/app-error.ts       ← Imports ErrorCode
11. lib/cache/keys.ts             ← String templates (no type dependencies)
12. lib/types/api.types.ts         ← PaginatedResult, PaginationParams, ErrorResponse, HealthResponse (P0-T05)
```

---

## Pre-Feature Type Checklist

Before starting any feature phase, verify:

- [ ] All Drizzle schema tables defined (Artifact table, NOT Document)
- [ ] `InferSelectModel` / `InferInsertModel` types compile
- [ ] `AppSession` type available at `@/features/auth/types/auth.types`
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
  items: T[]
  hasMore: boolean
  nextCursor?: string
}

export interface HistoryResponse<T> {
  chats: T[]
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
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: {
    database: {
      status: 'healthy' | 'unhealthy'
      latencyMs: number
      error?: string
    }
    cache: {
      status: 'healthy' | 'unhealthy'
      latencyMs: number
      error?: string
    }
  }
}
```

**Usage:**
- `HistoryResponse<Chat>` returned by `GET /api/history`
- `PaginationParams` accepted by `getChatsByUserId()` in `lib/data/chat.ts`
- `ErrorResponse` returned by all API error responses
- `HealthResponse` returned by `GET /api/health`
