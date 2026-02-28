# Seam Inventory

> Every integration seam that requires an explicit implementation task in the rebuild.
> Each seam is a boundary where two modules connect and data flows across.

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

### SEAM-001: Auth Provider Injection

| Field | Detail |
|-------|--------|
| **Description** | Root auth provider injects session into all features |
| **Components** | `features/auth/components/auth-provider.tsx` → All feature components |
| **Data Exchanged** | `AppSession { user: { id, type, email? } }`, `status`, `isNewSession`, `setSession()`, `clearNewSessionFlag()` |
| **Task Needed** | Build `AuthProvider` with context, session state, guest bootstrap effect, Supabase auth listener. Wire into root layout AppShell. |

### SEAM-002: Auth Exchange (Login/Register)

| Field | Detail |
|-------|--------|
| **Description** | Client-side Supabase auth → server-side cookie session |
| **Components** | `features/auth/components/auth-form.tsx` → `POST /api/auth/exchange` → Cookie `sb_token` |
| **Data Exchanged** | `{ accessToken: string }` → `{ user: { id, email } }` + Set-Cookie |
| **Task Needed** | Build exchange route handler: jwtVerify with SUPABASE_JWT_SECRET (audience=authenticated, issuer=SUPABASE_URL/auth/v1), set httpOnly cookie (7d), return user. |

### SEAM-003: Guest Bootstrap

| Field | Detail |
|-------|--------|
| **Description** | Auto-create guest session when no auth cookies present |
| **Components** | `AuthProvider` (client detect) → `POST /api/auth/guest` → Cookie `guest_token` |
| **Data Exchanged** | `void` → `{ user: { id: "guest:{uuid}", type: "guest" } }` + Set-Cookie |
| **Task Needed** | Build guest route handler: generate guest:{uuid}, sign HS256 JWT (1h exp), set httpOnly cookie (7d). AuthProvider must POST on mount when no initialSession. |

### SEAM-004: Guest Token Rotation

| Field | Detail |
|-------|--------|
| **Description** | Proxy/middleware refreshes guest JWT before expiry |
| **Components** | `middleware.ts` or `proxy.ts` → guest_token cookie |
| **Data Exchanged** | Existing JWT → New JWT (same sub, fresh exp) + Set-Cookie |
| **Task Needed** | In middleware: decode guest_token JWT, if exp - now < 30min, sign new JWT with same sub and fresh 1h exp, set new cookie. |

### SEAM-005: Session Resolution

| Field | Detail |
|-------|--------|
| **Description** | Server-side session resolution from cookies |
| **Components** | `lib/auth/session.ts` getAppSession() → All API routes and server actions |
| **Data Exchanged** | Cookies (sb_token, guest_token) → `AppSession | null` |
| **Task Needed** | Build getAppSession(): check sb_token → jwtVerify → authenticated session; check guest_token → jwtVerify → guest session; fallback null. |

---

## Chat Streaming Seams

### SEAM-006: Chat Request Pipeline

| Field | Detail |
|-------|--------|
| **Description** | Client useChat sends message, server processes and returns SSE |
| **Components** | `features/chat/components/chat.tsx` (useChat) → `POST /api/chat` route → SSE response |
| **Data Exchanged** | Request: `{ id, message, selectedChatModel, selectedVisibilityType, settings }`. Response: SSE stream (text-delta, reasoning, tool-call, tool-result, custom data parts). |
| **Task Needed** | Build chat route handler: Zod validation, auth, rate limit, quota check, createUIMessageStream, executeChatCompletion, saveChat on finish. Build useChat config in Chat component with DefaultChatTransport and prepareSendMessagesRequest. |

### SEAM-007: DataStream Pipeline

| Field | Detail |
|-------|--------|
| **Description** | SSE custom data parts flow from server through provider to handler to SWR state |
| **Components** | Server `dataStream.write()` → `DataStreamProvider` (context) → `DataStreamHandler` (effect) → `useArtifact` (SWR) |
| **Data Exchanged** | `DataUIPart<CustomUIDataTypes>[]` — array of typed data parts (data-id, data-title, data-kind, data-clear, data-*Delta, data-finish, data-suggestion, data-chatTitle, data-usage) |
| **Task Needed** | Build DataStreamProvider (split state/dispatch contexts). Build DataStreamHandler (process deltas, update artifact SWR state). Define CustomUIDataTypes for type-safe stream parts. |

### SEAM-008: Chat Completion Execution

| Field | Detail |
|-------|--------|
| **Description** | Server-side AI model invocation with tools, system prompt, settings |
| **Components** | `features/chat/actions/stream-chat.ts` → `lib/ai/providers.ts` → AI SDK `streamText()` |
| **Data Exchanged** | Model ID, messages, system prompt, tools, settings (temperature, topP, maxOutputTokens, providerOptions) → `StreamTextResult` merged into data stream |
| **Task Needed** | Build executeChatCompletion: resolve model via myProvider, compose system prompt, determine enabled tools, configure smoothStream transform, set up providerOptions for reasoning models, manage AbortSignal timeout. |

---

## Chat ↔ Artifacts Seams

### SEAM-009: createDocument Tool → Artifact Handlers

| Field | Detail |
|-------|--------|
| **Description** | Chat AI tool call invokes artifact handler for document creation |
| **Components** | `features/chat/lib/tools/create-document.ts` → `features/artifacts/handlers/{kind}.ts` |
| **Data Exchanged** | Input: `{ title, kind }`. Tool writes data parts to dataStream. Handler receives `{ id, title, dataStream, session, chatId }`. Handler streams content deltas. Handler calls documentData.save(). |
| **Task Needed** | Build createDocument tool definition. Build document handler factory (base.ts). Build per-kind handlers (text.ts — streamText, code.ts — streamObject({code}), sheet.ts — streamObject({csv})). Register handlers in documentHandlersByArtifactKind. |

### SEAM-010: updateDocument Tool → Artifact Handlers

| Field | Detail |
|-------|--------|
| **Description** | Chat AI tool call invokes handler to update existing document |
| **Components** | `features/chat/lib/tools/update-document.ts` → `features/artifacts/handlers/{kind}.ts` |
| **Data Exchanged** | Input: `{ id, description }`. Handler receives existing document content + description. Streams updated content deltas. Saves new version. |
| **Task Needed** | Build updateDocument tool. Wire to same handler factory. Handlers receive existing content and generate updated version using description as instruction. |

### SEAM-011: requestSuggestions Tool → Text Editor

| Field | Detail |
|-------|--------|
| **Description** | AI generates suggestions for document, streamed to text editor |
| **Components** | `features/chat/lib/tools/suggestions.ts` → `dataStream` → `DataStreamHandler` → Text editor `SuggestionsExtension` |
| **Data Exchanged** | `data-suggestion` parts: `{ originalText, suggestedText, description }` (max 5). Auth users: persisted to Suggestion table. |
| **Task Needed** | Build requestSuggestions tool. Stream data-suggestion parts. Build TipTap SuggestionsExtension for inline display. Handle accept/dismiss UI. Persist for auth users. |

### SEAM-012: Artifact Stream → Artifact Panel

| Field | Detail |
|-------|--------|
| **Description** | DataStreamHandler updates trigger artifact panel open/render |
| **Components** | `DataStreamHandler` → `useArtifact` SWR → `features/artifacts/components/artifact.tsx` → Per-kind editor |
| **Data Exchanged** | `UIArtifact { documentId, title, kind, content, status, isVisible, boundingBox }` |
| **Task Needed** | Build Artifact panel component. Wire useArtifact SWR state to panel visibility and content. Build AnimatePresence open/close transitions. Route to correct editor by kind. |

---

## Chat ↔ Sidebar Seams

### SEAM-013: Optimistic Chat Creation

| Field | Detail |
|-------|--------|
| **Description** | First message creates optimistic sidebar entry before server confirms |
| **Components** | `features/chat/components/chat.tsx` → `OptimisticChatsProvider` → `features/sidebar/components/sidebar-history.tsx` |
| **Data Exchanged** | `addOptimisticChat({ id, title: input.slice(0,50), createdAt, visibility })` |
| **Task Needed** | Build OptimisticChatsProvider (context with Set-based dedup). Wire Chat.handleSubmit to call addOptimisticChat. Wire SidebarHistory to prepend optimistic entries in __optimistic__ group. Auto-cleanup entries > 2min old. |

### SEAM-014: Title Sync (Stream + Poll + Event)

| Field | Detail |
|-------|--------|
| **Description** | Chat title flows from server generation to sidebar display via 3 mechanisms |
| **Components** | Server title generation → `data-chatTitle` stream part → `useChat.onData` → `updateOptimisticChat`. `Chat.onFinish` → poll → `window.dispatchEvent('chat-title-updated')` → SidebarHistory listener → SWR revalidation. |
| **Data Exchanged** | `string` (generated title) |
| **Task Needed** | Wire useChat.onData to call updateOptimisticChat on data-chatTitle. Build pollForTitle (5 attempts, 500ms). Dispatch chat-title-updated event. Wire SidebarHistory to listen for event and trigger SWR revalidation. |

---

## Settings ↔ Chat Seams

### SEAM-015: Settings Pipeline

| Field | Detail |
|-------|--------|
| **Description** | Settings from localStorage flow through useChat request to server |
| **Components** | `features/settings/` (SettingsProvider, localStorage) → `features/chat/components/chat.tsx` (useSettings) → `prepareSendMessagesRequest` → Server route → `systemPrompt()`, `streamText()` config |
| **Data Exchanged** | `SettingsState { sampling: {temperature, topP, maxOutputTokens}, systemPrompt, enableReasoning, reasoningBudget, streamArtifacts, autoScroll, selectedModelId }` |
| **Task Needed** | Build SettingsProvider (useSyncExternalStore + localStorage pub/sub). Build SettingsSheet component. Wire Chat to read settings and include in prepareSendMessagesRequest. Server: extract settings for streamText config and system prompt. |

---

## Model Selection Seams

### SEAM-016: Model Catalog → Selector → Chat

| Field | Detail |
|-------|--------|
| **Description** | Model catalog flows server→client, selection flows through cookie+localStorage to chat request |
| **Components** | `lib/ai/model-registry.ts` (listChatModels) → Page props → `ModelSelector/ModelSelectorCompact` → `chat-model` cookie + `settings.selectedModelId` localStorage → `useChat` request → Server model resolution |
| **Data Exchanged** | Models: `ModelMetadata[]`. Selection: `string` (model ID). Server: `myProvider.languageModel(modelId)` |
| **Task Needed** | Build listChatModels() (curated + discovery merge). Build ModelSelector and ModelSelectorCompact components. Wire model ID to cookie + localStorage. Server: isValidModelId(), getModelById(), myProvider resolution. |

### SEAM-017: AI Provider Registry

| Field | Detail |
|-------|--------|
| **Description** | Environment variables → provider instances → model resolution → reasoning middleware |
| **Components** | `lib/ai/providers.ts` → `createProviderRegistry()` → `myProvider.languageModel()` → `extractReasoningMiddleware` |
| **Data Exchanged** | Env vars → Provider instances. Model ID → Language model instance (optionally wrapped with reasoning middleware). |
| **Task Needed** | Build provider registry with conditional initialization (6 providers). Build myProvider wrapper with reasoning middleware support. Build per-provider option builders. |

---

## Voting Seam

### SEAM-018: Vote Mutation

| Field | Detail |
|-------|--------|
| **Description** | User votes on assistant message, optimistic SWR update + server persistence |
| **Components** | `features/chat/components/message-actions.tsx` → `PATCH /api/vote` → `lib/data/vote` → DB |
| **Data Exchanged** | Request: `{ chatId, messageId, type: "up"|"down" }`. Optimistic: SWR mutate vote array. Server: ownership check, message membership check, DB upsert. |
| **Task Needed** | Build vote route handler with all guards (auth, non-guest, rate limit, ownership, message membership). Build optimistic SWR mutation in MessageActions. Build voteMessage DB operation (INSERT ON CONFLICT UPDATE). |

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
| **Description** | Paginated chat history loaded via SWR infinite scroll |
| **Components** | `features/sidebar/components/sidebar-history.tsx` → `useSWRInfinite` → `GET /api/history` → `lib/data/chat` |
| **Data Exchanged** | Request: `?limit=20&offset={page*20}`. Response: `{ chats: Chat[], hasMore: boolean }`. Guest: cache ZSET + batch MGET. Auth: DB cursor pagination. |
| **Task Needed** | Build history route handler (auth, rate limit, guest/auth branching, cursor pagination). Build SidebarHistory with useSWRInfinite and GroupedVirtuoso. Build date grouping logic (Today, Yesterday, Last 7/30 days, Older). Wire delete and visibility actions. |

---

## Document Fetch Seam

### SEAM-021: Document Version Fetch

| Field | Detail |
|-------|--------|
| **Description** | Document versions fetched for artifact display and version navigation |
| **Components** | `features/artifacts/components/artifact.tsx` / `document-preview.tsx` → SWR `"/api/document?id={id}"` → `GET /api/document` → `lib/data/document` |
| **Data Exchanged** | Response: `Document[]` (array of versions, ordered by createdAt). Each: `{ id, createdAt, title, content, kind, userId, chatId }`. |
| **Task Needed** | Build document route handler (GET: auth + ownership, fetch all versions). Build version navigation in Artifact component (currentVersionIndex state, prev/next/restore). Wire DocumentPreview to fetch and display mini editors. |

---

## Visibility Seam

### SEAM-022: Visibility Toggle

| Field | Detail |
|-------|--------|
| **Description** | Chat visibility toggled with optimistic update and server action |
| **Components** | `features/chat/components/visibility-selector.tsx` → `useChatVisibility` hook → server action `updateChatVisibility` → `lib/data/chat` |
| **Data Exchanged** | `{ chatId, visibility: "public"|"private" }`. SWR key: `"{chatId}-visibility"`. Optimistic mutate, rollback on failure. |
| **Task Needed** | Build VisibilitySelector component. Build useChatVisibility hook (SWR optimistic + server action). Build updateChatVisibility server action (auth, ownership, DB + cache update). |

---

## Data Layer Seams

### SEAM-023: Data Context (Session → Guest/Auth Branching)

| Field | Detail |
|-------|--------|
| **Description** | AppSession creates DataContext that gates all data access for guest vs auth paths |
| **Components** | `lib/data/context.ts` createDataContext() → All `lib/data/` functions |
| **Data Exchanged** | `AppSession` → `DataContext { userId, isGuest }`. Guest: cache-only (no DB fallback). Auth: cache-first with DB fallback + cache warming. |
| **Task Needed** | Build DataContext type and createDataContext(). All lib/data/ functions must accept DataContext and branch on isGuest. Build withCache helper for common cache-through pattern. |

### SEAM-024: Chat Data Operations

| Field | Detail |
|-------|--------|
| **Description** | Chat CRUD operations via lib/data/chat with cache-through pattern |
| **Components** | `lib/data/chat.ts` → `lib/db/` (Drizzle) + `lib/cache/` (Redis) |
| **Data Exchanged** | `Chat`, `ChatWithMessages`, `PaginatedResult<Chat>`. Operations: get, getWithMessages, list, create, updateTitle, updateVisibility, delete, deleteAll. |
| **Task Needed** | Build all chat data functions with guest/auth branching, cache-first reads, write-through cache, and cache invalidation. Build saveChat orchestrator (creates chat + saves messages + updates quota). |

### SEAM-025: Document Data Operations

| Field | Detail |
|-------|--------|
| **Description** | Document CRUD with composite PK versioning |
| **Components** | `lib/data/document.ts` → `lib/db/` + `lib/cache/` |
| **Data Exchanged** | `Document` (with versions array). PK: (id, createdAt). Each save creates new row. Cache: entire version history in single key. |
| **Task Needed** | Build document data functions: get (with all versions), save (append new version), delete (specific version by timestamp). Handle cache versioning (append to cached array). |

### SEAM-026: Message Persistence

| Field | Detail |
|-------|--------|
| **Description** | Messages saved after chat completion, deleted on edit+regenerate |
| **Components** | `lib/data/chat-operations.ts` saveChat() → `lib/data/message.ts` → DB + cache |
| **Data Exchanged** | User message saved before streaming. Assistant messages saved in onFinish. deleteTrailingMessages removes messages after edit point. |
| **Task Needed** | Build saveChat orchestrator: create chat if new, save user message, save assistant messages (from onFinish), increment quota counter. Build deleteTrailingMessages server action. |

---

## Error Handling Seams

### SEAM-027: Error Boundaries

| Field | Detail |
|-------|--------|
| **Description** | Three levels of error boundaries catch and display errors |
| **Components** | `app/global-error.tsx` (root), `app/(chat)/error.tsx` (chat route), `features/artifacts/components/artifact-error-boundary.tsx` (artifact panel) |
| **Data Exchanged** | `Error` objects caught by boundary. Reset functions for retry. |
| **Task Needed** | Build three error boundary components. Global: standalone html/body wrapper. Chat: preserves sidebar, shows retry + home buttons. Artifact: prevents editor crashes from propagating, retry button. |

### SEAM-028: Client Error Handling (useChat.onError)

| Field | Detail |
|-------|--------|
| **Description** | Chat errors from SSE stream parsed and displayed as toast notifications |
| **Components** | `useChat.onError` → ChatSDKError parsing → `toast()` (sonner) |
| **Data Exchanged** | Error response: `{ error: { code, message, status } }`. Rate limit errors show specific message. Offline errors show "connection lost". |
| **Task Needed** | Build onError handler: parse ChatSDKError from response JSON, match error codes to user-friendly messages, display toast notification. Handle specific codes: rate_limit, offline, activate_gateway. |

---

## UI Infrastructure Seams

### SEAM-029: Provider Tree Assembly

| Field | Detail |
|-------|--------|
| **Description** | Exact provider nesting order in root and chat layouts |
| **Components** | Root: ThemeProvider → TooltipProvider → Toaster → SWRConfig → AuthProvider. Chat: SettingsProvider → DataStreamProvider → OptimisticChatsProvider → SidebarProvider. |
| **Data Exchanged** | Each provider injects its context. Order matters: Auth must be inside SWR. Settings must wrap DataStream. DataStream must wrap OptimisticChats (both consumed by Chat). |
| **Task Needed** | Build root layout AppShell with exact provider order. Build ChatLayoutClient with exact provider order. Wire Suspense boundaries with correct fallbacks (AppShellFallback, SidebarSkeleton, Loader). |

### SEAM-030: Theme System

| Field | Detail |
|-------|--------|
| **Description** | next-themes provider + inline script for theme-color meta sync |
| **Components** | `components/theme-provider.tsx` (ThemeProvider), inline Script in root layout, `SidebarUserNav` theme toggle |
| **Data Exchanged** | Theme: `"light"|"dark"|"system"`. Applied as `class` attribute on `<html>`. Theme-color meta tag synced via MutationObserver on html class. |
| **Task Needed** | Build ThemeProvider wrapper. Add inline script for theme-color meta sync (MutationObserver watching html class changes). Wire theme toggle in SidebarUserNav. |

### SEAM-031: URL State Management

| Field | Detail |
|-------|--------|
| **Description** | URL updates without reload for chat navigation and notice params |
| **Components** | `Chat` component (history.replaceState for /chat/{id}), `ChatLayoutClient` (?notice params → toast → clean URL) |
| **Data Exchanged** | `history.replaceState({}, '', '/chat/{chatId}')` on first message. `?notice=chat_not_found` → warning toast. `?notice=user_not_found` → error toast. |
| **Task Needed** | Wire Chat.handleSubmit to update URL on first message. Build ChatLayoutClient notice param handling (read, toast, clean via history.replaceState). |

---

## Artifact Editor Seams

### SEAM-032: Text Editor (TipTap)

| Field | Detail |
|-------|--------|
| **Description** | TipTap rich-text editor renders and edits text artifact content |
| **Components** | `features/artifacts/components/text-editor.tsx` → TipTap (StarterKit, Markdown, Mathematics, Tables, SuggestionsExtension) |
| **Data Exchanged** | Props: `content` (markdown), `onSaveContent`, `status`, `isCurrentVersion`, `suggestions[]`. During streaming: content set without save emission. During idle: content changes emit save. |
| **Task Needed** | Build TextEditor with TipTap configuration. Build SuggestionsExtension for inline suggestion decorations. Handle streaming vs idle modes. Wire debounced save to document API. |

### SEAM-033: Code Editor (CodeMirror + Pyodide)

| Field | Detail |
|-------|--------|
| **Description** | CodeMirror editor renders Python code, Pyodide executes it client-side |
| **Components** | `features/artifacts/components/code-editor.tsx` (CodeMirror), `features/artifacts/components/console.tsx` (output), Pyodide (loaded via Script tag) |
| **Data Exchanged** | Props: `content` (Python code), `onSaveContent`, `status`. Console: `consoleOutputs[]` (stdout, stderr, images). Pyodide: code string → execution results. |
| **Task Needed** | Build CodeEditor with lazy-loaded CodeMirror (Python lang, one-dark theme). Build Console component with resizable output area. Wire Pyodide execution (loaded in ChatLayoutClient via Script). Handle module cache for CodeMirror. |

### SEAM-034: Sheet Editor (react-data-grid + PapaParse)

| Field | Detail |
|-------|--------|
| **Description** | Spreadsheet editor parses CSV and renders editable grid |
| **Components** | `features/artifacts/components/sheet-editor.tsx` → PapaParse (CSV ↔ rows/columns), react-data-grid (grid rendering) |
| **Data Exchanged** | Props: `content` (CSV string), `saveContent`, `status`. Internal: parsed rows + columns for grid. MIN_ROWS=50, MIN_COLS=26 (A-Z). |
| **Task Needed** | Build SheetEditor with PapaParse CSV parsing and react-data-grid rendering. Handle empty cells padding to MIN_ROWS/MIN_COLS. Wire cell editing to CSV re-serialization and save. |

### SEAM-035: Image Editor

| Field | Detail |
|-------|--------|
| **Description** | Image display for base64/URL images from code execution |
| **Components** | `features/artifacts/components/image-editor.tsx` |
| **Data Exchanged** | Props: `content` (base64 data URL or URL), `title`, `status`, `isInline`. |
| **Task Needed** | Build ImageEditor component. Handle streaming state (loader). Handle inline vs full display modes. No AI server handler needed (images created via Pyodide). |

---

## Miscellaneous Seams

### SEAM-036: Rate Limiting Pipeline

| Field | Detail |
|-------|--------|
| **Description** | Edge + application rate limiting with per-route configuration |
| **Components** | `middleware.ts` (edge rate limit via @upstash/ratelimit) → Per-route app rate limiters (via lib/api/guards) |
| **Data Exchanged** | User ID → rate limit check result (allowed, retryAfter). Edge: 100 req/min global. App: chat 50/min, standard 100/min, strict 10/min, upload 10/hour. |
| **Task Needed** | Build middleware.ts with Upstash rate limiter. Build RateLimiters config for app-level per-route limits. Build requireRateLimitForRoute guard. Daily quota: separate Redis counter check in chat route. |

### SEAM-037: Pyodide Script Loading

| Field | Detail |
|-------|--------|
| **Description** | Python runtime loaded lazily for code artifact execution |
| **Components** | `Script src="pyodide.js" strategy="lazyOnload"` in ChatLayoutClient → Code editor execution → Console output |
| **Data Exchanged** | Pyodide global → code execution → stdout/stderr/matplotlib images |
| **Task Needed** | Wire Script tag in ChatLayoutClient. Build Pyodide execution handler in code editor. Capture stdout/stderr and matplotlib IOPub images. Display in Console component. |

### SEAM-038: Message Edit + Regenerate

| Field | Detail |
|-------|--------|
| **Description** | User edits previous message, trailing messages deleted, AI regenerates |
| **Components** | `features/chat/components/message-editor.tsx` → `deleteTrailingMessages` server action → `setMessages` → `regenerate()` (useChat) |
| **Data Exchanged** | `{ id: messageId, chatId }` to server action. Client: truncate messages array to edit point. `regenerate()` re-sends from edited message. |
| **Task Needed** | Build MessageEditor component (textarea, cancel, send). Build deleteTrailingMessages server action (delete from DB + cache). Wire setMessages to truncate and regenerate to re-send. |

### SEAM-039: Version Navigation + Restore

| Field | Detail |
|-------|--------|
| **Description** | Navigate document versions and restore older versions |
| **Components** | `features/artifacts/components/version-footer.tsx` → `features/artifacts/components/artifact.tsx` (version state) → `DELETE /api/document?id=&timestamp=` |
| **Data Exchanged** | `currentVersionIndex` (local state). Restore: DELETE removes later versions. SWR mutation truncates version array. |
| **Task Needed** | Build VersionFooter (prev/next/restore/latest buttons). Build version navigation logic in Artifact (currentVersionIndex state). Build document DELETE route for version restore (delete all versions after timestamp). |

### SEAM-040: Inline Document Preview → Artifact Panel

| Field | Detail |
|-------|--------|
| **Description** | Tool call renders inline preview that opens full artifact panel on click |
| **Components** | `features/artifacts/components/document-preview.tsx` (in message) → `useArtifact.setArtifact()` → Artifact panel open |
| **Data Exchanged** | Click captures bounding box via hitboxRef. `setArtifact({ documentId, isVisible: true, boundingBox })`. Panel opens with origin animation from bounding box. |
| **Task Needed** | Build DocumentPreview component (SWR fetch, mini editor, skeleton). Capture bounding box on click. Wire to setArtifact to open full panel. Build AnimatePresence transition from bounding box origin. |

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
| Document Fetch | SEAM-021 | 1 |
| Visibility | SEAM-022 | 1 |
| Data Layer | SEAM-023 through SEAM-026 | 4 |
| Error Handling | SEAM-027 through SEAM-028 | 2 |
| UI Infrastructure | SEAM-029 through SEAM-031 | 3 |
| Artifact Editors | SEAM-032 through SEAM-035 | 4 |
| Miscellaneous | SEAM-036 through SEAM-040 | 5 |
| **Total** | | **40** |
