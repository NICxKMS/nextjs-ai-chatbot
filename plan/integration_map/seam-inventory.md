> **Updated per redesign audit (2026-03-01)**

# Seam Inventory

> Every integration seam that requires an explicit implementation task in the rebuild.
> Each seam is a boundary where two modules connect and data flows across.
> Updated to reflect: artifact naming, handler registry, PendingChatsProvider,
> ChatStreamProvider/StreamBridge, useSyncExternalStore, Server Actions for mutations,
> proxy.ts, and removal of credit/quota/gateway concepts.

---

## Format

| Field | Description |
|-------|-------------|
| **Seam ID** | Unique identifier (SEAM-NNN) |
| **Description** | What integration this seam represents |
| **Components** | Source and target modules involved |
| **Data Exchanged** | Types and shapes flowing across the boundary |
| **Task Needed** | What must be built/wired to implement this seam |

---

## Authentication & Session Seams

### SEAM-001: Session Provider Injection

| Field | Detail |
|-------|--------|
| **Description** | Root session provider injects auth state into all features |
| **Components** | `features/auth/components/session-provider.tsx` → All feature components |
| **Data Exchanged** | `AppSession { user: { id, type, email? } }`, session state sync, Supabase auth listener |
| **Task Needed** | Build `SessionProvider` with context, session state, and Supabase auth listener. Guest bootstrap/rotation is handled in `proxy.ts`. Wire provider into root layout (server-fetched session passed as prop). |

### SEAM-002: Auth Actions (Login/Register)

| Field | Detail |
|-------|--------|
| **Description** | Auth form submits to Server Actions that create cookie-backed session |
| **Components** | `features/auth/components/auth-form.tsx` → `features/auth/actions/login.ts` / `register.ts` → Cookie `sb_token` |
| **Data Exchanged** | `FormData(email,password,...)` → `ActionResult` + Set-Cookie |
| **Task Needed** | Build login/register Server Actions: validate input, call Supabase auth APIs, set `sb_token` httpOnly cookie (7d), redirect/return action result. |

### SEAM-003: Guest Bootstrap

| Field | Detail |
|-------|--------|
| **Description** | Auto-create guest session at edge when no auth cookies are present |
| **Components** | `proxy.ts` → Cookie `guest_token` → `lib/auth/session.ts#getAppSession()` |
| **Data Exchanged** | `Request cookies` → `{ user: { id: "guest:{uuid}", type: "guest" } }` + Set-Cookie |
| **Task Needed** | In `proxy.ts`, mint guest JWT (HS256, short exp) when missing and rotate near expiry; `getAppSession()` resolves guest session from cookie for server components/actions. |

### SEAM-004: Guest Token Rotation

| Field | Detail |
|-------|--------|
| **Description** | proxy.ts refreshes guest JWT before expiry |
| **Components** | `proxy.ts` → guest_token cookie |
| **Data Exchanged** | Existing JWT → New JWT (same sub, fresh exp) + Set-Cookie |
| **Task Needed** | In proxy.ts: decode guest_token JWT, if exp - now < 30min, sign new JWT with same sub and fresh 1h exp, set new cookie. |

### SEAM-005: Session Resolution

| Field | Detail |
|-------|--------|
| **Description** | Server-side session resolution from cookies |
| **Components** | `lib/auth/session.ts` getAppSession() → All API routes and server actions |
| **Data Exchanged** | Cookies (sb_token, guest_token) → `AppSession | null` |
| **Task Needed** | Build getAppSession(): check sb_token → jwtVerify → authenticated session; check guest_token → jwtVerify → guest session; fallback null. Memoized via React.cache per request. |

---

## Chat Streaming Seams

### SEAM-006: Chat Request Pipeline

| Field | Detail |
|-------|--------|
| **Description** | Client useChat sends message, server processes and returns SSE |
| **Components** | `features/chat/components/chat-shell.tsx` (useChatSession → useChat) → `POST /api/chat` route → SSE response |
| **Data Exchanged** | Request: `{ id, message, selectedChatModel, selectedVisibilityType, settings }`. Response: SSE stream (text-delta, reasoning, tool-call, tool-result, custom data parts). |
| **Task Needed** | Build chat route handler: Zod validation, auth, rate limit, createUIMessageStream, streamText with tools, saveMessages on finish, revalidateTag. Build useChatSession hook in ChatShell with DefaultChatTransport and prepareSendMessagesRequest. |

### SEAM-007: ChatStream Pipeline

| Field | Detail |
|-------|--------|
| **Description** | SSE custom data parts flow from server through ChatStreamProvider to StreamBridge to artifactStore |
| **Components** | Server `ChatStream.writeData()` → `ChatStreamProvider` (split context) → `StreamBridge` (effect) → `artifactStore` (useSyncExternalStore) |
| **Data Exchanged** | `DataPart[]` — array of typed data parts (`artifact-id`, `artifact-title`, `artifact-kind`, `artifact-clear`, `artifact-*Delta`, `artifact-finish`, `artifact-suggestion`, `chat-title`) |
| **Task Needed** | Build ChatStreamProvider (split state/dispatch contexts with RAF batching). Build StreamBridge (~20 lines, delegates to pure processStreamDelta()). Define DataPart union type for type-safe stream parts. |

### SEAM-008: Chat Completion Execution

| Field | Detail |
|-------|--------|
| **Description** | Server-side AI model invocation with tools, system prompt, settings |
| **Components** | `POST /api/chat` route → `lib/ai/provider.ts` (myProvider) → AI SDK `streamText()` |
| **Data Exchanged** | Model ID, messages, system prompt, tools, settings (temperature, topP, maxOutputTokens, providerOptions) → `StreamTextResult` merged into UIMessageStream |
| **Task Needed** | Build route handler: resolve model via myProvider, compose system prompt via composeSystemPrompt(), determine enabled tools via getEnabledTools(), configure smoothStream transform, set up per-provider reasoning options, manage AbortSignal. |

---

## Chat ↔ Artifacts Seams

### SEAM-009: createArtifact Tool → Artifact Handlers

| Field | Detail |
|-------|--------|
| **Description** | Chat AI tool call invokes artifact handler via registry for artifact creation |
| **Components** | `features/chat/lib/tools/create-artifact.ts` → `lib/ai/artifact-handlers.ts` (getArtifactHandler) → `features/artifacts/handlers/{kind}.ts` |
| **Data Exchanged** | Input: `{ title, kind }`. Tool writes `artifact-*` data parts to ChatStream. Handler receives `CreateArtifactParams { id, title, kind, ChatStream, session, chatId }`. Handler streams content deltas. Handler returns content string. |
| **Task Needed** | Build createArtifact tool definition (factory with session/ChatStream closures). Build handler registry in `lib/ai/artifact-handlers.ts`. Build per-kind handlers (text-handler.ts — streamText → artifact-textDelta, code-handler.ts — streamObject → artifact-codeDelta, sheet-handler.ts — streamObject → artifact-sheetDelta). Register handlers via side-effect import in route handler. |

### SEAM-010: updateArtifact Tool → Artifact Handlers

| Field | Detail |
|-------|--------|
| **Description** | Chat AI tool call invokes handler to update existing artifact |
| **Components** | `features/chat/lib/tools/update-artifact.ts` → `lib/ai/artifact-handlers.ts` → `features/artifacts/handlers/{kind}.ts` |
| **Data Exchanged** | Input: `{ id, description }`. Handler receives `UpdateArtifactParams { id, description, currentContent, kind, title, ChatStream, session }`. Streams updated content deltas. Returns content string. |
| **Task Needed** | Build updateArtifact tool. Wire to same handler registry. Handlers receive existing content and generate updated version using description as instruction. Save new version via saveArtifactVersion(). |

### SEAM-011: requestSuggestions Tool → Text Editor

| Field | Detail |
|-------|--------|
| **Description** | AI generates suggestions for artifact, streamed to text editor |
| **Components** | `features/chat/lib/tools/request-suggestions.ts` → `ChatStream` → `StreamBridge` → Text editor |
| **Data Exchanged** | `artifact-suggestion` parts: `{ originalText, suggestedText, description }` (max 5). Auth users: persisted to Suggestion table. |
| **Task Needed** | Build requestSuggestions tool. Stream `artifact-suggestion` parts. Build TipTap SuggestionsExtension for inline display. Handle accept/dismiss UI. Persist for auth users. |

### SEAM-012: Artifact Stream → Artifact Panel

| Field | Detail |
|-------|--------|
| **Description** | StreamBridge processes deltas → artifactStore updates → ArtifactPanel renders |
| **Components** | `StreamBridge` → `processStreamDelta()` (pure) → `artifactStore` (useSyncExternalStore) → `features/artifacts/components/artifact-panel.tsx` → Per-kind editor |
| **Data Exchanged** | `UIArtifact { artifactId, title, kind, content, status, isVisible }` |
| **Task Needed** | Build ArtifactPanel component. Wire useArtifact()/useArtifactSelector() to panel visibility and content. Route to correct editor by kind. Build processStreamDelta() pure function for testable delta processing. |

---

## Chat ↔ Sidebar Seams

### SEAM-013: Optimistic Chat Creation

| Field | Detail |
|-------|--------|
| **Description** | First message creates optimistic sidebar entry before server confirms |
| **Components** | `features/chat/hooks/use-chat-session.ts` → `PendingChatsProvider` → `features/sidebar/components/sidebar-history-client.tsx` |
| **Data Exchanged** | `PendingChats.add({ id, title: input.slice(0,50), createdAt, visibility })` |
| **Task Needed** | Build PendingChatsProvider (context with Set-based dedup). Wire useChatSession.sendMessage to call PendingChats.add. Wire SidebarHistoryClient to merge optimistic entries with server data. |

### SEAM-014: Title Sync (Single Channel)

| Field | Detail |
|-------|--------|
| **Description** | Chat title flows from server to sidebar via single `chat-title` stream part |
| **Components** | Server title generation → `chat-title` stream part → `useChat.onData` → `PendingChats.updateTitle()`. Server `onFinish` → `revalidateTag('chats:{userId}', 'max')` for next nav. |
| **Data Exchanged** | `string` (generated title) |
| **Task Needed** | Wire useChat.onData to call PendingChats.updateTitle on `chat-title`. Server: await title before stream close (guaranteed delivery). Revalidation in onFinish refreshes sidebar on next navigation. |

> **Removed:** `pollForTitle()` polling, `window.dispatchEvent('chat-title-updated')`. Single typed channel via PendingChatsProvider.

---

## Settings ↔ Chat Seams

### SEAM-015: Settings Pipeline

| Field | Detail |
|-------|--------|
| **Description** | Settings from localStorage flow through useChat request to server |
| **Components** | `features/settings/hooks/use-settings.ts` (useSyncExternalStore + localStorage) → `features/chat/hooks/use-chat-session.ts` (useSettings) → `prepareSendMessagesRequest` → Server route → `composeSystemPrompt()`, `streamText()` config |
| **Data Exchanged** | `SettingsState { temperature, topP, maxOutputTokens, systemPrompt, enableReasoning }` |
| **Task Needed** | Build settingsStore (useSyncExternalStore + localStorage pub/sub + cross-tab sync). Build SettingsPanel component. Wire useChatSession to read settings and include in prepareSendMessagesRequest. Server: extract settings for streamText config and system prompt. No SettingsProvider needed. |

---

## Model Selection Seams

### SEAM-016: Model Catalog → Selector → Chat

| Field | Detail |
|-------|--------|
| **Description** | Model catalog flows server→client, selection flows through cookie+localStorage to chat request |
| **Components** | `lib/ai/models.ts` (listChatModels with `use cache`) → Page props → `ModelSelector` → `chat-model` cookie + localStorage → `useChat` request → Server model resolution |
| **Data Exchanged** | Models: `ModelMetadata[]`. Selection: `string` (model ID). Server: `myProvider.languageModel(modelId)` |
| **Task Needed** | Build listChatModels() (curated + discovery merge, `cacheTag('models')`, `cacheLife('hours')`). Build ModelSelector component. Wire model ID to cookie + localStorage. Server: validate model ID via registry, resolve via myProvider. |

### SEAM-017: AI Provider Registry

| Field | Detail |
|-------|--------|
| **Description** | Environment variables → provider instances → model resolution → reasoning middleware |
| **Components** | `lib/ai/registry.ts` → `createProviderRegistry()` → `lib/ai/provider.ts` (myProvider) → `extractReasoningMiddleware` |
| **Data Exchanged** | Env vars → Provider instances. Model ID → Language model instance (optionally wrapped with reasoning middleware). |
| **Task Needed** | Build provider registry with conditional initialization (google, openai, openrouter). Build myProvider wrapper with reasoning middleware based on model ID prefix matching. Build per-provider option builders in `lib/ai/provider-options.ts`. |

---

## Voting Seam

### SEAM-018: Vote Mutation

| Field | Detail |
|-------|--------|
| **Description** | User votes on assistant message via Server Action + useOptimistic |
| **Components** | `features/voting/components/vote-buttons.tsx` → Server Action `voteOnMessage()` → `lib/data/vote` → DB |
| **Data Exchanged** | Input: `{ chatId, messageId, type: "up"|"down" }`. Optimistic: `useOptimistic(type)` immediate UI. Server: auth check, upsert vote, `updateTag('votes:{chatId}')`. Return: `ActionResult<{ messageId }>`. |
| **Task Needed** | Build VoteButtons component with useOptimistic + useTransition. Build voteOnMessage Server Action (auth, non-guest, DB upsert, updateTag). Build VoteResolver for deferred vote hydration via React 19 use(). |

> **Replaced:** SWR `PATCH /api/vote` with optimistic mutate → Server Action + useOptimistic.

---

## File Upload Seam

### SEAM-019: File Upload → Message Attachment

| Field | Detail |
|-------|--------|
| **Description** | File uploaded to blob storage, attached to message as file part |
| **Components** | `features/chat/components/multimodal-input.tsx` → `POST /api/files/upload` → Vercel Blob → Message parts |
| **Data Exchanged** | Upload: FormData with file. Response: `{ url, pathname, contentType }`. Message: `{ type: "file", data: url, mimeType, name }` part. |
| **Task Needed** | Build upload route (auth, rate limit, Vercel Blob put()). Build file picker UI in MultimodalInput. Build PreviewAttachment component. Wire attachments to message parts on submit. Handle abort on unmount. |

---

## Sidebar History Seam

### SEAM-020: Sidebar History Pagination

| Field | Detail |
|-------|--------|
| **Description** | Server-rendered initial data + client SWR pagination for chat history |
| **Components** | `features/sidebar/components/sidebar-shell.tsx` (SERVER, 'use cache') → `SidebarHistoryClient` (CLIENT, useSWRInfinite) → `GET /api/history` → `lib/data/chat` |
| **Data Exchanged** | Server: chats via `'use cache'` + `cacheTag('chats:{userId}')`. Client pagination: `?limit=20&cursor={nextCursor}`. Response: `{ chats: Chat[], nextCursor?: string, hasMore: boolean }`. |
| **Task Needed** | Build SidebarShell server component with 'use cache'. Build SidebarHistoryClient with useSWRInfinite (fallbackData from server). Build history route handler. Build date grouping logic. Wire delete and visibility actions. |

---

## Artifact Fetch Seam

### SEAM-021: Artifact Version Fetch

| Field | Detail |
|-------|--------|
| **Description** | Artifact versions fetched for artifact display and version navigation |
| **Components** | `features/artifacts/components/artifact-panel.tsx` / `artifact-preview.tsx` → SWR `"/api/artifact?id={id}"` → `GET /api/artifact` → `lib/data/artifact` |
| **Data Exchanged** | Response: `Artifact[]` (array of versions, ordered by createdAt). Each: `{ id, createdAt, title, content, kind, userId, chatId }`. |
| **Task Needed** | Build artifact route handler (GET: auth + ownership, fetch all versions). Build version navigation in ArtifactPanel (currentVersionIndex state, prev/next/restore). Wire ArtifactPreview to fetch and display mini editors. |

---

## Visibility Seam

### SEAM-022: Visibility Toggle

| Field | Detail |
|-------|--------|
| **Description** | Chat visibility toggled with Server Action + useOptimistic |
| **Components** | `features/visibility/components/visibility-selector.tsx` → Server Action `updateChatVisibility()` → `lib/data/chat`, `lib/cache/revalidate` |
| **Data Exchanged** | `{ chatId, visibility: "public"|"private" }`. Optimistic: `useOptimistic`. Server: auth, ownership, DB update, `updateTag('chat:{id}')` + `updateTag('chats:{userId}')`. Return: `ActionResult`. |
| **Task Needed** | Build VisibilitySelector component with useOptimistic. Build updateChatVisibility Server Action (auth, ownership, DB + updateTag). |

> **Replaced:** SWR optimistic + server action → pure useOptimistic + Server Action.

---

## Data Layer Seams

### SEAM-023: Session → Data Access

| Field | Detail |
|-------|--------|
| **Description** | AppSession gates all data access for guest vs auth paths |
| **Components** | `lib/auth/session.ts` getAppSession() → All `lib/data/` functions |
| **Data Exchanged** | `AppSession` → `{ userId, isGuest }` branching for authorization + feature gating. Both guest and auth paths use DB persistence with cache-tagged reads. |
| **Task Needed** | All lib/data/ functions accept session context for guest/auth branching. |

### SEAM-024: Chat Data Operations

| Field | Detail |
|-------|--------|
| **Description** | Chat CRUD operations via lib/data/chat with cache-through pattern |
| **Components** | `lib/data/chat.ts` → `lib/db/` (Drizzle) + cache via `'use cache'` + `cacheTag` |
| **Data Exchanged** | `Chat`, `ChatWithMessages`. Operations: get, getWithMessages, list, create, updateTitle, updateVisibility, delete, deleteAll. |
| **Task Needed** | Build all chat data functions. 'use cache' + cacheTag for reads. updateTag/revalidateTag for writes. |

### SEAM-025: Artifact Data Operations

| Field | Detail |
|-------|--------|
| **Description** | Artifact CRUD with composite PK versioning |
| **Components** | `lib/data/artifact.ts` → `lib/db/` |
| **Data Exchanged** | `Artifact` (with versions array). PK: (id, createdAt). Each save creates new row. |
| **Task Needed** | Build artifact data functions: getArtifactById (with all versions), saveArtifactVersion (append new version), deleteArtifactVersion. revalidateTag('artifact:{id}', 'max') on saves. |

### SEAM-026: Message Persistence

| Field | Detail |
|-------|--------|
| **Description** | Messages saved after chat completion, deleted on edit+regenerate |
| **Components** | `lib/data/message.ts` → DB. `onFinish` callback in route handler → saveMessages(). |
| **Data Exchanged** | Messages saved in onFinish. deleteTrailingMessages Server Action removes messages after edit point. |
| **Task Needed** | Build saveMessages (called in onFinish). Build deleteTrailingMessages Server Action with updateTag('chat:{id}'). |

---

## Error Handling Seams

### SEAM-027: Error Boundaries

| Field | Detail |
|-------|--------|
| **Description** | Three levels of error boundaries catch and display errors |
| **Components** | `app/global-error.tsx` (root), `app/(chat)/error.tsx` (chat route), `features/artifacts/components/artifact-error-boundary.tsx` (artifact panel) |
| **Data Exchanged** | `Error` objects caught by boundary. Reset functions for retry. |
| **Task Needed** | Build three error boundary components. Global: standalone html/body wrapper. Chat: preserves sidebar, shows retry + home. Artifact: prevents editor crashes from propagating. |

### SEAM-028: Client Error Handling (useChat.onError)

| Field | Detail |
|-------|--------|
| **Description** | Chat errors from SSE stream parsed and displayed as toast notifications |
| **Components** | `useChat.onError` → Error parsing → `toast()` (sonner) |
| **Data Exchanged** | Error response: `{ error: { code, message, status } }`. Rate limit errors show specific message. |
| **Task Needed** | Build onError handler in useChatSession: parse error from response, match codes to user-friendly messages, display toast. Handle: rate_limit, offline, auth errors. |

---

## UI Infrastructure Seams

### SEAM-029: Provider Tree Assembly

| Field | Detail |
|-------|--------|
| **Description** | Exact provider nesting order in root and chat layouts |
| **Components** | Root (SERVER): ThemeProvider → SessionProvider. Chat layout (SERVER): PendingChatsProvider → SidebarProvider. Chat page: ChatStreamProvider → ChatShell (ChatSessionContext inline). |
| **Data Exchanged** | Each provider injects its context. Order: Session must wrap routes. PendingChats must wrap sidebar + pages. ChatStreamProvider page-scoped only. |
| **Task Needed** | Build root layout with ThemeProvider + SessionProvider. Build chat layout (SERVER) with PendingChatsProvider + SidebarProvider + Suspense boundaries. Chat page: ChatStreamProvider + ChatShell + StreamBridge. |

> **Removed:** ~~SettingsProvider~~, ~~SWRConfig~~ at root, ~~TooltipProvider~~ at root, ~~ChatLayoutClient~~ monolith.

### SEAM-030: Theme System

| Field | Detail |
|-------|--------|
| **Description** | next-themes provider for dark/light mode |
| **Components** | `ThemeProvider` in root layout, `SidebarUserNav` theme toggle |
| **Data Exchanged** | Theme: `"light"|"dark"|"system"`. Applied as `class` attribute on `<html>`. |
| **Task Needed** | Build ThemeProvider wrapper in root layout. Wire theme toggle in SidebarUserNav. |

### SEAM-031: URL State Management

| Field | Detail |
|-------|--------|
| **Description** | URL updates without reload for chat navigation and notice params |
| **Components** | `useChatSession` (history.replaceState for /chat/{id}), `NoticeHandler` (?notice params → toast → clean URL) |
| **Data Exchanged** | `history.replaceState({}, '', '/chat/{chatId}')` on first message. `?notice=chat_not_found` → warning toast. |
| **Task Needed** | Wire useChatSession to update URL on first message. Build NoticeHandler client island (read params, toast, clean via history.replaceState). Extracted to prevent layout from becoming 'use client'. |

---

## Artifact Editor Seams

### SEAM-032: Text Editor (TipTap)

| Field | Detail |
|-------|--------|
| **Description** | TipTap rich-text editor renders and edits text artifact content |
| **Components** | `features/artifacts/components/text-editor.tsx` → TipTap (StarterKit, Markdown, Mathematics, Tables, SuggestionsExtension) |
| **Data Exchanged** | Content from artifactStore via useArtifact(). During streaming: content set without save emission. During idle: content changes emit debounced save. |
| **Task Needed** | Build TextEditor with TipTap configuration. Build SuggestionsExtension for inline suggestion decorations. Handle streaming vs idle modes. Wire debounced save to artifact API. |

### SEAM-033: Code Editor (CodeMirror + Pyodide)

| Field | Detail |
|-------|--------|
| **Description** | CodeMirror editor renders Python code, Pyodide executes it client-side |
| **Components** | `features/artifacts/components/code-editor.tsx` (CodeMirror), `features/artifacts/components/console.tsx` (output), Pyodide |
| **Data Exchanged** | Content from artifactStore. Console: consoleOutputs[] (stdout, stderr, images). Pyodide: code string → execution results. |
| **Task Needed** | Build CodeEditor with lazy-loaded CodeMirror (Python lang, one-dark theme). Build Console component. Wire Pyodide execution (loaded via Script in chat layout). |

### SEAM-034: Sheet Editor (react-data-grid + PapaParse)

| Field | Detail |
|-------|--------|
| **Description** | Spreadsheet editor parses CSV and renders editable grid |
| **Components** | `features/artifacts/components/sheet-editor.tsx` → PapaParse (CSV ↔ rows/columns), react-data-grid |
| **Data Exchanged** | Content from artifactStore (CSV string). Internal: parsed rows + columns for grid. |
| **Task Needed** | Build SheetEditor with PapaParse CSV parsing and react-data-grid rendering. Handle empty cells padding. Wire cell editing to CSV re-serialization and save. |

### SEAM-035: Image Editor

| Field | Detail |
|-------|--------|
| **Description** | Image display for base64/URL images from code execution |
| **Components** | `features/artifacts/components/image-editor.tsx` |
| **Data Exchanged** | Content from artifactStore (base64 data URL or URL). |
| **Task Needed** | Build ImageEditor component. Handle streaming state (loader). No AI server handler needed (images created via Pyodide). |

---

## Miscellaneous Seams

### SEAM-036: Rate Limiting Pipeline

| Field | Detail |
|-------|--------|
| **Description** | Application rate limiting with per-route configuration |
| **Components** | `proxy.ts` (edge rate limit) → Per-route app rate limiters (via lib/api/guards) |
| **Data Exchanged** | User ID → rate limit check result (allowed, retryAfter). |
| **Task Needed** | Build proxy.ts with rate limiter. Build per-route rate limit configs. |

> **Changed:** `middleware.ts` → `proxy.ts` (Next.js 16).

### SEAM-037: Pyodide Script Loading

| Field | Detail |
|-------|--------|
| **Description** | Python runtime loaded lazily for code artifact execution |
| **Components** | `Script src="pyodide.js" strategy="lazyOnload"` in chat layout (SERVER) → Code editor execution → Console output |
| **Data Exchanged** | Pyodide global → code execution → stdout/stderr/matplotlib images |
| **Task Needed** | Wire Script tag in chat layout. Build Pyodide execution handler in code editor. Capture stdout/stderr and matplotlib images. Display in Console component. |

### SEAM-038: Message Edit + Regenerate

| Field | Detail |
|-------|--------|
| **Description** | User edits previous message, trailing messages deleted, AI regenerates |
| **Components** | `features/chat/components/message-editor.tsx` → `deleteTrailingMessages` Server Action → `useChatSessionContext().editMessage()` |
| **Data Exchanged** | `{ id: messageId, chatId }` to Server Action. `editMessage(id, content)` encapsulates: delete trailing → update messages → regenerate. updateTag('chat:{id}'). |
| **Task Needed** | Build MessageEditor component. Build deleteTrailingMessages Server Action with updateTag. Wire useChatSessionContext.editMessage() to truncate and regenerate. |

### SEAM-039: Version Navigation + Restore

| Field | Detail |
|-------|--------|
| **Description** | Navigate artifact versions and restore older versions |
| **Components** | `features/artifacts/components/version-footer.tsx` → `features/artifacts/components/artifact-panel.tsx` (version state) → `DELETE /api/artifact?id=&timestamp=` |
| **Data Exchanged** | `currentVersionIndex` (local state). Restore: DELETE removes later versions. SWR mutation truncates version array. |
| **Task Needed** | Build VersionFooter (prev/next/restore/latest buttons). Build version navigation logic in ArtifactPanel (currentVersionIndex state). Build artifact DELETE route for version restore. |

### SEAM-040: Inline Artifact Preview → Artifact Panel

| Field | Detail |
|-------|--------|
| **Description** | Tool call renders inline preview that opens full artifact panel on click |
| **Components** | `features/artifacts/components/artifact-preview.tsx` (in message) → `artifactStore.setState()` → ArtifactPanel open |
| **Data Exchanged** | Click: `artifactStore.setState({ artifactId, isVisible: true })`. Panel opens with animation. |
| **Task Needed** | Build ArtifactPreview component (SWR fetch, mini editor, skeleton). Wire click to artifactStore.setState to open full panel. |

---

## Summary Matrix

| Category | Seam IDs | Count |
|----------|----------|-------|
| Authentication & Session | SEAM-001 through SEAM-005 | 5 |
| Chat Streaming | SEAM-006 through SEAM-008 | 3 |
| Chat ↔ Artifacts | SEAM-009 through SEAM-012 | 4 |
| Chat ↔ Sidebar | SEAM-013 through SEAM-014 | 2 |
| Settings ↔ Chat | SEAM-015 | 1 |
| Model Selection | SEAM-016 through SEAM-017 | 2 |
| Voting | SEAM-018 | 1 |
| File Upload | SEAM-019 | 1 |
| Sidebar History | SEAM-020 | 1 |
| Artifact Fetch | SEAM-021 | 1 |
| Visibility | SEAM-022 | 1 |
| Data Layer | SEAM-023 through SEAM-026 | 4 |
| Error Handling | SEAM-027 through SEAM-028 | 2 |
| UI Infrastructure | SEAM-029 through SEAM-031 | 3 |
| Artifact Editors | SEAM-032 through SEAM-035 | 4 |
| Miscellaneous | SEAM-036 through SEAM-040 | 5 |
| **Total** | | **40** |
