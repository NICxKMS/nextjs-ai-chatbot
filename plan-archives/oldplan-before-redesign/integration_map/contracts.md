# Integration Contracts

> Every interface contract between modules. Defines what crosses feature boundaries,
> what each module provides and consumes, and the exact data shapes exchanged.

---

## 1. Feature → Feature Dependencies

### features/chat/ → features/artifacts/

**Direction:** Chat invokes artifact creation/update via AI tools (server-side only)

| Contract | Provider | Consumer | Data Shape |
|----------|----------|----------|------------|
| `createDocument` tool | `features/chat/lib/tools/create-document.ts` | `features/artifacts/handlers/` | `{ title: string, kind: ArtifactKind }` |
| `updateDocument` tool | `features/chat/lib/tools/update-document.ts` | `features/artifacts/handlers/` | `{ id: string, description: string }` |
| `requestSuggestions` tool | `features/chat/lib/tools/suggestions.ts` | `features/artifacts/handlers/` | `{ documentId: string }` |
| Artifact data stream events | Artifact handlers (server) | `DataStreamHandler` (client, chat) | `data-id`, `data-title`, `data-kind`, `data-clear`, `data-*Delta`, `data-finish` |

**Import boundary:** Chat tools import artifact handler factory from `features/artifacts/handlers/`. No component imports cross this boundary.

### features/chat/ → features/sidebar/

**Direction:** Bidirectional via shared state (no direct imports)

| Contract | Mechanism | Data Shape |
|----------|-----------|------------|
| Optimistic chat creation | `OptimisticChatsProvider` context | `{ id, title, createdAt, visibility }` |
| Title update | `window.dispatchEvent('chat-title-updated')` | No payload (triggers SWR revalidation) |
| Chat title from stream | `data-chatTitle` stream part → `updateOptimisticChatTitle(id, title)` | `string` |
| Active chat highlight | URL pathname (`/chat/[id]`) | Sidebar reads `usePathname()` |

**Import boundary:** Both features import from `OptimisticChatsProvider` (shared hook). No direct feature→feature component imports.

### features/sidebar/ → features/chat/

**Direction:** Navigation triggers chat page load

| Contract | Mechanism | Data |
|----------|-----------|------|
| Navigate to chat | `router.push('/chat/{id}')` | Chat ID in URL |
| Delete chat redirect | `router.push('/')` after DELETE | None |

### features/chat/ → features/settings/

**Direction:** Chat reads settings, settings provides configuration

| Contract | Provider | Consumer | Data Shape |
|----------|----------|----------|------------|
| Chat settings | `SettingsProvider` context | `Chat` component | `SettingsState` (temperature, topP, maxOutputTokens, systemPrompt, enableReasoning, reasoningBudget, streamArtifacts, autoScroll) |
| Model selection | `useSettings().setSelectedModelId` | `Chat` component | `string` (model ID) |
| Auto-scroll | `useSettingsSnapshot().autoScroll` | `Messages` component | `boolean` |

### features/chat/ → features/voting/

**Direction:** Chat provides message context, voting renders in message actions

| Contract | Provider | Consumer | Data Shape |
|----------|----------|----------|------------|
| Vote state | Server (initial) → SWR cache | `MessageActions` component | `UserVote[]` |
| Vote mutation | PATCH `/api/vote` | `MessageActions` | `{ chatId, messageId, type }` |
| Chat ownership | Chat props `isReadonly`, `isGuest` | Vote button visibility | `boolean` |

### features/chat/ → features/models/

**Direction:** Models provides catalog, chat uses selected model

| Contract | Provider | Consumer | Data Shape |
|----------|----------|----------|------------|
| Available models | `listChatModels()` (server) | Chat page props → `ModelSelector` | `ModelMetadata[]` |
| Selected model | Cookie `chat-model` + localStorage | `useChat` body | `string` (model ID) |
| Model capabilities | `ModelMetadata.capabilities` | Tool enablement logic | `ModelCapability[]` |

### features/chat/ → features/auth/

**Direction:** Auth provides session, chat gates operations

| Contract | Provider | Consumer | Data Shape |
|----------|----------|----------|------------|
| Session | `AuthProvider` context | `Chat` component, API routes | `AppSession` |
| Guest state | `useAuth().isGuest` | Vote visibility, history behavior | `boolean` |
| New session flag | `useAuth().clearNewSessionFlag` | Chat component | `() => void` |

---

## 2. Feature → lib/ Dependencies

### features/chat/ → lib/

| lib/ Module | Functions Used | Purpose |
|-------------|----------------|---------|
| `lib/data/chat` | `chatData.get`, `chatData.getWithMessages`, `chatData.list`, `chatData.delete` | Chat CRUD |
| `lib/data/message` | `saveMessages`, `deleteTrailingMessages` | Message persistence |
| `lib/data/context` | `createContext(session)` | Guest/auth branching |
| `lib/ai/providers` | `myProvider.languageModel(modelId)` | Model resolution |
| `lib/ai/registry` | `isValidModelId()`, `listChatModels()` | Model validation |
| `lib/auth/session` | `getAppSession()` | Session resolution |
| `lib/errors` | `ChatSDKError`, `AppError` | Error creation |
| `lib/api/guards` | `requireAuthForRoute`, `requireRateLimitForRoute` | Route protection |
| `lib/api/validators` | `parseJsonBodyForRoute`, Zod parsing | Input validation |
| `lib/cache/` | (indirect via lib/data/) | Cache operations |
| `lib/utils` | `generateUUID`, `fetchWithErrorHandlers` | UUID generation, fetch wrapper |

### features/artifacts/ → lib/

| lib/ Module | Functions Used | Purpose |
|-------------|----------------|---------|
| `lib/data/document` | `documentData.get`, `documentData.getAll`, `documentData.save` | Document CRUD |
| `lib/data/context` | `createContext(session)` | Guest/auth branching |
| `lib/ai/providers` | `myProvider.languageModel('artifact-model')` | Artifact AI model |
| `lib/db/queries` | `saveSuggestions` | Suggestion persistence |
| `lib/utils` | `generateUUID` | Document ID generation |

### features/sidebar/ → lib/

| lib/ Module | Functions Used | Purpose |
|-------------|----------------|---------|
| `lib/data/chat` | (indirect via API) | Chat history fetching |
| `lib/types` | `Chat`, `ChatMessage` types | Type definitions |

### features/auth/ → lib/

| lib/ Module | Functions Used | Purpose |
|-------------|----------------|---------|
| `lib/auth/session` | `getAppSession()` | Session resolution |
| `lib/auth/config` | JWT secrets, Supabase config | Auth configuration |
| `lib/errors` | `ChatSDKError` | Auth error responses |

### features/voting/ → lib/

| lib/ Module | Functions Used | Purpose |
|-------------|----------------|---------|
| `lib/data/chat` | `chatData.get`, `chatData.getWithMessages` | Ownership + membership verification |
| `lib/db/queries` | `voteMessage` | Vote upsert |
| `lib/api/guards` | All route guards | Auth, rate limit, ownership |

---

## 3. Component → Hook → Action → Data Chains

### Chat Send Message Chain

```
MultimodalInput (component)
  → useChat.handleSubmit() (hook — @ai-sdk/react)
    → DefaultChatTransport (AI SDK transport)
      → POST /api/chat (route handler)
        → parseJsonBodyForRoute (lib/api/validators)
        → getAppSession() (lib/auth/session)
        → requireRateLimitForRoute (lib/api/guards)
        → getUserMessageCount (lib/data/ → lib/cache/)
        → chatData.getWithMessages (lib/data/chat → lib/cache/ → lib/db/)
        → createUIMessageStream (AI SDK)
          → streamText (AI SDK → lib/ai/providers)
          → tool calls → features/artifacts/handlers/
        → saveChat (lib/data/chat-operations → lib/data/ → lib/db/ + lib/cache/)
```

### Artifact Create/Update Chain

```
AI streamText response (server)
  → createDocument tool execution (features/chat/lib/tools/)
    → documentHandlersByArtifactKind[kind] (features/artifacts/handlers/)
      → handler.onCreateDocument() (features/artifacts/handlers/{kind}.ts)
        → streamText/streamObject (AI SDK)
        → dataStream.writeData() (data-id, data-title, data-kind, data-clear, deltas, data-finish)
        → documentData.save() (lib/data/document → lib/db/ + lib/cache/)
  → SSE response to client
    → useChat.onData() (hook — @ai-sdk/react)
      → setDataStream() (DataStreamProvider dispatch)
        → DataStreamHandler (component)
          → setArtifact() (useArtifact SWR mutate)
            → Artifact panel re-renders (component)
              → Editor component ({kind}-editor.tsx)
```

### Visibility Toggle Chain

```
VisibilitySelector (component)
  → useChatVisibility.setVisibilityType() (hook)
    → SWR optimistic mutate (immediate UI)
    → updateChatVisibility() (server action — app/(chat)/actions.ts)
      → getAppSession() (lib/auth/session)
      → chatData.updateVisibility() (lib/data/chat → lib/db/ + lib/cache/)
    → on failure: SWR rollback + toast.error()
```

### Vote Chain

```
MessageActions (component) → vote button click
  → PATCH /api/vote (route handler)
    → parseJsonBodyForRoute (lib/api/validators)
    → requireAuthForRoute (lib/api/guards)
    → requireNonGuestForRoute (lib/api/guards)
    → chatData.get (lib/data/chat) → ownership check
    → chatData.getWithMessages (lib/data/chat) → message membership check
    → voteMessage (lib/db/queries) → DB upsert
```

### Sidebar History Chain

```
SidebarHistory (component)
  → useSWRInfinite(getChatHistoryPaginationKey, fetcher) (hook)
    → GET /api/history?limit=20 (route handler)
      → requireAuthForRoute (lib/api/guards)
      → requireRateLimitForRoute (lib/api/guards)
      → chatData.list (lib/data/chat)
        → Guest: cache ZSET + batch MGET
        → Auth: DB query with cursor pagination
```

---

## 4. API Route → Action → Repository Chain

| Route | Handler | Guards | Data Layer | DB/Cache |
|-------|---------|--------|------------|----------|
| `POST /api/chat` | `route.ts` | auth, rate limit, quota | `chatData.getWithMessages`, `saveChat` | Both |
| `GET /api/history` | `route.ts` | auth, rate limit | `chatData.list` | Both |
| `DELETE /api/history` | `route.ts` | auth, strict rate limit | `chatData.deleteAll` | Both |
| `DELETE /api/chat/[id]` | `route.ts` | auth, ownership | `chatData.get`, `chatData.delete` | Both |
| `PATCH /api/vote` | `route.ts` | auth, non-guest, rate limit, ownership, membership | `chatData.get`, `chatData.getWithMessages`, `voteMessage` | DB only |
| `GET /api/document` | `route.ts` | auth, rate limit, ownership | `documentData.getAll` | Both |
| `POST /api/document` | `route.ts` | auth, rate limit | `documentData.save` | Both |
| `DELETE /api/document` | `route.ts` | auth, non-guest, ownership | `documentData.delete` | Both |
| `GET /api/suggestions` | `route.ts` | auth | `documentData.getSuggestions` | DB |
| `POST /api/files/upload` | `route.ts` | auth, upload rate limit | Vercel Blob `put()` | Blob storage |
| `POST /api/auth/exchange` | `route.ts` | none (creates session) | JWT verify + cookie set | None |
| `POST /api/auth/guest` | `route.ts` (or proxy) | none | JWT sign + cookie set | None |
| `GET /api/health` | `route.ts` | none | DB ping + cache ping | Both |

---

## 5. Streaming Event Contracts

### SSE Data Part Types (Server → Client)

| Part Type | Data Type | Source | Consumer | Lifecycle |
|-----------|-----------|--------|----------|-----------|
| `data-id` | `string` (UUID) | `createDocument` tool | `DataStreamHandler` → `useArtifact` | Transient |
| `data-title` | `string` | `createDocument` tool | `DataStreamHandler` → `useArtifact` | Transient |
| `data-kind` | `ArtifactKind` | `createDocument` tool | `DataStreamHandler` → `useArtifact` | Transient |
| `data-clear` | `null` | `create/updateDocument` tool | `DataStreamHandler` → `useArtifact` | Transient |
| `data-textDelta` | `string` | Text artifact handler | `DataStreamHandler` → `useArtifact` (append) | Transient |
| `data-codeDelta` | `string` | Code artifact handler | `DataStreamHandler` → `useArtifact` (replace) | Transient |
| `data-sheetDelta` | `string` | Sheet artifact handler | `DataStreamHandler` → `useArtifact` (replace) | Transient |
| `data-imageDelta` | `string` (base64) | Image handler | `DataStreamHandler` → `useArtifact` (replace) | Transient |
| `data-finish` | `null` | Document handlers | `DataStreamHandler` → `useArtifact` (status→idle) | Transient |
| `data-suggestion` | `Suggestion` object | `requestSuggestions` tool | `DataStreamHandler` → suggestions state | Transient |
| `data-chatTitle` | `string` | Title generation | `useChat.onData` → `updateOptimisticChatTitle` | Transient |
| `data-usage` | `AppUsage` object | Chat completion onFinish | `useChat.onData` → `setUsage` state | Persisted (lastContext) |
| `data-appendMessage` | `ChatMessage` JSON | Server action | `useChat.onData` → `setMessages` | Persisted |

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

### `generateTitleFromUserMessage({ message })`
- **Input:** `{ message: UIMessage }` (the first user message)
- **Output:** `string` (generated title, or first 80 chars fallback)
- **Side effects:** None (pure generation)

### `deleteTrailingMessages({ id, chatId })`
- **Input:** `{ id: string, chatId: string }` (message ID to delete from)
- **Output:** `void`
- **Side effects:** Deletes messages after the specified ID from DB + cache

### `updateChatVisibility({ chatId, visibility })`
- **Input:** `{ chatId: string, visibility: 'public' | 'private' }` (validated by Zod)
- **Output:** `void`
- **Side effects:** Updates chat visibility in DB + cache
- **Auth:** Requires non-guest, ownership verified

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

### `DataContext`
```typescript
type DataContext = {
  userId: string;
  isGuest: boolean;
};
```
**Produced by:** `createDataContext(session)` (lib/data/context)
**Consumed by:** All `lib/data/` functions

### `UIArtifact`
```typescript
type UIArtifact = {
  documentId: string;
  content: string;
  kind: ArtifactKind;      // "text" | "code" | "image" | "sheet"
  title: string;
  status: "idle" | "streaming";
  isVisible: boolean;
  boundingBox: { top, left, width, height };
};
```
**Produced by:** `useArtifact()` SWR state
**Consumed by:** `DataStreamHandler`, `Artifact` panel, `DocumentPreview`

### `ModelMetadata`
```typescript
type ModelMetadata = {
  id: string;                     // "provider:model-name"
  providerId: ProviderId;
  modelId: string;
  name: string;
  capabilities: ModelCapability[];
  modalities: ModelModality[];
  reasoningType?: ReasoningType;
  source: "curated" | "discovered";
  isCurated: boolean;
};
```
**Produced by:** `listChatModels()` (lib/ai/registry)
**Consumed by:** `ModelSelector`, `Chat` (tool enablement), chat route (model resolution)

### `ChatMessage` (extends AI SDK `UIMessage`)
```typescript
type ChatMessage = UIMessage & {
  // Standard AI SDK message fields: id, role, parts[], createdAt
};
```
**Produced by:** Server (DB/cache), `useChat` hook (client)
**Consumed by:** `Messages`, `PreviewMessage`, `MessageActions`, server actions

### `UserVote`
```typescript
type UserVote = {
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
};
```
**Produced by:** Server (DB query on chat page load)
**Consumed by:** `MessageActions` (vote button state)
