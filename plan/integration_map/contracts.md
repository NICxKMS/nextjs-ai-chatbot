> **Updated per redesign audit (2026-03-01)**

# Integration Contracts

> Every interface contract between modules. Defines what crosses feature boundaries,
> what each module provides and consumes, and the exact data shapes exchanged.
> Updated to reflect: artifact naming, handler registry, ChatSessionValue,
> PendingChatOperations, ArtifactHandler interface, artifact-* stream parts,
> Server Actions replacing Route Handlers for mutations, useSyncExternalStore.

---

## 1. Feature → Feature Dependencies

### features/chat/ → features/artifacts/

**Direction:** Chat invokes artifact creation/update via handler registry (server-side only)

| Contract | Provider | Consumer | Data Shape |
|----------|----------|----------|------------|
| `createArtifact` tool | `features/chat/lib/tools/create-artifact.ts` | `lib/ai/artifact-handlers.ts` → `features/artifacts/handlers/` | `{ title: string, kind: "text" | "code" | "sheet" }` | <!-- C2-W4: C2-A1 fix -->
| `updateArtifact` tool | `features/chat/lib/tools/update-artifact.ts` | `lib/ai/artifact-handlers.ts` → `features/artifacts/handlers/` | `{ id: string, description: string }` |
| `requestSuggestions` tool | `features/chat/lib/tools/request-suggestions.ts` | `features/artifacts/handlers/` | `{ artifactId: string }` |
| Artifact data stream events | Artifact handlers (server) | `StreamBridge` → `artifactStore` (client) | `artifact-id`, `artifact-title`, `artifact-kind`, `artifact-clear`, `artifact-*Delta`, `artifact-finish` |

**Import boundary:** Chat tools import `getArtifactHandler()` from `lib/ai/artifact-handlers.ts` (registry). Cross-feature component imports are allowlist-only (see `architecture/conventions.md`). Artifact handlers register themselves via side-effect import in route handler.

### features/chat/ → features/sidebar/

**Direction:** Bidirectional via shared PendingChatsProvider context (no direct imports)

| Contract | Mechanism | Data Shape |
|----------|-----------|------------|
| Optimistic chat creation | `PendingChatsProvider` context | `PendingChats.add({ id, title, createdAt, visibility })` |
| Title update (single channel) | `chat-title` stream part → `PendingChats.updateTitle(id, title)` | `string` |
| Active chat highlight | URL pathname (`/chat/[id]`) | Sidebar reads `usePathname()` |

> **Removed:** `window.dispatchEvent('chat-title-updated')`, `pollForTitle()` 3×500ms.
> Title delivery is guaranteed — server awaits title before stream close.

### features/sidebar/ → features/chat/

**Direction:** Navigation triggers chat page load

| Contract | Mechanism | Data |
|----------|-----------|------|
| Navigate to chat | `router.push('/chat/{id}')` | Chat ID in URL |
| Delete chat redirect | `router.push('/')` after Server Action | None |

### features/chat/ → features/settings/

**Direction:** Chat reads settings from module store, settings provides configuration

| Contract | Provider | Consumer | Data Shape |
|----------|----------|----------|------------|
| Chat settings | `useSettings()` (module store) | `useChatSession` hook | `SettingsState { temperature, topP, maxOutputTokens, systemPrompt, enableReasoning }` |

> **No SettingsProvider** — `useSettings()` imports directly from `features/settings/hooks/use-settings.ts` (useSyncExternalStore module store).

### features/chat/ → features/voting/

**Direction:** Voting renders in message actions via Server Action + useOptimistic

| Contract | Provider | Consumer | Data Shape |
|----------|----------|----------|------------|
| Vote state | Server (initial via VoteResolver) | `VoteButtons` component | `Vote[]` |
| Vote mutation | `voteOnMessage()` Server Action | `VoteButtons` | `{ chatId, messageId, type }` → `ActionResult<{ messageId, type }>` |
| Chat ownership | Chat props `isReadonly` | Vote button visibility | `boolean` |

> **Replaced:** SWR `PATCH /api/vote` → Server Action + `useOptimistic` (React 19).

### features/chat/ → features/models/

**Direction:** Models provides catalog, chat uses selected model

| Contract | Provider | Consumer | Data Shape |
|----------|----------|----------|------------|
| Available models | `getAvailableModels()` (server, `use cache`) | Chat page props → `ModelSelector` | `ModelMetadata[]` |
| Selected model | Cookie `chat-model` + localStorage | `useChat` body | `string` (model ID) |
| Model capabilities | `ModelMetadata.supportsToolCalling` | Tool enablement logic | `boolean` |

### features/chat/ → features/auth/

**Direction:** Auth provides session, chat gates operations

| Contract | Provider | Consumer | Data Shape |
|----------|----------|----------|------------|
| Session | `SessionProvider` context | `useChatSession`, API routes | `AppSession` |
| Guest state | `useSession().user.type` | Vote visibility, history behavior | `"authenticated" | "guest"` |

### features/chat/ → features/visibility/

**Direction:** Visibility selector renders in chat header (per-chat visibility only)

| Contract | Provider | Consumer | Data Shape |
|----------|----------|----------|------------|
| Visibility toggle | `VisibilitySelector` component | `ChatHeader` | `'public' \| 'private'` |
| Visibility mutation | `updateChatVisibility()` Server Action | `VisibilitySelector` | `ActionResult<void>` |

`ChatSessionContext` includes `visibility` (current value) and `setVisibility` (optimistic setter) as full members of `ChatSessionValue` per CV-01 Option A (CONF-001). The visibility feature still owns the persistence mutation (`updateChatVisibility` Server Action via `VisibilitySelector`), but the current value and optimistic setter are exposed through `ChatSessionContext` for composition convenience — `useChatSession.prepareSendMessagesRequest` requires `selectedVisibilityType` at composition time. See DEV-031.

<!-- SYNC: Wave 4-CHAT — CONF-001 resolution. Updated from "may expose read-only" to definitive
     "includes visibility + setVisibility" per CV-01 Option A. -->

---

## 2. Feature → lib/ Dependencies

### features/chat/ → lib/

| lib/ Module | Functions Used | Purpose |
|-------------|----------------|---------|
| `lib/data/chat` | `getChatWithMessages`, `createChat`, `updateChatTitle`, `deleteChat` | Chat CRUD |
| `lib/data/message` | `saveMessages`, `deleteTrailingMessages` | Message persistence |
| `lib/data/artifact` | `getArtifactById` (in updateArtifact tool) | Artifact fetch for updates |
| `lib/ai/artifact-handlers` | `getArtifactHandler()` | Handler registry (dependency inversion) |
| `lib/ai/provider` | `myProvider.languageModel(modelId)` | Model resolution |
| `lib/ai/prompts` | `composeSystemPrompt()`, `ARTIFACTS_PROMPT` | System prompt |
| `lib/ai/tools` | `getEnabledTools()` | Model-based tool gating |
| `lib/auth/session` | `getAppSession()` | Session resolution |
| `lib/cache/revalidate` | `refreshChat`, `refreshChatList` | revalidateTag wrappers |
| `lib/types/` | `ArtifactHandler`, `PendingChatOperations`, `ActionResult`, `UIArtifact` | Type contracts |
| `lib/errors/` | `AppError` | Error creation |
| `lib/utils` | `generateUUID` | UUID generation |

### features/artifacts/ → lib/

| lib/ Module | Functions Used | Purpose |
|-------------|----------------|---------|
| `lib/ai/artifact-handlers` | `registerArtifactHandler()` | Handler registration |
| `lib/ai/provider` | `myProvider.languageModel(ARTIFACT_MODEL)` | Artifact AI model |
| `lib/data/artifact` | `getArtifactById`, `saveArtifactVersion` | Artifact CRUD |
| `lib/types/` | `ArtifactHandler`, `ArtifactStreamWriter`, `CreateArtifactParams`, `UpdateArtifactParams` | Type contracts |

### features/sidebar/ → lib/

| lib/ Module | Functions Used | Purpose |
|-------------|----------------|---------|
| `lib/data/chat` | `getChatsByUserId` | Chat history |
| `lib/types/` | `PendingChatOperations` | Type definitions |
| `lib/cache/revalidate` | (indirect via Server Actions) | Cache invalidation |

### features/auth/ → lib/

| lib/ Module | Functions Used | Purpose |
|-------------|----------------|---------|
| `lib/auth/session` | `getAppSession()` | Session resolution |

### features/voting/ → lib/

| lib/ Module | Functions Used | Purpose |
|-------------|----------------|---------|
| `lib/data/vote` | `upsertVote`, `getVotesByChatId` | Vote CRUD |
| `lib/types/` | `ActionResult` | Return type |

### features/settings/ → lib/

| lib/ Module | Functions Used | Purpose |
|-------------|----------------|---------|
| (none) | — | Leaf feature — no lib imports |
### features/models/ → lib/

| lib/ Module | Functions Used | Purpose |
|-------------|----------------|----------|
| `lib/ai/models` | `STATIC_MODELS`, `discoverModels()`, `getModelById()` | Model catalog + discovery |
| `lib/types/model.types` | `ModelMetadata`, `DEFAULT_CHAT_MODEL` | Type contracts + constants |

<!-- AUDIT: Wave4-CONF-030 — Import table rewritten. features/models/ DEFINES getAvailableModels(), does NOT import it. Correct imports are STATIC_MODELS, discoverModels(), getModelById() from lib/ai/models.ts and type contracts from lib/types/model.types.ts. -->

**Exports (public surface):**
- `ModelSelector` — component (grouped by provider, cookie + localStorage persistence)
- `getAvailableModels()` — function (server, `use cache`)
- `getDefaultModel(session)` — function (reads model preference from cookie, validates against catalog, falls back to `DEFAULT_CHAT_MODEL`)

<!-- AUDIT: Wave4-CONF-029 — getDefaultModel() description fixed. Was "returns first model from catalog" — actually reads cookie, validates, falls back. Added missing session parameter. -->

### features/visibility/ → lib/

| lib/ Module | Functions Used | Purpose |
|-------------|----------------|----------|
| `lib/data/chat` | `updateChatVisibility()` | DB mutation |
| `lib/cache/revalidate` | `invalidateChat()`, `invalidateChatList()` | Cache invalidation |
| `lib/auth/session` | `getAppSession()` | Ownership check |

**Exports (public surface):**
- `VisibilitySelector` — component
- `updateChatVisibility` — Server Action
---

## 3. Component → Hook → Action → Data Chains

### Chat Send Message Chain

```
MultimodalInput (component, reads ChatSessionContext)
  → useChatSessionContext().sendMessage() (intent-based callback)
    → useChatSession internally: validate → PendingChats.add → handleSubmit()
      → DefaultChatTransport (AI SDK)
        → POST /api/chat (route handler)
          → Zod validation
          → getAppSession() → session
          → Rate limit check
          → getChatWithMessages (if existing)
          → createChat (if new)
          → createUIMessageStream():
            → composeSystemPrompt() with settings
            → getEnabledTools() for model
            → streamText (AI SDK → myProvider)
            → tool calls → getArtifactHandler() → artifact handlers
          → onFinish:
            → saveMessages() → DB
            → updateChatTitle() → DB
            → refreshChat(chatId)
            → refreshChatList(userId)
```

### Artifact Create/Update Chain

```
AI streamText response (server)
  → createArtifact tool execution (features/chat/lib/tools/)
    → getArtifactHandler(kind) (lib/ai/artifact-handlers — registry)
      → handler.create() (features/artifacts/handlers/{kind}.ts)
        → streamText/streamObject (AI SDK)
        → ChatStream.writeData() (artifact-id, artifact-title, artifact-kind, artifact-clear, deltas, artifact-finish)
        → saveArtifactVersion() (lib/data/artifact)
  → SSE response to client
    → useChat.onData() → artifact-* parts → ChatStreamProvider dispatch
      → StreamBridge (useEffect)
        → processStreamDelta() (pure function)
          → artifactStore.setState() (useSyncExternalStore)
            → ArtifactPanel re-renders (useArtifact subscription)
              → Editor component (text/code/sheet/image)
```

### Visibility Toggle Chain

```
VisibilitySelector (component)
  → useOptimistic(visibility) — immediate UI
  → updateChatVisibility({ chatId, visibility }) — Server Action
    → getAppSession() → session
    → Ownership verification
    → DB update
    → updateTag('chat:{chatId}') + updateTag('chats:{userId}')
  → on failure: optimistic rolls back + toast.error()
```

### Vote Chain

```
VoteButtons (component) → handleVote(type)
  → useOptimistic(type) — immediate UI
  → voteOnMessage({ chatId, messageId, type }) — Server Action
    → getAppSession() → session
    → requireNonGuest check
    → upsertVote (lib/data/vote) → DB
    → updateTag('votes:{chatId}')
  → on failure: optimistic rolls back + toast.error()
```

### Sidebar History Chain

```
SidebarShell (SERVER component)
  → getCachedChats(userId) — 'use cache' + cacheTag('chats:{userId}')
    → getChatsByUserId(userId, { limit: 21 })
  → SidebarHistoryClient (initialChats, initialHasMore)
    → useSWRInfinite(key, fetcher, { fallbackData })
      → GET /api/history?limit=20&cursor={nextCursor} (route handler)
        → auth, rate limit
        → getChatsByUserId with cursor pagination
    → usePendingChats() — merge optimistic entries
```

---

## 4. API Route → Action → Repository Chain

| Route | Handler | Guards | Data Layer | Revalidation | Response Type |
|-------|---------|--------|------------|--------------|---------------|
| `POST /api/chat` | Route Handler | auth, rate limit | `createChat`, `saveMessages`, `updateChatTitle` | `revalidateTag('chat:{id}', 'max')`, `revalidateTag('chats:{userId}', 'max')` | `ReadableStream` (SSE) |
| `GET /api/history` | Route Handler | auth, rate limit | `getChatsByUserId` | — | `HistoryResponse<Chat>` |
| `GET /api/artifact` | Route Handler | auth, ownership | `getArtifactVersions` | — | `Artifact[]` |
| `POST /api/artifact` | Route Handler | auth, rate limit | `saveArtifactVersion` (`mode: "save"`), `deleteArtifactVersionsAfter` (`mode: "restore"`) | `revalidateTag('artifact:{id}', 'max')` | mode-dependent: `{ artifact: Artifact }` (save) / `{ success: true }` (restore) | <!-- C2-W4: C2X-003 + C2-A4 fix -->
| `GET /api/suggestions` | Route Handler | auth | `getSuggestionsByArtifactId` | — | `{ suggestions: ArtifactSuggestion[] }` |
| `POST /api/files/upload` | Route Handler | auth, upload rate limit | Vercel Blob `put()` | — | `{ url: string, pathname: string }` |
| `GET /api/health` | Route Handler | none | DB + Redis ping | — | `HealthResponse` |

`POST /api/artifact` mode contract: <!-- C2-W4: C2-A4 fix -->
- `mode: "save"` persists a new version and responds with `{ artifact: Artifact }`.
- `mode: "restore"` expects payload `{ id: string, timestamp: string, mode: "restore" }`, truncates versions newer than `timestamp`, and responds with `{ success: true }`.

**Server Actions (mutations):**

| Action | Guards | Data Layer | Revalidation |
|--------|--------|------------|--------------|
| `deleteChat` | auth, ownership | `deleteChat` | `updateTag('chats:{userId}')` |
| `deleteAllChats` | auth | `deleteAllChats` | `updateTag('chats:{userId}')` |
| `deleteTrailingMessages` | auth | `deleteTrailingMessages` | `updateTag('chat:{id}')` |
| `voteOnMessage` | auth, non-guest | `upsertVote` | `updateTag('votes:{chatId}')` |
| `updateChatVisibility` | auth, ownership | `updateVisibility` | `updateTag('chat:{id}')` + `updateTag('chats:{userId}')` |
| `renameChat` | auth, ownership | `updateChatTitle` | `updateTag('chat:{chatId}')` + `updateTag('chats:{userId}')` | <!-- wave4: CONF-021 — added chat:{chatId} tag per data-flows.md §mutation table -->
| `login` | none | `cookies.set()` | Router Cache invalidated |
| `register` | none | `cookies.set()` | Router Cache invalidated |
| `logout` | auth | `cookies.delete()` | Router Cache invalidated |

---

## 5. Streaming Event Contracts

### SSE Data Part Types (Server → Client)

| Part Type | Data Type | Source | Consumer | Accumulation |
|-----------|-----------|--------|----------|-------------|
| `artifact-id` | `string` (UUID) | `createArtifact` tool | StreamBridge → artifactStore | Set artifactId |
| `artifact-title` | `string` | `createArtifact` tool | StreamBridge → artifactStore | Set title |
| `artifact-kind` | `ArtifactKind` | `createArtifact` tool | StreamBridge → artifactStore | Set kind |
| `artifact-clear` | `string` (`''`) | `create/updateArtifact` tool | StreamBridge → artifactStore | Clear content, status → streaming |
| `artifact-textDelta` | `string` | Text artifact handler | StreamBridge → artifactStore | **Append** (`content += delta`) |
| `artifact-codeDelta` | `string` | Code artifact handler | StreamBridge → artifactStore | **Replace** (`content = delta`) |
| `artifact-sheetDelta` | `string` | Sheet artifact handler | StreamBridge → artifactStore | **Replace** (`content = delta`) |
| `artifact-imageDelta` | `string` (base64) | Image handler | StreamBridge → artifactStore | **Replace** (`content = delta`) |
| `artifact-finish` | `string` (`''`) | Artifact handlers | StreamBridge → artifactStore | status → idle |
| `artifact-suggestion` | `ArtifactSuggestion` | `requestSuggestions` tool | StreamBridge → artifactStore.suggestions (accumulated array) | Accumulated |
| `chat-title` | `string` | Title generation (AWAITED) | `useChat.onData` → `PendingChats.updateTitle()` | Set title |
| `error` | `string` | Chat stream error handler | `useChat.onError` / toast | User-facing message only (no JSON envelope) |

> **Removed:** `data-usage` (no credit logic), `data-appendMessage` (not needed — useChat manages messages natively).

### AI SDK UIMessageStream Parts (Automatic)

| Part | Content | Behavior |
|------|---------|----------|
| `text-delta` | Token text | Appended to current assistant message |
| `reasoning` | Reasoning text | `sendReasoning: true` — appended to reasoning parts |
| `tool-call` | Tool invocation | Rendered as tool call in message |
| `tool-result` | Tool output | Rendered as tool result |
| `finish-step` | Step completion | Step boundary marker |
| `finish-message` | Message completion | Stream end marker |

---

## 6. Server Action Contracts

### `deleteTrailingMessages({ id, chatId })`
- **Input:** `{ id: string, chatId: string }` (Zod validated)
- **Output:** `ActionResult`
- **Side effects:** Deletes messages after the specified ID from DB, `invalidateChat(chatId)`

### `updateChatVisibility({ chatId, visibility })`
- **Input:** `{ chatId: string, visibility: 'public' | 'private' }` (Zod validated)
- **Output:** `ActionResult`
- **Side effects:** Updates visibility in DB, `invalidateChat(chatId)` + `invalidateChatList(userId)`
- **Auth:** Requires authenticated user, ownership verified

### `deleteChat({ chatId })`
- **Input:** `{ chatId: string }` (Zod validated)
- **Output:** `ActionResult`
- **Side effects:** Deletes chat from DB, `invalidateChatList(userId)`
- **Auth:** Requires ownership

### `voteOnMessage({ chatId, messageId, type })`
- **Input:** `{ chatId: string, messageId: string, type: 'up' | 'down' }` (Zod validated)
- **Output:** `ActionResult<{ messageId: string, type: 'up' | 'down' }>`
- **Side effects:** Upsert vote in DB, `invalidateVotes(chatId)`
- **Auth:** Requires non-guest

### `renameChat({ chatId, title })`
- **Input:** `{ chatId: string, title: string }` (Zod validated)
- **Output:** `ActionResult`
- **Side effects:** Updates title in DB, `invalidateChat(chatId)` + `invalidateChatList(userId)` <!-- wave4: CONF-021 — added invalidateChat(chatId) per data-flows.md 2-tag pattern -->
- **Auth:** Requires ownership

### `deleteAllChats()`
- **Input:** None
- **Output:** `ActionResult<void>`
- **Side effects:** Deletes all chats and associated messages for current user, `invalidateChatList(userId)`
- **Auth:** Requires authenticated user

### `login(prevState, formData)`
- **Input:** `FormData` — Zod `loginSchema` (email: string, password: string min 6)
- **Output:** `ActionResult<void>`
- **Side effects:** Validates credentials via Supabase, sets `sb_token` cookie, redirects to `/`
- **Auth:** None (public)
- **Error cases:** `bad_request:auth:invalid_credentials`, `internal_error:auth:session_write_failed`

### `register(prevState, formData)`
- **Input:** `FormData` — Zod `registerSchema` (email: string, password: string min 6)
- **Output:** `ActionResult<void>`
- **Side effects:** Creates user via Supabase, migrates guest data if applicable, sets `sb_token` cookie, redirects to `/`
- **Auth:** None (public)
- **Error cases:** `auth:registration:failed`, `auth:registration:email_exists`

### `logout()`
- **Input:** None
- **Output:** `ActionResult<void>`
- **Side effects:** Signs out via Supabase, clears `sb_token` and `guest_token` cookies, redirects to `/login`
- **Auth:** Requires authenticated user
- **Error cases:** None (best-effort)

---

## 7. Shared Type Contracts

### `AppSession`
```typescript
type AppSession = {
  user: {
    id: string;          // UUID or "guest:{uuid}"
    type: "authenticated" | "guest";
    email?: string;
  };
};
```
**Produced by:** `getAppSession()` (lib/auth/session)
**Consumed by:** All features, all route handlers, all server actions

### `ChatSessionValue`
```typescript
type ChatSessionValue = {
  // Identity (3)
  chatId: string;
  chatModel: string;
  isReadonly: boolean;
  // Messages (2)
  messages: Message[];
  status: 'idle' | 'submitted' | 'streaming' | 'error' | 'ready';
  // Input (4)
  input: string;
  setInput: (input: string) => void;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  // Actions (4)
  sendMessage: (event?: { preventDefault?: () => void }) => void;
  stop: () => void;
  appendMessage: (message: Message) => void;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  // Error (2)
  error: Error | null;
  clearError: () => void;
  // Visibility (2) — CV-01 Option A, DEV-031
  visibility: 'public' | 'private';
  setVisibility: (visibility: 'public' | 'private') => void;
  // Models (1) — MO-W4-C6, static per page load
  availableModels: ModelMetadata[];
};
```

<!-- SYNC: Wave 4-CHAT — CONF-002 resolution. Canonical 18-field ChatSessionValue.
     15 redesign fields + availableModels (MO-W4-C6) + visibility + setVisibility (CV-01 Option A).
     Matches behavioral_extraction/state-management.md §useMessages and scaffold/shared-types.md §10. -->

**Produced by:** `useChatSession()` in ChatShell
**Consumed by:** ChatHeader, Messages, MultimodalInput, ArtifactPanel (via `useChatSessionContext()`)
**Field count:** 18 (15 redesign + `availableModels` + `visibility` + `setVisibility`)

### `UIArtifact`
```typescript
type UIArtifact = {
  artifactId: string;
  content: string;
  kind: ArtifactKind;      // "text" | "code" | "image" | "sheet"
  title: string;
  status: "idle" | "streaming";
  isVisible: boolean;
  suggestions?: ArtifactSuggestion[];  // Accumulated by processStreamDelta (Wave 3 TC-1)
};
```
**Produced by:** `artifactStore` (useSyncExternalStore)
**Consumed by:** `StreamBridge`, `ArtifactPanel`, `ArtifactPreview`

### `ArtifactHandler`
```typescript
interface ArtifactHandler {
  create(params: CreateArtifactParams): Promise<string>;   // returns content
  update(params: UpdateArtifactParams): Promise<string>;   // returns content
}

interface CreateArtifactParams {
  id: string; title: string; kind: ArtifactKind;
  ChatStream: ArtifactStreamWriter; session: { userId: string; isGuest: boolean };
  chatId: string;
}

interface UpdateArtifactParams {
  id: string; description: string; currentContent: string;
  kind: ArtifactKind; title: string;
  ChatStream: ArtifactStreamWriter; session: { userId: string; isGuest: boolean };
}
```
**Produced by:** `features/artifacts/handlers/` (text, code, sheet)
**Consumed by:** `features/chat/lib/tools/` via `getArtifactHandler()` registry

### `PendingChatOperations`
```typescript
interface PendingChatOperations {
  add(chat: Omit<PendingChat, 'isOptimistic'>): void;
  remove(id: string): void;
  updateTitle(id: string, title: string): void;
  markConfirmed(id: string): void;
}
```
**Produced by:** `PendingChatsProvider`
**Consumed by:** `SidebarHistoryClient` (reads), `useChatSession` (writes)

### `ActionResult<T>`
```typescript
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };
```
**Used by:** All Server Actions (never throw — return structured results)

### `ModelMetadata`
```typescript
type ModelMetadata = {
  id: string;                     // "provider:model-name"
  name: string;                   // canonical display name
  description?: string;
  provider: string;
  providerModelId: string;
  modalities: { input: string[]; output: string[] };
  contextWindow: number;
  maxOutputTokens: number;
  supportsToolCalling: boolean;
  supportsReasoning: boolean;
  source: "static" | "dynamic";
};
```
**Produced by:** `getAvailableModels()` (lib/ai/models, `use cache`)
**Consumed by:** `ModelSelector`, `ChatShell` (props), chat route (model resolution)

> **Canonical source:** This mirrors the `ModelMetadata` definition in `lib/types/model.types.ts` (single source of truth). Docs and feature modules must re-export this shape, not redefine a divergent variant.

### `DataPart` (Stream Parts)
```typescript
type ArtifactDataPart =
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
  | { type: 'error'; content: string }; // In-stream chat failure, user-facing text only

type DataPart = ArtifactDataPart;
```
**Produced by:** Server route handler (ChatStream.writeData)
**Consumed by:** `ChatStreamProvider` → `StreamBridge` → `artifactStore`
