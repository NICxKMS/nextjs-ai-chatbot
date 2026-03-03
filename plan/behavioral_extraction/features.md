# Feature Inventory

> **Updated per redesign audit (2026-03-01)**

> Entry-point paths are expressed in target rebuild form (`app/**`) while behavior is extracted from `oldapp/` implementation.

## 1. Chat (Core Feature)

### Description
Real-time AI chat interface with multi-model support, streaming responses, and message history.

### Entry Points
- `/` → `app/(chat)/page.tsx` (new chat)
- `/chat/[id]` → `app/(chat)/chat/[id]/page.tsx` (existing chat)
- `POST /api/chat` → `app/api/chat/route.ts` (send message)

### User Flow
1. User lands on `/` → new chat page renders with empty `<ChatShell>` component (redesign: replaces monolithic `<Chat>`)
2. UUID generated server-side for new chat ID
3. Cookie `chat-model` read for persisted model selection, fallback to `DEFAULT_CHAT_MODEL`
4. User types message in `<MultimodalInput>`, optionally attaches files
5. On submit: `window.history.replaceState` to `/chat/{chatId}`, `sendMessage()` called
6. `useChat` hook sends POST to `/api/chat` with `{ id, message, selectedChatModel, selectedVisibilityType, settings }`
7. Server validates body via Zod (`chatRequestSchema`), checks auth, and enforces rate limits
<!-- SYNC: Wave 4-CHAT — LC-04. postRequestBodySchema renamed to chatRequestSchema per P3-T05. -->
8. `createUIMessageStream` created; inside `execute()`:
   - Title generation starts in parallel for new chats (non-blocking)
   - `executeChatCompletion()` called with `streamText` from AI SDK
9. Stream sent to client via SSE; client processes via `onData` callback
10. `onFinish`: Messages saved to DB/cache via `saveChat()`, title updated async
11. User sees streaming response with reasoning display support

### Data Requirements
- **Reads**: Chat (by ID), Messages (by chatId), Votes (by chatId+userId), User session
- **Writes**: Chat (create/update), Messages (create), Vote (upsert)
- **Cache**: Next.js cache tags (`'use cache'` + `cacheTag`) with Redis-backed rate limiting

### AI Interactions
- `streamText` with selected model via `myProvider.languageModel()`
- Tools: `getWeather`, `createArtifact`, `updateArtifact`, `requestSuggestions`
- System prompt composed from: `regularPrompt` + geo hints + optional user system prompt + `artifactsPrompt` (unless reasoning model)
- `smoothStream` transform with word chunking, 2ms delay
- 55-second timeout (`AbortSignal.timeout`)
- Max 5 steps (`stepCountIs(5)`)

### Edge Cases
<!-- C2-W4-FIXUP: ErrorCode drift fix -->
- Model not in registry → `bad_request:chat:invalid_model_id`
- Rate limit exceeded → `429 Too Many Requests`
- Chat owned by different user → `forbidden:chat:owner_mismatch`
- AI completion timeout (55s) → AbortSignal fires
- Title generation failure → Falls back to first 80 chars of message

---

## 2. Authentication

### Description
Dual auth system: Supabase (email/password) for registered users, JWT-based guest sessions.

### Entry Points
- `/login` → `app/(auth)/login/page.tsx`
- `/register` → `app/(auth)/register/page.tsx`
- Server Actions: `login`, `register`, `logout`
- `proxy.ts` (guest session creation at edge)

### User Flow — Guest
1. First visit → `proxy.ts` detects no Supabase or guest token
2. Creates JWT with `guest:{uuid}` subject, HS256, 1-hour expiry
3. Sets `guest_token` cookie (7-day TTL, httpOnly, secure, sameSite=lax)
4. `proxy.ts` rotates token when <30 min remaining

### User Flow — Register
1. User fills email/password on `/register`
2. Form submits to `register` Server Action (`useActionState`)
3. Server Action validates input + calls Supabase sign-up server-side
4. If email confirmation required → redirect to `/login` with success message
5. Otherwise set auth cookie and redirect to `/`

### User Flow — Login
1. User fills email/password on `/login`
2. Form submits to `login` Server Action (`useActionState`)
3. Server Action validates input + calls Supabase sign-in server-side
4. Server Action sets auth cookie and redirects to `/`

### Data Requirements
- **Supabase JWT**: Validated with `SUPABASE_JWT_SECRET`, audience=`authenticated`, issuer=`{SUPABASE_URL}/auth/v1`
- **Guest JWT**: Validated with `GUEST_JWT_SECRET`, 1h TTL
- **Session**: `AppSession { user: { id, type, email? } }`

---

## 3. Chat History / Sidebar

### Description
Paginated list of user's chats in sidebar with optimistic updates.

### Entry Points
- `GET /api/history` → paginated chat list
- Server Action `deleteAllChats()`
- `SidebarHistoryClient` component (SidebarShell is SERVER, SidebarHistoryClient handles client pagination)
- `usePendingChats` hook (PendingChatsProvider)

### User Flow
1. Sidebar fetches `GET /api/history?limit=20`
2. Server returns `{ chats, hasMore, nextCursor? }` with cursor-based pagination
3. New chats appear immediately via `PendingChats.add()` (optimistic, client-only)
4. When server confirms, optimistic entry replaced by real data
5. Title updates stream via `chat-title` data part → `PendingChats.updateTitle()` (single-channel)
6. Delete all: Server Action `deleteAllChats()` + `updateTag('chats:{userId}')`

### Data Requirements
- DB query with cursor pagination (`cursor` + `nextCursor`) for both guest and authenticated sessions
- Server-side cache tags for fast repeat reads
- Limit clamped: min 1, max 100, default 20

---

## 4. Artifacts

### Description
Side-panel UI for creating/editing content: text artifacts, code (Python), spreadsheets (CSV), images.

> *All "document" naming replaced with "artifact" at the application layer.*

### Entry Points
- AI tools: `createArtifact`, `updateArtifact`, `requestSuggestions`
- `<ArtifactPanel>` component (right panel)
- `GET/POST /api/artifact`
- `GET /api/suggestions`

### User Flow — Create
1. AI decides to use `createArtifact` tool with `{ title, kind }`
2. Tool streams: `artifact-id` → `artifact-title` → `artifact-kind` → `artifact-clear` → content deltas → `artifact-finish`
3. StreamBridge processes deltas via pure `processStreamDelta()`, updates `artifactStore` (useSyncExternalStore)
4. ArtifactPanel opens when `artifact-id` received (isVisible: true)
5. Server handler calls `saveArtifactVersion()` for persistence

### User Flow — Update
1. AI uses `updateArtifact` tool with `{ id, description }`
2. Fetches existing artifact via `getArtifactById()`, streams updated content
3. Same delta pattern as create
4. New version appended (versioned by `createdAt` PK)

### Artifact Types
| Kind | Server Handler | Client Component | AI Model | Streaming |
|------|---------------|-----------------|----------|-----------|
| text | `streamText` → text deltas | TipTap editor | ARTIFACT_MODEL | `artifact-textDelta` |
| code | `streamObject` → `{ code }` | CodeMirror editor | ARTIFACT_MODEL | `artifact-codeDelta` |
| sheet | `streamObject` → `{ csv }` | react-data-grid | ARTIFACT_MODEL | `artifact-sheetDelta` |
| image | (no server handler) | ImageEditor | N/A | `artifact-imageDelta` |

### Data Requirements
- **Table**: `Artifact` (composite PK: `id` + `createdAt` for versioning)
- **Reads**: All versions by artifact ID (`getArtifactVersions`)
- **Writes**: New version per save (`saveArtifactVersion`)
- **Cache**: `cacheTag('artifact:{id}')` with `revalidateTag` on mutations

---

## 5. Message Voting

### Description
Users can upvote/downvote assistant messages.

### Entry Points
- Server Action `voteOnMessage()`
- `<MessageActions>` component → `<VoteButtons>` with `useOptimistic`

### User Flow
1. User clicks thumbs up/down on assistant message
2. Server Action `voteOnMessage()` called with `useOptimistic` for instant UI
3. Server validates: auth, rate limit, non-guest, chat ownership, message belongs to chat
4. Upsert to `Vote` table (atomic ON CONFLICT)
5. `updateTag('votes:{chatId}')` for cache invalidation

### Constraints
- Guest users cannot vote (requires DB persistence)
- Message must belong to the specified chat (IDOR protection)

---

## 6. File Upload

### Description
Upload file attachments to messages.

### Entry Points
- `POST /api/files/upload`
- `<MultimodalInput>` file picker

### User Flow
1. User clicks paperclip icon in input area
2. File selected, FormData created, POST to `/api/files/upload`
3. File stored (Vercel Blob)
4. Attachment added to message parts as `{ type: "file", url, name, mediaType }`

---

## 7. Model Selection

### Description
Users can switch between available AI models.

### Entry Points
- `<ModelSelector>` in `ChatHeader` (owned by `features/models/`)
- Cookie `chat-model` persists selection + localStorage directly (not via SettingsState)

### User Flow
1. User opens model dropdown in the chat header
2. Available models from `getAvailableModels()` displayed (curated + discovered) <!-- AUDIT: Wave4-CONF-031 — listChatModels renamed to getAvailableModels per P3-T01 -->
3. Selection persisted via `chat-model` cookie + localStorage (independent of `useSettings`)
4. New chats use localStorage value; existing chats use `chat.model` (flat column) <!-- SYNC: Wave 4-CHAT — CONF-013. chat.lastContext.modelId replaced with chat.model per redesign flat column recommendation. -->

---

## 8. Chat Visibility

### Description
Each chat has a per-chat `visibility` flag (`public` \| `private`) stored on the `Chat` table; there is **no artifact-level visibility**.

### Entry Points
- `<VisibilitySelector>` component in `ChatHeader` (desktop) and sidebar share menu
- `updateChatVisibility` server action (visibility feature)

### User Flow
1. User toggles chat visibility via `VisibilitySelector` dropdown
2. Optimistic update applied immediately via React 19 `useOptimistic`
3. Server action `updateChatVisibility({ chatId, visibility })` validates auth, UUID, ownership
4. DB + cache updated (`updateTag('chat:{id}')` + `updateTag('chats:{userId}')`)
5. On failure: rollback optimistic update and show toast

---

## 9. Artifact Suggestions

### Description
AI-generated suggestions to improve text artifacts.

### Entry Points
- `requestSuggestions` AI tool (with `artifactId` parameter)
- `getSuggestions` server action
- `GET /api/suggestions?artifactId=`

### User Flow
1. User asks AI to suggest improvements (or AI calls `requestSuggestions` tool)
2. Tool streams suggestion objects with `artifact-suggestion` type
3. Each suggestion: `{ originalText, suggestedText, description }`
4. Suggestions displayed in text editor alongside content
5. For authenticated users, persisted to `Suggestion` table
6. Guest users see suggestions in-session only (not persisted)

---

## 10. Weather Tool

### Description
Real-time weather lookup via Open-Meteo API.

### Entry Points
- `getWeather` AI tool (invoked by AI during chat)

### User Flow
1. User asks about weather
2. AI invokes `getWeather` with coordinates or city name
3. Tool geocodes city if needed (Open-Meteo geocoding API)
4. Fetches weather data from Open-Meteo forecast API
5. Returns temperature, hourly forecast, sunrise/sunset

---

## 11. Settings

### Description
User-configurable chat settings stored in localStorage.

> *SettingsProvider removed. Settings use `useSyncExternalStore` + localStorage directly — no React Context needed.*

### Entry Points
- Settings panel in UI
- `useSettings()` hook (useSyncExternalStore, no provider needed)
- Settings sent with chat requests

### Configurable Options
- `temperature` (0-2)
- `topP` (0-1)
- `maxOutputTokens` (256-1,000,000)
- `systemPrompt` (max 8192 chars)
- `enableReasoning` (boolean)

<!-- AUDIT: SE-8 — Fixed nested sampling.x notation to flat SettingsState field names (temperature, topP, maxOutputTokens) per redesign -->

> **Note:** Model selection, artifact streaming, and auto-scroll are handled outside SettingsState.

---

## 12. Health Check

### Description
System health monitoring endpoint.

### Entry Points
- `GET /api/health`

### Checks
1. **Database**: `SELECT 1` with latency measurement (>1000ms = degraded)
2. **Cache (Redis)**: `PING` with latency
3. Returns overall status: `healthy | degraded | unhealthy`
